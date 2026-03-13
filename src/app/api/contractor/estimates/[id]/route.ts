import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getContractorEstimate(userId: string, id: string) {
  const contractor = await prisma.contractor.findUnique({ where: { userId } });
  if (!contractor) return null;
  const estimate = await prisma.contractorEstimate.findFirst({
    where: { id, contractorId: contractor.id },
  });
  return estimate;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "contractor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const estimate = await getContractorEstimate(session.user.id, id);
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ estimate });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "contractor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getContractorEstimate(session.user.id, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();

  const updated = await prisma.contractorEstimate.update({
    where: { id },
    data: {
      ...(body.status !== undefined       && { status: body.status }),
      ...(body.customerName !== undefined  && { customerName: body.customerName }),
      ...(body.customerEmail !== undefined && { customerEmail: body.customerEmail }),
      ...(body.customerAddress !== undefined && { customerAddress: body.customerAddress }),
      ...(body.categoryId !== undefined   && { categoryId: body.categoryId }),
      ...(body.projectTitle !== undefined && { projectTitle: body.projectTitle }),
      ...(body.description !== undefined  && { description: body.description }),
      ...(body.size !== undefined         && { size: body.size ? parseFloat(body.size) : null }),
      ...(body.city !== undefined         && { city: body.city }),
      ...(body.state !== undefined        && { state: body.state }),
      ...(body.urgency !== undefined      && { urgency: body.urgency }),
      ...(body.lineItems !== undefined    && { lineItems: JSON.stringify(body.lineItems) }),
      ...(body.minPrice !== undefined     && { minPrice: body.minPrice ? parseFloat(body.minPrice) : null }),
      ...(body.maxPrice !== undefined     && { maxPrice: body.maxPrice ? parseFloat(body.maxPrice) : null }),
      ...(body.totalPrice !== undefined   && { totalPrice: body.totalPrice ? parseFloat(body.totalPrice) : null }),
      ...(body.taxRate !== undefined      && { taxRate: parseFloat(body.taxRate) }),
      ...(body.discount !== undefined     && { discount: parseFloat(body.discount) }),
      ...(body.estimatedDays !== undefined && { estimatedDays: body.estimatedDays ? parseInt(body.estimatedDays) : null }),
      ...(body.validDays !== undefined    && { validDays: parseInt(body.validDays) }),
      ...(body.terms !== undefined        && { terms: body.terms }),
      ...(body.notes !== undefined        && { notes: body.notes }),
      ...(body.internalNotes !== undefined && { internalNotes: body.internalNotes }),
      ...(body.materialsList !== undefined && { materialsList: body.materialsList ? JSON.stringify(body.materialsList) : null }),
    },
  });

  return NextResponse.json({ success: true, estimate: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "contractor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await getContractorEstimate(session.user.id, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.contractorEstimate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
