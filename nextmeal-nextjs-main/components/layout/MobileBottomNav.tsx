"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChefHat, Package, Heart, ShoppingCart, User } from "lucide-react";
import { useUser } from "@/context/UserContext";

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}

function NavItem({ href, label, icon, active }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center flex-1 py-2 transition-all ${
        active
          ? "text-green-600 dark:text-green-500"
          : "text-gray-500 dark:text-gray-400"
      }`}
    >
      <div
        className={`flex items-center justify-center w-10 h-10 rounded-2xl transition-all ${
          active
            ? "bg-green-100 dark:bg-green-900/40 scale-110"
            : "hover:bg-gray-100 dark:hover:bg-gray-800"
        }`}
      >
        {icon}
      </div>
      <span className={`text-[10px] mt-1 font-medium ${active ? "font-semibold" : ""}`}>
        {label}
      </span>
    </Link>
  );
}

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useUser();

  if (!isAuthenticated || !user) return null;

  // Hide on login/home/offline pages
  if (pathname === "/login" || pathname === "/" || pathname === "/offline") {
    return null;
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        <NavItem
          href="/meals"
          label="Meals"
          icon={<ChefHat className={`w-5 h-5 ${pathname === "/meals" || pathname.startsWith("/recipe") ? "stroke-[2.5]" : ""}`} />}
          active={pathname === "/meals" || pathname.startsWith("/recipe")}
        />
        <NavItem
          href="/inventory"
          label="Inventory"
          icon={<Package className={`w-5 h-5 ${pathname === "/inventory" ? "stroke-[2.5]" : ""}`} />}
          active={pathname === "/inventory"}
        />
        <NavItem
          href="/shopping"
          label="Shopping"
          icon={<ShoppingCart className={`w-5 h-5 ${pathname === "/shopping" ? "stroke-[2.5]" : ""}`} />}
          active={pathname === "/shopping"}
        />
        <NavItem
          href="/favorites"
          label="Favorites"
          icon={<Heart className={`w-5 h-5 ${pathname === "/favorites" ? "stroke-[2.5]" : ""}`} />}
          active={pathname === "/favorites"}
        />
        <NavItem
          href="/profile"
          label="Profile"
          icon={<User className={`w-5 h-5 ${pathname === "/profile" ? "stroke-[2.5]" : ""}`} />}
          active={pathname === "/profile"}
        />
      </div>
    </nav>
  );
}
