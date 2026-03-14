/**
 * POST /api/webhooks/thumbtack
 *
 * Receives events from Thumbtack's partner webhook.
 * Thumbtack signs requests with HMAC-SHA256 using your webhook secret.
 *
 * Event types handled:
 *   lead.new        — a new customer lead
 *   message.new     — customer sent a message in an existing thread
 *
 * Thumbtack docs (partner access required):
 * https://pro.thumbtack.com/partner-docs/webhooks
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHmac, timingSafeEqual } from "crypto";
import { createNotification } from "@/lib/notifications";

const WEBHOOK_SECRET = process.env.THUMBTACK_WEBHOOK_SECRET || "";

function verifySignature(body: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) return true; // skip in dev when secret not set
  const expected = createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-thumbtack-signature") || "";

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = payload.event as string;

  // Find which contractor this lead belongs to via externalContractorId
  const externalContractorId = (payload.pro_id || payload.contractor_id) as string | undefined;
  if (!externalContractorId) {
    return NextResponse.json({ received: true }); // can't route without contractor ID
  }

  const connectedAccount = await prisma.connectedAccount.findFirst({
    where: { platform: "thumbtack", externalContractorId, isActive: true },
    include: { contractor: { include: { user: true } } },
  });

  if (!connectedAccount) {
    return NextResponse.json({ received: true }); // no matching contractor
  }

  if (eventType === "lead.new") {
    const lead = payload.lead as Record<string, unknown>;
    const externalLeadId = String(lead.id || payload.lead_id);

    const externalLead = await prisma.externalLead.upsert({
      where: { platform_externalLeadId: { platform: "thumbtack", externalLeadId } },
      create: {
        connectedAccountId: connectedAccount.id,
        contractorId: connectedAccount.contractorId,
        platform: "thumbtack",
        externalLeadId,
        externalThreadId: String(lead.thread_id || ""),
        customerName: String(lead.customer_name || lead.customer?.name || ""),
        customerPhone: String(lead.customer_phone || lead.customer?.phone || ""),
        customerEmail: String(lead.customer_email || lead.customer?.email || ""),
        serviceCategory: String(lead.category || lead.service_type || ""),
        description: String(lead.description || lead.request_description || ""),
        location: String(lead.zip_code || lead.location || ""),
        budget: String(lead.budget || ""),
        status: "new",
        rawData: rawBody,
      },
      update: { rawData: rawBody },
    });

    // Store initial customer message if present
    const initialMessage = (lead.message || lead.description) as string | undefined;
    if (initialMessage) {
      await prisma.externalMessage.create({
        data: {
          leadId: externalLead.id,
          direction: "inbound",
          senderName: externalLead.customerName || "Customer",
          body: initialMessage,
        },
      });
    }

    // Notify contractor
    await createNotification({
      userId: connectedAccount.contractor.userId,
      type: "quote_received",
      title: `New Thumbtack lead!`,
      body: `${externalLead.customerName || "A customer"} is looking for ${externalLead.serviceCategory || "help"}`,
      link: `/contractor/inbox/${externalLead.id}`,
    });
  }

  if (eventType === "message.new") {
    const message = payload.message as Record<string, unknown>;
    const externalLeadId = String(payload.lead_id || message.lead_id);

    const lead = await prisma.externalLead.findUnique({
      where: { platform_externalLeadId: { platform: "thumbtack", externalLeadId } },
    });

    if (lead) {
      await prisma.externalMessage.create({
        data: {
          leadId: lead.id,
          direction: "inbound",
          senderName: String(message.sender_name || "Customer"),
          body: String(message.body || message.text || ""),
          rawData: JSON.stringify(message),
        },
      });

      await prisma.externalLead.update({
        where: { id: lead.id },
        data: { updatedAt: new Date() },
      });

      await createNotification({
        userId: connectedAccount.contractor.userId,
        type: "message",
        title: "New Thumbtack message",
        body: String(message.body || message.text || "").slice(0, 100),
        link: `/contractor/inbox/${lead.id}`,
      });
    }
  }

  return NextResponse.json({ received: true });
}
