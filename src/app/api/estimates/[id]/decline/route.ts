import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendQuoteDeclinedEmail } from "@/lib/email";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "customer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: {
      jobRequest: {
        include: { user: { select: { name: true } } },
      },
      contractor: {
        include: { user: { select: { email: true } } },
      },
    },
  });

  if (!estimate) return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  if (estimate.isAiGenerated) {
    return NextResponse.json({ error: "Cannot decline an AI estimate" }, { status: 400 });
  }
  if (estimate.jobRequest.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.estimate.update({ where: { id }, data: { status: "declined" } });

  // Email the contractor
  if (estimate.contractor?.user?.email) {
    await sendQuoteDeclinedEmail({
      contractorEmail: estimate.contractor.user.email,
      contractorName: estimate.contractor.businessName,
      customerName: estimate.jobRequest.user.name || "Customer",
      jobTitle: estimate.jobRequest.title,
    });
  }

  return NextResponse.json({ success: true });
}
