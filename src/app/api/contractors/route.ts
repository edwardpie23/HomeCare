import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("category");
    const zipCode = searchParams.get("zip");

    const contractors = await prisma.contractor.findMany({
      where: {
        isActive: true,
        subscriptionStatus: { in: ["active", "trial"] },
        ...(zipCode ? { zipCode } : {}),
      },
      include: {
        user: { select: { name: true, email: true } },
        pricingRules: {
          include: { category: true },
          ...(categoryId ? { where: { categoryId } } : {}),
        },
      },
      take: 20,
    });

    return NextResponse.json({ contractors });
  } catch (error) {
    console.error("Get contractors error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "contractor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { businessName, phone, address, city, state, zipCode, bio, yearsExperience, specialties } = body;

    const contractor = await prisma.contractor.update({
      where: { userId: session.user.id },
      data: {
        businessName,
        phone,
        address,
        city,
        state,
        zipCode,
        bio,
        yearsExperience: parseInt(yearsExperience) || 0,
        specialties: JSON.stringify(specialties || []),
      },
    });

    return NextResponse.json({ success: true, contractor });
  } catch (error) {
    console.error("Update contractor error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
