<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            // MariaDB JSON عملاً longtext + check هست، ولی این change باعث می‌شه از سمت Laravel واضح باشه.
            $table->json('payload')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->longText('payload')->nullable()->change();
        });
    }
};
