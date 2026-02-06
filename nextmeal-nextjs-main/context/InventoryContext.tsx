"use client";

import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from "react";
import type { Ingredient, Recipe, ShoppingItem } from "@/types";
import { SYSTEM_USER_ID } from "@/types";
import { inventoryApi, recipesApi, shoppingListApi, favoritesApi, type CreateRecipeInput, type UpdateRecipeInput } from "@/utils/api";
import { useNotifications } from "./NotificationContext";
import { useUser } from "./UserContext";

/* ================= TYPES ================= */

type InventoryPatch = Partial<Pick<Ingredient, "quantity" | "expiryDate" | "minimumThreshold">>;

type InventoryContextValue = {
  /* inventory */
  ingredients: Ingredient[];
  isLoadingInventory: boolean;
  addIngredient: (i: Omit<Ingredient, "id" | "userId" | "createdAt" | "updatedAt">) => Promise<void>;
  removeIngredient: (id: string) => Promise<void>;
  updateIngredient: (id: string, patch: InventoryPatch) => Promise<void>;
  getLowStockItems: () => Ingredient[];
  refreshInventory: () => Promise<void>;

  /* recipes */
  recipes: Recipe[];
  customRecipes: Recipe[];
  isLoadingRecipes: boolean;
  addCustomRecipe: (r: CreateRecipeInput) => Promise<void>;
  updateRecipe: (id: string, r: UpdateRecipeInput) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  refreshRecipes: () => Promise<void>;

  /* favorites */
  favorites: string[];
  isLoadingFavorites: boolean;
  toggleFavorite: (id: string) => Promise<void>;
  isFavorite: (id: string) => boolean;
  refreshFavorites: () => Promise<void>;

  /* shopping list */
  shoppingList: ShoppingItem[];
  isLoadingShoppingList: boolean;
  addToShoppingList: (item: Omit<ShoppingItem, "id" | "userId" | "createdAt" | "updatedAt"> & { ingredientId?: string }) => Promise<void>;
  removeFromShoppingList: (id: string) => Promise<void>;
  toggleShoppingItemCompleted: (id: string) => Promise<void>;
  clearCompletedItems: () => Promise<void>;
  refreshShoppingList: () => Promise<void>;
};

/* ================= CONTEXT ================= */

const InventoryContext = createContext<InventoryContextValue | null>(null);

/* ================= HELPERS ================= */

function toISODate(d: Date) {
  return d.toISOString().split("T")[0];
}

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/* ================= SEED DATA (fallback when API unavailable) ================= */

const seedIngredients: Ingredient[] = [
  { id: "1", name: "milk", quantity: 1, unit: "l", expiryDate: daysFromNow(2), userId: SYSTEM_USER_ID },
  { id: "2", name: "egg", quantity: 6, unit: "pcs", expiryDate: daysFromNow(10), userId: SYSTEM_USER_ID },
  { id: "3", name: "tomato", quantity: 2, unit: "pcs", expiryDate: daysFromNow(1), userId: SYSTEM_USER_ID },
  { id: "4", name: "rice", quantity: 500, unit: "g", expiryDate: daysFromNow(120), userId: SYSTEM_USER_ID },
  { id: "5", name: "yogurt", quantity: 200, unit: "g", expiryDate: daysFromNow(6), userId: SYSTEM_USER_ID },
];

const seedRecipes: Recipe[] = [
  {
    id: "r1",
    name: "Tomato Omelette",
    description: "Quick omelette using eggs and tomatoes.",
    prepTime: "15 min",
    servings: 2,
    requiredIngredients: ["egg", "tomato", "salt"],
    ingredientDetails: [
      { ingredient: "egg", quantity: 2, unit: "pcs" },
      { ingredient: "tomato", quantity: 1, unit: "pcs" },
      { ingredient: "salt" },
    ],
    instructions: ["Beat eggs.", "Add chopped tomato.", "Cook in pan.", "Season and serve."],
    imageUrl: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1200&q=60",
    ownerUserId: SYSTEM_USER_ID,
  },
  {
    id: "r2",
    name: "Simple Rice Bowl",
    description: "Fast bowl meal with rice base.",
    prepTime: "20 min",
    servings: 2,
    requiredIngredients: ["rice", "chicken", "onion"],
    ingredientDetails: [
      { ingredient: "rice", quantity: 200, unit: "g" },
      { ingredient: "chicken", quantity: 200, unit: "g" },
      { ingredient: "onion", quantity: 1, unit: "pcs" },
    ],
    instructions: ["Cook rice.", "Sauté onion + chicken.", "Combine and serve."],
    imageUrl: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=60",
    ownerUserId: SYSTEM_USER_ID,
  },
  {
    id: "r3",
    name: "Yogurt Banana Bowl",
    description: "Breakfast bowl with yogurt and banana.",
    prepTime: "5 min",
    servings: 1,
    requiredIngredients: ["yogurt", "banana"],
    ingredientDetails: [
      { ingredient: "yogurt", quantity: 200, unit: "g" },
      { ingredient: "banana", quantity: 1, unit: "pcs" },
    ],
    instructions: ["Slice banana.", "Mix with yogurt.", "Serve."],
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=60",
    ownerUserId: SYSTEM_USER_ID,
  },
];

