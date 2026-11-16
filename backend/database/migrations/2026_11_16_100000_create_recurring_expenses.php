<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Expenses that come back every month (ADR-041).
 *
 * Operating profit is only as true as the expenses behind it, and nobody types
 * the rent in twelve times a year. A recurring expense is a RULE; on its day
 * each month it becomes an ordinary expense row, which the owner can still
 * correct or delete like any other. The metrics never read the rules, only
 * the rows they leave, so an expense has one definition, not two.
 *
 * The unique (recurring_expense_id, incurred_on) is what makes the daily run
 * safe to repeat: a month already written cannot be written twice, by a retry,
 * by two servers, or by a run that overlapped the last one.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recurring_expenses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('business_id')->constrained('businesses')->cascadeOnDelete();
            $table->foreignId('expense_category_id')->constrained('expense_categories')->restrictOnDelete();
            $table->string('description', 255);
            $table->decimal('amount', 15, 3);
            $table->string('vendor', 180)->nullable();
            // 1–31; a day the month does not have falls on its last day.
            $table->unsignedTinyInteger('day_of_month');
            $table->date('starts_on');
            $table->date('ends_on')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['business_id', 'ends_on']);
        });

        Schema::table('expenses', function (Blueprint $table): void {
            $table->foreignId('recurring_expense_id')->nullable()->after('expense_category_id')
                ->constrained('recurring_expenses')->nullOnDelete();
            $table->unique(['recurring_expense_id', 'incurred_on']);
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table): void {
            $table->dropUnique(['recurring_expense_id', 'incurred_on']);
            $table->dropConstrainedForeignId('recurring_expense_id');
        });

        Schema::dropIfExists('recurring_expenses');
    }
};
