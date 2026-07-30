<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\V1\InquiryController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\CustomerController;
use App\Http\Controllers\Api\V1\InsuranceProductController;
use App\Http\Controllers\Api\V1\QuotationController;
use App\Http\Controllers\Api\V1\PolicyController;
use App\Http\Controllers\Api\V1\InvoiceController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\ClaimController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\V1\RenewalController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\AttachmentController;
use App\Http\Controllers\Api\V1\ClaimNotificationController;
use App\Http\Controllers\Api\V1\StorageController;
use App\Http\Controllers\Api\V1\AuditLogController;

Route::prefix('v1')->group(function () {
    // Public routes
    Route::post('/inquiries', [InquiryController::class, 'store'])->middleware('throttle:api');
    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:forgot-password');
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:forgot-password');
    // Storage proxy for cloud-stored files (profile photos, etc.)
    Route::get('/storage/{path}', [StorageController::class, 'serve'])->where('path', '.*');
    // Stream notifications (authenticated via query param token or bearer token)
    Route::get('/notifications/stream', [NotificationController::class, 'stream'])
        ->middleware(['auth:sanctum']);

    // Protected routes
    Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/profile', [AuthController::class, 'profile']);
        Route::put('/auth/profile', [AuthController::class, 'updateProfile']);
        Route::post('/auth/profile/photo', [AuthController::class, 'updateProfilePhoto']);
        Route::delete('/auth/profile/photo', [AuthController::class, 'deleteProfilePhoto']);

        Route::get('/user', function (Request $request) {
            return $request->user();
        });

        // Dashboard
        Route::get('/dashboard', [DashboardController::class, 'index']);

        // Customers
        Route::apiResource('/customers', CustomerController::class);
        Route::post('/customers/{customer}/documents', [CustomerController::class, 'uploadDocument']);
        Route::delete('/customers/{customer}/documents/{document}', [CustomerController::class, 'deleteDocument']);

        // Users / Agents
        Route::get('/agents', [UserController::class, 'agents']);
        Route::post('/users/{user}/impersonate', [UserController::class, 'impersonate'])->middleware('permission:users.view');
        Route::apiResource('/users', UserController::class)->middleware('permission:users.view');

        // Insurance Products (dropdown data)
        Route::get('/insurance-products', [InsuranceProductController::class, 'index']);

        // Quotations
        Route::apiResource('/quotations', QuotationController::class);
        Route::post('/quotations/{quotation}/submit', [QuotationController::class, 'submit']);
        Route::post('/quotations/{quotation}/review', [QuotationController::class, 'review']);
        Route::post('/quotations/{quotation}/metadata', [QuotationController::class, 'updateMetadata']);
        Route::post('/quotations/{quotation}/request-cancellation', [QuotationController::class, 'requestCancellation']);
        Route::post('/quotations/{quotation}/review-cancellation', [QuotationController::class, 'reviewCancellation']);
        Route::put('/quotations/{quotation}/remittance', [QuotationController::class, 'toggleRemittance']);

        // Policies
        Route::apiResource('/policies', PolicyController::class);
        Route::post('/policies/{policy}/cancel', [PolicyController::class, 'cancel']);

        // Invoices
        Route::apiResource('/invoices', InvoiceController::class);
        Route::post('/invoices/{invoice}/send', [InvoiceController::class, 'send']);
        Route::post('/invoices/{invoice}/cancel', [InvoiceController::class, 'cancel']);
        Route::post('/invoices/{invoice}/send-reminder', [InvoiceController::class, 'sendReminder']);
        Route::post('/invoices/{invoice}/notify-dst-warning', [InvoiceController::class, 'notifyDstWarning']);
        Route::put('/invoices/{invoice}/subagent-commission', [InvoiceController::class, 'updateSubagentCommission']);

        // Payments
        Route::get('/payments', [PaymentController::class, 'index']);
        Route::post('/payments', [PaymentController::class, 'store']);
        Route::get('/payments/{payment}', [PaymentController::class, 'show']);
        Route::put('/payments/{payment}', [PaymentController::class, 'update']);
        Route::post('/payments/{payment}/void', [PaymentController::class, 'void']);
        Route::post('/payments/{payment}/verify', [PaymentController::class, 'verify']);

        // Claims
        Route::apiResource('/claims', ClaimController::class)->except(['destroy']);
        Route::delete('/claims/{claim}', [ClaimController::class, 'destroy']);
        Route::post('/claims/{claim}/assign', [ClaimController::class, 'assign']);
        Route::post('/claims/{claim}/review', [ClaimController::class, 'review']);
        Route::post('/claims/{claim}/settle', [ClaimController::class, 'settle']);

        // Claim Notifications
        Route::get('/claim-notifications', [ClaimNotificationController::class, 'index']);
        Route::post('/claim-notifications', [ClaimNotificationController::class, 'store']);
        Route::get('/claim-notifications/{id}', [ClaimNotificationController::class, 'show']);
        Route::post('/claim-notifications/{id}/acknowledge', [ClaimNotificationController::class, 'acknowledge']);
        Route::post('/claim-notifications/{id}/complete-requirements', [ClaimNotificationController::class, 'completeRequirements']);
        Route::post('/claim-notifications/{id}/return', [ClaimNotificationController::class, 'returnToAgent']);
        Route::post('/claim-notifications/{id}/send-email', [ClaimNotificationController::class, 'sendEmailToProvider']);
        Route::put('/claim-notifications/{id}', [ClaimNotificationController::class, 'update']);

        // Renewals
        Route::get('/renewals', [RenewalController::class, 'index']);
        Route::get('/renewals/{renewal}', [RenewalController::class, 'show']);
        Route::post('/renewals/{renewal}/process', [RenewalController::class, 'process']);
        Route::post('/renewals/{renewal}/cancel', [RenewalController::class, 'cancel']);

        // Reports
        Route::get('/reports/summary', [ReportController::class, 'summary']);

        // Notifications
        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
        Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);

        // Attachments (DMS)
        Route::get('/attachments', [AttachmentController::class, 'index']);
        Route::post('/attachments', [AttachmentController::class, 'store']);
        Route::get('/attachments/{id}/download', [AttachmentController::class, 'download']);
        Route::get('/attachments/{id}/preview', [AttachmentController::class, 'preview']);
        Route::delete('/attachments/{id}', [AttachmentController::class, 'destroy']);

        // Audit Logs (admin only)
        Route::get('/audit-logs', [AuditLogController::class, 'index'])->middleware('permission:users.view');
    });
});
