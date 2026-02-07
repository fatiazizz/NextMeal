"use client";

import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from "react";
import type { Notification, NotificationType, NotificationSeverity } from "@/types";
import { notificationsApi } from "@/utils/api";

type NotificationContextValue = {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  addNotification: (notification: Omit<Notification, "id" | "sentAt">) => void;
  appendServerNotification: (notification: Notification) => void;
  refreshNotifications: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

const NOTIFICATIONS_KEY = "nextmeal_notifications";

function readNotifications(): Notification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeNotifications(notifications: Notification[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [useApiMode, setUseApiMode] = useState(true);

  // Load notifications on mount
  useEffect(() => {
    refreshNotifications();
  }, []);

  // Save to localStorage whenever notifications change (for fallback)
  useEffect(() => {
    if (!useApiMode) {
      writeNotifications(notifications);
    }
  }, [notifications, useApiMode]);

  const refreshNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await notificationsApi.getAll();
      setNotifications((prev) => {
        const fromApi = data;
        const recentLocalInfo = prev.filter(
          (n) =>
            n.notificationType === "info" &&
            n.sentAt &&
            Date.now() - new Date(n.sentAt).getTime() < 60_000
        );
        return [...fromApi, ...recentLocalInfo];
      });
      setUseApiMode(true);
    } catch (error) {
      console.warn("Notifications API unavailable, using localStorage:", error);
      const stored = readNotifications();
      setNotifications(stored);
      setUseApiMode(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const appendServerNotification = useCallback((notification: Notification) => {
    setNotifications((prev) => {
      if (prev.some((n) => n.id === notification.id)) return prev;
      return [notification, ...prev];
    });
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead && n.isActive).length,
    [notifications]
  );

  const markAsRead = useCallback(async (id: string) => {
    if (useApiMode) {
      try {
        await notificationsApi.markAsRead(id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
          )
        );
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
        // Fallback to local
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
          )
        );
      }
    } else {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
        )
      );
    }
  }, [useApiMode]);

  const markAllAsRead = useCallback(async () => {
    if (useApiMode) {
      try {
        await notificationsApi.markAllAsRead();
        setNotifications((prev) =>
          prev.map((n) =>
            !n.isRead && n.isActive
              ? { ...n, isRead: true, readAt: new Date().toISOString() }
              : n
          )
        );
      } catch (error) {
        console.error("Failed to mark all as read:", error);
        // Fallback
        setNotifications((prev) =>
          prev.map((n) =>
            !n.isRead && n.isActive
              ? { ...n, isRead: true, readAt: new Date().toISOString() }
              : n
          )
        );
      }
    } else {
      setNotifications((prev) =>
        prev.map((n) =>
          !n.isRead && n.isActive
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n
        )
      );
    }
  }, [useApiMode]);

  const deleteNotification = useCallback(async (id: string) => {
    if (useApiMode) {
      try {
        await notificationsApi.delete(id);
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      } catch (error) {
        console.error("Failed to delete notification:", error);
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }
    } else {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  }, [useApiMode]);

  const addNotification = useCallback((notification: Omit<Notification, "id" | "sentAt">) => {
    const newNotif: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sentAt: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotif, ...prev]);
  }, []);

  // Helper to create specific notification types
  const createExpirationNotification = useCallback((
    ingredientId: string,
    ingredientName: string,
    daysUntilExpiry: number,
    userId: string
  ) => {
    addNotification({
      userId,
      ingredientId,
      relatedInventoryId: ingredientId,
      notificationType: "expiration",
      severity: daysUntilExpiry === 0 ? "safety" : "normal",
      state: "active",
      isRead: false,
      payload: {
        message: `There is ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""} to expire of ${ingredientName}.`,
        ingredientName,
        daysUntilExpiry,
      },
      isActive: true,
    });
  }, [addNotification]);

  const createLowStockNotification = useCallback((
    ingredientId: string,
    ingredientName: string,
    currentQuantity: number,
    threshold: number,
    userId: string
  ) => {
    addNotification({
      userId,
      ingredientId,
      relatedInventoryId: ingredientId,
      notificationType: "low_stock",
      severity: "normal",
      state: "active",
      isRead: false,
      payload: {
        message: `You are going to run out of ${ingredientName}.`,
        ingredientName,
        currentQuantity,
        threshold,
      },
      isActive: true,
    });
  }, [addNotification]);

  const createInfoNotification = useCallback((message: string, userId: string = "current") => {
    addNotification({
      userId,
      notificationType: "info",
      severity: "normal",
      state: "active",
      isRead: false,
      payload: { message },
      isActive: true,
    });
  }, [addNotification]);

  const value = useMemo(
    () => ({
      notifications: notifications.filter((n) => n.isActive),
      unreadCount,
      isLoading,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      addNotification,
      appendServerNotification,
      refreshNotifications,
    }),
    [
      notifications,
      unreadCount,
      isLoading,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      addNotification,
      appendServerNotification,
      refreshNotifications,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used inside NotificationProvider");
  }
  return ctx;
}
