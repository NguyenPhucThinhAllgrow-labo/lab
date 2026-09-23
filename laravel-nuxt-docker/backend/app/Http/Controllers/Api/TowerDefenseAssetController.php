<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TowerDefenseAsset;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class TowerDefenseAssetController extends Controller
{
    public function index(): JsonResponse
    {
        $assets = TowerDefenseAsset::query()
            ->where('is_active', true)
            ->orderBy('key')
            ->get()
            ->map(fn (TowerDefenseAsset $asset): array => $this->serialize($asset));

        return response()->json(['data' => $assets]);
    }

    public function show(string $asset): BinaryFileResponse
    {
        $record = TowerDefenseAsset::query()
            ->where('key', $asset)
            ->where('is_active', true)
            ->firstOrFail();
        $disk = Storage::disk('tower-defense');
        abort_unless($disk->exists($record->path), 404);

        return response()->file($disk->path($record->path), [
            'Content-Type' => $record->mime_type ?: 'application/octet-stream',
            'Cache-Control' => 'public, max-age=31536000, immutable',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    private function serialize(TowerDefenseAsset $asset): array
    {
        return [
            'key' => $asset->key,
            'type' => $asset->type,
            'url' => url('/api/tower-defense/assets/'.str_replace('%2F', '/', rawurlencode($asset->key))),
            'mimeType' => $asset->mime_type,
            'size' => $asset->size,
            'metadata' => $asset->metadata,
        ];
    }
}
