"use client";

import { useState, useEffect } from "react";
import { X, Download, Smartphone, Sparkles } from "lucide-react";
import { usePWA } from "@/hooks/usePWA";

export function InstallPrompt() {
  const { isInstallable, isInstalled, installApp } = usePWA();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOSDevice(isIOS);

    // Show prompt after delay if installable
    const timer = setTimeout(() => {
      const dismissed = localStorage.getItem("pwa-install-dismissed");
      const dismissedTime = dismissed ? parseInt(dismissed) : 0;
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

      // Show again after 7 days if dismissed
      if (!isInstalled && (isInstallable || isIOS) && daysSinceDismissed > 7) {
        setShowPrompt(true);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [isInstallable, isInstalled]);

  const handleInstall = async () => {
    if (isIOSDevice) {
      setShowIOSInstructions(true);
      return;
    }

    const success = await installApp();
    if (success) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
    setShowPrompt(false);
    setShowIOSInstructions(false);
  };

  if (!showPrompt || isInstalled) return null;

  return (
    <>
      {/* Install Prompt Banner */}
      <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Sparkles className="w-5 h-5" />
              <span className="font-semibold">Install NextMeal</span>
            </div>
            <button
              onClick={handleDismiss}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-7 h-7 text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  Install NextMeal on your device for quick access, offline support, and a native app experience!
                </p>
              </div>
            </div>

            {/* Install Button */}
            <button
              onClick={handleInstall}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 active:scale-[0.98]"
            >
              <Download className="w-5 h-5" />
              {isIOSDevice ? "How to Install" : "Install App"}
            </button>

            {/* Benefits */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                ✓ Works Offline
              </span>
              <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                ✓ Fast & Reliable
              </span>
              <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full">
                ✓ No App Store
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Install on iOS
                </h3>
                <button
                  onClick={() => setShowIOSInstructions(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-500 font-bold text-sm flex-shrink-0">
                    1
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm pt-1">
                    Tap the <strong>Share</strong> button in Safari (the square with an arrow)
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-500 font-bold text-sm flex-shrink-0">
                    2
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm pt-1">
                    Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong>
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-500 font-bold text-sm flex-shrink-0">
                    3
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm pt-1">
                    Tap <strong>&quot;Add&quot;</strong> to install NextMeal
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSInstructions(false)}
                className="w-full mt-6 px-4 py-3 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-900 dark:text-white font-medium rounded-xl transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
