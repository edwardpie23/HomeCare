import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import { buildSizeMathPrompt } from "@/lib/pricing";
import { anthropic } from "@/lib/anthropic";
import { sendQuoteReceivedEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { readFile } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "contractor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contractor = await prisma.contractor.findUnique({
    where: { userId: session.user.id },
    include: { pricingRules: { include: { category: true } } },
  });
  if (!contractor) {
    return NextResponse.json({ error: "Contractor profile not found" }, { status: 404 });
  }

  const body = await request.json();
  const { jobRequestId, action, minPrice, maxPrice, avgPrice, notes } = body;

  const job = await prisma.jobRequest.findUnique({
    where: { id: jobRequestId },
    include: { category: true, user: { select: { name: true } } },
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  // === AI SUGGESTION ===
  if (action === "ai_suggest") {
    const photos: string[] = JSON.parse(job.photos || "[]");
    const aiAnalysis = job.aiAnalysis ? JSON.parse(job.aiAnalysis) : null;

    const pricingRule = contractor.pricingRules.find(
      (r: { categoryId: string }) => r.categoryId === job.categoryId
    );

    const sizeMath = buildSizeMathPrompt(job.categoryId, job.size, job.city, job.state);

    const messageContent: Anthropic.MessageParam["content"] = [];

    for (const photo of photos.slice(0, 2)) {
      if (photo.startsWith("data:image/")) {
        const [mediaTypePart, base64Data] = photo.split(",");
        const mediaType = mediaTypePart.split(":")[1].split(";")[0] as
          | "image/jpeg" | "image/png" | "image/gif" | "image/webp";
        messageContent.push({
          type: "image",
          source: { type: "base64", media_type: mediaType, data: base64Data },
        });
      } else if (photo.startsWith("/uploads/")) {
        try {
          const filePath = path.join(process.cwd(), "public", photo);
          const buffer = await readFile(filePath);
          const ext = photo.split(".").pop()?.toLowerCase() || "jpg";
          const mediaTypeMap: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };
          const mediaType = (mediaTypeMap[ext] || "image/jpeg") as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
          messageContent.push({
            type: "image",
            source: { type: "base64", media_type: mediaType, data: buffer.toString("base64") },
          });
        } catch { /* skip */ }
      }
    }

    const prompt = `You are an experienced home improvement contractor generating a precise, size-accurate quote.

JOB:
- Category: ${job.category.name}
- Title: ${job.title}
- Location: ${job.city}, ${job.state}
- Size: ${job.size ? `${job.size} ${job.category.unit}` : "not specified"}
- Urgency: ${job.urgency === "asap" ? "ASAP — may justify 10-15% premium" : job.urgency === "this_week" ? "This week" : "Flexible"}
- Description: ${job.description || "None provided"}
${aiAnalysis ? `- Prior assessment: ${aiAnalysis.complexity} complexity — ${aiAnalysis.detected}` : ""}
${pricingRule ? `- Contractor's configured rate: $${pricingRule.minPrice}–$${pricingRule.maxPrice}` : ""}
${photos.length > 0 ? `- ${photos.length} photo(s) above — examine for scope and condition` : "- No photos"}
${sizeMath}

RULES:
1. Start from the size-based numbers above — never return a generic flat price
2. A 200 sq ft job and a 1,500 sq ft job MUST produce significantly different prices
3. Breakdown costs must sum to ~avgPrice; label labor with the rate used
4. Be competitive for the ${job.city}, ${job.state} market

Return ONLY valid JSON:
{
  "minPrice": 1100,
  "maxPrice": 1800,
  "avgPrice": 1450,
  "breakdown": [
    {"item": "Labor (600 sq ft × $1.90/sq ft)", "cost": 1140},
    {"item": "Paint & primer — 2 coats", "cost": 230},
    {"item": "Prep, tape & drop cloths", "cost": 60},
    {"item": "Cleanup & hauling", "cost": 20}
  ],
  "notes": "Includes all labor and materials.",
  "estimatedDays": 2
}`;

    messageContent.push({ type: "text", text: prompt });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: messageContent }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return NextResponse.json({ error: "AI failed to generate estimate" }, { status: 500 });
    }

    return NextResponse.json({ success: true, suggestion: JSON.parse(jsonMatch[0]) });
  }

  // === SAVE ESTIMATE ===
  if (action === "save") {
    await prisma.estimate.deleteMany({
      where: { jobRequestId, contractorId: contractor.id },
    });

    const estimate = await prisma.estimate.create({
      data: {
        jobRequestId,
        contractorId: contractor.id,
        minPrice: parseFloat(minPrice),
        maxPrice: parseFloat(maxPrice),
        avgPrice: parseFloat(avgPrice),
        notes: notes || null,
        isAiGenerated: false,
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // In-app + email notification for customer
    const jobWithUser = await prisma.jobRequest.findUnique({
      where: { id: jobRequestId },
      include: { user: { select: { name: true, email: true } } },
    });
    if (jobWithUser) {
      await createNotification({
        userId: jobWithUser.userId,
        type: "quote_received",
        title: "New contractor quote",
        body: `${contractor.businessName} submitted a quote for "${jobWithUser.title}"`,
        link: `/my-jobs/${jobRequestId}`,
      });
      if (jobWithUser.user?.email) {
        await sendQuoteReceivedEmail({
          customerEmail: jobWithUser.user.email,
          customerName: jobWithUser.user.name || "Customer",
          jobTitle: jobWithUser.title,
          jobId: jobRequestId,
          contractorName: contractor.businessName,
          minPrice: parseFloat(minPrice),
          maxPrice: parseFloat(maxPrice),
        });
      }
    }

    return NextResponse.json({ success: true, estimate });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
