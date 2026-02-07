<?php

namespace App\Services;

use App\Models\Inventory;
use App\Models\Notification;
use Illuminate\Support\Carbon;

class ExpirationNotificationService
{
    /**
     * Create or update an expiration notification for an inventory item when it is
     * expiring within the configured window (e.g. 3 days). Deactivates any existing
     * expiration notification when the item is not expiring soon.
     * Respects the user's notifications_enabled setting.
     */
    public function syncForInventoryItem(Inventory $item): void
    {
        $item->loadMissing(['ingredient', 'user']);

        if (! $item->ingredient || ! $item->user) {
            return;
        }

        if ($item->user->notifications_enabled === false) {
            $this->deactivateExpirationNotificationFor($item);
            return;
        }

        $windowDays = (int) config('recommendation.expiration_reference_days', 3);
        $today = Carbon::today();
        $windowEnd = $today->copy()->addDays($windowDays);

        if (! $item->expiration_date) {
            $this->deactivateExpirationNotificationFor($item);
            return;
        }

        $expirationDate = $item->expiration_date instanceof Carbon
            ? $item->expiration_date->copy()->startOfDay()
            : Carbon::parse($item->expiration_date)->startOfDay();
        $today = $today->startOfDay();
        $windowEnd = $windowEnd->startOfDay();

        // Expired: expiration date is before today (date-only comparison)
        if ($expirationDate->lt($today)) {
            $this->deactivateExpirationNotificationFor($item);
            return;
        }

        // Outside window: expires after the notification window (e.g. after today + 3 days)
        if ($expirationDate->gt($windowEnd)) {
            $this->deactivateExpirationNotificationFor($item);
            return;
        }

        $daysUntilExpiry = (int) $today->diffInDays($expirationDate, false);
        if ($daysUntilExpiry < 0) {
            $this->deactivateExpirationNotificationFor($item);
            return;
        }

        $ingredientName = $item->ingredient->ingredient_name ?? 'Unknown';

        $existing = Notification::where('user_id', $item->user_id)
            ->where('related_inventory_id', $item->inventory_id)
            ->where('notification_type', 'expiration')
            ->where('is_active', true)
            ->first();

        $payload = [
            'message' => $this->getMessage($ingredientName, $daysUntilExpiry),
            'ingredientName' => $ingredientName,
            'daysUntilExpiry' => $daysUntilExpiry,
        ];
        $severity = $daysUntilExpiry === 0 ? 'safety' : 'normal';

        if ($existing) {
            $existing->update([
                'payload' => $payload,
                'severity' => $severity,
                'sent_at' => now(),
            ]);
            return;
        }

        Notification::create([
            'user_id' => $item->user_id,
            'ingredient_id' => $item->ingredient_id,
            'related_inventory_id' => $item->inventory_id,
            'notification_type' => 'expiration',
            'severity' => $severity,
            'state' => 'active',
            'is_read' => false,
            'payload' => $payload,
            'sent_at' => now(),
            'is_active' => true,
        ]);
    }

    /**
     * Get the active expiration notification for this inventory item (for API response).
     * Returns formatted array for JSON or null if none.
     */
    public function getActiveExpirationNotificationFor(Inventory $item): ?array
    {
        $notification = Notification::where('user_id', $item->user_id)
            ->where('related_inventory_id', $item->inventory_id)
            ->where('notification_type', 'expiration')
            ->where('is_active', true)
            ->first();

        if (! $notification) {
            return null;
        }

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

    /**
     * Deactivate any expiration notification for this inventory item (e.g. when item is deleted).
     */
    public function deactivateForInventoryItem(Inventory $item): void
    {
        $this->deactivateExpirationNotificationFor($item);
    }

    private function deactivateExpirationNotificationFor(Inventory $item): void
    {
        Notification::where('user_id', $item->user_id)
            ->where('related_inventory_id', $item->inventory_id)
            ->where('notification_type', 'expiration')
            ->where('is_active', true)
            ->update(['is_active' => false]);
    }

    private function getMessage(string $ingredientName, int $days): string
    {
        if ($days === 0) {
            return "There is 0 days to expire of {$ingredientName} ingredient.";
        }

        return 'There is '.$days.' day'.($days !== 1 ? 's' : '').' to expire of '.$ingredientName.' ingredient.';
    }
}
