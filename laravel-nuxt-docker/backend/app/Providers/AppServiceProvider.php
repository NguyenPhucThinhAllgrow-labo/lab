<?php

namespace App\Providers;

use App\Repositories\Contracts\DetectiveCaseRepositoryInterface;
use App\Repositories\Contracts\DetectiveProgressRepositoryInterface;
use App\Repositories\EloquentDetectiveCaseRepository;
use App\Repositories\EloquentDetectiveProgressRepository;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(
            DetectiveCaseRepositoryInterface::class,
            EloquentDetectiveCaseRepository::class,
        );

        $this->app->bind(
            DetectiveProgressRepositoryInterface::class,
            EloquentDetectiveProgressRepository::class,
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
