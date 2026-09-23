<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\TowerDefenseAsset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class TowerDefenseAssetController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => TowerDefenseAsset::query()
                ->orderBy('type')
                ->orderBy('key')
                ->get()
                ->map(fn (TowerDefenseAsset $asset): array => [
                    'id' => $asset->id,
                    'key' => $asset->key,
                    'type' => $asset->type,
                    'url' => url('/api/tower-defense/assets/'.str_replace('%2F', '/', rawurlencode($asset->key))),
                    'mimeType' => $asset->mime_type,
                    'size' => $asset->size,
                    'metadata' => $asset->metadata,
                    'isActive' => $asset->is_active,
                    'updatedAt' => $asset->updated_at?->toISOString(),
                ]),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'key' => ['required', 'string', 'max:500', 'regex:/^(models|sounds|images)\/[A-Za-z0-9_().\/-]+$/', 'not_regex:/\.\./', Rule::unique('tower_defense_assets')],
            'type' => ['required', Rule::in(['model', 'sound', 'image'])],
            'file' => ['required', 'file', 'max:204800'],
            'metadata' => ['sometimes', 'array'],
        ]);
        $file = $request->file('file');
        $path = $data['key'];
        Storage::disk('tower-defense')->putFileAs(dirname($path), $file, basename($path));
        $asset = TowerDefenseAsset::create([
            'key' => $data['key'],
            'type' => $data['type'],
            'path' => $path,
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
            'metadata' => $data['metadata'] ?? null,
            'is_active' => true,
        ]);

        return response()->json(['data' => $asset, 'message' => 'Đã tải asset lên.'], 201);
    }

    public function destroy(TowerDefenseAsset $asset): JsonResponse
    {
        Storage::disk('tower-defense')->delete($asset->path);
        $asset->delete();

        return response()->json(['message' => 'Đã xóa asset.']);
    }
}
