import type { Recipe } from "@/types";
import { SYSTEM_USER_ID } from "@/types";

export const recipeDatabase: Recipe[] = [
  {
    id: "r1",
    name: "Tomato Omelette",
    description: "Quick omelette using eggs and tomatoes.",
    prepTime: "15 min",
    servings: 2,
    requiredIngredients: ["egg", "tomato", "salt"],
    ingredientDetails: [
      { ingredient: "egg", quantity: 2, unit: "pcs" },
      { ingredient: "tomato", quantity: 1, unit: "pcs" },
      { ingredient: "salt" },
    ],
    instructions: ["Beat eggs.", "Add chopped tomato.", "Cook in pan.", "Season and serve."],
    imageUrl:
      "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1200&q=60",
    ownerUserId: SYSTEM_USER_ID,
  },
  {
    id: "r2",
    name: "Simple Rice Bowl",
    description: "Fast bowl meal with rice base.",
    prepTime: "20 min",
    servings: 2,
    requiredIngredients: ["rice", "chicken", "onion"],
    ingredientDetails: [
      { ingredient: "rice", quantity: 200, unit: "g" },
      { ingredient: "chicken", quantity: 200, unit: "g" },
      { ingredient: "onion", quantity: 1, unit: "pcs" },
    ],
    instructions: ["Cook rice.", "Sauté onion + chicken.", "Combine and serve."],
    imageUrl:
      "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=60",
    ownerUserId: SYSTEM_USER_ID,
  },
  {
    id: "r3",
    name: "Yogurt Banana Bowl",
    description: "Breakfast bowl with yogurt and banana.",
    prepTime: "5 min",
    servings: 1,
    requiredIngredients: ["yogurt", "banana"],
    ingredientDetails: [
      { ingredient: "yogurt", quantity: 200, unit: "g" },
      { ingredient: "banana", quantity: 1, unit: "pcs" },
    ],
    instructions: ["Slice banana.", "Mix with yogurt.", "Serve."],
    imageUrl:
      "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=60",
    ownerUserId: SYSTEM_USER_ID,
  },
];
