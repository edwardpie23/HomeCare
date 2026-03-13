import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { JOB_CATEGORIES } from "@/lib/utils";
import { buildSizeMathPrompt } from "@/lib/pricing";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  let categoryId = "";
  try {
    const body = await request.json();
    const { photos, description, size, city, state } = body;
    categoryId = body.categoryId;

    const category = JOB_CATEGORIES.find((c) => c.id === categoryId);
    if (!category) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    const sizeNum = size ? parseFloat(size) : null;
    const sizeMath = buildSizeMathPrompt(categoryId, sizeNum, city, state);

    const messageContent: Anthropic.MessageParam["content"] = [];

    if (photos && photos.length > 0) {
      for (const photo of photos.slice(0, 3)) {
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
    }

    const prompt = `You are an expert home repair cost estimator with 20+ years of experience.

Job Category: ${category.name}
Location: ${city || "Unknown"}, ${state || "Unknown"}
${description ? `Customer Description: ${description}` : ""}
${sizeNum ? `Size/Area: ${sizeNum} ${category.unit}` : ""}
${photos?.length > 0 ? `Photos: ${photos.length} attached above — analyze carefully.` : "No photos provided."}
${sizeMath}

${photos?.length > 0 ? "Examine the photos closely to assess scope and condition." : "Estimate based on the category and description."}

RULES:
1. Start from the size-based calculation above — never return a generic flat number
2. A 200 ${category.unit} job and a 1,500 ${category.unit} job must produce very different prices
3. Breakdown item costs must sum to approximately avgPrice
4. Label labor lines with the rate used, e.g. "Labor (500 sq ft × $2.20/sq ft)"
5. Be realistic for the ${city || "US"} market

Return ONLY this JSON (no other text):
{
  "detected": "Brief description of what the job involves",
  "complexity": "simple|medium|complex",
  "estimatedHours": 4,
  "minPrice": 900,
  "maxPrice": 1500,
  "avgPrice": 1200,
  "breakdown": [
    {"item": "Labor (500 sq ft × $1.80/sq ft)", "cost": 900},
    {"item": "Paint & primer — 2 coats", "cost": 220},
    {"item": "Prep, tape & drop cloths", "cost": 80}
  ],
  "notes": "Includes all labor and materials.",
  "confidence": "high|medium|low"
}`;

    messageContent.push({ type: "text", text: prompt });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: messageContent }],
    });

    const responseText = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    let aiAnalysis = null;
    let minPrice = category.baseMinPrice;
    let maxPrice = category.baseMaxPrice;

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      aiAnalysis = parsed;
      minPrice = parsed.minPrice || minPrice;
      maxPrice = parsed.maxPrice || maxPrice;
    }

    return NextResponse.json({
      success: true,
      estimate: {
        minPrice,
        maxPrice,
        avgPrice: aiAnalysis?.avgPrice || Math.round((minPrice + maxPrice) / 2),
        breakdown: aiAnalysis?.breakdown || [],
        notes: aiAnalysis?.notes || "",
        confidence: aiAnalysis?.confidence || "medium",
        detected: aiAnalysis?.detected || category.name,
        complexity: aiAnalysis?.complexity || "medium",
        isAiGenerated: true,
      },
    });
  } catch (error) {
    console.error("Estimate error:", error);
    const category = JOB_CATEGORIES.find((c) => c.id === categoryId);
    return NextResponse.json({
      success: true,
      estimate: {
        minPrice: category?.baseMinPrice || 200,
        maxPrice: category?.baseMaxPrice || 800,
        avgPrice: category ? Math.round((category.baseMinPrice + category.baseMaxPrice) / 2) : 500,
        breakdown: [],
        notes: "Estimate based on typical job pricing. Actual cost may vary.",
        confidence: "low",
        detected: category?.name || "Home Repair",
        complexity: "medium",
        isAiGenerated: false,
      },
    });
  }
}
