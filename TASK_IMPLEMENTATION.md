# Eazzio Mail — Master Action-Step Implementation Tracker

> **Core Directives & Execution Rules:**
> 1. **Complete Backend Platform First:** Every single backend task must be subdivided into granular, testable action steps and fully checked off `[x]`.
> 2. **Sequential Flow:** Phase 1 (Backend) ➔ Phase 2 (Web Frontend) ➔ Phase 3 (Mobile App) ➔ Phase 4 (Security Hardening).
> 3. **Zero Hopping:** Never move to frontend or mobile until all backend action items are complete and passing CI tests.
> 4. **Design Standard:** `Docs/DESIGN.md` (Eazzio Blue `#2D5BFF`, Mail Accent `#FFA43D`, Deep Slate `#0F1115`).
> 5. **Reference Blueprints:** `/home/rahul-kumar/Desktop/Git_Pull/` (`Eazzio-Books` & `Eazzio-Payroll`).

---

## Phase 1: Complete Backend Platform (Foundation, Contracts, Database & Microservices)

### TASK-B01: Workspace Monorepo & Toolchain Scaffold
- [x] **ACTION-B01.1: Root Monorepo Configuration** — Setup `package.json`, `pnpm-workspace.yaml`, and workspace glob patterns.
- [x] **ACTION-B01.2: Strict TypeScript Baseline** — Configure `tsconfig.base.json` with NodeNext resolution, strict null checks, and no implicit any.
- [x] **ACTION-B01.3: Code Style & Linting Suite** — Setup `eslint.config.mjs`, `.prettierrc`, and `.prettierignore`.
- [x] **ACTION-B01.4: Category A Dockerfiles** — Build Dockerfiles for Postgres, Valkey, OpenSearch, MinIO, Nginx, Postfix, Dovecot, Rspamd, ClamAV.
- [x] **ACTION-B01.5: Local Docker Compose Orchestration** — Configure `infra/deploy/compose/docker-compose.yml` with health checks.
- [x] **ACTION-B01.6: Continuous Integration Workflow** — Create `.github/workflows/ci.yml` with TruffleHog secret scanning.

### TASK-B02: Pure Domain Package (`packages/domain`)
- [x] **ACTION-B02.1: RFC 5322 EmailAddress Value Object** — Enforce email normalization and strict regex syntax verification.
- [x] **ACTION-B02.2: MessageId & SpamScore Value Objects** — Enforce non-empty IDs and 0.0–1.0 score boundaries.
- [x] **ACTION-B02.3: Quota Value Object** — Support BigInt byte arithmetic, remaining capacity calculations, and exceeded state checks.
- [x] **ACTION-B02.4: Immutable Domain Models** — Implement `User`, `Mailbox`, `Message`, `Thread`, `Folder`, `Label`, `Domain`, `Organization`, `Policy`.
- [x] **ACTION-B02.5: Abstract Repository Contracts** — Define repository interfaces for all domain aggregates.
- [x] **ACTION-B02.6: Domain Unit Test Suite** — 100% test coverage in `packages/domain/tests/domain.test.ts`.

### TASK-B03: Contracts & Cross-Service Specifications (`packages/contracts`)
- [x] **ACTION-B03.1: OpenAPI 3.1 REST Specification** — Authored canonical `openapi.yaml` covering auth, mailbox triage, search, and compose.
- [x] **ACTION-B03.2: Inbound Event Schemas** — Define typed TypeScript interfaces for `MailAcceptedEvent`, `MailRejectedEvent`, and `MailQuarantinedEvent`.
- [x] **ACTION-B03.3: Outbound & Admin Event Schemas** — Define typed interfaces for `MailDeliveredEvent`, `MailBouncedEvent`, and `DomainVerifiedEvent`.
- [x] **ACTION-B03.4: Contracts Schema Test Suite** — Verify event structure and payload validation in `packages/contracts/tests/contracts.test.ts`.

