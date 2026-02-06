"use client";

import Link from "next/link";
import { ChefHat, Menu, X } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { useUser } from "@/context/UserContext";

interface MobileHeaderProps {
  isMenuOpen: boolean;
  onMenuToggle: () => void;
}

export default function MobileHeader({ isMenuOpen, onMenuToggle }: MobileHeaderProps) {
  const { user, isAuthenticated } = useUser();

  if (!isAuthenticated || !user) return null;

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 safe-area-top">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Hamburger Menu Button */}
        <button
          onClick={onMenuToggle}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95"
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMenuOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>

        {/* Logo */}
        <Link href="/meals" className="flex items-center gap-2">
          <ChefHat className="w-7 h-7 text-green-600" />
          <span className="font-bold text-lg text-gray-900 dark:text-gray-100">NextMeal</span>
        </Link>

        {/* Notification Bell */}
        <div className="flex items-center">
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
