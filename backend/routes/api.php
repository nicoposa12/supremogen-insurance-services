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

Route::prefix('v1')->group(function () {
    // Public routes
    Route::post('/inquiries', [InquiryController::class, 'store']);
    Route::post('/auth/login', [AuthController::class, 'login']);

    // Protected routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/profile', [AuthController::class, 'profile']);
        Route::put('/auth/profile', [AuthController::class, 'updateProfile']);

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
        Route::apiResource('/users', UserController::class)->middleware('permission:users.view');

        // Insurance Products (dropdown data)
        Route::get('/insurance-products', [InsuranceProductController::class, 'index']);

        // Quotations
        Route::apiResource('/quotations', QuotationController::class);
        Route::post('/quotations/{quotation}/submit', [QuotationController::class, 'submit']);
        Route::post('/quotations/{quotation}/review', [QuotationController::class, 'review']);

        // Policies
        Route::apiResource('/policies', PolicyController::class);
        Route::post('/policies/{policy}/cancel', [PolicyController::class, 'cancel']);

        // Invoices
        Route::apiResource('/invoices', InvoiceController::class);
        Route::post('/invoices/{invoice}/send', [InvoiceController::class, 'send']);
        Route::post('/invoices/{invoice}/cancel', [InvoiceController::class, 'cancel']);

        // Payments
        Route::get('/payments', [PaymentController::class, 'index']);
        Route::post('/payments', [PaymentController::class, 'store']);
        Route::get('/payments/{payment}', [PaymentController::class, 'show']);
        Route::post('/payments/{payment}/void', [PaymentController::class, 'void']);

        // Claims
        Route::apiResource('/claims', ClaimController::class)->except(['destroy']);
        Route::delete('/claims/{claim}', [ClaimController::class, 'destroy']);
        Route::post('/claims/{claim}/assign', [ClaimController::class, 'assign']);
        Route::post('/claims/{claim}/review', [ClaimController::class, 'review']);
        Route::post('/claims/{claim}/settle', [ClaimController::class, 'settle']);

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
        Route::delete('/attachments/{id}', [AttachmentController::class, 'destroy']);
    });
});
