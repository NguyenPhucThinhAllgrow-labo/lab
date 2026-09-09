<?php

namespace App\Services;

use App\Models\DetectiveCase;
use App\Models\DetectiveCompletionHistory;
use App\Repositories\Contracts\DetectiveLeaderboardRepositoryInterface;
use Illuminate\Support\Collection;

class DetectiveLeaderboardService
{
    public function __construct(
        private readonly DetectiveLeaderboardRepositoryInterface $leaderboard,
    ) {}

    public function get(?string $caseId = null, int $limit = 100, string $locale = 'vi'): array
    {
        $histories = $this->leaderboard->completionHistories($caseId);
        $historyRuns = $caseId
            ? $this->leaderboard->completionHistories()
            : $histories;

        $attemptNumbers = [];
        $allRuns = $historyRuns
            ->sort(function (DetectiveCompletionHistory $left, DetectiveCompletionHistory $right): int {
                return (($left->completed_at?->getTimestamp() ?? 0)
                    <=> ($right->completed_at?->getTimestamp() ?? 0))
                    ?: ($left->id <=> $right->id);
            })
            ->map(function (DetectiveCompletionHistory $history) use (&$attemptNumbers, $locale): array {
                $key = "{$history->user_id}:{$history->case_id}";
                $attemptNumbers[$key] = ($attemptNumbers[$key] ?? 0) + 1;

                return [
                    ...$this->historyData($history, $locale),
                    'attempt_number' => $attemptNumbers[$key],
                ];
            })
            ->sort(function (array $left, array $right): int {
                return (strtotime((string) $right['completed_at'])
                    <=> strtotime((string) $left['completed_at']))
                    ?: ($right['history_id'] <=> $left['history_id']);
            })
            ->values();

        $bestRuns = $histories
            ->groupBy(fn (DetectiveCompletionHistory $history): string => "{$history->user_id}:{$history->case_id}")
            ->map(function (Collection $attempts): array {
                $best = $attempts->sort(function (DetectiveCompletionHistory $left, DetectiveCompletionHistory $right): int {
                    $scoreComparison = $this->score($right) <=> $this->score($left);

                    if ($scoreComparison !== 0) {
                        return $scoreComparison;
                    }

                    $timeComparison = $left->elapsed_seconds <=> $right->elapsed_seconds;

                    if ($timeComparison !== 0) {
                        return $timeComparison;
                    }

                    return ($left->completed_at?->getTimestamp() ?? 0)
                        <=> ($right->completed_at?->getTimestamp() ?? 0);
                })->first();

                return [
                    'history' => $best,
                    'attempts' => $attempts->count(),
                ];
            })
            ->groupBy(fn (array $result): string => $result['history']->case_id)
            ->sortBy(function (Collection $caseRuns): int {
                /** @var DetectiveCompletionHistory $history */
                $history = $caseRuns->first()['history'];

                return (int) ($history->detectiveCase?->sort_order ?? PHP_INT_MAX);
            })
            ->flatMap(function (Collection $caseRuns) use ($limit, $locale): Collection {
                return $caseRuns
                    ->sort(function (array $left, array $right): int {
                        /** @var DetectiveCompletionHistory $leftHistory */
                        $leftHistory = $left['history'];
                        /** @var DetectiveCompletionHistory $rightHistory */
                        $rightHistory = $right['history'];

                        return ($this->score($rightHistory) <=> $this->score($leftHistory))
                            ?: ($leftHistory->elapsed_seconds <=> $rightHistory->elapsed_seconds)
                            ?: (($leftHistory->completed_at?->getTimestamp() ?? 0)
                                <=> ($rightHistory->completed_at?->getTimestamp() ?? 0));
                    })
                    ->take($limit)
                    ->values()
                    ->map(function (array $result, int $index) use ($locale): array {
                        /** @var DetectiveCompletionHistory $history */
                        $history = $result['history'];

                        return [
                            'rank' => $index + 1,
                            ...$this->historyData($history, $locale),
                            'attempts' => $result['attempts'],
                        ];
                    });
            })
            ->values();

        return [
            'summary' => [
                'players' => $histories->pluck('user_id')->unique()->count(),
                'completions' => $histories->count(),
                'average_score' => round($histories->avg(fn (DetectiveCompletionHistory $history): int => $this->score($history)) ?? 0, 1),
                'average_elapsed_seconds' => (int) round($histories->avg('elapsed_seconds') ?? 0),
                'best_score' => $histories->max(fn (DetectiveCompletionHistory $history): int => $this->score($history)) ?? 0,
            ],
            'history' => $allRuns,
            'cases' => $this->leaderboard->cases()
                ->map(fn (DetectiveCase $case): array => [
                    'id' => $case->id,
                    'title' => $this->localizedTitle($case, $locale),
                ])
                ->values(),
            'leaderboard' => $bestRuns,
        ];
    }

    private function historyData(DetectiveCompletionHistory $history, string $locale): array
    {
        $statistics = $history->statistics ?? [];

        return [
            'history_id' => $history->id,
            'run_id' => $history->run_id,
            'player' => [
                'id' => $history->user?->id,
                'name' => $history->user?->name ?? 'Unknown player',
                'email' => $history->user?->email,
            ],
            'case' => [
                'id' => $history->case_id,
                'title' => $this->localizedTitle($history->detectiveCase, $locale),
            ],
            'score' => $this->score($history),
            'grade' => (string) ($statistics['rank'] ?? 'C'),
            'elapsed_seconds' => (int) $history->elapsed_seconds,
            'hint_count' => (int) ($statistics['hint_count'] ?? 0),
            'incorrect_link_attempts' => (int) ($statistics['incorrect_link_attempts'] ?? 0),
            'command_count' => (int) ($statistics['command_count'] ?? 0),
            'started_at' => $history->started_at?->toISOString(),
            'completed_at' => $history->completed_at?->toISOString(),
        ];
    }

    private function score(DetectiveCompletionHistory $history): int
    {
        return (int) ($history->statistics['score'] ?? 0);
    }

    private function localizedTitle(?DetectiveCase $case, string $locale): string
    {
        if (!$case) {
            return 'Unknown case';
        }

        $title = $case->title ?? [];

        return (string) ($title[$locale] ?? $title['vi'] ?? $title['en'] ?? $case->id);
    }
}
