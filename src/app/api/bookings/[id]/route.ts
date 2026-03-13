import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

const VALID_STATUSES = ["pending", "confirmed", "in_progress", "completed", "cancelled"];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      jobRequest: { include: { category: true } },
      customer: { select: { id: true, name: true, email: true } },
      contractor: {
        select: {
          id: true, businessName: true, phone: true, city: true, state: true, isVerified: true,
          user: { select: { id: true } },
        },
      },
      messages: {
        include: { sender: { select: { name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
      review: true,
    },
  });

  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const contractor =
    session.user.role === "contractor"
      ? await prisma.contractor.findUnique({ where: { userId: session.user.id } })
      : null;

  const hasAccess =
    booking.customerId === session.user.id ||
    (contractor && booking.contractorId === contractor.id) ||
    session.user.role === "admin";

  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ booking });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true } },
      contractor: { include: { user: { select: { id: true } } } },
      jobRequest: { select: { id: true, title: true } },
    },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only the contractor can update status; both parties can update scheduledDate
  const contractor =
    session.user.role === "contractor"
      ? await prisma.contractor.findUnique({ where: { userId: session.user.id } })
      : null;

  const isContractor = contractor && booking.contractorId === contractor.id;
  const isCustomer = booking.customerId === session.user.id;

  if (!isContractor && !isCustomer && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updateData: Record<string, unknown> = {};

  // Status change — contractor only
  if (body.status !== undefined) {
    if (!isContractor && session.user.role !== "admin") {
      return NextResponse.json({ error: "Only the contractor can update status" }, { status: 403 });
    }
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    updateData.status = body.status;

    // Sync job status
    if (body.status === "completed") {
      await prisma.jobRequest.update({
        where: { id: booking.jobRequest.id },
        data: { status: "completed" },
      });
    }

    // Notify customer of status change
    const statusLabels: Record<string, string> = {
      confirmed: "confirmed your booking",
      in_progress: "started work on your job",
      completed: "marked your job as completed",
      cancelled: "cancelled the booking",
    };
    if (statusLabels[body.status]) {
      await createNotification({
        userId: booking.customer.id,
        type: "status_update",
        title: `Booking ${body.status}`,
        body: `${booking.contractor.businessName} ${statusLabels[body.status]}: "${booking.jobRequest.title}"`,
        link: `/my-jobs/${booking.jobRequest.id}`,
      });
    }
  }

  if (body.scheduledDate !== undefined) {
    updateData.scheduledDate = body.scheduledDate ? new Date(body.scheduledDate) : null;
  }
  if (body.notes !== undefined) updateData.notes = body.notes;

  const updated = await prisma.booking.update({ where: { id }, data: updateData });
  return NextResponse.json({ booking: updated });
}
