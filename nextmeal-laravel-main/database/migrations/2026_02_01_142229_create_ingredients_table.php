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
    Schema::create('ingredients', function (Blueprint $table) {
        $table->char('ingredient_id', 36)->primary();
        $table->string('name')->unique();
        $table->timestamps();

        $table->char('category_id', 36)->nullable();
        $table->foreign('category_id')
            ->references('category_id')->on('categories')
            ->nullOnDelete();
    });
}


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ingredients');
    }
};
