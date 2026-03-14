/**
 * POST /api/webhooks/inbound-email
 *
 * Inbound email bridge — works with Postmark, SendGrid, or Resend inbound parsing.
 *
 * Setup:
 *   Postmark:  Settings → Inbound → set URL to /api/webhooks/inbound-email
 *   SendGrid:  Mail Settings → Inbound Parse → set URL to /api/webhooks/inbound-email
 *   Resend:    (use Postmark/SendGrid for inbound — Resend is outbound only)
 *
 * Flow:
 *   1. Contractor forwards Thumbtack/Angi email to their unique inbound address
 *   2. Your email provider parses it and POSTs to this endpoint
 *   3. We match the To: address to a ConnectedAccount.inboundEmail
 *   4. We parse the email body and create an ExternalLead + ExternalMessage
 *   5. If it's a reply in an existing thread, we add it as an ExternalMessage
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

function extractPlatform(fromEmail: string, subject: string): string {
  const combined = `${fromEmail} ${subject}`.toLowerCase();
  if (combined.includes("thumbtack")) return "thumbtack";
  if (combined.includes("angi") || combined.includes("homeadvisor")) return "angi";
  if (combined.includes("yelp")) return "yelp";
  return "email";
}

function extractCustomerInfo(body: string): { name?: string; phone?: string; email?: string; description?: string } {
  // Simple regex extraction — tune these for each platform's email format
  const nameMatch = body.match(/(?:Customer|Name|From)[:\s]+([^\n\r]+)/i);
  const phoneMatch = body.match(/(?:Phone|Mobile|Call)[:\s]+([\d\s\-().+]+)/i);
  const emailMatch = body.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/gi);
  const descMatch = body.match(/(?:Project|Description|Details|Request)[:\s]+([^\n\r]+(?:\n[^\n\r]+)*)/i);

  return {
    name: nameMatch?.[1]?.trim(),
    phone: phoneMatch?.[1]?.trim(),
    email: emailMatch?.find((e) => !e.includes("thumbtack") && !e.includes("angi")),
    description: descMatch?.[1]?.trim().slice(0, 500),
  };
}

export async function POST(request: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    // Handle both JSON (Postmark) and form-encoded (SendGrid) payloads
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      payload = await request.json();
    } else {
      const text = await request.text();
      const params = new URLSearchParams(text);
      payload = Object.fromEntries(params.entries());
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Normalize fields across Postmark / SendGrid formats
  const toEmail = String(payload.To || payload.to || payload.Recipient || "").toLowerCase();
  const fromEmail = String(payload.From || payload.from || payload.Sender || "").toLowerCase();
  const subject = String(payload.Subject || payload.subject || "");
  const textBody = String(payload.TextBody || payload.text || payload.plain || "");
  const messageId = String(payload.MessageID || payload["Message-Id"] || payload.message_id || "");

  if (!toEmail) return NextResponse.json({ received: true });

  // Find the connected account by inbound email address
  const connectedAccount = await prisma.connectedAccount.findFirst({
    where: { inboundEmail: { equals: toEmail, mode: "insensitive" }, isActive: true },
    include: { contractor: { include: { user: true } } },
  });

  if (!connectedAccount) {
    return NextResponse.json({ received: true }); // no matching contractor
  }

  const platform = extractPlatform(fromEmail, subject);
  const customerInfo = extractCustomerInfo(textBody);

  // Check if this is a reply to an existing lead (by subject/thread matching)
  const existingLead = await prisma.externalLead.findFirst({
    where: {
      contractorId: connectedAccount.contractorId,
      platform,
      // Rough match: subject line similarity
      description: { contains: (customerInfo.description || subject).slice(0, 30) },
    },
    orderBy: { createdAt: "desc" },
  });

  let lead;
  if (existingLead) {
    lead = existingLead;
  } else {
    lead = await prisma.externalLead.create({
      data: {
        connectedAccountId: connectedAccount.id,
        contractorId: connectedAccount.contractorId,
        platform,
        externalLeadId: messageId || undefined,
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        customerEmail: customerInfo.email,
        serviceCategory: subject.replace(/re:/gi, "").trim().slice(0, 100),
        description: customerInfo.description || textBody.slice(0, 500),
        status: "new",
        rawData: JSON.stringify({ from: fromEmail, subject, body: textBody }),
      },
    });
  }

  await prisma.externalMessage.create({
    data: {
      leadId: lead.id,
      direction: "inbound",
      senderName: customerInfo.name || fromEmail,
      body: textBody.slice(0, 2000),
      rawData: JSON.stringify({ from: fromEmail, subject, messageId }),
    },
  });

  await prisma.externalLead.update({ where: { id: lead.id }, data: { updatedAt: new Date() } });

  await createNotification({
    userId: connectedAccount.contractor.userId,
    type: "message",
    title: `New ${platform} lead via email`,
    body: (customerInfo.description || subject).slice(0, 100),
    link: `/contractor/inbox/${lead.id}`,
  });

  return NextResponse.json({ received: true });
}
