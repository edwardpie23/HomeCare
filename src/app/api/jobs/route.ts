import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { JOB_CATEGORIES } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      categoryId,
      title,
      description,
      photos,
      city,
      state,
      zipCode,
      address,
      size,
      urgency,
      aiAnalysis,
      estimate,
    } = body;

    // Seed category if needed
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

    const job = await prisma.jobRequest.create({
      data: {
        userId: session.user.id,
        categoryId,
        title,
        description: description || null,
        photos: JSON.stringify(photos || []),
        city,
        state,
        zipCode,
        address: address || null,
        size: size ? parseFloat(size) : null,
        urgency: urgency || "flexible",
        aiAnalysis: aiAnalysis ? JSON.stringify(aiAnalysis) : null,
        status: "estimated",
      },
    });

    // Save AI estimate
    if (estimate) {
      await prisma.estimate.create({
        data: {
          jobRequestId: job.id,
          minPrice: estimate.minPrice,
          maxPrice: estimate.maxPrice,
          avgPrice: estimate.avgPrice,
          breakdown: JSON.stringify(estimate.breakdown || []),
          notes: estimate.notes || null,
          isAiGenerated: true,
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    }

    return NextResponse.json({ success: true, jobId: job.id }, { status: 201 });
  } catch (error) {
    console.error("Create job error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");

    if (role === "contractor") {
      // Contractors see jobs in their area / specialties
      const contractor = await prisma.contractor.findUnique({
        where: { userId: session.user.id },
      });

      if (!contractor) {
        return NextResponse.json({ jobs: [] });
      }

      const jobs = await prisma.jobRequest.findMany({
        where: {
          status: { in: ["estimated", "pending"] },
          booking: null,
        },
        include: {
          category: true,
          estimates: { where: { isAiGenerated: true } },
          user: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      return NextResponse.json({ jobs });
    }

    // Customer sees their own jobs
    const jobs = await prisma.jobRequest.findMany({
      where: { userId: session.user.id },
      include: {
        category: true,
        estimates: true,
        booking: {
          include: {
            contractor: { select: { businessName: true, phone: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("Get jobs error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
