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
            'elapsed_seconds' => ['sometimes', 'integer', 'min:0', 'max:31536000'],
            'evidence_history' => ['sometimes', 'array', 'max:200'],
            'evidence_history.*.id' => ['required', 'string', 'max:100'],
            'evidence_history.*.elapsed_seconds' => ['required', 'integer', 'min:0'],
            'evidence_history.*.recorded_at' => ['required', 'date'],
            'task_history' => ['sometimes', 'array', 'max:100'],
            'task_history.*.id' => ['required', 'string', 'max:100'],
            'task_history.*.elapsed_seconds' => ['required', 'integer', 'min:0'],
            'task_history.*.recorded_at' => ['required', 'date'],
        ];
    }
}
