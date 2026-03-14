import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

// GET  /api/integrations  — list contractor's connected accounts
// POST /api/integrations  — create email-bridge account (no OAuth)
// DELETE /api/integrations?platform=xxx — disconnect a platform

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contractor = await prisma.contractor.findUnique({ where: { userId: session.user.id } });
  if (!contractor) return NextResponse.json({ error: "Not a contractor" }, { status: 403 });

  const accounts = await prisma.connectedAccount.findMany({
    where: { contractorId: contractor.id },
    select: {
      id: true,
      platform: true,
      externalContractorId: true,
      isActive: true,
      inboundEmail: true,
      lastSyncAt: true,
      createdAt: true,
      _count: { select: { leads: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ accounts });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contractor = await prisma.contractor.findUnique({ where: { userId: session.user.id } });
  if (!contractor) return NextResponse.json({ error: "Not a contractor" }, { status: 403 });

  const { platform } = await request.json();
  if (!platform) return NextResponse.json({ error: "platform required" }, { status: 400 });

  // Generate a unique inbound email slug for the email-bridge
  const slug = randomBytes(8).toString("hex");
  const inboundEmail = `leads+${contractor.id}-${platform}-${slug}@${process.env.INBOUND_EMAIL_DOMAIN || "mail.yourapp.com"}`;

  const account = await prisma.connectedAccount.upsert({
    where: { contractorId_platform: { contractorId: contractor.id, platform } },
    create: { contractorId: contractor.id, platform, inboundEmail, isActive: true },
    update: { isActive: true, inboundEmail },
  });

  return NextResponse.json({ account }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contractor = await prisma.contractor.findUnique({ where: { userId: session.user.id } });
  if (!contractor) return NextResponse.json({ error: "Not a contractor" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform");
  if (!platform) return NextResponse.json({ error: "platform required" }, { status: 400 });

  await prisma.connectedAccount.updateMany({
    where: { contractorId: contractor.id, platform },
    data: { isActive: false, accessToken: null, refreshToken: null },
  });

  return NextResponse.json({ success: true });
}
