# Eazzio Mail — TASK_IMPLEMENTATION.md

> **Strict Execution Flow:**
> 1. **Complete Backend Platform First:** All backend services, contracts, schemas, and engines verified.
> 2. **Complete Frontend Web Application Next:** Full web client (`apps/web`) and admin portal (`apps/admin`).
> 3. **Complete Mobile Application Next:** Offline-first mobile client (`apps/mobile`).
> 4. **Complete Security Gap Audit & Penetration Hardening Last:** Ensure zero security vulnerabilities or leakages.
> 5. **No Hopping:** Complete each step with `[x]` before advancing.

---

## Phase 1: Complete Backend Platform (Foundation, Engine & Services)

- [x] **TASK-B01: Workspace Monorepo & Toolchain Scaffold**
  - Setup root `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.mjs`, `.prettierrc`.
  - Wire Dockerfiles (`postgres`, `valkey`, `opensearch`, `minio`, `nginx`, `postfix`, `dovecot`, `rspamd`, `clamav`) and `docker-compose.yml`.
  - Setup CI workflow `.github/workflows/ci.yml`.

- [x] **TASK-B02: Pure Domain Package (`packages/domain`)**
  - Zero I/O immutable domain models (`User`, `Mailbox`, `Message`, `Thread`, `Folder`, `Label`, `Domain`, `Organization`, `Policy`).
  - Value objects (`EmailAddress`, `MessageId`, `Quota`, `SpamScore`) and repository interfaces.

- [x] **TASK-B03: Contracts & Cross-Service Specifications (`packages/contracts`)**
  - OpenAPI 3.1 REST API specification (`openapi.yaml`).
  - Typed event contracts (`MailAcceptedEvent`, `MailRejectedEvent`, `MailQuarantinedEvent`, `MailDeliveredEvent`, `MailBouncedEvent`, `DomainVerifiedEvent`).

- [x] **TASK-B04: Abstract Infrastructure Adapters (`packages/infra-adapters`)**
  - Interfaces for database (`EazzioDatabase`), object storage (`EazzioStorage`), cache (`EazzioCache`), AI (`EazzioAI`), and mail transport (`EazzioEmailTransport`).

- [x] **TASK-B05: Inbound Security Pipeline Engine (`packages/security-pipeline`)**
  - Deterministic `decide()` algorithm.
  - SPF/DKIM/DMARC alignment checks, ClamAV malware rejection, and composite spam score threshold evaluation.

- [x] **TASK-B06: Identity & Authentication Backend (`services/identity`)**
  - Argon2id password hashing with mandatory 12-char minimum policy.
  - Custom JWT access/refresh token lifecycle (Zero Supabase Auth dependency per `DECISIONS.md D-005`).
  - TOTP MFA enrollment and verification.
  - Session state machine and device management.
  - Anti-enumeration account recovery flow.

- [x] **TASK-B07: Database Migrations & Row Level Security (RLS)**
  - Canonical PostgreSQL reversible migrations (`001_initial_schema.sql` / `001_initial_schema.down.sql`).
  - Tenant and mailbox ownership RLS policies (`002_rls_and_security_policies.sql`).
  - Append-only `audit_log` permission restrictions (Revoke UPDATE/DELETE).
  - AI Gateway negative DB grants (`REVOKE INSERT, UPDATE, DELETE ON messages, outbound_queue, audit_log`).

- [x] **TASK-B08: Mailbox Core REST API (`services/api`)**
  - Express layered architecture (`api → application → domain ← infra`).
  - System folders (Inbox, Sent, Drafts, Spam, Trash, Archive) and custom folders.
  - Many-to-many labels (`message_labels`) with no message duplication.
  - Thread heuristic assignment (`In-Reply-To`, `References`, normalized subject).
  - Object-level authorization middleware on all routes.
  - Standard JSON error envelope and taxonomy.

- [x] **TASK-B09: Inbound Mail Pipeline (`services/mail-inbound`)**
  - RFC 5321 envelope validation and 25MB maximum size gate.
  - MIME parser and attachment extraction.
  - Deterministic security gate (`decide()`) wiring.
  - Event emission (`MailAccepted`, `MailRejected`, `MailQuarantined`).

- [x] **TASK-B10: Outbound Mail Delivery Engine (`services/mail-outbound`)**
  - Compose HTML sanitization and RFC 5322 MIME construction.
  - DKIM cryptographic signing with private key custody (`dkim_private_key_ref`).
  - Exponential backoff retry engine (`base: 30s`, `max: 3600s`, `maxAttempts: 8`).
  - Delivery state transitions (`queued → sending → delivered/retrying/bounced`) and event emission.

- [x] **TASK-B11: Search & Indexing Engine (`services/search-indexer` & `services/api`)**
  - Single-writer search projection from `MailAccepted` events.
  - Read-only search endpoint in `services/api`.
  - Sub-400ms typeahead autocomplete and full-text search.

- [x] **TASK-B12: Realtime Notifications & Administration (`services/notification` & `services/admin-service`)**
  - Mailbox SSE/WebSocket channel fan-out (`mailbox:{id}:events`).
  - 90% mailbox quota warning trigger.
  - Admin domain verification 4-check DNS state machine (MX, SPF, DKIM, DMARC).

