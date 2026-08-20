# Eazzio Mail — Master Execution Plan & Granular Action Tracker

> **Strict Non-Negotiables:**
> 1. **Reality First:** A task is marked `[x]` ONLY when real code is implemented, contracts wired, typechecked, linted, tested, and verified against canonical documentation.
> 2. **Sequential Progression:** Phase 0 (Reconciliation) ➔ Phase 1 (Backend 100% Verified) ➔ Phase 2 (Web Frontend 100% Verified) ➔ Phase 3 (Admin Portal 100% Verified) ➔ Phase 4 (Mobile Flutter App 100% Verified) ➔ Phase 5 (Full Integration QA) ➔ Phase 6 (Security Gap Audit & Penetration Hardening).
> 3. **Modular Monolith:** Monorepo with strictly separated packages/services, single deployment pipeline.
> 4. **No Feature Creep:** Implement strictly approved `FR-*` requirements; unapproved PDF features are recorded as `PROPOSED`.

---

## Phase 0: Documentation Reconciliation & Repository Reality Audit — `[x] 100% COMPLETE`

- [x] **TASK-001: Documentation Audit & Hierarchy Alignment**
  - [x] ACTION-001.1: Verify canonical authority order (`PRD` ➔ `ARCHITECTURE` ➔ `AGENTS` ➔ `DECISIONS` ➔ `LLD`).
  - [x] ACTION-001.2: Create `brain/IMPLEMENTATION_RECONCILIATION.md` recording all 6 architectural conflict resolutions.
  - [x] ACTION-001.3: Create `brain/PDF_FEATURE_TRACEABILITY.md` reconciling comparison PDF with approved `FR-*` IDs.
  - [x] ACTION-001.4: Create `brain/LEARNINGS.md` and `brain/STRUCTURE_LEARNINGS.md` scanning `/home/rahul-kumar/Desktop/Git_Pull/`.

- [x] **TASK-002: Monorepo Foundation & Toolchain Scaffold**
  - [x] ACTION-002.1: Initialize root `package.json` and `pnpm-workspace.yaml`.
  - [x] ACTION-002.2: Configure strict TypeScript `tsconfig.base.json` (NodeNext, strict null checks).
  - [x] ACTION-002.3: Configure ESLint `eslint.config.mjs` and Prettier `.prettierrc`.
  - [x] ACTION-002.4: Author Category A Dockerfiles in `infra/docker/` (Postgres, Valkey, OpenSearch, MinIO, Postfix, Dovecot, Rspamd, ClamAV).
  - [x] ACTION-002.5: Configure multi-container orchestration in `infra/deploy/compose/docker-compose.yml`.
  - [x] ACTION-002.6: Configure GitHub Actions CI in `.github/workflows/ci.yml`.

---

## Phase 1: Backend Platform (100% Verified & Tested) — `[x] 100% COMPLETE`

- [x] **TASK-B01: Pure Domain Package (`packages/domain`)**
  - [x] ACTION-B01.1: `EmailAddress` value object with RFC 5322 regex validation.
  - [x] ACTION-B01.2: `MessageId` and `SpamScore` value objects.
  - [x] ACTION-B01.3: `Quota` value object with BigInt arithmetic and exceeded checks.
  - [x] ACTION-B01.4: Immutable zero-I/O domain models (`User`, `Mailbox`, `Message`, `Thread`, `Folder`, `Label`, `Domain`, `Organization`, `Policy`).
  - [x] ACTION-B01.5: Abstract repository interfaces.
  - [x] ACTION-B01.6: Unit test suite in `packages/domain/tests/domain.test.ts` (100% pass).

- [x] **TASK-B02: Contracts & Cross-Service Specifications (`packages/contracts`)**
  - [x] ACTION-B02.1: OpenAPI 3.1 REST API specification (`openapi.yaml`).
  - [x] ACTION-B02.2: Typed domain events (`MailAcceptedEvent`, `MailRejectedEvent`, `MailQuarantinedEvent`).
  - [x] ACTION-B02.3: Typed delivery and admin events (`MailDeliveredEvent`, `MailBouncedEvent`, `DomainVerifiedEvent`).
  - [x] ACTION-B02.4: Contract schema unit tests in `packages/contracts/tests/contracts.test.ts` (100% pass).

- [x] **TASK-B03: Abstract Infrastructure Adapters (`packages/infra-adapters`)**
  - [x] ACTION-B03.1: Database adapter interface (`EazzioDatabase`).
  - [x] ACTION-B03.2: Object storage adapter interface (`EazzioStorage`).
  - [x] ACTION-B03.3: Cache adapter interface (`EazzioCache`).
  - [x] ACTION-B03.4: AI Gateway adapter interface (`EazzioAI`).
  - [x] ACTION-B03.5: Mail transport adapter interface (`EazzioEmailTransport`).
  - [x] ACTION-B03.6: Adapter interfaces test suite in `packages/infra-adapters/tests/interfaces.test.ts` (100% pass).

