<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Storage;

class StorageController extends Controller
{
    /**
     * Serve a file from the configured cloud storage disk or local storage.
     * Acts as a proxy so the frontend never needs direct access to R2/S3 URLs.
     */
    public function serve(string $path)
    {
        $defaultDisk = config('filesystems.default') ?: 'public';
        $disksToTry = array_unique([$defaultDisk, 'public', 'local', 'r2', 's3']);

        foreach ($disksToTry as $disk) {
            try {
                if (Storage::disk($disk)->exists($path)) {
                    $mime = Storage::disk($disk)->mimeType($path) ?: 'application/octet-stream';
                    $content = Storage::disk($disk)->get($path);

                    return response($content, 200, [
                        'Content-Type' => $mime,
                        'Cache-Control' => 'public, max-age=86400',
                        'Content-Disposition' => 'inline; filename="' . basename($path) . '"',
                    ]);
                }
            } catch (\Exception $e) {
                // Continue to next disk
            }
        }

        // Direct filesystem check in case of storage folder symlink variance
        $localPaths = [
            storage_path('app/public/' . $path),
            storage_path('app/' . $path),
            public_path('storage/' . $path),
        ];

        foreach ($localPaths as $localPath) {
            if (file_exists($localPath) && is_file($localPath)) {
                $mime = mime_content_type($localPath) ?: 'application/octet-stream';
                return response()->file($localPath, [
                    'Content-Type' => $mime,
                    'Cache-Control' => 'public, max-age=86400',
                ]);
            }
        }

        abort(404, 'File not found.');
    }
}
