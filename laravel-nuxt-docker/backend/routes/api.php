<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Admin\DetectiveLeaderboardController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\DetectiveCaseController;
use App\Http\Controllers\Api\DetectiveHistoryController;
use App\Http\Controllers\Api\DetectiveProgressController;
use Illuminate\Support\Facades\Route;

Route::get('/ping', function () {
    return response()->json([
        'message' => 'Laravel API OK',
    ]);
});

Route::post('/login', [AuthController::class, 'login']);
Route::post('/admin/login', [AuthController::class, 'adminLogin']);

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);
});

Route::middleware(['auth:sanctum', 'role:user'])->group(function (): void {
    Route::prefix('detective')->group(function (): void {
        Route::get('/cases', [DetectiveCaseController::class, 'index']);
        Route::get('/cases/{caseId}', [DetectiveCaseController::class, 'show']);
        Route::get('/progress', [DetectiveProgressController::class, 'index']);
        Route::get('/cases/{caseId}/progress', [DetectiveProgressController::class, 'show']);
        Route::put('/cases/{caseId}/progress', [DetectiveProgressController::class, 'update']);
        Route::delete('/cases/{caseId}/progress', [DetectiveProgressController::class, 'destroy']);
        Route::get('/history', [DetectiveHistoryController::class, 'index']);
        Route::get('/history/{historyId}', [DetectiveHistoryController::class, 'show']);
    });
});

Route::prefix('admin')->middleware(['auth:sanctum', 'role:admin'])->group(function (): void {
    Route::get('/user', [AuthController::class, 'user']);
    Route::get('/users', [AdminUserController::class, 'index']);
    Route::get('/pandora/leaderboard', [DetectiveLeaderboardController::class, 'index']);
});
