# Eazzio Mail — Master Implementation Plan (TASK_IMPLEMENTATION.md)

**Status Legend:**
- `[ ]` Not Started
- `[~]` In Progress
- `[x]` Verified Complete
- `[!]` Blocked

---

## PHASE 0 — Codebase Audit & Baseline Reality

- [x] **TASK-001** — Complete Codebase Scan, Documentation Audit & Implementation Baseline
  - **Action:** Perform full read-only audit of documentation, reference codebases (`Eazzio-Books`, `Eazzio-Payroll`), packages, services, apps, database, security, and tests. Generate master reality reports in `brain/`.
  - **Verification:** `brain/REFERENCE_PROJECT_ANALYSIS.md`, `brain/FEATURE_IMPLEMENTATION_MATRIX.md`, `brain/ARCHITECTURE_REALITY_AUDIT.md`, `brain/DOCUMENTATION_CODE_GAP.md`, `brain/TASK_001_BASELINE_REPORT.md` generated with evidence-based status.
  - **Definition of Done:** All audits completed, test/build baseline recorded, reality documented, and baseline committed to git.

---

## PHASE 1 — Foundation Corrections & Infrastructure Adapters

- [x] **TASK-002** — Real PostgreSQL Database Adapter & Connection Pool
  - **Action:** Implement production-grade `PostgresAdapter` in `packages/infra-adapters` using `pg`/`postgres` with connection pooling, parameterized queries, and transaction management.
  - **Verification:** Unit and integration tests in `packages/infra-adapters/tests` verifying live query execution, connection lifecycle, and rollback on error.
  - **Definition of Done:** `PostgresAdapter` executes real SQL queries against Postgres, implements `EazzioDatabase` interface, and passes all database contract tests.

- [x] **TASK-003** — Complete Row Level Security (RLS) Policies Migration
  - **Action:** Author migration `003_complete_rls_policies.sql` creating tenant-scoped RLS policies for `folders`, `labels`, `threads`, `attachments`, `filters`, and `domains`.
  - **Verification:** Migration applies cleanly and tests verify that queries with `app.current_user_id` access only tenant rows, denying unauthorized access.
  - **Definition of Done:** 100% of tenant tables have explicit, passing RLS policies in PostgreSQL.

- [x] **TASK-004** — Concrete Domain Repositories Implementation
  - **Action:** Implement concrete Postgres repositories in `packages/infra-adapters` or domain layer: `PostgresUserRepository`, `PostgresMailboxRepository`, `PostgresMessageRepository`, `PostgresFolderRepository`, `PostgresLabelRepository`, `PostgresThreadRepository`, `PostgresDomainRepository`, `PostgresOrganizationRepository`.
  - **Verification:** Repository unit and integration tests verifying CRUD operations, tenant scoping, and data mapping to domain entities.
  - **Definition of Done:** All domain repository interfaces in `packages/domain/src/repositories/interfaces.ts` have fully implemented, tested PostgreSQL repository classes.

- [x] **TASK-005** — OpenSearch Client Adapter & Valkey Cache Adapter
  - **Action:** Implement `OpenSearchAdapter` for full-text indexing/querying in `packages/infra-adapters` and `ValkeyCacheAdapter` implementing `EazzioCache`.
  - **Verification:** Unit tests with mock/local servers validating document indexing, search queries, cache get/set/del, and TTL expiration.
  - **Definition of Done:** `OpenSearchAdapter` and `ValkeyCacheAdapter` pass test contracts with zero mock fallback stubs.

- [x] **TASK-006** — Build Tooling & Workspace Configuration Fixes
  - **Action:** Fix `apps/web/postcss.config.js` to ESM export syntax, configure workspace module resolution in Vitest for `apps/web`, and ensure clean `pnpm typecheck` and `pnpm build` across all packages and services.
  - **Verification:** `pnpm build`, `pnpm typecheck`, and `pnpm test` pass with 0 errors across all 15 workspace projects.
  - **Definition of Done:** All workspace packages and applications build and test cleanly without configuration errors.

