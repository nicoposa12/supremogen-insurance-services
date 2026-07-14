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

# Start background queue worker to process emails independently of HTTP requests
echo "Starting background queue worker..."
php artisan queue:work --sleep=10 --tries=3 --timeout=60 &

# Start scheduler loop in background (runs every 60 seconds)
echo "Starting scheduler loop..."
(while true; do php artisan schedule:run --no-interaction >> /var/www/html/storage/logs/scheduler.log 2>&1; sleep 60; done) &

# Start Apache in the foreground
echo "Starting Apache..."
exec apache2-foreground