### TASK-B04: Abstract Infrastructure Adapters (`packages/infra-adapters`)
- [x] **ACTION-B04.1: Database Adapter Interface** — Define `EazzioDatabase` with query, transaction, and health check contracts.
- [x] **ACTION-B04.2: Object Storage Adapter Interface** — Define `EazzioStorage` with put, get, delete, and signed URL contracts.
- [x] **ACTION-B04.3: Cache Adapter Interface** — Define `EazzioCache` with get, set, incr, and del contracts.
- [x] **ACTION-B04.4: AI Gateway Adapter Interface** — Define `EazzioAI` with summarizeThread, suggestReply, and classifyPriority contracts.
- [x] **ACTION-B04.5: Mail Transport Adapter Interface** — Define `EazzioEmailTransport` with submitOutbound and getDeliveryStatus.
- [x] **ACTION-B04.6: Adapter Interfaces Test Suite** — Verify adapter interfaces and mock implementations in `packages/infra-adapters/tests/interfaces.test.ts`.

### TASK-B05: Inbound Security Pipeline Engine (`packages/security-pipeline`)
- [x] **ACTION-B05.1: Malware Scanner Hard-Gate** — Short-circuit reject messages infected with ClamAV test/real signatures (`MALWARE_DETECTED`).
- [x] **ACTION-B05.2: DMARC Policy Reject Gate** — Hard-reject spoofed messages when domain DMARC policy is set to `reject`.
- [x] **ACTION-B05.3: Auth Penalty Calculation** — Apply deterministic penalties for SPF fail/softfail, DKIM fail, and DMARC fail.
- [x] **ACTION-B05.4: Deterministic `decide()` Algorithm** — Composite scoring routing to ACCEPT, QUARANTINE (score >= 0.6), or REJECT (score >= 0.95).
- [x] **ACTION-B05.5: Security Pipeline Decision Test Suite** — Test all decision branches in `packages/security-pipeline/tests/decide.test.ts`.

### TASK-B06: Custom Identity Backend Service (`services/identity`)
- [x] **ACTION-B06.1: Argon2id Password Service** — Hash with `argon2id` (memoryCost: 65536, timeCost: 3) and 12-char minimum rule.
- [x] **ACTION-B06.2: Custom JWT Token Engine** — Sign and verify 15-minute access tokens (Zero Supabase Auth dependency per `DECISIONS.md D-005`).
- [x] **ACTION-B06.3: TOTP Two-Factor Authenticator** — Generate base32 secrets, OTPAuth URIs, and verify 6-digit TOTP tokens.
- [x] **ACTION-B06.4: Session & Device Lifecycle Manager** — Manage state transitions (`active → revoked`) and expiration timestamps.
- [x] **ACTION-B06.5: Anti-Enumeration Account Recovery** — Enforce static generic response (`"If the account exists, instructions have been sent."`).
- [x] **ACTION-B06.6: Identity Service Unit Test Suite** — Verify password hashing, JWTs, TOTP, and sessions in `services/identity/tests/unit/identity.test.ts`.

### TASK-B07: Database Migrations & Row Level Security (RLS)
- [x] **ACTION-B07.1: PostgreSQL Initial Schema Migration** — `001_initial_schema.sql` (users, mailboxes, messages, threads, folders, labels, outbound_queue, audit_log).
- [x] **ACTION-B07.2: Migration Rollback Scripts** — Pair every migration with an exact `001_initial_schema.down.sql` rollback script.
- [x] **ACTION-B07.3: Native Row Level Security Policies** — Enforce `mailbox_owner_policy` and `messages_mailbox_policy` using `app.current_user_id`.
- [x] **ACTION-B07.4: Immutability on Audit Log** — Enforce append-only policy (`REVOKE UPDATE, DELETE ON audit_log`).
- [x] **ACTION-B07.5: AI Role Database Grant Restrictions** — Grant `SELECT` only; explicitly `REVOKE INSERT, UPDATE, DELETE ON messages, outbound_queue, audit_log FROM eazzio_ai_gateway`.
- [x] **ACTION-B07.6: Migration Integrity Test Suite** — Validate migration symmetry and RLS rules in `packages/infra-adapters/tests/migrations.test.ts`.

