<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Domain\Billing\Plan;
use App\Models\Business;
use Illuminate\Console\Command;

/**
 * Moves a business to another plan (ADR-044).
 *
 * The way a plan changes until online payment exists: the owner pays by
 * whatever arrangement was agreed, and this records it. Moving down takes
 * nothing away; it only stops what is added from then on.
 */
class AssignPlan extends Command
{
    protected $signature = 'plans:assign {business : The business id or slug} {plan : free, basic, growth or pro}';

    protected $description = 'Move a business to another plan';

    public function handle(): int
    {
        $plan = (string) $this->argument('plan');

        if (! in_array($plan, Plan::keys(), true)) {
            $this->error("Unknown plan [{$plan}]. One of: ".implode(', ', Plan::keys()));

            return self::FAILURE;
        }

        $id = (string) $this->argument('business');
        $business = Business::query()->where('slug', $id)->orWhere('id', ctype_digit($id) ? (int) $id : 0)->first();

        if ($business === null) {
            $this->error("No business [{$id}].");

            return self::FAILURE;
        }

        $from = $business->plan;
        $business->forceFill(['plan' => $plan])->save();

        $this->info("{$business->name}: {$from} → {$plan}");

        return self::SUCCESS;
    }
}
