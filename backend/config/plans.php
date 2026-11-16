<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Plans (ADR-044)
|--------------------------------------------------------------------------
|
| What each plan allows. The prices were set by the owner on 2026-11-16 and
| are shown on the public pricing page (frontend/lib/plans.js); this file is
| the authority on what an account may DO. The two are kept in step by hand,
| and tests on both sides pin the same figures.
|
| `null` is no limit.
|
|   channels    connected stores and live API keys; orders typed in by hand
|               and Excel files never count
|   users       active users, the owner included
|   questions   Ask Baydar questions a calendar month, on the business clock
|   businesses  companies one owner may run (more than one is Pro only;
|               there is no way to add a second yet, so nothing enforces it)
|
| Features are on or off: the cash forecast and the financing report, which
| reads the forecast.
|
*/

return [

    /*
     * A business registered from now on starts here. Every business that
     * existed before plans did was moved to `pro` by the migration, so nobody
     * already using Baydar lost anything the day limits arrived.
     */
    'default' => env('PLAN_DEFAULT', 'free'),

    'plans' => [
        'free' => [
            'price' => '0',
            'limits' => ['channels' => 1, 'users' => 1, 'questions' => 20, 'businesses' => 1],
            'features' => ['forecasts' => false, 'financing' => false],
        ],
        'basic' => [
            'price' => '79',
            'limits' => ['channels' => 3, 'users' => 3, 'questions' => 200, 'businesses' => 1],
            'features' => ['forecasts' => false, 'financing' => false],
        ],
        'growth' => [
            'price' => '149',
            'limits' => ['channels' => null, 'users' => 10, 'questions' => 1000, 'businesses' => 1],
            'features' => ['forecasts' => true, 'financing' => true],
        ],
        'pro' => [
            'price' => '299',
            'limits' => ['channels' => null, 'users' => null, 'questions' => null, 'businesses' => null],
            'features' => ['forecasts' => true, 'financing' => true],
        ],
    ],

];
