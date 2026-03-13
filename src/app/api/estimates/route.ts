import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Industry-standard per-unit rates used to anchor Claude's math
const CATEGORY_RATES: Record<string, {
  laborPerUnit: [number, number];
  materialPerUnit: [number, number];
  unit: string;
  notes: string;
}> = {
  painting: {
    laborPerUnit: [1.50, 3.50],
    materialPerUnit: [0.50, 1.25],
    unit: "sq ft",
    notes: "Rates increase for high ceilings, heavily textured walls, or dark-to-light color changes. Add 20-30% for heavy prep/patching.",
  },
  tile: {
    laborPerUnit: [6, 14],
    materialPerUnit: [2, 8],
    unit: "sq ft",
    notes: "Mosaic or complex patterns cost more. Add 10% for demo of existing tile.",
  },
  flooring: {
    laborPerUnit: [2, 5],
    materialPerUnit: [2, 10],
    unit: "sq ft",
    notes: "Hardwood on the higher end; LVP/laminate lower. Add 15% for subfloor prep.",
  },
  roofing: {
    laborPerUnit: [3, 6],
    materialPerUnit: [2, 5],
    unit: "sq ft",
    notes: "Steep pitch adds 20-40%. Tear-off of old shingles adds $1-2/sq ft.",
  },
  concrete: {
    laborPerUnit: [4, 8],
    materialPerUnit: [3, 6],
    unit: "sq ft",
    notes: "Decorative or stamped concrete is higher. Removal/demo adds $2-4/sq ft.",
  },
  fence: {
    laborPerUnit: [10, 20],
    materialPerUnit: [15, 35],
    unit: "linear ft",
    notes: "Wood privacy fence on high end; chain link on low end. Gates add $150-400 each.",
  },
  drywall: {
    laborPerUnit: [2, 4],
    materialPerUnit: [0.50, 1.50],
    unit: "sq ft",
    notes: "Small patch jobs have a minimum call-out fee ($150-200). Texture matching adds cost.",
  },
  plumbing: {
    laborPerUnit: [75, 150],
    materialPerUnit: [30, 200],
    unit: "hour",
    notes: "Typical job: 1-4 hours. Emergency/weekend rates are 1.5-2x normal.",
  },
  electrical: {
    laborPerUnit: [75, 130],
    materialPerUnit: [20, 150],
    unit: "hour",
    notes: "Permit may be required (+$100-300). Panel work is more expensive.",
  },
  hvac: {
    laborPerUnit: [80, 150],
    materialPerUnit: [50, 500],
    unit: "hour",
    notes: "Refrigerant handling requires certification. Parts vary widely by unit age.",
  },
  landscaping: {
    laborPerUnit: [35, 65],
    materialPerUnit: [20, 100],
    unit: "hour",
    notes: "Crew of 2-3 typical. Large equipment rental adds $200-600/day.",
  },
  handyman: {
    laborPerUnit: [60, 100],
    materialPerUnit: [10, 50],
    unit: "hour",
    notes: "Minimum 1-2 hour charge typical. Materials billed at cost + 10-20% markup.",
  },
};

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "contractor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contractor = await prisma.contractor.findUnique({
    where: { userId: session.user.id },
    include: { pricingRules: { include: { category: true } } },
  });
  if (!contractor) {
    return NextResponse.json({ error: "Contractor profile not found" }, { status: 404 });
  }

  const body = await request.json();
  const { jobRequestId, action, minPrice, maxPrice, avgPrice, notes } = body;

  const job = await prisma.jobRequest.findUnique({
    where: { id: jobRequestId },
    include: { category: true, user: { select: { name: true } } },
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  // === AI SUGGESTION ===
  if (action === "ai_suggest") {
    const photos: string[] = JSON.parse(job.photos || "[]");
    const aiAnalysis = job.aiAnalysis ? JSON.parse(job.aiAnalysis) : null;

    const pricingRule = contractor.pricingRules.find(
      (r: { categoryId: string }) => r.categoryId === job.categoryId
    );

    const rates = CATEGORY_RATES[job.categoryId];
    const hasSize = !!job.size && job.size > 0;

    // Pre-compute the math so Claude must use real numbers, not generic guesses
    let sizeMathSection = "";
    if (hasSize && rates) {
      const [laborMin, laborMax] = rates.laborPerUnit;
      const [matMin, matMax] = rates.materialPerUnit;
      const size = job.size!;

      if (rates.unit === "sq ft" || rates.unit === "linear ft") {
        const calcLaborMin = Math.round(size * laborMin);
        const calcLaborMax = Math.round(size * laborMax);
        const calcMatMin = Math.round(size * matMin);
        const calcMatMax = Math.round(size * matMax);
        sizeMathSection = `
REQUIRED SIZE-BASED CALCULATION — derive your final prices from this:
  Job size: ${size} ${rates.unit}
  Labor:     ${size} × $${laborMin}–$${laborMax}/${rates.unit} = $${calcLaborMin}–$${calcLaborMax}
  Materials: ${size} × $${matMin}–$${matMax}/${rates.unit} = $${calcMatMin}–$${calcMatMax}
  Raw total before complexity adjustments: $${calcLaborMin + calcMatMin}–$${calcLaborMax + calcMatMax}
  Industry note: ${rates.notes}

Adjust this base total for complexity, condition shown in photos, prep work, and local market (${job.city}, ${job.state}).
Your final minPrice/maxPrice MUST be proportional to ${size} ${rates.unit}. Do NOT return a flat generic number.`;
      } else {
        sizeMathSection = `
HOURLY ESTIMATE GUIDE:
  Labor rate: $${laborMin}–$${laborMax}/hour for ${job.category.name}
  Materials: ~$${matMin}–$${matMax} per billable hour
  Estimate hours required from description and photos, then multiply.
  Industry note: ${rates.notes}`;
      }
    } else if (rates) {
      sizeMathSection = `
No size specified — estimate scope from description and photos.
Rate reference: $${rates.laborPerUnit[0]}–$${rates.laborPerUnit[1]}/${rates.unit} labor, $${rates.materialPerUnit[0]}–$${rates.materialPerUnit[1]}/${rates.unit} materials.
Industry note: ${rates.notes}`;
    }

    const messageContent: Anthropic.MessageParam["content"] = [];

    for (const photo of photos.slice(0, 2)) {
      if (photo.startsWith("data:image/")) {
        const [mediaTypePart, base64Data] = photo.split(",");
        const mediaType = mediaTypePart.split(":")[1].split(";")[0] as
          | "image/jpeg" | "image/png" | "image/gif" | "image/webp";
        messageContent.push({
          type: "image",
          source: { type: "base64", media_type: mediaType, data: base64Data },
        });
      }
    }

    const prompt = `You are an experienced home improvement contractor generating a precise, size-accurate quote.

JOB:
- Category: ${job.category.name}
- Title: ${job.title}
- Location: ${job.city}, ${job.state}
- Size: ${hasSize ? `${job.size} ${job.category.unit}` : "not specified"}
- Urgency: ${job.urgency === "asap" ? "ASAP — may justify 10-15% premium" : job.urgency === "this_week" ? "This week" : "Flexible"}
- Description: ${job.description || "None provided"}
${aiAnalysis ? `- Complexity: ${aiAnalysis.complexity} — ${aiAnalysis.detected}` : ""}
${pricingRule ? `- This contractor's configured rate: $${pricingRule.minPrice}–$${pricingRule.maxPrice}` : ""}
${photos.length > 0 ? `- ${photos.length} photo(s) provided above — examine for scope and condition` : "- No photos"}
${sizeMathSection}

RULES YOU MUST FOLLOW:
1. Start from the size-based numbers above — never return a generic flat price
2. A 200 sq ft job and a 1,500 sq ft job MUST produce significantly different prices
3. Each breakdown line item must have a realistic individual cost; they must sum to ~avgPrice
4. Label labor lines with the calculation, e.g. "Labor (600 sq ft × $2.10/sq ft)"
5. Be competitive for the ${job.city}, ${job.state} market

Return ONLY valid JSON, no explanation:
{
  "minPrice": 1100,
  "maxPrice": 1800,
  "avgPrice": 1450,
  "breakdown": [
    {"item": "Labor (600 sq ft × $1.90/sq ft)", "cost": 1140},
    {"item": "Paint & primer — 2 coats", "cost": 230},
    {"item": "Prep, tape & drop cloths", "cost": 60},
    {"item": "Cleanup & hauling", "cost": 20}
  ],
  "notes": "Includes all labor and materials. Price assumes standard ceiling height and one color.",
  "estimatedDays": 2
}`;

    messageContent.push({ type: "text", text: prompt });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: messageContent }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return NextResponse.json({ error: "AI failed to generate estimate" }, { status: 500 });
    }

    const suggestion = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ success: true, suggestion });
  }

  // === SAVE ESTIMATE ===
  if (action === "save") {
    await prisma.estimate.deleteMany({
      where: { jobRequestId, contractorId: contractor.id },
    });

    const estimate = await prisma.estimate.create({
      data: {
        jobRequestId,
        contractorId: contractor.id,
        minPrice: parseFloat(minPrice),
        maxPrice: parseFloat(maxPrice),
        avgPrice: parseFloat(avgPrice),
        notes: notes || null,
        isAiGenerated: false,
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({ success: true, estimate });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
