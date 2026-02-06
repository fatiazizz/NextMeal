"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { adminApi, type AdminStatistics } from "@/utils/api";
import {
  Users,
  ChefHat,
  Package,
  ShoppingCart,
  Bell,
  TrendingUp,
  Shield,
  ArrowRight,
  Settings,
} from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAdmin } = useUser();
  const [statistics, setStatistics] = useState<AdminStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/meals");
      return;
    }

    loadStatistics();
  }, [isAdmin, router]);

  const loadStatistics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const stats = await adminApi.getStatistics();
      setStatistics(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load statistics");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600 dark:text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-700 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!statistics) {
    return null;
  }

  const statCards = [
    {
      title: "Total Users",
      value: statistics.users.total,
      icon: Users,
      color: "bg-blue-500",
      link: "/admin/users",
      details: [
        { label: "Admins", value: statistics.users.admins },
        { label: "Users", value: statistics.users.regular_users },
        { label: "New Today", value: statistics.users.new_today },
      ],
    },
    {
      title: "Recipes",
      value: statistics.recipes.total,
      icon: ChefHat,
      color: "bg-green-500",
      link: "/admin/recipes",
      details: [
        { label: "System", value: statistics.recipes.system_recipes },
        { label: "User Created", value: statistics.recipes.user_recipes },
        { label: "New Today", value: statistics.recipes.new_today },
      ],
    },
    {
      title: "Ingredients",
      value: statistics.ingredients.total,
      icon: Package,
      color: "bg-purple-500",
      link: "/admin/ingredients",
      details: [
        { label: "In Use", value: statistics.ingredients.in_use },
      ],
    },
    {
      title: "Inventory Items",
      value: statistics.inventory.total_items,
      icon: Package,
      color: "bg-orange-500",
      link: "/inventory",
      details: [
        { label: "Low Stock", value: statistics.inventory.low_stock_items },
      ],
    },
    {
      title: "Shopping Lists",
      value: statistics.shopping_lists.total_items,
      icon: ShoppingCart,
      color: "bg-pink-500",
      link: "/shopping",
      details: [
        { label: "Checked", value: statistics.shopping_lists.checked_items },
      ],
    },
    {
      title: "Notifications",
      value: statistics.notifications.total,
      icon: Bell,
      color: "bg-yellow-500",
      link: "/admin",
      details: [
        { label: "Unread", value: statistics.notifications.unread },
        { label: "Active", value: statistics.notifications.active },
      ],
    },
  ];

  return (
    <div className="w-full mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Shield className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-purple-700 dark:text-purple-400">Admin Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your NextMeal platform</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => card.link && router.push(card.link)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 ${card.color} rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                {card.link && (
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
                {card.title}
              </h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                {card.value.toLocaleString()}
              </p>
              <div className="space-y-1">
                {card.details.map((detail, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{detail.label}:</span>
                    <span className="text-gray-900 dark:text-gray-100 font-semibold">
                      {detail.value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Quick Actions
          </h3>
          <div className="space-y-2">
            <button
              onClick={() => router.push("/admin/users")}
              className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center gap-3"
            >
              <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="text-gray-900 dark:text-gray-100">Manage Users</span>
            </button>
            <button
              onClick={() => router.push("/admin/recipes")}
              className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center gap-3"
            >
              <ChefHat className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="text-gray-900 dark:text-gray-100">Manage Recipes</span>
            </button>
            <button
              onClick={() => router.push("/admin/ingredients")}
              className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center gap-3"
            >
              <Package className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="text-gray-900 dark:text-gray-100">Manage Ingredients</span>
            </button>
            <button
              onClick={() => router.push("/admin/settings")}
              className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center gap-3"
            >
              <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="text-gray-900 dark:text-gray-100">Settings</span>
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            System Overview
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Platform Status</span>
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                Active
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total Resources</span>
              <span className="text-gray-900 dark:text-gray-100 font-semibold">
                {(statistics.recipes.total + statistics.ingredients.total + statistics.inventory.total_items).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Active Users</span>
              <span className="text-gray-900 dark:text-gray-100 font-semibold">
                {statistics.users.regular_users.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
