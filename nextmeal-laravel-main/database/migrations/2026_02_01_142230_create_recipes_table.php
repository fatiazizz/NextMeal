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
    Schema::create('recipes', function (Blueprint $table) {
        $table->char('recipe_id', 36)->primary();
        $table->char('owner_user_id', 36)->nullable();

        $table->string('recipe_name');
        $table->text('instructions')->nullable();
        $table->timestamps();

        $table->char('cuisine_id', 36)->nullable();
        $table->char('recipe_category_id', 36)->nullable();
        $table->char('method_id', 36)->nullable();

        $table->foreign('owner_user_id')->references('user_id')->on('users')->nullOnDelete();
        $table->foreign('cuisine_id')->references('cuisine_id')->on('cuisines')->nullOnDelete();
        $table->foreign('recipe_category_id')->references('recipe_category_id')->on('recipe_categories')->nullOnDelete();
        $table->foreign('method_id')->references('method_id')->on('cooking_methods')->nullOnDelete();

        $table->index(['owner_user_id']);
    });
}


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('recipes');
    }
};
