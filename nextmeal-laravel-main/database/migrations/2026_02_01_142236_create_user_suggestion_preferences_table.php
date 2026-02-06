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
    Schema::create('user_suggestion_preferences', function (Blueprint $table) {
        $table->char('preference_id', 36)->primary();

        $table->char('user_id', 36);
        $table->char('ingredient_id', 36)->nullable();

        $table->string('source_type', 30); // recipe / ingredient / system...
        $table->char('source_ref_recipe_id', 36)->nullable();

        $table->string('status', 20); // active/snoozed/disabled...
        $table->timestamp('snooze_until')->nullable();

        $table->timestamps();

        $table->foreign('user_id')->references('user_id')->on('users')->cascadeOnDelete();
        $table->foreign('ingredient_id')->references('ingredient_id')->on('ingredients')->nullOnDelete();
        $table->foreign('source_ref_recipe_id')->references('recipe_id')->on('recipes')->nullOnDelete();

        $table->index(['user_id']);
    });
}


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_suggestion_preferences');
    }
};
