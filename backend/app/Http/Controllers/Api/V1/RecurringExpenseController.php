<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Authorization\Ability;
use App\Domain\Expenses\GenerateRecurringExpenses;
use App\Http\Controllers\Controller;
use App\Models\RecurringExpense;
use App\Support\Tenancy\TenantRule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Expenses that come back every month (ADR-041).
 *
 * Gated by the expense abilities themselves: a rule is a way of entering
 * expenses, so whoever may enter, change or delete an expense may do the
 * same to the rule. Changing a rule moves no expense already written; those
 * are ordinary rows the owner corrects one by one.
 */
class RecurringExpenseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->allow($request, Ability::ExpensesView);

        $rules = RecurringExpense::query()->with('category')->orderBy('day_of_month')->orderBy('id')->get();

        return response()->json(['data' => $rules->map(fn (RecurringExpense $rule): array => $this->present($rule))->all()]);
    }

    public function store(Request $request, GenerateRecurringExpenses $generate): JsonResponse
    {
        $this->allow($request, Ability::ExpensesCreate);

        $rule = new RecurringExpense($this->rules($request));
        $rule->forceFill(['created_by' => $request->user()?->id]);
        $rule->save();

        // A month already due (rent on the 1st, saved on the 10th) is written now.
        $generate($rule);

        return response()->json(['data' => $this->present($rule->load('category'))], 201);
    }

    public function update(Request $request, RecurringExpense $recurringExpense): JsonResponse
    {
        $this->allow($request, Ability::ExpensesUpdate);

        $recurringExpense->update($this->rules($request, $recurringExpense));

        return response()->json(['data' => $this->present($recurringExpense->fresh()?->load('category') ?? $recurringExpense)]);
    }

    /** Stops the rule. The expenses it already wrote stay: they happened. */
    public function destroy(Request $request, RecurringExpense $recurringExpense): JsonResponse
    {
        $this->allow($request, Ability::ExpensesDelete);

        $recurringExpense->delete();

        return response()->json(null, 204);
    }

    private function allow(Request $request, Ability $ability): void
    {
        abort_unless($request->user()?->can($ability->value) ?? false, 403);
    }

    /** @return array<string, mixed> */
    private function rules(Request $request, ?RecurringExpense $rule = null): array
    {
        $required = $rule ? 'sometimes' : 'required';

        return $request->validate([
            'expense_category_id' => [$required, 'integer', TenantRule::exists('expense_categories')->whereNull('deleted_at')],
            'description' => [$required, 'string', 'max:255'],
            'amount' => [$required, 'numeric', 'min:0.01', 'max:10000000'],
            'vendor' => ['nullable', 'string', 'max:180'],
            'day_of_month' => [$required, 'integer', 'between:1,31'],
            'starts_on' => [$required, 'date'],
            'ends_on' => ['nullable', 'date', 'after_or_equal:starts_on'],
        ]);
    }

    /** @return array<string, mixed> */
    private function present(RecurringExpense $rule): array
    {
        return [
            'id' => $rule->id,
            'description' => $rule->description,
            'amount' => (string) $rule->amount,
            'vendor' => $rule->vendor,
            'day_of_month' => $rule->day_of_month,
            'starts_on' => $rule->starts_on->toDateString(),
            'ends_on' => $rule->ends_on?->toDateString(),
            'category' => $rule->category === null ? null : [
                'id' => $rule->category->id,
                'name' => $rule->category->name,
                'slug' => $rule->category->slug,
            ],
        ];
    }
}
