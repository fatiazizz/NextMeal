"use client";

import { RefreshCw, X } from "lucide-react";
import { usePWA } from "@/hooks/usePWA";
import { useState } from "react";

export function UpdatePrompt() {
  const { isUpdateAvailable, updateApp } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  if (!isUpdateAvailable || dismissed) return null;

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
      <div className="bg-blue-600 text-white rounded-xl shadow-2xl p-4 flex items-center gap-4">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
          <RefreshCw className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="font-medium">Update Available</p>
          <p className="text-sm text-blue-100">A new version of NextMeal is ready!</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={updateApp}
            className="px-4 py-2 bg-white text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors"
          >
            Update
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
