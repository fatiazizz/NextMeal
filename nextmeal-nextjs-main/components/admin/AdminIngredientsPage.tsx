"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { adminApi, type AdminIngredient, type IngredientUsage, type AdminIngredientAllowedUnits } from "@/utils/api";
import Image from "next/image";
import {
  Package,
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChefHat,
  ShoppingCart,
  Tag,
  Ruler,
  X,
  Loader2,
  User,
  Calendar,
  Camera,
  ImageIcon,
} from "lucide-react";

type Category = {
  id: string;
  name: string;
  ingredients_count: number;
};

type Unit = {
  code: string;
  name: string;
  kind: string | null;
  base_unit: string | null;
  to_base_factor: number | null;
};

export default function AdminIngredientsPage() {
  const router = useRouter();
  const { isAdmin } = useUser();
  const [ingredients, setIngredients] = useState<AdminIngredient[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<AdminIngredient | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [formData, setFormData] = useState({ name: "", category_id: "", base_unit: "" });
  const [categoryFormData, setCategoryFormData] = useState({ name: "" });
  const [unitFormData, setUnitFormData] = useState({
    unit_code: "",
    unit_kind: "",
    base_unit: "",
    to_base_factor: "",
  });
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [usageData, setUsageData] = useState<IngredientUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [ingredientImagePreview, setIngredientImagePreview] = useState<string | null>(null);
  const ingredientFileInputRef = useRef<HTMLInputElement>(null);

  // Allowed units management state
  const [showAllowedUnitsModal, setShowAllowedUnitsModal] = useState(false);
  const [allowedUnitsData, setAllowedUnitsData] = useState<AdminIngredientAllowedUnits | null>(null);
  const [allowedUnitsLoading, setAllowedUnitsLoading] = useState(false);
  const [unitToAdd, setUnitToAdd] = useState("");

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/meals");
      return;
    }
    loadData();
  }, [isAdmin, router, currentPage, searchQuery]);

  const loadData = async () => {
    await Promise.all([loadIngredients(), loadCategories(), loadUnits()]);
  };

  const loadIngredients = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await adminApi.getAllIngredients({
        page: currentPage,
        per_page: 15,
        search: searchQuery || undefined,
      });
      setIngredients(response.data);
      setTotalPages(response.meta.lastPage);
      setTotal(response.meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ingredients");
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await adminApi.getAllCategories();
      setCategories(data);
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  };

  const loadUnits = async () => {
    try {
      const data = await adminApi.getAllUnits();
      setUnits(data);
    } catch (err) {
      console.error("Failed to load units:", err);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      alert("Ingredient name is required");
      return;
    }

    try {
      await adminApi.createIngredient({
        name: formData.name.trim(),
        category_id: formData.category_id || undefined,
        base_unit: formData.base_unit || undefined,
      });
      setShowCreateModal(false);
      setFormData({ name: "", category_id: "", base_unit: "" });
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create ingredient");
    }
  };

  const handleUpdate = async () => {
    if (!editingIngredient || !formData.name.trim()) {
      alert("Ingredient name is required");
      return;
    }

    try {
      await adminApi.updateIngredient(editingIngredient.id, {
        name: formData.name.trim(),
        category_id: formData.category_id || undefined,
        base_unit: formData.base_unit || undefined,
      });
      setEditingIngredient(null);
      setFormData({ name: "", category_id: "", base_unit: "" });
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update ingredient");
    }
  };

  const handleDelete = async (ingredientId: string) => {
    if (!confirm("Are you sure you want to delete this ingredient?")) return;

    try {
      await adminApi.deleteIngredient(ingredientId);
      loadIngredients();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete ingredient");
    }
  };

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  const handleCreateCategory = async () => {
    if (!categoryFormData.name.trim()) {
      alert("Category name is required");
      return;
    }

    try {
      await adminApi.createCategory({ name: categoryFormData.name.trim() });
      setShowCategoryModal(false);
      setCategoryFormData({ name: "" });
      loadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create category");
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !categoryFormData.name.trim()) {
      alert("Category name is required");
      return;
    }

    try {
      await adminApi.updateCategory(editingCategory.id, { name: categoryFormData.name.trim() });
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCategoryFormData({ name: "" });
      loadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update category");
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      await adminApi.deleteCategory(categoryId);
      loadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete category");
    }
  };

  const handleCreateUnit = async () => {
    if (!unitFormData.unit_code.trim()) {
      alert("Unit code is required");
      return;
    }

    try {
      await adminApi.createUnit({
        unit_code: unitFormData.unit_code.trim(),
        unit_kind: unitFormData.unit_kind.trim() || undefined,
        base_unit: unitFormData.base_unit.trim() || undefined,
        to_base_factor: unitFormData.to_base_factor ? parseFloat(unitFormData.to_base_factor) : undefined,
      });
      setShowUnitModal(false);
      setUnitFormData({ unit_code: "", unit_kind: "", base_unit: "", to_base_factor: "" });
      loadUnits();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create unit");
    }
  };

  const handleUpdateUnit = async () => {
    if (!editingUnit) {
      alert("No unit selected");
      return;
    }

    try {
      await adminApi.updateUnit(editingUnit.code, {
        unit_kind: unitFormData.unit_kind.trim() || undefined,
        base_unit: unitFormData.base_unit.trim() || undefined,
        to_base_factor: unitFormData.to_base_factor ? parseFloat(unitFormData.to_base_factor) : undefined,
      });
      setShowUnitModal(false);
      setEditingUnit(null);
      setUnitFormData({ unit_code: "", unit_kind: "", base_unit: "", to_base_factor: "" });
      loadUnits();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update unit");
    }
  };

  const handleDeleteUnit = async (unitCode: string) => {
    if (!confirm("Are you sure you want to delete this unit?")) return;

    try {
      await adminApi.deleteUnit(unitCode);
      loadUnits();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete unit");
    }
  };

  const startEdit = (ingredient: AdminIngredient) => {
    setEditingIngredient(ingredient);
    setFormData({
      name: ingredient.name,
      category_id: ingredient.category?.id || "",
      base_unit: ingredient.base_unit || "",
    });
    setIngredientImagePreview(ingredient.image_url || null);
  };

  // Handle ingredient image upload
  const handleIngredientImageUpload = async (file: File) => {
    if (!editingIngredient) return;

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

    setIsUploadingImage(true);
    try {
      const result = await adminApi.uploadIngredientImage(editingIngredient.id, file);
      const fullUrl = result.image_url.startsWith("http") 
        ? result.image_url 
        : `${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:8000"}${result.image_url}`;
      setIngredientImagePreview(fullUrl);
    } catch (error) {
      console.error("Failed to upload image:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle ingredient image removal
  const handleRemoveIngredientImage = async () => {
    if (!editingIngredient) return;
    if (!confirm("Are you sure you want to remove this image?")) return;

    setIsUploadingImage(true);
    try {
      await adminApi.removeIngredientImage(editingIngredient.id);
      setIngredientImagePreview(null);
    } catch (error) {
      console.error("Failed to remove image:", error);
      alert("Failed to remove image. Please try again.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle file selection for ingredient
  const handleIngredientFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleIngredientImageUpload(file);
    }
  };

  const loadIngredientUsage = async (ingredientId: string) => {
    try {
      setUsageLoading(true);
      setShowUsageModal(true);
      const data = await adminApi.getIngredientUsage(ingredientId);
      setUsageData(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to load usage data");
      setShowUsageModal(false);
    } finally {
      setUsageLoading(false);
    }
  };

  const loadIngredientAllowedUnits = async (ingredientId: string) => {
    try {
      setAllowedUnitsLoading(true);
      setShowAllowedUnitsModal(true);
      const data = await adminApi.getIngredientAllowedUnits(ingredientId);
      setAllowedUnitsData(data);
      setUnitToAdd("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to load allowed units");
      setShowAllowedUnitsModal(false);
      setAllowedUnitsData(null);
    } finally {
      setAllowedUnitsLoading(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="w-full mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Package className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-purple-700 dark:text-purple-400">
                Ingredient Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400">Manage system ingredients, categories, and units</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setCategoryFormData({ name: "" });
                setEditingCategory(null);
                setShowCategoryModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Tag className="w-4 h-4" />
              Add Category
            </button>
            <button
              onClick={() => {
                setUnitFormData({ unit_code: "", unit_kind: "", base_unit: "", to_base_factor: "" });
                setEditingUnit(null);
                setShowUnitModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Ruler className="w-4 h-4" />
              Add Unit
            </button>
            <button
              onClick={() => {
                setFormData({ name: "", category_id: "", base_unit: "" });
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Ingredient
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search ingredients..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
          <div className="text-gray-600 dark:text-gray-400">Loading ingredients...</div>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Base Unit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Usage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {ingredients.map((ingredient) => (
                    <tr key={ingredient.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {ingredient.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {ingredient.category?.name || "Uncategorized"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {ingredient.base_unit}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => loadIngredientUsage(ingredient.id)}
                          disabled={ingredient.in_recipes_count === 0 && ingredient.in_inventory_count === 0}
                          className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-gray-500 dark:disabled:hover:text-gray-400"
                          title={ingredient.in_recipes_count === 0 && ingredient.in_inventory_count === 0 ? "No usage" : "Click to view usage details"}
                        >
                          <div className="flex items-center gap-1">
                            <ChefHat className="w-4 h-4" />
                            {ingredient.in_recipes_count}
                          </div>
                          <div className="flex items-center gap-1">
                            <ShoppingCart className="w-4 h-4" />
                            {ingredient.in_inventory_count}
                          </div>
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEdit(ingredient)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Edit Ingredient"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(ingredient.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="Delete Ingredient"
                            disabled={ingredient.in_recipes_count > 0 || ingredient.in_inventory_count > 0}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => loadIngredientAllowedUnits(ingredient.id)}
                            className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                            title="Manage Allowed Units"
                          >
                            <Ruler className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-600">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Showing {((currentPage - 1) * 15) + 1} to {Math.min(currentPage * 15, total)} of {total} ingredients
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
          </div>

          {/* Categories and Units Section */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Categories */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  Categories ({categories.length})
                </h3>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {category.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {category.ingredients_count} ingredient{category.ingredients_count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingCategory(category);
                          setCategoryFormData({ name: category.name });
                          setShowCategoryModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Edit Category"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        title="Delete Category"
                        disabled={category.ingredients_count > 0}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {categories.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No categories found
                  </p>
                )}
              </div>
            </div>

            {/* Units */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Ruler className="w-5 h-5" />
                  Units ({units.length})
                </h3>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {units.map((unit) => (
                  <div
                    key={unit.code}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {unit.code}
                      </p>
                      {unit.kind && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{unit.kind}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingUnit(unit);
                          setUnitFormData({
                            unit_code: unit.code,
                            unit_kind: unit.kind || "",
                            base_unit: unit.base_unit || "",
                            to_base_factor: unit.to_base_factor?.toString() || "",
                          });
                          setShowUnitModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Edit Unit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUnit(unit.code)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        title="Delete Unit"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {units.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No units found
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Create/Edit Ingredient Modal */}
      {(showCreateModal || editingIngredient) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {editingIngredient ? "Edit Ingredient" : "Create New Ingredient"}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingIngredient(null);
                  setFormData({ name: "", category_id: "", base_unit: "" });
                  setIngredientImagePreview(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ingredient Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="e.g., Tomato"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Base Unit
                </label>
                <select
                  value={formData.base_unit}
                  onChange={(e) => setFormData({ ...formData, base_unit: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select Unit</option>
                  {units.map((unit) => (
                    <option key={unit.code} value={unit.code}>
                      {unit.code} {unit.kind ? `(${unit.kind})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Image Upload Section - Only show for editing */}
              {editingIngredient && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ingredient Image
                  </label>
                  <div className="flex items-start gap-4">
                    {/* Image Preview */}
                    <div className="relative w-24 h-24 flex-shrink-0">
                      {ingredientImagePreview ? (
                        <div className="relative w-full h-full rounded-lg overflow-hidden group">
                          <Image
                            src={ingredientImagePreview.startsWith("http") ? ingredientImagePreview : `${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:8000"}${ingredientImagePreview}`}
                            alt="Ingredient preview"
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => ingredientFileInputRef.current?.click()}
                              disabled={isUploadingImage}
                              className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                              title="Change image"
                            >
                              <Camera className="w-4 h-4 text-white" />
                            </button>
                            <button
                              type="button"
                              onClick={handleRemoveIngredientImage}
                              disabled={isUploadingImage}
                              className="p-2 bg-red-500/70 hover:bg-red-500 rounded-full transition-colors"
                              title="Remove image"
                            >
                              <Trash2 className="w-4 h-4 text-white" />
                            </button>
                          </div>
                          {isUploadingImage && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <Loader2 className="w-5 h-5 text-white animate-spin" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => ingredientFileInputRef.current?.click()}
                          disabled={isUploadingImage}
                          className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                        >
                          {isUploadingImage ? (
                            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                          ) : (
                            <>
                              <ImageIcon className="w-6 h-6 text-gray-400 mb-1" />
                              <span className="text-xs text-gray-500 dark:text-gray-400">Upload</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Upload instructions */}
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Upload an image for this ingredient. Supported: JPEG, PNG, GIF, WebP (max 5MB)
                      </p>
                      <input
                        ref={ingredientFileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                        onChange={handleIngredientFileSelect}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => ingredientFileInputRef.current?.click()}
                        disabled={isUploadingImage}
                        className="text-sm text-purple-600 hover:text-purple-700 font-medium disabled:opacity-50"
                      >
                        {ingredientImagePreview ? "Change" : "Select Image"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  if (editingIngredient) {
                    handleUpdate();
                  } else {
                    handleCreate();
                  }
                }}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                {editingIngredient ? "Update" : "Create"}
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingIngredient(null);
                  setFormData({ name: "", category_id: "", base_unit: "" });
                  setIngredientImagePreview(null);
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {editingCategory ? "Edit Category" : "Create New Category"}
              </h3>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setCategoryFormData({ name: "" });
                  setEditingCategory(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="e.g., Vegetables"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  if (editingCategory) {
                    handleUpdateCategory();
                  } else {
                    handleCreateCategory();
                  }
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingCategory ? "Update" : "Create"}
              </button>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setCategoryFormData({ name: "" });
                  setEditingCategory(null);
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Unit Modal */}
      {showUnitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {editingUnit ? "Edit Unit" : "Create New Unit"}
              </h3>
              <button
                onClick={() => {
                  setShowUnitModal(false);
                  setUnitFormData({ unit_code: "", unit_kind: "", base_unit: "", to_base_factor: "" });
                  setEditingUnit(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Unit Code * (e.g., g, ml, tsp)
                </label>
                <input
                  type="text"
                  value={unitFormData.unit_code}
                  onChange={(e) => setUnitFormData({ ...unitFormData, unit_code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="g"
                  disabled={!!editingUnit}
                />
                {editingUnit && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Unit code cannot be changed
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Unit Kind (Optional)
                </label>
                <select
                  value={unitFormData.unit_kind}
                  onChange={(e) => setUnitFormData({ ...unitFormData, unit_kind: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select Kind</option>
                  <option value="mass">Mass</option>
                  <option value="volume">Volume</option>
                  <option value="count">Count</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Base Unit (Optional)
                </label>
                <input
                  type="text"
                  value={unitFormData.base_unit}
                  onChange={(e) => setUnitFormData({ ...unitFormData, base_unit: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="g"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  To Base Factor (Optional)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={unitFormData.to_base_factor}
                  onChange={(e) => setUnitFormData({ ...unitFormData, to_base_factor: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="1.0"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  if (editingUnit) {
                    handleUpdateUnit();
                  } else {
                    handleCreateUnit();
                  }
                }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                {editingUnit ? "Update" : "Create"}
              </button>
              <button
                onClick={() => {
                  setShowUnitModal(false);
                  setUnitFormData({ unit_code: "", unit_kind: "", base_unit: "", to_base_factor: "" });
                  setEditingUnit(null);
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ingredient Usage Modal */}
      {showUsageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Ingredient Usage
                </h3>
                {usageData && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {usageData.ingredient.name}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowUsageModal(false);
                  setUsageData(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {usageLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            ) : usageData ? (
              <div className="space-y-6">
                {/* Recipes Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ChefHat className="w-5 h-5 text-orange-500" />
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      Used in Recipes ({usageData.counts.recipes})
                    </h4>
                  </div>
                  {usageData.recipes.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {usageData.recipes.map((recipe) => (
                        <div
                          key={recipe.id}
                          className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {recipe.name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {recipe.quantity} {recipe.unit}
                              {recipe.owner && ` • by ${recipe.owner.name}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      Not used in any recipes
                    </p>
                  )}
                </div>

                {/* Inventory Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ShoppingCart className="w-5 h-5 text-green-500" />
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      In User Inventories ({usageData.counts.inventory})
                    </h4>
                  </div>
                  {usageData.inventory.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {usageData.inventory.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-800 rounded-full">
                              <User className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                {item.user.name}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {item.user.email}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {item.quantity} {item.unit}
                            </p>
                            {item.expiry_date && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 justify-end">
                                <Calendar className="w-3 h-3" />
                                {new Date(item.expiry_date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      Not in any user&apos;s inventory
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowUsageModal(false);
                  setUsageData(null);
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ingredient Allowed Units Modal */}
      {showAllowedUnitsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Allowed Units
                </h3>
                {allowedUnitsData && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {allowedUnitsData.name}{" "}
                    {allowedUnitsData.baseUnit && (
                      <span className="ml-1 text-xs text-gray-400">
                        (base: {allowedUnitsData.baseUnit})
                      </span>
                    )}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowAllowedUnitsModal(false);
                  setAllowedUnitsData(null);
                  setUnitToAdd("");
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {allowedUnitsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            ) : allowedUnitsData ? (
              <div className="space-y-6">
                {/* Current allowed units */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Current Allowed Units
                  </h4>
                  {allowedUnitsData.allowedUnits.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {allowedUnitsData.allowedUnits.map((unit) => {
                        const isBase = unit === allowedUnitsData.baseUnit;
                        return (
                          <span
                            key={unit}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-200"
                          >
                            {unit}
                            {isBase && (
                              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                base
                              </span>
                            )}
                            {!isBase && (
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!allowedUnitsData) return;
                                  try {
                                    const updated = await adminApi.removeIngredientAllowedUnit(
                                      allowedUnitsData.ingredientId,
                                      unit
                                    );
                                    setAllowedUnitsData(updated);
                                  } catch (err) {
                                    alert(
                                      err instanceof Error
                                        ? err.message
                                        : "Failed to remove allowed unit"
                                    );
                                  }
                                }}
                                className="ml-1 text-gray-400 hover:text-red-500"
                                title="Remove unit"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No additional allowed units. Ingredient can still use its base unit.
                    </p>
                  )}
                </div>

                {/* Add new allowed unit */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Add Allowed Unit
                  </h4>
                  <div className="flex items-center gap-2">
                    <select
                      value={unitToAdd}
                      onChange={(e) => setUnitToAdd(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Select a unit</option>
                      {allowedUnitsData.allUnits
                        .filter((u) => !allowedUnitsData.allowedUnits.includes(u.code))
                        .map((u) => (
                          <option key={u.code} value={u.code}>
                            {u.code} {u.kind ? `(${u.kind})` : ""}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!allowedUnitsData || !unitToAdd) {
                          alert("Please select a unit to add");
                          return;
                        }
                        try {
                          const updated = await adminApi.addIngredientAllowedUnit(
                            allowedUnitsData.ingredientId,
                            unitToAdd
                          );
                          setAllowedUnitsData(updated);
                          setUnitToAdd("");
                        } catch (err) {
                          alert(
                            err instanceof Error
                              ? err.message
                              : "Failed to add allowed unit"
                          );
                        }
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {allowedUnitsData.allUnits.length === 0 && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      No units available. Create units in the Units section below first.
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowAllowedUnitsModal(false);
                  setAllowedUnitsData(null);
                  setUnitToAdd("");
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
