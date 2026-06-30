# Supremogen — Digital Insurance Management System: Implementation Plan

> **Company:** Supremogen Insurance Services (Non-Life Insurance Agency)
> **Document Version:** 1.0
> **Created:** 2026-06-29
> **Status:** Draft — Awaiting Approval

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Technology Stack Breakdown](#technology-stack-breakdown)
4. [Project Folder Structure](#project-folder-structure)
5. [Database Design & Schema](#database-design--schema)
6. [Phase 1 — Corporate Website](#phase-1--corporate-website)
7. [Phase 2 — Core Insurance Management System](#phase-2--core-insurance-management-system)
8. [Phase 3 — Flutter Mobile Application](#phase-3--flutter-mobile-application)
9. [API Design & Standards](#api-design--standards)
10. [Authentication & Authorization](#authentication--authorization)
11. [Security Implementation](#security-implementation)
12. [UI/UX Strategy](#uiux-strategy)
13. [Testing Strategy](#testing-strategy)
14. [Deployment & DevOps](#deployment--devops)
15. [Risk Assessment & Mitigation](#risk-assessment--mitigation)
16. [Timeline & Milestones](#timeline--milestones)
17. [Final Deliverables Checklist](#final-deliverables-checklist)

---

## Executive Summary

This document outlines the complete implementation plan for the **Supremogen Digital Insurance Management System** — a production-ready platform that digitizes insurance operations including customer management, quotation generation, policy issuance, claims management, accounting, renewals, and reporting.

The project follows a **three-phase approach**:

| Phase | Scope | Dependency |
|-------|-------|------------|
| **Phase 1** | Corporate Website (public-facing) | None |
| **Phase 2** | Core Insurance Management System (internal) | Phase 1 complete |
| **Phase 3** | Flutter Mobile Application (customer-facing) | Phase 2 complete, REST API fully tested |

Development will proceed **module-by-module**, completing and testing each module before advancing to the next.

---

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│                                                                 │
│   ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│   │  React + TS +    │  │  Corporate   │  │  Flutter Mobile  │  │
│   │  Tailwind (SPA)  │  │  Website     │  │  App (Phase 3)   │  │
│   │  (Phase 2)       │  │  (Phase 1)   │  │                  │  │
│   └────────┬─────────┘  └──────┬───────┘  └────────┬─────────┘  │
│            │                   │                   │             │
└────────────┼───────────────────┼───────────────────┼─────────────┘
             │                   │                   │
             ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API GATEWAY LAYER                         │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │            Laravel REST API  (/api/v1/...)              │   │
│   │            Laravel Sanctum Token Authentication         │   │
│   │            Rate Limiting · CORS · Validation            │   │
│   └─────────────────────────┬───────────────────────────────┘   │
│                             │                                   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                          │
│                                                                 │
│   Controllers → Form Requests → Services → Repositories        │
│   Events → Listeners → Notifications → Jobs (Queues)           │
│   Policies (Authorization) · Observers · Resources             │
│                                                                 │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                               │
│                                                                 │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│   │   MySQL DB   │  │  File Storage│  │  Cache (Redis/File)  │  │
│   │  (Eloquent   │  │  (Documents, │  │  Sessions, Tokens    │  │
│   │   ORM)       │  │   IDs, etc.) │  │                      │  │
│   └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend–Backend separation | Yes | Decoupled SPA + API enables mobile reuse |
| API versioning | `/api/v1` prefix | Future-proofing for breaking changes |
| Authentication | Laravel Sanctum (SPA + Token) | Native Laravel, supports both SPA cookies and mobile API tokens |
| Authorization | Spatie `laravel-permission` | Industry-standard RBAC package with caching |
| File storage | Laravel Filesystem (local/S3) | Abstracted, swappable between local and cloud |
| Queues | Database driver (upgradable to Redis) | Simple start, easy to upgrade |

---

## Technology Stack Breakdown

### Frontend (Web)

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI framework |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Utility-first styling |
| React Router | 7.x | Client-side routing |
| Axios | 1.x | HTTP client |
| React Hook Form | 7.x | Form state management |
| Zod | 3.x | Schema validation |
| TanStack Query | 5.x | Server state & caching |
| Recharts / Chart.js | latest | Dashboard charts & analytics |
| React-Toastify | latest | Toast notifications |
| jsPDF + xlsx | latest | PDF & Excel export |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| PHP | 8.3+ | Runtime |
| Laravel | 12.x | Application framework |
| Laravel Sanctum | latest | SPA + API token authentication |
| Spatie Permission | latest | RBAC roles & permissions |
| Laravel Excel (Maatwebsite) | latest | Excel exports |
| DomPDF / Snappy | latest | PDF generation |
| Laravel Notification | built-in | Email + in-app notifications |
| Laravel Scout (optional) | latest | Full-text search |

### Database

| Technology | Version | Purpose |
|------------|---------|---------|
| MySQL | 8.0+ | Primary RDBMS |

### Mobile (Phase 3)

| Technology | Version | Purpose |
|------------|---------|---------|
| Flutter | 3.x | Cross-platform mobile framework |
| Dart | 3.x | Programming language |
| Dio | latest | HTTP client |
| Provider / Riverpod | latest | State management |

---

## Project Folder Structure

```
supremogen/
│
├── backend/                          # Laravel API Application
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   │   └── Api/
│   │   │   │       └── V1/
│   │   │   │           ├── Auth/
│   │   │   │           │   ├── LoginController.php
│   │   │   │           │   ├── RegisterController.php
│   │   │   │           │   ├── ForgotPasswordController.php
│   │   │   │           │   └── ProfileController.php
│   │   │   │           ├── CustomerController.php
│   │   │   │           ├── QuotationController.php
│   │   │   │           ├── PolicyController.php
│   │   │   │           ├── ClaimController.php
│   │   │   │           ├── PaymentController.php
│   │   │   │           ├── InvoiceController.php
│   │   │   │           ├── RenewalController.php
│   │   │   │           ├── ReportController.php
│   │   │   │           ├── NotificationController.php
│   │   │   │           ├── DashboardController.php
│   │   │   │           ├── InquiryController.php
│   │   │   │           └── SettingController.php
│   │   │   ├── Middleware/
│   │   │   │   ├── RoleMiddleware.php
│   │   │   │   └── AuditLogMiddleware.php
│   │   │   ├── Requests/
│   │   │   │   ├── Customer/
│   │   │   │   ├── Quotation/
│   │   │   │   ├── Policy/
│   │   │   │   ├── Claim/
│   │   │   │   ├── Payment/
│   │   │   │   └── ...
│   │   │   └── Resources/
│   │   │       ├── CustomerResource.php
│   │   │       ├── QuotationResource.php
│   │   │       ├── PolicyResource.php
│   │   │       └── ...
│   │   ├── Models/
│   │   │   ├── User.php
│   │   │   ├── Customer.php
│   │   │   ├── InsuranceProduct.php
│   │   │   ├── Quotation.php
│   │   │   ├── QuotationItem.php
│   │   │   ├── Policy.php
│   │   │   ├── PolicyCoverage.php
│   │   │   ├── Claim.php
│   │   │   ├── ClaimDocument.php
│   │   │   ├── Payment.php
│   │   │   ├── Invoice.php
│   │   │   ├── Renewal.php
│   │   │   ├── Notification.php
│   │   │   ├── ActivityLog.php
│   │   │   ├── AuditLog.php
│   │   │   ├── Setting.php
│   │   │   └── Inquiry.php
│   │   ├── Services/
│   │   │   ├── CustomerService.php
│   │   │   ├── QuotationService.php
│   │   │   ├── PolicyService.php
│   │   │   ├── ClaimService.php
│   │   │   ├── PaymentService.php
│   │   │   ├── RenewalService.php
│   │   │   ├── ReportService.php
│   │   │   ├── NotificationService.php
│   │   │   └── DashboardService.php
│   │   ├── Repositories/
│   │   │   └── (mirrors Services structure)
│   │   ├── Policies/                 # Authorization policies
│   │   ├── Observers/
│   │   ├── Events/
│   │   ├── Listeners/
│   │   ├── Notifications/
│   │   │   ├── RenewalReminderNotification.php
│   │   │   ├── ClaimStatusNotification.php
│   │   │   ├── QuotationUpdateNotification.php
│   │   │   └── PolicyUpdateNotification.php
│   │   └── Jobs/
│   ├── database/
│   │   ├── migrations/
│   │   ├── seeders/
│   │   └── factories/
│   ├── routes/
│   │   └── api.php
│   ├── config/
│   ├── tests/
│   │   ├── Feature/
│   │   └── Unit/
│   └── ...
│
├── frontend/                         # React SPA Application
│   ├── src/
│   │   ├── api/                      # Axios instance & API helpers
│   │   │   ├── axiosClient.ts
│   │   │   ├── authApi.ts
│   │   │   ├── customerApi.ts
│   │   │   ├── quotationApi.ts
│   │   │   ├── policyApi.ts
│   │   │   ├── claimApi.ts
│   │   │   ├── paymentApi.ts
│   │   │   ├── renewalApi.ts
│   │   │   ├── reportApi.ts
│   │   │   └── dashboardApi.ts
│   │   ├── components/
│   │   │   ├── ui/                   # Reusable UI primitives
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Table.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── Pagination.tsx
│   │   │   │   ├── Spinner.tsx
│   │   │   │   ├── Toast.tsx
│   │   │   │   └── ...
│   │   │   ├── layout/
│   │   │   │   ├── DashboardLayout.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   └── WebsiteLayout.tsx
│   │   │   └── forms/
│   │   │       ├── CustomerForm.tsx
│   │   │       ├── QuotationForm.tsx
│   │   │       ├── ClaimForm.tsx
│   │   │       └── ...
│   │   ├── pages/
│   │   │   ├── website/              # Phase 1 — Public pages
│   │   │   │   ├── HomePage.tsx
│   │   │   │   ├── AboutPage.tsx
│   │   │   │   ├── ProductsPage.tsx
│   │   │   │   ├── ContactPage.tsx
│   │   │   │   └── FAQPage.tsx
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   ├── ForgotPasswordPage.tsx
│   │   │   │   └── ResetPasswordPage.tsx
│   │   │   ├── dashboard/
│   │   │   ├── customers/
│   │   │   ├── sales/
│   │   │   ├── underwriting/
│   │   │   ├── accounting/
│   │   │   ├── claims/
│   │   │   ├── renewals/
│   │   │   ├── reports/
│   │   │   └── settings/
│   │   ├── hooks/                    # Custom React hooks
│   │   ├── context/                  # Auth & Theme context providers
│   │   ├── types/                    # TypeScript interfaces & types
│   │   ├── utils/                    # Helpers, formatters, constants
│   │   ├── routes/                   # Route definitions & guards
│   │   ├── schemas/                  # Zod validation schemas
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── public/
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── package.json
│
├── mobile/                           # Flutter Application (Phase 3)
│   ├── lib/
│   │   ├── models/
│   │   ├── services/
│   │   ├── providers/
│   │   ├── screens/
│   │   ├── widgets/
│   │   └── main.dart
│   └── pubspec.yaml
│
├── docs/                             # Documentation
│   ├── supremogen-project.md
│   ├── implementation-plan.md        # ← This document
│   ├── api-documentation.md
│   ├── database-schema.md
│   ├── user-manual.md
│   └── deployment-guide.md
│
└── README.md
```

---

## Database Design & Schema

### Entity-Relationship Overview

```
┌─────────┐       ┌───────────┐       ┌──────────────┐
│  users  │──┐    │   roles   │───────│ permissions  │
└─────────┘  │    └───────────┘       └──────────────┘
             │
             ├─── activity_logs
             ├─── audit_logs
             │
┌────────────┴─────────┐
│     customers        │
│  (linked to user)    │
└──────────┬───────────┘
           │
     ┌─────┴──────────────────────────────┐
     │                                    │
     ▼                                    ▼
┌──────────────┐                   ┌─────────────┐
│  quotations  │                   │   claims    │
│              │                   │             │
│ quotation_   │                   │ claim_      │
│ items        │                   │ documents   │
└──────┬───────┘                   └─────────────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│   policies   │────▶│   renewals   │
│              │     └──────────────┘
│ policy_      │
│ coverages    │
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│   invoices   │────▶│   payments   │
└──────────────┘     └──────────────┘

┌────────────────────┐    ┌──────────────┐    ┌──────────┐
│ insurance_products │    │ notifications│    │ settings │
└────────────────────┘    └──────────────┘    └──────────┘
                          ┌──────────────┐
                          │  inquiries   │
                          └──────────────┘
```

### Migration Plan (Ordered by Dependencies)

| Order | Table | Key Relationships | Notes |
|-------|-------|-------------------|-------|
| 1 | `roles` | — | Seeded with default roles |
| 2 | `permissions` | — | Seeded with all module permissions |
| 3 | `role_permission` (pivot) | roles, permissions | Many-to-many |
| 4 | `users` | — | Has role assignment |
| 5 | `model_has_roles` (pivot) | users, roles | Spatie convention |
| 6 | `model_has_permissions` (pivot) | users, permissions | Spatie convention |
| 7 | `settings` | — | System configuration |
| 8 | `insurance_products` | — | Product catalog |
| 9 | `customers` | users (nullable FK) | Customer may have a user account |
| 10 | `quotations` | customers, users (sales agent), insurance_products | — |
| 11 | `quotation_items` | quotations | Line items with coverage details |
| 12 | `policies` | quotations, customers, users (underwriter) | Issued from approved quotation |
| 13 | `policy_coverages` | policies | Coverage breakdown |
| 14 | `claims` | policies, customers, users (claims officer) | — |
| 15 | `claim_documents` | claims | Uploaded files |
| 16 | `invoices` | policies, customers | Generated on policy issuance |
| 17 | `payments` | invoices, customers | Payment records |
| 18 | `renewals` | policies | Renewal tracking |
| 19 | `notifications` | users | Polymorphic notifiable |
| 20 | `activity_logs` | users | General activity tracking |
| 21 | `audit_logs` | users | Data change audit trail |
| 22 | `inquiries` | — | Public website form submissions |

### Key Column Definitions

#### `users`
```
id, name, email, password, phone, avatar, email_verified_at,
is_active, last_login_at, created_at, updated_at, deleted_at
```

#### `customers`
```
id, user_id (nullable FK), first_name, last_name, email, phone,
address, city, province, zip_code, date_of_birth, gender,
valid_id_type, valid_id_path, status (active/inactive),
created_at, updated_at, deleted_at
```

#### `quotations`
```
id, quotation_number (unique), customer_id (FK), product_id (FK),
agent_id (FK→users), underwriter_id (FK→users, nullable),
status (draft/pending/approved/rejected/expired),
total_premium, remarks, valid_until,
approved_at, rejected_at, rejection_reason,
created_at, updated_at, deleted_at
```

#### `policies`
```
id, policy_number (unique), quotation_id (FK), customer_id (FK),
product_id (FK), underwriter_id (FK→users),
status (active/expired/cancelled/lapsed),
effective_date, expiry_date, total_premium,
terms_and_conditions, issued_at,
created_at, updated_at, deleted_at
```

#### `claims`
```
id, claim_number (unique), policy_id (FK), customer_id (FK),
claims_officer_id (FK→users, nullable),
type, description, incident_date, filed_date,
status (filed/under_investigation/approved/rejected/settled),
approved_amount, settled_amount, remarks,
approved_at, rejected_at, settled_at, rejection_reason,
created_at, updated_at, deleted_at
```

#### `invoices`
```
id, invoice_number (unique), policy_id (FK), customer_id (FK),
amount, tax, total, status (unpaid/partial/paid/overdue),
due_date, paid_at,
created_at, updated_at, deleted_at
```

#### `payments`
```
id, receipt_number (unique), invoice_id (FK), customer_id (FK),
amount, payment_method (cash/check/bank_transfer/online),
reference_number, payment_date, remarks,
created_at, updated_at
```

> [!NOTE]
> All tables will use **soft deletes** where applicable, **UUID primary keys** (optional — can use auto-increment for simplicity), and **proper indexes** on foreign keys, status columns, and date columns used in queries.

---

## Phase 1 — Corporate Website

### Scope

Build a modern, responsive, SEO-friendly public website for Supremogen Insurance Services.

### Pages & Components

| Page | Route | Key Features |
|------|-------|--------------|
| **Home** | `/` | Hero banner, services overview, CTA, testimonials, partners |
| **About Us** | `/about` | Company history, mission/vision, team, values |
| **Insurance Products** | `/products` | Product cards, detailed product pages, coverage details |
| **Contact Us** | `/contact` | Contact form, Google Maps embed, office info, social links |
| **FAQs** | `/faqs` | Accordion-style Q&A, categorized, searchable |
| **Inquiry Form** | `/inquiry` | Multi-field form connected to Laravel API |

### Implementation Tasks

#### Backend (Laravel API)

| # | Task | Details |
|---|------|---------|
| 1.1 | Initialize Laravel project | `laravel new backend`, configure `.env`, MySQL connection |
| 1.2 | Create Inquiry model & migration | `inquiries` table: name, email, phone, subject, message, status, responded_at |
| 1.3 | Create `InquiryController` | `POST /api/v1/inquiries` — store inquiry with validation |
| 1.4 | Create `InquiryRequest` | Form request with validation rules (name, email, phone, message) |
| 1.5 | Email notification on inquiry | Send email to admin when new inquiry is submitted |
| 1.6 | CMS API endpoints | CRUD for managing website content (hero text, about content, product listings, FAQs) |
| 1.7 | Settings seeder | Seed default website content |
| 1.8 | CORS configuration | Allow frontend origin |

#### Frontend (React + TypeScript + Tailwind)

| # | Task | Details |
|---|------|---------|
| 1.9 | Initialize React project | Vite + React + TypeScript + Tailwind CSS |
| 1.10 | Configure Axios client | Base URL, interceptors, error handling |
| 1.11 | Create `WebsiteLayout` | Header, navigation, footer, responsive hamburger menu |
| 1.12 | Build Home page | Hero section, services grid, CTA, testimonials carousel |
| 1.13 | Build About page | Company info, team section, mission/vision |
| 1.14 | Build Products page | Product listing with expandable details |
| 1.15 | Build Contact page | Contact form (React Hook Form + Zod), Google Maps embed |
| 1.16 | Build FAQ page | Accordion component, categorized questions |
| 1.17 | Build Inquiry form | Multi-step or single-page form, success feedback |
| 1.18 | SEO optimization | Meta tags, Open Graph, semantic HTML, structured data |
| 1.19 | Performance optimization | Lazy loading, image optimization, code splitting |
| 1.20 | Responsive testing | Desktop, tablet, mobile breakpoints |

### Phase 1 Deliverables

- [ ] Fully functional public website with all 6 pages
- [ ] Inquiry form connected to Laravel API
- [ ] Admin CMS endpoints for content management
- [ ] SEO-optimized pages
- [ ] Responsive across all device sizes

---

## Phase 2 — Core Insurance Management System

### Module Development Order

Development proceeds module-by-module. Each module must be **completed and tested** before starting the next.

```
┌────────────────────────────────────────────────────────────────┐
│                    MODULE BUILD ORDER                           │
│                                                                │
│   1. Authentication & RBAC                                     │
│   2. Dashboard Module                                          │
│   3. Customer Records Module                                   │
│   4. Sales Module (Quotations & Policies)                      │
│   5. Underwriter Module                                        │
│   6. Accounting Module (Invoices & Payments)                   │
│   7. Claims Module                                             │
│   8. Renewals Module                                           │
│   9. Reports Module                                            │
│  10. Notification System                                       │
│  11. Settings & System Configuration                           │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

### Module 1: Authentication & RBAC

#### Backend Tasks

| # | Task | Details |
|---|------|---------|
| 2.1.1 | Install & configure Sanctum | SPA authentication with cookie-based sessions |
| 2.1.2 | Install & configure Spatie Permission | Roles, permissions, middleware |
| 2.1.3 | Create auth controllers | Login, logout, forgot/reset password, profile management |
| 2.1.4 | Seed roles | Administrator, Sales Agent, Underwriter, Accounting Officer, Claims Officer, Customer |
| 2.1.5 | Seed permissions | Per-module CRUD permissions (e.g., `customers.view`, `customers.create`, etc.) |
| 2.1.6 | Middleware setup | `role`, `permission`, `auth:sanctum` middleware groups |
| 2.1.7 | User management API | Admin CRUD for users, role assignment |

#### Frontend Tasks

| # | Task | Details |
|---|------|---------|
| 2.1.8 | Create `AuthContext` | Auth state, user info, token management |
| 2.1.9 | Build Login page | Email/password form, remember me, error handling |
| 2.1.10 | Build Forgot Password page | Email input, success message |
| 2.1.11 | Build Reset Password page | New password form with token |
| 2.1.12 | Build Profile page | View/edit profile, change password, avatar upload |
| 2.1.13 | Route guards | `ProtectedRoute` component, role-based redirects |
| 2.1.14 | `DashboardLayout` | Sidebar navigation (role-aware), header with user menu |

---

### Module 2: Dashboard

#### Backend Tasks

| # | Task | Details |
|---|------|---------|
| 2.2.1 | Dashboard statistics API | `GET /api/v1/dashboard/stats` — aggregated counts & amounts |
| 2.2.2 | Recent transactions API | `GET /api/v1/dashboard/recent` — latest activities |
| 2.2.3 | Charts data API | `GET /api/v1/dashboard/charts` — time-series data for charts |
| 2.2.4 | Role-specific dashboard data | Different stats per role |

#### Frontend Tasks

| # | Task | Details |
|---|------|---------|
| 2.2.5 | Statistics cards component | Total customers, active policies, pending claims, revenue |
| 2.2.6 | Charts component | Sales overview (bar), policies by type (pie), monthly revenue (line) |
| 2.2.7 | Recent transactions table | Sortable, clickable rows |
| 2.2.8 | Quick actions panel | Role-specific shortcuts (new quotation, register customer, etc.) |
| 2.2.9 | Notifications widget | Bell icon with dropdown, unread count |

---

### Module 3: Customer Records

#### Backend Tasks

| # | Task | Details |
|---|------|---------|
| 2.3.1 | Customer model, migration, factory, seeder | Full schema as defined above |
| 2.3.2 | `CustomerController` (CRUD) | Index (paginated, filterable, sortable), show, store, update, destroy |
| 2.3.3 | `CustomerRequest` validation | Validate all fields, unique email, file upload rules |
| 2.3.4 | `CustomerResource` | API resource for consistent JSON output |
| 2.3.5 | `CustomerService` | Business logic (status management, document handling) |
| 2.3.6 | File upload handling | Valid ID and document uploads (validated, stored securely) |
| 2.3.7 | Customer search API | `GET /api/v1/customers/search?q=` — full-text search |

#### Frontend Tasks

| # | Task | Details |
|---|------|---------|
| 2.3.8 | Customer list page | Data table with search, filters (status), pagination, sorting |
| 2.3.9 | Customer registration form | Multi-section form with file uploads, Zod validation |
| 2.3.10 | Customer profile page | Details view, uploaded documents, linked policies, transaction history |
| 2.3.11 | Customer edit form | Pre-populated form, inline validation |

---

### Module 4: Sales (Quotations & Policies)

#### Backend Tasks

| # | Task | Details |
|---|------|---------|
| 2.4.1 | InsuranceProduct model & seed data | Product types, base premiums, coverage options |
| 2.4.2 | Quotation model & migration | Full schema, auto-generate quotation numbers |
| 2.4.3 | QuotationItem model & migration | Line-item coverages with amounts |
| 2.4.4 | `QuotationController` (CRUD) | Create, update, submit for approval, history |
| 2.4.5 | `QuotationService` | Premium calculation, status transitions, approval workflow |
| 2.4.6 | Policy model & migration | Auto-generate policy numbers, linked to quotation |
| 2.4.7 | PolicyCoverage model & migration | Coverage breakdown per policy |
| 2.4.8 | `PolicyController` (CRUD) | Issue policy from approved quotation, cancel, view |
| 2.4.9 | `PolicyService` | Issuance logic, status management, PDF generation |
| 2.4.10 | Commission tracking | Calculate and record agent commissions |
| 2.4.11 | Policy PDF generation | Printable policy document |

#### Frontend Tasks

| # | Task | Details |
|---|------|---------|
| 2.4.12 | Quotation list page | Filter by status, date range, agent |
| 2.4.13 | Create quotation form | Customer selection, product selection, coverage items, premium preview |
| 2.4.14 | Quotation detail page | View, approve/reject (role-based), print |
| 2.4.15 | Policy list page | Filter by status, product, date range |
| 2.4.16 | Policy detail page | Full details, coverages, linked quotation, print |
| 2.4.17 | Sales monitoring dashboard | Metrics, charts, commission tracking |

---

### Module 5: Underwriter

#### Backend Tasks

| # | Task | Details |
|---|------|---------|
| 2.5.1 | Risk assessment logic | Scoring based on product type, coverage, customer profile |
| 2.5.2 | Underwriter queue API | `GET /api/v1/underwriting/queue` — pending quotations for review |
| 2.5.3 | Approve/reject endpoints | `POST /api/v1/underwriting/{id}/approve`, `/reject` |
| 2.5.4 | Remarks & recommendations | Add underwriter notes to quotations/policies |

#### Frontend Tasks

| # | Task | Details |
|---|------|---------|
| 2.5.5 | Underwriter queue page | Pending quotations with risk scores |
| 2.5.6 | Quotation review page | Full details, risk assessment, approve/reject with remarks |
| 2.5.7 | Coverage review interface | Edit coverage terms before approval |

---

### Module 6: Accounting (Invoices & Payments)

#### Backend Tasks

| # | Task | Details |
|---|------|---------|
| 2.6.1 | Invoice model & migration | Auto-generated on policy issuance |
| 2.6.2 | `InvoiceController` | Generate, view, list, track status |
| 2.6.3 | `InvoiceService` | Auto-generation, due date calculation, overdue detection |
| 2.6.4 | Payment model & migration | Record payments against invoices |
| 2.6.5 | `PaymentController` | Record payment, generate receipt, payment history |
| 2.6.6 | `PaymentService` | Partial payments, overpayment handling, receipt generation |
| 2.6.7 | Official receipt PDF | Generate printable receipt with receipt number |
| 2.6.8 | Financial summary API | Revenue, outstanding balances, payment trends |

#### Frontend Tasks

| # | Task | Details |
|---|------|---------|
| 2.6.9 | Invoice list page | Filter by status (paid, unpaid, overdue, partial) |
| 2.6.10 | Invoice detail page | Line items, payment history, print |
| 2.6.11 | Record payment form | Amount, method, reference, date |
| 2.6.12 | Payment history page | All payments with receipt links |
| 2.6.13 | Financial summary dashboard | Revenue charts, outstanding balances, aging report |

---

### Module 7: Claims

#### Backend Tasks

| # | Task | Details |
|---|------|---------|
| 2.7.1 | Claim model & migration | Full schema, auto-generate claim numbers |
| 2.7.2 | ClaimDocument model & migration | File uploads linked to claims |
| 2.7.3 | `ClaimController` (CRUD) | File claim, assign, update status, view |
| 2.7.4 | `ClaimService` | Status workflow (filed → investigation → approved/rejected → settled) |
| 2.7.5 | Claims assignment | Assign to claims officer |
| 2.7.6 | Claims investigation notes | Add investigation findings and timeline |

#### Frontend Tasks

| # | Task | Details |
|---|------|---------|
| 2.7.7 | Claims list page | Filter by status, policy, date range |
| 2.7.8 | File claim form | Select policy, description, incident date, document uploads |
| 2.7.9 | Claim detail page | Full timeline, documents viewer, status updates |
| 2.7.10 | Claims officer workspace | Assigned claims, investigation tools, approve/reject |

---

### Module 8: Renewals

#### Backend Tasks

| # | Task | Details |
|---|------|---------|
| 2.8.1 | Renewal model & migration | Link to policy, track renewal dates |
| 2.8.2 | `RenewalController` | List upcoming, renew policy, renewal history |
| 2.8.3 | `RenewalService` | Auto-detect upcoming expirations, generate renewal quotation |
| 2.8.4 | Scheduled renewal reminders | Laravel scheduler: 30-day, 15-day, 7-day reminders |
| 2.8.5 | Expired policies detection | Scheduled job to update policy status |

#### Frontend Tasks

| # | Task | Details |
|---|------|---------|
| 2.8.6 | Upcoming renewals page | Policies expiring in 30/60/90 days |
| 2.8.7 | Renewal action page | One-click renew, modify coverage, generate new quotation |
| 2.8.8 | Renewal history page | Past renewals per customer/policy |
| 2.8.9 | Expired policies page | List of lapsed/expired policies |

---

### Module 9: Reports

#### Backend Tasks

| # | Task | Details |
|---|------|---------|
| 2.9.1 | Report generation service | Aggregation queries for each report type |
| 2.9.2 | Customer reports API | Customer demographics, status distribution |
| 2.9.3 | Sales reports API | Sales by agent, product, period |
| 2.9.4 | Policy reports API | Active/expired/cancelled breakdown |
| 2.9.5 | Claims reports API | Claims by status, type, period, loss ratio |
| 2.9.6 | Accounting reports API | Revenue, receivables, collection efficiency |
| 2.9.7 | Renewal reports API | Renewal rate, upcoming expirations |
| 2.9.8 | PDF export | DomPDF templates for each report |
| 2.9.9 | Excel export | Maatwebsite/Laravel-Excel for spreadsheet exports |

#### Frontend Tasks

| # | Task | Details |
|---|------|---------|
| 2.9.10 | Reports dashboard | Report type selection, date range filters |
| 2.9.11 | Report viewer | Charts + data tables for each report type |
| 2.9.12 | Export buttons | Download as PDF, Excel; Print button |
| 2.9.13 | Analytics charts | Interactive charts (Recharts) with drill-down |

---

### Module 10: Notification System

#### Backend Tasks

| # | Task | Details |
|---|------|---------|
| 2.10.1 | Notification model (Laravel built-in) | Database-backed notifications |
| 2.10.2 | In-app notification channels | Store notifications for in-app display |
| 2.10.3 | Email notification channels | Mailable templates for each event type |
| 2.10.4 | Event-driven notifications | Fire events on: quotation status change, policy issuance, claim update, renewal reminder, payment receipt |
| 2.10.5 | Mark as read API | `POST /api/v1/notifications/{id}/read` |
| 2.10.6 | Notification preferences | User can configure which notifications to receive |

#### Frontend Tasks

| # | Task | Details |
|---|------|---------|
| 2.10.7 | Notification bell component | Header icon with unread count badge |
| 2.10.8 | Notification dropdown | Recent notifications with quick actions |
| 2.10.9 | Notification center page | All notifications, filterable, mark as read/unread |

---

### Module 11: Settings & System Configuration

#### Backend Tasks

| # | Task | Details |
|---|------|---------|
| 2.11.1 | Settings CRUD API | System-wide settings (company info, email config, defaults) |
| 2.11.2 | User management API | Admin-only user CRUD, role assignment, activate/deactivate |

#### Frontend Tasks

| # | Task | Details |
|---|------|---------|
| 2.11.3 | Settings page | Tabbed interface: General, Company, Email, System |
| 2.11.4 | User management page | User list, create/edit user, assign roles, toggle status |

---

## Phase 3 — Flutter Mobile Application

> [!WARNING]
> **Do NOT begin Phase 3 until the entire web system and REST API are completed and fully tested.**
> The Flutter app must consume the same REST API developed for the web application.

### Mobile App Modules

| Module | Features |
|--------|----------|
| **Authentication** | Login, biometric login (future), secure token storage |
| **Dashboard** | Customer-specific stats, quick actions |
| **Policies** | View active/expired policies, policy details, digital insurance card (future) |
| **Quotations** | View quotation status, request new quotation |
| **Renewals** | Renew policy, renewal history |
| **Claims** | Submit claim, upload documents (camera + gallery), track status |
| **Notifications** | Push notifications (future), in-app notifications |
| **Profile** | View/edit profile, change password |

### Mobile Architecture

```
Flutter App
│
├── State Management: Provider / Riverpod
├── HTTP Client: Dio
├── Secure Storage: flutter_secure_storage
├── Navigation: go_router
├── Forms: flutter_form_builder
│
└── Consumes: Laravel REST API (/api/v1/...)
    (Same API as web frontend)
```

### Future Mobile Features (Post-Launch)

- Online payments (GCash, Maya, credit/debit cards)
- Push notifications (Firebase Cloud Messaging)
- QR Code policy verification
- Digital insurance card
- Biometric login (fingerprint / face ID)

---

## API Design & Standards

### URL Convention

```
Base URL: /api/v1

Authentication:
  POST   /api/v1/auth/login
  POST   /api/v1/auth/logout
  POST   /api/v1/auth/forgot-password
  POST   /api/v1/auth/reset-password
  GET    /api/v1/auth/profile
  PUT    /api/v1/auth/profile

Customers:
  GET    /api/v1/customers              (index, paginated)
  POST   /api/v1/customers              (store)
  GET    /api/v1/customers/{id}         (show)
  PUT    /api/v1/customers/{id}         (update)
  DELETE /api/v1/customers/{id}         (soft delete)
  GET    /api/v1/customers/search       (full-text search)

Quotations:
  GET    /api/v1/quotations
  POST   /api/v1/quotations
  GET    /api/v1/quotations/{id}
  PUT    /api/v1/quotations/{id}
  POST   /api/v1/quotations/{id}/submit
  POST   /api/v1/quotations/{id}/approve
  POST   /api/v1/quotations/{id}/reject

Policies:
  GET    /api/v1/policies
  POST   /api/v1/policies               (issue from quotation)
  GET    /api/v1/policies/{id}
  POST   /api/v1/policies/{id}/cancel
  GET    /api/v1/policies/{id}/print

Claims:
  GET    /api/v1/claims
  POST   /api/v1/claims
  GET    /api/v1/claims/{id}
  PUT    /api/v1/claims/{id}
  POST   /api/v1/claims/{id}/assign
  POST   /api/v1/claims/{id}/approve
  POST   /api/v1/claims/{id}/reject
  POST   /api/v1/claims/{id}/settle

Invoices:
  GET    /api/v1/invoices
  GET    /api/v1/invoices/{id}
  GET    /api/v1/invoices/{id}/print

Payments:
  GET    /api/v1/payments
  POST   /api/v1/payments
  GET    /api/v1/payments/{id}/receipt

Renewals:
  GET    /api/v1/renewals/upcoming
  POST   /api/v1/renewals
  GET    /api/v1/renewals/history

Reports:
  GET    /api/v1/reports/{type}          (type: customers, sales, policies, claims, accounting, renewals)
  GET    /api/v1/reports/{type}/export   (PDF or Excel via query param)

Dashboard:
  GET    /api/v1/dashboard/stats
  GET    /api/v1/dashboard/charts
  GET    /api/v1/dashboard/recent

Notifications:
  GET    /api/v1/notifications
  POST   /api/v1/notifications/{id}/read
  POST   /api/v1/notifications/read-all
```

### Standard JSON Response Format

```json
{
  "success": true,
  "message": "Customer created successfully.",
  "data": { ... },
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 120,
    "last_page": 8
  }
}
```

### Error Response Format

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": {
    "email": ["The email field is required."],
    "phone": ["The phone format is invalid."]
  }
}
```

---

## Authentication & Authorization

### Authentication Flow

```
┌──────────┐    POST /auth/login     ┌──────────────┐
│  Client  │ ──────────────────────▶ │  Laravel API │
│ (React/  │                         │              │
│  Flutter)│ ◀────────────────────── │  Sanctum     │
│          │    Token / Cookie        │              │
└──────────┘                         └──────────────┘
     │                                      │
     │   Subsequent Requests                │
     │   Authorization: Bearer {token}      │
     │   (or Sanctum SPA cookie)            │
     ▼                                      ▼
   Protected Endpoints            Middleware: auth:sanctum
                                  + role/permission checks
```

### Roles & Permissions Matrix

| Permission | Admin | Sales Agent | Underwriter | Accounting | Claims | Customer |
|------------|:-----:|:-----------:|:-----------:|:----------:|:------:|:--------:|
| **Dashboard** | Full | Own stats | Own queue | Financial | Claims | Own data |
| **Customers** | CRUD | Create/View | View | View | View | Own profile |
| **Quotations** | Full | Create/Edit | Review/Approve | View | — | View own |
| **Policies** | Full | View | Issue | View | View | View own |
| **Claims** | Full | — | — | — | Full | File/View own |
| **Invoices** | Full | View | — | Full | — | View own |
| **Payments** | Full | — | — | Full | — | View own |
| **Renewals** | Full | Renew | — | View | — | Renew own |
| **Reports** | Full | Sales | — | Financial | Claims | — |
| **Users** | CRUD | — | — | — | — | — |
| **Settings** | Full | — | — | — | — | — |

---

## Security Implementation

| Security Measure | Implementation |
|------------------|----------------|
| **Password Hashing** | bcrypt via `Hash::make()` (Laravel default) |
| **CSRF Protection** | Sanctum SPA cookie-based CSRF tokens |
| **XSS Prevention** | React's automatic escaping + Content-Security-Policy headers |
| **SQL Injection Prevention** | Eloquent ORM parameterized queries (never raw SQL with user input) |
| **File Upload Validation** | MIME type validation, file size limits, store outside web root |
| **RBAC** | Spatie Permission middleware on all routes |
| **Activity Logs** | Log user actions (login, CRUD operations) |
| **Audit Logs** | Track data changes (old value → new value) via model observers |
| **Rate Limiting** | Laravel `ThrottleRequests` middleware (60 req/min default, 5 for login) |
| **Secure Tokens** | Sanctum tokens with expiration, hashed storage |
| **HTTPS** | Enforce in production via `ForceScheme` middleware |
| **CORS** | Configured to allow only trusted origins |
| **Input Sanitization** | Form Request validation + strip_tags where appropriate |
| **Session Security** | HTTP-only cookies, SameSite=Lax, secure flag in production |

---

## UI/UX Strategy

### Design System

| Element | Standard |
|---------|----------|
| **Typography** | Inter (headings) + Roboto (body) from Google Fonts |
| **Color Palette** | Primary (deep blue), Secondary (teal), Accent (amber), Neutral (slate gray), Semantic (green/red/yellow) |
| **Spacing** | 4px grid system (Tailwind default) |
| **Border Radius** | `rounded-lg` for cards, `rounded-md` for inputs, `rounded-full` for avatars |
| **Shadows** | `shadow-sm` for flat elements, `shadow-md` for elevated cards, `shadow-lg` for modals |
| **Dark Mode** | Tailwind `dark:` variants, system preference detection, user toggle |

### Key UI Components

- **Data Tables** — Sortable columns, search, filters, pagination, row actions
- **Forms** — Inline validation, error messages, loading states, success feedback
- **Modals** — Confirmation dialogs, detail views, form overlays
- **Toast Notifications** — Success (green), error (red), warning (yellow), info (blue)
- **Loading States** — Skeleton screens, spinners, progress bars
- **Empty States** — Illustrated empty states with helpful CTAs
- **Breadcrumbs** — Contextual navigation on all interior pages

### Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 640px | Single column, bottom nav |
| Tablet | 640px–1024px | Collapsible sidebar |
| Desktop | > 1024px | Full sidebar + content |

---

## Testing Strategy

### Backend Testing

| Type | Tool | Coverage |
|------|------|----------|
| Unit Tests | PHPUnit | Services, models, helpers |
| Feature Tests | PHPUnit + Laravel | API endpoints, authentication, authorization |
| Database Tests | RefreshDatabase trait | Migrations, seeders, relationships |

### Frontend Testing

| Type | Tool | Coverage |
|------|------|----------|
| Unit Tests | Vitest | Utility functions, hooks |
| Component Tests | React Testing Library | Component rendering, interactions |
| E2E Tests | Playwright (optional) | Critical user flows |

### API Testing

| Tool | Purpose |
|------|---------|
| Postman / Insomnia | Manual API testing, collection sharing |
| Laravel Dusk (optional) | Browser-based integration tests |

---

## Deployment & DevOps

### Environment Setup

| Environment | Purpose | Database |
|-------------|---------|----------|
| **Local** | Development | MySQL local |
| **Staging** | Testing & QA | MySQL staging |
| **Production** | Live system | MySQL production (managed) |

### Deployment Checklist

- [ ] Configure `.env` for production (APP_DEBUG=false, proper DB creds)
- [ ] Run `php artisan config:cache`, `route:cache`, `view:cache`
- [ ] Set up SSL/HTTPS
- [ ] Configure queue worker (Supervisor)
- [ ] Configure scheduled tasks (cron for `php artisan schedule:run`)
- [ ] Set up automated database backups
- [ ] Configure logging (daily rotation, error alerting)
- [ ] Frontend production build (`npm run build`)
- [ ] CDN for static assets (optional)
- [ ] Server monitoring & uptime checks

### Recommended Hosting

| Component | Option |
|-----------|--------|
| Backend API | DigitalOcean Droplet / AWS EC2 / Laravel Forge |
| Frontend | Vercel / Netlify / Served from same server |
| Database | Managed MySQL (PlanetScale / AWS RDS / DigitalOcean Managed DB) |
| File Storage | S3-compatible (AWS S3 / DigitalOcean Spaces) |
| Email | Mailgun / Amazon SES / Postmark |

---

## Risk Assessment & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Scope creep across phases | High | High | Strict phase gates; no Phase 3 until Phase 2 is fully tested |
| Data security breach | Critical | Medium | RBAC, encryption, audit logs, regular security audits |
| Poor API performance with scale | High | Medium | Database indexing, query optimization, caching, pagination |
| File upload vulnerabilities | High | Medium | MIME validation, size limits, antivirus scanning, isolated storage |
| Module interdependencies | Medium | Medium | Clear interfaces between modules, service layer abstraction |
| Database migration conflicts | Medium | Low | Sequential migrations, thorough testing, rollback plans |
| Third-party package deprecation | Low | Low | Pin versions, monitor changelogs, abstract vendor code |

---

## Timeline & Milestones

> [!IMPORTANT]
> These are estimated durations and will depend on team size and resource availability. Adjust as needed.

| Milestone | Phase | Estimated Duration | Dependencies |
|-----------|-------|-------------------|--------------|
| **M1** — Project setup, architecture, DB design | Pre | 1–2 weeks | None |
| **M2** — Corporate website (all pages) | Phase 1 | 2–3 weeks | M1 |
| **M3** — Authentication & RBAC | Phase 2 | 1–2 weeks | M2 |
| **M4** — Dashboard module | Phase 2 | 1 week | M3 |
| **M5** — Customer records module | Phase 2 | 1–2 weeks | M3 |
| **M6** — Sales module (quotations + policies) | Phase 2 | 2–3 weeks | M5 |
| **M7** — Underwriter module | Phase 2 | 1–2 weeks | M6 |
| **M8** — Accounting module | Phase 2 | 2–3 weeks | M6 |
| **M9** — Claims module | Phase 2 | 2–3 weeks | M5, M6 |
| **M10** — Renewals module | Phase 2 | 1–2 weeks | M6 |
| **M11** — Reports module | Phase 2 | 2–3 weeks | M5–M10 |
| **M12** — Notification system | Phase 2 | 1–2 weeks | M5–M10 |
| **M13** — Settings & polish | Phase 2 | 1 week | M3 |
| **M14** — Integration testing & QA | Phase 2 | 2–3 weeks | M4–M13 |
| **M15** — Flutter mobile app | Phase 3 | 4–6 weeks | M14 complete |
| **M16** — Final testing & deployment | All | 2–3 weeks | M15 |

**Estimated Total: 24–40 weeks** (depending on team size and complexity)

---

## Final Deliverables Checklist

### Code & Application

- [ ] Complete React + TypeScript + Tailwind CSS frontend (Phase 1 + Phase 2)
- [ ] Complete Laravel 12 REST API backend
- [ ] Complete MySQL database with all migrations, seeders, and factories
- [ ] Authentication system with Laravel Sanctum
- [ ] Role-Based Access Control (6 roles) with Spatie Permission
- [ ] All 11 modules fully functional and tested
- [ ] Flutter project structure prepared for Phase 3
- [ ] Dark mode / Light mode support
- [ ] Responsive design (desktop, tablet, mobile)

### Documentation

- [ ] API documentation (endpoint reference with examples)
- [ ] Database schema documentation (ERD + table descriptions)
- [ ] Technical documentation (architecture, setup, configuration)
- [ ] User manual (role-based guides for each user type)
- [ ] Deployment guide (step-by-step production deployment)

### Quality Assurance

- [ ] Backend unit & feature tests
- [ ] Frontend component tests
- [ ] API testing collection (Postman/Insomnia)
- [ ] Security audit completed
- [ ] Performance optimization verified
- [ ] Cross-browser testing passed
- [ ] Responsive design testing passed

---

> **Next Step:** Review and approve this implementation plan. Upon approval, development will begin with **Phase 1 — Project Setup & Corporate Website**.
