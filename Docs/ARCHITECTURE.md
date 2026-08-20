# Eazzio Mail — ARCHITECTURE.md

**Document Type:** Architecture & Codebase Structure Specification
**Parent Documents:** Eazzio Mail — Final Master Project Overview (Task 1) · Eazzio Mail — PRD.md v1.1
**Status:** Draft v1.0 — for team and AI-agent ("Antigravity") reference
**Owner:** Eazzio Mail Project Team

---

## 0. How to Use This Document

This document is the **structural contract** for the Eazzio Mail codebase. Where `PRD.md` defines *what* must be built (`FR-*`/`NFR-*` IDs), this document defines *where code for it lives*, *how data moves through the system*, and *which layer is allowed to talk to which*.

> **Rule for every contributor, human or AI agent:** before writing a file, find its module and layer in [Section 3](#3-repository-folder-structure) and [Section 5](#5-layer-boundaries--dependency-rules). If a file's correct location isn't obvious from this document, that is a signal to ask, not to guess. Do not create a new top-level folder, a new service, or a new architectural layer without updating this document first — code structure and this document must never drift apart.

This document inherits and does not repeat the [PRD's Scope Boundary Rule](#link-prd-52) (PRD.md Section 5.2): a folder must not be created for a feature that has no `FR-*` ID.

---

## 1. Architectural Style

Per PRD [NFR-MAINT-01] and the Master Overview's evolution phases, Eazzio Mail is built as a **modular monolith** for Phase 1, structured so that modules can be extracted into independently deployable workers/services in later phases **without a rewrite**.

Two structural rules make that possible, and both are mandatory from day one even though we start monolithic:

1. **Every module owns its own folder and never reaches into another module's internals.** Modules only talk to each other through explicit interfaces (Section 5).
2. **Every module's public interface is defined before its implementation.** An AI agent implementing a module writes the interface/contract file first, then the implementation behind it.

This is what allows Phase 2+ (extracting Mail Workers, Search/Notification/Scan Workers, etc. — PRD Section 13) to happen by moving a module's folder into its own deployable unit, not by re-architecting.

---

## 2. Top-Level System Map

```text
apps/
  web/              → First-party web client (consumes API + realtime only)
  admin/            → Admin/org portal (consumes API only)
  mobile/            → Flutter mobile client (consumes API + realtime only)

services/
  api/              → Eazzio REST API + WebSocket realtime gateway (Category C)
  mail-inbound/      → SMTP inbound receiver + security pipeline orchestration
  mail-outbound/     → Outbound composition, queueing, delivery worker
  identity/          → AuthN/AuthZ, sessions, MFA, recovery
  search-indexer/    → Consumes storage events, writes to OpenSearch
  notification/      → Realtime push + webhook dispatch
  admin-service/     → Org/domain/tenant administration logic
  ai-gateway/        → Optional AI interface + adapters (Category D, always optional)

packages/
  domain/            → Shared domain models, no I/O (Category C core)
  contracts/         → Shared API/event schemas (OpenAPI, event types) — the only thing services import from each other
  infra-adapters/     → Concrete adapters behind interfaces (storage, AI, email-transport, cache)
  security-pipeline/  → SPF/DKIM/DMARC/spam/AV pipeline steps, importable by mail-inbound
  ui-kit/             → Shared design system components (web + admin)

infra/
  docker/            → Container build files (Category A components: Postfix, Dovecot, Rspamd, ClamAV, OpenSearch, Valkey, Postgres, MinIO, Nginx)
  deploy/             → Deployment manifests (self-hostable targets only, per PRD Guiding Principle 1)
  observability/      → Prometheus/Grafana config

docs/
  PRD.md
  ARCHITECTURE.md
  adr/                → Architecture Decision Records (one file per significant decision)
```

**Directive to AI agents:** this is the *complete* set of top-level directories for Phase 1. Do not add a new top-level directory (e.g., `experiments/`, `misc/`, `scripts-v2/`) without an ADR (Section 10) justifying it.

---

## 3. Repository Folder Structure

### 3.1 `services/` — Backend Modules (Category C: Eazzio-Owned Code)

Each service follows the same internal shape, so any contributor or agent can navigate an unfamiliar service immediately:

```text
services/<service-name>/
  src/
    api/            → HTTP/WS route handlers — thin, no business logic (Interface layer)
    application/    → Use-case/orchestration logic — the "what happens when X occurs" (Application layer)
    domain/         → Service-local domain rules, if not shared via packages/domain (Domain layer)
    infra/          → This service's own adapters to packages/infra-adapters interfaces (Infra layer)
    events/         → Event producers/consumers, typed against packages/contracts
    config/         → Environment/config loading only — no secrets committed
  tests/
    unit/
    integration/
  Dockerfile
  README.md          → What this service does, its FR-* IDs, and what it must never depend on
```

**Rule:** a file under `api/` may call into `application/` but never directly into another service's `infra/` or `domain/`. Cross-service communication happens only via `packages/contracts` (REST/event schemas) — never via direct imports across `services/*` boundaries. This is what keeps Phase 1→Phase 2 extraction painless.

### 3.2 Per-Service Folder Mapping to PRD Requirements

| Service | Owns (PRD FR-* ranges) | Must NOT contain |
|---|---|---|
| `identity/` | FR-AUTH-01…08 | Mailbox/message logic, admin/org policy logic |
| `mail-inbound/` | FR-IN-01…08, FR-SPAM-01…09 | Outbound delivery logic, search indexing logic (consumes it via event, doesn't write to OpenSearch directly) |
| `mail-outbound/` | FR-OUT-01…07 | Inbound scanning/spam logic |
| `api/` | FR-API-01…04, FR-MBOX-*, FR-SRCH-* (query surface), FR-RULE-* | Direct SMTP handling, direct antivirus/spam scanning (delegates to mail-inbound) |
| `search-indexer/` | FR-SRCH-01, FR-SRCH-05 | Query-serving logic (that's `api/`'s job — indexer only writes) |
| `notification/` | FR-RT-01…04 | Business/mailbox logic |
| `admin-service/` | FR-ADMIN-01…05, FR-DOM-01…05 | End-user mailbox logic |
| `ai-gateway/` | FR-AI-01…04 | Any deterministic security decision (PRD Guiding Principle 4 — enforced structurally: this service has no write access to accept/reject/quarantine state) |

### 3.3 `packages/` — Shared Code (imported, never duplicated)

```text
packages/domain/
  models/           → Message, Mailbox, Folder, Label, Thread, User, Organization, Domain, Policy
  value-objects/    → EmailAddress, MessageId, Quota, etc.
  (no I/O, no framework imports — pure logic, unit-testable in isolation)

packages/contracts/
  api/              → OpenAPI spec fragments per FR-API-01/02
  events/           → Event schemas (e.g., MailAccepted, MailIndexed, MailBounced)
  (this is the ONLY package other services are allowed to depend on for cross-service typing)

packages/infra-adapters/
  storage/
    interface.ts (or .py)   → Eazzio Storage Interface (PRD Section 8.4 / 14.4)
    minio-adapter/            → Category A target (self-hosted, open-source, License-Gate-passing)
    local-fs-adapter/
    cloudinary-adapter/       → Category D, MVP-only (see Section 11 — Technology Deviation)
  database/
    interface.ts             → Eazzio Database/Metadata Interface (new — required by this deviation, see Section 11)
    postgres-adapter/         → Category A target (self-hosted PostgreSQL)
    supabase-adapter/         → Category D, MVP-only (Postgres-compatible, so this adapter is a thin wrapper, not a schema fork)
  ai/
    interface.ts            → Eazzio AI Interface (PRD Section 14.4)
    local-model-adapter/
    external-api-adapter/    → optional, never imported by default config
  email-transport/
    interface.ts             → wraps Postfix/Dovecot integration points
  cache/
    interface.ts             → wraps Valkey

packages/security-pipeline/
  spf/ dkim/ dmarc/ arc/     → deterministic checks (PRD Section 6.3, 6.7)
  spam-rules/ spam-statistical/  → PRD FR-SPAM-01/02
  malware-scan/               → PRD FR-SPAM-07/08 (ClamAV adapter lives in infra-adapters; scoring/decision logic lives here)
  (imported by mail-inbound only; never imported by api/ or mail-outbound directly)

packages/ui-kit/
  components/                → shared React components between apps/web and apps/admin
```

**Rule for `infra-adapters/`:** every subfolder must contain an `interface.ts`/`interface.py` (the abstraction) before any adapter folder exists. This directly implements PRD Section 14.4 ("implement the interface/abstraction first, the concrete adapter second"). An AI agent must never import a concrete adapter (e.g., `minio-adapter`) from application code — only the `interface`, wired up via dependency injection/config at the composition root.

### 3.4 `apps/` — Client Applications

```text
apps/web/
  src/
    routes/ or pages/     → Screens
    features/<feature>/    → Feature-scoped UI + local state, one folder per FR-* area (mailbox, search, compose, settings, admin-if-shared)
    api-client/            → Generated/typed client from packages/contracts/api — the ONLY way apps/* talk to services/api
    realtime/              → WebSocket client wrapper
  (apps/* NEVER import from services/*/src/infra or services/*/src/domain directly — API contracts only)

apps/mobile/     → Same shape, Flutter equivalent (feature folders, api-client, realtime)
apps/admin/       → Same shape, scoped to FR-ADMIN-* and FR-DOM-* features only
```

### 3.5 `infra/` — Deployment & Category A Components

```text
infra/docker/
  postfix/ dovecot/ rspamd/ clamav/ opensearch/ valkey/ postgres/ minio/ nginx/
  (each subfolder: Dockerfile + config templates only — no application business logic ever lives here)

infra/deploy/
  compose/            → docker-compose for self-hosted single-node deployment (Category A target — see Section 11)
  vercel/              → apps/web deployment config, MVP-only (Category D — see Section 11)
  render/              → services/api and worker deployment config, MVP-only (Category D — see Section 11)
  k8s/                 → deferred until Phase 4 (PRD Section 13) — do not build prematurely

infra/observability/
  prometheus/ grafana/
```

---

## 4. Data Flow (Authoritative — must match PRD Sections 8.2/8.3)

### 4.1 Inbound Mail Data Flow, Mapped to Folders

```text
Internet/DNS
   │
   ▼
infra/docker/postfix (SMTP receive) ──▶ services/mail-inbound/src/api (envelope handoff)
   │
   ▼
services/mail-inbound/src/application (pipeline orchestration)
   │  uses →  packages/security-pipeline (SPF/DKIM/DMARC/ARC → spam rules/statistical → malware scan)
   │  uses →  packages/infra-adapters/email-transport, /storage
   ▼
Policy Decision (application layer, deterministic — see PRD Guiding Principle 4)
   │
   ├─ Reject/Quarantine → services/mail-inbound/src/events (MailRejected/MailQuarantined event) → notification
   │
   └─ Accept
        │
        ▼
      packages/infra-adapters/storage (object store: raw MIME/attachments)
        +
      services/api (metadata write via packages/domain models → Postgres)
        │
        ▼
      services/mail-inbound/src/events emits MailAccepted event (packages/contracts/events)
        │
        ├─▶ services/search-indexer (consumes event → OpenSearch)
        └─▶ services/notification (consumes event → WebSocket/push to apps/*)
```

### 4.2 Outbound Mail Data Flow, Mapped to Folders

```text
apps/web (or apps/mobile) compose UI
   │  via api-client (packages/contracts/api)
   ▼
services/api/src/api → services/api/src/application (validation, sanitization)
   │  emits ComposeRequested event
   ▼
services/mail-outbound/src/application
   │  uses → packages/security-pipeline (DKIM signing)
   │  uses → packages/infra-adapters/cache (rate limiting via Valkey)
   ▼
Delivery Queue (services/mail-outbound/src/infra — durable queue, Postgres/Valkey-backed)
   │
   ▼
infra/docker/postfix (recipient MX resolution, STARTTLS, delivery attempt)
   │
   ├─ Success → events/MailDelivered → notification
   ├─ Temporary fail → backoff → requeue (same folder, no new module)
   └─ Permanent fail → events/MailBounced → notification + api (bounce visible to sender)
```

### 4.3 Search Query Data Flow

```text
apps/web search UI → api-client → services/api/src/api (query endpoint)
   → services/api/src/application → packages/infra-adapters (OpenSearch client interface)
   → results mapped to packages/domain models → returned via packages/contracts/api schema
```

**Rule:** `services/api` is the only service allowed to *query* OpenSearch for user-facing results. `services/search-indexer` is the only service allowed to *write* to it. Neither may do the other's job — this prevents index-consistency bugs and keeps the extraction boundary from Section 13 clean.

### 4.4 AI-Assisted Feature Data Flow (Optional Layer)

```text
apps/web feature UI (e.g., "Summarize thread")
   → api-client → services/api (feature flag check: is AI enabled for this user/org? PRD FR-AI-03)
   → if enabled: services/ai-gateway/src/application
        → packages/infra-adapters/ai (interface) → configured adapter (local-model-adapter by default)
   → advisory result only, returned to apps/web
   (services/ai-gateway has NO write path to security/policy decision tables — enforced by DB permissions,
    not just code convention, per PRD Guiding Principle 4 / FR-AI-04)
```

---

## 5. Layer Boundaries & Dependency Rules

Within every `services/<name>/src/` folder, four layers exist. **Dependency direction is one-way, top to bottom. A lower layer never imports from a higher layer.**

```text
1. api/            (Interface layer — HTTP/WS handlers, request/response mapping only)
        ↓ calls
2. application/    (Use-case layer — orchestrates domain + infra to fulfill one FR-* requirement)
        ↓ calls
3. domain/         (Domain layer — pure business rules, no I/O, no framework types)
        ↑ implements/uses interfaces from ↓
4. infra/          (Infra layer — concrete I/O: DB, queue, external adapters, ALWAYS behind a packages/infra-adapters interface)
```

### 5.1 Explicit Rules

| Rule | Rationale |
|---|---|
| `api/` contains no business logic — only request validation shape, calling `application/`, and response formatting. | Keeps HTTP/WS concerns swappable and testable independent of business rules. |
| `application/` never imports a database client, HTTP client, or SDK directly — only interfaces from `packages/infra-adapters`. | This is what makes PRD Guiding Principle 5 (vendor independence via abstraction) enforceable, not aspirational. |
| `domain/` has zero imports from `infra/`, any framework, or any SDK. It is plain logic, unit-testable with no mocks required. | Domain rules must survive any infrastructure swap untouched. |
| `infra/` may only be imported by `application/` in the same service, never by `api/` or by another service. | Prevents infra leaking into interfaces and prevents cross-service infra coupling. |
| Cross-service calls happen only via `packages/contracts` (typed REST/event schemas), never via direct code import of another service's internals. | Required for the Phase 1 → Phase 2+ extraction path (PRD Section 13) to work without rewrites. |
| `packages/security-pipeline` and any deterministic security/policy decision code must never be imported by `services/ai-gateway`, and `ai-gateway` output must never be write-capable into policy/decision state. | Structural enforcement of PRD Guiding Principle 4 / FR-AI-04. |
| `apps/*` never import anything from `services/*/src/*` directly — only the generated client from `packages/contracts/api`. | Keeps clients decoupled from backend implementation details; enables independent client/service versioning. |

### 5.2 Where a New File Goes — Decision Procedure

For any new file, in order:

1. **Is it a shared, pure domain concept (no I/O)?** → `packages/domain/`.
2. **Is it a cross-service contract (API shape or event shape)?** → `packages/contracts/`.
3. **Is it a concrete integration with an external system (DB, queue, storage, AI, mail transport)?** → an adapter under `packages/infra-adapters/<category>/`, behind an existing or newly-defined `interface`.
4. **Is it deterministic security/spam/malware pipeline logic?** → `packages/security-pipeline/`.
5. **Is it request/response handling for one service?** → that service's `src/api/`.
6. **Is it orchestration/use-case logic for one service (the "what happens when")?** → that service's `src/application/`.
7. **Is it service-local business logic not shared elsewhere?** → that service's `src/domain/`.
8. **Is it a UI screen/component?** → the relevant `apps/*/src/features/<feature>/`, or `packages/ui-kit/` if shared across `apps/web` and `apps/admin`.
9. **Is it deployment/container config for a Category A open-source component (Postgres, OpenSearch, etc.)?** → `infra/docker/<component>/`.
10. **None of the above fits.** → Do not create the file. Raise an ADR (Section 10) or ask a human before inventing a new location.

---

## 6. Naming & Module Conventions

- Folder and file names are lowercase-kebab-case; one primary export/class per file where practical.
- Every module (`services/*`, `packages/*`) has a `README.md` stating: what it does, which `FR-*` IDs it implements, its allowed dependencies (per Section 5), and its explicitly forbidden dependencies.
- Interfaces are named `*Interface` or `interface.ts`/`interface.py`; adapters are named `<vendor-or-mechanism>-adapter` (e.g., `minio-adapter`, `local-model-adapter`) so default-vs-optional adapters are visually obvious in a directory listing.
- Event names are past-tense facts (`MailAccepted`, `MailBounced`, `DomainVerified`), matching PRD's event-driven notification flow (Master Overview Section 32/33).

---

## 7. What This Structure Prevents (Traceability to PRD)

| Structural rule here | PRD requirement it enforces |
|---|---|
| `ai-gateway` has no write path to decision state | FR-AI-04, Guiding Principle 4 |
| `infra-adapters/*` always interface-first | Guiding Principle 5, Section 14.4 |
| `search-indexer` writes / `api` reads, never crossed | FR-SRCH-01/05, keeps index-consistency correct |
| `apps/*` only ever call `packages/contracts` | Guiding Principle 6 (API-first) |
| No `k8s/` folder until Phase 4 | Section 13 evolution discipline, NFR-MAINT-01 |
| No new top-level folder without ADR | PRD Section 5.2 default-deny scope rule, extended to structure |
| One `README.md` per module naming its `FR-*` IDs | Keeps every file traceable to an approved requirement, not an invented one |

---

## 8. Explicitly Out of Scope for This Document (see PRD Section 5.2 for the full rule)

This document does not define folder structure for anything in PRD Section 5.2.1/5.2.2 (Calendar, Contacts, Tasks, Notes, Collaboration, DANE, sandboxing, full E2EE, etc.). No `services/calendar/`, `services/contacts/`, or similar folder may be created until the PRD is amended with corresponding `FR-*` IDs and this document is updated to place them.

---

## 9. MVP Technology Deviation: Supabase, Cloudinary, Vercel, Render

### 9.1 This Is a Real Conflict — Not a Style Choice

PRD Guiding Principle 1 (Section 4) states the core platform must never become **architecturally dependent** on proprietary SaaS. Supabase (database), Cloudinary (storage), Vercel (frontend hosting), and Render (backend hosting) are all proprietary, commercially-operated SaaS products with free tiers — not open-source, self-hostable components. Per PRD Section 9.2 (License Gate) and Section 14.3 (Dependency Firewall), a "free tier" does not pass the License Gate as a permanent foundation. **This is flagged honestly, not silently absorbed.**

The distinction that makes this workable rather than a straight violation: PRD Guiding Principle 5 exists precisely so that a vendor can be used **without the core becoming dependent on it** — provided it sits behind an interface with a swap-in open-source equivalent. That is what makes the deviation below acceptable as an MVP decision rather than a redefinition of the project.

### 9.2 Decision

For the MVP build phase only:

| Concern | MVP adapter (Category D) | Category A target (unchanged, PRD-compliant) | Interface |
|---|---|---|---|
| Structured/relational data | `supabase-adapter` (Postgres-compatible — Supabase *is* Postgres underneath, which is what makes this migration low-risk) | `postgres-adapter` (self-hosted PostgreSQL) | `packages/infra-adapters/database/interface.ts` |
| Object/file storage | `cloudinary-adapter` | `minio-adapter` | `packages/infra-adapters/storage/interface.ts` |
| Frontend hosting | `infra/deploy/vercel/` | `infra/deploy/compose/` (Nginx-served static build) | N/A — deploy config, not code-level, so no interface needed; `apps/web` build output is host-agnostic by construction |
| Backend/API hosting | `infra/deploy/render/` | `infra/deploy/compose/` (self-hosted `services/api` container) | N/A — `services/api` itself has no Render-specific code; Render only runs the same Docker image defined in `services/api/Dockerfile` |

**Binding condition:** no application code in `services/*/src/application` or `services/*/src/domain` may import `supabase-adapter` or `cloudinary-adapter` directly, and no code may call a Supabase-specific or Cloudinary-specific SDK method that has no equivalent exposed through the interface. If Supabase-only functionality (e.g., its built-in auth, realtime, or edge functions) is used, it must be treated as a *separate, explicitly named* integration point, not folded silently into the generic `database` interface — this prevents the interface from being quietly redesigned around one vendor's API shape.

### 9.3 What This Changes Structurally (from Section 3.3)

- New `packages/infra-adapters/database/` package, with `interface.ts` defined first (per Section 5.1's abstraction rule) — see the updated Section 3.3 tree above.
- `packages/infra-adapters/storage/` gains `cloudinary-adapter/` alongside the existing `minio-adapter/`.
- `infra/deploy/` gains `vercel/` and `render/` alongside `compose/`.
- `services/identity/` must still own session/MFA/authorization logic per FR-AUTH-01…08 even if Supabase Auth is available — Supabase's built-in auth is **not** used as a substitute for `services/identity`, because that would create exactly the kind of hard vendor dependency Principle 1 forbids in the one area (identity/authZ) most costly to migrate later. Supabase is scoped to *data storage* only.

### 9.4 Required Migration Path (must exist before GA, not after)

Per PRD Section 9.2 checklist item 8 ("Can the component be replaced without redesigning the entire system?") and Section 14.3, this deviation is only acceptable if a tested migration path exists:

1. `postgres-adapter` and `minio-adapter` must be implemented and covered by the same contract tests as `supabase-adapter`/`cloudinary-adapter` from the start (not deferred) — both adapters satisfy the same interface test suite in `packages/infra-adapters/*/tests/contract/`.
2. A documented data-export/import procedure (Supabase → self-hosted Postgres; Cloudinary → MinIO) is written and dry-run tested before the deviation is treated as GA-acceptable, not just MVP-acceptable.
3. Free-tier limits (Supabase 500MB, Cloudinary 25GB) must be monitored from day one (`infra/observability/`) with an explicit alert threshold, since exceeding a free tier silently converts this from "optional adapter" to "load-bearing paid vendor dependency" — which is the exact failure mode Principle 1 exists to prevent.
4. This deviation is time-boxed: it is valid for the MVP phase (PRD Section 13.1) and must be re-evaluated at the v1 GA gate, not carried forward by default.

### 9.5 Required ADR

This deviation itself is documented in full as **Appendix A / ADR 0001** (Section 11) — status `Accepted`, scoped explicitly to MVP, with the migration path in 9.4 as its "Consequences." No further Category D vendor should be added to core data/storage paths without a similar ADR appended in the same way.

---

## 10. Architecture Decision Records (ADRs)

Any deviation from this document — a new top-level folder, a new service, a new cross-boundary exception — requires an ADR before implementation:

```text
docs/adr/NNNN-short-title.md
  - Status: Proposed | Accepted | Superseded
  - Context: what problem this solves
  - Decision: what changes structurally
  - Consequences: what this document (ARCHITECTURE.md) must be updated to reflect
```

**Directive to AI agents:** if a task appears to require breaking a rule in Section 5.1 or adding a folder not in Section 2/3, stop and produce an ADR draft instead of silently deviating. Do not implement the deviation until the ADR is accepted and this document is updated.

**Note on ADR 0001:** the standard location above (`docs/adr/`) is the default for all future ADRs. ADR 0001 (Supabase/Cloudinary/Vercel/Render) is embedded directly in this document as Appendix A (Section 11) instead, because it modifies this document's own folder structure and rules directly and is foundational enough to read alongside the sections it changes. Future ADRs should default to `docs/adr/` unless there is a similar reason to embed them here.

---

## 11. Appendix A — ADR 0001: Use Supabase, Cloudinary, Vercel, and Render for MVP

*This ADR is embedded here in full (rather than left as a separate `docs/adr/0001-mvp-managed-services.md` reference) so ARCHITECTURE.md remains a single, self-contained source of truth for both the rule and the decision that invoked it. If this ADR is later superseded, update its Status below rather than deleting it — history stays visible.*

- **Status:** Accepted
- **Scope:** MVP phase only (PRD Section 13.1). Must be re-evaluated at the v1 GA gate — not carried forward by default.

### A.1 Context

PRD Guiding Principle 1 requires the core platform to remain free of architectural dependency on proprietary SaaS. For MVP delivery speed and zero infrastructure cost, the team has chosen:

- **Supabase** (free tier, 500MB) for structured/relational data — Postgres-compatible.
- **Cloudinary** (free tier, 25GB) for object/file storage.
- **Vercel** (free tier) for frontend hosting (`apps/web`).
- **Render** (free tier) for backend hosting (`services/api` and workers).

None of these are open-source or self-hostable in the way PRD Section 9.2's License Gate requires for a permanent Category A dependency.

### A.2 Decision

These are adopted as **Category D (optional, swappable) adapters**, per Section 9 above, behind the same interfaces as their Category A counterparts:

- `supabase-adapter` behind `packages/infra-adapters/database/interface.ts`, with `postgres-adapter` as the self-hosted equivalent.
- `cloudinary-adapter` behind `packages/infra-adapters/storage/interface.ts`, with `minio-adapter` as the self-hosted equivalent.
- Vercel/Render are deployment targets only (`infra/deploy/vercel/`, `infra/deploy/render/`) running the same container/build artifacts as `infra/deploy/compose/` — no vendor-specific application code.

`services/identity` (auth/session/MFA/authorization, FR-AUTH-01…08) is explicitly **not** delegated to Supabase Auth, to avoid a hard dependency in the area most costly to migrate later.

### A.3 Consequences

1. `postgres-adapter` and `minio-adapter` are implemented and contract-tested from day one, in parallel with the Supabase/Cloudinary adapters — not deferred to a future migration sprint.
2. A documented, dry-run-tested export/import procedure exists for Supabase → self-hosted Postgres and Cloudinary → MinIO before this deviation is considered acceptable for GA.
3. Free-tier usage (Supabase 500MB, Cloudinary 25GB) is monitored via `infra/observability/` with an explicit alert threshold; exceeding it converts this from an optional adapter choice into a load-bearing paid dependency, which requires this ADR to be revisited immediately, not silently absorbed.
4. No additional Category D vendor may be introduced into a core data/storage path without a similar ADR.
5. This ADR must be revisited — accepted, superseded, or reversed — at the v1 GA planning gate (PRD Section 13.1).

### A.4 Related

- PRD.md Section 4 (Guiding Principles), Section 9 (Technology Selection Framework), Section 14.3 (Dependency Firewall)
- ARCHITECTURE.md Section 9 (MVP Technology Deviation)

---

## 12. Document Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | Draft | Initial ARCHITECTURE.md — folder structure, data flow, and layer boundaries derived from PRD.md v1.1 |
| 1.1 | Draft | Added Section 9 (MVP Technology Deviation) reconciling Supabase/Cloudinary/Vercel/Render with PRD's open-source-first constraint via the existing adapter-interface pattern; added `database` adapter package, `cloudinary-adapter`, `vercel/` and `render/` deploy targets |
| 1.2 | Draft | Merged ADR 0001 into this document as Appendix A (Section 11), so ARCHITECTURE.md is a single self-contained file rather than referencing an external ADR file |

---

*This document and `PRD.md` together are the authoritative reference for engineering and AI-agent (Antigravity) implementation. `PRD.md` defines what to build; this document defines where it lives and how it may talk to other parts of the system. Neither should be contradicted by ad hoc structure decisions made mid-task.*
