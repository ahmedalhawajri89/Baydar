<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Domain\Billing\Plans;
use App\Models\BusinessSetting;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role->value,
            'role_label' => $this->role->label(),
            'is_active' => $this->is_active,
            'last_login_at' => $this->last_login_at?->toIso8601String(),
            'email_verified' => $this->email_verified_at !== null,

            // Drive the interface language and digits on every device the user
            // signs in from (Phase 07).
            'locale' => $this->locale ?? 'en',
            'numerals' => $this->numerals ?? 'latn',
            'morning_brief' => (bool) ($this->morning_brief ?? false),

            // The frontend's only source for permission decisions. There is no
            // second copy of the role → ability table in JavaScript
            // (ROLES_AND_PERMISSIONS.md §5.8).
            'abilities' => $this->abilities(),

            /*
             * The business the signed-in user acts for: its name, and the
             * currency every amount on every screen is in (ADR-023). Only on
             * the user's own record — a list of colleagues does not repeat it.
             */
            'business' => $this->when($request->user()?->getAuthIdentifier() === $this->id, fn (): array => [
                'id' => $this->business_id,
                'name' => BusinessSetting::current()->company_name,
                'currency' => BusinessSetting::current()->currency,
                'currency_decimals' => (int) BusinessSetting::current()->currency_decimals,
                // Where it trades, and whether the owner has finished the
                // setup wizard; until then the owner is taken back to it.
                'country' => $this->business?->country,
                'onboarded' => $this->business?->onboarded_at !== null,
                // What the plan offers, so a screen can say which plan has it
                // before the request is refused (ADR-044).
                'plan' => $this->planSummary(),
            ]),
        ];
    }

    /** @return array{key: string, features: array<string, bool>} */
    private function planSummary(): array
    {
        $plan = app(Plans::class)->for((int) $this->business_id);

        return ['key' => $plan->key, 'features' => $plan->features];
    }
}
