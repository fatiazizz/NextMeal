"use client";

import { WifiOff, RefreshCw, Home } from "lucide-react";

export default function OfflinePage() {
  const handleRefresh = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="text-center max-w-md">
        {/* Animated Icon */}
        <div className="relative mb-8">
          <div className="w-24 h-24 mx-auto bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center animate-pulse">
            <WifiOff className="w-12 h-12 text-orange-500" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">!</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          You&apos;re Offline
        </h1>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
          It looks like you&apos;ve lost your internet connection. Don&apos;t worry, 
          you can still access your saved recipes and meal plans offline.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 active:scale-95"
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>

          <button
            onClick={handleGoHome}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-900 dark:text-white font-medium rounded-xl border border-gray-200 dark:border-slate-600 transition-all duration-200 active:scale-95"
          >
            <Home className="w-5 h-5" />
            Go Home
          </button>
        </div>

        {/* Offline Tips */}
        <div className="mt-12 p-6 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 text-left">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            What you can do offline:
          </h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              View previously loaded recipes
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              Check your saved favorites
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              Browse your inventory list
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              Access your shopping list
            </li>
          </ul>
        </div>

        {/* Brand Footer */}
        <div className="mt-8 text-sm text-gray-400 dark:text-gray-500">
          <span className="font-semibold text-orange-500">NextMeal</span> • Smart Recipe & Meal Planner
        </div>
      </div>
    </div>
  );
}
