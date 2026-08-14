<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class QueryParameterTokenAuth
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->query('token') ?: $request->input('token');

        if ($token && is_string($token) && $token !== 'null' && $token !== 'undefined' && trim($token) !== '') {
            $token = trim($token);
            $bearer = str_starts_with($token, 'Bearer ') ? $token : 'Bearer ' . $token;
            $request->headers->set('Authorization', $bearer);
            $request->server->set('HTTP_AUTHORIZATION', $bearer);
        }

        return $next($request);
    }
}
