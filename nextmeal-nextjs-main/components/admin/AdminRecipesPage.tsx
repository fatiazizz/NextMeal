"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { adminApi, type AdminRecipe } from "@/utils/api";
import {
  ChefHat,
  Search,
  Trash2,
  Edit2,
  User,
  Calendar,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { RecipeEditModal } from "@/components/recipes/RecipeEditModal";

export default function AdminRecipesPage() {
  const router = useRouter();
  const { isAdmin } = useUser();
  const [recipes, setRecipes] = useState<AdminRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [editingRecipe, setEditingRecipe] = useState<AdminRecipe | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/meals");
      return;
    }
    loadRecipes();
  }, [isAdmin, router, currentPage, searchQuery]);

  const loadRecipes = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await adminApi.getAllRecipes({
        page: currentPage,
        per_page: 15,
        search: searchQuery || undefined,
      });
      setRecipes(response.data);
      setTotalPages(response.meta.lastPage);
      setTotal(response.meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load recipes");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (recipeId: string) => {
    if (!confirm("Are you sure you want to delete this recipe?")) return;

    try {
      await adminApi.deleteRecipe(recipeId);
      loadRecipes();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete recipe");
    }
  };

  const handleUpdateRecipe = async (recipeData: Partial<AdminRecipe>) => {
    if (!editingRecipe) return;

    try {
      await adminApi.updateRecipe(editingRecipe.id, recipeData);
      setEditingRecipe(null);
      loadRecipes();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update recipe");
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="w-full mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <ChefHat className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-green-700 dark:text-green-400">Recipe Management</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage all recipes in the system</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-gray-600 dark:text-gray-400">Loading recipes...</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {recipes.map((recipe) => (
              <div
                key={recipe.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
              >
                {recipe.imageUrl && (
                  <div className="h-48 bg-gray-200 dark:bg-gray-700">
                    <img
                      src={recipe.imageUrl}
                      alt={recipe.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {recipe.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {recipe.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {recipe.prepTime}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {recipe.servings} servings
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <User className="w-4 h-4" />
                      {recipe.ownerName}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingRecipe(recipe)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Edit Recipe"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(recipe.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        title="Delete Recipe"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Showing {((currentPage - 1) * 15) + 1} to {Math.min(currentPage * 15, total)} of {total} recipes
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit Recipe Modal */}
      {editingRecipe && (
        <RecipeEditModal
          recipe={editingRecipe}
          isOpen={!!editingRecipe}
          onClose={() => setEditingRecipe(null)}
          onSave={async (id, data) => {
            await handleUpdateRecipe(data);
          }}
        />
      )}
    </div>
  );
}
