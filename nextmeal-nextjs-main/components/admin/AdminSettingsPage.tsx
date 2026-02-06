"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { adminApi } from "@/utils/api";
import {
  Settings,
  ChefHat,
  Tag,
  UtensilsCrossed,
  Edit2,
  Trash2,
  Plus,
  X,
  Globe,
} from "lucide-react";

type Cuisine = {
  id: string;
  name: string;
  recipes_count: number;
};

type RecipeCategory = {
  id: string;
  name: string;
  recipes_count: number;
};

type CookingMethod = {
  id: string;
  name: string;
  recipes_count: number;
};

export default function AdminSettingsPage() {
  const router = useRouter();
  const { isAdmin } = useUser();
  const [activeTab, setActiveTab] = useState<"cuisines" | "recipe-categories" | "cooking-methods">(
    "cuisines"
  );

  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [recipeCategories, setRecipeCategories] = useState<RecipeCategory[]>([]);
  const [cookingMethods, setCookingMethods] = useState<CookingMethod[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Cuisine | RecipeCategory | CookingMethod | null>(
    null
  );
  const [formData, setFormData] = useState({ name: "" });

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/meals");
      return;
    }
    loadAllData();
  }, [isAdmin, router]);

  const loadAllData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([loadCuisines(), loadRecipeCategories(), loadCookingMethods()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const loadCuisines = async () => {
    try {
      const data = await adminApi.getAllCuisines();
      setCuisines(data);
    } catch (err) {
      console.error("Failed to load cuisines:", err);
    }
  };

  const loadRecipeCategories = async () => {
    try {
      const data = await adminApi.getAllRecipeCategories();
      setRecipeCategories(data);
    } catch (err) {
      console.error("Failed to load recipe categories:", err);
    }
  };

  const loadCookingMethods = async () => {
    try {
      const data = await adminApi.getAllCookingMethods();
      setCookingMethods(data);
    } catch (err) {
      console.error("Failed to load cooking methods:", err);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      alert("Name is required");
      return;
    }

    try {
      if (activeTab === "cuisines") {
        await adminApi.createCuisine({ name: formData.name.trim() });
        await loadCuisines();
      } else if (activeTab === "recipe-categories") {
        await adminApi.createRecipeCategory({ name: formData.name.trim() });
        await loadRecipeCategories();
      } else if (activeTab === "cooking-methods") {
        await adminApi.createCookingMethod({ name: formData.name.trim() });
        await loadCookingMethods();
      }
      setShowCreateModal(false);
      setFormData({ name: "" });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create");
    }
  };

  const handleUpdate = async () => {
    if (!editingItem || !formData.name.trim()) {
      alert("Name is required");
      return;
    }

    try {
      if (activeTab === "cuisines") {
        await adminApi.updateCuisine(editingItem.id, { name: formData.name.trim() });
        await loadCuisines();
      } else if (activeTab === "recipe-categories") {
        await adminApi.updateRecipeCategory(editingItem.id, { name: formData.name.trim() });
        await loadRecipeCategories();
      } else if (activeTab === "cooking-methods") {
        await adminApi.updateCookingMethod(editingItem.id, { name: formData.name.trim() });
        await loadCookingMethods();
      }
      setEditingItem(null);
      setFormData({ name: "" });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      if (activeTab === "cuisines") {
        await adminApi.deleteCuisine(id);
        await loadCuisines();
      } else if (activeTab === "recipe-categories") {
        await adminApi.deleteRecipeCategory(id);
        await loadRecipeCategories();
      } else if (activeTab === "cooking-methods") {
        await adminApi.deleteCookingMethod(id);
        await loadCookingMethods();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const startEdit = (item: Cuisine | RecipeCategory | CookingMethod) => {
    setEditingItem(item);
    setFormData({ name: item.name });
  };

  if (!isAdmin) {
    return null;
  }

  const currentItems =
    activeTab === "cuisines"
      ? cuisines
      : activeTab === "recipe-categories"
        ? recipeCategories
        : cookingMethods;

  const tabLabels = {
    cuisines: "Cuisines",
    "recipe-categories": "Recipe Categories",
    "cooking-methods": "Cooking Methods",
  };

  const tabIcons = {
    cuisines: Globe,
    "recipe-categories": Tag,
    "cooking-methods": UtensilsCrossed,
  };

  return (
    <div className="w-full mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <Settings className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-indigo-700 dark:text-indigo-400">Settings</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage cuisines, recipe categories, and cooking methods
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {(["cuisines", "recipe-categories", "cooking-methods"] as const).map((tab) => {
            const Icon = tabIcons[tab];
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                  activeTab === tab
                    ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                <Icon className="w-5 h-5" />
                {tabLabels[tab]}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {tabLabels[activeTab]}
            </h2>
            <button
              onClick={() => {
                setFormData({ name: "" });
                setEditingItem(null);
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add {tabLabels[activeTab].slice(0, -1)}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <p className="text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="text-gray-600 dark:text-gray-400">Loading...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        {item.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {item.recipes_count} recipe{item.recipes_count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => startEdit(item)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        title="Delete"
                        disabled={item.recipes_count > 0}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {currentItems.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                  No {tabLabels[activeTab].toLowerCase()} found
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingItem) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {editingItem
                  ? `Edit ${tabLabels[activeTab].slice(0, -1)}`
                  : `Create New ${tabLabels[activeTab].slice(0, -1)}`}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingItem(null);
                  setFormData({ name: "" });
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder={`Enter ${tabLabels[activeTab].slice(0, -1).toLowerCase()} name`}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  if (editingItem) {
                    handleUpdate();
                  } else {
                    handleCreate();
                  }
                }}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {editingItem ? "Update" : "Create"}
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingItem(null);
                  setFormData({ name: "" });
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
