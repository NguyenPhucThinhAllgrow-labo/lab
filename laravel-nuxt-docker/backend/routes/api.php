<?php

use App\Http\Controllers\Api\Admin\ChineseChessHistoryController;
use App\Http\Controllers\Api\Admin\DetectiveLeaderboardController;
use App\Http\Controllers\Api\Admin\TowerDefenseEnemyController;
use App\Http\Controllers\Api\Admin\TowerDefenseEffectTypeController;
use App\Http\Controllers\Api\Admin\TowerDefenseTowerController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChineseChessEngineController;
use App\Http\Controllers\Api\ChineseChessMlController;
use App\Http\Controllers\Api\ChineseChessRoomController;
use App\Http\Controllers\Api\DetectiveCaseController;
use App\Http\Controllers\Api\DetectiveHistoryController;
use App\Http\Controllers\Api\DetectiveProgressController;
use App\Http\Controllers\Api\TowerDefenseAssetController;
use App\Http\Controllers\Api\TowerDefenseMapController;
use App\Http\Controllers\Api\TowerDefenseTowerController as PublicTowerDefenseTowerController;
use App\Http\Controllers\Api\TowerDefenseEffectTypeController as PublicTowerDefenseEffectTypeController;
use Illuminate\Support\Facades\Route;

Route::get('/ping', function () {
    return response()->json([
        'message' => 'Laravel API OK',
    ]);
});

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);
Route::post('/admin/login', [AuthController::class, 'adminLogin']);
Route::post('/chinese-chess/ml/predict', ChineseChessMlController::class)
    ->middleware('throttle:120,1');
Route::post('/chinese-chess/engine/best-move', ChineseChessEngineController::class)
    ->middleware('throttle:120,1');

Route::prefix('tower-defense')->group(function (): void {
    Route::get('/maps', [TowerDefenseMapController::class, 'index']);
    Route::get('/maps/{map}', [TowerDefenseMapController::class, 'show']);
    Route::get('/assets', [TowerDefenseAssetController::class, 'index']);
    Route::get('/towers', [PublicTowerDefenseTowerController::class, 'index']);
    Route::get('/effect-types', [PublicTowerDefenseEffectTypeController::class, 'index']);
    Route::get('/assets/{asset}', [TowerDefenseAssetController::class, 'show'])
        ->where('asset', '.*');
});

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
    Route::get('/chinese-chess/history', [ChineseChessHistoryController::class, 'index']);
    Route::get('/chinese-chess/history/{round}', [ChineseChessHistoryController::class, 'show']);
    Route::delete('/chinese-chess/history/{round}', [ChineseChessHistoryController::class, 'destroy']);
    Route::get('/users', [AdminUserController::class, 'index']);
    Route::post('/users', [AdminUserController::class, 'store']);
    Route::put('/users/{user}', [AdminUserController::class, 'update']);
    Route::delete('/users/{user}', [AdminUserController::class, 'destroy']);
    Route::get('/pandora/leaderboard/best', [DetectiveLeaderboardController::class, 'best']);
    Route::get('/pandora/leaderboard/history', [DetectiveLeaderboardController::class, 'history']);
    Route::get('/tower-defense/maps', [App\Http\Controllers\Api\Admin\TowerDefenseMapController::class, 'index']);
    Route::post('/tower-defense/maps', [App\Http\Controllers\Api\Admin\TowerDefenseMapController::class, 'store']);
    Route::put('/tower-defense/maps/{map}', [App\Http\Controllers\Api\Admin\TowerDefenseMapController::class, 'update']);
    Route::delete('/tower-defense/maps/{map}', [App\Http\Controllers\Api\Admin\TowerDefenseMapController::class, 'destroy']);
    Route::get('/tower-defense/enemies', [TowerDefenseEnemyController::class, 'index']);
    Route::post('/tower-defense/enemies', [TowerDefenseEnemyController::class, 'store']);
    Route::put('/tower-defense/enemies/{enemy}', [TowerDefenseEnemyController::class, 'update']);
    Route::delete('/tower-defense/enemies/{enemy}', [TowerDefenseEnemyController::class, 'destroy']);
    Route::get('/tower-defense/towers', [TowerDefenseTowerController::class, 'index']);
    Route::post('/tower-defense/towers', [TowerDefenseTowerController::class, 'store']);
    Route::put('/tower-defense/towers/{tower}', [TowerDefenseTowerController::class, 'update']);
    Route::delete('/tower-defense/towers/{tower}', [TowerDefenseTowerController::class, 'destroy']);
    Route::get('/tower-defense/effect-types', [TowerDefenseEffectTypeController::class, 'index']);
    Route::post('/tower-defense/effect-types', [TowerDefenseEffectTypeController::class, 'store']);
    Route::put('/tower-defense/effect-types/{effectType}', [TowerDefenseEffectTypeController::class, 'update']);
    Route::delete('/tower-defense/effect-types/{effectType}', [TowerDefenseEffectTypeController::class, 'destroy']);
    Route::get('/tower-defense/assets', [App\Http\Controllers\Api\Admin\TowerDefenseAssetController::class, 'index']);
    Route::post('/tower-defense/assets', [App\Http\Controllers\Api\Admin\TowerDefenseAssetController::class, 'store']);
    Route::put('/tower-defense/assets/{asset}', [App\Http\Controllers\Api\Admin\TowerDefenseAssetController::class, 'update'])
        ->where('asset', '.*');
    Route::delete('/tower-defense/assets/{asset}', [App\Http\Controllers\Api\Admin\TowerDefenseAssetController::class, 'destroy'])
        ->where('asset', '.*');
});
