<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Domain\Expenses\GenerateRecurringExpenses;
use App\Models\RecurringExpense;
use App\Support\Tenancy\BusinessScope;
use App\Support\Tenancy\CurrentBusiness;
use Illuminate\Console\Command;

/**
 * Write each business's recurring expenses that have fallen due (ADR-041).
 *
 * Daily, and safe to run more often: a month already written is skipped.
 */
class WriteRecurringExpenses extends Command
{
    protected $signature = 'expenses:recur';

    protected $description = 'Write the recurring expenses that have fallen due, once per month each';

    public function handle(GenerateRecurringExpenses $generate): int
    {
        $businesses = RecurringExpense::query()
            ->withoutGlobalScope(BusinessScope::class)
            ->distinct()
            ->pluck('business_id');

        foreach ($businesses as $business) {
            $written = CurrentBusiness::get()->run((int) $business, fn (): int => $generate());
            $this->line("business {$business}: {$written} expenses");
        }

        return self::SUCCESS;
    }
}