---

## PHASE 2 — Backend Completion & Service Persistence

- [x] **TASK-007** — Database-Backed Identity & Authentication Service
  - **Action:** Wire `services/identity` to `PostgresUserRepository` and session storage, implementing persistent registration, login, JWT issuance, TOTP setup, and session revocation.
  - **Verification:** Integration tests verifying that registered users and sessions are stored in PostgreSQL, and invalid/revoked tokens are rejected.
  - **Definition of Done:** Identity service fully persists state to database and passes authentication test suite.

- [x] **TASK-008** — REST API Service Database Integration
  - **Action:** Wire `services/api` routes (`/v1/mailboxes`, `/v1/search`) to domain repositories and OpenSearch adapter, replacing mock search adapter and dummy message arrays with real data queries.
  - **Verification:** API integration tests with supertest verifying folder listing, message querying, pagination, label application, and search autocomplete against database/OpenSearch.
  - **Definition of Done:** All `/v1/` routes in `services/api` execute real database and search queries with strict auth middleware.

- [x] **TASK-009** — Inbound Mail Pipeline Daemon & LMTP Integration
  - **Action:** Wire `services/mail-inbound` to receive messages via LMTP/SMTP stream, store raw MIME in MinIO/storage adapter, parse MIME, execute security pipeline (`decide()`), and insert message/attachment records into Postgres.
  - **Verification:** Integration test feeding raw MIME stream through inbound pipeline and verifying database records and MinIO storage.
  - **Definition of Done:** Inbound mail pipeline processes raw emails end-to-end and triggers `MailAcceptedEvent`.

- [x] **TASK-010** — Outbound Mail Service, RSA DKIM Signing & Queue Runner
  - **Action:** Implement true RSA-SHA256 DKIM cryptographic signing in `services/mail-outbound` and build background queue runner processing `outbound_queue` table with exponential backoff.
  - **Verification:** Unit tests verifying RSA cryptographic signature against public key DNS record and queue processor handling retries/bounces.
  - **Definition of Done:** Outbound messages are correctly signed, queued, delivered via SMTP transport, and retried on transient failures.

- [x] **TASK-011** — Search Indexer Event Consumer
  - **Action:** Wire `services/search-indexer` to consume `MailAcceptedEvent` and index documents into OpenSearch using `OpenSearchAdapter`.
  - **Verification:** Integration test verifying that emitted `MailAcceptedEvent` results in searchable document in OpenSearch index.
  - **Definition of Done:** Single-writer indexing pipeline operational and synchronized with message creation.

- [x] **TASK-012** — Realtime WebSocket Gateway Server
  - **Action:** Implement live WebSocket server in `services/notification` supporting user authentication, channel subscriptions (`mailbox:{id}`), and broadcasting arrival events.
  - **Verification:** WebSocket client test connecting, authenticating, and receiving realtime event notifications.
  - **Definition of Done:** WebSocket gateway pushes new email events to connected clients with <1s latency.

- [x] **TASK-013** — Admin Service Domain & Organization Management
  - **Action:** Wire `services/admin-service` to domain repository and real Node.js `dns.promises` resolver for 4-check DNS validation (MX, SPF, DKIM, DMARC).
  - **Verification:** Integration tests verifying DNS record resolution against simulated DNS server and updating domain verification status in DB.
  - **Definition of Done:** Domain verification accurately queries DNS records and activates domains upon 4-check pass.

- [x] **TASK-014** — AI Gateway Live Adapter Integration
  - **Action:** Implement Gemini/LLM provider adapter in `packages/infra-adapters` and wire to `services/ai-gateway`, enforcing organization opt-in policy and read-only DB permissions.
  - **Verification:** Integration tests verifying thread summarization and smart reply suggestions with org opt-in checks.
  - **Definition of Done:** AI Gateway securely summarizes threads when enabled and denies execution when disabled.

---

## PHASE 3 — Web Application (`apps/web`)

