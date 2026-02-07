"use client";

import { useInventory } from "@/context/InventoryContext";
import { useUser } from "@/context/UserContext";
import { ArrowLeft, Clock, Users, CheckCircle2, Heart, ChefHat, Edit2, Trash2, Globe, Tag, Flame } from "lucide-react";
import { SYSTEM_USER_ID } from "@/types";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Recipe } from "@/types";
import { RecipeEditModal } from "./RecipeEditModal";
import { recommendationsApi } from "@/utils/api";

export function RecipePage({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toggleFavorite, isFavorite, recipes, updateRecipe, deleteRecipe, refreshInventory } = useInventory();
  const { canEditRecipe, canDeleteRecipe, user } = useUser();
  
  const fromPage = searchParams.get("from") || "meals";

  const [imageError, setImageError] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUsing, setIsUsing] = useState(false);

  const recipe: Recipe | undefined = useMemo(() => {
    return recipes.find((r) => r.id === id);
  }, [id, recipes]);

  const favorite = recipe ? isFavorite(recipe.id) : false;

  // Permission checks
  const canEdit = recipe ? canEditRecipe(recipe.ownerUserId) : false;
  const canDelete = recipe ? canDeleteRecipe(recipe.ownerUserId) : false;

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleSaveEdit = async (recipeId: string, data: Partial<Recipe>) => {
    await updateRecipe(recipeId, data);
  };

  const handleDelete = async () => {
    if (!recipe) return;

    setIsDeleting(true);
    try {
      await deleteRecipe(recipe.id);
      router.push("/meals");
    } catch (error) {
      console.error("Failed to delete recipe:", error);
      alert("Failed to delete recipe. Please try again.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleUseIt = async () => {
    if (!recipe || !user || !refreshInventory || isUsing) return;
    setIsUsing(true);
    try {
      await recommendationsApi.useRecipe(recipe.id);
      await refreshInventory();
    } catch (error) {
      console.error("Failed to update inventory:", error);
      alert("Failed to deduct ingredients. Please try again.");
    } finally {
      setIsUsing(false);
    }
  };

  if (!recipe) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
        <p className="text-gray-600 dark:text-gray-400">Recipe not found</p>
        <button
          onClick={() => router.push("/meals")}
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Back to Suggestions
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => {
          if (fromPage === "favorites") {
            router.push("/favorites");
          } else {
            router.push("/meals");
          }
        }}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Recipe Image */}
        <div className="relative h-96 bg-gray-200 dark:bg-gray-700">
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
              <ChefHat className="w-24 h-24 text-gray-400 dark:text-gray-500" />
            </div>
          )}

          {/* Action buttons */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={() => toggleFavorite(recipe.id)}
              className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:scale-110 transition-transform"
              title={favorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart className={`w-6 h-6 ${favorite ? "text-red-500 fill-red-500" : "text-gray-400"}`} />
            </button>

            {canEdit && (
              <button
                onClick={handleEdit}
                className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:scale-110 transition-transform"
                title="Edit recipe"
              >
                <Edit2 className="w-6 h-6 text-blue-500" />
              </button>
            )}

            {canDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:scale-110 transition-transform"
                title="Delete recipe"
              >
                <Trash2 className="w-6 h-6 text-red-500" />
              </button>
            )}
          </div>

          {/* Owner badge */}
          {recipe.ownerUserId === SYSTEM_USER_ID && (
            <div className="absolute top-4 left-4 px-3 py-1 bg-green-600 text-white text-sm rounded-full">
              System Recipe
            </div>
          )}
          {user && recipe.ownerUserId === user.id && (
            <div className="absolute top-4 left-4 px-3 py-1 bg-blue-600 text-white text-sm rounded-full">
              Your Recipe
            </div>
          )}
        </div>

        {/* Header */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-8">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-4">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Clock className="w-5 h-5" />
              <span>{recipe.prepTime || "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Users className="w-5 h-5" />
              <span>{recipe.servings} servings</span>
            </div>
            {recipe.cuisine && (
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Globe className="w-5 h-5" />
                <span>{recipe.cuisine}</span>
              </div>
            )}
            {recipe.recipeCategory && (
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Tag className="w-5 h-5" />
                <span>{recipe.recipeCategory}</span>
              </div>
            )}
            {recipe.cookingMethod && (
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Flame className="w-5 h-5" />
                <span>{recipe.cookingMethod}</span>
              </div>
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{recipe.name}</h1>
          <p className="text-gray-700 dark:text-gray-300">{recipe.description}</p>

          {user && refreshInventory && (
            <button
              type="button"
              onClick={handleUseIt}
              disabled={isUsing}
              className="mt-6 w-full sm:w-auto min-w-[200px] py-3 px-6 bg-green-600 hover:bg-green-700 disabled:bg-green-500/70 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isUsing ? "Updating inventory…" : "Use it"}
            </button>
          )}
        </div>

        <div className="p-8">
          {/* Ingredients */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Ingredients</h3>
              {recipe.ingredientDetails.length > 5 && (
                <button
                  onClick={() => router.push(`/recipe/${recipe.id}/ingredients`)}
                  className="text-green-600 hover:text-green-700 text-sm font-medium"
                >
                  More
                </button>
              )}
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
              <ul className="space-y-3">
                {recipe.ingredientDetails.slice(0, 5).map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">
                      <span className="capitalize">{item.ingredient}</span>
                      {item.amount ? ` - ${item.amount}` : ""}
                      {!item.amount && item.quantity && item.unit
                        ? ` - ${item.quantity} ${item.unit}`
                        : ""}
                    </span>
                  </li>
                ))}
                {recipe.ingredientDetails.length > 5 && (
                  <li className="text-center pt-2">
                    <button
                      onClick={() => router.push(`/recipe/${recipe.id}/ingredients`)}
                      className="text-green-600 hover:text-green-700 text-sm font-medium"
                    >
                      + {recipe.ingredientDetails.length - 5} more ingredients
                    </button>
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Instructions */}
          <div>
            <h3 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Instructions</h3>
            <div className="space-y-4">
              {recipe.instructions.map((instruction, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center">
                    {index + 1}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 pt-1">{instruction}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && recipe && (
        <RecipeEditModal
          recipe={recipe}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveEdit}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Delete Recipe?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete "{recipe.name}"? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
