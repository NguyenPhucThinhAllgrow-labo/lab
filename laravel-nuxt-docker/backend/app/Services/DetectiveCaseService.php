<?php

namespace App\Services;

use App\Models\DetectiveCase;
use App\Repositories\Contracts\DetectiveCaseRepositoryInterface;
use Illuminate\Support\Collection;

class DetectiveCaseService
{
    public function __construct(
        private readonly DetectiveCaseRepositoryInterface $cases,
    ) {}

    public function list(string $locale): Collection
    {
        return $this->cases
            ->getActive()
            ->map(fn (DetectiveCase $case): array => $this->serialize($case, $locale));
    }

    public function get(string $caseId, string $locale): array
    {
        $case = $this->cases->findActiveOrFail($caseId);

        return [
            ...$this->serialize($case, $locale),
            'scenario' => $case->scenario,
        ];
    }

    private function serialize(DetectiveCase $case, string $locale): array
    {
        $normalizedLocale = in_array($locale, ['en', 'vi'], true) ? $locale : 'en';

        return [
            'id' => $case->id,
            'title' => $case->title[$normalizedLocale] ?? $case->title['en'],
            'description' => $case->description[$normalizedLocale] ?? $case->description['en'],
            'translations' => [
                'title' => $case->title,
                'description' => $case->description,
            ],
            'sort_order' => $case->sort_order,
        ];
    }
}
