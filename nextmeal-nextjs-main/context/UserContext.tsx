"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import type { User, UserRole, RecipePermission } from "@/types";
import { SYSTEM_USER_ID } from "@/types";

const CURRENT_USER_KEY = "nextmeal_current_user";
const TOKEN_KEY = "nextmeal_auth_token";

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type UserContextValue = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Auth actions
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; email?: string }) => Promise<User>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ message: string }>;

  // Role checks
  isAdmin: boolean;
  isSystemUser: boolean;
  hasRole: (role: UserRole) => boolean;

  // Recipe permissions
  canEditRecipe: (ownerUserId: string) => boolean;
  canDeleteRecipe: (ownerUserId: string) => boolean;
  getRecipePermissions: (ownerUserId: string) => RecipePermission;
};

const UserContext = createContext<UserContextValue | null>(null);

// Helper functions
function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function setAuthToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

function removeAuthToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "An error occurred" }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text);
}

// System user ID is imported from types

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = readJSON<User | null>(CURRENT_USER_KEY, null);
    if (storedUser) {
      setUser(storedUser);
      // Verify token is still valid
      verifyAuth();
    }
    setIsLoading(false);
  }, []);

  // Verify authentication with backend
  const verifyAuth = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      return;
    }

    try {
      const data = await apiRequest<{ user: User }>("/me");
      setUser(data.user);
      writeJSON(CURRENT_USER_KEY, data.user);
    } catch {
      // Token is invalid
      setUser(null);
      removeAuthToken();
      if (typeof window !== "undefined") {
        localStorage.removeItem(CURRENT_USER_KEY);
      }
    }
  }, []);

  // Login
  const login = useCallback(async (email: string, password: string): Promise<User> => {
    if (!email.trim() || !password.trim()) {
      throw new Error("Email and password are required");
    }

    const data = await apiRequest<{ user: User; token: string }>("/login", {
      method: "POST",
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
      }),
    });

    setAuthToken(data.token);
    setUser(data.user);
    writeJSON(CURRENT_USER_KEY, data.user);
    return data.user;
  }, []);

  // Register
  const register = useCallback(async (name: string, email: string, password: string): Promise<User> => {
    if (!email.trim() || !password.trim()) {
      throw new Error("Email and password are required");
    }

    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    const data = await apiRequest<{ user: User; token: string }>("/register", {
      method: "POST",
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      }),
    });

    setAuthToken(data.token);
    setUser(data.user);
    writeJSON(CURRENT_USER_KEY, data.user);
    return data.user;
  }, []);

  // Logout
  const logout = useCallback(async () => {
    const token = getAuthToken();
    if (token) {
      try {
        await apiRequest("/logout", { method: "POST" });
      } catch {
        // Ignore logout errors
      }
    }
    setUser(null);
    removeAuthToken();
    if (typeof window !== "undefined") {
      localStorage.removeItem(CURRENT_USER_KEY);
      // Signal explicit logout so InventoryContext clears user data (and doesn't clear on verifyAuth failure)
      window.dispatchEvent(new CustomEvent("nextmeal-logout"));
    }
  }, []);

  // Update profile
  const updateProfile = useCallback(async (data: { name?: string; email?: string }): Promise<User> => {
    const response = await apiRequest<{ user: User }>("/profile", {
      method: "PUT",
      body: JSON.stringify({
        name: data.name?.trim(),
        email: data.email?.trim().toLowerCase(),
      }),
    });

    setUser(response.user);
    writeJSON(CURRENT_USER_KEY, response.user);
    return response.user;
  }, []);

  // Change password
  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<void> => {
    if (!newPassword.trim() || newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters");
    }

    await apiRequest("/change-password", {
      method: "POST",
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
  }, []);

  // Request password reset
  const requestPasswordReset = useCallback(async (email: string): Promise<{ message: string }> => {
    try {
      await apiRequest("/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
    } catch {
      // Don't reveal if email exists
    }
    return { message: "If an account exists with this email, a password reset link has been sent." };
  }, []);

  // Role checks
  const isAdmin = useMemo(() => user?.role === "admin", [user]);
  const isSystemUser = useMemo(() => user?.id === SYSTEM_USER_ID, [user]);

  const hasRole = useCallback((role: UserRole): boolean => {
    return user?.role === role;
  }, [user]);

  // Recipe permission checks
  const canEditRecipe = useCallback((ownerUserId: string): boolean => {
    if (!user) return false;
    // Admin can edit all recipes
    if (user.role === "admin") return true;
    // User can only edit their own recipes
    return user.id === ownerUserId;
  }, [user]);

  const canDeleteRecipe = useCallback((ownerUserId: string): boolean => {
    if (!user) return false;
    // Admin can delete their own recipes and system recipes
    if (user.role === "admin") {
      return user.id === ownerUserId || ownerUserId === SYSTEM_USER_ID;
    }
    // User can only delete their own recipes
    return user.id === ownerUserId;
  }, [user]);

  const getRecipePermissions = useCallback((ownerUserId: string): RecipePermission => {
    return {
      canEdit: canEditRecipe(ownerUserId),
      canDelete: canDeleteRecipe(ownerUserId),
    };
  }, [canEditRecipe, canDeleteRecipe]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
      requestPasswordReset,
      isAdmin,
      isSystemUser,
      hasRole,
      canEditRecipe,
      canDeleteRecipe,
      getRecipePermissions,
    }),
    [
      user,
      isLoading,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
      requestPasswordReset,
      isAdmin,
      isSystemUser,
      hasRole,
      canEditRecipe,
      canDeleteRecipe,
      getRecipePermissions,
    ]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used inside UserProvider");
  }
  return ctx;
}