- [x] **TASK-B13: AI Gateway & End-to-End Backend Verification (`services/ai-gateway`)**
  - AI opt-in policy verification (`ai_opt_in: true`).
  - Thread summarization, smart reply, and priority hint inference.
  - Complete backend lifecycle test (`tests/e2e/full-backend-lifecycle.test.ts`).

---

## Phase 2: Frontend Web Client (`apps/web` & `apps/admin`)

- [ ] **TASK-W01: Web Client Shell & Design System Integration (`apps/web`)**
  - Complete responsive 3-pane layout (Sidebar navigation, Thread list pane, Reading pane).
  - Theme toggle (Light / Dark / System) and UI token integration from `@eazzio/ui-kit`.
  - Privacy Mode Badge (`Standard encryption`, `Enhanced privacy`, `End-to-end encrypted`).

- [ ] **TASK-W02: Auth & Account Management Web Views (`apps/web`)**
  - Registration, Login with Argon2id backend integration.
  - TOTP MFA Challenge Screen and recovery flow.
  - Session & active device manager in settings.

- [ ] **TASK-W03: Mailbox Triage & Virtualized Thread List (`apps/web`)**
  - Virtual scrolling thread list with infinite cursor pagination.
  - Unread badge counters for system and custom folders.
  - Multi-select bulk actions (Archive, Trash, Mark read, Apply labels).
  - Keyboard shortcuts (`j`/`k` navigate, `e` archive, `r` reply, `c` compose, `/` search).

- [ ] **TASK-W04: Message Reading Pane & Security Protections (`apps/web`)**
  - Sanitized HTML email body rendering (Block remote tracking pixels by default).
  - Attachment preview and download with antivirus status indicator.
  - Authentication status badges (SPF/DKIM/DMARC pass/fail display).

- [ ] **TASK-W05: Rich Text Compose & Draft Auto-Save (`apps/web`)**
  - Floating and fullscreen compose modal.
  - Draft auto-save to backend API with debouncing.
  - Attachment upload with progress indicator.

- [ ] **TASK-W06: Instant Search & Realtime Inbound Updates (`apps/web`)**
  - Global search bar with live typeahead suggestions (`<400ms`).
  - SSE client connection auto-reconnect and live badge updates.
  - AI Summary and Smart Reply action buttons in thread header.

- [ ] **TASK-W07: Administrative Web Portal (`apps/admin`)**
  - Domain management console with copyable DNS records (MX, SPF, DKIM, DMARC) and live check status.
  - Organization member provisioning, mailbox quota limits, and RBAC assignment.
  - System audit log inspector with filter by actor, action, and date range.
  - Quarantine and delivery failure queue manager.

---

## Phase 3: Mobile Application (`apps/mobile` — Flutter / React Native)

- [ ] **TASK-M01: Mobile Monorepo App Setup & Navigation Shell**
  - Monorepo package scaffold, responsive layout for iOS & Android.
  - Secure local credential storage (Keychain / EncryptedSharedPreferences).

- [ ] **TASK-M02: Offline-First SQLite Sync Engine**
  - Local SQLite message metadata cache.
  - Background bidirectional sync engine with optimistic UI updates.

- [ ] **TASK-M03: Mobile Triage, Gesture Navigation & Compose**
  - Swipe-to-archive / swipe-to-delete gestures.
  - Pull-to-refresh and infinite scroll thread list.
  - Mobile email composer with native camera/file attachment picker.

- [ ] **TASK-M04: Push Notifications & Biometric Authentication**
  - FCM / APNs background push notification handling.
  - FaceID / Fingerprint biometric app lock.

---

## Phase 4: Security Gap Check & Penetration Hardening

- [ ] **TASK-S01: Authentication & Session Security Audit**
  - Anti-brute force rate limiting validation on `/v1/auth/login`.
  - JWT token invalidation verification upon session revocation.
  - Anti-account enumeration confirmation across all public endpoints.

- [ ] **TASK-S02: Multi-Tenant Data Isolation & RLS Verification**
  - Automated cross-tenant penetration test (Tenant A attempting to fetch/modify Tenant B's mailbox, messages, folders, and attachments).
  - PostgreSQL Row Level Security bypass testing.

- [ ] **TASK-S03: Inbound SMTP & Outbound Deliverability Hardening**
  - Malware delivery attack test using EICAR test signatures.
  - DMARC spoofing rejection verification against forged headers.
  - DKIM private key custody verification (Ensuring no key leaks in logs, errors, or DB plain text).

- [ ] **TASK-S04: XSS, Content Injection & Attachment Sandbox Audit**
  - Malicious HTML/SVG email body sanitization audit.
  - Safe attachment download validation (Content-Disposition headers, MIME sniffing protection).

- [ ] **TASK-S05: Automated Dependency & Secret Scanning Gate**
  - Full TruffleHog secret scan across all commits and files.
  - `pnpm audit` zero-high-vulnerability sign-off.
