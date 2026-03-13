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
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;
  const status = searchParams.get("status") || "";

  const where = status ? { status } : {};

  const [jobs, total] = await Promise.all([
    prisma.jobRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        category: true,
        user: { select: { name: true, email: true } },
        estimates: { where: { isAiGenerated: true } },
        booking: {
          include: {
            contractor: { select: { businessName: true } },
          },
        },
      },
    }),
    prisma.jobRequest.count({ where }),
  ]);

  return NextResponse.json({ jobs, total, pages: Math.ceil(total / limit) });
}