/* ================= PROVIDER ================= */

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  // Track if we're using API or fallback mode
  const [useApiMode, setUseApiMode] = useState(true);

  /* inventory */
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);

  /* recipes */
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(true);

  /* favorites */
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);

  /* shopping list */
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [isLoadingShoppingList, setIsLoadingShoppingList] = useState(true);

  // Get notification context and auth state (to reload data on login / clear on logout)
  const { addNotification } = useNotifications();
  const { user } = useUser();

  const addInfoNotification = useCallback((message: string) => {
    addNotification({
      userId: "current",
      notificationType: "info",
      severity: "normal",
      state: "active",
      isRead: false,
      payload: { message },
      isActive: true,
    });
  }, [addNotification]);

  /* ---------- Inventory actions ---------- */

  const refreshInventory = useCallback(async () => {
    setIsLoadingInventory(true);
    try {
      const data = await inventoryApi.getAll();
      setIngredients(data);
      setUseApiMode(true);
    } catch (error) {
      console.warn("API unavailable, using fallback data:", error);
      setIngredients(seedIngredients);
      setUseApiMode(false);
    } finally {
      setIsLoadingInventory(false);
    }
  }, []);

  const addIngredient = useCallback(async (item: Omit<Ingredient, "id" | "userId" | "createdAt" | "updatedAt">) => {
    if (useApiMode) {
      try {
        const newItem = await inventoryApi.create(item);
        setIngredients((prev) => [newItem, ...prev]);
        addInfoNotification("Ingredient added to inventory.");
      } catch (error) {
        console.error("Failed to add ingredient:", error);
        throw error;
      }
    } else {
      // Fallback mode
      const newItem: Ingredient = {
        ...item,
        id: `local_${Date.now()}`,
        userId: "current",
      };
      setIngredients((prev) => [newItem, ...prev]);
    }
  }, [useApiMode, addInfoNotification]);

  const removeIngredient = useCallback(async (id: string) => {
    if (useApiMode) {
      try {
        await inventoryApi.delete(id);
        setIngredients((prev) => prev.filter((x) => x.id !== id));
        addInfoNotification("Ingredient removed from inventory.");
      } catch (error) {
        console.error("Failed to remove ingredient:", error);
        throw error;
      }
    } else {
      setIngredients((prev) => prev.filter((x) => x.id !== id));
    }
  }, [useApiMode, addInfoNotification]);

  const updateIngredient = useCallback(async (id: string, patch: InventoryPatch) => {
    if (useApiMode) {
      try {
        const updated = await inventoryApi.update(id, patch);
        setIngredients((prev) => prev.map((x) => (x.id === id ? updated : x)));
      } catch (error) {
        console.error("Failed to update ingredient:", error);
        throw error;
      }
    } else {
      setIngredients((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    }
  }, [useApiMode]);

  const getLowStockItems = useCallback(() => {
    return ingredients.filter((x) => x.quantity <= (x.minimumThreshold || 2));
  }, [ingredients]);

  /* ---------- Recipes actions ---------- */

  const refreshRecipes = useCallback(async () => {
    setIsLoadingRecipes(true);
    try {
      const data = await recipesApi.getAll();
      setRecipes(data);
    } catch (error) {
      console.warn("Recipes API unavailable, using fallback:", error);
      setRecipes(seedRecipes);
    } finally {
      setIsLoadingRecipes(false);
    }
  }, []);

  const customRecipes = useMemo(() => {
    // Custom recipes are those not owned by system
    return recipes.filter((r) => r.ownerUserId !== SYSTEM_USER_ID);
  }, [recipes]);

  const addCustomRecipe = useCallback(async (r: CreateRecipeInput) => {
    if (useApiMode) {
      try {
        const newRecipe = await recipesApi.create(r);
        setRecipes((prev) => [newRecipe, ...prev]);
        addInfoNotification("Recipe created successfully.");
      } catch (error) {
        console.error("Failed to create recipe:", error);
        throw error;
      }
    } else {
      // Fallback mode (no API)
      const id = `c_${Date.now()}`;
      const requiredIngredients = r.ingredients?.map((i) => i.ingredientId) ?? r.requiredIngredients ?? [];
      const ingredientDetails = r.ingredients?.map((i) => ({
        ingredient: i.ingredientId,
        quantity: i.quantity,
        unit: i.unit,
      })) ?? [];
      const newRecipe: Recipe = {
        id,
        name: r.name,
        description: r.description ?? "",
        prepTime: r.prepTime,
        servings: r.servings,
        requiredIngredients: requiredIngredients as unknown as string[],
        ingredientDetails: ingredientDetails as Recipe["ingredientDetails"],
        instructions: r.instructions,
        imageUrl: r.imageUrl ?? undefined,
        ownerUserId: "current_user",
      };
      setRecipes((prev) => [newRecipe, ...prev]);
    }
  }, [useApiMode, addInfoNotification]);

  const updateRecipe = useCallback(async (id: string, patch: UpdateRecipeInput) => {
    if (useApiMode) {
      try {
        const updated = await recipesApi.update(id, patch);
        setRecipes((prev) => prev.map((x) => (x.id === id ? updated : x)));
        addInfoNotification("Recipe updated successfully.");
      } catch (error) {
        console.error("Failed to update recipe:", error);
        throw error;
      }
    } else {
      setRecipes((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    }
  }, [useApiMode, addInfoNotification]);

  const deleteRecipe = useCallback(async (id: string) => {
    if (useApiMode) {
      try {
        await recipesApi.delete(id);
        setRecipes((prev) => prev.filter((x) => x.id !== id));
        addInfoNotification("Recipe deleted successfully.");
      } catch (error) {
        console.error("Failed to delete recipe:", error);
        throw error;
      }
    } else {
      setRecipes((prev) => prev.filter((x) => x.id !== id));
    }
  }, [useApiMode, addInfoNotification]);

  /* ---------- Favorites actions ---------- */

  const refreshFavorites = useCallback(async () => {
    setIsLoadingFavorites(true);
    try {
      const data = await favoritesApi.getAll();
      setFavorites(data);
    } catch (error) {
      console.warn("Favorites API unavailable:", error);
      // Load from localStorage as fallback
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("nextmeal_favorites");
        setFavorites(stored ? JSON.parse(stored) : []);
      }
    } finally {
      setIsLoadingFavorites(false);
    }
  }, []);

  const toggleFavorite = useCallback(async (id: string) => {
    const isCurrentlyFavorite = favorites.includes(id);

    if (useApiMode) {
      try {
        if (isCurrentlyFavorite) {
          await favoritesApi.remove(id);
          setFavorites((prev) => prev.filter((x) => x !== id));
        } else {
          await favoritesApi.add(id);
          setFavorites((prev) => [id, ...prev]);
        }
      } catch (error) {
        console.error("Failed to toggle favorite:", error);
        // Fallback to local
        setFavorites((prev) =>
          prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]
        );
      }
    } else {
      setFavorites((prev) => {
        const newFavorites = prev.includes(id)
          ? prev.filter((x) => x !== id)
          : [id, ...prev];
        // Save to localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("nextmeal_favorites", JSON.stringify(newFavorites));
        }
        return newFavorites;
      });
    }
  }, [favorites, useApiMode]);

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  /* ---------- Shopping list actions ---------- */

  const refreshShoppingList = useCallback(async () => {
    setIsLoadingShoppingList(true);
    try {
      const data = await shoppingListApi.getAll();
      setShoppingList(data);
    } catch (error) {
      console.warn("Shopping list API unavailable:", error);
      // Load from localStorage as fallback
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("nextmeal_shopping_list");
        setShoppingList(stored ? JSON.parse(stored) : []);
      }
    } finally {
      setIsLoadingShoppingList(false);
    }
  }, []);

  const loadAllData = useCallback(async () => {
    await Promise.all([
      refreshInventory(),
      refreshRecipes(),
      refreshFavorites(),
      refreshShoppingList(),
    ]);
  }, [refreshInventory, refreshRecipes, refreshFavorites, refreshShoppingList]);

  /* ---------- Load data when user logs in; clear only on explicit logout ---------- */
  useEffect(() => {
    if (user?.id) {
      loadAllData();
    }
    // Do NOT clear when user is null here: verifyAuth() can set user to null (e.g. token expired),
    // which would wipe the UI. We only clear when the user explicitly logs out (see next effect).
  }, [user?.id, loadAllData]);

  useEffect(() => {
    const handleLogout = () => {
      setIngredients([]);
      setRecipes([]);
      setFavorites([]);
      setShoppingList([]);
      setUseApiMode(false);
      setIsLoadingInventory(false);
      setIsLoadingRecipes(false);
      setIsLoadingFavorites(false);
      setIsLoadingShoppingList(false);
    };
    if (typeof window === "undefined") return;
    window.addEventListener("nextmeal-logout", handleLogout);
    return () => window.removeEventListener("nextmeal-logout", handleLogout);
  }, []);

  const saveShoppingListLocally = (list: ShoppingItem[]) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("nextmeal_shopping_list", JSON.stringify(list));
    }
  };

  const addToShoppingList = useCallback(async (item: Omit<ShoppingItem, "id" | "userId" | "createdAt" | "updatedAt"> & { ingredientId?: string }) => {
    if (useApiMode) {
      try {
        const newItem = await shoppingListApi.create(item);
        setShoppingList((prev) => [newItem, ...prev]);
        addInfoNotification("Shopping list updated.");
      } catch (error) {
        console.error("Failed to add to shopping list:", error);
        // Fallback
        const newItem: ShoppingItem = { id: `s_${Date.now()}`, ...item };
        setShoppingList((prev) => {
          const updated = [newItem, ...prev];
          saveShoppingListLocally(updated);
          return updated;
        });
      }
    } else {
      const newItem: ShoppingItem = { id: `s_${Date.now()}`, ...item };
      setShoppingList((prev) => {
        const updated = [newItem, ...prev];
        saveShoppingListLocally(updated);
        return updated;
      });
    }
  }, [useApiMode, addInfoNotification]);

  const removeFromShoppingList = useCallback(async (id: string) => {
    if (useApiMode) {
      try {
        await shoppingListApi.delete(id);
        setShoppingList((prev) => prev.filter((x) => x.id !== id));
      } catch (error) {
        console.error("Failed to remove from shopping list:", error);
        setShoppingList((prev) => {
          const updated = prev.filter((x) => x.id !== id);
          saveShoppingListLocally(updated);
          return updated;
        });
      }
    } else {
      setShoppingList((prev) => {
        const updated = prev.filter((x) => x.id !== id);
        saveShoppingListLocally(updated);
        return updated;
      });
    }
  }, [useApiMode]);

  const toggleShoppingItemCompleted = useCallback(async (id: string) => {
    if (useApiMode) {
      try {
        const updated = await shoppingListApi.toggleChecked(id);
        setShoppingList((prev) => prev.map((x) => (x.id === id ? updated : x)));
      } catch (error) {
        console.error("Failed to toggle shopping item:", error);
        setShoppingList((prev) => {
          const updated = prev.map((x) => (x.id === id ? { ...x, checked: !x.checked } : x));
          saveShoppingListLocally(updated);
          return updated;
        });
      }
    } else {
      setShoppingList((prev) => {
        const updated = prev.map((x) => (x.id === id ? { ...x, checked: !x.checked } : x));
        saveShoppingListLocally(updated);
        return updated;
      });
    }
  }, [useApiMode]);

  const clearCompletedItems = useCallback(async () => {
    if (useApiMode) {
      try {
        await shoppingListApi.clearChecked();
        setShoppingList((prev) => prev.filter((x) => !x.checked));
        addInfoNotification("Completed items cleared.");
      } catch (error) {
        console.error("Failed to clear completed items:", error);
        setShoppingList((prev) => {
          const updated = prev.filter((x) => !x.checked);
          saveShoppingListLocally(updated);
          return updated;
        });
      }
    } else {
      setShoppingList((prev) => {
        const updated = prev.filter((x) => !x.checked);
        saveShoppingListLocally(updated);
        return updated;
      });
    }
  }, [useApiMode, addInfoNotification]);

  /* ---------- Value ---------- */

  const value = useMemo(
    () => ({
      ingredients,
      isLoadingInventory,
      addIngredient,
      removeIngredient,
      updateIngredient,
      getLowStockItems,
      refreshInventory,

      recipes,
      customRecipes,
      isLoadingRecipes,
      addCustomRecipe,
      updateRecipe,
      deleteRecipe,
      refreshRecipes,

      favorites,
      isLoadingFavorites,
      toggleFavorite,
      isFavorite,
      refreshFavorites,

      shoppingList,
      isLoadingShoppingList,
      addToShoppingList,
      removeFromShoppingList,
      toggleShoppingItemCompleted,
      clearCompletedItems,
      refreshShoppingList,
    }),
    [
      ingredients,
      isLoadingInventory,
      addIngredient,
      removeIngredient,
      updateIngredient,
      getLowStockItems,
      refreshInventory,
      recipes,
      customRecipes,
      isLoadingRecipes,
      addCustomRecipe,
      updateRecipe,
      deleteRecipe,
      refreshRecipes,
      favorites,
      isLoadingFavorites,
      toggleFavorite,
      isFavorite,
      refreshFavorites,
      shoppingList,
      isLoadingShoppingList,
      addToShoppingList,
      removeFromShoppingList,
      toggleShoppingItemCompleted,
      clearCompletedItems,
      refreshShoppingList,
    ]
  );

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

/* ================= HOOK ================= */

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) {
    throw new Error("useInventory must be used inside InventoryProvider");
  }
  return ctx;
}
