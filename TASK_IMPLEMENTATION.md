# Eazzio Mail — Granular Action-Step Implementation Tracker

> **Strict Execution Rules:**
> 1. **Sequential Progression:** Phase 1 (Backend) ➔ Phase 2 (Web Frontend) ➔ Phase 3 (Mobile App) ➔ Phase 4 (Security Hardening).
> 2. **Granular Sub-Actions:** Every Task is broken down into atomic, testable sub-actions `[ ]`.
> 3. **No Hopping / No Skipping:** Every sub-action must be executed, verified, and checked `[x]` before moving to the next.
> 4. **Design Reference:** `Docs/DESIGN.md` (Eazzio Blue `#2D5BFF`, Mail Accent `#FFA43D`, Deep Slate `#0F1115`).
> 5. **UI/UX Reference:** `/home/rahul-kumar/Desktop/Git_Pull/` (`Eazzio-Books` & `Eazzio-Payroll`).

---

## Phase 1: Backend Platform (Foundation, Contracts, Database & Microservices) — `[x] 100% COMPLETE`

- [x] **TASK-B01: Workspace Monorepo & Toolchain Scaffold**
  - [x] ACTION-B01.1: Root package.json & pnpm-workspace.yaml configuration
  - [x] ACTION-B01.2: Root tsconfig.base.json strict TypeScript settings
  - [x] ACTION-B01.3: ESLint & Prettier toolchain configuration
  - [x] ACTION-B01.4: Category A Dockerfiles (Postgres, Valkey, OpenSearch, MinIO, Postfix, Dovecot, Rspamd, ClamAV)
  - [x] ACTION-B01.5: Docker Compose local multi-container network configuration
  - [x] ACTION-B01.6: GitHub Actions CI workflow (.github/workflows/ci.yml)

- [x] **TASK-B02: Pure Domain Package (`packages/domain`)**
  - [x] ACTION-B02.1: EmailAddress value object with RFC 5322 validation
  - [x] ACTION-B02.2: MessageId & SpamScore value objects
  - [x] ACTION-B02.3: Quota value object with BigInt bytes calculation
  - [x] ACTION-B02.4: Zero I/O immutable domain models (User, Mailbox, Message, Thread, Folder, Label, Domain, Organization, Policy)
  - [x] ACTION-B02.5: Abstract repository interfaces
  - [x] ACTION-B02.6: Domain unit test suite

- [x] **TASK-B03: Contracts & Cross-Service Specifications (`packages/contracts`)**
  - [x] ACTION-B03.1: OpenAPI 3.1 REST API specification (openapi.yaml)
  - [x] ACTION-B03.2: Typed domain events (MailAcceptedEvent, MailRejectedEvent, MailQuarantinedEvent)
  - [x] ACTION-B03.3: Typed delivery & admin events (MailDeliveredEvent, MailBouncedEvent, DomainVerifiedEvent)
  - [x] ACTION-B03.4: Contract schema unit tests

- [x] **TASK-B04: Abstract Infrastructure Adapters (`packages/infra-adapters`)**
  - [x] ACTION-B04.1: Database adapter interface (EazzioDatabase)
  - [x] ACTION-B04.2: Storage adapter interface (EazzioStorage)
  - [x] ACTION-B04.3: Cache adapter interface (EazzioCache)
  - [x] ACTION-B04.4: AI adapter interface (EazzioAI)
  - [x] ACTION-B04.5: Email transport adapter interface (EazzioEmailTransport)
  - [x] ACTION-B04.6: Adapter contract test suite

- [x] **TASK-B05: Inbound Security Pipeline Engine (`packages/security-pipeline`)**
  - [x] ACTION-B05.1: ClamAV malware hard-gate rejection logic
  - [x] ACTION-B05.2: DMARC policy reject hard-gate logic
  - [x] ACTION-B05.3: SPF/DKIM/DMARC auth penalty scoring
  - [x] ACTION-B05.4: Deterministic decide() composite scoring function
  - [x] ACTION-B05.5: Security pipeline branch unit tests

- [x] **TASK-B06: Identity & Authentication Backend (`services/identity`)**
  - [x] ACTION-B06.1: Argon2id password service with 12-char minimum policy
  - [x] ACTION-B06.2: Custom JWT access/refresh token generator and verifier
  - [x] ACTION-B06.3: TOTP secret generator and 6-digit authenticator verifier
  - [x] ACTION-B06.4: Session state manager (active / revoked)
  - [x] ACTION-B06.5: Anti-enumeration account recovery response
  - [x] ACTION-B06.6: Identity service unit test suite

