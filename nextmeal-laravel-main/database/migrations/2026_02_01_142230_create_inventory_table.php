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
    Schema::create('inventory', function (Blueprint $table) {
        $table->char('inventory_id', 36)->primary();

        $table->char('user_id', 36);
        $table->char('ingredient_id', 36);

        $table->decimal('input_quantity', 12, 3);
        $table->string('input_unit', 20);

        $table->decimal('base_quantity', 12, 3);
        $table->string('base_unit', 20);

        $table->date('expiration_date')->nullable();
        $table->timestamp('last_updated')->nullable();
        $table->timestamps();

        $table->foreign('user_id')->references('user_id')->on('users')->cascadeOnDelete();
        $table->foreign('ingredient_id')->references('ingredient_id')->on('ingredients')->cascadeOnDelete();
        $table->foreign('input_unit')->references('unit_code')->on('units')->restrictOnDelete();

        $table->index(['user_id', 'ingredient_id']);
        $table->index(['expiration_date']);
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory');
    }
};
