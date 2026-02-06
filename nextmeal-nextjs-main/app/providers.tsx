"use client";

import { InventoryProvider } from "@/context/InventoryContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { UserProvider } from "@/context/UserContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <UserProvider>
        <NotificationProvider>
          <InventoryProvider>{children}</InventoryProvider>
        </NotificationProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
