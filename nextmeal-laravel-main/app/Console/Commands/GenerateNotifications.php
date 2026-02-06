<?php

namespace App\Console\Commands;

use App\Models\Inventory;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class GenerateNotifications extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'notifications:generate';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate automatic notifications for expiring ingredients and low stock items';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Generating notifications...');

        $expirationCount = $this->generateExpirationNotifications();
        $lowStockCount = $this->generateLowStockNotifications();

        $this->info("Generated {$expirationCount} expiration notifications");
        $this->info("Generated {$lowStockCount} low stock notifications");
        $this->info("Total: " . ($expirationCount + $lowStockCount) . " notifications");

        return Command::SUCCESS;
    }

    /**
     * Generate expiration notifications for ingredients expiring within 3 days
     */
    private function generateExpirationNotifications(): int
    {
        $count = 0;
        $today = Carbon::today();
        $threeDaysFromNow = $today->copy()->addDays(3);

        // Get all inventory items expiring within 3 days
        $expiringItems = Inventory::with(['ingredient', 'user'])
            ->whereNotNull('expiration_date')
            ->whereBetween('expiration_date', [$today, $threeDaysFromNow])
            ->where('expiration_date', '>=', $today) // Not expired yet
            ->get();

        foreach ($expiringItems as $item) {
            if (!$item->ingredient || !$item->user) {
                continue;
            }

            $daysUntilExpiry = $today->diffInDays($item->expiration_date, false);
            
            // Skip if already expired
            if ($daysUntilExpiry < 0) {
                continue;
            }

            $ingredientName = $item->ingredient->ingredient_name ?? 'Unknown';
            
            // Check if notification already exists (active)
            $existing = Notification::where('user_id', $item->user_id)
                ->where('related_inventory_id', $item->inventory_id)
                ->where('notification_type', 'expiration')
                ->where('is_active', true)
                ->first();

            if ($existing) {
                // Update existing notification if days changed
                $existingDays = $existing->payload['daysUntilExpiry'] ?? null;
                if ($existingDays !== $daysUntilExpiry) {
                    $existing->update([
                        'payload' => [
                            'message' => $this->getExpirationMessage($ingredientName, $daysUntilExpiry),
                            'ingredientName' => $ingredientName,
                            'daysUntilExpiry' => $daysUntilExpiry,
                        ],
                        'severity' => $daysUntilExpiry === 0 ? 'safety' : 'normal',
                        'sent_at' => now(),
                    ]);
                    $count++;
                }
                continue;
            }

            // Create new notification
            Notification::create([
                'user_id' => $item->user_id,
                'ingredient_id' => $item->ingredient_id,
                'related_inventory_id' => $item->inventory_id,
                'notification_type' => 'expiration',
                'severity' => $daysUntilExpiry === 0 ? 'safety' : 'normal',
                'state' => 'active',
                'is_read' => false,
                'payload' => [
                    'message' => $this->getExpirationMessage($ingredientName, $daysUntilExpiry),
                    'ingredientName' => $ingredientName,
                    'daysUntilExpiry' => $daysUntilExpiry,
                ],
                'sent_at' => now(),
                'is_active' => true,
            ]);

            $count++;
        }

        return $count;
    }

    /**
     * Generate low stock notifications
     */
    private function generateLowStockNotifications(): int
    {
        $count = 0;

        // Get all inventory items that are low stock
        $lowStockItems = Inventory::with(['ingredient', 'user'])
            ->get()
            ->filter(function ($item) {
                return $item->isLowStock();
            });

        foreach ($lowStockItems as $item) {
            if (!$item->ingredient || !$item->user) {
                continue;
            }

            $ingredientName = $item->ingredient->ingredient_name ?? 'Unknown';
            $currentQuantity = (float) $item->input_quantity;
            $threshold = (float) ($item->minimum_threshold ?? 2);

            // Check if notification already exists (active)
            $existing = Notification::where('user_id', $item->user_id)
                ->where('related_inventory_id', $item->inventory_id)
                ->where('notification_type', 'low_stock')
                ->where('is_active', true)
                ->first();

            if ($existing) {
                // Update existing notification if quantity changed
                $existingQty = $existing->payload['currentQuantity'] ?? null;
                if ($existingQty !== $currentQuantity) {
                    $existing->update([
                        'payload' => [
                            'message' => $this->getLowStockMessage($ingredientName),
                            'ingredientName' => $ingredientName,
                            'currentQuantity' => $currentQuantity,
                            'threshold' => $threshold,
                        ],
                        'sent_at' => now(),
                    ]);
                    $count++;
                }
                continue;
            }

            // Create new notification
            Notification::create([
                'user_id' => $item->user_id,
                'ingredient_id' => $item->ingredient_id,
                'related_inventory_id' => $item->inventory_id,
                'notification_type' => 'low_stock',
                'severity' => 'normal',
                'state' => 'active',
                'is_read' => false,
                'payload' => [
                    'message' => $this->getLowStockMessage($ingredientName),
                    'ingredientName' => $ingredientName,
                    'currentQuantity' => $currentQuantity,
                    'threshold' => $threshold,
                ],
                'sent_at' => now(),
                'is_active' => true,
            ]);

            $count++;
        }

        return $count;
    }

    /**
     * Get expiration notification message
     */
    private function getExpirationMessage(string $ingredientName, int $days): string
    {
        if ($days === 0) {
            return "There is 0 days to expire of {$ingredientName} ingredient.";
        }
        return "There is {$days} day" . ($days !== 1 ? 's' : '') . " to expire of {$ingredientName} ingredient.";
    }

    /**
     * Get low stock notification message
     */
    private function getLowStockMessage(string $ingredientName): string
    {
        return "You are going to run out of {$ingredientName}.";
    }
}