### TASK-B08: Mailbox Core REST API Service (`services/api`)
- [x] **ACTION-B08.1: Express Layered Router Setup** — Layered structure (`api → application → domain ← infra`).
- [x] **ACTION-B08.2: Bearer JWT Authentication Middleware** — Verify incoming tokens and attach authenticated user context to requests.
- [x] **ACTION-B08.3: System & Custom Folder Management** — Factory for standard system folders (Inbox, Sent, Drafts, Spam, Trash, Archive).
- [x] **ACTION-B08.4: Many-to-Many Label Toggling** — Tag messages via `message_labels` without duplicating message records (`DECISIONS.md D-009`).
- [x] **ACTION-B08.5: Thread Heuristic Grouping** — Match normalized subject with prefix stripping (`Re:`, `Fwd:`) and fallback to new thread IDs.
- [x] **ACTION-B08.6: Standard JSON Error Envelope** — Uniform error schema with code taxonomy (`VALIDATION_ERROR`, `AUTH_REQUIRED`, `FORBIDDEN`, `INTERNAL_ERROR`).
- [x] **ACTION-B08.7: Mailbox API Supertest Suite** — 100% test pass in `services/api/tests/unit/mailbox-api.test.ts`.

### TASK-B09: Inbound Mail Pipeline Service (`services/mail-inbound`)
- [x] **ACTION-B09.1: Inbound Envelope & Size Gate** — Validate RFC 5321 sender/recipient addresses and enforce 25MB maximum limit.
- [x] **ACTION-B09.2: MIME Parser & Header Extractor** — Extract Message-ID, Subject, Body text/HTML, and attachments with malformed header resilience.
- [x] **ACTION-B09.3: Deterministic Security Gating Integration** — Route raw inbound MIME through `@eazzio/security-pipeline`'s `decide()` engine.
- [x] **ACTION-B09.4: Typed Domain Event Emission** — Emit `MailAcceptedEvent` on accept, `MailQuarantinedEvent` on quarantine, and `MailRejectedEvent` on reject.
- [x] **ACTION-B09.5: Inbound Pipeline Test Suite** — Test malware rejection, quarantine scoring, and clean mail acceptance in `services/mail-inbound/tests/unit/inbound-pipeline.test.ts`.

### TASK-B10: Outbound Mail Delivery Engine (`services/mail-outbound`)
- [x] **ACTION-B10.1: HTML Sanitizer Engine** — Strip executable script tags and dangerous `javascript:` protocols from compose bodies.
- [x] **ACTION-B10.2: RFC 5322 MIME Message Builder** — Construct canonical MIME messages with generated Message-IDs and date headers.
- [x] **ACTION-B10.3: RSA-SHA256 DKIM Signer** — Sign outbound emails using domain private keys with strict key custody (`dkim_private_key_ref`).
- [x] **ACTION-B10.4: Exponential Retry Backoff Engine** — Calculate delays (`now + min(base * 2^attempt, maxBackoff)` with base: 30s, max: 3600s, maxAttempts: 8).
- [x] **ACTION-B10.5: Delivery State Machine** — Transition delivery states (`queued → sending → delivered/retrying/bounced`) and emit `MailDeliveredEvent` / `MailBouncedEvent`.
- [x] **ACTION-B10.6: Outbound Delivery Test Suite** — Verify DKIM signing, HTML sanitization, and retry state machine in `services/mail-outbound/tests/unit/outbound.test.ts`.

### TASK-B11: Search Indexer & Query Engine (`services/search-indexer` & `services/api`)
- [x] **ACTION-B11.1: Single-Writer Search Projector** — Transform `MailAcceptedEvent` into standard 160-char snippet `SearchDocument`.
- [x] **ACTION-B11.2: Event Consumer Indexer Service** — Consume events and index into OpenSearch within the `<5s` SLA (`DECISIONS.md D-010`).
- [x] **ACTION-B11.3: Read-Only Search Query Endpoint** — Expose authenticated `/v1/search` endpoint in `services/api`.
- [x] **ACTION-B11.4: Sub-400ms Autocomplete Handler** — Expose authenticated `/v1/search/autocomplete` for fast typeahead.
- [x] **ACTION-B11.5: Search Engine Test Suite** — Test document projection and indexing in `services/search-indexer/tests/unit/indexer.test.ts`.

