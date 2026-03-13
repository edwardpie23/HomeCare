import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { anthropic } from "@/lib/anthropic";
import { JOB_CATEGORIES } from "@/lib/utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "contractor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contractor = await prisma.contractor.findUnique({ where: { userId: session.user.id } });
  if (!contractor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { id } = await params;

  // Accept inline data (not yet saved) or load from DB
  const body = await request.json();
  const {
    categoryId, projectTitle, description, size, lineItems: lineItemsRaw,
  } = body;

  const category = JOB_CATEGORIES.find((c) => c.id === categoryId);

  const lineItems: { item: string; cost: number }[] = Array.isArray(lineItemsRaw)
    ? lineItemsRaw
    : JSON.parse(lineItemsRaw || "[]");

  const prompt = `You are a professional contractor generating a MATERIALS PROCUREMENT LIST for a job.

Project: ${projectTitle || category?.name || "Home improvement"}
Category: ${category?.name || categoryId}
Size: ${size ? `${size} ${category?.unit || "units"}` : "not specified"}
Description: ${description || "Standard project"}
Line items from estimate:
${lineItems.map((li) => `  - ${li.item}: $${li.cost}`).join("\n")}

Generate a detailed materials list the contractor needs to buy before starting this job.
Be specific with quantities, unit sizes (gallons, boxes, sheets, etc.), and realistic unit costs.
This list is for the CONTRACTOR ONLY — it will NOT be shown to the customer.

Return ONLY valid JSON array:
[
  {
    "item": "Interior latex paint — eggshell finish",
    "qty": 3,
    "unit": "gallons",
    "unitCost": 45,
    "total": 135,
    "notes": "1 gal covers ~400 sq ft, 2 coats needed"
  },
  {
    "item": "Painter's tape 1.5\"",
    "qty": 4,
    "unit": "rolls",
    "unitCost": 7,
    "total": 28,
    "notes": ""
  }
]`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return NextResponse.json({ error: "AI failed to generate materials list" }, { status: 500 });
  }

  const materialsList = JSON.parse(jsonMatch[0]);

  // Save to DB if estimate exists
  const existing = await prisma.contractorEstimate.findFirst({
    where: { id, contractorId: contractor.id },
  });
  if (existing) {
    await prisma.contractorEstimate.update({
      where: { id },
      data: { materialsList: JSON.stringify(materialsList) },
    });
  }

  return NextResponse.json({ success: true, materialsList });
}
