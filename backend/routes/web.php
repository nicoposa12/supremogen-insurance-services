<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/storage/{path}', function ($path) {
    if (Storage::disk('public')->exists($path)) {
        return Storage::disk('public')->response($path);
    }
    $defaultDisk = config('filesystems.default');
    if ($defaultDisk && $defaultDisk !== 'public' && Storage::disk($defaultDisk)->exists($path)) {
        return Storage::disk($defaultDisk)->response($path);
    }
    $localPublicPath = storage_path('app/public/' . $path);
    if (file_exists($localPublicPath)) {
        return response()->file($localPublicPath);
    }
    $localAppPath = storage_path('app/' . $path);
    if (file_exists($localAppPath)) {
        return response()->file($localAppPath);
    }
    abort(404);
})->where('path', '.*');

Route::get('/debug-queue', function () {
    $data = [];
    try {
        $data['jobs'] = \Illuminate\Support\Facades\DB::table('jobs')->get()->map(function($j) {
            return [
                'id' => $j->id,
                'queue' => $j->queue,
                'attempts' => $j->attempts,
                'payload_summary' => substr($j->payload, 0, 150) . '...'
            ];
        });
    } catch (\Exception $e) {
        $data['jobs_error'] = $e->getMessage();
    }

    try {
        $data['failed_jobs'] = \Illuminate\Support\Facades\DB::table('failed_jobs')->get()->map(function($fj) {
            return [
                'id' => $fj->id,
                'connection' => $fj->connection,
                'queue' => $fj->queue,
                'exception' => substr($fj->exception, 0, 1000) . '...',
                'failed_at' => $fj->failed_at
            ];
        });
    } catch (\Exception $e) {
        $data['failed_jobs_error'] = $e->getMessage();
    }

    try {
        $logPath = storage_path('logs/laravel.log');
        if (file_exists($logPath)) {
            $lines = file($logPath);
            $data['laravel_log'] = array_slice($lines, -30);
        } else {
            $data['laravel_log'] = 'No log file found';
        }
    } catch (\Exception $e) {
        $data['log_error'] = $e->getMessage();
    }

    try {
        $schedPath = storage_path('logs/scheduler.log');
        if (file_exists($schedPath)) {
            $lines = file($schedPath);
            $data['scheduler_log'] = array_slice($lines, -30);
        } else {
            $data['scheduler_log'] = 'No scheduler log file found';
        }
    } catch (\Exception $e) {
        $data['scheduler_log_error'] = $e->getMessage();
    }

    return response()->json($data);
});
