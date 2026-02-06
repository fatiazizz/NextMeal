// Re-export types from UserContext for backwards compatibility
// Note: Prefer using useUser() hook from @/context/UserContext for new code

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role?: "system" | "admin" | "user";
};

const CURRENT_USER_KEY = "nextmeal_current_user";
const TOKEN_KEY = "nextmeal_auth_token";

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// --- helpers ---
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

// API request helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
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

// --- current user ---
export function getCurrentUser(): CurrentUser | null {
  if (typeof window === "undefined") return null;
  return readJSON<CurrentUser | null>(CURRENT_USER_KEY, null);
}

export function setCurrentUser(user: CurrentUser) {
  writeJSON(CURRENT_USER_KEY, user);
}

export function logout() {
  if (typeof window === "undefined") return;
  const token = getAuthToken();
  if (token) {
    apiRequest("/logout", { method: "POST" }).catch(() => {
      // Ignore errors on logout
    });
  }
  localStorage.removeItem(CURRENT_USER_KEY);
  removeAuthToken();
}

// --- auth actions ---
export async function register(name: string, email: string, password: string): Promise<CurrentUser> {
  if (!email.trim() || !password.trim()) {
    throw new Error("Email and password are required");
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const data = await apiRequest<{ user: CurrentUser; token: string }>("/register", {
    method: "POST",
    body: JSON.stringify({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    }),
  });

  setAuthToken(data.token);
  setCurrentUser(data.user);
  return data.user;
}

export async function login(email: string, password: string): Promise<CurrentUser> {
  if (!email.trim() || !password.trim()) {
    throw new Error("Email and password are required");
  }

  const data = await apiRequest<{ user: CurrentUser; token: string }>("/login", {
    method: "POST",
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
    }),
  });

  setAuthToken(data.token);
  setCurrentUser(data.user);
  return data.user;
}

export async function updateUserProfile(userId: string, patch: Pick<CurrentUser, "name" | "email">): Promise<CurrentUser> {
  const current = getCurrentUser();
  if (!current) throw new Error("No user");
  if (current.id !== userId) throw new Error("User mismatch");

  const data = await apiRequest<{ user: CurrentUser }>("/profile", {
    method: "PUT",
    body: JSON.stringify({
      name: patch.name.trim(),
      email: patch.email.trim().toLowerCase(),
    }),
  });
  
  setCurrentUser(data.user);
  return data.user;
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const current = getCurrentUser();
  if (!current) throw new Error("No user");
  if (current.id !== userId) throw new Error("User mismatch");

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
}

export async function requestPasswordReset(email: string) {
  try {
    await apiRequest("/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
  } catch {
    // Don't reveal if email exists
  }
  return { success: true, message: "If an account exists with this email, a password reset link has been sent." };
}

export async function resetPassword(email: string, token: string, newPassword: string) {
  if (!newPassword.trim() || newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  await apiRequest("/reset-password", {
    method: "POST",
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      token,
      password: newPassword,
      password_confirmation: newPassword,
    }),
  });
  
  return { success: true, message: "Password has been reset successfully" };
}

// Verify token and refresh user data
export async function verifyAuth(): Promise<CurrentUser | null> {
  const token = getAuthToken();
  if (!token) {
    return null;
  }

  try {
    const data = await apiRequest<{ user: CurrentUser }>("/me");
    setCurrentUser(data.user);
    return data.user;
  } catch {
    removeAuthToken();
    if (typeof window !== "undefined") {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
    return null;
  }
}
