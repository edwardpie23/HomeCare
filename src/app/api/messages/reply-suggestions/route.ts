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

  const { bookingId } = await req.json();
  if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      jobRequest: { include: { category: true } },
      customer: { select: { name: true } },
      messages: { orderBy: { createdAt: "asc" }, take: 20 },
    },
  });

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const contractor = await prisma.contractor.findUnique({
    where: { userId: session.user.id },
    select: { businessName: true },
  });

  const messageHistory = booking.messages
    .map((m: { senderRole: string; body: string }) => `${m.senderRole === "contractor" ? "You" : booking.customer.name}: ${m.body}`)
    .join("\n");

  const isFirstMessage = booking.messages.length === 0;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `You are a professional contractor assistant. Generate 3 short, natural reply suggestions for a contractor responding to a customer.

Job: ${booking.jobRequest.title} (${booking.jobRequest.category.name})
Location: ${booking.jobRequest.city}, ${booking.jobRequest.state}
Customer: ${booking.customer.name}
Agreed price: $${booking.agreedPrice}
${booking.jobRequest.description ? `Job details: ${booking.jobRequest.description}` : ""}

${isFirstMessage ? "This is the first message — suggest friendly introduction openers." : `Recent conversation:\n${messageHistory}\n\nSuggest relevant follow-up replies.`}

Return ONLY valid JSON: {"suggestions": ["reply 1", "reply 2", "reply 3"]}
Each suggestion should be 1-2 sentences, professional but friendly, and directly useful.`,
        },
      ],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const parsed = JSON.parse(text.trim());
    return NextResponse.json({ suggestions: parsed.suggestions || [] });
  } catch {
    const fallbacks = isFirstMessage
      ? [
          `Hi ${booking.customer.name}! Thanks for booking with us. I'll be in touch shortly to confirm the details.`,
          `Hello ${booking.customer.name}, I've reviewed your project and I'm ready to get started. When would be a good time to discuss?`,
          `Hi ${booking.customer.name}! Looking forward to working on your ${booking.jobRequest.category.name.toLowerCase()} project. Do you have any specific questions?`,
        ]
      : [
          "Sounds good! I'll take care of that.",
          "Thanks for the update. I'll follow up shortly.",
          "Got it — I'll keep you posted on the progress.",
        ];
    return NextResponse.json({ suggestions: fallbacks });
  }
}
