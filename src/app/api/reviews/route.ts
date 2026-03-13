import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendReviewEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "customer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingId, rating, comment } = await request.json();

  if (!bookingId || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "bookingId and rating (1-5) are required" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      jobRequest: { select: { title: true } },
      contractor: { include: { user: { select: { email: true } } } },
      review: true,
    },
  });

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.customerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (booking.status !== "completed") {
    return NextResponse.json({ error: "Can only review completed jobs" }, { status: 400 });
  }
  if (booking.review) {
    return NextResponse.json({ error: "Already reviewed" }, { status: 400 });
  }

  const review = await prisma.review.create({
    data: {
      bookingId,
      contractorId: booking.contractorId,
      customerId: session.user.id,
      rating,
      comment: comment || null,
    },
  });

  // Recalculate contractor rating
  const allReviews = await prisma.review.findMany({
    where: { contractorId: booking.contractorId },
    select: { rating: true },
  });
  const avgRating = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;

  await prisma.contractor.update({
    where: { id: booking.contractorId },
    data: { rating: Math.round(avgRating * 10) / 10, reviewCount: allReviews.length },
  });

  // Email contractor
  if (booking.contractor.user?.email) {
    await sendReviewEmail({
      contractorEmail: booking.contractor.user.email,
      contractorName: booking.contractor.businessName,
      customerName: session.user.name || "Customer",
      rating,
      comment: comment || null,
      jobTitle: booking.jobRequest.title,
    });
  }

  return NextResponse.json({ success: true, review }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const contractorId = searchParams.get("contractorId");

  if (!contractorId) {
    return NextResponse.json({ error: "contractorId required" }, { status: 400 });
  }

  const reviews = await prisma.review.findMany({
    where: { contractorId },
    include: {
      customer: { select: { name: true } },
      booking: { include: { jobRequest: { include: { category: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ reviews });
}