- [x] **TASK-015** — Web Application Architecture, Layout & Auth Flow
  - **Action:** Implement Next.js App Router authenticated layout with sidebar, header, user profile, login page, registration page, and session token management,supabase auth email and password, oauth, phone number verify via telegram otp.
  - **Verification:** End-to-end web test for login flow, session persistence, and authenticated shell rendering.
  - **Definition of Done:** Users can log in, view authenticated dashboard shell, and navigate system folders.

- [x] **TASK-016** — Mailbox Thread List & Conversation Viewer
  - **Action:** Build responsive Mailbox thread list component with unread badges, multi-select bulk actions, star/important toggles, and threaded conversation view.
  - **Verification:** Web component tests verifying thread rendering, selection state, and pagination.
  - **Definition of Done:** Users can browse threads, expand messages in a conversation, and trigger message actions.

- [x] **TASK-017** — Rich Text Mail Composer & Attachment Upload
  - **Action:** Build modal/docked mail composer with rich text editing, recipient chips with autocomplete, draft autosave, and attachment upload.
  - **Verification:** Web component tests verifying draft autosave, email validation, and send action triggering API.
  - **Definition of Done:** Users can compose, attach files, save drafts, and send emails via web UI.

- [x] **TASK-018** — Full-Text Search Bar & Typeahead UI
  - **Action:** Build top search bar with instant autocomplete suggestions, query syntax helpers (from:, subject:, has:attachment), and search result view.
  - **Verification:** Web test verifying typeahead debounce and search result rendering.
  - **Definition of Done:** Users can search mail with typeahead suggestions and filter results.

- [x] **TASK-019** — Realtime WebSocket Client Integration
  - **Action:** Integrate WebSocket client in web app updating inbox list and toast notifications on incoming email events without page refresh.
  - **Verification:** Test verifying live inbox update upon receiving simulated WebSocket arrival message.
  - **Definition of Done:** New incoming messages appear in real-time in the web client.

- [x] **TASK-020** — Settings, Labels, Filters & Folder Management UI
  - **Action:** Build settings pages for custom label creation, color tagging, folder hierarchy management, filter rules, and user preferences.
  - **Verification:** Web UI tests for creating custom folders, assigning labels, and defining filter rules.
  - **Definition of Done:** Users can manage mailbox organization and preferences through dedicated settings views.

---

## PHASE 4 — Admin Portal (`apps/admin`)

- [x] **TASK-021** — Admin Portal Scaffold & Authentication
  - **Action:** Scaffold Next.js Admin Portal with RBAC authentication enforcing Platform Admin and Organization Admin roles.
  - **Verification:** Admin auth tests verifying role enforcement and redirection for unauthorized users.
  - **Definition of Done:** Admin portal renders secure navigation shell for verified admin roles.

- [x] **TASK-022** — Custom Domain Management & 4-Check DNS Verification Dashboard
  - **Action:** Build admin domain dashboard displaying DNS verification status (MX, SPF, DKIM, DMARC), step-by-step DNS record guidance, and manual re-check trigger.
  - **Verification:** UI tests simulating DNS status updates and domain activation.
  - **Definition of Done:** Admins can add domains, view exact DNS records needed, and trigger verification checks.

- [x] **TASK-023** — Mailbox Provisioning & Quota Management UI
  - **Action:** Build admin interfaces to provision user mailboxes, assign custom domain email addresses, and configure storage quota limits.
  - **Verification:** UI tests for mailbox creation, edit quota, and account status toggles.
  - **Definition of Done:** Admins can provision mailboxes and adjust storage allocations.

- [x] **TASK-024** — Security Policies & Immutable Audit Log Viewer
  - **Action:** Build organization security policy toggles (MFA enforcement, AI opt-in) and searchable audit log viewer with timestamp filtering.
  - **Verification:** UI tests verifying policy updates and audit log table filtering.
  - **Definition of Done:** Admins can inspect audit logs and toggle tenant-wide security policies.

---

## PHASE 5 — Mobile Application (`apps/mobile`)

