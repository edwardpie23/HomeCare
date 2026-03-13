import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Contractor generates an AI-assisted estimate for a specific job
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

    // Find contractor's pricing rule for this category if exists
    const pricingRule = contractor.pricingRules.find(
      (r: { categoryId: string }) => r.categoryId === job.categoryId
    );

    const messageContent: Anthropic.MessageParam["content"] = [];

    // Attach up to 2 photos
    for (const photo of photos.slice(0, 2)) {
      if (photo.startsWith("data:image/")) {
        const [mediaTypePart, base64Data] = photo.split(",");
        const mediaType = mediaTypePart.split(":")[1].split(";")[0] as
          | "image/jpeg" | "image/png" | "image/gif" | "image/webp";
        messageContent.push({
          type: "image",
          source: { type: "base64", media_type: mediaType, data: base64Data },
        });
      }
    }

    const prompt = `You are a professional home repair contractor preparing a quote.

Job Details:
- Category: ${job.category.name}
- Title: ${job.title}
- Location: ${job.city}, ${job.state}
- Size: ${job.size ? `${job.size} ${job.category.unit}` : "Not specified"}
- Urgency: ${job.urgency}
- Description: ${job.description || "No description provided"}
${aiAnalysis ? `- Prior AI Assessment: ${aiAnalysis.detected} (${aiAnalysis.complexity} complexity)` : ""}
${pricingRule ? `- Your base rate for ${job.category.name}: $${pricingRule.minPrice}–$${pricingRule.maxPrice} per job` : ""}
${photos.length > 0 ? `- ${photos.length} photo(s) attached` : ""}

Based on this job, generate a professional quote with:
1. A fair, competitive price breakdown
2. Your recommended price range
3. Key line items (labor, materials, etc.)
4. Any important notes for the customer

Respond ONLY in this JSON format:
{
  "minPrice": 450,
  "maxPrice": 750,
  "avgPrice": 600,
  "breakdown": [
    {"item": "Labor (4 hours)", "cost": 320},
    {"item": "Materials", "cost": 200},
    {"item": "Equipment/disposal", "cost": 80}
  ],
  "notes": "Price includes all labor and materials. Job can be completed in one day.",
  "estimatedDays": 1
}`;

    messageContent.push({ type: "text", text: prompt });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      messages: [{ role: "user", content: messageContent }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return NextResponse.json({ error: "AI failed to generate estimate" }, { status: 500 });
    }

    const suggestion = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ success: true, suggestion });
  }

  // === SAVE ESTIMATE ===
  if (action === "save") {
    // Remove any previous estimate from this contractor for this job
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

    return NextResponse.json({ success: true, estimate });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
