# Eazzio Mail — TASK_IMPLEMENTATION.md

> **Execution Rules & Methodology:**
> 1. **Strict Sequential Progression:** Backend Platform (Phase 1) ➔ Frontend Web Client (Phase 2) ➔ Mobile App (Phase 3) ➔ Security & Penetration Hardening (Phase 4).
> 2. **No Hopping / No Skipping:** Never start a subsequent phase or task until the current task is completed, tested, and marked `[x]`.
> 3. **Reference Codebases (`/home/rahul-kumar/Desktop/Git_Pull/`):**
>    - `Eazzio-Books`: UI layout, multi-tenant contexts, table pagination, and bulk toolbars.
>    - `Eazzio-Payroll`: Next.js App Router layout, Flutter mobile structure, and RBAC token flow.
>    - `Docs/DESIGN.md`: Authoritative color standard (Eazzio Blue `#2D5BFF`, Mail Accent `#FFA43D`, Deep Slate `#0F1115`).
> 4. **Zero Security Gap:** Multi-tenant RLS isolation, anti-enumeration, DKIM key custody, and malware detection enforced across the entire stack.

---

## Phase 1: Backend Platform (Foundation, Contracts, Database & Microservices) — `[x] 100% COMPLETE`

- [x] **TASK-B01: Workspace Monorepo & Toolchain Scaffold**
  - Setup root `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.mjs`, `.prettierrc`.
  - Category A Dockerfiles (`postgres`, `valkey`, `opensearch`, `minio`, `nginx`, `postfix`, `dovecot`, `rspamd`, `clamav`) and `docker-compose.yml`.
  - CI workflow `.github/workflows/ci.yml` with TruffleHog secret scanning.

- [x] **TASK-B02: Pure Domain Package (`packages/domain`)**
  - Zero I/O immutable domain models (`User`, `Mailbox`, `Message`, `Thread`, `Folder`, `Label`, `Domain`, `Organization`, `Policy`).
  - Value objects (`EmailAddress`, `MessageId`, `Quota`, `SpamScore`) and repository interfaces.

- [x] **TASK-B03: Contracts & Cross-Service Specifications (`packages/contracts`)**
  - OpenAPI 3.1 REST API specification (`openapi.yaml`).
  - Typed event contracts (`MailAcceptedEvent`, `MailRejectedEvent`, `MailQuarantinedEvent`, `MailDeliveredEvent`, `MailBouncedEvent`, `DomainVerifiedEvent`).

- [x] **TASK-B04: Abstract Infrastructure Adapters (`packages/infra-adapters`)**
  - Abstract interfaces for database (`EazzioDatabase`), object storage (`EazzioStorage`), cache (`EazzioCache`), AI (`EazzioAI`), and mail transport (`EazzioEmailTransport`).

- [x] **TASK-B05: Inbound Security Pipeline Engine (`packages/security-pipeline`)**
  - Deterministic `decide()` algorithm with composite scoring.
  - Hard gates for ClamAV malware rejection and DMARC policy enforcement.

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

## Phase 2: Frontend Web Client (`apps/web` & `apps/admin`) — `[IN PROGRESS]`

- [ ] **TASK-W01: Web Client Shell & 3-Pane Responsive Layout (`apps/web`)**
  - Navigation sidebar (left), virtualized thread list (center), and message reading pane (right).
  - Theme provider (Light / Dark / System) with Eazzio Blue `#2D5BFF` and surface tokens.
  - Dynamic Privacy Mode Badge (`Standard encryption`, `Enhanced privacy`, `End-to-end encrypted`).

- [ ] **TASK-W02: Auth & Account Management Web Views (`apps/web`)**
  - Registration and Login screens with client validation matching backend Argon2id constraints.
  - TOTP 2FA QR code enrollment and verification modal.
  - Session & active device manager in settings.

- [ ] **TASK-W03: Mailbox Triage & Virtualized Thread List (`apps/web`)**
  - Infinite cursor pagination with virtualized list rendering.
  - Unread badge counters for system and custom folders.
  - Multi-select bulk action toolbar (Archive, Trash, Mark read, Apply labels).
  - Keyboard shortcut navigation (`j`/`k` move, `e` archive, `r` reply, `c` compose, `/` search).

- [ ] **TASK-W04: Message Reading Pane & Security Protections (`apps/web`)**
  - Sanitized HTML email rendering with remote image/pixel blocker by default.
  - Attachment previewer and download cards with antivirus scan indicators.
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

## Phase 3: Mobile Application (`apps/mobile` — Flutter) — `[PENDING]`

- [ ] **TASK-M01: Mobile Monorepo App Setup & Navigation Shell**
  - Flutter workspace scaffold matching `ffms_mobile` architecture.
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

## Phase 4: Security Gap Check & Penetration Hardening — `[PENDING]`

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
