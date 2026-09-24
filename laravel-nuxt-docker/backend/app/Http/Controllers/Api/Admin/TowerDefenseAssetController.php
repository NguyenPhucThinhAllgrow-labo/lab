<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\TowerDefenseAsset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TowerDefenseAssetController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $assets = TowerDefenseAsset::query()
                ->when($request->filled('type'), fn ($query) => $query->where('type', (string) $request->string('type')))
                ->when($request->filled('purpose'), fn ($query) => $query->where('purpose', (string) $request->string('purpose')))
                ->when($request->filled('search'), fn ($query) => $query->where('key', 'like', '%'.(string) $request->string('search').'%'))
                ->orderBy('type')
                ->orderBy('key')
                ->paginate($this->perPage($request));
        $assets->through(fn (TowerDefenseAsset $asset): array => [
                    'id' => $asset->id,
                    'key' => $asset->key,
                    'type' => $asset->type,
                    'purpose' => $asset->purpose,
                    'url' => '/api/tower-defense/assets/'.str_replace('%2F', '/', rawurlencode($asset->key)),
                    'mimeType' => $asset->mime_type,
                    'size' => $asset->size,
                    'metadata' => $asset->metadata,
                    'isActive' => $asset->is_active,
                    'updatedAt' => $asset->updated_at?->toISOString(),
                ]);

        return response()->json($assets);
    }

    private function perPage(Request $request): int
    {
        return min(500, max(1, $request->integer('per_page', 20)));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'key' => ['required', 'string', 'max:500', 'regex:/^(models|sounds|images)\/[A-Za-z0-9_().\/-]+$/', 'not_regex:/\.\./', Rule::unique('tower_defense_assets')],
            'type' => ['required', Rule::in(['model', 'sound', 'image'])],
            'purpose' => ['required', Rule::in(TowerDefenseAsset::purposes())],
            'file' => ['required', 'file', 'max:204800'],
            'metadata' => ['sometimes', 'array'],
        ]);
        $this->ensurePurposeMatchesType($data['type'], $data['purpose']);
        $file = $request->file('file');
        if ($data['type'] === 'image' && ! str_starts_with((string) $file->getMimeType(), 'image/')) {
            throw ValidationException::withMessages(['file' => ['File tải lên phải là hình ảnh hợp lệ.']]);
        }
        $path = $data['key'];
        Storage::disk('tower-defense')->putFileAs(dirname($path), $file, basename($path));
        $asset = TowerDefenseAsset::create([
            'key' => $data['key'],
            'type' => $data['type'],
            'purpose' => $data['purpose'],
            'path' => $path,
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
            'metadata' => $data['metadata'] ?? null,
            'is_active' => true,
        ]);

        return response()->json(['data' => $asset, 'message' => 'Đã tải asset lên.'], 201);
    }

    public function update(Request $request, TowerDefenseAsset $asset): JsonResponse
    {
        $data = $request->validate([
            'purpose' => ['required', Rule::in(TowerDefenseAsset::purposes())],
        ]);
        $this->ensurePurposeMatchesType($asset->type, $data['purpose']);
        $asset->update(['purpose' => $data['purpose']]);

        return response()->json([
            'data' => ['key' => $asset->key, 'type' => $asset->type, 'purpose' => $asset->purpose],
            'message' => 'Đã cập nhật mục đích asset.',
        ]);
    }

    public function destroy(TowerDefenseAsset $asset): JsonResponse
    {
        Storage::disk('tower-defense')->delete($asset->path);
        $asset->delete();

        return response()->json(['message' => 'Đã xóa asset.']);
    }

    private function ensurePurposeMatchesType(string $type, string $purpose): void
    {
        if (in_array($purpose, TowerDefenseAsset::PURPOSES_BY_TYPE[$type], true)) {
            return;
        }

        throw ValidationException::withMessages([
            'purpose' => ['Mục đích tài nguyên không phù hợp với loại đã chọn.'],
        ]);
    }
}
