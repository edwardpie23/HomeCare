import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { JOB_CATEGORIES } from "@/lib/utils";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

    let aiAnalysis = null;
    let minPrice = category.baseMinPrice;
    let maxPrice = category.baseMaxPrice;

    // Build message content
    const messageContent: Anthropic.MessageParam["content"] = [];

    // Add photos if provided
    if (photos && photos.length > 0) {
      for (const photo of photos.slice(0, 3)) {
        // Limit to 3 photos
        if (photo.startsWith("data:image/")) {
          const [mediaTypePart, base64Data] = photo.split(",");
          const mediaType = mediaTypePart
            .split(":")[1]
            .split(";")[0] as
            | "image/jpeg"
            | "image/png"
            | "image/gif"
            | "image/webp";
          messageContent.push({
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64Data,
            },
          });
        }
      }
    }

    const prompt = `You are an expert home repair cost estimator with 20+ years of experience.

Job Category: ${category.name}
Location: ${city || "Unknown"}, ${state || "Unknown"}
${description ? `Customer Description: ${description}` : ""}
${size ? `Size/Area: ${size} ${category.unit}` : ""}
${photos && photos.length > 0 ? `Photos provided: ${photos.length} photo(s) attached above.` : "No photos provided."}

${photos && photos.length > 0 ? "Analyze the photo(s) carefully to assess:" : "Based on the job category, estimate:"}
1. The scope and complexity of the work
2. What specific repairs or work is needed
3. Materials required
4. Labor time estimate
5. Any potential complications

Then provide a cost estimate in this EXACT JSON format (no other text):
{
  "detected": "Brief description of what you see / the job",
  "complexity": "simple|medium|complex",
  "estimatedHours": 2.5,
  "minPrice": 300,
  "maxPrice": 550,
  "avgPrice": 425,
  "breakdown": [
    {"item": "Labor", "cost": 280},
    {"item": "Materials", "cost": 120},
    {"item": "Other fees", "cost": 25}
  ],
  "notes": "Any important notes about the job",
  "confidence": "high|medium|low"
}

Use realistic prices for ${city || "a typical US"} market. The base range for ${category.name} is $${category.baseMinPrice}-$${category.baseMaxPrice}.`;

    messageContent.push({
      type: "text",
      text: prompt,
    });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: messageContent,
        },
      ],
    });

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
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
    // Return fallback estimate on error
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
