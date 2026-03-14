import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/bookings/instant
 * Creates a job request + booking in one atomic step from the contractor profile page.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "customer") {
    return NextResponse.json({ error: "Only customers can book instantly" }, { status: 403 });
  }

  const {
    contractorId,
    categoryName,
    title,
    description,
    size,
    city,
    state,
    zipCode,
    agreedPrice,
    scheduledDate,
  } = await req.json();

  if (!contractorId || !categoryName || !title || !agreedPrice) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify contractor exists
  const contractor = await prisma.contractor.findUnique({ where: { id: contractorId } });
  if (!contractor) return NextResponse.json({ error: "Contractor not found" }, { status: 404 });

  // Find or seed category
  let category = await prisma.jobCategory.findFirst({ where: { name: categoryName } });
  if (!category) {
    category = await prisma.jobCategory.create({
      data: {
        name: categoryName,
        baseMinPrice: agreedPrice * 0.8,
        baseMaxPrice: agreedPrice * 1.2,
        unit: "job",
      },
    });
  }

  // Create job + booking atomically
  const jobRequest = await prisma.jobRequest.create({
    data: {
      userId: session.user.id,
      categoryId: category.id,
      title,
      description: description || null,
      city: city || contractor.city || "",
      state: state || contractor.state || "",
      zipCode: zipCode || contractor.zipCode || "",
      size: size ? parseFloat(size) : null,
      urgency: "flexible",
      status: "booked",
    },
  });

  const booking = await prisma.booking.create({
    data: {
      jobRequestId: jobRequest.id,
      customerId: session.user.id,
      contractorId,
      agreedPrice: parseFloat(agreedPrice),
      scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
      notes: "Booked directly from contractor profile",
      leadFee: 15,
      status: "confirmed",
    },
  });

  // Notify contractor
  await prisma.notification.create({
    data: {
      userId: contractor.userId,
      type: "booking",
      title: "New instant booking!",
      body: `A customer just booked you for "${title}" at $${agreedPrice}.`,
      link: `/contractor/bookings/${booking.id}`,
    },
  });

  return NextResponse.json({ success: true, bookingId: booking.id }, { status: 201 });
}
