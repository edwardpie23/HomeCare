import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const job = await prisma.jobRequest.findUnique({
    where: { id },
    include: {
      category: true,
      estimates: {
        include: {
          contractor: { select: { businessName: true, phone: true, city: true, state: true, isVerified: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      booking: {
        include: {
          contractor: { select: { businessName: true, phone: true, city: true, state: true, isVerified: true } },
        },
      },
      user: { select: { name: true, email: true } },
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Customers can only see their own jobs; contractors and admins can see any
  if (
    session.user.role === "customer" &&
    job.userId !== session.user.id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ job });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const job = await prisma.jobRequest.findUnique({ where: { id } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only the owner or admin can edit
  if (job.userId !== session.user.id && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Don't allow editing once booked
  if (job.status === "booked" || job.status === "completed") {
    return NextResponse.json({ error: "Cannot edit a booked or completed job" }, { status: 400 });
  }

  const { title, description, urgency, size, address } = body;

  const updated = await prisma.jobRequest.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(urgency !== undefined && { urgency }),
      ...(size !== undefined && { size: size ? parseFloat(size) : null }),
      ...(address !== undefined && { address }),
    },
  });

  return NextResponse.json({ job: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const job = await prisma.jobRequest.findUnique({ where: { id } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (job.userId !== session.user.id && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (job.status === "booked" || job.status === "completed") {
    return NextResponse.json({ error: "Cannot delete a booked or completed job" }, { status: 400 });
  }

  await prisma.jobRequest.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
