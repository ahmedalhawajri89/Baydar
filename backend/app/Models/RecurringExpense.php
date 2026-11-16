<?php

declare(strict_types=1);

namespace App\Models;

use App\Casts\CurrencyAmount;
use App\Domain\Audit\RecordsActivity;
use App\Observers\AuditObserver;
use App\Support\Tenancy\ScopedToBusiness;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * An expense that comes back every month (ADR-041).
 *
 * A rule, not an expense: on its day each month GenerateRecurringExpenses
 * writes an ordinary Expense from it. Metrics read only those rows.
 *
 * @property int $id
 * @property int $expense_category_id
 * @property string $description
 * @property string $amount
 * @property string|null $vendor
 * @property int $day_of_month
 * @property Carbon $starts_on
 * @property Carbon|null $ends_on
 */
#[ObservedBy(AuditObserver::class)]
class RecurringExpense extends Model
{
    use RecordsActivity;
    use ScopedToBusiness;

    /** @var list<string> */
    protected $fillable = [
        'expense_category_id',
        'description',
        'amount',
        'vendor',
        'day_of_month',
        'starts_on',
        'ends_on',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'amount' => CurrencyAmount::class,
            'day_of_month' => 'integer',
            'starts_on' => 'date',
            'ends_on' => 'date',
        ];
    }

    /** @return BelongsTo<ExpenseCategory, $this> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(ExpenseCategory::class, 'expense_category_id');
    }

    /** @return HasMany<Expense, $this> */
    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }
}
