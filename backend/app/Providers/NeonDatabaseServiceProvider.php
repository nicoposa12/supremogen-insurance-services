<?php

namespace App\Providers;

use App\Database\NeonPostgresConnector;
use Illuminate\Support\ServiceProvider;

class NeonDatabaseServiceProvider extends ServiceProvider
{
    /**
     * Register the custom Neon-compatible PostgreSQL connector.
     */
    public function register(): void
    {
        $this->app->bind('db.connector.pgsql', function () {
            return new NeonPostgresConnector;
        });
    }
}
