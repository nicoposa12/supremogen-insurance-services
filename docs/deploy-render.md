# Deploying the Laravel Backend on Render

This guide walks you through the process of deploying the **Supremogen Laravel API Backend** on **Render.com**. 

We have prepared the repository with all necessary production configurations to make deployment as smooth as possible.

---

## 🛠️ What We Configured For You
Before starting the deployment, we added/modified the following configurations to prepare the codebase for production on Render:
1. **[Production Dockerfile](file:///c:/Users/basco/supremogen/supremogen/backend/Dockerfile)**: Uses the official `php:8.2-apache` image, configures the Document Root to `/var/www/html/public`, installs production extensions (including MySQL and PostgreSQL support), enables URL rewriting (`mod_rewrite`), and installs optimized Composer dependencies.
2. **[Production Entrypoint Script](file:///c:/Users/basco/supremogen/supremogen/backend/docker-entrypoint.sh)**: Automates starting Apache, copying env configurations, running `php artisan migrate --force` to migrate the database on deploy, and caching configurations (`config:cache`, `route:cache`, `view:cache`) for high performance.
3. **[Render Blueprint Config](file:///c:/Users/basco/supremogen/supremogen/render.yaml)**: Allows deploying the database, backend, and frontend concurrently as a single, connected stack with one click.
4. **Database Portability**: Updated raw SQL queries in [DashboardController](file:///c:/Users/basco/supremogen/supremogen/backend/app/Http/Controllers/Api/V1/DashboardController.php) and [ReportController](file:///c:/Users/basco/supremogen/supremogen/backend/app/Http/Controllers/Api/V1/ReportController.php) from double quotes (`"ACTIVE"`) to standard SQL single quotes (`'ACTIVE'`). This makes the application compatible with both MySQL (for local dev) and PostgreSQL (for production Render database).

---

## 🗄️ Database Strategy for Render
Render does not offer a managed MySQL database natively. It offers managed **PostgreSQL** databases. You have two options:

### Option A: Use PostgreSQL on Render (Recommended)
You can provision a managed PostgreSQL database natively on Render. 
- Laravel is already fully configured for this.
- You will set `DB_CONNECTION=pgsql` in the backend environment variables.
- The Render Blueprint (`render.yaml`) automatically configures this database and connects it to the backend.

### Option B: Use External MySQL
If you want to keep MySQL, you can create a free or cheap MySQL database on a third-party host (such as **Aiven**, **Clever Cloud**, or **Railway**).
- You will set `DB_CONNECTION=mysql` in the backend environment variables.
- You will copy the connection credentials from the third-party provider into Render's backend environment variables (`DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`).

---

## 🚀 Method 1: Deploying via Render Blueprints (Recommended)
Render Blueprints read the `render.yaml` file in the root of the project to automatically configure and link your database, backend, and frontend.

### Step 1: Push Your Code to GitHub/GitLab
Make sure your changes are pushed to your remote repository:
```bash
git add .
git commit -m "chore: prepare codebase for Render deployment"
git push origin main
```

### Step 2: Create Blueprint on Render
1. Go to the [Render Dashboard](https://dashboard.render.com).
2. Click **New +** in the top right and select **Blueprint**.
3. Connect your GitHub/GitLab account and select your `supremogen` repository.
4. Render will read the `render.yaml` file and show a list of resources to create:
   - **`supremogen-db`** (PostgreSQL Database)
   - **`supremogen-backend`** (Docker Web Service)
   - **`supremogen-frontend`** (Static Site)
5. Review the plan details (all can run on the **Free** tier) and click **Apply**.

### Step 3: Configure `APP_KEY`
Laravel requires a 32-character base64-encoded `APP_KEY` to secure sessions and encryption.
1. Run this command locally on your machine to generate a key:
   ```bash
   php artisan key:generate --show
   ```
   *(Copy the output string, which starts with `base64:`)*
2. In the Render Dashboard, go to your **`supremogen-backend`** Web Service.
3. Go to **Environment** settings.
4. Locate the `APP_KEY` variable and replace `placeholder-replace-with-your-key` with your generated base64 key.
5. Click **Save Changes**. Render will automatically redeploy the backend with the correct key.

---

## 💻 Method 2: Manual Dashboard Setup
If you want to deploy the backend manually step-by-step through the Render interface:

### Step 1: Create a PostgreSQL Database (if using Render's DB)
1. In the Render Dashboard, click **New +** -> **PostgreSQL**.
2. Name it `supremogen-db`, select a region, and choose the **Free** tier.
3. Click **Create Database**.
4. Once created, copy the **Internal Database URL** (e.g., `postgresql://user:pass@host/db`).

### Step 2: Create the Backend Web Service
1. Click **New +** -> **Web Service**.
2. Select your repository.
3. Configure the following service settings:
   - **Name**: `supremogen-backend`
   - **Language**: `Docker`
   - **Docker Context**: `backend` *(This is important! Tell Render to look inside the backend directory)*
   - **Dockerfile Path**: `backend/Dockerfile`
   - **Instance Type**: `Free`
4. Click **Advanced** and add the following **Environment Variables**:

| Key | Value / Source |
| :--- | :--- |
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_KEY` | *(Your base64 key generated with `php artisan key:generate --show`)* |
| `DB_CONNECTION` | `pgsql` *(or `mysql` if using external MySQL)* |
| `DATABASE_URL` | *(Paste the **Internal Database URL** from Step 1. Laravel automatically parses this)* |

5. Click **Create Web Service**. Render will build the Docker container and start the Laravel application.

---

## 🔒 Post-Deployment & Verification

### Database Migrations
On every deployment, the backend's entrypoint script automatically runs:
```bash
php artisan migrate --force
```
This ensures your database tables and seeders are created or updated automatically. You do not need to run this command manually.

### CORS Settings (API Access)
If the frontend has trouble communicating with the API due to CORS policies, configure the CORS allowed origins in Laravel:
1. Open the file **`backend/config/cors.php`** (or edit the middleware if using newer Laravel versions).
2. Ensure that your frontend's Render URL (e.g., `https://supremogen-frontend.onrender.com`) is allowed.
3. You can set the backend environment variable `SANCTUM_STATEFUL_DOMAINS` and `SESSION_DOMAIN` to support secure cookie-based auth if needed.

### Checking logs
If anything goes wrong, you can tail the live logs directly in the Render dashboard under the **Logs** tab of the `supremogen-backend` service.
