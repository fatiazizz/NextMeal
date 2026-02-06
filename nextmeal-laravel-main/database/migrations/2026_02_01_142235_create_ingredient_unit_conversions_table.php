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
    Schema::create('ingredient_unit_conversions', function (Blueprint $table) {
        $table->char('ingredient_id', 36);
        $table->string('from_unit', 20);
        $table->string('to_unit', 20);

        $table->decimal('factor', 12, 6);
        $table->boolean('is_approx')->default(false);

        $table->primary(['ingredient_id', 'from_unit', 'to_unit']);

        $table->foreign('ingredient_id')->references('ingredient_id')->on('ingredients')->cascadeOnDelete();
        $table->foreign('from_unit')->references('unit_code')->on('units')->restrictOnDelete();
        $table->foreign('to_unit')->references('unit_code')->on('units')->restrictOnDelete();
    });
}


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ingredient_unit_conversions');
    }
};