### TASK-B12: Realtime Notifications & Administration (`services/notification` & `services/admin-service`)
- [x] **ACTION-B12.1: Multi-Tenant Realtime Channel Hub** — Format isolated SSE/WebSocket channels (`mailbox:{id}:events`).
- [x] **ACTION-B12.2: New Mail & Badge Fan-Out** — Publish `MAIL_ARRIVED` and unread badge updates upon `MailAcceptedEvent`.
- [x] **ACTION-B12.3: 90% Mailbox Quota Alert Trigger** — Trigger `QUOTA_WARNING` realtime payload when mailbox usage reaches or exceeds 90%.
- [x] **ACTION-B12.4: Domain 4-Check DNS State Machine** — Evaluate MX, SPF, DKIM, DMARC records to transition (`pending → partially_verified → verified`).
- [x] **ACTION-B12.5: Domain Verified Event Emission** — Emit `DomainVerifiedEvent` upon full 4-record DNS validation.
- [x] **ACTION-B12.6: Notification & Admin Test Suites** — Test channels, quota alerts, and DNS verification in `notification.test.ts` & `admin.test.ts`.

### TASK-B13: AI Gateway & Full Backend Lifecycle E2E (`services/ai-gateway`)
- [x] **ACTION-B13.1: AI Tenant Opt-In Policy Gate** — Block LLM inference unless organization policy explicitly enables `ai_opt_in: true`.
- [x] **ACTION-B13.2: Thread Summarizer & Smart Reply Service** — Provide AI thread summarization and quick reply suggestion generation.
- [x] **ACTION-B13.3: AI Gateway Unit Test Suite** — Test policy gating and summarization in `services/ai-gateway/tests/unit/ai-gateway.test.ts`.
- [x] **ACTION-B13.4: Complete Backend Lifecycle Integration Test** — Validate the entire flow in `tests/e2e/full-backend-lifecycle.test.ts` (`Auth → Domain Verify → Inbound SMTP → Security Decide → Search Projection → Outbound Delivery → Notification`).

---

## Phase 2: Frontend Web Client (`apps/web` & `apps/admin`)

### TASK-W01: Web Client Shell & 3-Pane Responsive Layout (`apps/web`)
- [ ] **ACTION-W01.1: Collapsible Navigation Sidebar** — Folders, unread badge counters, system tags, and compose trigger.
- [ ] **ACTION-W01.2: Center Thread List Container** — Filter tabs (All, Unread, Starred), search bar, and bulk toolbar.
- [ ] **ACTION-W01.3: Right Message Reading Pane Container** — Subject header, sender avatar, action bar, body viewport.
- [ ] **ACTION-W01.4: Design Token Integration** — Eazzio Blue `#2D5BFF`, Mail Accent `#FFA43D`, Deep Slate `#0F1115`.
- [ ] **ACTION-W01.5: Dynamic Privacy Mode Badge** — Mount badge (`Standard encryption`, `Enhanced privacy`, `End-to-end encrypted`).
- [ ] **ACTION-W01.6: Web Shell Unit & Responsive Tests** — Test 3-pane rendering and responsive collapse behavior.

### TASK-W02: Auth & Account Management Web Views (`apps/web`)
- [ ] **ACTION-W02.1: User Registration View** — Email, name, and 12-char password strength validator.
- [ ] **ACTION-W02.2: User Login View** — Email, password input, and session redirect.
- [ ] **ACTION-W02.3: TOTP 2FA Challenge Screen** — 6-digit auto-advancing code input.
- [ ] **ACTION-W02.4: Account Recovery Screen** — Anti-enumeration confirmation view.
- [ ] **ACTION-W02.5: User Settings & Session Manager** — Active devices list and session revocation triggers.
- [ ] **ACTION-W02.6: Auth Views Client Test Suite** — Test client authentication flows.

