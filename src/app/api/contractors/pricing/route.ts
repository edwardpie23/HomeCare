import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { JOB_CATEGORIES } from "@/lib/utils";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contractor = await prisma.contractor.findUnique({
      where: { userId: session.user.id },
      include: {
        pricingRules: { include: { category: true } },
      },
    });

    return NextResponse.json({ pricingRules: contractor?.pricingRules || [] });
  } catch (error) {
    console.error("Get pricing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "contractor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { categoryId, basePrice, pricePerUnit, unit, notes } = body;

    const contractor = await prisma.contractor.findUnique({
      where: { userId: session.user.id },
    });

    if (!contractor) {
      return NextResponse.json({ error: "Contractor profile not found" }, { status: 404 });
    }

    // Ensure category exists
    const cat = JOB_CATEGORIES.find((c) => c.id === categoryId);
    if (cat) {
      await prisma.jobCategory.upsert({
        where: { name: cat.name },
        update: {},
        create: {
          id: cat.id,
          name: cat.name,
          description: cat.description,
          icon: cat.icon,
          baseMinPrice: cat.baseMinPrice,
          baseMaxPrice: cat.baseMaxPrice,
          unit: cat.unit,
        },
      });
    }

    const rule = await prisma.pricingRule.upsert({
      where: {
        contractorId_categoryId: {
          contractorId: contractor.id,
          categoryId,
        },
      },
      update: {
        basePrice: parseFloat(basePrice),
        pricePerUnit: pricePerUnit ? parseFloat(pricePerUnit) : null,
        unit: unit || null,
        notes: notes || null,
      },
      create: {
        contractorId: contractor.id,
        categoryId,
        basePrice: parseFloat(basePrice),
        pricePerUnit: pricePerUnit ? parseFloat(pricePerUnit) : null,
        unit: unit || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ success: true, rule });
  } catch (error) {
    console.error("Save pricing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
