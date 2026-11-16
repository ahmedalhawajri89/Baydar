<?php

declare(strict_types=1);

namespace App\Domain\Billing;

use App\Models\ApiKey;
use App\Models\Business;
use App\Models\Integration;
use App\Models\User;
use App\Support\Tenancy\BusinessScope;
use App\Support\Tenancy\CurrentBusiness;
use App\Support\Tenancy\TenantQuery;

/**
 * What a business's plan allows, and what it already uses (ADR-044).
 *
 * THE LIMITS ONLY GUARD WHAT IS NEW. Reaching a limit never stops, hides or
 * deletes anything already recorded: a business over its channels after a
 * downgrade keeps every store syncing, it just cannot connect another. That
 * is the promise the pricing page makes, and why every check here is made at
 * the moment something is added, never on a read.
 *
 * On the public demo every business is treated as Pro: the demo exists to
 * show the whole product, and its snapshot predates plans.
 */
final class Plans
{
    public function for(int $businessId): Plan
    {
        if (config('demo.enabled')) {
            return Plan::named('pro');
        }

        $key = (string) Business::query()->whereKey($businessId)->value('plan');

        return Plan::named(in_array($key, Plan::keys(), true) ? $key : (string) config('plans.default'));
    }

    /**
     * What is in use against each limit.
     *
     * @return array{channels: int, users: int, questions: int, businesses: int}
     */
    public function usage(int $businessId, string $month): array
    {
        return [
            'channels' => $this->channelsInUse($businessId),
            'users' => User::query()->withoutGlobalScope(BusinessScope::class)
                ->where('business_id', $businessId)->where('is_active', true)->count(),
            // Through the tenant query, run as that business: the ledger has
            // no model, and raw table access is refused outside it (ADR-023).
            'questions' => (int) CurrentBusiness::get()->run($businessId, static fn (): mixed => TenantQuery::table('assistant_usage')
                ->where('month', $month)->value('questions')),
            'businesses' => 1,
        ];
    }

    /**
     * Connected stores and live API keys. A store whose connection lapsed
     * still counts until it is removed: reconnecting it must not need room.
     */
    public function channelsInUse(int $businessId): int
    {
        $stores = Integration::query()->withoutGlobalScope(BusinessScope::class)
            ->where('business_id', $businessId)->count();

        $keys = ApiKey::query()->withoutGlobalScope(BusinessScope::class)
            ->where('business_id', $businessId)->whereNull('revoked_at')->count();

        return $stores + $keys;
    }

    /**
     * Refuses adding one more against a limit already reached.
     *
     * @throws PlanLimitReached
     */
    public function ensureRoomFor(string $limit, int $businessId, int $inUse): void
    {
        $plan = $this->for($businessId);
        $allowed = $plan->limit($limit);

        if ($allowed === null || $inUse < $allowed) {
            return;
        }

        throw new PlanLimitReached(
            __("errors.plan.limit.{$limit}", ['plan' => __("labels.plans.{$plan->key}")]),
            'plan.limit_reached',
            $limit,
            $plan->key,
            Plan::cheapestAllowing(limit: $limit, inUse: $inUse)?->key,
        );
    }

    /** @throws PlanLimitReached */
    public function ensureFeature(string $feature, int $businessId): void
    {
        $plan = $this->for($businessId);

        if ($plan->allows($feature)) {
            return;
        }

        $upgrade = Plan::cheapestAllowing(feature: $feature)?->key;

        throw new PlanLimitReached(
            __("errors.plan.feature.{$feature}", ['plan' => __('labels.plans.'.($upgrade ?? 'pro'))]),
            'plan.feature_unavailable',
            $feature,
            $plan->key,
            $upgrade,
        );
    }
}
