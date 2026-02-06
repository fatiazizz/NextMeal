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
    Schema::create('user_ingredient_thresholds', function (Blueprint $table) {
        $table->char('user_id', 36);
        $table->char('ingredient_id', 36);

        $table->decimal('threshold_quantity', 12, 3);
        $table->string('threshold_unit', 20);

        $table->timestamps();

        $table->primary(['user_id', 'ingredient_id']);

        $table->foreign('user_id')->references('user_id')->on('users')->cascadeOnDelete();
        $table->foreign('ingredient_id')->references('ingredient_id')->on('ingredients')->cascadeOnDelete();
        $table->foreign('threshold_unit')->references('unit_code')->on('units')->restrictOnDelete();
    });
}


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_ingredient_thresholds');
    }
};
