"use client";

import { useInventory } from "@/context/InventoryContext";
import type { Recipe } from "@/types";
import { Heart, Clock, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";

function RecipeCard({ recipe, ingredients }: { recipe: Recipe; ingredients: any[] }) {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);

  // Calculate how many ingredients the user has
  const matchedIngredientsCount = recipe.requiredIngredients.filter((requiredIng) => {
    return ingredients.some(
      (userIng) =>
        userIng.name.toLowerCase().includes(requiredIng.toLowerCase()) ||
        requiredIng.toLowerCase().includes(userIng.name.toLowerCase())
    );
  }).length;

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => router.push(`/recipe/${recipe.id}?from=favorites`)}
    >
      <div className="relative h-48 bg-gray-200 dark:bg-gray-700">
        {recipe.imageUrl && !imageError ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setImageError(true);
            }}
            loading="lazy"
            crossOrigin="anonymous"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/30 dark:to-blue-900/30">
            <Heart className="w-16 h-16 text-gray-400 dark:text-gray-500" />
          </div>
        )}

        <div className="absolute top-2 right-2">
          <Heart className="w-6 h-6 text-red-500 fill-red-500" />
        </div>
      </div>

      <div className="p-4">
        <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">{recipe.name}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{recipe.description}</p>
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{recipe.prepTime}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{recipe.servings} servings</span>
          </div>
        </div>
        <div className="text-sm text-green-700 dark:text-green-400 font-medium">
          {matchedIngredientsCount} / {recipe.requiredIngredients.length} ingredients available
        </div>
      </div>
    </div>
  );
}

export function FavoritesPage() {
  const router = useRouter();
  const { favorites, recipes, ingredients } = useInventory();

  const favoriteRecipes = useMemo(() => {
    return recipes.filter((r) => favorites.includes(r.id));
  }, [favorites, recipes]);

  if (favoriteRecipes.length === 0) {
    return (
      <div>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <Heart className="w-8 h-8 text-red-500 dark:text-red-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-red-600 dark:text-red-400">Favorites</h1>
              <p className="text-gray-600 dark:text-gray-400">Your favorite recipes will appear here</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Heart className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">You haven't added any favorites yet!</p>
          <button
            onClick={() => router.push("/meals")}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Browse Recipes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <Heart className="w-8 h-8 text-red-500 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-red-600 dark:text-red-400">Favorites</h1>
            <p className="text-gray-600 dark:text-gray-400">
              {favoriteRecipes.length} favorite recipe{favoriteRecipes.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {favoriteRecipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} ingredients={ingredients} />
        ))}
      </div>
    </div>
  );
}
