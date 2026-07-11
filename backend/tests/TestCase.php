<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Bootstraps the application and overrides the database connection for testing.
     */
    public function createApplication()
    {
        $app = parent::createApplication();

        // Force SQLite in-memory database for testing
        $app['config']->set('database.default', 'sqlite');
        $app['config']->set('database.connections.sqlite.database', ':memory:');

        return $app;
    }
}
