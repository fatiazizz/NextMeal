<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
{
    Schema::create('notifications', function (Blueprint $table) {
        $table->char('notification_id', 36)->primary();

        $table->char('user_id', 36);
        $table->char('ingredient_id', 36)->nullable();
        $table->char('related_inventory_id', 36)->nullable();

        $table->string('notification_type', 30); // expiration/low_stock/info...
        $table->string('severity', 20);          // normal/safety...
        $table->string('state', 20);             // active/resolved
        $table->boolean('is_read')->default(false);

        $table->string('delivery_status', 20)->nullable(); // sent/failed/skipped
        $table->json('payload')->nullable();

        $table->timestamp('sent_at')->nullable();
        $table->timestamp('created_at')->useCurrent();
        $table->timestamp('read_at')->nullable();
        $table->timestamp('resolved_at')->nullable();

        // ستون کمکی برای unique فعال‌ها
        $table->boolean('is_active')->default(true);

        $table->foreign('user_id')->references('user_id')->on('users')->cascadeOnDelete();
        $table->foreign('ingredient_id')->references('ingredient_id')->on('ingredients')->nullOnDelete();
        $table->foreign('related_inventory_id')->references('inventory_id')->on('inventory')->nullOnDelete();

        // جلوگیری از active duplicate (جایگزین partial unique در Postgres)
        $table->unique(['user_id', 'related_inventory_id', 'notification_type', 'is_active'], 'uniq_active_notifications');

        $table->index(['user_id', 'is_read']);
    });
}


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
