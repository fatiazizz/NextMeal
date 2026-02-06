"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, X, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { useNotifications } from "@/context/NotificationContext";
import type { Notification } from "@/types";

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } =
    useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    setSelectedNotification(notification);
    setIsOpen(false);
  };

  const getNotificationIcon = (type: Notification["notificationType"]) => {
    switch (type) {
      case "expiration":
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case "low_stock":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "info":
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: Notification["severity"]) => {
    return severity === "safety" 
      ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20" 
      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800";
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-[600px] flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                >
                  Mark all as read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p>No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${
                      !notification.isRead ? "bg-blue-50 dark:bg-blue-900/20" : ""
                    } ${getSeverityColor(notification.severity)}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.notificationType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                              {notification.notificationType.replace("_", " ")}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {new Date(notification.sentAt).toLocaleString()}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                          {notification.payload?.message || "Notification"}
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="capitalize">
                            Severity: {notification.severity}
                          </span>
                          <span>•</span>
                          <span className="capitalize">Type: {notification.notificationType}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="flex-shrink-0 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notification Detail Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedNotification(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Notification Details
                </h3>
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Notification Type */}
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {getNotificationIcon(selectedNotification.notificationType)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Type</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">
                      {selectedNotification.notificationType.replace("_", " ")}
                    </p>
                  </div>
                </div>

                {/* Severity */}
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Severity</p>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      selectedNotification.severity === "safety"
                        ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}
                  >
                    {selectedNotification.severity === "safety" ? (
                      <AlertCircle className="w-4 h-4 mr-1" />
                    ) : (
                      <Info className="w-4 h-4 mr-1" />
                    )}
                    {selectedNotification.severity}
                  </span>
                </div>

                {/* Sent At */}
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Sent At</p>
                  <p className="text-gray-900 dark:text-gray-100">
                    {new Date(selectedNotification.sentAt).toLocaleString()}
                  </p>
                </div>

                {/* Message */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Message</p>
                  <p className="text-gray-900 dark:text-gray-100">
                    {selectedNotification.payload?.message || "No message available"}
                  </p>
                </div>

                {/* Additional Details */}
                {selectedNotification.payload && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                    {selectedNotification.payload.ingredientName && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Ingredient</p>
                        <p className="text-gray-900 dark:text-gray-100 capitalize">
                          {selectedNotification.payload.ingredientName}
                        </p>
                      </div>
                    )}
                    {selectedNotification.payload.daysUntilExpiry !== undefined && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Days Until Expiry</p>
                        <p className="text-gray-900 dark:text-gray-100">
                          {selectedNotification.payload.daysUntilExpiry} day
                          {selectedNotification.payload.daysUntilExpiry !== 1 ? "s" : ""}
                        </p>
                      </div>
                    )}
                    {selectedNotification.payload.currentQuantity !== undefined && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Current Quantity</p>
                        <p className="text-gray-900 dark:text-gray-100">
                          {selectedNotification.payload.currentQuantity}
                        </p>
                      </div>
                    )}
                    {selectedNotification.payload.threshold !== undefined && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Threshold</p>
                        <p className="text-gray-900 dark:text-gray-100">
                          {selectedNotification.payload.threshold}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      deleteNotification(selectedNotification.id);
                      setSelectedNotification(null);
                    }}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setSelectedNotification(null)}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
