<?php

namespace App\Services;

class ChineseChessRepetitionService
{
    public function __construct(private readonly ChineseChessEngine $engine) {}

    public function initialHistory(array $board, string $turn): array
    {
        return [[
            'key' => $this->positionKey($board, $turn),
            'turn' => $turn,
            'move_number' => 0,
            'mover' => null,
            'gave_check' => false,
            'chases' => [],
        ]];
    }

    public function recordMove(
        array $history,
        array $before,
        array $after,
        array $movedPiece,
        string $nextTurn,
        int $moveNumber,
    ): array {
        if ($history === []) {
            $history = $this->initialHistory($before, $movedPiece['color']);
        }

        $beforeRelations = $this->indexRelations($this->engine->chaseRelations($before, $movedPiece['color']));
        $afterRelations = $this->engine->chaseRelations($after, $movedPiece['color']);
        $chases = array_values(array_filter(
            $afterRelations,
            static fn (array $relation): bool => $relation['attacker_id'] === $movedPiece['id']
                || ! isset($beforeRelations[$relation['attacker_id'].'>'.$relation['target_id']])
                || ($relation['prohibited'] && ! $beforeRelations[$relation['attacker_id'].'>'.$relation['target_id']]['prohibited'])
        ));

        $gaveCheck = $this->engine->isInCheck($after, $nextTurn);
        $history[] = [
            'key' => $this->positionKey($after, $nextTurn),
            'turn' => $nextTurn,
            'move_number' => $moveNumber,
            'mover' => $movedPiece['color'],
            'piece_id' => $movedPiece['id'],
            'gave_check' => $gaveCheck,
            'chases' => $chases,
            'action' => $gaveCheck ? ($chases === [] ? 'check' : 'check_chase') : ($chases === [] ? 'quiet' : 'chase'),
        ];

        // Enough for all practical cycles while preventing an unbounded JSON column.
        $history = array_slice($history, -256);

        return ['history' => $history, 'state' => $this->adjudicate($history)];
    }

    public function adjudicate(array $history): array
    {
        if (count($history) < 5) {
            return $this->noneState();
        }

        $lastIndex = array_key_last($history);
        $key = $history[$lastIndex]['key'];
        $occurrences = [];
        foreach ($history as $index => $position) {
            if (($position['key'] ?? null) === $key) {
                $occurrences[] = $index;
            }
        }

        $count = count($occurrences);
        if ($count < 2) {
            return $this->noneState();
        }

        $cycleStart = $occurrences[$count - 2];
        $cycle = array_slice($history, $cycleStart + 1, $lastIndex - $cycleStart);
        $red = $this->classify($cycle, 'red');
        $black = $this->classify($cycle, 'black');
        $obligated = $red['severity'] === $black['severity']
            ? null
            : ($red['severity'] > $black['severity'] ? 'red' : 'black');

        if ($count === 2) {
            return [
                'status' => 'warning',
                'count' => 2,
                'obligated_color' => $obligated,
                'reason' => $obligated ? $this->reasonFor($obligated === 'red' ? $red : $black) : 'repetition_draw',
                'red' => $red,
                'black' => $black,
            ];
        }

        return [
            // Do not automatically forfeit the offender. Keep the game alive
            // and expose a persistent warning until that side breaks the loop.
            'status' => $obligated ? 'warning' : 'draw',
            'count' => $count,
            'obligated_color' => $obligated,
            'violator_color' => $obligated,
            'reason' => $obligated ? $this->reasonFor($obligated === 'red' ? $red : $black) : 'repetition_draw',
            'red' => $red,
            'black' => $black,
        ];
    }

    public function positionKey(array $board, string $turn): string
    {
        $pieces = array_map(
            static fn (array $piece): string => implode(':', [$piece['color'], $piece['type'], $piece['row'], $piece['col']]),
            $board
        );
        sort($pieces);

        return $turn.'|'.implode('|', $pieces);
    }

    private function classify(array $cycle, string $color): array
    {
        $moves = array_values(array_filter($cycle, static fn (array $record): bool => ($record['mover'] ?? null) === $color));
        if ($moves === []) {
            return ['kind' => 'none', 'severity' => 0, 'attackers' => [], 'targets' => []];
        }

        $allCheck = collect($moves)->every(fn (array $move): bool => (bool) ($move['gave_check'] ?? false));
        $allCoercive = collect($moves)->every(fn (array $move): bool => (bool) ($move['gave_check'] ?? false) || $this->prohibitedChases($move) !== []);
        $hasCheck = collect($moves)->contains(fn (array $move): bool => (bool) ($move['gave_check'] ?? false));
        $hasChase = collect($moves)->contains(fn (array $move): bool => $this->prohibitedChases($move) !== []);

        $relations = collect($moves)->flatMap(fn (array $move): array => $this->prohibitedChases($move));
        $attackers = $relations->pluck('attacker_id')->filter()->unique()->values()->all();
        $targets = $relations->pluck('target_id')->filter()->unique()->values()->all();

        if ($allCheck && $hasChase) {
            return compact('attackers', 'targets') + ['kind' => 'check_chase', 'severity' => 3];
        }
        if ($allCheck) {
            return compact('attackers', 'targets') + ['kind' => 'perpetual_check', 'severity' => 3];
        }
        if ($allCoercive && $hasCheck && $hasChase) {
            return compact('attackers', 'targets') + ['kind' => 'check_chase', 'severity' => 2];
        }
        if ($allCoercive && $hasChase) {
            return compact('attackers', 'targets') + ['kind' => 'perpetual_chase', 'severity' => 1];
        }

        return compact('attackers', 'targets') + ['kind' => 'none', 'severity' => 0];
    }

    private function reasonFor(array $classification): string
    {
        return match ($classification['kind']) {
            'perpetual_check' => 'perpetual_check',
            'check_chase' => 'perpetual_check_chase',
            default => 'perpetual_chase',
        };
    }

    private function indexRelations(array $relations): array
    {
        $indexed = [];
        foreach ($relations as $relation) {
            $indexed[$relation['attacker_id'].'>'.$relation['target_id']] = $relation;
        }

        return $indexed;
    }

    private function prohibitedChases(array $move): array
    {
        return array_values(array_filter(
            $move['chases'] ?? [],
            static fn (array $relation): bool => (bool) ($relation['prohibited'] ?? false)
        ));
    }

    private function noneState(): array
    {
        return [
            'status' => 'none',
            'count' => 1,
            'obligated_color' => null,
            'reason' => null,
        ];
    }
}
