<?php

declare(strict_types=1);

namespace App\Domain\Expenses;

use App\Models\BusinessSetting;
use App\Models\Expense;
use App\Models\RecurringExpense;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;

/**
 * Turn recurring expenses into the month's expense rows (ADR-041).
 *
 * Runs for the business in context. Every month from the rule's start up to
 * today, on the rule's day (or the month's last day, when the month is
 * shorter), gets one expense, unless it already has one. Safe to run any
 * number of times: the unique (recurring_expense_id, incurred_on) refuses a
 * second copy, and a row the owner deleted stays deleted, because its
 * soft-deleted row still holds the place.
 *
 * At most a year is caught up, so a rule started long ago does not flood
 * the books with months nobody asked for.
 */
final class GenerateRecurringExpenses
{
    public const CATCH_UP_MONTHS = 12;

    /** @return int How many expenses were written. */
    public function __invoke(?RecurringExpense $only = null): int
    {
        $today = CarbonImmutable::now(BusinessSetting::current()->timezone)->startOfDay();
        $rules = $only !== null ? collect([$only]) : RecurringExpense::query()
            ->where('starts_on', '<=', $today->toDateString())
            ->where(fn ($q) => $q->whereNull('ends_on')->orWhere('ends_on', '>=', $today->subMonths(self::CATCH_UP_MONTHS)->toDateString()))
            ->get();

        $written = 0;

        foreach ($rules as $rule) {
            foreach ($this->dueDates($rule, $today) as $date) {
                $written += $this->write($rule, $date) ? 1 : 0;
            }
        }

        return $written;
    }

    /**
     * The days this rule falls due, from its start (or a year back) to today.
     *
     * @return list<CarbonImmutable>
     */
    public function dueDates(RecurringExpense $rule, CarbonImmutable $today): array
    {
        $start = CarbonImmutable::parse($rule->starts_on->toDateString());
        $end = $rule->ends_on !== null ? CarbonImmutable::parse($rule->ends_on->toDateString()) : $today;
        $end = $end->min($today);

        $month = $start->max($today->subMonths(self::CATCH_UP_MONTHS))->startOfMonth();
        $dates = [];

        while ($month->lessThanOrEqualTo($end)) {
            $day = $month->setDay(min($rule->day_of_month, $month->daysInMonth));

            if ($day->greaterThanOrEqualTo($start) && $day->lessThanOrEqualTo($end)) {
                $dates[] = $day;
            }

            $month = $month->addMonth();
        }

        return $dates;
    }

    private function write(RecurringExpense $rule, CarbonImmutable $date): bool
    {
        $exists = Expense::withTrashed()
            ->where('recurring_expense_id', $rule->id)
            ->whereDate('incurred_on', $date->toDateString())
            ->exists();

        if ($exists) {
            return false;
        }

        try {
            $expense = new Expense([
                'expense_category_id' => $rule->expense_category_id,
                'description' => $rule->description,
                'amount' => $rule->amount,
                'incurred_on' => $date->toDateString(),
                'vendor' => $rule->vendor,
            ]);
            // Not fillable: only this writer links an expense to its rule.
            $expense->forceFill(['recurring_expense_id' => $rule->id]);
            $expense->save();
        } catch (UniqueConstraintViolationException) {
            // Another run wrote it between the check and the insert.
            return false;
        }

        return true;
    }
}
