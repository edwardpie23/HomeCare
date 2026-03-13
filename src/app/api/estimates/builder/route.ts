import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { JOB_CATEGORIES } from "@/lib/utils";
import { buildSizeMathPrompt } from "@/lib/pricing";
import { anthropic } from "@/lib/anthropic";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "contractor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    categoryId,
    projectTitle,
    description,
    size,
    city,
    state,
    urgency,
    customerName,
    notes: extraNotes,
  } = body;

  const category = JOB_CATEGORIES.find((c) => c.id === categoryId);
  if (!category) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const sizeNum = size ? parseFloat(size) : null;
  const sizeMath = buildSizeMathPrompt(categoryId, sizeNum, city, state);

  const prompt = `You are a professional contractor generating a detailed project estimate.

PROJECT:
- Type: ${category.name}
- Title: ${projectTitle || category.name}
- Customer: ${customerName || "Homeowner"}
- Location: ${city || "Unknown"}, ${state || ""}
- Size: ${sizeNum ? `${sizeNum} ${category.unit}` : "not specified"}
- Urgency: ${urgency === "asap" ? "ASAP" : urgency === "this_week" ? "This week" : "Flexible"}
- Description: ${description || "Standard " + category.name + " project"}
${extraNotes ? `- Special notes: ${extraNotes}` : ""}
${sizeMath}

RULES:
1. Start from the size-based calculation above — never return a generic flat number
2. A 200 sq ft job and a 1,500 sq ft job MUST produce significantly different prices
3. Generate 3-6 line items; costs must sum to ~avgPrice
4. Label labor lines with the rate, e.g. "Labor (400 sq ft × $2.20/sq ft)"

Return ONLY valid JSON:
{
  "minPrice": 800,
  "maxPrice": 1300,
  "avgPrice": 1050,
  "estimatedDays": 2,
  "validDays": 30,
  "breakdown": [
    {"item": "Labor (400 sq ft × $1.90/sq ft)", "cost": 760, "category": "labor"},
    {"item": "Paint & primer — 2 coats", "cost": 180, "category": "materials"},
    {"item": "Prep, tape & drop cloths", "cost": 60, "category": "materials"},
    {"item": "Equipment & cleanup", "cost": 50, "category": "other"}
  ],
  "terms": "50% deposit required to schedule. Balance due on completion. Price valid for 30 days.",
  "notes": "Includes all labor and materials. Assumes standard ceiling height and one color per room."
}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1200,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    return NextResponse.json({ error: "AI failed to generate estimate" }, { status: 500 });
  }

  return NextResponse.json({ success: true, estimate: JSON.parse(jsonMatch[0]) });
}
