import { z } from "zod";

const nutritionSchema = z.object({
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fats: z.number(),
});

export type AnalyzedMeal = {
  mealName: string;
  calories: number;
  protein: number;
  ingredients: string;
  confidence: "High" | "Low";
};

export async function analyzeMealWithAIs(base64Image: string, mimeType: string): Promise<AnalyzedMeal> {
  const GEMINI_VISION_KEY = process.env.GEMINI_API_KEY;
  const GEMINI_NUTRITION_KEY = process.env.GEMINI_NUTRITION_API_KEY;

  if (!GEMINI_VISION_KEY || !GEMINI_NUTRITION_KEY) {
    throw new Error("Missing Gemini API keys for vision or nutrition analysis");
  }

  // Step 1: Vision Analysis with Gemini 2.5 Flash (Key 1)
  const visionPrompt = `
    Identify the food in this image. Focus closely on Indian staples like Dosa, Idli, Vada, Poha, Upma, Dals, Parathas, Biryanis.
    If it's an Indian dish, estimate portions using regional units like '1 katori', '1 medium roti (6-inch)', or '1 scoop'.
    Return a single JSON object (with no markdown wrappers) in this exact format:
    {
      "dishName": "Name of dish",
      "ingredientsList": "e.g. 150g Paneer, 10g Ghee, Tomato gravy",
      "confidence": "High" or "Low" 
    }
  `;

  const visionRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_VISION_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: visionPrompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!visionRes.ok) {
    const errorText = await visionRes.text();
    throw new Error(`Gemini Vision failed: ${errorText}`);
  }

  const visionData = await visionRes.json();
  const visionOutput = visionData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!visionOutput) throw new Error("Gemini Vision returned no text.");

  const analysis = JSON.parse(visionOutput) as { dishName: string; ingredientsList: string; confidence: "High" | "Low" };

  // Step 2: Nutrition Analysis with Gemini 2.5 Flash (Key 2 - separate quota)
  const nutritionPrompt = `
    Analyze the following ingredients and estimate the total nutritional content for this meal:
    Ingredients: ${analysis.ingredientsList}
    
    Based on standard Indian portion sizes and ingredient density, calculate and return a JSON object (no markdown wrappers) with:
    {
      "calories": estimated total calories as a number,
      "protein": estimated total protein in grams as a number,
      "carbs": estimated total carbohydrates in grams as a number,
      "fats": estimated total fats in grams as a number
    }
    
    Use conservative estimates. For example:
    - 50g paneer = ~110 cal, 7g protein
    - 1 medium roti (30g) = ~80 cal, 2.5g protein
    - 10g ghee = ~90 cal, 0g protein
    - Standard curry base (tomato gravy, onion, spices) per serving = ~30-50 cal, minimal protein
  `;

  const nutritionRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_NUTRITION_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: nutritionPrompt },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!nutritionRes.ok) {
    const errorText = await nutritionRes.text();
    throw new Error(`Gemini Nutrition failed: ${errorText}`);
  }

  const nutritionData = await nutritionRes.json();
  const nutritionOutput = nutritionData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!nutritionOutput) throw new Error("Gemini Nutrition returned no text.");

  const nutrition = JSON.parse(nutritionOutput);
  const parsedNutrition = nutritionSchema.parse(nutrition);

  return {
    mealName: analysis.dishName,
    calories: Math.round(parsedNutrition.calories),
    protein: Math.round(parsedNutrition.protein),
    ingredients: analysis.ingredientsList,
    confidence: analysis.confidence,
  };
}
