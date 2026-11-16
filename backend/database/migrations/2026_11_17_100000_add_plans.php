<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/*
 * Plans (ADR-044).
 *
 * Each business carries the plan it is on. New businesses start on the
 * column's default, `free`; every business that already exists is moved to
 * `pro`, because limits arriving must not take anything away from someone
 * already relying on Baydar.
 *
 * Ask Baydar's usage ledger gains a question count beside its token count:
 * the plan limits questions, and the ledger is the record nobody can delete
 * (deleting a conversation does not give a question back).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('businesses', function (Blueprint $table): void {
            $table->string('plan', 20)->default('free')->after('status');
        });

        DB::table('businesses')->update(['plan' => 'pro']);

        Schema::table('assistant_usage', function (Blueprint $table): void {
            $table->unsignedInteger('questions')->default(0)->after('tokens');
        });
    }

    public function down(): void
    {
        Schema::table('assistant_usage', function (Blueprint $table): void {
            $table->dropColumn('questions');
        });

        Schema::table('businesses', function (Blueprint $table): void {
            $table->dropColumn('plan');
        });
    }
};
