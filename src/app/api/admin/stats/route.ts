import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    totalUsers,
    totalContractors,
    activeSubscriptions,
    totalJobs,
    totalBookings,
    completedBookings,
    recentUsers,
    recentJobs,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "customer" } }),
    prisma.user.count({ where: { role: "contractor" } }),
    prisma.contractor.count({ where: { subscriptionStatus: "active" } }),
    prisma.jobRequest.count(),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: "completed" } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    }),
    prisma.jobRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { category: true, user: { select: { name: true } } },
    }),
  ]);

  const totalRevenue = await prisma.booking.aggregate({
    _sum: { leadFee: true },
    where: { leadFeePaid: true },
  });

  return NextResponse.json({
    stats: {
      totalUsers,
      totalContractors,
      activeSubscriptions,
      totalJobs,
      totalBookings,
      completedBookings,
      totalRevenue: totalRevenue._sum.leadFee || 0,
      mrr: activeSubscriptions * 49,
    },
    recentUsers,
    recentJobs,
  });
}
