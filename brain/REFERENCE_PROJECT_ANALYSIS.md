# Eazzio Mail — REFERENCE_PROJECT_ANALYSIS.md

**Document Type:** Reference Codebase Audit & Pattern Analysis  
**Audited Repositories:**  
- `/home/rahul-kumar/Desktop/Git_Pull/Eazzio-Books` (Read-Only)  
- `/home/rahul-kumar/Desktop/Git_Pull/Eazzio-Payroll` (Read-Only)  
**Parent Document:** `Docs/AGENTS.md`  
**Status:** Canonical Reference Baseline (Task-001)

---

## 1. Executive Summary & Context

Both reference codebases (`Eazzio-Books` and `Eazzio-Payroll`) represent operational business software in the Eazzio ecosystem. They provide valuable real-world context for UI conventions, branding, Flutter mobile patterns, and multi-tenant ergonomics. However, their internal backend architectures differ significantly from Eazzio Mail's stricter modular monolith standards (Domain-Driven Design, strict layer isolation, contract-first OpenAPI, and defense-in-depth security).

---

## 2. Eazzio-Books Analysis

### 2.1 Project Structure
- **Backend:** `backend-books/` — Node.js / Express with standard monolithic controller/route structure.
- **Frontend:** `frontend-books/` — React SPA with direct REST API integration, CSS modules, and custom styling.

### 2.2 Useful Patterns to Adopt
1. **Design & Brand Consistency:** Use of consistent Eazzio brand tokens (`#2D5BFF` primary blue, `#FFA43D` amber accent, dark mode styling with `#0F1115` base background).
2. **Comprehensive Domain Workflows:** Clear separation of domain entities (Customers, Invoices, Payments, Journals) with dedicated detail views, side panels, and action dialogs.
3. **Graceful Loading States:** Skeleton loader components (`src/components/skeletons/`) for table rows, cards, and modal sheets.

### 2.3 Patterns That Should NOT Be Copied
1. **Direct Untyped DB Queries in Route Handlers:** Raw SQL queries mixed into Express route handlers without repository abstractions or domain model encapsulation.
2. **Missing Monorepo Workspace Tooling:** Independent subdirectories (`backend-books`, `frontend-books`) without shared pnpm workspace contracts or type sharing.
3. **Client-Side Auth Enforcement:** Frontend components relying heavily on local storage tokens without robust server-side token refresh lifecycle or strict session state verification.

---

## 3. Eazzio-Payroll Analysis

### 3.1 Project Structure
- **Backend:** `FFMS_BACKEND/` — Node.js Express service for Field Force Management.
- **Frontend:** `FFMS_FRONTEND/frontend/` — Next.js App Router application with Tailwind CSS, Zustand/Context stores, and dashboard layouts.
- **Mobile:** `ffms_mobile/` — Full Flutter application featuring multi-role authentication, geolocation, offline tracking, notifications, and custom widgets.

### 3.2 Useful Patterns to Adopt
1. **Flutter Mobile Component Architecture (`ffms_mobile`):**
   - Clean separation of `screens/`, `widgets/`, `services/`, `models/`, and `providers/`.
   - Rich custom widget suite: `shimmer_box.dart`, `skeleton_loader.dart`, `animated_card.dart`, `status_badge.dart`, `app_toast.dart`, `swipe_to_punch.dart`.
   - Dedicated service layer: `api_service.dart`, `auth_service.dart`, `socket_service.dart`.
   - Provider state management with reactive ChangeNotifier classes.
2. **Next.js Frontend Structure (`FFMS_FRONTEND`):**
   - Modern App Router layouts with collapsible sidebars, breadcrumbs, top navigation, and modal sheets.
   - Centralized API service abstraction with request interceptors for auth headers and error handling.
3. **Realtime Socket Integration:**
   - Dedicated WebSocket service client managing reconnect backoff, room subscriptions, and event dispatches.

### 3.3 Patterns That Should NOT Be Copied
1. **Duplicate Backend Implementations:** Loose route definitions without strict Zod schema validation matching contract files.
2. **Uncentralized Secrets:** Inconsistent environment variable access across backend scripts.
3. **Hardcoded Legacy Endpoints:** Direct IP or hardcoded localhost URLs in Flutter services without configurable environment flavor profiles.

---

## 4. Synthesis for Eazzio Mail Architecture

| Category | Reference Lesson | Eazzio Mail Implementation Rule |
|---|---|---|
| **Monorepo** | Books/Payroll have decoupled repos | Eazzio Mail uses unified `pnpm-workspace` monorepo with `@eazzio/*` packages. |
| **Backend** | Direct DB calls in controllers | Strict 4-layer DDD (`api` -> `application` -> `domain` -> `infra-adapters`). |
| **Contracts** | Ad-hoc JSON endpoints | Contract-first OpenAPI (`packages/contracts/src/api/openapi.yaml`) & typed Zod schemas. |
| **Auth** | Basic JWT in headers | Custom Argon2id password hashing, rotating session IDs, TOTP MFA, strict RLS context. |
| **Web UI** | React SPA / Next.js mix | Next.js 15+ App Router, Tailwind CSS, Lucide icons, unified `@eazzio/ui-kit` tokens. |
| **Mobile** | Flutter with Provider & rich widgets | Flutter mobile app adopting Payroll's widget polish with GoRouter, Riverpod/Provider, and secure storage. |
| **Security** | Standard web security only | Comprehensive mail defense pipeline: Postfix/Dovecot/Rspamd/ClamAV + SPF/DKIM/DMARC/ARC. |