- [x] **TASK-B07: Database Migrations & Row Level Security (RLS)**
  - [x] ACTION-B07.1: PostgreSQL reversible initial schema migration (001_initial_schema.sql / down)
  - [x] ACTION-B07.2: Hot-path database indexes (mailbox_id, folder_id, thread_id, idempotency_key)
  - [x] ACTION-B07.3: Row Level Security policies for mailbox & message tenant scoping (002_rls_and_security_policies.sql)
  - [x] ACTION-B07.4: Append-only audit_log policy (REVOKE UPDATE/DELETE)
  - [x] ACTION-B07.5: AI role negative DB permission grants
  - [x] ACTION-B07.6: Migration integrity test suite

- [x] **TASK-B08: Mailbox Core REST API (`services/api`)**
  - [x] ACTION-B08.1: Layered Express router setup (api → application → domain ← infra)
  - [x] ACTION-B08.2: JWT session authentication & object-level authorization middleware
  - [x] ACTION-B08.3: System folder generator (Inbox, Sent, Drafts, Spam, Trash, Archive)
  - [x] ACTION-B08.4: Many-to-many label applicator without message duplication
  - [x] ACTION-B08.5: Thread heuristic assigner (In-Reply-To, References, normalized subject)
  - [x] ACTION-B08.6: Standard JSON error envelope and taxonomy handler
  - [x] ACTION-B08.7: Supertest integration test suite

- [x] **TASK-B09: Inbound Mail Pipeline (`services/mail-inbound`)**
  - [x] ACTION-B09.1: RFC 5321 envelope validator with 25MB maximum size gate
  - [x] ACTION-B09.2: MIME parser and header extractor
  - [x] ACTION-B09.3: Deterministic decide() security gate integration
  - [x] ACTION-B09.4: MailAccepted, MailRejected, and MailQuarantined event emissions
  - [x] ACTION-B09.5: Inbound pipeline unit test suite

- [x] **TASK-B10: Outbound Mail Delivery Engine (`services/mail-outbound`)**
  - [x] ACTION-B10.1: HTML sanitization (stripping script tags & JS protocols)
  - [x] ACTION-B10.2: RFC 5322 MIME message composer
  - [x] ACTION-B10.3: RSA-SHA256 DKIM cryptographic signature generator
  - [x] ACTION-B10.4: Exponential backoff retry engine (base: 30s, max: 3600s, maxAttempts: 8)
  - [x] ACTION-B10.5: Delivery state transitions (queued → sending → delivered/retrying/bounced)
  - [x] ACTION-B10.6: Outbound pipeline unit test suite

- [x] **TASK-B11: Search & Indexing Engine (`services/search-indexer` & `services/api`)**
  - [x] ACTION-B11.1: Single-writer search document projector
  - [x] ACTION-B11.2: MailAccepted event consumer and indexer service
  - [x] ACTION-B11.3: Read-only search query endpoint in services/api
  - [x] ACTION-B11.4: Typeahead autocomplete query handler (<400ms target)
  - [x] ACTION-B11.5: Search indexer unit test suite

- [x] **TASK-B12: Realtime Notifications & Administration (`services/notification` & `services/admin-service`)**
  - [x] ACTION-B12.1: Mailbox event channel generator (mailbox:{id}:events)
  - [x] ACTION-B12.2: MailAccepted event fan-out & badge count updater
  - [x] ACTION-B12.3: 90% mailbox quota warning trigger
  - [x] ACTION-B12.4: Admin domain 4-check DNS verifier (MX, SPF, DKIM, DMARC)
  - [x] ACTION-B12.5: DomainVerifiedEvent emitter
  - [x] ACTION-B12.6: Notification & admin unit test suites

- [x] **TASK-B13: AI Gateway & End-to-End Backend Verification (`services/ai-gateway`)**
  - [x] ACTION-B13.1: AI opt-in policy checker (ai_opt_in: true)
  - [x] ACTION-B13.2: Thread summarizer and smart reply application service
  - [x] ACTION-B13.3: AI Gateway unit test suite
  - [x] ACTION-B13.4: Complete backend lifecycle end-to-end test (tests/e2e/full-backend-lifecycle.test.ts)

---

## Phase 2: Frontend Web Client (`apps/web` & `apps/admin`) — `[IN PROGRESS]`

