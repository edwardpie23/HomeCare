import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type BookingWithDetails = {
  id: string;
  status: string;
  agreedPrice: number;
  createdAt: Date;
  jobRequest: { category: { name: string } };
  messages: { createdAt: Date }[];
};

type EstimateRow = {
  id: string;
  status: string;
  createdAt: Date;
  jobRequestId: string;
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "contractor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contractor = await prisma.contractor.findUnique({
    where: { userId: session.user.id },
    select: { id: true, rating: true, reviewCount: true },
  });

  if (!contractor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const bookings = (await prisma.booking.findMany({
    where: { contractorId: contractor.id },
    include: {
      jobRequest: { include: { category: true } },
      messages: { orderBy: { createdAt: "asc" }, take: 1 },
    },
    orderBy: { createdAt: "asc" },
  })) as BookingWithDetails[];

  const estimates = (await prisma.estimate.findMany({
    where: { contractorId: contractor.id },
    select: { id: true, status: true, createdAt: true, jobRequestId: true },
  })) as EstimateRow[];

  const reviews = await prisma.review.findMany({
    where: { contractorId: contractor.id },
    select: { rating: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Revenue by month (last 6 months)
  const now = new Date();
  const revenueByMonth: Record<string, number> = {};
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    months.push(key);
    revenueByMonth[key] = 0;
  }

  bookings
    .filter((b) => b.status === "completed")
    .forEach((b) => {
      const d = new Date(b.createdAt);
      const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      if (key in revenueByMonth) revenueByMonth[key] += b.agreedPrice;
    });

  // Jobs by category
  const categoryCount: Record<string, number> = {};
  bookings.forEach((b) => {
    const name = b.jobRequest.category.name;
    categoryCount[name] = (categoryCount[name] || 0) + 1;
  });
  const topCategories = Object.entries(categoryCount)
    .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]: [string, number]) => ({ name, count }));

  // Funnel: estimates -> bookings -> completed
  const totalEstimates = estimates.length;
  const totalBookings = bookings.length;
  const completedBookings = bookings.filter((b) => b.status === "completed").length;
  const cancelledBookings = bookings.filter((b) => b.status === "cancelled").length;
  const inProgressBookings = bookings.filter((b) => ["confirmed", "in_progress"].includes(b.status)).length;

  // Total revenue
  const totalRevenue = bookings
    .filter((b) => b.status === "completed")
    .reduce((sum: number, b) => sum + b.agreedPrice, 0);

  // Avg response time (time between booking created and first message from contractor)
  let avgResponseMinutes: number | null = null;
  const responseTimes: number[] = [];
  for (const booking of bookings) {
    const firstMsg = booking.messages[0];
    if (firstMsg) {
      const mins = (new Date(firstMsg.createdAt).getTime() - new Date(booking.createdAt).getTime()) / 60000;
      if (mins >= 0 && mins < 10080) responseTimes.push(mins); // within 1 week
    }
  }
  if (responseTimes.length > 0) {
    avgResponseMinutes = Math.round(responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length);
  }

  // Win rate: bookings / (bookings + declined estimates)
  const declinedEstimates = estimates.filter((e) => e.status === "declined").length;
  const winRate = totalEstimates > 0
    ? Math.round((totalBookings / totalEstimates) * 100)
    : null;

  // Jobs booked by month
  const jobsByMonth: Record<string, number> = {};
  months.forEach((m) => { jobsByMonth[m] = 0; });
  bookings.forEach((b) => {
    const d = new Date(b.createdAt);
    const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    if (key in jobsByMonth) jobsByMonth[key]++;
  });

  return NextResponse.json({
    summary: {
      totalRevenue,
      totalBookings,
      completedBookings,
      cancelledBookings,
      inProgressBookings,
      totalEstimates,
      declinedEstimates,
      winRate,
      avgResponseMinutes,
      rating: contractor.rating,
      reviewCount: contractor.reviewCount,
    },
    revenueByMonth: months.map((m) => ({ month: m, revenue: revenueByMonth[m] })),
    jobsByMonth: months.map((m) => ({ month: m, jobs: jobsByMonth[m] })),
    topCategories,
    recentReviews: reviews.slice(-5).reverse(),
  });
}
