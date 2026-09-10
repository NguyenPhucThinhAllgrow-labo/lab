<?php

namespace Tests\Unit;

use App\Services\ChineseChessEngine;
use App\Services\ChineseChessRepetitionService;
use PHPUnit\Framework\TestCase;

class ChineseChessRepetitionServiceTest extends TestCase
{
    private ChineseChessRepetitionService $rules;
    private ChineseChessEngine $engine;

    protected function setUp(): void
    {
        parent::setUp();
        $this->engine = new ChineseChessEngine();
        $this->rules = new ChineseChessRepetitionService($this->engine);
    }

    public function test_repetition_keeps_warning_checker_without_automatic_loss(): void
    {
        $twice = $this->cycleHistory(2, 'check', 'quiet');
        $warning = $this->rules->adjudicate($twice);

        $this->assertSame('warning', $warning['status']);
        $this->assertSame('red', $warning['obligated_color']);
        $this->assertSame('perpetual_check', $warning['reason']);

        $final = $this->rules->adjudicate($this->cycleHistory(3, 'check', 'quiet'));
        $this->assertSame('warning', $final['status']);
        $this->assertSame('red', $final['violator_color']);
    }

    public function test_same_level_violations_by_both_sides_are_a_repetition_draw(): void
    {
        $result = $this->rules->adjudicate($this->cycleHistory(3, 'chase', 'chase'));

        $this->assertSame('draw', $result['status']);
        $this->assertNull($result['violator_color']);
        $this->assertSame('repetition_draw', $result['reason']);
    }

    public function test_check_has_priority_over_opponents_chase(): void
    {
        $result = $this->rules->adjudicate($this->cycleHistory(3, 'check', 'chase'));

        $this->assertSame('warning', $result['status']);
        $this->assertSame('red', $result['violator_color']);
        $this->assertSame('perpetual_check', $result['reason']);
    }

    public function test_simultaneous_check_and_chase_is_preserved_in_the_verdict(): void
    {
        $result = $this->rules->adjudicate($this->cycleHistory(3, 'check_chase', 'quiet'));

        $this->assertSame('warning', $result['status']);
        $this->assertSame('red', $result['violator_color']);
        $this->assertSame('perpetual_check_chase', $result['reason']);
    }

    public function test_alternating_attackers_still_form_one_perpetual_chase(): void
    {
        $history = $this->cycleHistory(3, 'chase', 'quiet', true);
        $result = $this->rules->adjudicate($history);

        $this->assertSame('warning', $result['status']);
        $this->assertSame('red', $result['violator_color']);
        $this->assertCount(2, $result['red']['attackers']);
        $this->assertSame(['black-horse'], $result['red']['targets']);
    }

    public function test_same_type_chase_is_allowed_unless_target_is_pinned(): void
    {
        $freeBoard = [
            $this->piece('black-general', 'general', 'black', 0, 4),
            $this->piece('black-chariot', 'chariot', 'black', 5, 0),
            $this->piece('red-chariot', 'chariot', 'red', 5, 4),
            $this->piece('red-general', 'general', 'red', 9, 3),
        ];
        $free = collect($this->engine->chaseRelations($freeBoard, 'red'))->firstWhere('target_id', 'black-chariot');
        $this->assertFalse($free['prohibited']);

        $pinnedBoard = [
            $this->piece('black-general', 'general', 'black', 0, 4),
            $this->piece('black-chariot', 'chariot', 'black', 2, 4),
            $this->piece('red-chariot', 'chariot', 'red', 5, 4),
            $this->piece('red-general', 'general', 'red', 9, 3),
        ];
        $pinned = collect($this->engine->chaseRelations($pinnedBoard, 'red'))->firstWhere('target_id', 'black-chariot');
        $this->assertTrue($pinned['pinned']);
        $this->assertTrue($pinned['prohibited']);
    }

    public function test_uncrossed_pawn_and_king_or_pawn_chasers_use_draw_exceptions(): void
    {
        $board = [
            $this->piece('black-general', 'general', 'black', 0, 4),
            $this->piece('black-soldier', 'soldier', 'black', 3, 0),
            $this->piece('red-chariot', 'chariot', 'red', 3, 4),
            $this->piece('red-soldier', 'soldier', 'red', 4, 2),
            $this->piece('black-horse', 'horse', 'black', 4, 3),
            $this->piece('red-general', 'general', 'red', 9, 3),
        ];
        $relations = collect($this->engine->chaseRelations($board, 'red'));

        $this->assertFalse($relations->firstWhere('target_id', 'black-soldier')['prohibited']);
        $this->assertFalse($relations->firstWhere('attacker_id', 'red-soldier')['prohibited']);
    }

    public function test_protected_piece_attack_is_shown_as_chase_but_not_used_as_a_violation(): void
    {
        $before = [
            $this->piece('black-general', 'general', 'black', 0, 4),
            $this->piece('black-chariot', 'chariot', 'black', 2, 0),
            $this->piece('black-horse', 'horse', 'black', 2, 6),
            $this->piece('red-chariot', 'chariot', 'red', 4, 7),
            $this->piece('red-general', 'general', 'red', 9, 3),
        ];
        [$after] = $this->engine->move($before, 'red-chariot', 2, 7);
        $result = $this->rules->recordMove(
            $this->rules->initialHistory($before, 'red'),
            $before,
            $after,
            $this->engine->piece($before, 'red-chariot'),
            'black',
            1,
        );
        $record = $result['history'][array_key_last($result['history'])];

        $this->assertSame('chase', $record['action']);
        $this->assertSame('black-horse', $record['chases'][0]['target_id']);
        $this->assertTrue($record['chases'][0]['protected']);
        $this->assertFalse($record['chases'][0]['prohibited']);
        $this->assertSame('none', $result['state']['status']);
    }

    private function cycleHistory(int $occurrences, string $redAction, string $blackAction, bool $alternateAttackers = false): array
    {
        $history = [$this->record('A', null, 'quiet', 0)];
        $move = 0;
        for ($cycle = 1; $cycle < $occurrences; $cycle++) {
            $history[] = $this->record('B', 'red', $redAction, ++$move, $alternateAttackers ? 'red-rook-1' : 'red-rook');
            $history[] = $this->record('C', 'black', $blackAction, ++$move, 'black-rook');
            $history[] = $this->record('D', 'red', $redAction, ++$move, $alternateAttackers ? 'red-rook-2' : 'red-rook');
            $history[] = $this->record('A', 'black', $blackAction, ++$move, 'black-rook');
        }

        return $history;
    }

    private function record(string $key, ?string $mover, string $action, int $number, string $attacker = 'piece'): array
    {
        $isCheck = in_array($action, ['check', 'check_chase'], true);
        $chases = in_array($action, ['chase', 'check_chase'], true) ? [[
            'attacker_id' => $attacker,
            'target_id' => $mover === 'red' ? 'black-horse' : 'red-horse',
            'prohibited' => true,
        ]] : [];

        return [
            'key' => $key,
            'turn' => $mover === 'red' ? 'black' : 'red',
            'move_number' => $number,
            'mover' => $mover,
            'gave_check' => $isCheck,
            'chases' => $chases,
            'action' => $action,
        ];
    }

    private function piece(string $id, string $type, string $color, int $row, int $col): array
    {
        return compact('id', 'type', 'color', 'row', 'col');
    }
}