- [ ] **TASK-W01: Web Client Shell & 3-Pane Responsive Layout (`apps/web`)**
  - [ ] ACTION-W01.1: Build left navigation sidebar (Collapsible, folder icons, unread badges, compose trigger)
  - [ ] ACTION-W01.2: Build center thread list container (Filter tabs, search bar, list header toolbar)
  - [ ] ACTION-W01.3: Build right message reading pane container (Subject header, action buttons, body viewer)
  - [ ] ACTION-W01.4: Integrate `@eazzio/ui-kit` design tokens (Eazzio Blue `#2D5BFF`, Surface `#0F1115`)
  - [ ] ACTION-W01.5: Mount dynamic Privacy Mode Badge (`Standard encryption`, `Enhanced privacy`, `End-to-end encrypted`)
  - [ ] ACTION-W01.6: Unit test 3-pane layout rendering and responsive collapse behavior

- [ ] **TASK-W02: Auth & Account Management Web Views (`apps/web`)**
  - [ ] ACTION-W02.1: Build Registration page with 12-char password strength meter
  - [ ] ACTION-W02.2: Build Login page with email & password validation
  - [ ] ACTION-W02.3: Build TOTP MFA challenge view with 6-digit auto-advancing input
  - [ ] ACTION-W02.4: Build Account Recovery view with anti-enumeration feedback banner
  - [ ] ACTION-W02.5: Build User Settings page (Profile, active sessions, revoke session trigger)
  - [ ] ACTION-W02.6: Auth flow client test suite

- [ ] **TASK-W03: Mailbox Triage & Virtualized Thread List (`apps/web`)**
  - [ ] ACTION-W03.1: Virtual scrolling thread list renderer for large mailboxes
  - [ ] ACTION-W03.2: Thread item card (Sender avatar, subject, snippet, timestamp, attachment icon, star toggle)
  - [ ] ACTION-W03.3: Checkbox multi-select toolbar (Archive, Trash, Mark read/unread, Label dropdown)
  - [ ] ACTION-W03.4: Global keyboard shortcut handler (`j`/`k` move, `e` archive, `r` reply, `c` compose, `/` search)
  - [ ] ACTION-W03.5: Empty folder states (Inbox Zero artwork, empty spam/trash banners)
  - [ ] ACTION-W03.6: Thread list unit test suite

- [ ] **TASK-W04: Message Reading Pane & Security Protections (`apps/web`)**
  - [ ] ACTION-W04.1: Message header card (From/To chips, Date, Reply/Forward/Print buttons)
  - [ ] ACTION-W04.2: Security banner component (SPF, DKIM, DMARC pass/fail tags, untrusted sender warning)
  - [ ] ACTION-W04.3: Sanitized HTML body renderer with blocked remote images toggle ("Load images")
  - [ ] ACTION-W04.4: Attachment card grid (Filename, size, mime preview, Antivirus clean badge, download button)
  - [ ] ACTION-W04.5: Reading pane unit test suite

- [ ] **TASK-W05: Rich Text Compose & Draft Auto-Save (`apps/web`)**
  - [ ] ACTION-W05.1: Floating compose modal with minimize, expand, and close triggers
  - [ ] ACTION-W05.2: Recipient input chips (To, Cc, Bcc with email format validation)
  - [ ] ACTION-W05.3: Rich text formatting toolbar (Bold, italic, lists, links, quote)
  - [ ] ACTION-W05.4: Drag-and-drop attachment uploader with upload progress bar
  - [ ] ACTION-W05.5: Debounced draft auto-save handler to backend API
  - [ ] ACTION-W05.6: Compose modal unit test suite

- [ ] **TASK-W06: Instant Search & Realtime Inbound Updates (`apps/web`)**
  - [ ] ACTION-W06.1: Global search input with live autocomplete dropdown (<400ms)
  - [ ] ACTION-W06.2: Advanced search filter modal (From, To, Date Range, Has Attachment, Folder)
  - [ ] ACTION-W06.3: SSE realtime connection manager with automatic reconnect logic
  - [ ] ACTION-W06.4: Inbound toast notification on new mail arrival
  - [ ] ACTION-W06.5: AI summary and Smart Reply prompt chips in reading pane
  - [ ] ACTION-W06.6: Search & realtime unit test suite

