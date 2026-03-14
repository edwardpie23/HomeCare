/**
 * POST /api/webhooks/angi
 *
 * Receives events from Angi's partner webhook.
 * Angi sends a shared secret in the Authorization header.
 *
 * Event types handled:
 *   lead_submitted     — new lead
 *   message_received   — customer replied
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

const ANGI_WEBHOOK_SECRET = process.env.ANGI_WEBHOOK_SECRET || "";

export async function POST(request: NextRequest) {
  // Angi typically sends a shared secret in Authorization header
  const authHeader = request.headers.get("authorization");
  if (ANGI_WEBHOOK_SECRET && authHeader !== `Bearer ${ANGI_WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = payload.event_type as string;
  const externalContractorId = String(payload.pro_id || payload.sp_id || "");

  const connectedAccount = await prisma.connectedAccount.findFirst({
    where: { platform: "angi", externalContractorId, isActive: true },
    include: { contractor: { include: { user: true } } },
  });

  if (!connectedAccount) {
    return NextResponse.json({ received: true });
  }

  if (eventType === "lead_submitted") {
    const data = payload.lead as Record<string, unknown>;
    const externalLeadId = String(data.id || payload.lead_id);

    const lead = await prisma.externalLead.upsert({
      where: { platform_externalLeadId: { platform: "angi", externalLeadId } },
      create: {
        connectedAccountId: connectedAccount.id,
        contractorId: connectedAccount.contractorId,
        platform: "angi",
        externalLeadId,
        externalThreadId: String(data.thread_id || ""),
        customerName: String(data.customer_name || ""),
        customerPhone: String(data.customer_phone || ""),
        customerEmail: String(data.customer_email || ""),
        serviceCategory: String(data.task_name || data.category || ""),
        description: String(data.comments || data.description || ""),
        location: String(data.zip || data.location || ""),
        budget: String(data.budget || ""),
        status: "new",
        rawData: JSON.stringify(payload),
      },
      update: { rawData: JSON.stringify(payload) },
    });

    const initialMessage = (data.comments || data.description) as string | undefined;
    if (initialMessage) {
      await prisma.externalMessage.create({
        data: {
          leadId: lead.id,
          direction: "inbound",
          senderName: lead.customerName || "Customer",
          body: initialMessage,
        },
      });
    }

    await createNotification({
      userId: connectedAccount.contractor.userId,
      type: "quote_received",
      title: "New Angi lead!",
      body: `${lead.customerName || "A customer"} needs ${lead.serviceCategory || "a service"}`,
      link: `/contractor/inbox/${lead.id}`,
    });
  }

  if (eventType === "message_received") {
    const message = payload.message as Record<string, unknown>;
    const externalLeadId = String(payload.lead_id || message.lead_id);

    const lead = await prisma.externalLead.findUnique({
      where: { platform_externalLeadId: { platform: "angi", externalLeadId } },
    });

    if (lead) {
      await prisma.externalMessage.create({
        data: {
          leadId: lead.id,
          direction: "inbound",
          senderName: String(message.from_name || "Customer"),
          body: String(message.body || ""),
          rawData: JSON.stringify(message),
        },
      });

      await prisma.externalLead.update({ where: { id: lead.id }, data: { updatedAt: new Date() } });

      await createNotification({
        userId: connectedAccount.contractor.userId,
        type: "message",
        title: "New Angi message",
        body: String(message.body || "").slice(0, 100),
        link: `/contractor/inbox/${lead.id}`,
      });
    }
  }

  return NextResponse.json({ received: true });
}
