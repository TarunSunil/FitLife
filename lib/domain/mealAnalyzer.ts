import { z } from "zod";
import type { AnalyzedNutritionItem } from "@/lib/types/nutrition";

const nutritionItemSchema = z.object({
  name: z.string().min(1),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fats: z.number(),
});

const fastApiResponseSchema = z
  .object({
    mealName: z.string().min(1),
    calories: z.number(),
    protein: z.number(),
    ingredients: z.string().default(""),
    confidence: z.enum(["High", "Low"]).default("Low"),
    nutritionItems: z.array(nutritionItemSchema).optional(),
    items: z.array(nutritionItemSchema).optional(),
  })
  .transform((raw) => ({
    mealName: raw.mealName,
    calories: raw.calories,
    protein: raw.protein,
    ingredients: raw.ingredients,
    confidence: raw.confidence,
    nutritionItems: raw.nutritionItems ?? raw.items ?? [],
  }));

const fastApiRequestSchema = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.string().min(1),
});

export type AnalyzedMeal = {
  mealName: string;
  calories: number;
  protein: number;
  ingredients: string;
  confidence: "High" | "Low";
  nutritionItems: AnalyzedNutritionItem[];
};

const RETRY_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchAnalyzerWithRetry(url: string, body: object): Promise<Response> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.FASTAPI_MEAL_ANALYZER_TOKEN
            ? { Authorization: `Bearer ${process.env.FASTAPI_MEAL_ANALYZER_TOKEN}` }
            : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (response.ok) {
        clearTimeout(timeoutId);
        return response;
      }

      const bodyText = await response.text();
      console.error("[meal-analyzer] fastapi call failed", {
        status: response.status,
        attempt,
        body: bodyText.slice(0, 300),
      });

      clearTimeout(timeoutId);

      if (!RETRY_STATUSES.has(response.status) || attempt === maxAttempts) {
        throw new Error(`Meal analyzer failed: ${bodyText || response.statusText}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      const isAbort = error instanceof Error && error.name === "AbortError";

      console.error("[meal-analyzer] fastapi request exception", {
        attempt,
        error: error instanceof Error ? error.message : String(error),
        timeout: isAbort,
      });

      if (attempt === maxAttempts) {
        if (isAbort) {
          throw new Error("Image analysis timed out. Please try a smaller image or retry.");
        }

        throw new Error(`Meal analyzer failed after retries: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    await sleep(300 * 2 ** (attempt - 1));
  }

  throw new Error("Unexpected analyzer retry flow state");
}

export async function analyzeMealWithAIs(base64Image: string, mimeType: string): Promise<AnalyzedMeal> {
  const analyzerUrl = process.env.FASTAPI_MEAL_ANALYZER_URL;

  if (!analyzerUrl) {
    throw new Error("Missing FASTAPI_MEAL_ANALYZER_URL for meal analysis");
  }
  const payload = fastApiRequestSchema.parse({
    imageBase64: base64Image,
    mimeType,
  });

  const response = await fetchAnalyzerWithRetry(analyzerUrl, payload);
  const raw = await response.json();
  const parsed = fastApiResponseSchema.parse(raw);

  const nutritionItems: AnalyzedNutritionItem[] = parsed.nutritionItems.map((item) => ({
    name: item.name,
    calories: Math.round(item.calories),
    protein: Math.round(item.protein),
    carbs: Math.round(item.carbs),
    fats: Math.round(item.fats),
  }));

  return {
    mealName: parsed.mealName,
    calories: Math.round(parsed.calories),
    protein: Math.round(parsed.protein),
    ingredients: parsed.ingredients,
    confidence: parsed.confidence,
    nutritionItems,
  };
}
