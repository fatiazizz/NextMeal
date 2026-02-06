import type {
  Ingredient,
  Recipe,
  ShoppingItem,
  Notification,
  User,
  ApiResponse,
  MealSuggestion,
  PaginatedResponse,
  SystemIngredient,
} from "@/types";

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// Get auth token from localStorage
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("nextmeal_auth_token");
}

// Generic API request helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "An error occurred" }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) return {} as T;
  
  return JSON.parse(text);
}

// File upload helper (for images)
async function uploadFile<T>(
  endpoint: string,
  file: File,
  additionalData?: Record<string, string>
): Promise<T> {
  const token = getAuthToken();
  const formData = new FormData();
  formData.append("image", file);
  
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers,
    body: formData,
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "An error occurred" }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// ==================== INVENTORY API ====================

export const inventoryApi = {
  // Get all inventory items for current user
  async getAll(): Promise<Ingredient[]> {
    const response = await apiRequest<ApiResponse<Ingredient[]>>("/inventory");
    return response.data || [];
  },

  // Get single inventory item
  async get(id: string): Promise<Ingredient> {
    const response = await apiRequest<ApiResponse<Ingredient>>(`/inventory/${id}`);
    return response.data;
  },

  // Add new inventory item
  async create(item: Omit<Ingredient, "id" | "createdAt" | "updatedAt" | "userId">): Promise<Ingredient> {
    const response = await apiRequest<ApiResponse<Ingredient>>("/inventory", {
      method: "POST",
      body: JSON.stringify({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        expiry_date: item.expiryDate,
        category: item.category,
        minimum_threshold: item.minimumThreshold,
      }),
    });
    return response.data;
  },

  // Update inventory item
  async update(id: string, item: Partial<Ingredient>): Promise<Ingredient> {
    const response = await apiRequest<ApiResponse<Ingredient>>(`/inventory/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        expiry_date: item.expiryDate,
        category: item.category,
        minimum_threshold: item.minimumThreshold,
      }),
    });
    return response.data;
  },

  // Delete inventory item
  async delete(id: string): Promise<void> {
    await apiRequest(`/inventory/${id}`, { method: "DELETE" });
  },

  // Get low stock items
  async getLowStock(): Promise<Ingredient[]> {
    const response = await apiRequest<ApiResponse<Ingredient[]>>("/inventory/low-stock");
    return response.data || [];
  },

  // Upload image for inventory item
  async uploadImage(id: string, file: File): Promise<{ image_url: string }> {
    const response = await uploadFile<ApiResponse<{ image_url: string }>>(
      `/inventory/${id}/image`,
      file
    );
    return response.data;
  },

  // Remove image from inventory item
  async removeImage(id: string): Promise<void> {
    await apiRequest(`/inventory/${id}/image`, { method: "DELETE" });
  },
};

// ==================== RECIPES API ====================

export type RecipeIngredientInput = {
  ingredientId: string;
  quantity: number;
  unit: string;
};

export type CreateRecipeInput = {
  name: string;
  description?: string;
  prepTime: string;
  servings: number;
  instructions: string[];
  imageUrl?: string | null;
  cuisineId?: string | null;
  methodId?: string | null;
  /** Preferred: ingredients from DB with id, quantity, unit */
  ingredients?: RecipeIngredientInput[];
  /** Legacy: when ingredients not used */
  requiredIngredients?: string[];
  ingredientDetails?: Array<{ ingredient: string; quantity?: number; unit?: string }>;
};

export type UpdateRecipeInput = Partial<CreateRecipeInput>;

export const recipesApi = {
  // Get all recipes (system + user's custom recipes)
  async getAll(): Promise<Recipe[]> {
    const response = await apiRequest<ApiResponse<Recipe[]>>("/recipes");
    return response.data || [];
  },

  // Get single recipe
  async get(id: string): Promise<Recipe> {
    const response = await apiRequest<ApiResponse<Recipe>>(`/recipes/${id}`);
    return response.data;
  },

  // Create new recipe (use ingredients array with ingredient_id, quantity, unit for DB-backed ingredients)
  async create(recipe: CreateRecipeInput): Promise<Recipe> {
    const body: Record<string, unknown> = {
      name: recipe.name,
      description: recipe.description,
      prep_time: recipe.prepTime,
      servings: recipe.servings,
      instructions: recipe.instructions,
      image_url: recipe.imageUrl ?? null,
      cuisine_id: recipe.cuisineId ?? null,
      method_id: recipe.methodId ?? null,
    };
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      body.ingredients = recipe.ingredients.map((i) => ({
        ingredient_id: i.ingredientId,
        quantity: i.quantity,
        unit: i.unit,
      }));
    } else {
      body.required_ingredients = recipe.requiredIngredients ?? [];
      body.ingredient_details = recipe.ingredientDetails ?? [];
    }
    const response = await apiRequest<ApiResponse<Recipe>>("/recipes", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return response.data;
  },

  // Update recipe (with permission check on backend)
  async update(id: string, recipe: UpdateRecipeInput): Promise<Recipe> {
    const body: Record<string, unknown> = {
      name: recipe.name,
      description: recipe.description,
      prep_time: recipe.prepTime,
      servings: recipe.servings,
      instructions: recipe.instructions,
      image_url: recipe.imageUrl ?? null,
      cuisine_id: recipe.cuisineId ?? null,
      method_id: recipe.methodId ?? null,
    };
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      body.ingredients = recipe.ingredients.map((i) => ({
        ingredient_id: i.ingredientId,
        quantity: i.quantity,
        unit: i.unit,
      }));
    } else if (recipe.requiredIngredients) {
      body.required_ingredients = recipe.requiredIngredients;
      body.ingredient_details = recipe.ingredientDetails ?? [];
    }
    const response = await apiRequest<ApiResponse<Recipe>>(`/recipes/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    return response.data;
  },

  // Delete recipe (with permission check on backend)
  async delete(id: string): Promise<void> {
    await apiRequest(`/recipes/${id}`, { method: "DELETE" });
  },

  // Upload image for recipe
  async uploadImage(id: string, file: File): Promise<{ image_url: string }> {
    const response = await uploadFile<ApiResponse<{ image_url: string }>>(
      `/recipes/${id}/image`,
      file
    );
    return response.data;
  },

  // Remove image from recipe
  async removeImage(id: string): Promise<void> {
    await apiRequest(`/recipes/${id}/image`, { method: "DELETE" });
  },
};

// ==================== IMAGE API ====================

export const imageApi = {
  // Generic image upload (returns URL)
  async upload(file: File, type: "recipe" | "inventory" | "general"): Promise<{ image_url: string; full_url: string }> {
    const response = await uploadFile<ApiResponse<{ image_url: string; full_url: string }>>(
      "/upload-image",
      file,
      { type }
    );
    return response.data;
  },
};

// ==================== SHOPPING LIST API ====================

export const shoppingListApi = {
  // Get all shopping list items
  async getAll(): Promise<ShoppingItem[]> {
    const response = await apiRequest<ApiResponse<ShoppingItem[]>>("/shopping-list");
    return response.data || [];
  },

  // Add item to shopping list (ingredientId links to DB ingredient when adding from autocomplete)
  async create(
    item: Omit<ShoppingItem, "id" | "createdAt" | "updatedAt" | "userId"> & { ingredientId?: string }
  ): Promise<ShoppingItem> {
    const body: Record<string, unknown> = {
      name: item.name,
      category: item.category,
      unit: item.unit,
      quantity: item.quantity,
      checked: item.checked,
      from_recommendations: item.fromRecommendations,
    };
    if ("ingredientId" in item && item.ingredientId) {
      body.ingredient_id = item.ingredientId;
    }
    const response = await apiRequest<ApiResponse<ShoppingItem>>("/shopping-list", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return response.data;
  },

  // Update shopping list item
  async update(id: string, item: Partial<ShoppingItem>): Promise<ShoppingItem> {
    const response = await apiRequest<ApiResponse<ShoppingItem>>(`/shopping-list/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: item.name,
        category: item.category,
        unit: item.unit,
        quantity: item.quantity,
        checked: item.checked,
      }),
    });
    return response.data;
  },

  // Delete shopping list item
  async delete(id: string): Promise<void> {
    await apiRequest(`/shopping-list/${id}`, { method: "DELETE" });
  },

  // Toggle item checked status
  async toggleChecked(id: string): Promise<ShoppingItem> {
    const response = await apiRequest<ApiResponse<ShoppingItem>>(`/shopping-list/${id}/toggle`, {
      method: "PATCH",
    });
    return response.data;
  },

  // Clear all checked items
  async clearChecked(): Promise<void> {
    await apiRequest("/shopping-list/clear-checked", { method: "DELETE" });
  },
};

// ==================== FAVORITES API ====================

export const favoritesApi = {
  // Get all favorites
  async getAll(): Promise<string[]> {
    const response = await apiRequest<ApiResponse<string[]>>("/favorites");
    return response.data || [];
  },

  // Add recipe to favorites
  async add(recipeId: string): Promise<void> {
    await apiRequest("/favorites", {
      method: "POST",
      body: JSON.stringify({ recipe_id: recipeId }),
    });
  },

  // Remove recipe from favorites
  async remove(recipeId: string): Promise<void> {
    await apiRequest(`/favorites/${recipeId}`, { method: "DELETE" });
  },

  // Check if recipe is favorite
  async isFavorite(recipeId: string): Promise<boolean> {
    const response = await apiRequest<ApiResponse<{ is_favorite: boolean }>>(`/favorites/${recipeId}/check`);
    return response.data?.is_favorite || false;
  },
};

// ==================== NOTIFICATIONS API ====================

export const notificationsApi = {
  // Get all notifications
  async getAll(): Promise<Notification[]> {
    const response = await apiRequest<ApiResponse<Notification[]>>("/notifications");
    return response.data || [];
  },

  // Mark notification as read
  async markAsRead(id: string): Promise<Notification> {
    const response = await apiRequest<ApiResponse<Notification>>(`/notifications/${id}/read`, {
      method: "PATCH",
    });
    return response.data;
  },

  // Mark all as read
  async markAllAsRead(): Promise<void> {
    await apiRequest("/notifications/mark-all-read", { method: "PATCH" });
  },

  // Delete notification
  async delete(id: string): Promise<void> {
    await apiRequest(`/notifications/${id}`, { method: "DELETE" });
  },
};

// ==================== RECOMMENDATIONS API ====================

export const recommendationsApi = {
  // Get meal recommendations based on user's inventory from backend
  async getRecommendations(): Promise<MealSuggestion[]> {
    const response = await apiRequest<{
      data: MealSuggestion[];
      meta: {
        total_recipes: number;
        inventory_items: number;
        expiration_reference_days: number;
      };
    }>("/recommendations");
    return response.data || [];
  },
};

// ==================== USER API ====================

export const userApi = {
  // Get current user with role
  async getCurrentUser(): Promise<User> {
    const response = await apiRequest<ApiResponse<User>>("/me");
    return response.data;
  },

  // Check if user can edit recipe
  async canEditRecipe(recipeId: string): Promise<{ canEdit: boolean; canDelete: boolean }> {
    const response = await apiRequest<ApiResponse<{ can_edit: boolean; can_delete: boolean }>>(
      `/recipes/${recipeId}/permissions`
    );
    return {
      canEdit: response.data?.can_edit || false,
      canDelete: response.data?.can_delete || false,
    };
  },
};

// ==================== INGREDIENTS (System) API ====================

export const ingredientsApi = {
  // Get all system ingredients (for inventory selection)
  async getAll(): Promise<SystemIngredient[]> {
    const response = await apiRequest<
      ApiResponse<
        Array<{
          id: string;
          name: string;
          category: string;
          unit: string;
          allowed_units?: string[];
          default_days_until_expiry?: number | null;
        }>
      >
    >("/ingredients");

    const raw = response.data || [];

    return raw.map((item) => {
      const allowedUnits =
        item.allowed_units && item.allowed_units.length > 0
          ? item.allowed_units
          : [item.unit];

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        allowedUnits,
        defaultDaysUntilExpiry: item.default_days_until_expiry ?? undefined,
      };
    });
  },

  // Search ingredients (for recipe form autocomplete)
  async search(query: string): Promise<SystemIngredient[]> {
    const response = await apiRequest<
      ApiResponse<
        Array<{
          id: string;
          name: string;
          category: string;
          unit: string;
          allowed_units?: string[];
          default_days_until_expiry?: number | null;
        }>
      >
    >(`/ingredients/search?q=${encodeURIComponent(query)}`);

    const raw = response.data || [];

    return raw.map((item) => {
      const allowedUnits =
        item.allowed_units && item.allowed_units.length > 0
          ? item.allowed_units
          : [item.unit];

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        allowedUnits,
        defaultDaysUntilExpiry: item.default_days_until_expiry ?? undefined,
      };
    });
  },
};

// ==================== CUISINES & COOKING METHODS (public, for recipe form) ====================

export type CuisineOption = { id: string; name: string };
export type CookingMethodOption = { id: string; name: string };

export const cuisinesApi = {
  async getAll(): Promise<CuisineOption[]> {
    const response = await apiRequest<ApiResponse<CuisineOption[]>>("/cuisines");
    return response.data || [];
  },
};

export const cookingMethodsApi = {
  async getAll(): Promise<CookingMethodOption[]> {
    const response = await apiRequest<ApiResponse<CookingMethodOption[]>>("/cooking-methods");
    return response.data || [];
  },
};

// ==================== ADMIN API ====================

export type AdminStatistics = {
  users: {
    total: number;
    admins: number;
    regular_users: number;
    new_today: number;
  };
  recipes: {
    total: number;
    system_recipes: number;
    user_recipes: number;
    new_today: number;
  };
  ingredients: {
    total: number;
    in_use: number;
  };
  inventory: {
    total_items: number;
    low_stock_items: number;
  };
  shopping_lists: {
    total_items: number;
    checked_items: number;
  };
  notifications: {
    total: number;
    unread: number;
    active: number;
  };
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  notifications_enabled: boolean;
  created_at?: string;
  updated_at?: string;
  stats?: {
    recipes_count: number;
    inventory_count: number;
    shopping_list_count: number;
    favorites_count: number;
    notifications_count: number;
  };
};

export type AdminIngredient = {
  id: string;
  name: string;
  category: {
    id: string;
    name: string;
  } | null;
  base_unit: string;
  image_url?: string | null;
  in_recipes_count: number;
  in_inventory_count: number;
  created_at?: string;
};

export type IngredientUsage = {
  ingredient: {
    id: string;
    name: string;
  };
  recipes: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
    owner: {
      id: string;
      name: string;
    } | null;
  }>;
  inventory: Array<{
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
    quantity: number;
    unit: string;
    expiry_date: string | null;
  }>;
  counts: {
    recipes: number;
    inventory: number;
  };
};

export type AdminIngredientAllowedUnits = {
  ingredientId: string;
  name: string;
  baseUnit: string | null;
  allowedUnits: string[];
  allUnits: Array<{
    code: string;
    name: string;
    kind: string | null;
    base_unit: string | null;
    to_base_factor: number | null;
  }>;
};

export type AdminRecipe = Recipe & {
  ownerName: string;
};

export const adminApi = {
  // Get dashboard statistics
  async getStatistics(): Promise<AdminStatistics> {
    const response = await apiRequest<ApiResponse<AdminStatistics>>("/admin/statistics");
    return response.data;
  },

  // Users management
  async getUsers(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    role?: "admin" | "user";
  }): Promise<PaginatedResponse<AdminUser>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.per_page) queryParams.append("per_page", params.per_page.toString());
    if (params?.search) queryParams.append("search", params.search);
    if (params?.role) queryParams.append("role", params.role);

    const query = queryParams.toString();
    const response = await apiRequest<PaginatedResponse<AdminUser>>(
      `/admin/users${query ? `?${query}` : ""}`
    );
    return response;
  },

  async getUser(userId: string): Promise<AdminUser> {
    const response = await apiRequest<ApiResponse<AdminUser>>(`/admin/users/${userId}`);
    return response.data;
  },

  async updateUser(userId: string, data: {
    name?: string;
    email?: string;
    notifications_enabled?: boolean;
  }): Promise<AdminUser> {
    const response = await apiRequest<ApiResponse<AdminUser>>(`/admin/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async updateUserRole(userId: string, role: "admin" | "user"): Promise<AdminUser> {
    const response = await apiRequest<ApiResponse<AdminUser>>(`/admin/users/${userId}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    });
    return response.data;
  },

  async deleteUser(userId: string): Promise<void> {
    await apiRequest(`/admin/users/${userId}`, { method: "DELETE" });
  },

  // Recipes management
  async getAllRecipes(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    owner_id?: string;
  }): Promise<PaginatedResponse<AdminRecipe>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.per_page) queryParams.append("per_page", params.per_page.toString());
    if (params?.search) queryParams.append("search", params.search);
    if (params?.owner_id) queryParams.append("owner_id", params.owner_id);

    const query = queryParams.toString();
    const response = await apiRequest<PaginatedResponse<AdminRecipe>>(
      `/admin/recipes${query ? `?${query}` : ""}`
    );
    return response;
  },

  async deleteRecipe(recipeId: string): Promise<void> {
    await apiRequest(`/admin/recipes/${recipeId}`, { method: "DELETE" });
  },

  // Ingredients management
  async getAllIngredients(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    category_id?: string;
  }): Promise<PaginatedResponse<AdminIngredient>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.per_page) queryParams.append("per_page", params.per_page.toString());
    if (params?.search) queryParams.append("search", params.search);
    if (params?.category_id) queryParams.append("category_id", params.category_id);

    const query = queryParams.toString();
    const response = await apiRequest<PaginatedResponse<AdminIngredient>>(
      `/admin/ingredients${query ? `?${query}` : ""}`
    );
    return response;
  },

  async createIngredient(data: {
    name: string;
    category_id?: string;
    base_unit?: string;
  }): Promise<AdminIngredient> {
    const response = await apiRequest<ApiResponse<AdminIngredient>>("/admin/ingredients", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async updateIngredient(ingredientId: string, data: {
    name?: string;
    category_id?: string;
    base_unit?: string;
  }): Promise<AdminIngredient> {
    const response = await apiRequest<ApiResponse<AdminIngredient>>(
      `/admin/ingredients/${ingredientId}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  async deleteIngredient(ingredientId: string): Promise<void> {
    await apiRequest(`/admin/ingredients/${ingredientId}`, { method: "DELETE" });
  },

  async getIngredientUsage(ingredientId: string): Promise<IngredientUsage> {
    const response = await apiRequest<ApiResponse<IngredientUsage>>(
      `/admin/ingredients/${ingredientId}/usage`
    );
    return response.data;
  },
  
  // Ingredient allowed units management
  async getIngredientAllowedUnits(ingredientId: string): Promise<AdminIngredientAllowedUnits> {
    const response = await apiRequest<
      ApiResponse<{
        ingredient_id: string;
        name: string;
        base_unit: string | null;
        allowed_units: string[];
        all_units: Array<{
          code: string;
          name: string;
          kind: string | null;
          base_unit: string | null;
          to_base_factor: number | null;
        }>;
      }>
    >(`/admin/ingredients/${ingredientId}/allowed-units`);

    const data = response.data;

    return {
      ingredientId: data.ingredient_id,
      name: data.name,
      baseUnit: data.base_unit,
      allowedUnits: data.allowed_units || [],
      allUnits: data.all_units || [],
    };
  },

  async addIngredientAllowedUnit(
    ingredientId: string,
    unitCode: string
  ): Promise<AdminIngredientAllowedUnits> {
    const response = await apiRequest<
      ApiResponse<{
        ingredient_id: string;
        name: string;
        base_unit: string | null;
        allowed_units: string[];
        all_units: Array<{
          code: string;
          name: string;
          kind: string | null;
          base_unit: string | null;
          to_base_factor: number | null;
        }>;
      }>
    >(`/admin/ingredients/${ingredientId}/allowed-units`, {
      method: "POST",
      body: JSON.stringify({ unit_code: unitCode }),
    });

    const data = response.data;

    return {
      ingredientId: data.ingredient_id,
      name: data.name,
      baseUnit: data.base_unit,
      allowedUnits: data.allowed_units || [],
      allUnits: data.all_units || [],
    };
  },

  async removeIngredientAllowedUnit(
    ingredientId: string,
    unitCode: string
  ): Promise<AdminIngredientAllowedUnits> {
    const response = await apiRequest<
      ApiResponse<{
        ingredient_id: string;
        name: string;
        base_unit: string | null;
        allowed_units: string[];
        all_units: Array<{
          code: string;
          name: string;
          kind: string | null;
          base_unit: string | null;
          to_base_factor: number | null;
        }>;
      }>
    >(`/admin/ingredients/${ingredientId}/allowed-units/${encodeURIComponent(unitCode)}`, {
      method: "DELETE",
    });

    const data = response.data;

    return {
      ingredientId: data.ingredient_id,
      name: data.name,
      baseUnit: data.base_unit,
      allowedUnits: data.allowed_units || [],
      allUnits: data.all_units || [],
    };
  },

  // Upload image for ingredient
  async uploadIngredientImage(ingredientId: string, file: File): Promise<{ image_url: string }> {
    const response = await uploadFile<ApiResponse<{ image_url: string }>>(
      `/admin/ingredients/${ingredientId}/image`,
      file
    );
    return response.data;
  },

  // Remove image from ingredient
  async removeIngredientImage(ingredientId: string): Promise<void> {
    await apiRequest(`/admin/ingredients/${ingredientId}/image`, { method: "DELETE" });
  },

  // Categories management
  async getAllCategories(): Promise<Array<{ id: string; name: string; ingredients_count: number }>> {
    const response = await apiRequest<ApiResponse<Array<{ id: string; name: string; ingredients_count: number }>>>(
      "/admin/categories"
    );
    return response.data || [];
  },

  async createCategory(data: { name: string }): Promise<{ id: string; name: string }> {
    const response = await apiRequest<ApiResponse<{ id: string; name: string }>>("/admin/categories", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async updateCategory(categoryId: string, data: { name: string }): Promise<{ id: string; name: string }> {
    const response = await apiRequest<ApiResponse<{ id: string; name: string }>>(`/admin/categories/${categoryId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async deleteCategory(categoryId: string): Promise<void> {
    await apiRequest(`/admin/categories/${categoryId}`, { method: "DELETE" });
  },

  // Units management
  async getAllUnits(): Promise<
    Array<{
      code: string;
      name: string;
      kind: string | null;
      base_unit: string | null;
      to_base_factor: number | null;
    }>
  > {
    const response = await apiRequest<
      ApiResponse<
        Array<{
          code: string;
          name: string;
          kind: string | null;
          base_unit: string | null;
          to_base_factor: number | null;
        }>
      >
    >("/admin/units");
    return response.data || [];
  },

  async createUnit(data: {
    unit_code: string;
    unit_kind?: string;
    base_unit?: string;
    to_base_factor?: number;
  }): Promise<{
    code: string;
    name: string;
    kind: string | null;
    base_unit: string | null;
    to_base_factor: number | null;
  }> {
    const response = await apiRequest<
      ApiResponse<{
        code: string;
        name: string;
        kind: string | null;
        base_unit: string | null;
        to_base_factor: number | null;
      }>
    >("/admin/units", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async updateUnit(
    unitCode: string,
    data: {
      unit_kind?: string;
      base_unit?: string;
      to_base_factor?: number;
    }
  ): Promise<{
    code: string;
    name: string;
    kind: string | null;
    base_unit: string | null;
    to_base_factor: number | null;
  }> {
    const response = await apiRequest<
      ApiResponse<{
        code: string;
        name: string;
        kind: string | null;
        base_unit: string | null;
        to_base_factor: number | null;
      }>
    >(`/admin/units/${unitCode}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async deleteUnit(unitCode: string): Promise<void> {
    await apiRequest(`/admin/units/${unitCode}`, { method: "DELETE" });
  },

  // Cuisines management
  async getAllCuisines(): Promise<Array<{ id: string; name: string; recipes_count: number }>> {
    const response = await apiRequest<
      ApiResponse<Array<{ id: string; name: string; recipes_count: number }>>
    >("/admin/cuisines");
    return response.data || [];
  },

  async createCuisine(data: { name: string }): Promise<{ id: string; name: string }> {
    const response = await apiRequest<ApiResponse<{ id: string; name: string }>>("/admin/cuisines", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async updateCuisine(cuisineId: string, data: { name: string }): Promise<{ id: string; name: string }> {
    const response = await apiRequest<ApiResponse<{ id: string; name: string }>>(
      `/admin/cuisines/${cuisineId}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  async deleteCuisine(cuisineId: string): Promise<void> {
    await apiRequest(`/admin/cuisines/${cuisineId}`, { method: "DELETE" });
  },

  // Recipe Categories management
  async getAllRecipeCategories(): Promise<
    Array<{ id: string; name: string; recipes_count: number }>
  > {
    const response = await apiRequest<
      ApiResponse<Array<{ id: string; name: string; recipes_count: number }>>
    >("/admin/recipe-categories");
    return response.data || [];
  },

  async createRecipeCategory(data: {
    name: string;
  }): Promise<{ id: string; name: string }> {
    const response = await apiRequest<ApiResponse<{ id: string; name: string }>>(
      "/admin/recipe-categories",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  async updateRecipeCategory(
    categoryId: string,
    data: { name: string }
  ): Promise<{ id: string; name: string }> {
    const response = await apiRequest<ApiResponse<{ id: string; name: string }>>(
      `/admin/recipe-categories/${categoryId}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  async deleteRecipeCategory(categoryId: string): Promise<void> {
    await apiRequest(`/admin/recipe-categories/${categoryId}`, { method: "DELETE" });
  },

  // Cooking Methods management
  async getAllCookingMethods(): Promise<
    Array<{ id: string; name: string; recipes_count: number }>
  > {
    const response = await apiRequest<
      ApiResponse<Array<{ id: string; name: string; recipes_count: number }>>
    >("/admin/cooking-methods");
    return response.data || [];
  },

  async createCookingMethod(data: {
    name: string;
  }): Promise<{ id: string; name: string }> {
    const response = await apiRequest<ApiResponse<{ id: string; name: string }>>(
      "/admin/cooking-methods",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  async updateCookingMethod(
    methodId: string,
    data: { name: string }
  ): Promise<{ id: string; name: string }> {
    const response = await apiRequest<ApiResponse<{ id: string; name: string }>>(
      `/admin/cooking-methods/${methodId}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  async deleteCookingMethod(methodId: string): Promise<void> {
    await apiRequest(`/admin/cooking-methods/${methodId}`, { method: "DELETE" });
  },

  // Update Recipe (admin)
  async updateRecipe(recipeId: string, data: Partial<Recipe>): Promise<Recipe> {
    const response = await apiRequest<ApiResponse<Recipe>>(`/admin/recipes/${recipeId}`, {
      method: "PUT",
      body: JSON.stringify({
        name: data.name,
        description: data.description,
        prep_time: data.prepTime,
        servings: data.servings,
        required_ingredients: data.requiredIngredients,
        ingredient_details: data.ingredientDetails,
        instructions: data.instructions,
        image_url: data.imageUrl,
        cuisine_id: (data as any).cuisine_id,
        recipe_category_id: (data as any).recipe_category_id,
        method_id: (data as any).method_id,
      }),
    });
    return response.data;
  },
};
