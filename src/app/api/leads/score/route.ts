import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "contractor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await req.json();
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const job = await prisma.jobRequest.findUnique({
    where: { id: jobId },
    include: { category: true, user: { select: { name: true } } },
  });

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  // Return cached score if already scored
  if (job.qualityScore !== null) {
    return NextResponse.json({ score: job.qualityScore, reason: job.qualityScoreReason });
  }

  const contractor = await prisma.contractor.findUnique({
    where: { userId: session.user.id },
    select: { city: true, state: true, specialties: true },
  });

  const contractorCity = contractor?.city || "";
  const contractorState = contractor?.state || "";
  const specialties: string[] = contractor?.specialties ? JSON.parse(contractor.specialties) : [];

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `Rate this home service lead from 1-100. Return ONLY valid JSON: {"score": <number>, "reason": "<1 sentence>"}.

Lead details:
- Category: ${job.category.name}
- Title: ${job.title}
- Description: ${job.description || "Not provided"}
- Location: ${job.city}, ${job.state} ${job.zipCode}
- Size: ${job.size ? `${job.size} ${job.category.unit}` : "Not specified"}
- Urgency: ${job.urgency}
- Has photos: ${JSON.parse(job.photos || "[]").length > 0 ? "Yes" : "No"}

Contractor info:
- Location: ${contractorCity}, ${contractorState}
- Specialties: ${specialties.join(", ") || "General"}

Score higher for: clear description, specific size, ASAP urgency, photos uploaded, close location match, matching specialty.
Score lower for: vague description, no size, no photos, far location, mismatched specialty.`,
        },
      ],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const parsed = JSON.parse(text.trim());
    const score = Math.max(1, Math.min(100, Math.round(parsed.score)));
    const reason = parsed.reason || "";

    await prisma.jobRequest.update({
      where: { id: jobId },
      data: { qualityScore: score, qualityScoreReason: reason },
    });

    return NextResponse.json({ score, reason });
  } catch {
    // Fallback: compute a basic score without AI
    let score = 50;
    if (job.description && job.description.length > 50) score += 10;
    if (job.size) score += 10;
    if (JSON.parse(job.photos || "[]").length > 0) score += 10;
    if (job.urgency === "asap") score += 15;
    else if (job.urgency === "this_week") score += 5;
    if (job.city.toLowerCase() === contractorCity.toLowerCase()) score += 10;
    score = Math.max(1, Math.min(100, score));

    await prisma.jobRequest.update({
      where: { id: jobId },
      data: { qualityScore: score, qualityScoreReason: "Score based on lead completeness." },
    });

    return NextResponse.json({ score, reason: "Score based on lead completeness." });
  }
}
