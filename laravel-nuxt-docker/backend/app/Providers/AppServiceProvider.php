<?php

namespace App\Providers;

use App\Repositories\Contracts\DetectiveCaseRepositoryInterface;
use App\Repositories\Contracts\DetectiveHistoryRepositoryInterface;
use App\Repositories\Contracts\DetectiveLeaderboardRepositoryInterface;
use App\Repositories\Contracts\DetectiveProgressRepositoryInterface;
use App\Repositories\Contracts\UserRepositoryInterface;
use App\Repositories\EloquentDetectiveCaseRepository;
use App\Repositories\EloquentDetectiveHistoryRepository;
use App\Repositories\EloquentDetectiveLeaderboardRepository;
use App\Repositories\EloquentDetectiveProgressRepository;
use App\Repositories\EloquentUserRepository;
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

        $this->app->bind(
            DetectiveHistoryRepositoryInterface::class,
            EloquentDetectiveHistoryRepository::class,
        );

        $this->app->bind(
            DetectiveLeaderboardRepositoryInterface::class,
            EloquentDetectiveLeaderboardRepository::class,
        );

        $this->app->bind(
            UserRepositoryInterface::class,
            EloquentUserRepository::class,
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