- [x] **TASK-B04: Inbound Security Pipeline Engine (`packages/security-pipeline`)**
  - [x] ACTION-B04.1: ClamAV malware hard-gate rejection logic.
  - [x] ACTION-B04.2: DMARC policy reject hard-gate logic.
  - [x] ACTION-B04.3: Deterministic composite scoring with auth penalties (SPF/DKIM/DMARC).
  - [x] ACTION-B04.4: `decide()` policy routing to ACCEPT, QUARANTINE (>= 0.6), or REJECT (>= 0.95).
  - [x] ACTION-B04.5: Security pipeline test suite in `packages/security-pipeline/tests/decide.test.ts` (100% pass).

- [x] **TASK-B05: Custom Identity Backend Service (`services/identity`)**
  - [x] ACTION-B05.1: Argon2id password service with 12-char minimum policy.
  - [x] ACTION-B05.2: Custom JWT access token generator and verifier (Zero Supabase Auth dependency per `DECISIONS.md D-005`).
  - [x] ACTION-B05.3: TOTP secret generator and 6-digit authenticator verifier.
  - [x] ACTION-B05.4: Session state manager (`active` / `revoked`) and device management.
  - [x] ACTION-B05.5: Anti-enumeration account recovery response.
  - [x] ACTION-B05.6: Identity service test suite in `services/identity/tests/unit/identity.test.ts` (100% pass).

- [x] **TASK-B06: Database Migrations & Row Level Security (RLS)**
  - [x] ACTION-B06.1: PostgreSQL reversible initial schema migration (`001_initial_schema.sql` / `.down.sql`).
  - [x] ACTION-B06.2: Hot-path indexes (`mailbox_id`, `folder_id`, `thread_id`, `idempotency_key`).
  - [x] ACTION-B06.3: Row Level Security policies for tenant/mailbox isolation (`002_rls_and_security_policies.sql`).
  - [x] ACTION-B06.4: Append-only audit log policy (`REVOKE UPDATE, DELETE ON audit_log`).
  - [x] ACTION-B06.5: Negative AI DB permission grants (`REVOKE INSERT, UPDATE, DELETE ON messages, outbound_queue, audit_log`).
  - [x] ACTION-B06.6: Migration integrity test suite in `packages/infra-adapters/tests/migrations.test.ts` (100% pass).

- [x] **TASK-B07: Mailbox Core Layered REST API (`services/api`)**
  - [x] ACTION-B07.1: Layered Express router setup (`api → application → domain ← infra`).
  - [x] ACTION-B07.2: Bearer JWT authentication & object-level authorization middleware.
  - [x] ACTION-B07.3: System folder generator (Inbox, Sent, Drafts, Spam, Trash, Archive).
  - [x] ACTION-B07.4: Many-to-many label tagging (`message_labels`) with no message duplication (`DECISIONS.md D-009`).
  - [x] ACTION-B07.5: Thread heuristic assigner (`In-Reply-To`, `References`, normalized subject).
  - [x] ACTION-B07.6: Standard JSON error envelope and taxonomy handler.
  - [x] ACTION-B07.7: Mailbox API Supertest suite in `services/api/tests/unit/mailbox-api.test.ts` (100% pass).

- [x] **TASK-B08: Inbound Mail Pipeline Service (`services/mail-inbound`)**
  - [x] ACTION-B08.1: RFC 5321 envelope validator with 25MB maximum size gate.
  - [x] ACTION-B08.2: MIME parser and header extractor with malformed resilience.
  - [x] ACTION-B08.3: Deterministic `decide()` security gate integration.
  - [x] ACTION-B08.4: `MailAccepted`, `MailRejected`, and `MailQuarantined` event emissions.
  - [x] ACTION-B08.5: Inbound pipeline test suite in `services/mail-inbound/tests/unit/inbound-pipeline.test.ts` (100% pass).

- [x] **TASK-B09: Outbound Mail Delivery Engine (`services/mail-outbound`)**
  - [x] ACTION-B09.1: HTML sanitization (stripping script tags & JS protocols).
  - [x] ACTION-B09.2: RFC 5322 MIME message composer.
  - [x] ACTION-B09.3: RSA-SHA256 DKIM cryptographic signature generator with private key custody (`dkim_private_key_ref`).
  - [x] ACTION-B09.4: Exponential backoff retry engine (`base: 30s`, `max: 3600s`, `maxAttempts: 8`).
  - [x] ACTION-B09.5: Delivery state transitions (`queued → sending → delivered/retrying/bounced`).
  - [x] ACTION-B09.6: Outbound delivery test suite in `services/mail-outbound/tests/unit/outbound.test.ts` (100% pass).

