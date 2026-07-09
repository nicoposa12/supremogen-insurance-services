# Docker & Docker Compose Commands Reference

This guide provides a list of useful Docker and Docker Compose commands for running, managing, and debugging the Supremogen application.

---

## 🚀 Basic Operations

Always run these commands from the root directory of the project (`supremogen/`).

### Start the Application
Starts all containers in the background:
```bash
docker compose up -d
```

### Start and Force Rebuild
Rebuilds the container images and starts them (useful if you change `package.json`, `composer.json`, or a `Dockerfile`):
```bash
docker compose up -d --build
```

### Stop the Application
Stops and removes the running containers **without** losing your database data:
```bash
docker compose down
```

### Stop and Wipe Database
Stops containers and **permanently deletes** the database volume (`mysql_data`). All custom accounts and tables are deleted:
```bash
docker compose down -v
```

### Restart Services
Restarts all running containers without rebuilding them:
```bash
docker compose restart
```

---

## 📊 Monitoring & Logs

### View Container Status
Lists all running containers, their ports, and their health status:
```bash
docker compose ps
```

### View Live logs
Follows and outputs system logs for all containers in real-time:
```bash
docker compose logs -f
```

### View Logs for a Specific Service
Follows logs only for the backend container:
```bash
docker compose logs backend -f
```
Follows logs only for the frontend container:
```bash
docker compose logs frontend -f
```

---

## ⚙️ Running Commands inside Containers

Use `docker compose exec` to run commands inside a running container.

### Run Database Migrations
Runs any outstanding database migrations:
```bash
docker compose exec backend php artisan migrate
```

### Run Database Seeds
Seeds the database with test data (default administrator account):
```bash
docker compose exec backend php artisan db:seed
```

### Reset Database (Fresh Migration & Seed)
Wipes all database tables, re-migrates, and re-seeds:
```bash
docker compose exec backend php artisan migrate:fresh --seed
```

### Open Laravel Tinker
Opens Laravel's interactive PHP console inside the backend container:
```bash
docker compose exec backend php artisan tinker
```

### Open MySQL Console
Connects directly to the MySQL terminal inside the database container:
```bash
docker compose exec db mysql -u root -ppassroot supremogen_db
```

### Open Container Shell
Opens an interactive Linux command shell inside the backend container (type `exit` to close):
```bash
docker compose exec backend sh
```

---

## 🧹 Docker Disk Cleanup

If Docker accumulates too much cache or takes up too much disk space:

### Safe Cleanup
Removes stopped containers, unused networks, and dangling image builds:
```bash
docker system prune
```

### Deep Cleanup
Removes **all** unused Docker resources, including volumes and unused base images:
```bash
docker system prune -a --volumes
```
