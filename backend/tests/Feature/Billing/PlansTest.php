<?php

declare(strict_types=1);

use App\Domain\Billing\PlanLimitReached;
use App\Models\Business;
use App\Models\Integration;
use App\Models\User;
use App\Support\Tenancy\CurrentBusiness;
use Illuminate\Support\Facades\DB;

/*
|--------------------------------------------------------------------------
| Plans (ADR-044)
|--------------------------------------------------------------------------
|
| A plan limits what is ADDED, never what is there: a business at its limit
| keeps everything it has and is refused only the next one. Every refusal is
| a 402 that names the limit, the plan, and the cheapest plan that allows it.
|
*/

function onPlan(string $plan): void
{
    Business::query()->whereKey(CurrentBusiness::get()->id())->update(['plan' => $plan]);
}

function aStore(string $id = 'store-1'): Integration
{
    return Integration::query()->create([
        'provider' => 'salla',
        'external_account_id' => $id,
        'status' => Integration::STATUS_CONNECTED,
    ]);
}

it('starts a newly registered business on the free plan', function (): void {
    $this->postJson('/api/v1/auth/register', [
        'business_name' => 'Dates and More',
        'name' => 'Noura',
        'email' => 'noura@example.test',
        'password' => 'a-long-enough-password-1',
        'password_confirmation' => 'a-long-enough-password-1',
    ])->assertCreated();

    expect(Business::query()->where('name', 'Dates and More')->value('plan'))->toBe('free');
});

it('refuses a second sales channel on the free plan, and names the plan that allows it', function (): void {
    onPlan('free');
    aStore();

    $this->actingAs(User::factory()->owner()->create())
        ->postJson('/api/v1/integrations/api-keys', ['name' => 'Till'])
        ->assertStatus(402)
        ->assertJsonPath('code', 'plan.limit_reached')
        ->assertJsonPath('meta', ['limit' => 'channels', 'plan' => 'free', 'upgrade' => 'basic']);
});

it('refuses another store however it is connected, but never a reconnection', function (): void {
    onPlan('free');
    $store = aStore();

    expect(fn () => aStore('store-2'))->toThrow(PlanLimitReached::class);

    // The store already connected keeps working: refreshing it is an update.
    $store->forceFill(['status' => Integration::STATUS_EXPIRED])->save();
    $store->forceFill(['status' => Integration::STATUS_CONNECTED])->save();

    expect(Integration::query()->count())->toBe(1);
});

it('allows three channels on basic and no limit on growth', function (): void {
    onPlan('basic');
    aStore('a');
    aStore('b');
    aStore('c');
    expect(fn () => aStore('d'))->toThrow(PlanLimitReached::class);

    onPlan('growth');
    aStore('d');
    expect(Integration::query()->count())->toBe(4);
});

it('refuses another active user at the limit, and a reactivation too', function (): void {
    onPlan('free');
    $owner = User::factory()->owner()->create();

    $this->actingAs($owner)->postJson('/api/v1/users', [
        'name' => 'Salem',
        'email' => 'salem@example.test',
        'password' => 'a-long-enough-password-1',
        'password_confirmation' => 'a-long-enough-password-1',
        'role' => 'staff',
    ])->assertStatus(402)->assertJsonPath('meta.limit', 'users');

    $idle = User::factory()->staff()->create(['is_active' => false]);
    $this->actingAs($owner)->postJson("/api/v1/users/{$idle->id}/activate")
        ->assertStatus(402)->assertJsonPath('meta.upgrade', 'basic');
});

it('stops Ask Baydar at the month’s questions, before any model call', function (): void {
    onPlan('free');
    config(['assistant.api_key' => 'test-key']);
    DB::table('assistant_usage')->insert([
        'business_id' => CurrentBusiness::get()->id(),
        'month' => now()->format('Y-m'),
        'tokens' => 0,
        'questions' => 20,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->actingAs(User::factory()->owner()->create())
        ->postJson('/api/v1/assistant/messages', ['message' => 'Did I make money?'])
        ->assertStatus(402)
        ->assertJsonPath('meta', ['limit' => 'questions', 'plan' => 'free', 'upgrade' => 'basic']);
});

it('keeps the cash forecast and the financing report for growth and up', function (): void {
    $owner = User::factory()->owner()->create();

    onPlan('basic');
    $this->actingAs($owner)->getJson('/api/v1/forecasts/cash')
        ->assertStatus(402)
        ->assertJsonPath('code', 'plan.feature_unavailable')
        ->assertJsonPath('meta.upgrade', 'growth');
    $this->actingAs($owner)->getJson('/api/v1/reports/financing')
        ->assertStatus(402)
        ->assertJsonPath('meta.limit', 'financing');

    onPlan('growth');
    $this->actingAs($owner)->getJson('/api/v1/forecasts/cash')->assertOk();
});

it('tells every role its plan, its limits and what it uses', function (): void {
    onPlan('basic');
    aStore();

    $this->actingAs(User::factory()->staff()->create())
        ->getJson('/api/v1/plan')
        ->assertOk()
        ->assertJsonPath('data.plan', 'basic')
        ->assertJsonPath('data.limits.channels', 3)
        ->assertJsonPath('data.features.forecasts', false)
        ->assertJsonPath('data.usage.channels', 1);
});

it('says on /me what the plan offers', function (): void {
    onPlan('growth');

    $this->actingAs(User::factory()->owner()->create())
        ->getJson('/api/v1/me')
        ->assertOk()
        ->assertJsonPath('data.business.plan', ['key' => 'growth', 'features' => ['forecasts' => true, 'financing' => true]]);
});

it('treats every business as Pro on the public demo', function (): void {
    onPlan('free');
    config(['demo.enabled' => true]);

    $this->actingAs(User::factory()->owner()->create())
        ->getJson('/api/v1/forecasts/cash')
        ->assertOk();
});

it('moves a business to another plan from the console', function (): void {
    $id = CurrentBusiness::get()->id();

    $this->artisan('plans:assign', ['business' => (string) $id, 'plan' => 'growth'])->assertSuccessful();
    expect(Business::query()->whereKey($id)->value('plan'))->toBe('growth');

    $this->artisan('plans:assign', ['business' => (string) $id, 'plan' => 'gold'])->assertFailed();
});

it('holds the limits the pricing page shows (frontend/lib/plans.js)', function (): void {
    expect(collect(config('plans.plans'))->map(fn (array $plan): array => [$plan['price'], $plan['limits']])->all())->toBe([
        'free' => ['0', ['channels' => 1, 'users' => 1, 'questions' => 20, 'businesses' => 1]],
        'basic' => ['79', ['channels' => 3, 'users' => 3, 'questions' => 200, 'businesses' => 1]],
        'growth' => ['149', ['channels' => null, 'users' => 10, 'questions' => 1000, 'businesses' => 1]],
        'pro' => ['299', ['channels' => null, 'users' => null, 'questions' => null, 'businesses' => null]],
    ]);
});
