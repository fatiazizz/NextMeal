"use client";

import { useState } from "react";
import { useUser } from "@/context/UserContext";
import { User, Mail, Save, Check, Lock, Key, Sun, Moon, Hash, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";

export default function ProfilePage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const {
    user,
    isLoading,
    isAuthenticated,
    updateProfile,
    changePassword,
    requestPasswordReset,
    isAdmin,
  } = useUser();

  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });

  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");

  // Redirect if not authenticated
  if (!isLoading && !isAuthenticated) {
    router.replace("/login");
    return null;
  }

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile({
        name: formData.name,
        email: formData.email,
      });

      setIsEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to update profile:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({ name: user.name, email: user.email });
    setIsEditing(false);
  };

  const handlePasswordReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    try {
      await changePassword(passwordFormData.currentPassword, passwordFormData.newPassword);
      setPasswordSuccess("Password changed successfully!");
      setPasswordFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPasswordReset(false);
      setTimeout(() => setPasswordSuccess(""), 3000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    try {
      const result = await requestPasswordReset(forgotPasswordEmail);
      setPasswordSuccess(result.message);
      setForgotPasswordEmail("");
      setTimeout(() => {
        setShowForgotPassword(false);
        setPasswordSuccess("");
      }, 3000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to send reset link");
    }
  };

  return (
    <div className="w-full mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <User className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-purple-700 dark:text-purple-400">Profile</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your account settings</p>
          </div>
        </div>
      </div>

      {saved && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-2 text-green-700 dark:text-green-400">
          <Check className="w-5 h-5" />
          <span>Profile updated successfully!</span>
        </div>
      )}

      {passwordSuccess && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-2 text-green-700 dark:text-green-400">
          <Check className="w-5 h-5" />
          <span>{passwordSuccess}</span>
        </div>
      )}

      {passwordError && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-2 text-red-700 dark:text-red-400">
          <span>{passwordError}</span>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-gray-900 dark:text-gray-100 font-semibold">{user.name}</h3>
                {isAdmin && (
                  <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs rounded-full flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Admin
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-gray-900 dark:text-gray-100 font-semibold">Profile Information</h3>
            {!isEditing && (
              <button
                onClick={() => {
                  setFormData({ name: user.name, email: user.email });
                  setIsEditing(true);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4" />
                    <span>Name</span>
                  </div>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-4 h-4" />
                    <span>Email</span>
                  </div>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="your@email.com"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {/* User ID */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Hash className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">User ID</p>
                </div>
                <p className="text-gray-900 dark:text-gray-100 font-mono text-sm">{user.id}</p>
              </div>

              {/* Name */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                </div>
                <p className="text-gray-900 dark:text-gray-100">{user.name}</p>
              </div>

              {/* Email */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                </div>
                <p className="text-gray-900 dark:text-gray-100">{user.email}</p>
              </div>

              {/* Role */}
              {user.role && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">Role</p>
                  </div>
                  <p className="text-gray-900 dark:text-gray-100 capitalize">{user.role}</p>
                </div>
              )}

              {/* Password */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">Password</p>
                    </div>
                    <p className="text-gray-900 dark:text-gray-100">••••••••</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowPasswordReset(true)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Reset Password
                    </button>
                    <button
                      onClick={() => setShowForgotPassword(true)}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-sm"
                    >
                      Forgot Password
                    </button>
                  </div>
                </div>
              </div>

              {/* Theme */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {theme === "dark" ? (
                        <Moon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      ) : (
                        <Sun className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      )}
                      <p className="text-sm text-gray-600 dark:text-gray-400">Theme</p>
                    </div>
                    <p className="text-gray-900 dark:text-gray-100 capitalize">{theme} mode</p>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-sm flex items-center gap-2"
                  >
                    {theme === "dark" ? (
                      <>
                        <Sun className="w-4 h-4" />
                        <span>Light Mode</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-4 h-4" />
                        <span>Dark Mode</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Password Reset Modal */}
      {showPasswordReset && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Reset Password</h3>
            <button
              onClick={() => {
                setShowPasswordReset(false);
                setPasswordFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
                setPasswordError("");
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <span className="text-2xl">&times;</span>
            </button>
          </div>

          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div>
              <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Current Password</label>
              <input
                type="password"
                required
                value={passwordFormData.currentPassword}
                onChange={(e) =>
                  setPasswordFormData({ ...passwordFormData, currentPassword: e.target.value })
                }
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">New Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={passwordFormData.newPassword}
                onChange={(e) =>
                  setPasswordFormData({ ...passwordFormData, newPassword: e.target.value })
                }
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={passwordFormData.confirmPassword}
                onChange={(e) =>
                  setPasswordFormData({ ...passwordFormData, confirmPassword: e.target.value })
                }
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Key className="w-4 h-4" />
                Change Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordReset(false);
                  setPasswordFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
                  setPasswordError("");
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Forgot Password</h3>
            <button
              onClick={() => {
                setShowForgotPassword(false);
                setForgotPasswordEmail("");
                setPasswordError("");
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <span className="text-2xl">&times;</span>
            </button>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Enter your email address and we'll send you a link to reset your password.
          </p>

          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Email</label>
              <input
                type="email"
                required
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="your@email.com"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Send Reset Link
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotPasswordEmail("");
                  setPasswordError("");
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h4 className="text-blue-900 dark:text-blue-200 mb-2 font-semibold">About NextMeal</h4>
        <p className="text-sm text-blue-800 dark:text-blue-300 mb-2">
          NextMeal helps you reduce food waste by suggesting meals based on ingredients that are about to expire.
        </p>
        <p className="text-sm text-blue-800 dark:text-blue-300">
          Your data is synced with the server for a seamless experience across devices.
        </p>
      </div>
    </div>
  );
}
