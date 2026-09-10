<?php

use App\Http\Controllers\Api\Admin\DetectiveLeaderboardController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChineseChessRoomController;
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
Route::post('/register', [AuthController::class, 'register']);
Route::post('/admin/login', [AuthController::class, 'adminLogin']);

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);
});

Route::middleware(['auth:sanctum', 'role:user'])->group(function (): void {
    Route::prefix('chinese-chess/rooms')->group(function (): void {
        Route::post('/', [ChineseChessRoomController::class, 'create']);
        Route::post('/{code}/join', [ChineseChessRoomController::class, 'join']);
        Route::get('/{code}', [ChineseChessRoomController::class, 'show']);
        Route::post('/{code}/ready', [ChineseChessRoomController::class, 'ready']);
        Route::post('/{code}/moves', [ChineseChessRoomController::class, 'move']);
        Route::post('/{code}/undo', [ChineseChessRoomController::class, 'undo']);
        Route::post('/{code}/undo/respond', [ChineseChessRoomController::class, 'respondToUndo']);
        Route::post('/{code}/pause', [ChineseChessRoomController::class, 'pause']);
        Route::post('/{code}/resume', [ChineseChessRoomController::class, 'resume']);
        Route::post('/{code}/surrender', [ChineseChessRoomController::class, 'surrender']);
        Route::post('/{code}/leave', [ChineseChessRoomController::class, 'leave']);
        Route::post('/{code}/rematch', [ChineseChessRoomController::class, 'rematch']);
    });

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
    Route::get('/chinese-chess/history', [\App\Http\Controllers\Api\Admin\ChineseChessHistoryController::class, 'index']);
    Route::get('/chinese-chess/history/{round}', [\App\Http\Controllers\Api\Admin\ChineseChessHistoryController::class, 'show']);
    Route::get('/users', [AdminUserController::class, 'index']);
    Route::get('/pandora/leaderboard/best', [DetectiveLeaderboardController::class, 'best']);
    Route::get('/pandora/leaderboard/history', [DetectiveLeaderboardController::class, 'history']);
});