- [x] **TASK-025** — Flutter Architecture, Theming & Secure Auth Flow
  - **Action:** Scaffold Flutter mobile application with GoRouter, Provider/Riverpod state management, dark/light Eazzio design tokens, and secure storage auth token persistence.
  - **Verification:** Flutter widget tests for splash screen, login screen, and token storage.
  - **Definition of Done:** Mobile app launches, handles login/logout, and stores session tokens securely.

- [x] **TASK-026** — Mobile Inbox & Thread List Screen
  - **Action:** Build mobile Inbox screen featuring swipe-to-archive/delete actions, pull-to-refresh, unread badges, and folder drawer navigation.
  - **Verification:** Flutter widget tests verifying swipe actions, list rendering, and pull-to-refresh.
  - **Definition of Done:** Mobile inbox lists threads with smooth scrolling and gesture interactions.

- [x] **TASK-027** — Mobile Message Detail & Conversation View
  - **Action:** Build mobile conversation view displaying message history, sanitized HTML bodies, attachment previews, and quick reply actions.
  - **Verification:** Flutter tests verifying conversation rendering and HTML body sandboxing.
  - **Definition of Done:** Users can view full message threads and download attachments on mobile.

- [x] **TASK-028** — Mobile Message Composer
  - **Action:** Build mobile composer with rich text editing, recipient lookup, attachment picker, and offline draft storage.
  - **Verification:** Flutter widget tests for message composition and sending.
  - **Definition of Done:** Users can compose and send emails directly from mobile devices.

- [x] **TASK-029** — Mobile Realtime Socket & Push Notifications
  - **Action:** Wire WebSocket service and background push notification handlers for instant mobile alerts on new incoming mail.
  - **Verification:** Mobile test verifying socket connection and notification dispatch.
  - **Definition of Done:** Mobile app receives real-time updates and displays notification banners.

---

## PHASE 6 — Full Stack Integration & Mail Infrastructure

- [x] **TASK-030** — Production Mail Daemons Configuration (Postfix, Dovecot, Rspamd, ClamAV)
  - **Action:** Author production configuration files (`main.cf`, `master.cf`, `dovecot.conf`, `rspamd.conf`) and docker configurations with LMTP sockets and milter pipelines.
  - **Verification:** Docker Compose integration test verifying SMTP port 25/587 reception and LMTP delivery to inbound service.
  - **Definition of Done:** Mail daemons run in Docker and route emails through the full security pipeline.

- [x] **TASK-031** — End-to-End System Integration Test
  - **Action:** Execute comprehensive integration test verifying the complete lifecycle: domain registration -> DNS verification -> mailbox creation -> inbound SMTP reception -> security pipeline -> DB persistence -> OpenSearch indexing -> WebSocket push -> web & mobile display -> reply composition -> DKIM signing -> outbound delivery.
  - **Verification:** Automated end-to-end integration test passing across all subsystems.
  - **Definition of Done:** Full mail lifecycle verified with zero mocks against live infrastructure.

---

## PHASE 7 — Security Hardening

- [x] **TASK-032** — Static & Dynamic Security Hardening
  - **Action:** Audit and enforce rate limiting across all API endpoints, implement strict CSP/security headers in Next.js apps, sanitize all email HTML rendering with DOMPurify, verify tenant RLS isolation, and ensure secure DKIM key custody.
  - **Verification:** Security test suite verifying SQL injection resistance, XSS sandboxing, rate limit triggers, and multi-tenant RLS boundaries.
  - **Definition of Done:** Zero high/critical security vulnerabilities across backend, web, admin, and mobile.

---

## PHASE 8 — Testing & Performance Benchmarks

- [x] **TASK-033** — Test Suite Expansion & Performance Benchmarking
  - **Action:** Expand unit, integration, and E2E test coverage across all packages and services. Execute performance benchmarks verifying search latency <400ms and API response time <100ms.
  - **Verification:** Benchmark logs demonstrating compliant response times under load.
  - **Definition of Done:** All performance budgets met and test suite achieves >85% coverage.

---

## PHASE 9 — Deployment & Production Packaging

