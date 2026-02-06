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
    Schema::create('recipe_ingredients', function (Blueprint $table) {
        $table->char('recipe_ingredient_id', 36)->primary();

        $table->char('recipe_id', 36);
        $table->char('ingredient_id', 36);

        $table->decimal('required_quantity', 12, 3);
        $table->string('required_unit', 20);

        $table->timestamps();

        $table->foreign('recipe_id')->references('recipe_id')->on('recipes')->cascadeOnDelete();
        $table->foreign('ingredient_id')->references('ingredient_id')->on('ingredients')->cascadeOnDelete();
        $table->foreign('required_unit')->references('unit_code')->on('units')->restrictOnDelete();

        $table->unique(['recipe_id', 'ingredient_id']); // جلوگیری از تکراری
    });
}


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('recipe_ingredients');
    }
};
