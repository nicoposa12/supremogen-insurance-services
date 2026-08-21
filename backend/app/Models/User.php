<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasApiTokens, HasRoles;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'profile_photo_path',
        'is_archived',
        'archived_at',
        'archive_reason',
        'last_seen_at',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var list<string>
     */
    protected $appends = [
        'role_name',
        'profile_photo_url',
        'is_online',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_archived' => 'boolean',
            'archived_at' => 'datetime',
            'last_seen_at' => 'datetime',
        ];
    }

    /**
     * Determine if the user is currently online (active within the last 75 seconds).
     */
    public function getIsOnlineAttribute(): bool
    {
        if (!$this->last_seen_at) {
            return false;
        }

        return $this->last_seen_at->gt(now()->subSeconds(75));
    }

    /**
     * Check if the user is a sales agent or renewal team member.
     */
    public function isSalesOrRenewal(): bool
    {
        return $this->hasRole('Sales Agent') || $this->hasRole('Team Renewal');
    }

    /**
     * Get the user's primary role name.
     */
    public function getRoleNameAttribute(): string
    {
        return $this->roles->first()?->name ?? 'None';
    }

    /**
     * Get the URL to the user's profile photo.
     */
    public function getProfilePhotoUrlAttribute(): ?string
    {
        if (!$this->profile_photo_path) {
            return null;
        }

        if (str_starts_with($this->profile_photo_path, 'http://') || str_starts_with($this->profile_photo_path, 'https://')) {
            return $this->profile_photo_path;
        }

        $disk = config('filesystems.default');
        if ($disk === 'local') {
            $disk = 'public';
        }

        if ($disk === 'public') {
            return '/storage/' . $this->profile_photo_path;
        }

        // For cloud storage (R2, S3), serve through backend proxy
        return '/api/v1/storage/' . $this->profile_photo_path;
    }
}
