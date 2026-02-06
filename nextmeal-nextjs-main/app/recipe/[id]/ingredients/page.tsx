"use client";

import { useParams, useRouter } from "next/navigation";
import { useInventory } from "@/context/InventoryContext";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useMemo } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function RecipeIngredientsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { recipes } = useInventory();
  const recipeId = params?.id as string;

  const recipe = useMemo(() => {
    return recipes.find((r) => r.id === recipeId);
  }, [recipeId, recipes]);

  if (!recipe) {
    return (
      <ProtectedRoute>
        <div className="max-w-6xl mx-auto p-6">
          <p className="text-gray-600 dark:text-gray-400">Recipe not found</p>
          <button
            onClick={() => router.push("/meals")}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Back to Recipes
          </button>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto p-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {recipe.name} - All Ingredients
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {recipe.ingredientDetails.length} ingredient{recipe.ingredientDetails.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
          <div className="grid grid-cols-5 gap-4">
            {recipe.ingredientDetails.map((item, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-4 text-center hover:shadow-md transition-shadow"
              >
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <div className="font-medium capitalize text-sm text-gray-900 dark:text-gray-100 mb-1">
                  {item.ingredient}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {item.amount
                    ? item.amount
                    : item.quantity && item.unit
                      ? `${item.quantity} ${item.unit}`
                      : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
