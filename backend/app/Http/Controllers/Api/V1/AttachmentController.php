<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Attachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class AttachmentController extends Controller
{
    private array $modelMap = [
        'customer' => \App\Models\Customer::class,
        'quotation' => \App\Models\Quotation::class,
        'policy' => \App\Models\Policy::class,
        'invoice' => \App\Models\Invoice::class,
        'claim' => \App\Models\Claim::class,
        'payment' => \App\Models\Payment::class,
        'claim_notification' => \App\Models\ClaimNotification::class,
    ];

    /**
     * Display a listing of the attachments for a specific model instance.
     */
    public function index(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'attachable_type' => 'required|string|in:customer,quotation,policy,invoice,claim,payment,claim_notification',
            'attachable_id' => 'required|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 400);
        }

        $type = $request->query('attachable_type');
        $id = $request->query('attachable_id');

        $modelClass = $this->modelMap[$type];
        $model = $modelClass::find($id);

        if (!$model) {
            return response()->json(['message' => 'Record not found.'], 404);
        }

        $attachments = $model->attachments()
            ->with('uploadedBy:id,name')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $attachments
        ]);
    }

    /**
     * Store a newly created attachment in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'attachable_type' => 'required|string|in:customer,quotation,policy,invoice,claim,payment,claim_notification',
            'attachable_id' => 'required|integer',
            'file' => 'required|file|max:10240', // 10MB max
            'document_type' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 400);
        }

        $type = $request->input('attachable_type');
        $id = $request->input('attachable_id');

        $modelClass = $this->modelMap[$type];
        $model = $modelClass::find($id);

        if (!$model) {
            return response()->json(['message' => 'Record not found.'], 404);
        }

        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $extension = $file->getClientOriginalExtension();
        
        // Generate a secure unique filename
        $safeName = Str::uuid() . '.' . $extension;
        
        // Store the file in a subdirectory based on the model type
        $disk = config('filesystems.default');
        $path = $file->storeAs("attachments/{$type}", $safeName, $disk);

        $attachment = Attachment::create([
            'attachable_type' => $modelClass,
            'attachable_id' => $id,
            'file_name' => $originalName,
            'file_path' => $path,
            'file_size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
            'document_type' => $request->input('document_type'),
            'uploaded_by' => $request->user()?->id,
        ]);

        // Notify Claims Officers when a Sales Agent or Team Renewal uploads requirements for a claim notification
        if ($type === 'claim_notification') {
            $user = $request->user();
            $isAgent = $user && ($user->hasRole('Sales Agent') || $user->hasRole('Team Renewal'));
            
            if ($isAgent) {
                try {
                    $officers = \App\Models\User::role('Claims Officer')->get();
                    $docLabel = $attachment->document_type ?: 'Attachment';
                    foreach ($officers as $officer) {
                        \App\Models\Notification::create([
                            'user_id' => $officer->id,
                            'title'   => 'Claim Requirement Uploaded',
                            'message' => "{$user->name} uploaded a requirement ({$docLabel} - {$attachment->file_name}) for claim notification {$model->reference_number}.",
                            'type'    => 'info',
                            'read_at' => null,
                        ]);
                    }
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error('Failed to notify Claims Officers on requirement upload: ' . $e->getMessage());
                }
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'File uploaded successfully.',
            'data' => $attachment->load('uploadedBy:id,name')
        ], 210); // 210 Created
    }

    public function download(string $id)
    {
        $attachment = Attachment::find($id);

        if (!$attachment) {
            abort(404, 'Attachment not found.');
        }

        $disk = config('filesystems.default');

        if (!Storage::disk($disk)->exists($attachment->file_path)) {
            abort(404, 'File not found on storage.');
        }

        return Storage::disk($disk)->download($attachment->file_path, $attachment->file_name);
    }

    /**
     * Preview/stream the attachment file.
     */
    public function preview(string $id)
    {
        $attachment = Attachment::find($id);

        if (!$attachment) {
            abort(404, 'Attachment not found.');
        }

        $disk = config('filesystems.default');

        if (!Storage::disk($disk)->exists($attachment->file_path)) {
            abort(404, 'File not found on storage.');
        }

        $filePath = Storage::disk($disk)->path($attachment->file_path);
        return response()->file($filePath, [
            'Content-Type' => $attachment->mime_type,
            'Content-Disposition' => 'inline; filename="' . $attachment->file_name . '"'
        ]);
    }

    /**
     * Remove the specified attachment from storage and database.
     */
    public function destroy(string $id)
    {
        $attachment = Attachment::find($id);

        if (!$attachment) {
            return response()->json(['message' => 'Attachment not found.'], 404);
        }

        // Delete from physical storage
        $disk = config('filesystems.default');
        if (Storage::disk($disk)->exists($attachment->file_path)) {
            Storage::disk($disk)->delete($attachment->file_path);
        }

        // Delete database record
        $attachment->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Attachment deleted successfully.'
        ]);
    }
}
