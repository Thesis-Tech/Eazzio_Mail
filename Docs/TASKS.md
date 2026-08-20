# Eazzio Mail — TASKS.md (Implementation Plan)

**Document Type:** Numbered Task Backlog — the implementation plan derived from every HLD/LLD artifact
**Supersedes:** Draft TASKS.md v1.0 (produced before `LLD.md`, `DESIGN.md`, `APP_FLOW.md`, `MODULES.md`, `TechStack.md`, `Security.md` existed)
**Parent Documents:** `PRD.md` v1.1 · `ARCHITECTURE.md` v1.2 · `AGENTS.md` v1.0 · `DECISIONS.md` v1.0 · `LLD.md` v1.0 · `DESIGN.md` v1.0 · `APP_FLOW.md` v1.0 · `MODULES.md` v1.0 · `TechStack.md` v1.0 · `Security.md` v1.0 · `HLD.md` v1.0
**Status:** Draft v2.0

---

## 0. How to Use This Document

> **Point the agent at exactly ONE unchecked task, in order.** The agent completes it, stops, and waits for the human to reply **"Task Completed"** before the next task is assigned (`AGENTS.md` Section 2.3, `DECISIONS.md` D-003). It does not self-select the next task.

- Work **top to bottom within a phase**; phase order matters — no jumping to a later phase while earlier tasks remain unchecked.
- Every task cites the artifact(s) that specify it exactly — `FR-*`/`NFR-*` (`PRD.md`), a folder path (`ARCHITECTURE.md`), a schema/interface/algorithm (`LLD.md`), a screen/flow (`DESIGN.md`/`APP_FLOW.md`), a module (`MODULES.md`), a concrete technology (`TechStack.md`), or a control (`Security.md`). A task with no citation is not authorized (`PRD.md` Section 5.2 default-deny).
- **Definition of Done** (Rule 21) for every task: code complete, tests passing, docs updated, lint/typecheck clean, reviewed against the cited artifact(s) — not merely "it runs."
- New tasks append at the end of the relevant phase with the next sequential number — never renumbered or inserted mid-sequence.
- **Status legend:** `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked (note why inline)

---

## Phase 1–3 — Planning, Requirements, Design (Gate: Approved)

- [x] **T001** — `PRD.md`: requirements, personas, default-deny scope boundary.
- [x] **T002** — `ARCHITECTURE.md`: folder structure, layer boundaries, data flow, ADR 0001 (MVP managed services).
- [x] **T003** — `AGENTS.md`: session rules, stack placeholders, conventions, full 117-rule governance set.
- [x] **T004** — `DECISIONS.md`: 13 decision records (anti-refactoring guardrails).
- [x] **T005** — `HLD.md`: coverage index confirming the four HLD documents.
- [x] **T006** — `LLD.md`: database schema, adapter interfaces, API contract highlights, event payloads, state machines, core algorithms.
- [x] **T007** — `DESIGN.md`: design tokens, component inventory, screen inventory, key flows, privacy-tier labeling rules.
- [x] **T008** — `APP_FLOW.md`: complete navigation map, every screen's entry/exit transitions, error/degraded-state flows.
- [x] **T009** — `MODULES.md`: module-by-module breakdown (purpose, deliverables, dependencies, Definition of Done) for every package/service/app/infra module.
- [x] **T010** — `TechStack.md`: concrete technology baseline, finalizing backend framework (Node.js/Express) and correcting Redis/Supabase-Auth/deferred-search conflicts.
- [x] **T011** — `Security.md`: full security architecture, including the mail-specific pipeline (SPF/DKIM/DMARC/ARC, DKIM custody, malware/spam controls) absent from the generic baseline.
- [x] **T012** — This document (`TASKS.md` v2.0) reviewed and accepted as the implementation plan.

> **Gate status:** Phase 4 (Implementation) is NOT yet authorized. Nothing below starts until the human sends the literal instruction **"Gate Approved: Proceed to Phase 4."** Sequencing is not authorization.

---

## Phase 4 — Implementation

### 4.A — Monorepo, Toolchain & Infra Scaffold

- [x] **T013** — Initialize pnpm workspace monorepo with the exact structure from `ARCHITECTURE.md` Section 2 (`apps/`, `services/`, `packages/`, `infra/`, `docs/`); placeholder `README.md` per module (Rule 96). *Ref: ARCHITECTURE.md Section 2; TechStack.md Section 2.*
- [x] **T014** — Configure TypeScript strict mode, ESLint, Prettier at workspace root; replace `<pkg-manager>` placeholders in `AGENTS.md` Section 4 with real `pnpm` scripts and update that file. *Ref: TechStack.md Section 16.*
- [x] **T015** — Write `infra/docker/` Dockerfiles: Postgres, Valkey, OpenSearch, MinIO, Nginx, Postfix, Dovecot, Rspamd, ClamAV. *Ref: TechStack.md Section 3; ARCHITECTURE.md Section 3.5.*
- [x] **T016** — Write `infra/deploy/compose/` docker-compose wiring all of Phase 4.A's containers plus placeholder service containers. *Ref: ARCHITECTURE.md Section 9, Appendix A.*
- [x] **T017** — Set up GitHub Actions CI: lint → typecheck → test → security scan → build, no merge without passing (Rule 83). *Ref: Security.md Section 26 item 18; TechStack.md Section 15.*
- [x] **T018** — Create `ASSUMPTIONS.md`, `RISKS.md`, `docs/adr/` (with template) at repo root. *Ref: AGENTS.md Rules 23, 26; ARCHITECTURE.md Section 10.*
- [x] **T019** — Configure secret management (env vars, `.gitignore`, per-environment separation local/dev/staging/prod) and secret-scanning in CI. *Ref: Security.md Section 15, Section 24.*

### 4.B — Shared Packages (Interfaces First)

- [x] **T020** — `packages/domain/models/`: Message, Mailbox, Folder, Label, Thread, User, Organization, Domain, Policy — pure, no I/O. *Ref: LLD.md Section 1; MODULES.md Section 2.1.*
- [x] **T021** — `packages/domain`: value objects `EmailAddress`, `MessageId`, `Quota`, `SpamScore` + repository interfaces (no implementations). *Ref: MODULES.md Section 2.1.*
- [x] **T022** — `packages/contracts/api/openapi.yaml`: schema for every endpoint in `LLD.md` Section 3. *Ref: LLD.md Section 3; TechStack.md Section 2 (API Standards).*
- [x] **T023** — `packages/contracts/events/`: `MailAccepted`, `MailRejected`, `MailQuarantined`, `MailDelivered`, `MailBounced`, `DomainVerified` schemas. *Ref: LLD.md Section 4.*
- [x] **T024** — `packages/infra-adapters/database/interface.ts` (`EazzioDatabase`) — interface only. *Ref: LLD.md Section 2.1; ARCHITECTURE.md Section 9.2/9.3.*
- [x] **T025** — `packages/infra-adapters/database/postgres-adapter/` + contract tests. *Ref: DECISIONS.md D-004; TechStack.md Section 5.*
- [x] **T026** — `packages/infra-adapters/database/supabase-adapter/` + same contract test suite as T025. *Ref: ARCHITECTURE.md Appendix A.*
- [x] **T027** — `packages/infra-adapters/storage/interface.ts` (`EazzioStorage`) — interface only. *Ref: LLD.md Section 2.2.*
- [ ] **T028** — `packages/infra-adapters/storage/minio-adapter/` + contract tests. *Ref: TechStack.md Section 6.*
- [ ] **T029** — `packages/infra-adapters/storage/cloudinary-adapter/` + same contract test suite as T028; configure signed uploads + restricted presets. *Ref: Security.md Section 14.*
- [x] **T030** — `packages/infra-adapters/cache/interface.ts` (`EazzioCache`) + Valkey adapter; verify `incr()` atomicity under concurrency. *Ref: LLD.md Section 2.3; TechStack.md Section 7; MODULES.md Section 2.5.*
- [x] **T031** — `packages/infra-adapters/ai/interface.ts` (`EazzioAI`) + `local-model-adapter/`; test proving `isEnabled()` gates every other method and no method's output reaches a decision table. *Ref: LLD.md Section 2.4; DECISIONS.md D-007.*
- [x] **T032** — `packages/infra-adapters/email-transport/interface.ts` + adapter wrapping Postfix/Dovecot integration points. *Ref: LLD.md Section 2.5.*
- [x] **T033** — `packages/security-pipeline/{spf,dkim,dmarc,arc}/`: deterministic auth checks. *Ref: FR-IN-04; Security.md Section 5.1.*
- [x] **T034** — `packages/security-pipeline/spam-rules/` (Rspamd rule engine integration). *Ref: FR-SPAM-01.*
- [x] **T035** — `packages/security-pipeline/spam-statistical/` (Bayesian layer). *Ref: FR-SPAM-02.*
- [x] **T036** — `packages/security-pipeline/malware-scan/`: scoring/decision logic around the ClamAV adapter. *Ref: FR-SPAM-07/08; Security.md Section 14.*
- [x] **T037** — Implement and unit-test `decide()` (accept/quarantine/reject) against fixture messages covering every branch. *Ref: LLD.md Section 6.1; DECISIONS.md D-007; Security.md Section 5.1.*
- [x] **T038** — `packages/ui-kit`: token setup (colors/typography/spacing/motion) matching `DESIGN.md` Section 2, generated via the `ui-ux-pro-max` skill. *Ref: DESIGN.md Sections 2–3.*
- [x] **T039** — `packages/ui-kit` components: `AppShell`, `MailList`, `MailListItem`, `ThreadView`, `ComposeSheet`, `LabelChip`, `FolderTree`, `SearchBar`, `ToastStack`, `EmptyState` — states/variants catalog + accessibility pass per component. *Ref: DESIGN.md Section 3, Section 6.1.*
- [x] **T040** — `packages/ui-kit` components: `DomainVerificationCard`, `PrivacyModeBadge` (fixed copy per `DESIGN.md` Section 6.5), `RiskBanner`, `AuditLogTable`. *Ref: DESIGN.md Section 3; DECISIONS.md D-011.*

### 4.C — Identity Service

- [x] **T041** — Scaffold `services/identity/` (`api/application/domain/infra`). *Ref: ARCHITECTURE.md Section 3.1.*
- [x] **T042** — Registration + password policy (Argon2id, 12-char minimum, no forced rotation). *Ref: FR-AUTH-01; Security.md Section 6.1.*
- [x] **T043** — Password auth + TOTP MFA (`mfa_totp_secrets` table). *Ref: FR-AUTH-02; LLD.md Section 1.1; Security.md Section 7.*
- [x] **T044** — Session/device management: list, revoke individual, revoke all (`sessions` state machine). *Ref: FR-AUTH-03; LLD.md Section 5.4.*
- [x] **T045** — Account recovery flow with anti-enumeration response. *Ref: FR-AUTH-04; APP_FLOW.md Section 2; Security.md Section 19.*
- [x] **T046** — Suspicious-login detection → forced MFA + existing-session notification. *Ref: FR-AUTH-05; Security.md Section 9.*
- [x] **T047** — Authorization hierarchy (Platform→Org→Domain→Mailbox→User) via `roles` table. *Ref: FR-AUTH-06; Security.md Section 8.1.*
- [x] **T048** — Scoped API tokens/service accounts. *Ref: FR-AUTH-07.*
- [x] **T049** — OAuth 2.0/OIDC login methods (Google + approved providers) routed into `services/identity`'s own session issuance. *Ref: TechStack.md Section 4.*
- [x] **T050** — Re-authentication requirement before: password change, email change, MFA disable, token creation, DKIM rotation, org-ownership transfer. *Ref: Security.md Section 7.*
- [x] **T051** — `services/identity/README.md` naming FR-* IDs and dependencies; **explicit check confirming no import of Supabase Auth anywhere.** *Ref: DECISIONS.md D-005.*

### 4.D — Database & RLS

- [x] **T052** — Implement full schema (`LLD.md` Section 1) as versioned migrations, each with a tested rollback script. *Ref: LLD.md Section 1; AGENTS.md Rule 86.*
- [x] **T053** — Native PostgreSQL RLS policies for tenant/ownership isolation on `mailboxes`, `messages`, `domains`, `organizations`; verify policies run identically on `postgres-adapter` and `supabase-adapter`. *Ref: Security.md Section 16; DECISIONS.md D-004.*
- [x] **T054** — DB role grants: confirm `services/ai-gateway`'s role has no write grant to `messages.spam_score`, `delivery_state`, `auth_results`, `outbound_queue.state`; write the negative test proving it. *Ref: Security.md Section 8.4; MODULES.md Section 3.8.*
- [x] **T055** — `audit_log` table: append-only enforcement (no `UPDATE`/`DELETE` grant for any application role). *Ref: LLD.md Section 1.4; Security.md Section 18.2.*

### 4.E — Mailbox Core (`services/api`)

- [x] **T056** — System folders (Inbox/Sent/Drafts/Spam/Trash/Archive). *Ref: FR-MBOX-01.*
- [x] **T057** — Custom hierarchical folders. *Ref: FR-MBOX-02.*
- [x] **T058** — Labels as many-to-many (`message_labels`), never per-label message copies. *Ref: FR-MBOX-03; DECISIONS.md D-009.*
- [x] **T059** — Thread assignment (`assignThread` heuristic: strict In-Reply-To/References match, then subject+participant fallback). *Ref: FR-MBOX-04; LLD.md Section 6.2.*
- [x] **T060** — Star/flag/important marking. *Ref: FR-MBOX-05.*
- [x] **T061** — Bulk actions (archive/delete/label/move across selection or search results). *Ref: FR-MBOX-07.*
- [x] **T062** — Filters/Rules: condition/action builder, priority ordering, enable/disable toggle. *Ref: FR-RULE-01; APP_FLOW.md Section 6.*
- [x] **T063** — Object-level authorization on every mailbox/message endpoint (ownership check before data access, not just `isAuthenticated`). *Ref: Security.md Section 8.3.*
- [x] **T064** — Standard error envelope + full `LLD.md` Section 3.1 error code taxonomy on every endpoint. *Ref: LLD.md Section 3.1.*

### 4.F — Inbound Mail Pipeline (`services/mail-inbound`)

- [x] **T065** — Scaffold `services/mail-inbound/`. *Ref: MODULES.md Section 3.2.*
- [x] **T066** — Wire Postfix SMTP receive → envelope handoff; enforce STARTTLS/MTA-STS policy. *Ref: FR-IN-01/02; Security.md Section 4.*
- [x] **T067** — Envelope validation (sender/recipient existence, size, rate limits). *Ref: FR-IN-03.*
- [x] **T068** — Wire `packages/security-pipeline` SPF/DKIM/DMARC/ARC checks into the pipeline. *Ref: FR-IN-04.*
- [x] **T069** — MIME parsing with malformed-message handling (logged, never silently dropped). *Ref: FR-IN-05.*
- [x] **T070** — Attachment analysis: type ID, hashing, known-threat lookup, ClamAV scan, recursive archive inspection within resource limits. *Ref: FR-IN-06; FR-SPAM-07/08.*
- [x] **T071** — Wire Rspamd rule + statistical scoring, plus URL risk scoring (`FR-SPAM-04`), into the composite score. *Ref: FR-SPAM-01…04.*
- [x] **T072** — Wire the deterministic policy decision gate (`decide()` from T037) as the actual accept/quarantine/reject enforcement point. *Ref: FR-IN-07; DECISIONS.md D-007.*
- [x] **T073** — Accept path: object storage write (raw MIME) + Postgres metadata write + `MailAccepted` event emission. *Ref: FR-IN-08.*
- [x] **T074** — Reject/quarantine paths: `MailRejected`/`MailQuarantined` events with reason codes; audit log entry per rejection. *Ref: LLD.md Section 4; Security.md Section 18.2.*
- [x] **T075** — End-to-end fixture tests: DMARC-reject mail never reaches inbox; malware attachment always quarantines. *Ref: Security.md Section 25.*
- [x] **T076** — `services/mail-inbound/README.md` naming FR-* IDs and forbidden dependencies.

### 4.G — Outbound Mail Pipeline (`services/mail-outbound`)

- [x] **T077** — Scaffold `services/mail-outbound/`. *Ref: MODULES.md Section 3.3.*
- [x] **T078** — Compose validation + HTML sanitization + MIME construction. *Ref: FR-OUT-01.*
- [x] **T079** — DKIM signing using `signOutbound()`; private key fetched from secrets store via `dkim_private_key_ref`, never logged. *Ref: FR-OUT-02; LLD.md Section 6.3; Security.md Section 5.2.*
- [x] **T080** — DKIM key generation + rotation procedure (dual-sign transition window). *Ref: Security.md Section 5.2, Section 22.*
- [x] **T081** — Outbound rate limiting via `EazzioCache.incr()`; stricter limits for new accounts. *Ref: FR-OUT-03; Security.md Section 5.4, Section 12.*
- [x] **T082** — Delivery queue: MX resolution, MTA-STS/STARTTLS negotiation, certificate validation, SMTP delivery attempt. *Ref: FR-OUT-04.*
- [x] **T083** — Retry/backoff per the exact formula in `LLD.md` Section 5.2; dead-letter after max attempts. *Ref: FR-OUT-05/07.*
- [x] **T084** — Delivery-state tracking (`LLD.md` Section 5.1 state machine), queryable per message. *Ref: FR-OUT-06.*
- [x] **T085** — Compromised-account mass-send detection → automatic throttle trigger. *Ref: Security.md Section 5.4, Section 21.*
- [x] **T086** — Idempotency: `outbound_queue.idempotency_key` UNIQUE constraint enforced on every insert path. *Ref: AGENTS.md Rule 14; LLD.md Section 1.4.*

### 4.H — Search (`services/search-indexer` + `services/api`)

- [ ] **T087** — Scaffold `services/search-indexer/` — consumes `MailAccepted` only, writes to OpenSearch only. *Ref: DECISIONS.md D-010.*
- [ ] **T088** — Full-text indexing across sender/recipient/subject/body/attachment-text/date/folder/label/thread. *Ref: FR-SRCH-01; LLD.md Section 6.4.*
- [ ] **T089** — Search query endpoint in `services/api` (read-only; confirm no direct OpenSearch write exists in this service). *Ref: FR-SRCH-01; DECISIONS.md D-010.*
- [ ] **T090** — Boolean/phrase/prefix/fuzzy query support + relevance ranking. *Ref: FR-SRCH-02/03.*
- [ ] **T091** — Autocomplete/typeahead endpoint, <400ms budget. *Ref: FR-SRCH-04; DESIGN.md Section 7.*
- [ ] **T092** — Verify indexing SLA end-to-end (`MailAccepted` → document available). *Ref: FR-SRCH-05; NFR-PERF-02.*

### 4.I — Realtime & Notification (`services/notification`)

- [ ] **T093** — WebSocket gateway in `services/api`; client subscription model. *Ref: FR-RT-01.*
- [ ] **T094** — `services/notification` consumes all message-lifecycle events, dispatches realtime updates. *Ref: MODULES.md Section 3.6.*
- [ ] **T095** — Multi-device state consistency (read state, folder moves) across simultaneous sessions. *Ref: FR-RT-03.*
- [ ] **T096** — Polling fallback on WebSocket disconnect (`APP_FLOW.md` Section 9 degraded-state flow). *Ref: NFR-REL-02.*
- [ ] **T097** — FCM push notification integration + device-token management. *Ref: TechStack.md Section 18; MODULES.md Section 3.6.*
- [ ] **T098** — Webhook dispatch: signature, timestamp validation, replay protection, idempotency. *Ref: FR-RT-04; Security.md Section 20.*

### 4.J — Domain & Admin (`services/admin-service`, `apps/admin`)

- [ ] **T099** — Scaffold `services/admin-service/`. *Ref: MODULES.md Section 3.7.*
- [ ] **T100** — Domain onboarding: DNS instructions generation. *Ref: FR-DOM-01.*
- [ ] **T101** — DNS verification polling (MX/SPF/DKIM/DMARC independently) + `DomainVerified` event; server-side enforcement that all four must pass before send/receive is usable. *Ref: FR-DOM-02; LLD.md Section 5.3; Security.md Section 5.3.*
- [ ] **T102** — Mailbox/alias provisioning under a verified domain, quota management. *Ref: FR-DOM-03.*
- [ ] **T103** — Disposable/temporary alias support with expiry. *Ref: FR-DOM-04.*
- [ ] **T104** — Org provisioning + policy (password/MFA/retention settings). *Ref: FR-ADMIN-01/02.*
- [ ] **T105** — Audit log query endpoint (org/domain-scoped per role, per `Security.md` Section 8.1 table). *Ref: FR-ADMIN-03.*
- [ ] **T106** — Cross-tenant isolation test: manually crafted request across tenant boundary must fail. *Ref: FR-ADMIN-05; Security.md Section 8.3.*
- [ ] **T107** — Scaffold `apps/admin/`: Domain Setup Wizard, Mailbox/Alias Management, Org Policy Settings, Audit Log screens. *Ref: DESIGN.md Section 4; APP_FLOW.md Section 7.*
- [ ] **T108** — Mandatory MFA enforcement for `Domain Admin`/`Organization Admin`/`Platform Admin` roles. *Ref: Security.md Section 7.*

### 4.K — AI Gateway (Optional Layer, P2)

- [ ] **T109** — Scaffold `services/ai-gateway/`; wire `isEnabled()` feature-flag check ahead of every other call. *Ref: FR-AI-01/03.*
- [ ] **T110** — Thread summarization, reply suggestions, priority classification — advisory-only responses. *Ref: FR-AI-02.*
- [ ] **T111** — Confirm (via T054's negative test) this service cannot write to any decision-relevant column. *Ref: FR-AI-04; DECISIONS.md D-007.*

### 4.L — Web Client (`apps/web`)

- [ ] **T112** — Scaffold `apps/web/` (Next.js 16 App Router): routes, `features/`, generated `api-client` from `packages/contracts/api`, `realtime/` WebSocket wrapper. *Ref: TechStack.md Section 1; ARCHITECTURE.md Section 3.4.*
- [ ] **T113** — Auth screens: Register, Login, MFA Challenge, Recovery Request/Confirm. *Ref: APP_FLOW.md Section 2.*
- [ ] **T114** — Inbox + FolderTree + MailList (multi-select, bulk actions). *Ref: APP_FLOW.md Section 3.*
- [ ] **T115** — ThreadView with RiskBanner (spam-score/auth-failure explanation, plain-language reason codes). *Ref: APP_FLOW.md Section 3; Security.md Section 18.2 (reasonCode mapping).*
- [ ] **T116** — ComposeSheet: autosave, attachment upload, quoting conventions, optimistic send UI. *Ref: APP_FLOW.md Section 4; DESIGN.md Section 6.3.*
- [ ] **T117** — Search UI: SearchBar typeahead, Search Results, filter chips. *Ref: APP_FLOW.md Section 5.*
- [ ] **T118** — Filters/Rules Builder UI. *Ref: APP_FLOW.md Section 6.*
- [ ] **T119** — Privacy Mode settings screen with fixed `PrivacyModeBadge` copy (Standard/Enhanced/E2EE-disabled). *Ref: APP_FLOW.md Section 8; DESIGN.md Section 6.5.*
- [ ] **T120** — Error/degraded-state handling: connectivity banner, AI/search degradation messaging, session-expiry draft preservation. *Ref: APP_FLOW.md Section 9.*
- [ ] **T121** — Sandboxed HTML message-body renderer with strict, isolated CSP. *Ref: Security.md Section 11.*
- [ ] **T122** — Accessibility pass (WCAG 2.1 AA, keyboard nav, screen reader) on all core flows. *Ref: DESIGN.md Section 6.1; Rule 79.*
- [ ] **T123** — Performance budget verification against `DESIGN.md` Section 7 targets.

### 4.M — Mobile Client (`apps/mobile`)

- [ ] **T124** — Scaffold Flutter app: Riverpod state, GoRouter navigation, ported design tokens. *Ref: TechStack.md Section 12; DESIGN.md Section 8.*
- [ ] **T125** — Auth, Inbox, ThreadView, ComposeSheet (full-screen route), Search — parity with `apps/web` flows. *Ref: APP_FLOW.md Sections 2–5.*
- [ ] **T126** — Secure Storage for tokens; no secrets embedded in the app package; secure logging. *Ref: Security.md Section 23.*
- [ ] **T127** — FCM push notifications, deep linking (`mailto:`). *Ref: TechStack.md Section 12.*
- [ ] **T128** — Cross-platform verification (Android + iOS minimum supported versions). *Ref: Rule 81.*

### 4.N — Observability

- [ ] **T129** — Prometheus metrics: mail flow (accepted/rejected/queued/delivered/bounced), API latency, queue depth, worker failures. *Ref: FR-OBS-02; TechStack.md Section 13.*
- [ ] **T130** — Grafana dashboards, including Supabase (500MB)/Cloudinary (25GB) free-tier alert thresholds. *Ref: FR-OBS-03; ARCHITECTURE.md Appendix A.3.*
- [ ] **T131** — Structured JSON logging with request/correlation IDs; confirm no secrets/PII in any log line. *Ref: Security.md Section 18.1.*
- [ ] **T132** — Sentry integration: frontend, backend, mobile. *Ref: TechStack.md Section 13.*
- [ ] **T133** — OpenTelemetry tracing across `apps/*` → `services/*` → `packages/infra-adapters/*`. *Ref: TechStack.md Section 13.*
- [ ] **T134** — Security monitoring/alerting rules (Section 18.3 signals: repeated DMARC/DKIM failures, outbound volume spikes, webhook signature failures, mass 401/403). *Ref: Security.md Section 18.3.*
- [ ] **T135** — Backup + restore drill for Postgres, object storage, search index. *Ref: FR-OBS-05; Security.md Section 24.*

### 4.O — Deploy Targets

- [ ] **T136** — `infra/deploy/vercel/` for `apps/web` — same build artifact validated by CI. *Ref: ARCHITECTURE.md Appendix A.*
- [ ] **T137** — `infra/deploy/render/` for `services/api` + BullMQ workers + cron jobs — same Docker image as `compose/`. *Ref: ARCHITECTURE.md Appendix A; TechStack.md Section 11.*
- [ ] **T138** — Verify `infra/deploy/compose/` self-hosted path runs the full stack end-to-end as the Category A fallback. *Ref: DECISIONS.md D-004.*

---

## Phase 5 — Testing / QA *(sequenced, not yet authorized)*

- [ ] **T139** — End-to-end: external SMTP send → inbound pipeline → inbox visibility → search indexed, within `NFR-PERF-01/02` budgets.
- [ ] **T140** — End-to-end: compose → outbound pipeline → external delivery → delivery-state tracking → bounce handling.
- [ ] **T141** — Negative tests per `Security.md` Section 25: DMARC-reject, malware-attachment, malformed-MIME-logged-not-dropped, object-level-authorization-bypass-attempt.
- [ ] **T142** — Contract tests confirming `postgres-adapter`↔`supabase-adapter` and `minio-adapter`↔`cloudinary-adapter` are interchangeable.
- [ ] **T143** — Full security review pass against `Security.md` Section 27's minimum baseline checklist before any production deploy.
- [ ] **T144** — Accessibility pass (WCAG 2.1 AA) on `apps/web` and `apps/mobile` core flows.
- [ ] **T145** — Load/capacity test on inbound pipeline (SMTP flood scenario) and outbound rate limiting under concurrent load.
- [ ] **T146** — DKIM rotation drill: rotate a domain's key in a test environment, confirm dual-sign transition and old-selector retirement work without downtime.

---

## Phase 6 — Deployment *(sequenced, not yet authorized)*

- [ ] **T147** — Dry-run Supabase→Postgres and Cloudinary→MinIO migration procedure end-to-end.
- [ ] **T148** — Production deploy via CI-approved immutable build artifact, explicit human approval (Rule 106).
- [ ] **T149** — Post-deploy verification against `Security.md` Section 27 checklist in the live environment.

---

## Phase 7 — Post-Launch / Retro *(sequenced, not yet authorized)*

- [ ] **T150** — Phase retrospective (Rule 30).
- [ ] **T151** — Re-evaluate ADR 0001 (MVP managed services) at the v1 GA planning gate.
- [ ] **T152** — First incident-response drill using the scenarios in `Security.md` Section 21.

---

## Task Log

| Task | Completed | Note |
|---|---|---|
| — | — | — |

---

## Document Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | Draft | Initial TASKS.md — 92 tasks, produced before LLD/DESIGN/APP_FLOW/MODULES/TechStack/Security existed |
| 2.0 | Draft | Full rewrite — 152 tasks, every task now cross-referenced to LLD.md schemas/interfaces/algorithms, DESIGN.md screens, APP_FLOW.md flows, MODULES.md deliverables, TechStack.md concrete technologies, and Security.md controls; added dedicated DKIM custody, mail-pipeline security fixture, RLS, and negative-authorization tasks not present in v1.0 |
