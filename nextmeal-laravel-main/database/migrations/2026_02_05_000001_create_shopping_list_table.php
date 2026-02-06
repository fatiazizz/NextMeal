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
        // Drop old tables if they exist (from previous migration design)
        Schema::dropIfExists('shopping_list_items');
        Schema::dropIfExists('shopping_lists');

        Schema::create('shopping_list', function (Blueprint $table) {
            $table->char('shopping_list_id', 36)->primary();
            $table->char('user_id', 36);
            $table->char('ingredient_id', 36)->nullable();
            $table->decimal('quantity', 12, 3);
            $table->string('unit_code', 20);
            $table->boolean('is_checked')->default(false);
            $table->timestamps();

            $table->foreign('user_id')->references('user_id')->on('users')->cascadeOnDelete();
            $table->foreign('ingredient_id')->references('ingredient_id')->on('ingredients')->nullOnDelete();
            $table->foreign('unit_code')->references('unit_code')->on('units')->restrictOnDelete();

            $table->index(['user_id']);
            $table->index(['user_id', 'is_checked']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shopping_list');
    }
};
