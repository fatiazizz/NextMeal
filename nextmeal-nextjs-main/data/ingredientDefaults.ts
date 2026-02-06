import type { IngredientDefault } from "@/types";

export const ingredientDefaults: Record<
  string,
  { category: string; unit: string; daysUntilExpiry?: number }
> = {
  milk: { category: "Dairy", unit: "l" },
  egg: { category: "Protein", unit: "pcs" },
  tomato: { category: "Vegetables", unit: "pcs" },
  rice: { category: "Grains", unit: "g" },
  yogurt: { category: "Dairy", unit: "g" },
  banana: { category: "Other", unit: "pcs" },
};


export function getIngredientDefaults(name: string): IngredientDefault {
  const key = name.trim().toLowerCase();
  return ingredientDefaults[key] ?? { unit: "pcs", category: "Other", daysUntilExpiry: 7 };
}

