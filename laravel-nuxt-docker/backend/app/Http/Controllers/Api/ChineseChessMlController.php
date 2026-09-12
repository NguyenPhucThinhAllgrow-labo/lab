<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class ChineseChessMlController extends Controller
{
    /**
     * Rank legal moves prepared by the game client with a versioned model.
     * This endpoint never mutates a match; the normal chess engine remains
     * responsible for legality and for applying the selected move.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'candidates' => ['required', 'array', 'min:1', 'max:256'],
            'candidates.*.id' => ['required', 'string', 'max:100', 'distinct'],
            'candidates.*.features' => ['required', 'array'],
            'candidates.*.features.*' => ['required', 'numeric', 'between:-1000000,1000000'],
        ]);

        try {
            $model = $this->loadModel();
            $ranked = collect($payload['candidates'])
                ->map(function (array $candidate) use ($model): array {
                    $score = (float) ($model['bias'] ?? 0.0);

                    foreach ($model['weights'] as $feature => $weight) {
                        $score += (float) $weight * (float) ($candidate['features'][$feature] ?? 0.0);
                    }

                    return ['id' => $candidate['id'], 'score' => $score];
                })
                ->sortByDesc('score')
                ->values();

            $best = $ranked->first();
            $secondScore = (float) ($ranked->get(1)['score'] ?? $best['score']);
            $margin = (float) $best['score'] - $secondScore;

            return response()->json([
                'candidate_id' => $best['id'],
                'score' => round((float) $best['score'], 6),
                'confidence' => round(1 / (1 + exp(-max(-20.0, min(20.0, $margin)))), 6),
                'model' => [
                    'version' => $model['version'],
                    'algorithm' => $model['algorithm'],
                ],
            ]);
        } catch (Throwable $exception) {
            Log::warning('Chinese Chess ML inference unavailable.', [
                'message' => $exception->getMessage(),
            ]);

            return response()->json([
                'message' => 'Mô hình Machine Learning hiện không khả dụng.',
            ], 503);
        }
    }

    /** @return array{version: string, algorithm: string, weights: array<string, float|int>, bias?: float|int} */
    private function loadModel(): array
    {
        $path = (string) config('services.chinese_chess_ml.model_path');
        $contents = is_file($path) ? file_get_contents($path) : false;
        $model = $contents === false ? null : json_decode($contents, true);

        if (
            ! is_array($model)
            || ! is_string($model['version'] ?? null)
            || ! is_string($model['algorithm'] ?? null)
            || ! is_array($model['weights'] ?? null)
        ) {
            throw new RuntimeException('Invalid or missing Chinese Chess ML model.');
        }

        return $model;
    }
}