- [x] **TASK-B10: Search Indexing & Query Engine (`services/search-indexer` & `services/api`)**
  - [x] ACTION-B10.1: Single-writer search document projector.
  - [x] ACTION-B10.2: `MailAccepted` event consumer and indexer service (`<5s` SLA).
  - [x] ACTION-B10.3: Read-only search query endpoint in `services/api` (Single-reader rule).
  - [x] ACTION-B10.4: Typeahead autocomplete query handler (`<400ms` budget).
  - [x] ACTION-B10.5: Search indexer test suite in `services/search-indexer/tests/unit/indexer.test.ts` (100% pass).

- [x] **TASK-B11: Realtime Notifications & Administration (`services/notification` & `services/admin-service`)**
  - [x] ACTION-B11.1: Multi-tenant realtime channel hub (`mailbox:{id}:events`).
  - [x] ACTION-B11.2: New mail & badge fan-out on `MailAcceptedEvent`.
  - [x] ACTION-B11.3: 90% mailbox quota warning trigger.
  - [x] ACTION-B11.4: Admin domain 4-check DNS state machine (MX, SPF, DKIM, DMARC).
  - [x] ACTION-B11.5: `DomainVerifiedEvent` emission upon 4-record check completion.
  - [x] ACTION-B11.6: Notification & Admin test suites in `notification.test.ts` & `admin.test.ts` (100% pass).

- [x] **TASK-B12: AI Gateway & Backend E2E Lifecycle (`services/ai-gateway`)**
  - [x] ACTION-B12.1: AI opt-in policy checker (`ai_opt_in: true`).
  - [x] ACTION-B12.2: Thread summarizer and smart reply application service.
  - [x] ACTION-B12.3: AI Gateway test suite in `services/ai-gateway/tests/unit/ai-gateway.test.ts` (100% pass).
  - [x] ACTION-B12.4: Full backend lifecycle integration test in `tests/e2e/full-backend-lifecycle.test.ts` (100% pass).

---

## Phase 2: Frontend Web Application (`apps/web`) — `[IN PROGRESS]`

- [ ] **TASK-W01: Web Client Shell & 3-Pane Responsive Layout**
  - [ ] ACTION-W01.1: Build left navigation sidebar (Collapsible, folders, badges, compose button).
  - [ ] ACTION-W01.2: Build center thread list container (Filter tabs, search bar, bulk toolbar).
  - [ ] ACTION-W01.3: Build right message reading pane container (Subject header, sender avatar, actions, body).
  - [ ] ACTION-W01.4: Integrate `@eazzio/ui-kit` design tokens (Eazzio Blue `#2D5BFF`, Deep Slate `#0F1115`).
  - [ ] ACTION-W01.5: Dynamic Privacy Mode Badge (`Standard encryption`, `Enhanced privacy`, `End-to-end encrypted (Disabled)`).
  - [ ] ACTION-W01.6: Web Shell unit and responsive tests.

- [ ] **TASK-W02: Auth & Account Management Web Views**
  - [ ] ACTION-W02.1: User Registration View with 12-char password strength indicator.
  - [ ] ACTION-W02.2: User Login View with session redirect.
  - [ ] ACTION-W02.3: TOTP 2FA Challenge Screen with 6-digit auto-advancing input.
  - [ ] ACTION-W02.4: Account Recovery Screen with anti-enumeration banner.
  - [ ] ACTION-W02.5: User Settings & Session Manager (Active devices & session revocation).
  - [ ] ACTION-W02.6: Auth views client test suite.

- [ ] **TASK-W03: Mailbox Triage & Virtualized Thread List**
  - [ ] ACTION-W03.1: Virtual scrolling thread list for high-performance rendering.
  - [ ] ACTION-W03.2: Thread card component (Sender avatar, subject, snippet, timestamp, star, attachment indicator).
  - [ ] ACTION-W03.3: Multi-select bulk action toolbar (Archive, Trash, Mark read/unread, Apply labels).
  - [ ] ACTION-W03.4: Keyboard shortcut handler (`j`/`k` move, `e` archive, `r` reply, `c` compose, `/` search).
  - [ ] ACTION-W03.5: Empty folder states (Inbox Zero artwork and clean banners).
  - [ ] ACTION-W03.6: Thread list unit test suite.

- [ ] **TASK-W04: Message Reading Pane & Security Protections**
  - [ ] ACTION-W04.1: Message header bar with sender/recipient chips and date/time.
  - [ ] ACTION-W04.2: Security status banner (SPF, DKIM, DMARC pass/fail tags, untrusted sender alerts).
  - [ ] ACTION-W04.3: Sanitized HTML body renderer with remote image blocking by default.
  - [ ] ACTION-W04.4: Attachment card grid with Antivirus clean badges and secure downloads.
  - [ ] ACTION-W04.5: Reading pane unit test suite.

