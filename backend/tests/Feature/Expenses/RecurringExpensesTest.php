<?php

declare(strict_types=1);

use App\Domain\Expenses\GenerateRecurringExpenses;
use App\Domain\Metrics\MetricCalculator;
use App\Domain\Metrics\Period;
use App\Models\BusinessSetting;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\RecurringExpense;
use App\Models\User;

/*
|--------------------------------------------------------------------------
| Expenses that come back every month (ADR-041)
|--------------------------------------------------------------------------
|
| A rule becomes one ordinary expense per month on its day, never two, and
| a row the owner deleted stays deleted.
|
*/

beforeEach(function (): void {
    // Mid-morning on the 10th of March in the business's own timezone.
    $this->travelTo(now(BusinessSetting::current()->timezone)->setDate(2027, 3, 10)->setTime(10, 0));
    ExpenseCategory::factory()->create(['name' => 'Rent']);
});

function rentRule(array $overrides = []): RecurringExpense
{
    return RecurringExpense::query()->create($overrides + [
        'expense_category_id' => ExpenseCategory::query()->value('id'),
        'description' => 'Shop rent',
        'amount' => '1200',
        'day_of_month' => 1,
        'starts_on' => '2027-03-01',
    ]);
}

/** @return list<string> */
function writtenDays(RecurringExpense $rule): array
{
    return Expense::withTrashed()->where('recurring_expense_id', $rule->id)
        ->orderBy('incurred_on')->get()
        ->map(fn (Expense $e): string => $e->incurred_on->toDateString())->all();
}

it('writes the month already due as soon as the rule is saved', function (): void {
    $owner = User::factory()->owner()->create();

    $id = $this->actingAs($owner)->postJson('/api/v1/expenses/recurring', [
        'expense_category_id' => ExpenseCategory::query()->value('id'),
        'description' => 'Shop rent',
        'amount' => 1200,
        'day_of_month' => 1,
        'starts_on' => '2027-03-01',
    ])->assertCreated()->assertJsonPath('data.amount', '1200.000')->json('data.id');

    expect(writtenDays(RecurringExpense::query()->findOrFail($id)))->toBe(['2027-03-01']);
});

it('writes each month once, however often it runs', function (): void {
    $rule = rentRule(['starts_on' => '2027-01-01']);
    $generate = app(GenerateRecurringExpenses::class);

    expect($generate())->toBe(3);
    expect($generate())->toBe(0);
    $this->artisan('expenses:recur')->assertSuccessful();

    expect(writtenDays($rule))->toBe(['2027-01-01', '2027-02-01', '2027-03-01']);
});

it('waits for the day, and puts the 31st on the last day of a short month', function (): void {
    $rule = rentRule(['day_of_month' => 31, 'starts_on' => '2027-01-01']);

    app(GenerateRecurringExpenses::class)();

    // March 31st has not come yet on the 10th.
    expect(writtenDays($rule))->toBe(['2027-01-31', '2027-02-28']);
});

it('catches up a year at most', function (): void {
    $rule = rentRule(['starts_on' => '2024-01-01']);

    app(GenerateRecurringExpenses::class)();

    expect(writtenDays($rule))->toHaveCount(13)
        ->and(writtenDays($rule)[0])->toBe('2026-03-01');
});

it('leaves a month the owner deleted deleted', function (): void {
    $rule = rentRule(['starts_on' => '2027-02-01']);
    app(GenerateRecurringExpenses::class)();

    Expense::query()->where('recurring_expense_id', $rule->id)->whereDate('incurred_on', '2027-02-01')->firstOrFail()->delete();
    app(GenerateRecurringExpenses::class)();

    expect(Expense::query()->where('recurring_expense_id', $rule->id)->count())->toBe(1);
});

it('stops at its end date, and stopping it keeps what it wrote', function (): void {
    $rule = rentRule(['starts_on' => '2027-01-01', 'ends_on' => '2027-01-31']);
    app(GenerateRecurringExpenses::class)();

    expect(writtenDays($rule))->toBe(['2027-01-01']);

    $this->actingAs(User::factory()->owner()->create())
        ->deleteJson("/api/v1/expenses/recurring/{$rule->id}")
        ->assertNoContent();

    expect(Expense::query()->where('description', 'Shop rent')->count())->toBe(1);
});

it('counts in operating expenses like any expense typed in', function (): void {
    rentRule();
    app(GenerateRecurringExpenses::class)();

    expect(app(MetricCalculator::class)->operatingExpenses(Period::between('2027-03-01', '2027-03-31')))->toBe('1200.000');
});

it('is managed only by a role that may enter expenses', function (): void {
    $this->actingAs(User::factory()->staff()->create())
        ->postJson('/api/v1/expenses/recurring', [
            'expense_category_id' => ExpenseCategory::query()->value('id'),
            'description' => 'Shop rent',
            'amount' => 1200,
            'day_of_month' => 1,
            'starts_on' => '2027-03-01',
        ])->assertForbidden();

    $this->actingAs(User::factory()->owner()->create())
        ->postJson('/api/v1/expenses/recurring', ['day_of_month' => 40])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['day_of_month', 'amount', 'description', 'starts_on']);
});
