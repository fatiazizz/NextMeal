"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChefHat, Package, Heart, ShoppingCart, User, LogOut, Shield } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { NotificationBell } from "./NotificationBell";

function NavItem({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
        active
          ? "bg-green-600 text-white"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
      }`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout, isAdmin } = useUser();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check if dark class is present on html element
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    
    // Initial check
    checkTheme();
    
    // Watch for changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
    router.refresh();
  };

  const hideHeader = pathname === "/login" || pathname === "/";
  if (hideHeader) return null;

  // If user is not logged in, don't show header
  if (!isAuthenticated || !user) return null;

  return (
    <header 
      className="hidden md:block sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 transition-colors"
      style={{ 
        backgroundColor: isDark ? '#111827' : '#ffffff'
      }}
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
        <Link href="/meals" className="flex items-center gap-2">
          <ChefHat className="w-7 h-7 text-green-600" />
          <span className="font-bold text-gray-900 dark:text-gray-100">NextMeal</span>
        </Link>

        <nav className="flex items-center gap-2 ml-4 overflow-x-auto">
          <NavItem
            href="/inventory"
            label="Inventory"
            icon={<Package className="w-4 h-4" />}
            active={pathname === "/inventory"}
          />
          <NavItem
            href="/meals"
            label="Meals"
            icon={<ChefHat className="w-4 h-4" />}
            active={pathname === "/meals" || pathname.startsWith("/recipe")}
          />
          <NavItem
            href="/shopping"
            label="Shopping"
            icon={<ShoppingCart className="w-4 h-4" />}
            active={pathname === "/shopping"}
          />
          <NavItem
            href="/favorites"
            label="Favorites"
            icon={<Heart className="w-4 h-4" />}
            active={pathname === "/favorites"}
          />
          <NavItem
            href="/profile"
            label="Profile"
            icon={<User className="w-4 h-4" />}
            active={pathname === "/profile"}
          />
          {isAdmin && (
            <NavItem
              href="/admin"
              label="Admin"
              icon={<Shield className="w-4 h-4" />}
              active={pathname.startsWith("/admin")}
            />
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden md:block text-right">
            <div className="flex items-center gap-1 justify-end">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-4">
                {user.name}
              </span>
              {isAdmin && (
                <Shield className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" aria-label="Admin" />
              )}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
          </div>

          <NotificationBell />

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