- [ ] **TASK-W05: Rich Text Compose & Draft Auto-Save**
  - [ ] ACTION-W05.1: Floating and fullscreen compose modal.
  - [ ] ACTION-W05.2: Recipient chip input (To, Cc, Bcc with format validation).
  - [ ] ACTION-W05.3: Rich text formatting toolbar (Bold, italic, lists, link inserter, blockquote).
  - [ ] ACTION-W05.4: Drag-and-drop attachment uploader with progress indicator.
  - [ ] ACTION-W05.5: Debounced draft auto-save hook syncing with backend API.
  - [ ] ACTION-W05.6: Compose modal unit test suite.

- [ ] **TASK-W06: Instant Search & Realtime WebSocket Updates**
  - [ ] ACTION-W06.1: Global search bar with typeahead suggestions (`<400ms` speed).
  - [ ] ACTION-W06.2: Advanced search filter modal (From, To, Date Range, Has Attachment, Folder).
  - [ ] ACTION-W06.3: WebSocket realtime connection client with reconnect logic.
  - [ ] ACTION-W06.4: Inbound mail toast notification on new mail arrival.
  - [ ] ACTION-W06.5: AI Summarization and Smart Reply chips in reading pane.
  - [ ] ACTION-W06.6: Search & realtime unit test suite.

---

## Phase 3: Administrative Web Portal (`apps/admin`) — `[PENDING]`

- [ ] **TASK-A01: Admin Dashboard & Tenant Management**
  - [ ] ACTION-A01.1: Admin dashboard layout with system health metrics.
  - [ ] ACTION-A01.2: Domain management console with copyable MX, SPF, DKIM, DMARC DNS records.
  - [ ] ACTION-A01.3: Live DNS 4-record check verification trigger and status table.
  - [ ] ACTION-A01.4: Organization member and mailbox provisioning directory.
  - [ ] ACTION-A01.5: System audit log viewer with actor, action, and date filters.
  - [ ] ACTION-A01.6: Quarantine & Outbound delivery failure queue inspector.
  - [ ] ACTION-A01.7: Admin portal test suite.

---

## Phase 4: Mobile Application (`apps/mobile` — Flutter) — `[PENDING]`

- [ ] **TASK-M01: Flutter Shell & Navigation**
  - [ ] ACTION-M01.1: Flutter workspace setup with Riverpod and GoRouter matching `ffms_mobile`.
  - [ ] ACTION-M01.2: Dark mode theme with Eazzio Blue `#2D5BFF` and slate background `#0F1115`.
  - [ ] ACTION-M01.3: Navigation drawer and bottom tab bar.
  - [ ] ACTION-M01.4: Secure credential storage with FlutterSecureStorage.

- [ ] **TASK-M02: Mobile Triage, Compose & Notifications**
  - [ ] ACTION-M02.1: Infinite scrolling thread list with swipe-to-archive and swipe-to-trash gestures.
  - [ ] ACTION-M02.2: Mobile message reader with zoomable sanitized body and attachment previews.
  - [ ] ACTION-M02.3: Mobile email composer with camera and native file picker integration.
  - [ ] ACTION-M02.4: WebSocket / Push notification listener and unread badge sync.
  - [ ] ACTION-M02.5: Biometric app lock (FaceID / Fingerprint).

---

## Phase 5: Security Gap Audit & Penetration Hardening — `[PENDING]`

- [ ] **TASK-S01: Authentication & Session Security Audit**
  - [ ] ACTION-S01.1: Brute-force rate limiting attack test on `/v1/auth/login`.
  - [ ] ACTION-S01.2: Immediate JWT session invalidation verification on logout.
  - [ ] ACTION-S01.3: Anti-enumeration uniform timing verification on account recovery.

- [ ] **TASK-S02: Multi-Tenant Isolation & RLS Penetration Tests**
  - [ ] ACTION-S02.1: Direct object reference attack test (Tenant A attempting to fetch Tenant B's mailbox).
  - [ ] ACTION-S02.2: PostgreSQL Row Level Security bypass test.
  - [ ] ACTION-S02.3: Audit log immutability verification (Blocked `UPDATE` and `DELETE`).

- [ ] **TASK-S03: SMTP Pipeline & Content Injection Audit**
  - [ ] ACTION-S03.1: EICAR malware attachment rejection test.
  - [ ] ACTION-S03.2: Spoofed domain envelope DMARC reject test.
  - [ ] ACTION-S03.3: Stored XSS and MIME-sniffing prevention tests.
  - [ ] ACTION-S03.4: Automated TruffleHog secret scan across git history.
