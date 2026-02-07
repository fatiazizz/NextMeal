"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import AppHeader from "./AppHeader";
import MobileHeader from "./MobileHeader";
import MobileBottomNav from "./MobileBottomNav";
import MobileDrawerMenu from "./MobileDrawerMenu";
import { InstallPrompt, UpdatePrompt, OfflineIndicator } from "@/components/pwa";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const isLoginPage = pathname === "/login";
  const isForgotPasswordPage = pathname === "/forgot-password";
  const isPasswordResetPage = pathname?.startsWith("/password-reset/");
  const isHomePage = pathname === "/";
  const isOfflinePage = pathname === "/offline";

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  const handleMobileMenuClose = () => {
    setIsMobileMenuOpen(false);
  };

  // For login, forgot-password, password-reset, home, and offline pages, render without header and full screen
  if (isLoginPage || isForgotPasswordPage || isPasswordResetPage || isHomePage || isOfflinePage) {
    return (
      <>
        <OfflineIndicator />
        <UpdatePrompt />
        <InstallPrompt />
        {children}
      </>
    );
  }

  // For other pages, render with header and container
  return (
    <>
      <OfflineIndicator />
      <UpdatePrompt />
      <InstallPrompt />
      
      {/* Desktop Header */}
      <AppHeader />
      
      {/* Mobile Header */}
      <MobileHeader 
        isMenuOpen={isMobileMenuOpen} 
        onMenuToggle={handleMobileMenuToggle} 
      />
      
      {/* Mobile Drawer Menu */}
      <MobileDrawerMenu 
        isOpen={isMobileMenuOpen} 
        onClose={handleMobileMenuClose} 
      />
      
      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6 md:pt-6 pt-20 pb-24 md:pb-6">
        {children}
      </main>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </>
  );
}
