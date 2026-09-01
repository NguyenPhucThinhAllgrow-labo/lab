<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DetectiveCaseController;
use App\Http\Controllers\Api\DetectiveProgressController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/ping', function () {
    return response()->json([
        'message' => 'Laravel API OK',
    ]);
});

Route::post('/login', [AuthController::class, 'login']);

Route::prefix('detective')->group(function (): void {
    Route::get('/cases', [DetectiveCaseController::class, 'index']);
    Route::get('/cases/{caseId}', [DetectiveCaseController::class, 'show']);
});

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::prefix('detective')->group(function (): void {
        Route::get('/progress', [DetectiveProgressController::class, 'index']);
        Route::get('/cases/{caseId}/progress', [DetectiveProgressController::class, 'show']);
        Route::put('/cases/{caseId}/progress', [DetectiveProgressController::class, 'update']);
        Route::delete('/cases/{caseId}/progress', [DetectiveProgressController::class, 'destroy']);
    });
});

Route::post('/debug-session', function (Request $request) {
    return response()->json([
        'session_id' => $request->session()->getId(),
        'session_token' => $request->session()->token(),
        'xsrf_cookie' => $request->cookie('XSRF-TOKEN'),
        'session_cookie' => $request->cookie('laravel-session'),
    ]);
});
