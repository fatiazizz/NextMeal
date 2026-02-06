"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { ChefHat, Mail, Lock, User, ArrowRight, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, login, register } = useUser();

  const [isLogin, setIsLogin] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/meals");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        if (!formData.name.trim()) {
          setError("Name is required");
          setIsSubmitting(false);
          return;
        }
        await register(formData.name, formData.email, formData.password);
      }

      router.push("/meals");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsSubmitting(false);
    }
  };

  const switchMode = (mode: boolean) => {
    setIsLogin(mode);
    setError("");
    setFormData({ name: "", email: "", password: "" });
  };

  // Show loading while checking auth state
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-green-600 to-emerald-600">
        <div className="text-white text-center">
          <ChefHat className="w-16 h-16 mx-auto mb-4 animate-pulse" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full flex overflow-hidden">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-600 via-green-500 to-emerald-600 relative overflow-hidden h-full">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxLjUiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
        
        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12 w-full">
          <div className="mb-8 transform hover:scale-110 transition-transform duration-300">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full"></div>
              <ChefHat className="w-24 h-24 relative z-10" />
            </div>
          </div>
          
          <h1 className="text-5xl font-bold mb-4 text-center">
            Welcome to <span className="text-red-300">NextMeal</span>
          </h1>
          <p className="text-xl text-green-50 text-center max-w-md mb-8">
            Reduce food waste and simplify your meal planning with smart recommendations
          </p>
          
          <div className="flex flex-col gap-4 mt-8 w-full max-w-sm">
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <Sparkles className="w-6 h-6 text-yellow-300" />
              <div>
                <p className="font-semibold">Smart Recommendations</p>
                <p className="text-sm text-green-50">Based on your inventory</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <ChefHat className="w-6 h-6 text-yellow-300" />
              <div>
                <p className="font-semibold">Waste Reduction</p>
                <p className="text-sm text-green-50">Use ingredients before expiry</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-gray-50 via-white to-green-50 h-full overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-green-100 blur-xl rounded-full"></div>
                <ChefHat className="w-16 h-16 text-green-600 relative z-10" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">NextMeal</h1>
            <p className="text-gray-600">Reduce waste, simplify meal planning</p>
          </div>

          {/* Mode Toggle */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-2 mb-8 shadow-lg border border-gray-200/50">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => switchMode(true)}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                  isLogin
                    ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/30 scale-105"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode(false)}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                  !isLogin
                    ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/30 scale-105"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200/50 p-8 sm:p-10">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {isLogin ? "Welcome back" : "Create your account"}
              </h2>
              <p className="text-gray-600">
                {isLogin
                  ? "Sign in to continue to NextMeal"
                  : "Start your journey to reduce food waste"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      required={!isLogin}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all duration-200 bg-white text-gray-900 placeholder:text-gray-400"
                      placeholder="John Doe"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all duration-200 bg-white text-gray-900 placeholder:text-gray-400"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all duration-200 bg-white text-gray-900 placeholder:text-gray-400"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2 animate-shake">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>{isLogin ? "Sign In" : "Create Account"}</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {isLogin && (
              <div className="mt-6 text-center">
                <a
                  href="#"
                  className="text-sm text-green-600 hover:text-green-700 font-medium hover:underline transition-colors"
                >
                  Forgot your password?
                </a>
              </div>
            )}
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-gray-500">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => switchMode(!isLogin)}
              className="text-green-600 hover:text-green-700 font-semibold hover:underline transition-colors"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
