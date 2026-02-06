"use client";

import { useState, useEffect, useRef } from "react";
import { X, Plus, Trash2, Camera, Loader2, ImageIcon } from "lucide-react";
import Image from "next/image";
import type { Recipe } from "@/types";
import { recipesApi, cuisinesApi, cookingMethodsApi } from "@/utils/api";
import type { CuisineOption, CookingMethodOption, UpdateRecipeInput } from "@/utils/api";
import { IngredientSelectRow } from "./IngredientSelectRow";

type RecipeEditModalProps = {
  recipe: Recipe;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, data: UpdateRecipeInput) => Promise<void>;
};

type IngredientRow = {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  allowedUnits: string[];
} | null;

export function RecipeEditModal({ recipe, isOpen, onClose, onSave }: RecipeEditModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cuisines, setCuisines] = useState<CuisineOption[]>([]);
  const [cookingMethods, setCookingMethods] = useState<CookingMethodOption[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    prepTime: "",
    servings: 2,
    ingredientRows: [null] as IngredientRow[],
    instructions: [""],
    imageUrl: "",
    cuisineId: null as string | null,
    methodId: null as string | null,
  });

  useEffect(() => {
    cuisinesApi.getAll().then(setCuisines).catch(() => {});
    cookingMethodsApi.getAll().then(setCookingMethods).catch(() => {});
  }, []);

  // Initialize form data when recipe changes
  useEffect(() => {
    if (recipe) {
      const rows: IngredientRow[] =
        recipe.ingredients && recipe.ingredients.length > 0
          ? recipe.ingredients.map((i) => ({
              ingredientId: i.ingredientId,
              ingredientName: i.ingredientName,
              quantity: i.quantity,
              unit: i.unit,
              allowedUnits: i.allowedUnits ?? [i.unit],
            }))
          : [null];
      setFormData({
        name: recipe.name,
        description: recipe.description,
        prepTime: recipe.prepTime,
        servings: recipe.servings,
        ingredientRows: rows,
        instructions: recipe.instructions.length > 0 ? recipe.instructions : [""],
        imageUrl: recipe.imageUrl || "",
        cuisineId: recipe.cuisineId ?? null,
        methodId: recipe.methodId ?? null,
      });
      setImagePreview(recipe.imageUrl || null);
    }
  }, [recipe]);

  if (!isOpen) return null;

  const handleAddIngredient = () => {
    setFormData((prev) => ({ ...prev, ingredientRows: [...prev.ingredientRows, null] }));
  };

  const handleRemoveIngredient = (index: number) => {
    if (formData.ingredientRows.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      ingredientRows: prev.ingredientRows.filter((_, i) => i !== index),
    }));
  };

  const handleIngredientRowChange = (index: number, value: IngredientRow) => {
    setFormData((prev) => ({
      ...prev,
      ingredientRows: prev.ingredientRows.map((row, i) => (i === index ? value : row)),
    }));
  };

  const handleAddInstruction = () => {
    setFormData((prev) => ({ ...prev, instructions: [...prev.instructions, ""] }));
  };

  const handleRemoveInstruction = (index: number) => {
    if (formData.instructions.length > 1) {
      setFormData((prev) => ({
        ...prev,
        instructions: prev.instructions.filter((_, i) => i !== index),
      }));
    }
  };

  const handleUpdateInstruction = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      instructions: prev.instructions.map((inst, i) => (i === index ? value : inst)),
    }));
  };

  // Handle image upload
  const handleImageUpload = async (file: File) => {
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
      const result = await recipesApi.uploadImage(recipe.id, file);
      const fullUrl = result.image_url.startsWith("http") 
        ? result.image_url 
        : `${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:8000"}${result.image_url}`;
      setImagePreview(fullUrl);
      setFormData((prev) => ({ ...prev, imageUrl: result.image_url }));
    } catch (error) {
      console.error("Failed to upload image:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle image removal
  const handleRemoveImage = async () => {
    if (!confirm("Are you sure you want to remove this image?")) return;

    setIsUploadingImage(true);
    try {
      await recipesApi.removeImage(recipe.id);
      setImagePreview(null);
      setFormData((prev) => ({ ...prev, imageUrl: "" }));
    } catch (error) {
      console.error("Failed to remove image:", error);
      alert("Failed to remove image. Please try again.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validIngredients = formData.ingredientRows.filter(
      (row): row is NonNullable<IngredientRow> =>
        row != null && !!row.ingredientId && row.quantity >= 0
    );
    const filteredInstructions = formData.instructions.filter((inst) => inst.trim() !== "");

    if (validIngredients.length === 0 || filteredInstructions.length === 0) {
      alert("Please add at least one ingredient (select from the list) and one instruction");
      return;
    }

    setIsLoading(true);
    try {
      await onSave(recipe.id, {
        name: formData.name,
        description: formData.description,
        prepTime: formData.prepTime,
        servings: formData.servings,
        ingredients: validIngredients.map((row) => ({
          ingredientId: row.ingredientId,
          quantity: row.quantity,
          unit: row.unit,
        })),
        instructions: filteredInstructions,
        imageUrl: formData.imageUrl || undefined,
        cuisineId: formData.cuisineId || null,
        methodId: formData.methodId || null,
      });
      onClose();
    } catch (error) {
      console.error("Failed to update recipe:", error);
      alert("Failed to update recipe. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Edit Recipe</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Recipe Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Prep Time *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 30 min"
                  value={formData.prepTime}
                  onChange={(e) => setFormData({ ...formData, prepTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Servings
                </label>
                <input
                  type="number"
                  min={1}
                  value={formData.servings}
                  onChange={(e) => setFormData({ ...formData, servings: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Cuisine
                </label>
                <select
                  value={formData.cuisineId ?? ""}
                  onChange={(e) => setFormData({ ...formData, cuisineId: e.target.value || null })}
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
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Cooking method
              </label>
              <select
                value={formData.methodId ?? ""}
                onChange={(e) => setFormData({ ...formData, methodId: e.target.value || null })}
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

            {/* Image Upload Section */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Recipe Image
              </label>
              <div className="flex items-start gap-4">
                {/* Image Preview */}
                <div className="relative w-32 h-32 flex-shrink-0">
                  {imagePreview ? (
                    <div className="relative w-full h-full rounded-lg overflow-hidden group">
                      <Image
                        src={imagePreview.startsWith("http") ? imagePreview : `${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:8000"}${imagePreview}`}
                        alt="Recipe preview"
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingImage}
                          className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                          title="Change image"
                        >
                          <Camera className="w-4 h-4 text-white" />
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          disabled={isUploadingImage}
                          className="p-2 bg-red-500/70 hover:bg-red-500 rounded-full transition-colors"
                          title="Remove image"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      </div>
                      {isUploadingImage && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                      className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                    >
                      {isUploadingImage ? (
                        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                      ) : (
                        <>
                          <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                          <span className="text-sm text-gray-500 dark:text-gray-400">Upload Image</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Upload instructions */}
                <div className="flex-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Upload a photo of your recipe. Supported formats: JPEG, PNG, GIF, WebP (max 5MB)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="text-sm text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
                  >
                    {imagePreview ? "Change Image" : "Select Image"}
                  </button>
                </div>
              </div>
            </div>

            {/* Ingredients: select from DB, then amount + unit */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Ingredients *
                </label>
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
                {formData.ingredientRows.map((row, index) => (
                  <IngredientSelectRow
                    key={index}
                    value={row}
                    onChange={(v) => handleIngredientRowChange(index, v)}
                    onRemove={() => handleRemoveIngredient(index)}
                    canRemove={formData.ingredientRows.length > 1}
                    placeholder={`Ingredient ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Instructions *
                </label>
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
                {formData.instructions.map((inst, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex-shrink-0 w-8 h-10 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <textarea
                      value={inst}
                      onChange={(e) => handleUpdateInstruction(index, e.target.value)}
                      placeholder={`Step ${index + 1}`}
                      rows={2}
                      className="flex-1 px-3 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveInstruction(index)}
                      disabled={formData.instructions.length === 1}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed self-start"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t dark:border-gray-700">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
