<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Storage;

class StorageController extends Controller
{
    /**
     * Serve a file from the configured cloud storage disk.
     * Acts as a proxy so the frontend never needs direct access to R2/S3 URLs.
     */
    public function serve(string $path)
    {
        $disk = config('filesystems.default');
        if ($disk === 'local') {
            $disk = 'public';
        }

        if (!Storage::disk($disk)->exists($path)) {
            abort(404, 'File not found.');
        }

        $mime = Storage::disk($disk)->mimeType($path) ?: 'application/octet-stream';
        $content = Storage::disk($disk)->get($path);

        return response($content, 200, [
            'Content-Type' => $mime,
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }
}
