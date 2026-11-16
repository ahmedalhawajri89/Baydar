<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Domain\Billing\Plans;
use App\Http\Controllers\Controller;
use App\Models\BusinessSetting;
use App\Support\Tenancy\CurrentBusiness;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;

/**
 * The business's plan, its limits and what it uses against them (ADR-044).
 *
 * Open to every signed-in role: knowing that the questions run out on the
 * twentieth helps whoever is asking them, and nothing here is a cost.
 */
class PlanController extends Controller
{
    public function show(Plans $plans): JsonResponse
    {
        $business = CurrentBusiness::get()->id();
        $plan = $plans->for($business);
        $month = CarbonImmutable::now(BusinessSetting::current()->timezone ?: 'UTC')->format('Y-m');

        return response()->json(['data' => [
            'plan' => $plan->key,
            'limits' => $plan->limits,
            'features' => $plan->features,
            'usage' => $plans->usage($business, $month),
            'demo' => (bool) config('demo.enabled'),
        ]]);
    }
}
