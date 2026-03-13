import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendQuoteAcceptedEmail } from "@/lib/email";

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
        include: { category: true, user: { select: { name: true, email: true } } },
      },
      contractor: {
        include: { user: { select: { email: true } } },
      },
    },
  });

  if (!estimate) return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  if (estimate.isAiGenerated || !estimate.contractorId) {
    return NextResponse.json({ error: "Cannot accept an AI-generated estimate" }, { status: 400 });
  }
  if (estimate.jobRequest.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (estimate.jobRequest.booking) {
    return NextResponse.json({ error: "Job already booked" }, { status: 400 });
  }

  // Create the booking
  const booking = await prisma.booking.create({
    data: {
      jobRequestId: estimate.jobRequestId,
      customerId: session.user.id,
      contractorId: estimate.contractorId,
      agreedPrice: estimate.avgPrice,
      leadFee: 15,
    },
  });

  // Update job status and mark estimate accepted; decline others
  await prisma.jobRequest.update({
    where: { id: estimate.jobRequestId },
    data: { status: "booked" },
  });

  await prisma.estimate.update({ where: { id }, data: { status: "accepted" } });

  // Decline all other contractor estimates for this job
  await prisma.estimate.updateMany({
    where: {
      jobRequestId: estimate.jobRequestId,
      id: { not: id },
      isAiGenerated: false,
    },
    data: { status: "declined" },
  });

  // Email the contractor
  if (estimate.contractor?.user?.email) {
    await sendQuoteAcceptedEmail({
      contractorEmail: estimate.contractor.user.email,
      contractorName: estimate.contractor.businessName,
      customerName: estimate.jobRequest.user.name || "Customer",
      jobTitle: estimate.jobRequest.title,
      agreedPrice: estimate.avgPrice,
      city: estimate.jobRequest.city,
      state: estimate.jobRequest.state,
    });
  }

  return NextResponse.json({ success: true, bookingId: booking.id });
}
