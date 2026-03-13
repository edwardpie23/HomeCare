import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { action } = body;

  try {
    if (action === "verify_contractor") {
      await prisma.contractor.update({
        where: { userId: id },
        data: { isVerified: true },
      });
      return NextResponse.json({ success: true, message: "Contractor verified" });
    }

    if (action === "deactivate_contractor") {
      await prisma.contractor.update({
        where: { userId: id },
        data: { isActive: false },
      });
      return NextResponse.json({ success: true, message: "Contractor deactivated" });
    }

    if (action === "activate_contractor") {
      await prisma.contractor.update({
        where: { userId: id },
        data: { isActive: true },
      });
      return NextResponse.json({ success: true, message: "Contractor activated" });
    }

    if (action === "activate_subscription") {
      const { months } = body;
      await prisma.contractor.update({
        where: { userId: id },
        data: {
          subscriptionStatus: "active",
          subscriptionEnds: new Date(
            Date.now() + (months || 1) * 30 * 24 * 60 * 60 * 1000
          ),
        },
      });
      return NextResponse.json({ success: true, message: "Subscription activated" });
    }

    if (action === "cancel_subscription") {
      await prisma.contractor.update({
        where: { userId: id },
        data: { subscriptionStatus: "inactive" },
      });
      return NextResponse.json({ success: true, message: "Subscription cancelled" });
    }

    if (action === "make_admin") {
      await prisma.user.update({
        where: { id },
        data: { role: "admin" },
      });
      return NextResponse.json({ success: true, message: "User promoted to admin" });
    }

    if (action === "remove_admin") {
      await prisma.user.update({
        where: { id },
        data: { role: "customer" },
      });
      return NextResponse.json({ success: true, message: "Admin role removed" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Admin user action error:", error);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Prevent deleting yourself
  if (session.user.id === id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