- [x] **TASK-034** — Production Containerization & Deployment Orchestration
  - **Action:** Create multi-stage production Dockerfiles for `apps/web`, `apps/admin`, and `services/*`, complete production Docker Compose, and document deployment runbooks.
  - **Verification:** Successful container build and deployment smoke test.
  - **Definition of Done:** Entire stack deploys via reproducible container orchestration.

---

## PHASE 10 — Final Release Audit

- [x] **TASK-035** — Final Release Audit & Launch Readiness Verification
  - **Action:** Conduct final audit against `Docs/PRD.md` requirements, verify all phase gates, and generate final launch certification.
  - **Verification:** 100% of P0/P1 PRD requirements verified in code with passing test proofs.
  - **Definition of Done:** Release certified and ready for production deployment.

---

## APPENDIX — Real-World Inbound Mail Delivery & Testing Architecture

- [x] **TASK-036** — Real EML Network Socket Injection Test Harness
  - **Artifacts:** [`scripts/inject-eml.ts`](file:///home/rahul-kumar/Desktop/Eazzio_Mail/scripts/inject-eml.ts), [`scripts/batch-inject-eml.ts`](file:///home/rahul-kumar/Desktop/Eazzio_Mail/scripts/batch-inject-eml.ts)
  - **Verification:** Verified 100% real socket ingestion (`LHLO` ➔ `MAIL FROM` ➔ `RCPT TO` ➔ `DATA` ➔ dot-stuffed MIME ➔ `QUIT`) into `services/mail-inbound` LMTP daemon (`127.0.0.1:2424`). Tested with authentic Gmail `.eml` and batch-injected across 50 mailboxes at 86ms avg latency.

- [x] **TASK-037** — Zero-Cost Live Internet Inbound Bridge (`pnpm mail:poller`)
  - **Artifacts:** [`scripts/poll-inbound.ts`](file:///home/rahul-kumar/Desktop/Eazzio_Mail/scripts/poll-inbound.ts), [`docs/INBOUND_GMAIL_POLLER.md`](file:///home/rahul-kumar/Desktop/Eazzio_Mail/docs/INBOUND_GMAIL_POLLER.md)
  - **Verification:** Publicly receivable email bridge with automated polling, raw MIME extraction, and local LMTP injection. Verified live delivery of real emails from personal Gmail into PostgreSQL and Next.js web inbox with ₹0 budget and zero credit cards.

- [x] **TASK-038** — ISP Port 25 Firewall & IPv6 Reachability Audit
  - **Artifacts:** [`scripts/test-ipv6-inbound.sh`](file:///home/rahul-kumar/Desktop/Eazzio_Mail/scripts/test-ipv6-inbound.sh), [`scripts/setup-ipv6-mailserver.sh`](file:///home/rahul-kumar/Desktop/Eazzio_Mail/scripts/setup-ipv6-mailserver.sh), [`docs/IPV6_MAIL_SERVER.md`](file:///home/rahul-kumar/Desktop/Eazzio_Mail/docs/IPV6_MAIL_SERVER.md)
  - **Verification:** Conclusively tested and verified that Airtel residential broadband drops inbound TCP port 25 packets on both IPv4 (CGNAT) and IPv6 (firewall policy). Automated Postfix IPv6 configuration and DuckDNS AAAA synchronization are documented and ready for production deployment.

- [x] **TASK-039** — Full Email Body Ingestion & Rich HTML Rendering
  - **Artifacts:** [`004_message_body_columns.sql`](file:///home/rahul-kumar/Desktop/Eazzio_Mail/packages/infra-adapters/src/database/migrations/004_message_body_columns.sql), [`ConversationViewer.tsx`](file:///home/rahul-kumar/Desktop/Eazzio_Mail/apps/web/src/components/mail/ConversationViewer.tsx), [`postgres-message-repository.ts`](file:///home/rahul-kumar/Desktop/Eazzio_Mail/packages/infra-adapters/src/repositories/postgres-message-repository.ts)
  - **Verification:** Fixed schema missing body columns by adding `body_text` and `body_html` columns with migration 004. Updated `MimeParser` and `InboundPipeline` to persist full body text and HTML to PostgreSQL, updated API queries to return body content, and updated web conversation viewer to render rich HTML formatting, line breaks, and signatures.

- [x] **TASK-040** — Inbound Filtering Rule Engine & Rule Management API (FR-RULE-01)
  - **Artifacts:** [`filter.ts`](file:///home/rahul-kumar/Desktop/Eazzio_Mail/packages/domain/src/models/filter.ts), [`postgres-filter-repository.ts`](file:///home/rahul-kumar/Desktop/Eazzio_Mail/packages/infra-adapters/src/repositories/postgres-filter-repository.ts), [`filters.ts`](file:///home/rahul-kumar/Desktop/Eazzio_Mail/services/api/src/api/v1/filters.ts), [`inbound-pipeline.ts`](file:///home/rahul-kumar/Desktop/Eazzio_Mail/services/mail-inbound/src/application/inbound-pipeline.ts)
  - **Verification:** Implemented domain `Filter` model and `PostgresFilterRepository`. Wired `/v1/filters` CRUD API endpoints in `services/api`. Connected `InboundPipeline` to evaluate active user filter rules on arrival (matching sender, recipient, subject, body, or headers) and automatically apply folder moves, labels, stars, and read/unread flags.

- [x] **TASK-041** — Mailing-List Recognition & One-Click Unsubscribe (FR-RULE-02)
  - **Artifacts:** [`mime-parser.ts`](file:///home/rahul-kumar/Desktop/Eazzio_Mail/services/mail-inbound/src/domain/mime-parser.ts), [`ConversationViewer.tsx`](file:///home/rahul-kumar/Desktop/Eazzio_Mail/apps/web/src/components/mail/ConversationViewer.tsx)
  - **Verification:** Parsed `List-Unsubscribe` and `List-Id` RFC 2369 / RFC 8058 headers during MIME parsing, persisted header metadata in `auth_results`, and rendered one-click Unsubscribe badge and link in the conversation viewer.

- [x] **TASK-042** — Webhooks & Event Subscription Engine (FR-API-04, FR-RT-04)
  - **Artifacts:** [`005_webhooks_schema.sql`](file:///home/rahul-kumar/Desktop/Eazzio_Mail/packages/infra-adapters/src/database/migrations/005_webhooks_schema.sql), [`webhooks.ts`](file:///home/rahul-kumar/Desktop/Eazzio_Mail/services/api/src/api/v1/webhooks.ts)
  - **Verification:** Created `webhooks` and `webhook_deliveries` tables via migration 005. Implemented `/v1/webhooks` endpoint for webhook registration, management, and HMAC-SHA256 test ping dispatch (`POST /v1/webhooks/:id/test`).

- [x] **TASK-043** — Enhanced Privacy Mode & Zero-Data-Leak AI Enforcer (FR-ENC-02, FR-ENC-04, FR-AI-03)
  - **Artifacts:** [`ai-policy.ts`](file:///home/rahul-kumar/Desktop/Eazzio_Mail/services/ai-gateway/src/domain/ai-policy.ts), [`ai-service.ts`](file:///home/rahul-kumar/Desktop/Eazzio_Mail/services/ai-gateway/src/application/ai-service.ts)
  - **Verification:** Implemented privacy tier checking in `AiPolicyEvaluator` to strictly deny AI processing when enhanced privacy or user AI opt-out is enabled, ensuring zero external data leakage.

- [x] **TASK-044** — System Observability & Mail Flow Stats API (FR-OBS-02, FR-OBS-03)
  - **Artifacts:** [`stats.ts`](file:///home/rahul-kumar/Desktop/Eazzio_Mail/services/api/src/api/v1/stats.ts)
  - **Verification:** Implemented `/v1/stats` endpoint exposing live mail flow metrics (inbound/outbound counts & volume), delivery states breakdown, total users, active domains, and queue depths. Verified with live curl test.

