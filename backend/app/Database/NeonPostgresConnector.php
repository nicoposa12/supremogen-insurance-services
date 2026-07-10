<?php

namespace App\Database;

use Illuminate\Database\Connectors\PostgresConnector as BasePostgresConnector;

/**
 * Custom PostgresConnector that supports Neon's endpoint ID parameter.
 *
 * Neon requires the endpoint ID for SNI when the client's libpq doesn't
 * support SNI natively (common on XAMPP/Windows with libpq < 14).
 * This connector modifies the DSN to pass the endpoint via the dbname
 * parameter without quotes, which is the only workaround for old libpq.
 */
class NeonPostgresConnector extends BasePostgresConnector
{
    /**
     * Create a DSN string from a configuration, with Neon endpoint support.
     */
    protected function getDsn(array $config)
    {
        $dsn = parent::getDsn($config);

        // If a Neon endpoint is configured, we need to modify the dbname
        // to include options=endpoint=<id> WITHOUT single quotes around it.
        // Laravel generates: dbname='neondb' but libpq < 14 needs:
        // dbname=neondb options=endpoint=ep-xxx (unquoted)
        if (!empty($config['neon_endpoint'])) {
            $database = $config['database'] ?? 'neondb';
            $endpoint = $config['neon_endpoint'];

            // Replace the quoted dbname='xxx' with unquoted dbname=xxx options=endpoint=xxx
            $dsn = str_replace(
                "dbname='{$database}'",
                "dbname={$database} options=endpoint={$endpoint}",
                $dsn
            );
        }

        return $dsn;
    }
}
