import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") || "customer";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;
  const search = searchParams.get("search") || "";

  const where = {
    role,
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        contractor: {
          select: {
            businessName: true,
            subscriptionStatus: true,
            subscriptionEnds: true,
            isVerified: true,
            isActive: true,
            rating: true,
            reviewCount: true,
            city: true,
            state: true,
          },
        },
        _count: { select: { jobRequests: true, bookings: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ users, total, pages: Math.ceil(total / limit) });
}
