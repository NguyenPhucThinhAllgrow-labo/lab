<?php

namespace App\Http\Requests;

use Closure;
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
            'linked_evidence' => ['sometimes', 'array', 'max:100'],
            'linked_evidence.*' => [
                'array',
                'max:100',
                function (string $attribute, mixed $value, Closure $fail): void {
                    if (
                        is_array($value) &&
                        count($value) !== count(array_unique($value, SORT_STRING))
                    ) {
                        $fail("The {$attribute} field has a duplicate value.");
                    }
                },
            ],
            'linked_evidence.*.*' => ['string', 'max:100'],
            'unlocked_paths' => ['sometimes', 'array', 'max:100'],
            'unlocked_paths.*' => ['string', 'max:500', 'starts_with:/', 'distinct'],
            'command_history' => ['sometimes', 'array', 'max:200'],
            'command_history.*' => ['string', 'max:1000'],
            'hint_count' => ['sometimes', 'integer', 'min:0', 'max:100000'],
            'hint_penalty' => ['sometimes', 'integer', 'min:0', 'max:1000000'],
            'hint_history' => ['sometimes', 'array', 'max:1000'],
            'hint_history.*.task_id' => ['nullable', 'string', 'max:100'],
            'hint_history.*.evidence_id' => ['required', 'string', 'max:100'],
            'hint_history.*.level' => ['required', 'integer', 'between:1,3'],
            'hint_history.*.penalty' => ['required', 'integer', 'min:0', 'max:100'],
            'hint_history.*.elapsed_seconds' => ['required', 'integer', 'min:0'],
            'hint_history.*.recorded_at' => ['required', 'date'],
            'incorrect_link_attempts' => ['sometimes', 'integer', 'min:0', 'max:100000'],
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
