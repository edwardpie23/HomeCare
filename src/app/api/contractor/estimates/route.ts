import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function genEstimateNumber() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `EST-${ymd}-${Math.floor(Math.random() * 9000) + 1000}`;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "contractor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contractor = await prisma.contractor.findUnique({ where: { userId: session.user.id } });
  if (!contractor) return NextResponse.json({ estimates: [] });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";

  const estimates = await prisma.contractorEstimate.findMany({
    where: {
      contractorId: contractor.id,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { customerName: { contains: search } },
              { projectTitle: { contains: search } },
              { estimateNumber: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ estimates });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "contractor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contractor = await prisma.contractor.findUnique({ where: { userId: session.user.id } });
  if (!contractor) return NextResponse.json({ error: "Contractor profile not found" }, { status: 404 });

  const body = await request.json();

  const estimate = await prisma.contractorEstimate.create({
    data: {
      contractorId: contractor.id,
      estimateNumber: genEstimateNumber(),
      status: body.status || "draft",
      customerName: body.customerName || null,
      customerEmail: body.customerEmail || null,
      customerAddress: body.customerAddress || null,
      categoryId: body.categoryId || null,
      projectTitle: body.projectTitle || null,
      description: body.description || null,
      size: body.size ? parseFloat(body.size) : null,
      city: body.city || null,
      state: body.state || null,
      urgency: body.urgency || "flexible",
      lineItems: JSON.stringify(body.lineItems || []),
      minPrice: body.minPrice ? parseFloat(body.minPrice) : null,
      maxPrice: body.maxPrice ? parseFloat(body.maxPrice) : null,
      totalPrice: body.totalPrice ? parseFloat(body.totalPrice) : null,
      taxRate: body.taxRate ? parseFloat(body.taxRate) : 0,
      discount: body.discount ? parseFloat(body.discount) : 0,
      estimatedDays: body.estimatedDays ? parseInt(body.estimatedDays) : null,
      validDays: body.validDays ? parseInt(body.validDays) : 30,
      terms: body.terms || null,
      notes: body.notes || null,
      internalNotes: body.internalNotes || null,
      materialsList: body.materialsList ? JSON.stringify(body.materialsList) : null,
    },
  });

  return NextResponse.json({ success: true, estimate }, { status: 201 });
}
