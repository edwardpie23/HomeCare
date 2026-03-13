import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const bookingId = searchParams.get("bookingId");
  if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
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

  const messages = await prisma.message.findMany({
    where: { bookingId },
    include: { sender: { select: { name: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });

  // Mark incoming unread messages as read
  await prisma.message.updateMany({
    where: { bookingId, senderId: { not: session.user.id }, read: false },
    data: { read: true },
  });

  return NextResponse.json({ messages });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookingId, body } = await request.json();
  if (!bookingId || !body?.trim()) {
    return NextResponse.json({ error: "bookingId and body required" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: { select: { id: true, name: true } },
      contractor: { include: { user: { select: { id: true } } } },
      jobRequest: { select: { id: true, title: true } },
    },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const contractor =
    session.user.role === "contractor"
      ? await prisma.contractor.findUnique({ where: { userId: session.user.id } })
      : null;

  const isCustomer = booking.customerId === session.user.id;
  const isContractor = contractor && booking.contractorId === contractor.id;

  if (!isCustomer && !isContractor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const message = await prisma.message.create({
    data: {
      bookingId,
      senderId: session.user.id,
      senderRole: session.user.role,
      body: body.trim(),
    },
    include: { sender: { select: { name: true, role: true } } },
  });

  // Notify the other party
  const recipientId = isCustomer ? booking.contractor.user.id : booking.customer.id;
  const senderName = session.user.name || (isCustomer ? "Customer" : "Contractor");
  const recipientLink = isCustomer
    ? `/contractor/bookings/${bookingId}`
    : `/my-jobs/${booking.jobRequest.id}`;

  await createNotification({
    userId: recipientId,
    type: "message",
    title: `Message from ${senderName}`,
    body: body.trim().slice(0, 100),
    link: recipientLink,
  });

  return NextResponse.json({ message }, { status: 201 });
}
