#!/bin/sh
set -e

# If .env does not exist, copy from .env.example
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
fi

# Run database migrations (force in production)
echo "Running database migrations..."
php artisan migrate --force

# Optimize Laravel for production
echo "Optimizing application configuration and routes..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Start Apache in the foreground
echo "Starting Apache..."
exec apache2-foreground
