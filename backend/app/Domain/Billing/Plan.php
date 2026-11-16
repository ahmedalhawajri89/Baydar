<?php

declare(strict_types=1);

namespace App\Domain\Billing;

use InvalidArgumentException;

/**
 * One plan: what it allows (ADR-044). Read from config/plans.php.
 */
final readonly class Plan
{
    public const LIMITS = ['channels', 'users', 'questions', 'businesses'];

    public const FEATURES = ['forecasts', 'financing'];

    /**
     * @param  array<string, int|null>  $limits
     * @param  array<string, bool>  $features
     */
    private function __construct(
        public string $key,
        public string $price,
        public array $limits,
        public array $features,
    ) {}

    public static function named(string $key): self
    {
        /** @var array{price: string, limits: array<string, int|null>, features: array<string, bool>}|null $plan */
        $plan = config("plans.plans.{$key}");

        if ($plan === null) {
            throw new InvalidArgumentException("Unknown plan [{$key}].");
        }

        return new self($key, $plan['price'], $plan['limits'], $plan['features']);
    }

    /** @return list<string> */
    public static function keys(): array
    {
        return array_keys((array) config('plans.plans'));
    }

    /** The limit, or null when there is none. */
    public function limit(string $name): ?int
    {
        return $this->limits[$name] ?? null;
    }

    public function allows(string $feature): bool
    {
        return (bool) ($this->features[$feature] ?? false);
    }

    /**
     * The cheapest plan that offers a feature, or lifts a limit above what is
     * in use, so a refusal can say which plan would have allowed it.
     */
    public static function cheapestAllowing(?string $feature = null, ?string $limit = null, int $inUse = 0): ?self
    {
        foreach (self::keys() as $key) {
            $plan = self::named($key);

            if ($feature !== null && ! $plan->allows($feature)) {
                continue;
            }

            if ($limit !== null && $plan->limit($limit) !== null && $plan->limit($limit) <= $inUse) {
                continue;
            }

            return $plan;
        }

        return null;
    }
}
