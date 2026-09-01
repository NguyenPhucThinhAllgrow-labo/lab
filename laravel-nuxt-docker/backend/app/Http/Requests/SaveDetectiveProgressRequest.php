<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SaveDetectiveProgressRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'locale' => ['sometimes', 'string', 'in:en,vi'],
            'current_directory' => ['sometimes', 'string', 'max:500', 'starts_with:/'],
            'discovered_evidence' => ['sometimes', 'array', 'max:200'],
            'discovered_evidence.*' => ['string', 'max:100', 'distinct'],
            'completed_tasks' => ['sometimes', 'array', 'max:100'],
            'completed_tasks.*' => ['string', 'max:100', 'distinct'],
            'command_history' => ['sometimes', 'array', 'max:200'],
            'command_history.*' => ['string', 'max:1000'],
            'terminal_lines' => ['sometimes', 'array', 'max:500'],
            'terminal_lines.*' => ['array'],
            'game_completed' => ['sometimes', 'boolean'],
        ];
    }
}
