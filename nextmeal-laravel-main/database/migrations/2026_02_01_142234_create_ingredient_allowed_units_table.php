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
    Schema::create('ingredient_allowed_units', function (Blueprint $table) {
        $table->char('ingredient_id', 36);
        $table->string('unit_code', 20);

        $table->primary(['ingredient_id', 'unit_code']);

        $table->foreign('ingredient_id')->references('ingredient_id')->on('ingredients')->cascadeOnDelete();
        $table->foreign('unit_code')->references('unit_code')->on('units')->restrictOnDelete();
    });
}


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ingredient_allowed_units');
    }
};
