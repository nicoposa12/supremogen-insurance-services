<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Spatie\Permission\Models\Role;
use Illuminate\Validation\Rules\Password;
use App\Traits\Auditable;

class UserController extends Controller
{
    use Auditable;
    /**
     * Display a listing of the users.
     */
    public function index(Request $request)
    {
        $query = User::with('roles')
            ->when($request->user()->hasRole('Underwriter'), function ($q) {
                $q->whereNotIn('email', ['admin@supremogen.com', 'owner@supremogen.com']);
            })
            ->when($request->input('search'), function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
            });

        if ($request->boolean('no_paginate')) {
            $items = $query->get();
            $items->transform(function ($user) {
                $user->role_name = $user->getRoleNames()->first() ?? 'None';
                return $user;
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'current_page' => 1,
                    'data' => $items,
                    'first_page_url' => '',
                    'from' => 1,
                    'last_page' => 1,
                    'last_page_url' => '',
                    'next_page_url' => null,
                    'path' => $request->url(),
                    'per_page' => $items->count(),
                    'prev_page_url' => null,
                    'to' => $items->count(),
                    'total' => $items->count(),
                ],
            ]);
        }

        $perPage = min((int) $request->input('per_page', 15), 500);

        $users = $query->paginate($perPage);

        // Map roles to a simple string array for frontend convenience
        $users->getCollection()->transform(function ($user) {
            $user->role_name = $user->getRoleNames()->first() ?? 'None';
            return $user;
        });

        return response()->json([
            'success' => true,
            'data' => $users,
        ]);
    }

    /**
     * Store a newly created user.
     */
    public function store(Request $request)
    {
        // Automatically assign a default password for new accounts
        $request->merge(['password' => 'Password123!']);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => [
                'required',
                'string',
                Password::min(8)
                    ->letters()
                    ->mixedCase()
                    ->numbers()
                    ->symbols()
            ],
            'role' => 'required|string|exists:roles,name',
        ]);

        if ($request->user()->hasRole('Underwriter') && $request->input('role') === 'Administrator') {
            return response()->json([
                'success' => false,
                'message' => 'Underwriters cannot create or assign Administrator accounts.',
            ], 403);
        }

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        $user->assignRole($request->role);
        $user->role_name = $request->role;

        return response()->json([
            'success' => true,
            'message' => 'User account created successfully.',
            'data' => $user,
        ], 201);
    }

    /**
     * Display the specified user.
     */
    public function show(User $user)
    {
        if (request()->user()->hasRole('Underwriter') && in_array($user->email, ['admin@supremogen.com', 'owner@supremogen.com'])) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access.',
            ], 403);
        }

        $user->role_name = $user->getRoleNames()->first() ?? 'None';
        return response()->json([
            'success' => true,
            'data' => $user,
        ]);
    }

    /**
     * Update the specified user.
     */
    public function update(Request $request, User $user)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
            'password' => [
                'nullable',
                'string',
                Password::min(8)
                    ->letters()
                    ->mixedCase()
                    ->numbers()
                    ->symbols()
            ],
            'role' => 'required|string|exists:roles,name',
        ]);

        if ($request->user()->hasRole('Underwriter') && (in_array($user->email, ['admin@supremogen.com', 'owner@supremogen.com']) || $request->input('role') === 'Administrator')) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized action.',
            ], 403);
        }

        // Prevent changing the primary administrator's role
        if ($user->email === 'admin@supremogen.com' && $request->input('role') !== 'Administrator') {
            return response()->json([
                'success' => false,
                'message' => 'The primary administrator account role cannot be changed.',
            ], 422);
        }

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user->name = $request->name;
        $user->email = $request->email;

        if ($request->filled('password')) {
            $user->password = Hash::make($request->password);
        }

        $user->save();
        $user->syncRoles([$request->role]);
        $user->role_name = $request->role;

        return response()->json([
            'success' => true,
            'message' => 'User account updated successfully.',
            'data' => $user,
        ]);
    }

    /**
     * Remove the specified user.
     */
    public function destroy(User $user)
    {
        // Prevent deleting the currently logged-in user or the primary admin
        if ($user->id === auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot delete your own account.',
            ], 422);
        }

        if (request()->user()->hasRole('Underwriter') && in_array($user->email, ['admin@supremogen.com', 'owner@supremogen.com'])) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized action.',
            ], 403);
        }

        if ($user->email === 'admin@supremogen.com') {
            return response()->json([
                'success' => false,
                'message' => 'The primary administrator account cannot be deleted.',
            ], 422);
        }

        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'User account deleted successfully.',
        ]);
    }

    /**
     * Get all sales agents.
     */
    public function agents()
    {
        $agents = User::role(['Sales Agent', 'Team Renewal'])->with('roles')->orderBy('name', 'asc')->get();
        $agents->transform(function ($user) {
            $user->role_name = $user->getRoleNames()->first() ?? 'None';
            return $user;
        });
        return response()->json([
            'success' => true,
            'data' => $agents,
        ]);
    }

    /**
     * Impersonate a user account.
     */
    public function impersonate(Request $request, User $user)
    {
        // Don't allow Underwriter to impersonate Admin
        if ($request->user()->hasRole('Underwriter') && in_array($user->email, ['admin@supremogen.com', 'owner@supremogen.com'])) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized action.',
            ], 403);
        }

        // Get roles and permissions
        $roles = $user->getRoleNames();
        $permissions = $user->getAllPermissions()->pluck('name');

        // Create API token
        $token = $user->createToken('auth_token_impersonate')->plainTextToken;

        $this->audit('user.impersonate', $user, $request->user()->name . ' impersonated ' . $user->name . ' (' . $user->email . ')');

        return response()->json([
            'success' => true,
            'message' => 'Impersonating user successfully.',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ],
                'roles' => $roles,
                'permissions' => $permissions,
                'access_token' => $token,
                'token_type' => 'Bearer',
            ]
        ]);
    }
}

