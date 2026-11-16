<?php

declare(strict_types=1);

namespace App\Domain\Billing;

use App\Support\DomainException;

/**
 * The business's plan does not allow this (ADR-044).
 *
 * 402, not 403: the person may do this, their plan does not cover it, and
 * paying for a plan that does is the way through. The code tells the client
 * which: `plan.limit_reached` for a count, `plan.feature_unavailable` for a
 * feature. `limit`, `plan` and `upgrade` let it say so without guessing.
 */
final class PlanLimitReached extends DomainException
{
    public function __construct(
        string $message,
        string $errorCode,
        public readonly string $limit,
        public readonly string $plan,
        public readonly ?string $upgrade,
    ) {
        parent::__construct($message, $errorCode, 402);
    }
}
