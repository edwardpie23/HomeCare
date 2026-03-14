import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookingId } = await req.json();
  if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      jobRequest: { include: { category: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const messageHistory = booking.messages
    .map((m: { senderRole: string; body: string }) => `${m.senderRole}: ${m.body}`)
    .join("\n");

  const job = booking.jobRequest;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `You are a home services pricing expert. Based on the job details and conversation, provide an updated price estimate.

Job: ${job.title} (${job.category.name})
Location: ${job.city}, ${job.state}
Original agreed price: $${booking.agreedPrice}
Size: ${job.size ? `${job.size} ${job.category.unit}` : "Not specified"}
Original description: ${job.description || "None"}

Conversation so far:
${messageHistory || "No messages yet."}

Extract any new information from the conversation that affects pricing (scope changes, additional work, materials discussed, etc.).

Return ONLY valid JSON:
{
  "minPrice": <number>,
  "maxPrice": <number>,
  "confidence": "low" | "medium" | "high",
  "priceNote": "<1 short sentence explaining any changes or confirming original>",
  "scopeChanges": ["<change 1>", "<change 2>"] // empty array if no changes
}`,
        },
      ],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const parsed = JSON.parse(text.trim());

    return NextResponse.json({
      minPrice: parsed.minPrice ?? booking.agreedPrice * 0.9,
      maxPrice: parsed.maxPrice ?? booking.agreedPrice * 1.1,
      confidence: parsed.confidence ?? "medium",
      priceNote: parsed.priceNote ?? "Based on original agreement.",
      scopeChanges: parsed.scopeChanges ?? [],
    });
  } catch {
    return NextResponse.json({
      minPrice: booking.agreedPrice * 0.9,
      maxPrice: booking.agreedPrice * 1.1,
      confidence: "medium",
      priceNote: "Based on original agreed price.",
      scopeChanges: [],
    });
  }
}
