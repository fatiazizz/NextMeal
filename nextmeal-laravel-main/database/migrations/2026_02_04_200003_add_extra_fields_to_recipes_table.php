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
        Schema::table('recipes', function (Blueprint $table) {
            $table->text('description')->nullable()->after('recipe_name');
            $table->string('prep_time', 50)->nullable()->after('instructions');
            $table->integer('servings')->default(1)->after('prep_time');
            $table->string('image_url', 500)->nullable()->after('servings');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('recipes', function (Blueprint $table) {
            $table->dropColumn(['description', 'prep_time', 'servings', 'image_url']);
        });
    }
};
