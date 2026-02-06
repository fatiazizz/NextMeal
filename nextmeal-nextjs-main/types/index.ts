// System User ID constant (must match backend: User::SYSTEM_USER_ID)
export const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

// User roles
export type UserRole = "system" | "admin" | "user";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
};

export type Ingredient = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expiryDate: string;
  category?: string;
  minimumThreshold?: number;
  imageUrl?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
};

// System ingredient definition (from backend /ingredients)
export type SystemIngredient = {
  id: string;
  name: string;
  category: string;
  unit: string;
  /**
   * List of allowed input units for this ingredient (unit codes).
   * Always includes at least the base unit.
   */
  allowedUnits?: string[];
  /** Default shelf life in days when user skips expiration (from ingredient-expire.csv) */
  defaultDaysUntilExpiry?: number | null;
};

export type IngredientDefault = {
  category: string;
  unit: string;
  daysUntilExpiry?: number;
};

export type Recipe = {
  id: string;
  name: string;
  description: string;
  prepTime: string;
  servings: number;
  cuisine?: string | null;
  cuisineId?: string | null;
  recipeCategory?: string | null;
  cookingMethod?: string | null;
  methodId?: string | null;
  requiredIngredients: string[];
  ingredientDetails: Array<{
    ingredient: string;
    quantity?: number;
    unit?: string;
    amount?: string;
  }>;
  /** Populated by API for edit form: ingredient id, name, quantity, unit, allowedUnits */
  ingredients?: Array<{
    ingredientId: string;
    ingredientName: string;
    quantity: number;
    unit: string;
    allowedUnits: string[];
  }>;
  instructions: string[];
  imageUrl?: string;
  ownerUserId: string; // SYSTEM_USER_ID for system recipes
  createdAt?: string;
  updatedAt?: string;
};

export type ShoppingItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  checked: boolean;
  fromRecommendations?: boolean;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type NotificationType = "expiration" | "low_stock" | "info";
export type NotificationSeverity = "normal" | "safety";
export type NotificationState = "active" | "resolved";

export type Notification = {
  id: string;
  userId: string;
  ingredientId?: string;
  relatedInventoryId?: string;
  notificationType: NotificationType;
  severity: NotificationSeverity;
  state: NotificationState;
  isRead: boolean;
  deliveryStatus?: string;
  payload?: {
    message?: string;
    ingredientName?: string;
    daysUntilExpiry?: number;
    currentQuantity?: number;
    threshold?: number;
  };
  sentAt: string;
  readAt?: string;
  resolvedAt?: string;
  isActive: boolean;
};

export type MealSuggestion = {
  id: string;
  name: string;
  requiredIngredients: string[];
  matchedIngredients: string[];
  missingIngredients: string[];
  /** Ingredient matching % (ms): (sum of mj / n) * 100. Computed in backend using base units. */
  matchPercentage: number;
  /** Per-ingredient match ratio 0..1 (mj), keyed by ingredient id. */
  ingredientMatchingPercentages?: Record<string, number>;
  /** Per-ingredient expiration urgency 0..1 (uj), keyed by ingredient id. */
  expirationUrgency?: Record<string, number>;
  /** Average expiration urgency for matched ingredients. */
  expirationUrgencyAvg?: number;
  usesExpiringIngredients: boolean;
  prepTime: string;
  servings: number;
};

// API Response types
export type ApiResponse<T> = {
  data: T;
  message?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
  };
};

// Permission helpers
export type RecipePermission = {
  canEdit: boolean;
  canDelete: boolean;
};
