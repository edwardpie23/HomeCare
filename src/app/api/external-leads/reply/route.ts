/**
 * POST /api/external-leads/reply
 *
 * Send a reply to an external lead's conversation thread.
 *
 * Strategy by platform:
 *   thumbtack  — POST to Thumbtack API (requires partner access + OAuth token)
 *   angi       — POST to Angi API (requires partner access + OAuth token)
 *   email      — Send reply email via Resend/Postmark to customer's email
 *   manual     — Store locally only (no external delivery)
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

async function replyViaThumbtackApi(
  accessToken: string,
  threadId: string,
  body: string
): Promise<boolean> {
  try {
    // NOTE: Replace with real Thumbtack API endpoint (partner access required)
    const res = await fetch(`https://api.thumbtack.com/v2/conversations/${threadId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function replyViaAngiApi(
  accessToken: string,
  threadId: string,
  body: string
): Promise<boolean> {
  try {
    // NOTE: Replace with real Angi API endpoint (partner access required)
    const res = await fetch(`https://api.angi.com/v1/conversations/${threadId}/reply`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: body }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function replyViaEmail(
  customerEmail: string,
  customerName: string | null,
  contractorName: string,
  body: string,
  subject: string
): Promise<boolean> {
  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@yourapp.com";
    if (!RESEND_API_KEY) return false;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${contractorName} via QuoteFast <${FROM_EMAIL}>`,
        to: [customerEmail],
        subject: `Re: ${subject}`,
        text: `${body}\n\n—\n${contractorName}\nSent via QuoteFast (${APP_URL})`,
        html: `<p>${body.replace(/\n/g, "<br>")}</p><hr><p style="color:#888;font-size:12px">${contractorName} · Sent via <a href="${APP_URL}">QuoteFast</a></p>`,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contractor = await prisma.contractor.findUnique({
    where: { userId: session.user.id },
    include: { user: { select: { name: true } } },
  });
  if (!contractor) return NextResponse.json({ error: "Not a contractor" }, { status: 403 });

  const { leadId, body } = await request.json();
  if (!leadId || !body?.trim()) {
    return NextResponse.json({ error: "leadId and body required" }, { status: 400 });
  }

  const lead = await prisma.externalLead.findFirst({
    where: { id: leadId, contractorId: contractor.id },
    include: {
      connectedAccount: true,
    },
  });

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  let delivered = false;
  let deliveryMethod = "stored";

  const { platform, connectedAccount } = lead;

  // Try platform API first if we have a token
  if (platform === "thumbtack" && connectedAccount?.accessToken && lead.externalThreadId) {
    delivered = await replyViaThumbtackApi(
      connectedAccount.accessToken,
      lead.externalThreadId,
      body.trim()
    );
    deliveryMethod = delivered ? "thumbtack_api" : "stored";
  }

  if (platform === "angi" && connectedAccount?.accessToken && lead.externalThreadId) {
    delivered = await replyViaAngiApi(
      connectedAccount.accessToken,
      lead.externalThreadId,
      body.trim()
    );
    deliveryMethod = delivered ? "angi_api" : "stored";
  }

  // Fallback: reply by email if customer email is known
  if (!delivered && lead.customerEmail) {
    delivered = await replyViaEmail(
      lead.customerEmail,
      lead.customerName,
      contractor.businessName,
      body.trim(),
      lead.serviceCategory || "Your request"
    );
    deliveryMethod = delivered ? "email" : "stored";
  }

  // Store the outbound message regardless of delivery status
  const message = await prisma.externalMessage.create({
    data: {
      leadId: lead.id,
      direction: "outbound",
      senderName: contractor.businessName,
      body: body.trim(),
      deliveredAt: delivered ? new Date() : null,
      rawData: JSON.stringify({ deliveryMethod, delivered }),
    },
  });

  // Update lead status to "responded" if it was "new"
  if (lead.status === "new") {
    await prisma.externalLead.update({
      where: { id: lead.id },
      data: { status: "responded", updatedAt: new Date() },
    });
  }

  return NextResponse.json({ message, delivered, deliveryMethod });
}
