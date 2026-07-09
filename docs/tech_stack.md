# Supremogen Insurance Services - Tech Stack Documentation

This document lists the entire technology stack, frameworks, libraries, and utilities used across the Supremogen Insurance Services application.

---

## 💻 Frontend Client

The frontend is a modern Single Page Application (SPA) built using React, TypeScript, and Vite, featuring a responsive, custom-themed UI using Tailwind CSS v4.

### Core Frameworks & Languages
- **React 19** (`^19.2.7`): Component-based UI library.
- **TypeScript 6.0** (`~6.0.2`): Typed superset of JavaScript for codebase reliability and autocompletion.
- **Vite 8** (`^8.1.0`): High-performance build tool and hot-reloading dev server.

### State Management & Data Fetching
- **TanStack React Query v5** (`^5.101.2`): Query, cache, and sync asynchronous server state.
- **Axios** (`^1.18.1`): Promise-based HTTP client for API communication.

### Routing & Navigation
- **React Router DOM v7** (`^7.18.0`): Client-side routing with nested layouts and protected route guards.

### Styling & Layout
- **Tailwind CSS v4** (`^4.3.1`): Utility-first CSS framework integrated via `@tailwindcss/vite`.
- **Lucide React** (`^1.22.0`): Clean, consistent icon set.

### Forms & Validation
- **React Hook Form** (`^7.80.0`): Performant, flexible form validation.
- **Zod** (`^4.4.3`): TypeScript-first schema declaration and validation library.

### Data Visualization
- **Recharts** (`^3.9.0`): Composabled React charts library for analytical dashboards.

### Quality Assurance & Linting
- **Oxlint** (`^1.69.0`): Ultra-fast JavaScript/TypeScript linter.

---

## ⚙️ Backend API

The backend is built as a RESTful API service leveraging the Laravel framework to handle core business logic, database migrations, authentication, and role authorization.

### Core Frameworks & Languages
- **PHP 8.2+** (`^8.2`): Backend programming language.
- **Laravel 12** (`^12.0`): Web framework for routing, database ORM, and dependency injection.

### Authentication & Authorization
- **Laravel Sanctum** (`^4.0`): Lightweight token-based API authentication.
- **Spatie Laravel Permission** (`^6.25`): Robust role-based access control (RBAC) supporting roles like Administrator, Underwriter, Sales Agent, Team Renewal, Accounting Officer, and Claims Officer.

### Development & Process Runners
- **Laravel Tinker** (`^2.10.1`): Interactive REPL command-line interface.
- **Laravel Sail**: Docker-based dev environment wrapper (default Laravel package, inactive/unused in this setup).
- **Laravel Pail**: Lightweight CLI tool to tail Laravel logs in real-time.
- **Concurrently** (`^9.0.1`): Process runner to simultaneously boot up local servers, queues, log watchers, and the frontend bundler.
- **Docker & Docker Compose**: Development environment containerization, isolating frontend, backend, and MySQL database.

---

## 🗄️ Database & Services

### Database Engine
- **MySQL 8.0 / MariaDB**: Core relational database for production and local environments (configured under database name `supremogen_db`).
- **SQLite**: Skeleton fallback database for instant prototyping and automated tests.

---

## 📁 Project Structure Directory Map

```yaml
supremogen/
├── frontend/                # React Vite Frontend SPA
│   ├── src/
│   │   ├── components/      # UI components & layouts (Sidebar, Topbar)
│   │   ├── context/         # React Contexts (Auth state)
│   │   ├── pages/           # View pages (Customers, Quotations, Invoices, etc.)
│   │   └── services/        # API integration clients (Axios wrappers)
│   ├── package.json         # Frontend dependencies configuration
│   └── vite.config.ts       # Vite build configurations
├── backend/                 # Laravel 12 Backend API REST Server
│   ├── app/
│   │   ├── Http/            # API Controllers & Middlewares
│   │   └── Models/          # Eloquent ORM Models (User, Quotation, Policy, etc.)
│   ├── database/            # Migrations & Seeders
│   ├── routes/              # API Route declarations
│   └── composer.json        # Backend composer packages configuration
└── docs/                    # System Documentation & Reference Files
```
