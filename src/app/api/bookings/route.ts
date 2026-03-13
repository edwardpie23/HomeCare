import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { jobRequestId, contractorId, agreedPrice, scheduledDate, notes } = body;

    // Verify job belongs to customer
    const job = await prisma.jobRequest.findUnique({
      where: { id: jobRequestId },
    });

    if (!job || job.userId !== session.user.id) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const booking = await prisma.booking.create({
      data: {
        jobRequestId,
        customerId: session.user.id,
        contractorId,
        agreedPrice: parseFloat(agreedPrice),
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        notes: notes || null,
        leadFee: 15,
      },
    });

    // Update job status
    await prisma.jobRequest.update({
      where: { id: jobRequestId },
      data: { status: "booked" },
    });

    return NextResponse.json({ success: true, bookingId: booking.id }, { status: 201 });
  } catch (error) {
    console.error("Create booking error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "contractor") {
      const contractor = await prisma.contractor.findUnique({
        where: { userId: session.user.id },
      });

      if (!contractor) {
        return NextResponse.json({ bookings: [] });
      }

      const bookings = await prisma.booking.findMany({
        where: { contractorId: contractor.id },
        include: {
          jobRequest: { include: { category: true } },
          customer: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ bookings });
    }

    const bookings = await prisma.booking.findMany({
      where: { customerId: session.user.id },
      include: {
        jobRequest: { include: { category: true } },
        contractor: { select: { businessName: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("Get bookings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
