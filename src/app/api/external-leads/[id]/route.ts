import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contractor = await prisma.contractor.findUnique({ where: { userId: session.user.id } });
  if (!contractor) return NextResponse.json({ error: "Not a contractor" }, { status: 403 });

  const { id } = await params;
  const lead = await prisma.externalLead.findFirst({
    where: { id, contractorId: contractor.id },
    include: {
      messages: { orderBy: { sentAt: "asc" } },
      connectedAccount: { select: { platform: true, inboundEmail: true } },
    },
  });

  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ lead });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contractor = await prisma.contractor.findUnique({ where: { userId: session.user.id } });
  if (!contractor) return NextResponse.json({ error: "Not a contractor" }, { status: 403 });

  const { id } = await params;
  const { status } = await request.json();

  const lead = await prisma.externalLead.findFirst({ where: { id, contractorId: contractor.id } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.externalLead.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json({ lead: updated });
}