### TASK-W03: Mailbox Triage & Virtualized Thread List (`apps/web`)
- [ ] **ACTION-W03.1: Virtual Scrolling Thread List** — Smooth infinite scrolling for large message sets.
- [ ] **ACTION-W03.2: Thread Item Card Component** — Sender chips, subject, snippet, timestamp, star toggle, attachment icon.
- [ ] **ACTION-W03.3: Multi-Select Bulk Action Toolbar** — Archive, Trash, Mark read/unread, Label applicator.
- [ ] **ACTION-W03.4: Keyboard Shortcut Navigation Handler** — `j`/`k` move, `e` archive, `r` reply, `c` compose, `/` search.
- [ ] **ACTION-W03.5: Empty Folder Artwork & Banners** — Inbox Zero state and clean trash/spam views.
- [ ] **ACTION-W03.6: Thread List Test Suite** — Test selection, sorting, and virtual scroll rendering.

### TASK-W04: Message Reading Pane & Security Protections (`apps/web`)
- [ ] **ACTION-W04.1: Message Header Bar** — Sender, recipient chips, date/time, reply/forward buttons.
- [ ] **ACTION-W04.2: Inbound Security Status Card** — SPF/DKIM/DMARC badges and untrusted sender warnings.
- [ ] **ACTION-W04.3: Sanitized HTML Body Renderer** — Block remote tracking images by default with "Load images" toggle.
- [ ] **ACTION-W04.4: Attachment Grid & Antivirus Card** — Filename, size, clean virus scan badge, secure download button.
- [ ] **ACTION-W04.5: Reading Pane Test Suite** — Test sanitization, image blocker, and attachment downloads.

### TASK-W05: Rich Text Compose & Draft Auto-Save (`apps/web`)
- [ ] **ACTION-W05.1: Floating & Fullscreen Compose Modal** — Minimize, expand, and close window actions.
- [ ] **ACTION-W05.2: Recipient Chip Input** — To, Cc, Bcc fields with email format validation.
- [ ] **ACTION-W05.3: Rich Text Formatting Toolbar** — Bold, italic, lists, link inserter, blockquote.
- [ ] **ACTION-W05.4: Drag-and-Drop Attachment Uploader** — Multi-file dropzone with upload progress bars.
- [ ] **ACTION-W05.5: Debounced Draft Auto-Save Hook** — Auto-persist drafts to backend API every 30 seconds.
- [ ] **ACTION-W05.6: Compose Modal Test Suite** — Test draft auto-save and attachment handling.

### TASK-W06: Instant Search & Realtime Inbound Updates (`apps/web`)
- [ ] **ACTION-W06.1: Global Search Bar** — Live typeahead dropdown suggestions with sub-400ms speed.
- [ ] **ACTION-W06.2: Advanced Search Filter Modal** — From, To, Date Range, Has Attachment, Folder filters.
- [ ] **ACTION-W06.3: SSE Realtime Connection Client** — Auto-reconnect SSE stream client.
- [ ] **ACTION-W06.4: Inbound Mail Toast Notifications** — Instant toast banner upon new mail arrival.
- [ ] **ACTION-W06.5: AI Summarization & Smart Reply Chips** — One-click AI summary and quick reply insert buttons.
- [ ] **ACTION-W06.6: Search & Realtime Test Suite** — Test typeahead search and realtime toast triggers.

### TASK-W07: Administrative Web Portal (`apps/admin`)
- [ ] **ACTION-W07.1: Admin Dashboard Layout** — System health metrics and domain count tiles.
- [ ] **ACTION-W07.2: Domain Management Console** — Add domain and view copyable MX, SPF, DKIM, DMARC records.
- [ ] **ACTION-W07.3: Live DNS 4-Check Verification Trigger** — Live DNS check button with status badges.
- [ ] **ACTION-W07.4: User & Mailbox Directory** — Create mailbox, edit quota bytes, and assign roles.
- [ ] **ACTION-W07.5: System Audit Log Viewer** — Searchable audit table with actor, action, and date filters.
- [ ] **ACTION-W07.6: Quarantine & Delivery Queue Inspector** — Retry stuck outbound deliveries and release clean quarantined mail.
- [ ] **ACTION-W07.7: Admin Portal Test Suite** — Test admin management operations.

---

## Phase 3: Mobile Application (`apps/mobile` — Flutter)

