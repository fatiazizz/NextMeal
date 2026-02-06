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
        Schema::create('recipe_steps', function (Blueprint $table) {
            $table->char('recipe_step_id', 36)->primary();

            $table->char('recipe_id', 36);
            $table->unsignedInteger('step_number');
            $table->text('description');

            $table->timestamps();

            $table->foreign('recipe_id')->references('recipe_id')->on('recipes')->cascadeOnDelete();

            $table->index(['recipe_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('recipe_steps');
    }
};
