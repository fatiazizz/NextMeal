"use client";

import { WifiOff } from "lucide-react";
import { usePWA } from "@/hooks/usePWA";

export function OfflineIndicator() {
  const { isOnline } = usePWA();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white py-2 px-4 text-center text-sm font-medium flex items-center justify-center gap-2">
      <WifiOff className="w-4 h-4" />
      <span>You are offline. Some features may be limited.</span>
    </div>
  );
}
