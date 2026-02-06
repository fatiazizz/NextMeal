"use client";

import { useMemo, useState, useEffect } from "react";
import { useInventory } from "../../context/InventoryContext";
import { useUser } from "@/context/UserContext";
import type { MealSuggestion, Recipe } from "@/types";
import { SYSTEM_USER_ID } from "@/types";
import {
  ChefHat,
  Clock,
  Users,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  X,
  Package,
  Edit2,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { RecipeEditModal } from "../recipes/RecipeEditModal";
import { IngredientSelectRow } from "../recipes/IngredientSelectRow";
import { cuisinesApi, cookingMethodsApi, recommendationsApi } from "@/utils/api";
import type { CuisineOption, CookingMethodOption } from "@/utils/api";

export function MealSuggestionsPage() {
  const router = useRouter();
  const { ingredients, recipes, addCustomRecipe, updateRecipe, deleteRecipe } = useInventory();
  const { canEditRecipe, canDeleteRecipe, user } = useUser();

  const [sortBy, setSortBy] = useState<"match" | "expiry">("expiry");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [deletingRecipeId, setDeletingRecipeId] = useState<string | null>(null);

  const [cuisines, setCuisines] = useState<CuisineOption[]>([]);
  const [cookingMethods, setCookingMethods] = useState<CookingMethodOption[]>([]);

  const [apiSuggestions, setApiSuggestions] = useState<MealSuggestion[] | null>(null);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);

  const [newRecipe, setNewRecipe] = useState({
    name: "",
    description: "",
    prepTime: "",
    servings: 2,
    ingredientRows: [null] as Array<{
      ingredientId: string;
      ingredientName: string;
      quantity: number;
      unit: string;
      allowedUnits: string[];
    } | null>,
    instructions: [""],
    imageUrl: "",
    cuisineId: "" as string | null,
    methodId: "" as string | null,
  });

  useEffect(() => {
    cuisinesApi.getAll().then(setCuisines).catch(() => {});
    cookingMethodsApi.getAll().then(setCookingMethods).catch(() => {});
  }, []);

  const inventoryKey = useMemo(
    () =>
      ingredients
        .map((i) => `${i.id}:${i.quantity}:${i.unit}`)
        .sort()
        .join("|"),
    [ingredients]
  );

  // Fetch recommendations from backend when user is logged in (uses base-unit comparison and quantity-aware match %)
  useEffect(() => {
    if (!user) {
      setApiSuggestions(null);
      return;
    }
    let cancelled = false;
    setIsLoadingRecommendations(true);
    recommendationsApi
      .getRecommendations()
      .then((data) => {
        if (cancelled) return;
        setApiSuggestions(data);
      })
      .catch(() => {
        if (!cancelled) setApiSuggestions(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingRecommendations(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, inventoryKey]);

  const isIngredientExpiring = (expiryDate: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  };

  const localSuggestions = useMemo<MealSuggestion[]>(() => {
    const expiringIngredients = ingredients
      .filter((ing) => isIngredientExpiring(ing.expiryDate))
      .map((ing) => ing.name.toLowerCase());

    return recipes
      .map((recipe) => {
        let totalScore = 0;
        const matchedIngredients: string[] = [];
        const missingIngredients: string[] = [];

        recipe.requiredIngredients.forEach((requiredIng) => {
          const userIngredient = ingredients.find(
            (userIng) =>
              userIng.name.toLowerCase().includes(requiredIng.toLowerCase()) ||
              requiredIng.toLowerCase().includes(userIng.name.toLowerCase())
          );

          if (userIngredient) {
            const recipeIngDetail = recipe.ingredientDetails.find(
              (detail) => detail.ingredient.toLowerCase() === requiredIng.toLowerCase()
            );

            if (recipeIngDetail && recipeIngDetail.quantity && recipeIngDetail.unit) {
              const userUnit = userIngredient.unit.toLowerCase().trim();
              const recipeUnit = recipeIngDetail.unit.toLowerCase().trim();

              if (userUnit === recipeUnit) {
                const quantityRatio = userIngredient.quantity / recipeIngDetail.quantity;
                totalScore += Math.min(quantityRatio, 1);
              } else {
                totalScore += 1;
              }
            } else {
              totalScore += 1;
            }
            matchedIngredients.push(requiredIng);
          } else {
            missingIngredients.push(requiredIng);
          }
        });

        const matchPercentage = (totalScore / recipe.requiredIngredients.length) * 100;

        const usesExpiringIngredients = matchedIngredients.some((ing) =>
          expiringIngredients.some(
            (exp) => exp.includes(ing.toLowerCase()) || ing.toLowerCase().includes(exp)
          )
        );

        return {
          id: recipe.id,
          name: recipe.name,
          requiredIngredients: recipe.requiredIngredients,
          matchedIngredients,
          missingIngredients,
          matchPercentage,
          usesExpiringIngredients,
          prepTime: recipe.prepTime,
          servings: recipe.servings,
        };
      })
      .filter((s) => s.matchedIngredients.length > 0);
  }, [ingredients, recipes]);

  // When logged in, use backend recommendations (quantity-aware, base-unit comparison); otherwise use local computation.
  // Merge in local "usesExpiringIngredients" and normalize name (API may send "name" or "recipe_name").
  const suggestions = useMemo(() => {
    if (!user || apiSuggestions === null) return localSuggestions;
    return apiSuggestions.map((apiS) => {
      const local = localSuggestions.find((s) => s.id === apiS.id);
      const rawName = apiS.name ?? (apiS as { recipe_name?: string }).recipe_name;
      const name = [rawName, local?.name].find((v) => v != null && String(v).trim() !== "")
        || "Untitled Recipe";
      return {
        ...apiS,
        name,
        usesExpiringIngredients:
          apiS.usesExpiringIngredients || (local?.usesExpiringIngredients ?? false),
      };
    });
  }, [user, apiSuggestions, localSuggestions]);

  const sortedSuggestions = useMemo(() => {
    const sorted = [...suggestions];
    if (sortBy === "expiry") {
      return sorted.sort((a, b) => {
        if (a.usesExpiringIngredients && !b.usesExpiringIngredients) return -1;
        if (!a.usesExpiringIngredients && b.usesExpiringIngredients) return 1;
        return b.matchPercentage - a.matchPercentage;
      });
    }
    return sorted.sort((a, b) => b.matchPercentage - a.matchPercentage);
  }, [suggestions, sortBy]);

  const filteredSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return sortedSuggestions;
    const query = searchQuery.toLowerCase();
    return sortedSuggestions.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.requiredIngredients.some((ing) => ing.toLowerCase().includes(query))
    );
  }, [sortedSuggestions, searchQuery]);

  // Split suggestions into two sections
  const expiringSuggestions = useMemo(() => {
    return filteredSuggestions.filter((s) => s.usesExpiringIngredients);
  }, [filteredSuggestions]);

  const otherSuggestions = useMemo(() => {
    return filteredSuggestions.filter((s) => !s.usesExpiringIngredients);
  }, [filteredSuggestions]);

  const handleAddIngredient = () =>
    setNewRecipe((prev) => ({ ...prev, ingredientRows: [...prev.ingredientRows, null] }));

  const handleRemoveIngredient = (index: number) =>
    setNewRecipe((prev) => {
      if (prev.ingredientRows.length <= 1) return prev;
      return { ...prev, ingredientRows: prev.ingredientRows.filter((_, i) => i !== index) };
    });

  const handleIngredientRowChange = (index: number, value: typeof newRecipe.ingredientRows[0]) =>
    setNewRecipe((prev) => ({
      ...prev,
      ingredientRows: prev.ingredientRows.map((row, i) => (i === index ? value : row)),
    }));

  const handleAddInstruction = () =>
    setNewRecipe((prev) => ({ ...prev, instructions: [...prev.instructions, ""] }));

  const handleRemoveInstruction = (index: number) =>
    setNewRecipe((prev) => ({ ...prev, instructions: prev.instructions.filter((_, i) => i !== index) }));

  const handleUpdateInstruction = (index: number, value: string) =>
    setNewRecipe((prev) => ({
      ...prev,
      instructions: prev.instructions.map((inst, i) => (i === index ? value : inst)),
    }));

  const handleSubmitRecipe = async (e: React.FormEvent) => {
    e.preventDefault();

    const validIngredients = newRecipe.ingredientRows.filter(
      (row): row is NonNullable<typeof row> => row != null && row.ingredientId && row.quantity >= 0
    );
    const filteredInstructions = newRecipe.instructions.filter((inst) => inst.trim() !== "");

    if (validIngredients.length === 0 || filteredInstructions.length === 0) {
      alert("Please add at least one ingredient (select from the list) and one instruction");
      return;
    }

    try {
      await addCustomRecipe({
        name: newRecipe.name,
        description: newRecipe.description,
        prepTime: newRecipe.prepTime,
        servings: newRecipe.servings,
        ingredients: validIngredients.map((row) => ({
          ingredientId: row.ingredientId,
          quantity: row.quantity,
          unit: row.unit,
        })),
        instructions: filteredInstructions,
        imageUrl:
          newRecipe.imageUrl ||
          "https://images.unsplash.com/photo-1546548970-71785318a17b?auto=format&fit=crop&w=1200&q=60",
        cuisineId: newRecipe.cuisineId || null,
        methodId: newRecipe.methodId || null,
      });

      setNewRecipe({
        name: "",
        description: "",
        prepTime: "",
        servings: 2,
        ingredientRows: [null],
        instructions: [""],
        imageUrl: "",
        cuisineId: null,
        methodId: null,
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error("Failed to create recipe:", error);
      alert("Failed to create recipe. Please try again.");
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    try {
      await deleteRecipe(id);
      setDeletingRecipeId(null);
    } catch (error) {
      console.error("Failed to delete recipe:", error);
      alert("Failed to delete recipe. Please try again.");
    }
  };

  if (ingredients.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="mb-2 text-gray-900 dark:text-gray-100 text-2xl font-semibold">No Ingredients Yet</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Add ingredients to your inventory to get personalized meal suggestions
        </p>
        <button
          onClick={() => router.push("/inventory")}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Go to Inventory
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <ChefHat className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-orange-700 dark:text-orange-400">Meal Suggestions</h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
              {filteredSuggestions.length} recipe{filteredSuggestions.length !== 1 ? "s" : ""} match your inventory
            </p>
          </div>
        </div>
        {/* Desktop button */}
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="hidden md:flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Recipe
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Create Custom Recipe</h3>
            <button onClick={() => setShowCreateForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmitRecipe} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Recipe Name *</label>
                <input
                  type="text"
                  required
                  value={newRecipe.name}
                  onChange={(e) => setNewRecipe({ ...newRecipe, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Prep Time *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 30 min"
                  value={newRecipe.prepTime}
                  onChange={(e) => setNewRecipe({ ...newRecipe, prepTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Description</label>
              <textarea
                value={newRecipe.description}
                onChange={(e) => setNewRecipe({ ...newRecipe, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Servings</label>
                <input
                  type="number"
                  min={1}
                  value={newRecipe.servings}
                  onChange={(e) => setNewRecipe({ ...newRecipe, servings: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Image URL</label>
                <input
                  type="url"
                  value={newRecipe.imageUrl}
                  onChange={(e) => setNewRecipe({ ...newRecipe, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Cuisine</label>
                <select
                  value={newRecipe.cuisineId ?? ""}
                  onChange={(e) => setNewRecipe({ ...newRecipe, cuisineId: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select cuisine (optional)</option>
                  {cuisines.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Cooking method</label>
                <select
                  value={newRecipe.methodId ?? ""}
                  onChange={(e) => setNewRecipe({ ...newRecipe, methodId: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select method (optional)</option>
                  {cookingMethods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ingredients: select from DB, then amount + unit */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm text-gray-700 dark:text-gray-300">Ingredients *</label>
                <button
                  type="button"
                  onClick={handleAddIngredient}
                  className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Type to search and choose from the list. Then enter amount and unit.
              </p>
              <div className="space-y-2">
                {newRecipe.ingredientRows.map((row, index) => (
                  <IngredientSelectRow
                    key={index}
                    value={row}
                    onChange={(v) => handleIngredientRowChange(index, v)}
                    onRemove={() => handleRemoveIngredient(index)}
                    canRemove={newRecipe.ingredientRows.length > 1}
                    placeholder={`Ingredient ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm text-gray-700 dark:text-gray-300">Instructions *</label>
                <button
                  type="button"
                  onClick={handleAddInstruction}
                  className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Step
                </button>
              </div>
              <div className="space-y-2">
                {newRecipe.instructions.map((inst, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex-shrink-0 w-8 h-10 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <input
                      type="text"
                      value={inst}
                      onChange={(e) => handleUpdateInstruction(index, e.target.value)}
                      placeholder={`Step ${index + 1}`}
                      className="flex-1 px-3 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                    {newRecipe.instructions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveInstruction(index)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                Create Recipe
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recipes by name or ingredient..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "match" | "expiry")}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="expiry">Expiring Soon</option>
              <option value="match">Best Match</option>
            </select>
          </div>
        </div>
      </div>

      {filteredSuggestions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <ChefHat className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          {searchQuery ? (
            <>
              <p className="text-gray-600 dark:text-gray-400 mb-2">No recipes found matching "{searchQuery}"</p>
              <button onClick={() => setSearchQuery("")} className="text-sm text-green-600 hover:text-green-700">
                Clear search
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-600 dark:text-gray-400 mb-2">No recipe suggestions available</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">Add more ingredients to your inventory to get suggestions</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Section 1: Recipes Using Expiring Ingredients */}
          {expiringSuggestions.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                    Recipes Using Expiring Ingredients
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {expiringSuggestions.length} recipe{expiringSuggestions.length !== 1 ? "s" : ""} to use ingredients before they expire
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {expiringSuggestions.map((s) => {
                  const recipe = recipes.find((r) => r.id === s.id);
                  return (
                    <SuggestionCard
                      key={s.id}
                      suggestion={s}
                      recipe={recipe}
                      canEdit={recipe ? canEditRecipe(recipe.ownerUserId) : false}
                      canDelete={recipe ? canDeleteRecipe(recipe.ownerUserId) : false}
                      onEdit={() => recipe && setEditingRecipe(recipe)}
                      onDelete={() => setDeletingRecipeId(s.id)}
                      userId={user?.id}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Other Recipe Suggestions */}
          {otherSuggestions.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <ChefHat className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-green-700 dark:text-green-400">
                    Other Recipe Suggestions
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {otherSuggestions.length} recipe{otherSuggestions.length !== 1 ? "s" : ""} based on your inventory
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {otherSuggestions.map((s) => {
                  const recipe = recipes.find((r) => r.id === s.id);
                  return (
                    <SuggestionCard
                      key={s.id}
                      suggestion={s}
                      recipe={recipe}
                      canEdit={recipe ? canEditRecipe(recipe.ownerUserId) : false}
                      canDelete={recipe ? canDeleteRecipe(recipe.ownerUserId) : false}
                      onEdit={() => recipe && setEditingRecipe(recipe)}
                      onDelete={() => setDeletingRecipeId(s.id)}
                      userId={user?.id}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingRecipe && (
        <RecipeEditModal
          recipe={editingRecipe}
          isOpen={!!editingRecipe}
          onClose={() => setEditingRecipe(null)}
          onSave={async (id, data) => {
            await updateRecipe(id, data);
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deletingRecipeId && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeletingRecipeId(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Delete Recipe?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete this recipe? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDeleteRecipe(deletingRecipeId)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => setDeletingRecipeId(null)}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile FAB (Floating Action Button) */}
      <button
        onClick={() => setShowCreateForm(!showCreateForm)}
        className="md:hidden fixed bottom-20 right-4 z-40 w-14 h-14 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center"
        aria-label="Create Recipe"
      >
        <Plus className={`w-6 h-6 transition-transform ${showCreateForm ? "rotate-45" : ""}`} />
      </button>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  recipe,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  userId,
}: {
  suggestion: MealSuggestion;
  recipe?: Recipe;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  userId?: string;
}) {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);
  const displayName = suggestion.name || recipe?.name || "Untitled Recipe";

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
      onClick={() => router.push(`/recipe/${suggestion.id}?from=meals`)}
    >
      <div className="relative h-48 bg-gray-200 dark:bg-gray-700">
        {recipe?.imageUrl && !imageError ? (
          <img
            src={recipe.imageUrl}
            alt={displayName}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setImageError(true);
            }}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/30 dark:to-blue-900/30">
            <ChefHat className="w-16 h-16 text-gray-400 dark:text-gray-500" />
          </div>
        )}

        {suggestion.usesExpiringIngredients && (
          <div className="absolute top-2 left-2 bg-orange-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Uses expiring items
          </div>
        )}

        {/* Recipe name overlay - always visible so the card clearly shows the recipe title */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pt-8 pb-2 px-3 flex items-end justify-between gap-2">
          <h3 className="text-white font-semibold text-lg leading-tight line-clamp-2 drop-shadow min-w-0 flex-1">
            {displayName}
          </h3>
          {/* Owner badge - small, next to name so it doesn't look like the title */}
          {recipe?.ownerUserId === SYSTEM_USER_ID && (
            <span className="shrink-0 px-2 py-0.5 bg-green-600/90 text-white text-xs rounded">
              System
            </span>
          )}
          {userId && recipe?.ownerUserId === userId && (
            <span className="shrink-0 px-2 py-0.5 bg-blue-600/90 text-white text-xs rounded">
              Your Recipe
            </span>
          )}
        </div>

        {/* Edit/Delete buttons */}
        {(canEdit || canDelete) && (
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {canEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow hover:bg-white dark:hover:bg-gray-800 transition-colors"
                title="Edit"
              >
                <Edit2 className="w-4 h-4 text-blue-600" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow hover:bg-white dark:hover:bg-gray-800 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex justify-between items-start gap-3 mb-3 min-h-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 min-w-0">
              <h4 className="flex-1 min-w-0 font-semibold text-gray-900 dark:text-gray-100 truncate" title={displayName}>{displayName}</h4>
              {suggestion.usesExpiringIngredients && (
                <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded text-xs whitespace-nowrap shrink-0">
                  <AlertCircle className="w-3 h-3" />
                  <span>Use Soon</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1 whitespace-nowrap">
                <Clock className="w-4 h-4 shrink-0" />
                <span>{suggestion.prepTime}</span>
              </div>
              <div className="flex items-center gap-1 whitespace-nowrap">
                <Users className="w-4 h-4 shrink-0" />
                <span>{suggestion.servings} servings</span>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0 w-14 min-w-[3.5rem]">
            <div className="text-xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{Math.round(suggestion.matchPercentage)}%</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">match</div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-1 text-sm text-green-700 dark:text-green-400 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>You have ({suggestion.matchedIngredients.length})</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {suggestion.matchedIngredients.map((ing, idx) => (
                <span key={idx} className="px-2 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded capitalize">
                  {ing}
                </span>
              ))}
            </div>
          </div>

          {suggestion.missingIngredients.length > 0 && (
            <div>
              <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mb-1">
                <XCircle className="w-4 h-4" />
                <span>You need ({suggestion.missingIngredients.length})</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {suggestion.missingIngredients.map((ing, idx) => (
                  <span key={idx} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded capitalize">
                    {ing}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
