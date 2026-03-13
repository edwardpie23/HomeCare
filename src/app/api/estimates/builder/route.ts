import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import { JOB_CATEGORIES } from "@/lib/utils";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Per-unit industry rates (mirrors estimates/route.ts)
const CATEGORY_RATES: Record<string, {
  laborPerUnit: [number, number];
  materialPerUnit: [number, number];
  unit: string;
  notes: string;
}> = {
  painting:    { laborPerUnit: [1.50, 3.50], materialPerUnit: [0.50, 1.25], unit: "sq ft",    notes: "Adjust for ceiling height, texture, color change." },
  tile:        { laborPerUnit: [6,    14   ], materialPerUnit: [2,    8   ], unit: "sq ft",    notes: "Complex patterns cost more. Add 10% for demo." },
  flooring:    { laborPerUnit: [2,    5    ], materialPerUnit: [2,    10  ], unit: "sq ft",    notes: "Hardwood higher; LVP lower. Add 15% for subfloor." },
  roofing:     { laborPerUnit: [3,    6    ], materialPerUnit: [2,    5   ], unit: "sq ft",    notes: "Steep pitch +20-40%. Tear-off +$1-2/sq ft." },
  concrete:    { laborPerUnit: [4,    8    ], materialPerUnit: [3,    6   ], unit: "sq ft",    notes: "Decorative/stamped is higher. Demo +$2-4/sq ft." },
  fence:       { laborPerUnit: [10,   20   ], materialPerUnit: [15,   35  ], unit: "linear ft",notes: "Wood privacy higher; chain link lower." },
  drywall:     { laborPerUnit: [2,    4    ], materialPerUnit: [0.50, 1.50], unit: "sq ft",    notes: "Minimum call-out $150-200. Texture match adds cost." },
  plumbing:    { laborPerUnit: [75,   150  ], materialPerUnit: [30,   200 ], unit: "hour",     notes: "Typical job 1-4 hrs. Emergency 1.5-2x." },
  electrical:  { laborPerUnit: [75,   130  ], materialPerUnit: [20,   150 ], unit: "hour",     notes: "Permit may be required +$100-300." },
  hvac:        { laborPerUnit: [80,   150  ], materialPerUnit: [50,   500 ], unit: "hour",     notes: "Parts vary widely by unit age." },
  landscaping: { laborPerUnit: [35,   65   ], materialPerUnit: [20,   100 ], unit: "hour",     notes: "Crew of 2-3. Equipment rental +$200-600/day." },
  handyman:    { laborPerUnit: [60,   100  ], materialPerUnit: [10,   50  ], unit: "hour",     notes: "Min 1-2 hr charge. Materials at cost + markup." },
};

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

  const rates = CATEGORY_RATES[categoryId];
  const hasSize = size && parseFloat(size) > 0;
  const sizeNum = hasSize ? parseFloat(size) : null;

  // Pre-compute math so Claude can't ignore the size
  let sizeMathSection = "";
  if (sizeNum && rates) {
    const [laborMin, laborMax] = rates.laborPerUnit;
    const [matMin, matMax] = rates.materialPerUnit;

    if (rates.unit === "sq ft" || rates.unit === "linear ft") {
      const calcLaborMin = Math.round(sizeNum * laborMin);
      const calcLaborMax = Math.round(sizeNum * laborMax);
      const calcMatMin   = Math.round(sizeNum * matMin);
      const calcMatMax   = Math.round(sizeNum * matMax);
      sizeMathSection = `
REQUIRED SIZE-BASED CALCULATION — your prices must derive from this:
  Size:      ${sizeNum} ${rates.unit}
  Labor:     ${sizeNum} × $${laborMin}–$${laborMax}/${rates.unit} = $${calcLaborMin}–$${calcLaborMax}
  Materials: ${sizeNum} × $${matMin}–$${matMax}/${rates.unit} = $${calcMatMin}–$${calcMatMax}
  Raw total: $${calcLaborMin + calcMatMin}–$${calcLaborMax + calcMatMax}
  Note: ${rates.notes}
Adjust from this base for complexity, prep, and local market (${city || "US"}).`;
    } else {
      sizeMathSection = `
HOURLY RATES: $${rates.laborPerUnit[0]}–$${rates.laborPerUnit[1]}/hour labor, $${rates.materialPerUnit[0]}–$${rates.materialPerUnit[1]}/hour materials.
Estimate hours needed from description, then multiply. Note: ${rates.notes}`;
    }
  } else if (rates) {
    sizeMathSection = `
Rate reference: $${rates.laborPerUnit[0]}–$${rates.laborPerUnit[1]}/${rates.unit} labor, $${rates.materialPerUnit[0]}–$${rates.materialPerUnit[1]}/${rates.unit} materials.
Note: ${rates.notes}`;
  }

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
${sizeMathSection}

INSTRUCTIONS:
1. Generate a professional, detailed estimate with 3-6 line items
2. Each line item must have a realistic cost; they must sum to ~avgPrice
3. Label labor lines with the rate, e.g. "Labor (400 sq ft × $2.20/sq ft)"
4. Prices must be proportional to the job size — do not return a generic flat number
5. Include realistic contingency or allowance if appropriate

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

  const estimate = JSON.parse(jsonMatch[0]);
  return NextResponse.json({ success: true, estimate });
}
