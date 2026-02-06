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
    Schema::create('units', function (Blueprint $table) {
        $table->string('unit_code', 20)->primary(); // مثل g, ml, tsp
        $table->string('unit_kind', 30);            // mass/volume/count...
        $table->string('base_unit', 20);            // پایه‌ی همون kind
        $table->decimal('to_base_factor', 12, 6);   // ضریب تبدیل به base_unit
    });
}


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('units');
    }
};
