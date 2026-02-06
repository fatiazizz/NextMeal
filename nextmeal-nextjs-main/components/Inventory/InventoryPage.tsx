"use client";

import { useEffect, useMemo, useState } from "react";
import { useInventory } from "../../context/InventoryContext";
import {
  Package,
  Plus,
  Trash2,
  Calendar,
  Edit2,
  Check,
  X,
  Search,
  Loader2,
  Camera,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { inventoryApi, ingredientsApi } from "@/utils/api";
import Image from "next/image";
import type { Ingredient, SystemIngredient } from "@/types";
import { getIngredientDefaults, ingredientDefaults } from "../../data/ingredientDefaults";

type PendingIngredient = {
  name: string;
  unit: string;
  category: string;
  allowedUnits?: string[];
};

const CATEGORIES = ["Vegetables", "Protein", "Dairy", "Grains", "Pantry", "Spices & Seasonings", "Other"] as const;
const INGREDIENTS_PER_CATEGORY = 5;

/** Format unit for display: show default unit and "also: x, y, z" when multiple allowed units exist */
function formatUnitsDisplay(item: { unit: string; allowedUnits?: string[] }): string {
  const allowed = item.allowedUnits && item.allowedUnits.length > 0 ? item.allowedUnits : [item.unit];
  if (allowed.length <= 1) return item.unit;
  const others = allowed.filter((u) => u !== item.unit);
  return others.length > 0 ? `${item.unit} (also: ${others.join(", ")})` : item.unit;
}

export function InventoryPage() {
  const { ingredients, addIngredient, removeIngredient, updateIngredient, isLoadingInventory } = useInventory();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [myInventory, setMyInventory] = useState<PendingIngredient[]>([]);
  const [editingPendingId, setEditingPendingId] = useState<string | null>(null);
  const [editingInventoryId, setEditingInventoryId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [pendingFormData, setPendingFormData] = useState({
    quantity: "",
    expiryDate: "",
    minimumThreshold: "",
    unit: "",
  });

  const [inventoryFormData, setInventoryFormData] = useState({
    quantity: "",
    expiryDate: "",
    minimumThreshold: "",
  });
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<{ [key: string]: string }>({});
  const [allSystemIngredients, setAllSystemIngredients] = useState<SystemIngredient[]>([]);
  const [addIngredientModalOpen, setAddIngredientModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [modalCategory, setModalCategory] = useState<string>("all");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Load all available ingredients from backend (fallback to local defaults if API unavailable)
  useEffect(() => {
    const loadIngredients = async () => {
      try {
        const data = await ingredientsApi.getAll();
        setAllSystemIngredients(data);
      } catch (error) {
        console.warn("Failed to load system ingredients from API, using local defaults:", error);
        const fallback: SystemIngredient[] = Object.keys(ingredientDefaults).map((key) => {
          const defaults = getIngredientDefaults(key);
          return {
            id: `fallback-${key}`,
            name: key,
            category: defaults.category,
            unit: defaults.unit,
            allowedUnits: [defaults.unit],
          };
        });
        setAllSystemIngredients(fallback);
      }
    };

    loadIngredients();
  }, []);

  // Group ingredients by category
  const ingredientsByCategory = useMemo(() => {
    const grouped: Record<string, SystemIngredient[]> = {};
    allSystemIngredients.forEach((ing) => {
      const category = ing.category || "Other";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(ing);
    });
    return grouped;
  }, [allSystemIngredients]);

  // Filter ingredients by search and category
  const filteredSystemIngredients = useMemo(() => {
    let filtered = allSystemIngredients;

    if (searchQuery.trim()) {
      filtered = filtered.filter((ing) =>
        ing.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter((ing) => ing.category === selectedCategory);
    }

    return filtered;
  }, [allSystemIngredients, searchQuery, selectedCategory]);

  // Filtered ingredients for the Add Ingredient modal (must be before any early return to satisfy Rules of Hooks)
  const modalFilteredIngredients = useMemo(() => {
    let list = allSystemIngredients;
    if (modalSearch.trim()) {
      list = list.filter((ing) =>
        ing.name.toLowerCase().includes(modalSearch.toLowerCase())
      );
    }
    if (modalCategory !== "all") {
      list = list.filter((ing) => (ing.category || "Other") === modalCategory);
    }
    return list;
  }, [allSystemIngredients, modalSearch, modalCategory]);

  // Add ingredient to "my inventory" (pending list)
  const addToMyInventory = (ingredientName: string) => {
    const systemIngredient = allSystemIngredients.find(
      (ing) => ing.name.toLowerCase() === ingredientName.toLowerCase()
    );
    const defaults = getIngredientDefaults(ingredientName);
    const exists = myInventory.some(
      (item) => item.name.toLowerCase() === ingredientName.toLowerCase()
    );
    if (!exists) {
      const category = systemIngredient?.category ?? defaults.category;
      const unit = systemIngredient?.unit ?? defaults.unit;
      const allowedUnits =
        systemIngredient?.allowedUnits && systemIngredient.allowedUnits.length > 0
          ? systemIngredient.allowedUnits
          : [unit];

      setMyInventory([
        ...myInventory,
        {
          name: ingredientName,
          unit,
          category,
          allowedUnits,
        },
      ]);
    }
  };

  // Remove from my inventory
  const removeFromMyInventory = (name: string) => {
    setMyInventory(myInventory.filter((item) => item.name !== name));
  };

  // Complete adding ingredient to actual inventory
  const completeIngredient = async (pendingItem: PendingIngredient) => {
    const quantity = parseFloat(pendingFormData.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      alert("Please enter a valid quantity");
      return;
    }

    const unit = pendingFormData.unit || pendingItem.unit;

    setIsSaving(true);
    try {
      await addIngredient({
        name: pendingItem.name,
        quantity,
        unit,
        expiryDate: pendingFormData.expiryDate.trim() || "",
        category: pendingItem.category,
        minimumThreshold: pendingFormData.minimumThreshold
          ? parseFloat(pendingFormData.minimumThreshold)
          : undefined,
      });

      removeFromMyInventory(pendingItem.name);
      setEditingPendingId(null);
      setPendingFormData({ quantity: "", expiryDate: "", minimumThreshold: "", unit: "" });
    } catch (error) {
      console.error("Failed to add ingredient:", error);
      const message = error instanceof Error ? error.message : "Failed to add ingredient. Please try again.";
      alert(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Start editing pending ingredient
  const startEditPending = (item: PendingIngredient) => {
    setEditingPendingId(item.name);
    const existing = ingredients.find(
      (ing) => ing.name.toLowerCase() === item.name.toLowerCase()
    );
    if (existing) {
      setPendingFormData({
        quantity: existing.quantity.toString(),
        expiryDate: existing.expiryDate,
        minimumThreshold: existing.minimumThreshold?.toString() || "",
        unit: item.unit,
      });
    } else {
      const today = new Date();
      const systemIngredient = allSystemIngredients.find(
        (ing) => ing.name.toLowerCase() === item.name.toLowerCase()
      );
      const days = systemIngredient?.defaultDaysUntilExpiry ?? 7;
      const expiryDate = new Date(today);
      expiryDate.setDate(expiryDate.getDate() + days);

      setPendingFormData({
        quantity: "",
        expiryDate: expiryDate.toISOString().split("T")[0],
        minimumThreshold: "2",
        unit: item.unit,
      });
    }
  };

  // Start editing inventory item
  const startEditInventory = (ingredient: Ingredient) => {
    setEditingInventoryId(ingredient.id);
    setInventoryFormData({
      quantity: ingredient.quantity.toString(),
      expiryDate: ingredient.expiryDate,
      minimumThreshold: ingredient.minimumThreshold?.toString() || "",
    });
  };

  // Save inventory edit
  const saveInventoryEdit = async (id: string) => {
    const quantity = parseFloat(inventoryFormData.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      alert("Please enter a valid quantity");
      return;
    }

    setIsSaving(true);
    try {
      await updateIngredient(id, {
        quantity,
        expiryDate: inventoryFormData.expiryDate,
        minimumThreshold: inventoryFormData.minimumThreshold
          ? parseFloat(inventoryFormData.minimumThreshold)
          : undefined,
      });

      setEditingInventoryId(null);
      setInventoryFormData({ quantity: "", expiryDate: "", minimumThreshold: "" });
    } catch (error) {
      console.error("Failed to update ingredient:", error);
      alert("Failed to update ingredient. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete ingredient
  const handleRemoveIngredient = async (id: string) => {
    try {
      await removeIngredient(id);
    } catch (error) {
      console.error("Failed to remove ingredient:", error);
      alert("Failed to remove ingredient. Please try again.");
    }
  };

  // Handle image upload
  const handleImageUpload = async (id: string, file: File) => {
    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      alert("Please select a valid image file (JPEG, PNG, GIF, or WebP)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image file must be less than 5MB");
      return;
    }

    setUploadingImageId(id);
    try {
      const result = await inventoryApi.uploadImage(id, file);
      // Update local state with new image URL
      setImagePreview((prev) => ({ ...prev, [id]: result.image_url }));
      // Refresh inventory to get updated data
      window.location.reload();
    } catch (error) {
      console.error("Failed to upload image:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploadingImageId(null);
    }
  };

  // Handle image removal
  const handleRemoveImage = async (id: string) => {
    if (!confirm("Are you sure you want to remove this image?")) return;

    setUploadingImageId(id);
    try {
      await inventoryApi.removeImage(id);
      setImagePreview((prev) => {
        const newPreview = { ...prev };
        delete newPreview[id];
        return newPreview;
      });
      window.location.reload();
    } catch (error) {
      console.error("Failed to remove image:", error);
      alert("Failed to remove image. Please try again.");
    } finally {
      setUploadingImageId(null);
    }
  };

  const getExpiryStatus = (expiryDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { status: "expired", days: Math.abs(diffDays), color: "text-red-600 dark:text-red-400" };
    if (diffDays === 0) return { status: "today", days: 0, color: "text-red-500 dark:text-red-400" };
    if (diffDays <= 3) return { status: "soon", days: diffDays, color: "text-orange-500 dark:text-orange-400" };
    return { status: "fresh", days: diffDays, color: "text-green-600 dark:text-green-400" };
  };

  if (isLoadingInventory) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading inventory...</span>
        </div>
      </div>
    );
  }

  const openAddIngredientModal = () => {
    setModalSearch("");
    setModalCategory("all");
    setAddIngredientModalOpen(true);
  };

  const handleModalSelectIngredient = (ingredientName: string) => {
    addToMyInventory(ingredientName);
    setAddIngredientModalOpen(false);
  };

  const toggleCategoryExpanded = (category: string) => {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Package className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-green-700 dark:text-green-400">Inventory</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your ingredients and stock</p>
          </div>
        </div>
        <button
          type="button"
          onClick={openAddIngredientModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shrink-0"
        >
          <Plus className="w-5 h-5" />
          Add ingredient
        </button>
      </div>

      {/* Add Ingredient Modal */}
      {addIngredientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setAddIngredientModalOpen(false)}>
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Add ingredient</h2>
              <button
                type="button"
                onClick={() => setAddIngredientModalOpen(false)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3 flex-shrink-0">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Search ingredients..."
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setModalCategory("all")}
                  className={`px-3 py-1.5 rounded-lg text-sm ${
                    modalCategory === "all"
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  All
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setModalCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-sm ${
                      modalCategory === cat
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-y-auto p-4 flex-1 min-h-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {modalFilteredIngredients.map((ing) => {
                  const inMyInventory = myInventory.some(
                    (item) => item.name.toLowerCase() === ing.name.toLowerCase()
                  );
                  const inActualInventory = ingredients.some(
                    (item) => item.name.toLowerCase() === ing.name.toLowerCase()
                  );
                  const disabled = inMyInventory || inActualInventory;
                  return (
                    <button
                      key={ing.name}
                      type="button"
                      onClick={() => !disabled && handleModalSelectIngredient(ing.name)}
                      disabled={disabled}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        disabled
                          ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
                      }`}
                    >
                      <div className="font-medium capitalize text-gray-900 dark:text-gray-100 truncate">{ing.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Unit: {formatUnitsDisplay(ing)}</div>
                      {inMyInventory && <div className="text-xs text-green-600 dark:text-green-400 mt-1">In my inventory</div>}
                      {inActualInventory && <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Added</div>}
                    </button>
                  );
                })}
              </div>
              {modalFilteredIngredients.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-6">No ingredients match your search.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="Search ingredients..."
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedCategory === "all"
                ? "bg-green-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedCategory === cat
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Available Ingredients by Category */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Available Ingredients</h2>
        {selectedCategory === "all" ? (
          <div className="space-y-6">
            {Object.entries(ingredientsByCategory).map(([category, items]) => {
              const filtered = items.filter((ing) =>
                searchQuery.trim()
                  ? ing.name.toLowerCase().includes(searchQuery.toLowerCase())
                  : true
              );
              if (filtered.length === 0) return null;

              const isExpanded = expandedCategories[category];
              const showAll = filtered.length <= INGREDIENTS_PER_CATEGORY || isExpanded;
              const displayItems = showAll ? filtered : filtered.slice(0, INGREDIENTS_PER_CATEGORY);
              const hasMore = filtered.length > INGREDIENTS_PER_CATEGORY;
              const hiddenCount = filtered.length - INGREDIENTS_PER_CATEGORY;

              return (
                <div key={category} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">{category}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {displayItems.map((ing) => {
                      const inMyInventory = myInventory.some(
                        (item) => item.name.toLowerCase() === ing.name.toLowerCase()
                      );
                      const inActualInventory = ingredients.some(
                        (item) => item.name.toLowerCase() === ing.name.toLowerCase()
                      );

                      return (
                        <button
                          key={ing.name}
                          onClick={() => !inActualInventory && addToMyInventory(ing.name)}
                          disabled={inMyInventory || inActualInventory}
                          className={`p-3 rounded-lg border text-left transition-colors ${
                            inMyInventory || inActualInventory
                              ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
                          }`}
                        >
                          <div className="font-medium capitalize text-gray-900 dark:text-gray-100">{ing.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Unit: {formatUnitsDisplay(ing)}</div>
                          {inMyInventory && (
                            <div className="text-xs text-green-600 dark:text-green-400 mt-1">In my inventory</div>
                          )}
                          {inActualInventory && (
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Added</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {hasMore && (
                    <button
                      type="button"
                      onClick={() => toggleCategoryExpanded(category)}
                      className="mt-3 flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Show more ({hiddenCount} more)
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">{selectedCategory}</h3>
            {(() => {
              const list = filteredSystemIngredients;
              const isExpanded = expandedCategories[selectedCategory];
              const showAll = list.length <= INGREDIENTS_PER_CATEGORY || isExpanded;
              const displayItems = showAll ? list : list.slice(0, INGREDIENTS_PER_CATEGORY);
              const hasMore = list.length > INGREDIENTS_PER_CATEGORY;
              const hiddenCount = list.length - INGREDIENTS_PER_CATEGORY;
              return (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {displayItems.map((ing) => {
                      const inMyInventory = myInventory.some(
                        (item) => item.name.toLowerCase() === ing.name.toLowerCase()
                      );
                      const inActualInventory = ingredients.some(
                        (item) => item.name.toLowerCase() === ing.name.toLowerCase()
                      );

                      return (
                        <button
                          key={ing.name}
                          onClick={() => !inActualInventory && addToMyInventory(ing.name)}
                          disabled={inMyInventory || inActualInventory}
                          className={`p-3 rounded-lg border text-left transition-colors ${
                            inMyInventory || inActualInventory
                              ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
                          }`}
                        >
                          <div className="font-medium capitalize text-gray-900 dark:text-gray-100">{ing.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Unit: {formatUnitsDisplay(ing)}</div>
                          {inMyInventory && (
                            <div className="text-xs text-green-600 dark:text-green-400 mt-1">In my inventory</div>
                          )}
                          {inActualInventory && (
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Added</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {hasMore && (
                    <button
                      type="button"
                      onClick={() => toggleCategoryExpanded(selectedCategory)}
                      className="mt-3 flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Show more ({hiddenCount} more)
                        </>
                      )}
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* My Inventory (Pending Items) */}
      {myInventory.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">My Inventory</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y dark:divide-gray-700">
            {myInventory.map((item) => {
              const isEditing = editingPendingId === item.name;

              return (
                <div key={item.name} className="p-4">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-semibold capitalize text-gray-900 dark:text-gray-100">{item.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Unit: {pendingFormData.unit || formatUnitsDisplay(item)} • Category: {item.category}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Quantity</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            value={pendingFormData.quantity}
                            onChange={(e) =>
                              setPendingFormData({ ...pendingFormData, quantity: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Unit</label>
                          <select
                            value={pendingFormData.unit || item.unit}
                            onChange={(e) => {
                              const newUnit = e.target.value;
                              setPendingFormData({
                                ...pendingFormData,
                                unit: newUnit,
                              });
                              setMyInventory((prev) =>
                                prev.map((ing) =>
                                  ing.name === item.name ? { ...ing, unit: newUnit } : ing
                                )
                              );
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          >
                            {(item.allowedUnits && item.allowedUnits.length > 0
                              ? item.allowedUnits
                              : [item.unit]
                            ).map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                            Expiry Date (optional – uses default if skipped)
                          </label>
                          <input
                            type="date"
                            value={pendingFormData.expiryDate}
                            onChange={(e) =>
                              setPendingFormData({ ...pendingFormData, expiryDate: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                            Minimum Threshold (optional)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={pendingFormData.minimumThreshold}
                            onChange={(e) =>
                              setPendingFormData({
                                ...pendingFormData,
                                minimumThreshold: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="e.g., 2"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => completeIngredient(item)}
                          disabled={isSaving}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          Done
                        </button>
                        <button
                          onClick={() => {
                            setEditingPendingId(null);
                            setPendingFormData({ quantity: "", expiryDate: "", minimumThreshold: "", unit: "" });
                          }}
                          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold capitalize text-gray-900 dark:text-gray-100">{item.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Unit: {formatUnitsDisplay(item)} • Category: {item.category}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditPending(item)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Enter Details
                        </button>
                        <button
                          onClick={() => removeFromMyInventory(item.name)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actual Inventory Table */}
      {ingredients.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Registered Inventory</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Image
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Ingredient
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Quantity
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Expiry Date
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Status
                    </th>
                    <th className="text-right px-6 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {ingredients.map((item) => {
                    const expiryStatus = getExpiryStatus(item.expiryDate);
                    const isEditing = editingInventoryId === item.id;

                    const imageUrl = imagePreview[item.id] || item.imageUrl;
                    const isUploadingImage = uploadingImageId === item.id;

                    return (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        {/* Image Column */}
                        <td className="px-6 py-4">
                          <div className="relative w-16 h-16 group">
                            {imageUrl ? (
                              <div className="relative w-full h-full rounded-lg overflow-hidden">
                                <Image
                                  src={imageUrl.startsWith("http") ? imageUrl : `${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:8000"}${imageUrl}`}
                                  alt={item.name}
                                  fill
                                  className="object-cover"
                                />
                                <button
                                  onClick={() => handleRemoveImage(item.id)}
                                  disabled={isUploadingImage}
                                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                  title="Remove image"
                                >
                                  {isUploadingImage ? (
                                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                                  ) : (
                                    <Trash2 className="w-5 h-5 text-white" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <label className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleImageUpload(item.id, file);
                                  }}
                                  disabled={isUploadingImage}
                                />
                                {isUploadingImage ? (
                                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                                ) : (
                                  <>
                                    <Camera className="w-5 h-5 text-gray-400" />
                                    <span className="text-xs text-gray-400 mt-1">Add</span>
                                  </>
                                )}
                              </label>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="font-medium capitalize text-gray-900 dark:text-gray-100">{item.name}</span>
                        </td>

                        <td className="px-6 py-4">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={inventoryFormData.quantity}
                              onChange={(e) =>
                                setInventoryFormData({
                                  ...inventoryFormData,
                                  quantity: e.target.value,
                                })
                              }
                              className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                          ) : (
                            <span className="text-gray-900 dark:text-gray-100">
                              {item.quantity} {item.unit}
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {isEditing ? (
                            <input
                              type="date"
                              value={inventoryFormData.expiryDate}
                              onChange={(e) =>
                                setInventoryFormData({
                                  ...inventoryFormData,
                                  expiryDate: e.target.value,
                                })
                              }
                              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                          ) : (
                            <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              {new Date(item.expiryDate).toLocaleDateString()}
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span className={`text-sm font-medium ${expiryStatus.color}`}>
                            {expiryStatus.status === "expired" &&
                              `Expired ${expiryStatus.days} days ago`}
                            {expiryStatus.status === "today" && "Expires today"}
                            {expiryStatus.status === "soon" &&
                              `Expires in ${expiryStatus.days} days`}
                            {expiryStatus.status === "fresh" &&
                              `Fresh (${expiryStatus.days} days)`}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => saveInventoryEdit(item.id)}
                                disabled={isSaving}
                                className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50"
                                title="Save"
                              >
                                {isSaving ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingInventoryId(null);
                                  setInventoryFormData({
                                    quantity: "",
                                    expiryDate: "",
                                    minimumThreshold: "",
                                  });
                                }}
                                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => startEditInventory(item)}
                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRemoveIngredient(item.id)}
                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {ingredients.length === 0 && myInventory.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No ingredients yet</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Select ingredients from above to add them to your inventory
          </p>
        </div>
      )}
    </div>
  );
}
