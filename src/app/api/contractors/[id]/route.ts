import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const contractor = await prisma.contractor.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, createdAt: true } },
      pricingRules: { include: { category: true } },
      reviews: {
        include: {
          customer: { select: { name: true } },
          booking: { include: { jobRequest: { include: { category: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!contractor || !contractor.isActive) {
    return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
  }

  // Don't expose private fields
  const { stripeCustomerId, ...safe } = contractor;
  void stripeCustomerId;

  return NextResponse.json({ contractor: safe });
}
