<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string $role): Response
    {
        if (! $request->user() || $request->user()->role !== $role) {
            abort(Response::HTTP_FORBIDDEN, 'Bạn không có quyền truy cập tài nguyên này.');
        }

        return $next($request);
    }
}