- [ ] **TASK-W07: Administrative Web Portal (`apps/admin`)**
  - [ ] ACTION-W07.1: Admin dashboard layout (Overview metrics, system health status)
  - [ ] ACTION-W07.2: Domain management console (Add domain, copyable MX/SPF/DKIM/DMARC DNS records)
  - [ ] ACTION-W07.3: Domain live verification trigger and 4-record check status table
  - [ ] ACTION-W07.4: User & Mailbox directory (Create mailbox, edit quota, reset password trigger)
  - [ ] ACTION-W07.5: System audit log viewer with actor, action, and date-range filters
  - [ ] ACTION-W07.6: Quarantine & Delivery Queue inspector (Retry send, release from quarantine)
  - [ ] ACTION-W07.7: Admin web portal test suite

---

## Phase 3: Mobile Application (`apps/mobile` — Flutter) — `[PENDING]`

- [ ] **TASK-M01: Mobile Workspace Setup & Navigation Shell**
  - [ ] ACTION-M01.1: Flutter package scaffold and dependency setup
  - [ ] ACTION-M01.2: Design tokens & theme integration (Eazzio Blue `#2D5BFF`, Dark Mode)
  - [ ] ACTION-M01.3: Bottom tab bar & drawer navigation (Inbox, Starred, Folders, Settings)
  - [ ] ACTION-M01.4: Secure credential storage with FlutterSecureStorage (Keychain / Keystore)

- [ ] **TASK-M02: Offline-First SQLite Sync Engine**
  - [ ] ACTION-M02.1: Local SQLite database schema for mailboxes, threads, and messages
  - [ ] ACTION-M02.2: Delta synchronization engine syncing with backend REST API
  - [ ] ACTION-M02.3: Optimistic local UI updates (immediate read/star/archive) with sync queue

- [ ] **TASK-M03: Mobile Triage, Gesture Navigation & Compose**
  - [ ] ACTION-M03.1: Thread list with pull-to-refresh and infinite pagination
  - [ ] ACTION-M03.2: Swipe-left to archive and swipe-right to trash gesture interactions
  - [ ] ACTION-M03.3: Mobile message reader with zoomable sanitized body and attachment previews
  - [ ] ACTION-M03.4: Mobile composer with camera capture and native file picker integration

- [ ] **TASK-M04: Push Notifications & Biometric Authentication**
  - [ ] ACTION-M04.1: FCM / APNs background push notification handler and badge counter
  - [ ] ACTION-M04.2: Biometric app lock (FaceID / Fingerprint) with fallback PIN

---

## Phase 4: Security Gap Check & Penetration Hardening — `[PENDING]`

- [ ] **TASK-S01: Authentication & Session Security Audit**
  - [ ] ACTION-S01.1: Penetration test: Rate-limiting on `/v1/auth/login` under high-frequency credential stuffing
  - [ ] ACTION-S01.2: Penetration test: Immediate revocation of JWT tokens upon session termination
  - [ ] ACTION-S01.3: Penetration test: Uniform response time verification on account recovery to prevent timing attacks

- [ ] **TASK-S02: Multi-Tenant Data Isolation & RLS Verification**
  - [ ] ACTION-S02.1: Penetration test: Tenant A direct object reference attacks on Tenant B mailbox messages
  - [ ] ACTION-S02.2: Penetration test: PostgreSQL RLS policy bypass attempts with malicious SQL parameters
  - [ ] ACTION-S02.3: Verification of append-only audit_log table immutability (Blocked UPDATE/DELETE)

- [ ] **TASK-S03: Inbound SMTP & Outbound Deliverability Hardening**
  - [ ] ACTION-S03.1: Penetration test: EICAR malware attachment injection through Postfix SMTP handoff
  - [ ] ACTION-S03.2: Penetration test: Spoofed domain envelope delivery to verify DMARC reject enforcement
  - [ ] ACTION-S03.3: Penetration test: In-memory DKIM private key custody verification (Zero disk/log leak)

- [ ] **TASK-S04: Content Injection & Attachment Sandbox Audit**
  - [ ] ACTION-S04.1: Penetration test: Stored XSS injection via malicious HTML/SVG body tags
  - [ ] ACTION-S04.2: Penetration test: MIME-type sniffing bypass on attachment downloads

- [ ] **TASK-S05: Supply Chain & Secret Scanning Sign-Off**
  - [ ] ACTION-S05.1: Automated TruffleHog secret scan across git history and configuration files
  - [ ] ACTION-S05.2: `pnpm audit` execution with zero high/critical vulnerabilities
