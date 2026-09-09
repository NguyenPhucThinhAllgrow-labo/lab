<?php

namespace App\Services;

class ChineseChessEngine
{
    public function initialBoard(): array
    {
        $pieces = [];
        $add = static function (string $id, string $type, string $color, int $row, int $col) use (&$pieces): void {
            $pieces[] = compact('id', 'type', 'color', 'row', 'col');
        };

        foreach ([0 => 'chariot', 1 => 'horse', 2 => 'elephant', 3 => 'advisor', 4 => 'general', 5 => 'advisor', 6 => 'elephant', 7 => 'horse', 8 => 'chariot'] as $col => $type) {
            $suffix = $type === 'general' ? '' : '-'.($col < 4 ? '1' : '2');
            $add("black-{$type}{$suffix}", $type, 'black', 0, $col);
            $add("red-{$type}{$suffix}", $type, 'red', 9, $col);
        }

        foreach ([1, 7] as $index => $col) {
            $add('black-cannon-'.($index + 1), 'cannon', 'black', 2, $col);
            $add('red-cannon-'.($index + 1), 'cannon', 'red', 7, $col);
        }

        foreach ([0, 2, 4, 6, 8] as $index => $col) {
            $add('black-soldier-'.($index + 1), 'soldier', 'black', 3, $col);
            $add('red-soldier-'.($index + 1), 'soldier', 'red', 6, $col);
        }

        return $pieces;
    }

    public function move(array $board, string $pieceId, int $row, int $col): array
    {
        $captured = $this->pieceAt($board, $row, $col);
        $next = array_values(array_filter($board, fn (array $piece): bool => $piece['id'] !== ($captured['id'] ?? null)));

        foreach ($next as &$piece) {
            if ($piece['id'] === $pieceId) {
                $piece['row'] = $row;
                $piece['col'] = $col;
                break;
            }
        }

        return [$next, $captured];
    }

    public function isLegalMove(array $board, array $piece, int $row, int $col): bool
    {
        $allowed = collect($this->pseudoMoves($board, $piece))
            ->contains(fn (array $move): bool => $move['row'] === $row && $move['col'] === $col);

        if (! $allowed) {
            return false;
        }

        [$next] = $this->move($board, $piece['id'], $row, $col);

        return ! $this->isInCheck($next, $piece['color']);
    }

    public function isInCheck(array $board, string $color): bool
    {
        $general = collect($board)->first(fn (array $piece): bool => $piece['type'] === 'general' && $piece['color'] === $color);
        if (! $general || $this->generalsFace($board)) {
            return true;
        }

        foreach ($board as $piece) {
            if ($piece['color'] === $color) {
                continue;
            }
            foreach ($this->pseudoMoves($board, $piece) as $move) {
                if ($move['row'] === $general['row'] && $move['col'] === $general['col']) {
                    return true;
                }
            }
        }

        return false;
    }

    public function hasLegalMove(array $board, string $color): bool
    {
        foreach ($board as $piece) {
            if ($piece['color'] !== $color) {
                continue;
            }
            foreach ($this->pseudoMoves($board, $piece) as $move) {
                if ($this->isLegalMove($board, $piece, $move['row'], $move['col'])) {
                    return true;
                }
            }
        }

        return false;
    }

    public function piece(array $board, string $id): ?array
    {
        return collect($board)->first(fn (array $piece): bool => $piece['id'] === $id);
    }

    private function pseudoMoves(array $board, array $piece): array
    {
        return match ($piece['type']) {
            'general' => $this->stepMoves($board, $piece, [[-1, 0], [1, 0], [0, -1], [0, 1]], true),
            'advisor' => $this->stepMoves($board, $piece, [[-1, -1], [-1, 1], [1, -1], [1, 1]], true),
            'elephant' => $this->elephantMoves($board, $piece),
            'horse' => $this->horseMoves($board, $piece),
            'chariot' => $this->lineMoves($board, $piece, false),
            'cannon' => $this->lineMoves($board, $piece, true),
            'soldier' => $this->soldierMoves($board, $piece),
            default => [],
        };
    }

    private function stepMoves(array $board, array $piece, array $directions, bool $palace): array
    {
        $moves = [];
        foreach ($directions as [$dr, $dc]) {
            $row = $piece['row'] + $dr;
            $col = $piece['col'] + $dc;
            if (! $this->inside($row, $col) || ($palace && ! $this->insidePalace($piece['color'], $row, $col))) {
                continue;
            }
            $target = $this->pieceAt($board, $row, $col);
            if (! $target || $target['color'] !== $piece['color']) {
                $moves[] = compact('row', 'col');
            }
        }

        return $moves;
    }

