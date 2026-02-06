"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChefHat,
  Package,
  Heart,
  ShoppingCart,
  User,
  LogOut,
  Shield,
  X,
  Moon,
  Sun,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { useTheme } from "@/context/ThemeContext";

interface MobileDrawerMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItemProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick?: () => void;
}

function MenuItem({ href, label, icon, active, onClick }: MenuItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all ${
        active
          ? "bg-green-600 text-white"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
      }`}
    >
      {icon}
      <span className="text-base font-medium">{label}</span>
    </Link>
  );
}

export default function MobileDrawerMenu({ isOpen, onClose }: MobileDrawerMenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout, isAdmin } = useUser();
  const { isDark, toggleTheme } = useTheme();
  const previousPathname = useRef(pathname);

  // Close menu on route change (skip initial render)
  useEffect(() => {
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname;
      onClose();
    }
  }, [pathname, onClose]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  // Close menu on click outside (on backdrop only)
  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking directly on the backdrop
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleLogout = async () => {
    await logout();
    onClose();
    router.replace("/login");
    router.refresh();
  };

  if (!isAuthenticated || !user) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleBackdropClick}
        className={`md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`md:hidden fixed top-0 left-0 bottom-0 z-50 w-[280px] bg-white dark:bg-gray-900 shadow-2xl transform transition-transform duration-300 ease-out safe-area-left ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-gray-200 dark:border-gray-700 safe-area-top">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
              <span className="text-green-600 dark:text-green-500 font-bold text-lg">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                  {user.name}
                </span>
                {isAdmin && (
                  <Shield className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                )}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {user.email}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <MenuItem
            href="/meals"
            label="Meals"
            icon={<ChefHat className="w-5 h-5" />}
            active={pathname === "/meals" || pathname.startsWith("/recipe")}
            onClick={onClose}
          />
          <MenuItem
            href="/inventory"
            label="Inventory"
            icon={<Package className="w-5 h-5" />}
            active={pathname === "/inventory"}
            onClick={onClose}
          />
          <MenuItem
            href="/shopping"
            label="Shopping List"
            icon={<ShoppingCart className="w-5 h-5" />}
            active={pathname === "/shopping"}
            onClick={onClose}
          />
          <MenuItem
            href="/favorites"
            label="Favorites"
            icon={<Heart className="w-5 h-5" />}
            active={pathname === "/favorites"}
            onClick={onClose}
          />
          <MenuItem
            href="/profile"
            label="Profile"
            icon={<User className="w-5 h-5" />}
            active={pathname === "/profile"}
            onClick={onClose}
          />
          
          {isAdmin && (
            <>
              <div className="my-3 border-t border-gray-200 dark:border-gray-700" />
              <MenuItem
                href="/admin"
                label="Admin Panel"
                icon={<Shield className="w-5 h-5" />}
                active={pathname.startsWith("/admin")}
                onClick={onClose}
              />
            </>
          )}
        </nav>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-3 space-y-2 safe-area-bottom">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {isDark ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
            <span className="text-base font-medium">
              {isDark ? "Light Mode" : "Dark Mode"}
            </span>
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-base font-medium">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}
