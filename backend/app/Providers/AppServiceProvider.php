<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Http\Request;

use Illuminate\Support\Facades\Mail;
use App\Mail\Transports\BrevoTransport;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
            return env('FRONTEND_URL', 'http://localhost:5173') . '/reset-password?token=' . $token . '&email=' . urlencode($notifiable->getEmailForPasswordReset());
        });

        Mail::extend('brevo', function (array $config) {
            return new BrevoTransport($config['key'] ?? env('BREVO_API_KEY'));
        });

        $this->configureRateLimiting();
    }

    /**
     * Configure the rate limiters for the application.
     */
    protected function configureRateLimiting(): void
    {
        // Login: 5 attempts per minute, keyed by IP + email input
        RateLimiter::for('login', function (Request $request) {
            $key = strtolower($request->input('email', '')) . '|' . $request->ip();

            return Limit::perMinute(5)
                ->by($key)
                ->response(function (Request $request, array $headers) {
                    $retryAfter = $headers['Retry-After'] ?? 60;

                    return response()->json([
                        'success' => false,
                        'message' => 'Too many login attempts. Please try again in ' . $retryAfter . ' seconds.',
                        'retry_after' => (int) $retryAfter,
                    ], 429, $headers);
                });
        });

        // Forgot/Reset password: 3 attempts per minute per IP
        RateLimiter::for('forgot-password', function (Request $request) {
            return Limit::perMinute(3)
                ->by($request->ip())
                ->response(function (Request $request, array $headers) {
                    $retryAfter = $headers['Retry-After'] ?? 60;

                    return response()->json([
                        'success' => false,
                        'message' => 'Too many password reset requests. Please try again in ' . $retryAfter . ' seconds.',
                        'retry_after' => (int) $retryAfter,
                    ], 429, $headers);
                });
        });

        // General API: 120 requests per minute per authenticated user (or per IP for guests)
        RateLimiter::for('api', function (Request $request) {
            $key = $request->user()?->id ?: $request->ip();

            return Limit::perMinute(120)
                ->by($key)
                ->response(function (Request $request, array $headers) {
                    $retryAfter = $headers['Retry-After'] ?? 60;

                    return response()->json([
                        'success' => false,
                        'message' => 'Too many requests. Please slow down and try again in ' . $retryAfter . ' seconds.',
                        'retry_after' => (int) $retryAfter,
                    ], 429, $headers);
                });
        });
    }
}
