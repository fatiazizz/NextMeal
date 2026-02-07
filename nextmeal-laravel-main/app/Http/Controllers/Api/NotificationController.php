<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Services\ExpirationNotificationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class NotificationController extends Controller
{
    public function __construct(
        private ExpirationNotificationService $expirationNotificationService
    ) {}

    /**
     * Get all notifications for authenticated user.
     * Syncs expiration notifications for current inventory before returning, so existing
     * items that expire soon always have a notification.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $user->inventory()
            ->with(['ingredient', 'user'])
            ->get()
            ->each(function ($item) {
                try {
                    $this->expirationNotificationService->syncForInventoryItem($item);
                } catch (\Throwable $e) {
                    // Don't fail the whole request if one item fails
                }
            });

        $notifications = $user->notifications()
            ->where('is_active', true)
            ->orderBy('sent_at', 'desc')
            ->get()
            ->map(function ($notification) {
                return $this->formatNotification($notification);
            });

        return response()->json([
            'data' => $notifications,
        ]);
    }

    /**
     * Mark notification as read
     */
    public function markAsRead(Request $request, Notification $notification): JsonResponse
    {
        // Ensure user owns this notification
        if ($notification->user_id !== $request->user()->user_id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $notification->update([
            'is_read' => true,
            'read_at' => now(),
        ]);

        return response()->json([
            'data' => $this->formatNotification($notification),
        ]);
    }

    /**
     * Mark all notifications as read
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $request->user()
            ->notifications()
            ->where('is_read', false)
            ->where('is_active', true)
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        return response()->json([
            'message' => 'All notifications marked as read',
        ]);
    }

    /**
     * Delete notification
     */
    public function destroy(Request $request, Notification $notification): JsonResponse
    {
        // Ensure user owns this notification
        if ($notification->user_id !== $request->user()->user_id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        // Soft delete by marking as inactive
        $notification->update([
            'is_active' => false,
        ]);

        return response()->json([
            'message' => 'Notification deleted',
        ]);
    }

    /**
     * Create a new notification (typically called internally)
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'notification_type' => ['required', 'string', 'in:expiration,low_stock,info'],
            'severity' => ['required', 'string', 'in:normal,safety'],
            'payload' => ['required', 'array'],
            'payload.message' => ['required', 'string'],
            'ingredient_id' => ['nullable', 'string'],
            'related_inventory_id' => ['nullable', 'string'],
        ]);

        $notification = Notification::create([
            'user_id' => $request->user()->user_id,
            'ingredient_id' => $validated['ingredient_id'] ?? null,
            'related_inventory_id' => $validated['related_inventory_id'] ?? null,
            'notification_type' => $validated['notification_type'],
            'severity' => $validated['severity'],
            'state' => 'active',
            'is_read' => false,
            'payload' => $validated['payload'],
            'sent_at' => now(),
            'is_active' => true,
        ]);

        return response()->json([
            'data' => $this->formatNotification($notification),
        ], 201);
    }

    /**
     * Format notification for API response
     */
    private function formatNotification(Notification $notification): array
    {
        return [
            'id' => $notification->notification_id,
            'userId' => $notification->user_id,
            'ingredientId' => $notification->ingredient_id,
            'relatedInventoryId' => $notification->related_inventory_id,
            'notificationType' => $notification->notification_type,
            'severity' => $notification->severity,
            'state' => $notification->state,
            'isRead' => (bool) $notification->is_read,
            'deliveryStatus' => $notification->delivery_status,
            'payload' => $notification->payload,
            'sentAt' => $notification->sent_at?->toISOString(),
            'readAt' => $notification->read_at?->toISOString(),
            'resolvedAt' => $notification->resolved_at?->toISOString(),
            'isActive' => (bool) $notification->is_active,
        ];
    }
}