    private function elephantMoves(array $board, array $piece): array
    {
        $moves = [];
        foreach ([[-2, -2], [-2, 2], [2, -2], [2, 2]] as [$dr, $dc]) {
            $row = $piece['row'] + $dr;
            $col = $piece['col'] + $dc;
            $crossedRiver = ($piece['color'] === 'black' && $row > 4) || ($piece['color'] === 'red' && $row < 5);
            if (! $this->inside($row, $col) || $crossedRiver || $this->pieceAt($board, $piece['row'] + intdiv($dr, 2), $piece['col'] + intdiv($dc, 2))) {
                continue;
            }
            $target = $this->pieceAt($board, $row, $col);
            if (! $target || $target['color'] !== $piece['color']) {
                $moves[] = compact('row', 'col');
            }
        }

        return $moves;
    }

    private function horseMoves(array $board, array $piece): array
    {
        $moves = [];
        $options = [[-2, -1, -1, 0], [-2, 1, -1, 0], [2, -1, 1, 0], [2, 1, 1, 0], [-1, -2, 0, -1], [1, -2, 0, -1], [-1, 2, 0, 1], [1, 2, 0, 1]];
        foreach ($options as [$dr, $dc, $br, $bc]) {
            if ($this->pieceAt($board, $piece['row'] + $br, $piece['col'] + $bc)) {
                continue;
            }
            $row = $piece['row'] + $dr;
            $col = $piece['col'] + $dc;
            $target = $this->pieceAt($board, $row, $col);
            if ($this->inside($row, $col) && (! $target || $target['color'] !== $piece['color'])) {
                $moves[] = compact('row', 'col');
            }
        }

        return $moves;
    }

    private function lineMoves(array $board, array $piece, bool $cannon): array
    {
        $moves = [];
        foreach ([[-1, 0], [1, 0], [0, -1], [0, 1]] as [$dr, $dc]) {
            $row = $piece['row'] + $dr;
            $col = $piece['col'] + $dc;
            $screen = false;
            while ($this->inside($row, $col)) {
                $target = $this->pieceAt($board, $row, $col);
                if (! $cannon) {
                    if (! $target) {
                        $moves[] = compact('row', 'col');
                    } else {
                        if ($target['color'] !== $piece['color']) {
                            $moves[] = compact('row', 'col');
                        }
                        break;
                    }
                } elseif (! $screen) {
                    if (! $target) {
                        $moves[] = compact('row', 'col');
                    } else {
                        $screen = true;
                    }
                } elseif ($target) {
                    if ($target['color'] !== $piece['color']) {
                        $moves[] = compact('row', 'col');
                    }
                    break;
                }
                $row += $dr;
                $col += $dc;
            }
        }

        return $moves;
    }

    private function soldierMoves(array $board, array $piece): array
    {
        $forward = $piece['color'] === 'red' ? -1 : 1;
        $crossed = $piece['color'] === 'red' ? $piece['row'] <= 4 : $piece['row'] >= 5;
        $directions = [[$forward, 0], ...($crossed ? [[0, -1], [0, 1]] : [])];

        return $this->stepMoves($board, $piece, $directions, false);
    }

    private function pieceAt(array $board, int $row, int $col): ?array
    {
        return collect($board)->first(fn (array $piece): bool => $piece['row'] === $row && $piece['col'] === $col);
    }

    private function inside(int $row, int $col): bool
    {
        return $row >= 0 && $row < 10 && $col >= 0 && $col < 9;
    }

    private function insidePalace(string $color, int $row, int $col): bool
    {
        return $col >= 3 && $col <= 5 && ($color === 'black' ? $row >= 0 && $row <= 2 : $row >= 7 && $row <= 9);
    }

    private function generalsFace(array $board): bool
    {
        $red = collect($board)->first(fn (array $piece): bool => $piece['type'] === 'general' && $piece['color'] === 'red');
        $black = collect($board)->first(fn (array $piece): bool => $piece['type'] === 'general' && $piece['color'] === 'black');
        if (! $red || ! $black || $red['col'] !== $black['col']) {
            return false;
        }
        $start = min($red['row'], $black['row']);
        $end = max($red['row'], $black['row']);
        for ($row = $start + 1; $row < $end; $row++) {
            if ($this->pieceAt($board, $row, $red['col'])) {
                return false;
            }
        }

        return true;
    }
}
