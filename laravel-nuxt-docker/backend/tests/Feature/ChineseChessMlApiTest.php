<?php

namespace Tests\Feature;

use Tests\TestCase;

class ChineseChessMlApiTest extends TestCase
{
    public function test_it_ranks_legal_move_candidates_with_the_configured_model(): void
    {
        $response = $this->postJson('/api/chinese-chess/ml/predict', [
            'candidates' => [
                [
                    'id' => 'quiet-move',
                    'features' => ['gives_checkmate' => 0, 'capture_value' => 0.1],
                ],
                [
                    'id' => 'mate-move',
                    'features' => ['gives_checkmate' => 1, 'capture_value' => 0],
                ],
            ],
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('candidate_id', 'mate-move')
            ->assertJsonPath('model.algorithm', 'pairwise-logistic-ranking')
            ->assertJsonStructure(['model' => ['version', 'algorithm']]);
    }

    public function test_it_rejects_an_empty_candidate_list(): void
    {
        $this->postJson('/api/chinese-chess/ml/predict', ['candidates' => []])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('candidates');
    }
}
