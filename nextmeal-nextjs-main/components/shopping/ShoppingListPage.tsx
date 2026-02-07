"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useInventory } from "@/context/InventoryContext";
import {
  ShoppingCart,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Sparkles,
  AlertTriangle,
  Loader2,
  CheckSquare,
  Square,
} from "lucide-react";
import { ingredientDefaults } from "@/data/ingredientDefaults";
import { ingredientsApi } from "@/utils/api";
import type { SystemIngredient } from "@/types";

const LOW_STOCK_THRESHOLD = 2;

export function ShoppingListPage() {
  const {
    ingredients,
    shoppingList,
    addToShoppingList,
    removeFromShoppingList,
    toggleShoppingItemCompleted,
    clearCompletedItems,
    isLoadingShoppingList,
  } = useInventory();

  const [showForm, setShowForm] = useState(false);
  const [recommendedQuantities, setRecommendedQuantities] = useState<Record<string, number>>({});
  const [dismissedRecommendations, setDismissedRecommendations] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("dismissedRecommendations");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    }
    return new Set();
  });
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    unit: "",
    quantity: 1,
  });
  // Ingredient autocomplete: user must select from DB ingredients
  const [ingredientQuery, setIngredientQuery] = useState("");
  const [ingredientSuggestions, setIngredientSuggestions] = useState<SystemIngredient[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState<SystemIngredient | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingIngredients, setSearchingIngredients] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounced search for ingredients
  useEffect(() => {
    if (!ingredientQuery.trim()) {
      setIngredientSuggestions([]);
      setSearchingIngredients(false);
      return;
    }
    setSearchingIngredients(true);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      ingredientsApi
        .search(ingredientQuery.trim())
        .then((data) => {
          setIngredientSuggestions(data);
          setShowSuggestions(true);
        })
        .catch(() => setIngredientSuggestions([]))
        .finally(() => setSearchingIngredients(false));
      searchTimeoutRef.current = null;
    }, 250);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [ingredientQuery]);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectIngredient = useCallback((ing: SystemIngredient) => {
    const units = ing.allowedUnits && ing.allowedUnits.length > 0 ? ing.allowedUnits : [ing.unit];
    setSelectedIngredient(ing);
    setFormData((prev) => ({
      ...prev,
      name: ing.name,
      category: ing.category,
      unit: ing.unit,
      quantity: prev.quantity,
    }));
    setIngredientQuery(ing.name);
    setShowSuggestions(false);
    setIngredientSuggestions([]);
  }, []);

  const handleIngredientInputChange = useCallback((value: string) => {
    setIngredientQuery(value);
    if (!value) {
      setSelectedIngredient(null);
      setFormData((prev) => ({ ...prev, name: "", category: "", unit: "" }));
    } else if (selectedIngredient && value !== selectedIngredient.name) {
      setSelectedIngredient(null);
      setFormData((prev) => ({ ...prev, name: "", category: "", unit: "" }));
    }
  }, [selectedIngredient]);

  const lowStockItems = useMemo(() => {
    return ingredients
      .filter((x) => x.quantity <= (x.minimumThreshold || LOW_STOCK_THRESHOLD))
      .filter((x) => !dismissedRecommendations.has(x.id))
      .map((x) => {
        const key = x.name.toLowerCase().trim();
        const defaults = ingredientDefaults[key];
        return {
          id: x.id,
          ingredientId: x.ingredientId,
          name: x.name,
          unit: x.unit,
          current: x.quantity,
          threshold: x.minimumThreshold || LOW_STOCK_THRESHOLD,
          category: defaults?.category || x.category || "Other",
        };
      });
  }, [ingredients, dismissedRecommendations]);

  const handleDismissRecommendation = (itemId: string) => {
    const updated = new Set(dismissedRecommendations);
    updated.add(itemId);
    setDismissedRecommendations(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("dismissedRecommendations", JSON.stringify(Array.from(updated)));
    }
  };

  const uncheckedItems = useMemo(
    () => shoppingList.filter((x) => !x.checked),
    [shoppingList]
  );
  const checkedItems = useMemo(
    () => shoppingList.filter((x) => x.checked),
    [shoppingList]
  );

  const resetAddForm = useCallback(() => {
    setFormData({ name: "", category: "", unit: "", quantity: 1 });
    setIngredientQuery("");
    setSelectedIngredient(null);
    setIngredientSuggestions([]);
    setShowSuggestions(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredient) return;
    const name = formData.name.trim();
    if (!name || !formData.unit) return;

    setIsAdding(true);
    try {
      await addToShoppingList({
        name,
        category: formData.category,
        unit: formData.unit,
        quantity: formData.quantity,
        checked: false,
        fromRecommendations: false,
        ingredientId: selectedIngredient.id,
      });

      resetAddForm();
      setShowForm(false);
    } catch (error) {
      console.error("Failed to add to shopping list:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const updateRecommendedQuantity = (id: string, value: number) => {
    setRecommendedQuantities((prev) => ({ ...prev, [id]: value }));
  };

  const addRecommendedItem = async (item: {
    id: string;
    ingredientId?: string;
    name: string;
    category: string;
    unit: string;
    threshold: number;
  }) => {
    const exists = shoppingList.some(
      (x) => x.name.toLowerCase().trim() === item.name.toLowerCase().trim()
    );
    if (exists) return;

    const quantity = recommendedQuantities[item.id] ?? item.threshold;

    try {
      await addToShoppingList({
        name: item.name,
        category: item.category,
        unit: item.unit,
        quantity,
        checked: false,
        fromRecommendations: true,
        ingredientId: item.ingredientId,
      });
    } catch (error) {
      console.error("Failed to add recommended item:", error);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeFromShoppingList(id);
    } catch (error) {
      console.error("Failed to remove item:", error);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await toggleShoppingItemCompleted(id);
    } catch (error) {
      console.error("Failed to toggle item:", error);
    }
  };

  const handleClearCompleted = async () => {
    try {
      await clearCompletedItems();
    } catch (error) {
      console.error("Failed to clear completed:", error);
    }
  };

  if (isLoadingShoppingList) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading shopping list...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <ShoppingCart className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-blue-700 dark:text-blue-400">Shopping List</h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
              {uncheckedItems.length} item{uncheckedItems.length !== 1 ? "s" : ""} to buy
              {checkedItems.length > 0 && `, ${checkedItems.length} checked off`}
            </p>
          </div>
        </div>

        {/* Desktop buttons */}
        <div className="hidden md:flex gap-2">
          {checkedItems.length > 0 && (
            <button
              onClick={handleClearCompleted}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Clear Checked
            </button>
          )}

          <button
            onClick={() => { if (!showForm) resetAddForm(); setShowForm((v) => !v); }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>

        {/* Mobile: Clear Checked button only (when there are checked items) */}
        {checkedItems.length > 0 && (
          <button
            onClick={handleClearCompleted}
            className="md:hidden px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Recommendations */}
      {lowStockItems.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg shadow-sm border border-yellow-200 dark:border-yellow-800 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <h3 className="text-yellow-900 dark:text-yellow-100 font-semibold">Recommended Items</h3>
          </div>

          <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-4">
            These items are running low in your inventory:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lowStockItems.map((item) => {
              const alreadyInList = shoppingList.some(
                (x) => x.name.toLowerCase().trim() === item.name.toLowerCase().trim()
              );

              return (
                <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => {
                          if (!alreadyInList) {
                            addRecommendedItem(item);
                          }
                        }}
                        disabled={alreadyInList}
                        className={`flex-shrink-0 transition-colors ${
                          alreadyInList
                            ? "text-green-600 dark:text-green-400 cursor-default"
                            : "text-gray-400 hover:text-green-600 dark:hover:text-green-400 cursor-pointer"
                        }`}
                        title={alreadyInList ? "Already in shopping list" : "Add to shopping list"}
                      >
                        {alreadyInList ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                      <div className="flex items-center gap-2 flex-1">
                        <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium capitalize text-gray-900 dark:text-gray-100">{item.name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Current: {item.current} {item.unit}
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDismissRecommendation(item.id)}
                      className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors flex-shrink-0 ml-2"
                      title="Dismiss recommendation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {!alreadyInList && (
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="number"
                        min={1}
                        value={recommendedQuantities[item.id] ?? item.threshold}
                        onChange={(e) =>
                          updateRecommendedQuantity(item.id, parseInt(e.target.value) || 1)
                        }
                        className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{item.unit}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">Add Shopping Item</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 relative" ref={suggestionsRef}>
                <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Ingredient</label>
                <input
                  type="text"
                  required
                  value={ingredientQuery}
                  onChange={(e) => handleIngredientInputChange(e.target.value)}
                  onFocus={() => ingredientSuggestions.length > 0 && setShowSuggestions(true)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Type to search ingredients..."
                  autoComplete="off"
                />
                {searchingIngredients && (
                  <div className="absolute right-3 top-9 text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                )}
                {showSuggestions && ingredientSuggestions.length > 0 && (
                  <ul className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg py-1">
                    {ingredientSuggestions.map((ing) => (
                      <li key={ing.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectIngredient(ing)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 flex justify-between items-center"
                        >
                          <span className="capitalize">{ing.name}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{ing.category}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {ingredientQuery.trim() && !searchingIngredients && ingredientSuggestions.length === 0 && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">No matching ingredients. Type to search.</p>
                )}
              </div>

              <div>
                <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Quantity</label>
                <input
                  type="number"
                  required
                  min={0.001}
                  step="any"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      quantity: parseFloat(e.target.value) || 1,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Unit</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
                  disabled={!selectedIngredient}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-60"
                >
                  {!selectedIngredient ? (
                    <option value="">Select an ingredient first</option>
                  ) : (
                    (selectedIngredient.allowedUnits && selectedIngredient.allowedUnits.length > 0
                      ? selectedIngredient.allowedUnits
                      : [selectedIngredient.unit]
                    ).map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Category</label>
                <div className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300">
                  {selectedIngredient ? formData.category || "—" : "—"}
                </div>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">From ingredient</p>
              </div>

              <div className="md:col-span-3 flex items-end gap-2">
                <button
                  type="submit"
                  disabled={isAdding || !selectedIngredient || !formData.unit}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isAdding && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetAddForm(); }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="space-y-6">
        {/* Unchecked */}
        {uncheckedItems.length > 0 && (
          <div>
            <h3 className="mb-3 text-gray-700 dark:text-gray-300 font-semibold">To Buy</h3>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
              {uncheckedItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <button
                      onClick={() => handleToggle(item.id)}
                      className="text-gray-400 hover:text-green-600 transition-colors"
                    >
                      <Circle className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                      <p className="capitalize text-gray-900 dark:text-gray-100">{item.name}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {item.quantity} {item.unit} • {item.category}
                        </p>
                        {item.fromRecommendations && (
                          <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded">
                            Recommended
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors ml-2"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Checked - not editable; quantity already added to inventory */}
        {checkedItems.length > 0 && (
          <div>
            <h3 className="mb-3 text-gray-500 dark:text-gray-400 font-semibold">Checked Off</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              These amounts have been added to your inventory. Remove to clear from this list.
            </p>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700 opacity-75">
              {checkedItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="text-green-600 cursor-default" title="Purchased — amount added to inventory">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="capitalize text-gray-500 dark:text-gray-400 line-through">{item.name}</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500">
                        {item.quantity} {item.unit} • {item.category}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors ml-2"
                    title="Remove from checked list"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty */}
        {shoppingList.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <ShoppingCart className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">Your shopping list is empty</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {lowStockItems.length > 0
                ? "Add recommended items above or create your own"
                : "Add items to keep track of what you need to buy"}
            </p>
          </div>
        )}
      </div>

      {/* Mobile FAB (Floating Action Button) */}
      <button
        onClick={() => { if (!showForm) resetAddForm(); setShowForm((v) => !v); }}
        className="md:hidden fixed bottom-20 right-4 z-40 w-14 h-14 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center"
        aria-label="Add Item"
      >
        <Plus className={`w-6 h-6 transition-transform ${showForm ? "rotate-45" : ""}`} />
      </button>
    </div>
  );
}
