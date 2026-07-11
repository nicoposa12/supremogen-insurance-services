<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Get all notifications for the authenticated user.
     */
    public function index(Request $request)
    {
        $notifications = Notification::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $notifications,
        ]);
    }

    /**
     * Mark a specific notification as read.
     */
    public function markAsRead(Request $request, $id)
    {
        $notification = Notification::where('user_id', $request->user()->id)
            ->findOrFail($id);

        $notification->update([
            'read_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Notification marked as read.',
            'data' => $notification,
        ]);
    }

    /**
     * Mark all notifications for the authenticated user as read.
     */
    public function markAllAsRead(Request $request)
    {
        Notification::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update([
                'read_at' => now(),
            ]);

        return response()->json([
            'success' => true,
            'message' => 'All notifications marked as read.',
        ]);
    }

    /**
     * Stream new notifications for the authenticated user (SSE).
     */
    public function stream(Request $request)
    {
        $response = new \Symfony\Component\HttpFoundation\StreamedResponse(function () use ($request) {
            $user = $request->user();
            if (!$user) {
                return;
            }

            // Disable limit on execution time
            set_time_limit(0);

            // Fetch initial state
            $notifications = Notification::where('user_id', $user->id)
                ->orderByDesc('created_at')
                ->get();

            echo "data: " . json_encode($notifications) . "\n\n";
            ob_flush();
            flush();

            $lastHash = md5(json_encode($notifications));

            while (true) {
                if (connection_aborted()) {
                    break;
                }

                $currentNotifications = Notification::where('user_id', $user->id)
                    ->orderByDesc('created_at')
                    ->get();

                $currentHash = md5(json_encode($currentNotifications));

                if ($currentHash !== $lastHash) {
                    $lastHash = $currentHash;
                    echo "data: " . json_encode($currentNotifications) . "\n\n";
                    ob_flush();
                    flush();
                }

                sleep(2);

                // Send heartbeat to detect connection abortion
                echo ": heartbeat\n\n";
                ob_flush();
                flush();
            }
        });

        $response->headers->set('Content-Type', 'text/event-stream');
        $response->headers->set('X-Accel-Buffering', 'no');
        $response->headers->set('Cache-Control', 'no-cache');
        $response->headers->set('Connection', 'keep-alive');

        return $response;
    }
}
