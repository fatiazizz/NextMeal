<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory', function (Blueprint $table) {
            // اگر قبلاً FK/ایندکس وجود داشته باشه، این migration می‌ترکه.
            // چون تو الان نداری، مستقیم اضافه می‌کنیم.

            $table->foreign('base_unit')
                ->references('unit_code')
                ->on('units')
                ->restrictOnDelete(); // یا ->noActionOnDelete()
        });
    }

    public function down(): void
    {
        Schema::table('inventory', function (Blueprint $table) {
            $table->dropForeign(['base_unit']);
        });
    }
};
