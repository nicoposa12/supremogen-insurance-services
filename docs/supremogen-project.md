# MASTER PROMPT

## Build a Digital Insurance Management System with Mobile App Extension

Act as a Senior Full-Stack Software Engineer, System Architect, UI/UX Designer, Database Administrator, and Laravel + React + Flutter Expert.

Your task is to design and develop a **production-ready Digital Insurance Management System** for **Supremogen Insurance Services**, a non-life insurance agency. The system must follow clean architecture, SOLID principles, secure coding practices, RESTful API standards, and modern UI/UX principles.

The project will be developed in **three phases**, where the mobile application will only be developed after the web system is completed.

---

# Project Goal

Develop a complete Digital Insurance Management System that digitizes insurance operations including customer management, quotation generation, policy issuance, claims management, accounting, renewals, reporting, and future mobile accessibility.

The system should be scalable, modular, secure, responsive, and maintainable.

---

# Technology Stack

## Frontend (Web)

* React
* TypeScript
* Tailwind CSS
* React Router
* Axios
* React Hook Form
* Zod Validation
* TanStack Query (React Query)

## Backend

* PHP 8+
* Laravel 12 (latest stable version)
* Laravel Sanctum Authentication
* Laravel REST API
* Eloquent ORM

## Database

* MySQL

## Mobile Application (Phase 3)

* Flutter
* Dart

## API

* REST API
* JSON Response
* Token Authentication using Laravel Sanctum

---

# System Architecture

Use a separated frontend and backend architecture.

Frontend

React + TypeScript + Tailwind CSS

Backend

Laravel REST API

Database

MySQL

The Flutter mobile application must consume the same REST API developed for the web application.

Never allow Flutter to connect directly to MySQL.

---

# Project Folder Structure

insurance-system/

├── backend/

│ ├── Laravel API

│ ├── REST API

│ ├── Database

│ └── Authentication

│

├── frontend/

│ ├── React

│ ├── TypeScript

│ ├── Tailwind CSS

│ └── Components

│

└── mobile/

├── Flutter

├── Dart

└── REST API Integration

---

# User Roles

Administrator

Sales Agent

Underwriter

Accounting Officer

Claims Officer

Customer

Each role must have its own permissions using Role-Based Access Control (RBAC).

---

# PHASE 1

Corporate Website

Create a modern, responsive, SEO-friendly company website.

Pages

Home

About Us

Insurance Products & Services

Contact Us

Frequently Asked Questions (FAQs)

Online Inquiry Form

Website Requirements

Responsive Design

Fast Loading

Professional UI

Tailwind CSS Components

Google Maps Integration

Social Media Links

Inquiry Form connected to Laravel API

Admin can manage website content through CMS

---

# PHASE 2

Core Insurance Management System

After Phase 1 is complete, continue developing the internal web-based management system.

## Dashboard Module

Statistics Cards

Recent Transactions

Sales Overview

Active Policies

Claims Summary

Monthly Revenue

Charts

Notifications

Quick Actions

---

## Customer Records Module

Customer Registration

Customer Profile

Upload Valid IDs

Upload Documents

Search Customers

Customer Status

View Policies

Transaction History

---

## Sales Module

Generate Quotations

Quotation Approval

Quotation History

Issue Policies

Policy Printing

Policy Renewal

Sales Monitoring

Commission Tracking

---

## Underwriter Module

Risk Assessment

Quotation Review

Approve Policy

Reject Policy

Coverage Review

Remarks

Policy Recommendations

---

## Accounting Module

Invoice Generation

Payment Recording

Official Receipt

Payment History

Outstanding Balance

Revenue Reports

Financial Summary

Future-ready for online payment integration

---

## Claims Module

Claim Registration

Upload Supporting Documents

Assign Claims

Claim Investigation

Claim Approval

Claim Rejection

Claim Status Tracking

Claims History

---

## Renewals Module

Upcoming Renewals

Renewal Notifications

Renew Policy

Renewal History

Expired Policies

---

## Reports Module

Customer Reports

Sales Reports

Policy Reports

Claims Reports

Accounting Reports

Renewal Reports

Export to PDF

Export to Excel

Printable Reports

Charts and Analytics

---

# Authentication

Login

Forgot Password

Reset Password

Role-Based Login

Profile Management

Change Password

Secure Sessions

---

# Notification System

In-App Notifications

Email Notifications

Renewal Reminders

Claim Updates

Quotation Updates

Policy Updates

---

# Database Design

Create a fully normalized MySQL database (3NF).

Include migrations, relationships, indexes, and foreign keys.

Suggested tables include:

users

roles

permissions

customers

insurance_products

quotations

quotation_items

policies

policy_coverages

claims

claim_documents

payments

invoices

renewals

notifications

activity_logs

audit_logs

settings

inquiries

---

# API Development

Develop RESTful APIs for every module.

Use proper HTTP methods:

GET

POST

PUT

PATCH

DELETE

Return standardized JSON responses.

Secure all endpoints using Laravel Sanctum.

Implement API versioning (/api/v1).

---

# UI/UX Requirements

Modern dashboard

Minimalist design

Professional corporate appearance

Responsive on desktop, tablet, and mobile

Dark Mode support

Light Mode support

Loading animations

Toast notifications

Form validation

Search

Filtering

Pagination

Sorting

---

# Security

Password Hashing

CSRF Protection

XSS Protection

SQL Injection Prevention

File Upload Validation

Role-Based Authorization

Activity Logs

Audit Logs

Rate Limiting

Secure API Tokens

---

# PHASE 3

Flutter Mobile Application

⚠️ IMPORTANT

Do NOT develop the Flutter application until the entire web system and REST API are completed and tested.

The Flutter application must reuse the existing Laravel REST API.

Customer Features

Login

Dashboard

View Policies

View Quotations

Renew Policy

Submit Claims

Upload Claim Documents

View Claim Status

Notifications

Profile Management

Future Features

Online Payments (GCash, Maya, Cards)

Push Notifications

QR Code Policy Verification

Digital Insurance Card

Biometric Login

---

# Development Guidelines

Develop the project module by module.

Complete one module before moving to the next.

Generate clean, reusable, well-commented code.

Use best practices and design patterns.

Create reusable React components.

Implement Laravel Service Layer where appropriate.

Validate all forms on both frontend and backend.

Follow RESTful standards.

Provide seeders and factories for testing.

Generate API documentation.

Generate technical documentation.

Generate user documentation.

---

# Final Deliverables

* Complete React + TypeScript + Tailwind CSS frontend
* Complete Laravel REST API backend
* Complete MySQL database with migrations and seeders
* Authentication and RBAC
* Fully functional Phase 1 and Phase 2 web application
* API documentation
* Technical documentation
* User manual
* Deployment guide
* Flutter project structure prepared for Phase 3 (without implementation)
* Clean, scalable, and production-ready source code

Begin with project planning, folder structure, database schema, ERD, system architecture, and UI wireframes before writing application code. After approval of the architecture, proceed module by module until the entire web application is completed. Only after the web system is fully functional should the Flutter mobile application be developed.