### TASK-M01: Mobile Workspace Setup & Navigation Shell
- [ ] **ACTION-M01.1: Flutter Project Configuration** — `pubspec.yaml`, dependencies, and lint rules.
- [ ] **ACTION-M01.2: Design Tokens & Theme Setup** — Dark mode theme with Eazzio Blue `#2D5BFF` and slate background `#0F1115`.
- [ ] **ACTION-M01.3: Navigation Drawer & Bottom Tabs** — Inbox, Starred, Folders, and Settings tabs.
- [ ] **ACTION-M01.4: Secure Credential Storage** — `FlutterSecureStorage` integration for token persistence.

### TASK-M02: Offline-First SQLite Sync Engine
- [ ] **ACTION-M02.1: Local SQLite Database Schema** — SQLite tables for cached mailboxes, threads, and messages.
- [ ] **ACTION-M02.2: Bidirectional Delta Sync Engine** — Sync engine syncing with backend REST API.
- [ ] **ACTION-M02.3: Optimistic Local State Updates** — Instant read/star/archive state with queued sync actions.

### TASK-M03: Mobile Triage, Gesture Navigation & Compose
- [ ] **ACTION-M03.1: Mobile Thread List** — Pull-to-refresh and infinite cursor scrolling.
- [ ] **ACTION-M03.2: Swipe Gestures** — Swipe-left to archive and swipe-right to delete.
- [ ] **ACTION-M03.3: Mobile Message Reading Screen** — Zoomable sanitized email body and attachment previewer.
- [ ] **ACTION-M03.4: Mobile Email Composer** — Camera capture, file picker, and recipient chips.

### TASK-M04: Push Notifications & Biometric Security
- [ ] **ACTION-M04.1: FCM / APNs Background Notification Handler** — Push notification listener and unread badge sync.
- [ ] **ACTION-M04.2: Biometric App Lock** — FaceID / Fingerprint unlock with fallback PIN.

---

## Phase 4: Security Gap Check & Penetration Hardening

### TASK-S01: Authentication & Session Security Audit
- [ ] **ACTION-S01.1: Rate Limiting Attack Test** — Penetration test against brute force on `/v1/auth/login`.
- [ ] **ACTION-S01.2: Immediate Session Invalidation Test** — Verify instant JWT rejection upon session revocation.
- [ ] **ACTION-S01.3: Constant-Time Account Recovery Test** — Verify uniform response time preventing username enumeration.

### TASK-S02: Multi-Tenant Data Isolation & RLS Verification
- [ ] **ACTION-S02.1: Cross-Tenant Direct Object Reference Test** — Tenant A attempting to access Tenant B mailbox/messages.
- [ ] **ACTION-S02.2: PostgreSQL RLS Policy Bypass Test** — Penetration test against RLS scope boundaries.
- [ ] **ACTION-S02.3: Audit Log Mutation Prevention Test** — Verify database rejection of `UPDATE` and `DELETE` on `audit_log`.

### TASK-S03: Inbound SMTP & Outbound Deliverability Hardening
- [ ] **ACTION-S03.1: EICAR Malware Ingestion Test** — Penetration test verifying ClamAV malware rejection.
- [ ] **ACTION-S03.2: Forged DMARC Spoofing Test** — Penetration test verifying DMARC reject enforcement.
- [ ] **ACTION-S03.3: DKIM Key Custody Audit** — Verify zero leakage of private keys in logs, errors, or databases.

### TASK-S04: Content Injection & Attachment Sandbox Audit
- [ ] **ACTION-S04.1: Stored XSS Injection Test** — Test sanitization against malicious HTML and SVG payloads.
- [ ] **ACTION-S04.2: MIME-Sniffing Prevention Test** — Verify `Content-Disposition` and `X-Content-Type-Options: nosniff`.

### TASK-S05: Supply Chain & Secret Scanning Sign-Off
- [ ] **ACTION-S05.1: Automated TruffleHog Secret Scan** — Full workspace scan for exposed secrets.
- [ ] **ACTION-S05.2: `pnpm audit` Clean Report** — Verify zero high or critical security vulnerabilities.
