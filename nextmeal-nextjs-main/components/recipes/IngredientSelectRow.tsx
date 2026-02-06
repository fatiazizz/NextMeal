"use client";

import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import type { SystemIngredient } from "@/types";
import { ingredientsApi } from "@/utils/api";

type IngredientSelectRowProps = {
  value: {
    ingredientId: string;
    ingredientName: string;
    quantity: number;
    unit: string;
    allowedUnits: string[];
  } | null;
  onChange: (value: {
    ingredientId: string;
    ingredientName: string;
    quantity: number;
    unit: string;
    allowedUnits: string[];
  } | null) => void;
  onRemove: () => void;
  canRemove: boolean;
  placeholder?: string;
  disabled?: boolean;
};

export function IngredientSelectRow({
  value,
  onChange,
  onRemove,
  canRemove,
  placeholder = "Search ingredient...",
  disabled = false,
}: IngredientSelectRowProps) {
  const [query, setQuery] = useState(value?.ingredientName ?? "");
  const [suggestions, setSuggestions] = useState<SystemIngredient[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value?.ingredientName) setQuery(value.ingredientName);
  }, [value?.ingredientName]);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const list = await ingredientsApi.search(query);
        setSuggestions(list);
        setOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectIngredient = (ing: SystemIngredient) => {
    const allowed = ing.allowedUnits && ing.allowedUnits.length > 0 ? ing.allowedUnits : [ing.unit];
    onChange({
      ingredientId: ing.id,
      ingredientName: ing.name,
      quantity: 1,
      unit: allowed[0] ?? ing.unit,
      allowedUnits: allowed,
    });
    setQuery(ing.name);
    setOpen(false);
    setSuggestions([]);
  };

  const displayValue = value ?? null;
  const units = displayValue?.allowedUnits ?? [];

  return (
    <div ref={containerRef} className="flex flex-wrap items-start gap-2">
      <div className="flex-1 min-w-[180px] relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setSuggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
        {open && suggestions.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg py-1">
            {loading && (
              <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Searching...</li>
            )}
            {!loading &&
              suggestions.map((ing) => (
                <li
                  key={ing.id}
                  role="option"
                  onClick={() => selectIngredient(ing)}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-green-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  {ing.name}
                  {ing.category && (
                    <span className="ml-2 text-gray-500 dark:text-gray-400 text-xs">
                      ({ing.category})
                    </span>
                  )}
                </li>
              ))}
          </ul>
        )}
      </div>
      {displayValue && (
        <>
          <input
            type="number"
            min={0}
            step="any"
            value={displayValue.quantity}
            onChange={(e) =>
              onChange({
                ...displayValue,
                quantity: parseFloat(e.target.value) || 0,
              })
            }
            disabled={disabled}
            className="w-20 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="Qty"
          />
          <select
            value={displayValue.unit}
            onChange={(e) =>
              onChange({
                ...displayValue,
                unit: e.target.value,
              })
            }
            disabled={disabled}
            className="px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-w-[70px]"
          >
            {units.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </>
      )}
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
          aria-label="Remove ingredient"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
