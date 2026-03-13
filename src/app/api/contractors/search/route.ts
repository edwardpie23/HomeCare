import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";
  const state = searchParams.get("state") || "";
  const verifiedOnly = searchParams.get("verified") === "true";

  const contractors = await prisma.contractor.findMany({
    where: {
      isActive: true,
      subscriptionStatus: "active",
      ...(verifiedOnly ? { isVerified: true } : {}),
      ...(state ? { state: { equals: state, mode: "insensitive" } } : {}),
      ...(q
        ? {
            OR: [
              { businessName: { contains: q, mode: "insensitive" } },
              { bio: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(category
        ? { pricingRules: { some: { category: { id: category } } } }
        : {}),
    },
    include: {
      pricingRules: {
        include: { category: { select: { name: true, icon: true } } },
      },
    },
    orderBy: [{ isVerified: "desc" }, { rating: "desc" }, { reviewCount: "desc" }],
    take: 50,
  });

  return NextResponse.json({ contractors });
}
