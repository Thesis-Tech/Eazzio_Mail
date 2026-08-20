# Eazzio Mail — MODULES.md

**Document Type:** Module-Level Work Breakdown (the layer between ARCHITECTURE.md and a detailed TASKS.md)
**Parent Documents:** `PRD.md` v1.1 · `ARCHITECTURE.md` v1.2 · `AGENTS.md` v1.0 · `DECISIONS.md` v1.0 · `LLD.md` v1.0 · `DESIGN.md` v1.0 · `APP_FLOW.md` v1.0
**Status:** Draft v1.0 — Phase 3 (Design) deliverable. Implementation (Phase 4) remains on hold per `HLD.md` Section 0.

---

## 0. Why This Document Exists

`ARCHITECTURE.md` says which folders exist and how layers depend on each other. `LLD.md` says what the schemas/interfaces/algorithms inside those folders look like. Neither says, module by module: *what exactly is this module's job, what's the smallest set of deliverables that counts as "this module exists," what can it depend on, and what does it hand off to the next module.*

That's what this document does. Every module below is written to be **directly sliceable into `TASKS.md` entries** — each module's "Deliverables" list is close to a 1:1 mapping to individual checkbox tasks, and each module's "Definition of Done" is what closes out that group of tasks.

> **Rule:** a module is not ready for task breakdown until every row in Sections 2–5 below is filled in. If a module needed for a task isn't specified here, specify it here first — don't invent scope inline in `TASKS.md`.

---

## 1. Module Map (from `ARCHITECTURE.md` Section 2)

```text
packages/domain            packages/contracts          packages/infra-adapters/*
packages/security-pipeline  packages/ui-kit

services/identity           services/mail-inbound        services/mail-outbound
services/api                services/search-indexer      services/notification
services/admin-service       services/ai-gateway

apps/web                    apps/admin                    apps/mobile

infra/docker/*               infra/deploy/*
```

Build order (dependency-driven, matches `TASKS.md` Phase 4 sub-groups 4.A–4.K): **packages → identity → mailbox core (api) → mail-inbound → mail-outbound → search-indexer → notification → observability → web client → deploy targets**, with `admin-service`/`apps/admin` and `ai-gateway` following once the core mail loop (inbound + outbound + mailbox) is functional end-to-end.

---

## 2. Package Modules (`packages/*`)

### 2.1 `packages/domain`

- **Purpose:** Pure, I/O-free business models and value objects shared by every service.
- **Owns:** No `FR-*` directly — supports all mailbox/message-related FRs structurally.
- **Deliverables:**
  - Models: `Message`, `Mailbox`, `Folder`, `Label`, `Thread`, `User`, `Organization`, `Domain`, `Policy` (matches `LLD.md` Section 1 tables 1:1, minus persistence concerns).
  - Value objects: `EmailAddress` (validates RFC 5322 shape), `MessageId`, `Quota`, `SpamScore`.
  - Repository *interfaces* (not implementations) for each model, consumed by `services/*` and implemented via `packages/infra-adapters/database`.
- **Allowed dependencies:** none outside the standard library / language runtime.
- **Forbidden dependencies:** any `infra-adapters` package, any framework (HTTP, DB driver), any other `services/*`.
- **Definition of Done:** every model has unit tests requiring no mocks (pure logic); every repository interface has at least one consumer defined in a `services/*` module below.

### 2.2 `packages/contracts`

- **Purpose:** The only cross-service typing surface — API schema (OpenAPI) and event schemas.
- **Owns:** Structural support for `FR-API-01/02` and every event-driven flow in `ARCHITECTURE.md` Section 4.
- **Deliverables:**
  - `api/openapi.yaml` (or fragments) covering every endpoint in `LLD.md` Section 3.
  - `events/*.ts` (or equivalent) — exact payload shapes from `LLD.md` Section 4 (`MailAccepted`, `MailRejected`, `MailQuarantined`, `MailDelivered`, `MailBounced`, `DomainVerified`).
- **Allowed dependencies:** `packages/domain` (for shared types only).
- **Forbidden dependencies:** anything from `services/*` or `apps/*` (this package is imported, never an importer of application code).
- **Definition of Done:** contract lint/validation passes; every event/endpoint referenced by a later module here traces back to a schema defined here first (contract-first — Rule 15).

### 2.3 `packages/infra-adapters/database`

- **Purpose:** `EazzioDatabase` interface + two interchangeable adapters.
- **Owns:** Structural support for `DECISIONS.md` D-004.
- **Deliverables:** `interface.ts` (per `LLD.md` Section 2.1) → `postgres-adapter/` → `supabase-adapter/` → shared contract test suite run against both.
- **Allowed dependencies:** `packages/domain` (types only).
- **Forbidden dependencies:** must not leak Postgres- or Supabase-specific types into its public interface.
- **Definition of Done:** both adapters pass the identical contract test suite; no `services/*/src/application` or `domain/` file imports either adapter directly (only the interface, wired at composition root).

### 2.4 `packages/infra-adapters/storage`

- **Purpose:** `EazzioStorage` interface + two interchangeable adapters.
- **Deliverables:** `interface.ts` (per `LLD.md` Section 2.2) → `minio-adapter/` → `cloudinary-adapter/` → shared contract test suite.
- **Definition of Done:** same shape as 2.3, applied to storage; `getSignedUrl` behavior verified identical across both adapters (attachment download flow depends on this).

### 2.5 `packages/infra-adapters/cache`

- **Purpose:** `EazzioCache` interface + Valkey adapter (single adapter for MVP — no Category D exception exists here).
- **Deliverables:** `interface.ts` (per `LLD.md` Section 2.3), `valkey-adapter/`.
- **Definition of Done:** `incr()` behavior verified atomic under concurrent calls (rate-limiting correctness, `FR-OUT-03`, Rule 66).

### 2.6 `packages/infra-adapters/ai`

- **Purpose:** `EazzioAI` interface + local-model adapter (default) + optional external-API adapter.
- **Deliverables:** `interface.ts` (per `LLD.md` Section 2.4), `local-model-adapter/`. `external-api-adapter/` is scaffolded but not wired into any default config (`FR-AI-02`).
- **Definition of Done:** `isEnabled()` is verified to gate every other method — a test exists proving no adapter call fires when disabled (`FR-AI-03`); confirmed no method's return value is consumed by `services/mail-inbound`'s decision pipeline (`DECISIONS.md` D-007).

### 2.7 `packages/infra-adapters/email-transport`

- **Purpose:** Thin wrapper over Postfix/Dovecot integration points.
- **Deliverables:** `interface.ts` (per `LLD.md` Section 2.5) and the concrete adapter used by `services/mail-outbound`.
- **Definition of Done:** `submitOutbound`/`getDeliveryStatus` round-trip verified against a local Postfix instance in `infra/docker/postfix`.

### 2.8 `packages/security-pipeline`

- **Purpose:** Deterministic inbound security/spam logic — imported by `services/mail-inbound` only.
- **Owns:** `FR-IN-04`, `FR-SPAM-01…09`.
- **Deliverables:** `spf/`, `dkim/`, `dmarc/`, `arc/` (deterministic checks), `spam-rules/` (rule engine, `FR-SPAM-01`), `spam-statistical/` (Bayesian layer, `FR-SPAM-02`), `malware-scan/` (scoring/decision logic; ClamAV adapter itself lives in infra-adapters).
- **Forbidden dependencies:** never imported by `services/api` or `services/mail-outbound` directly; never imported by `services/ai-gateway`.
- **Definition of Done:** `decide()` pseudocode from `LLD.md` Section 6.1 is implemented and unit-tested against all branches (accept/quarantine/reject) with fixture messages.

### 2.9 `packages/ui-kit`

- **Purpose:** Shared design-system components between `apps/web` and `apps/admin`.
- **Owns:** Structural support for `DESIGN.md` Section 3.
- **Deliverables:** every component in `DESIGN.md` Section 3's table, built against the token set in `DESIGN.md` Section 2. **Must be generated via the `ui-ux-pro-max` skill per `DESIGN.md`'s standing directive.**
- **Definition of Done:** each component has a states/variants catalog (default, hover, disabled, error, empty where applicable) and passes the accessibility checks in `DESIGN.md` Section 6.1.

---

## 3. Service Modules (`services/*`)

### 3.1 `services/identity`

- **Owns:** `FR-AUTH-01…08`.
- **Deliverables (maps to `TASKS.md` T026–T034):** registration, password auth + TOTP MFA, session/device management, recovery flow, suspicious-login detection, authorization hierarchy (Platform→Org→Domain→Mailbox→User), scoped API tokens.
- **Data owned:** `users`, `mfa_totp_secrets`, `sessions`, `api_tokens`, `roles` (`LLD.md` Section 1.1).
- **Consumes:** `packages/infra-adapters/database`, `packages/infra-adapters/cache` (rate limiting on login/MFA attempts).
- **Produces:** no domain events in MVP scope (session state is queried directly, not event-driven) — audit log writes on every security-relevant action (`FR-OBS-01`).
- **Forbidden:** must never delegate its core responsibility to `supabase-adapter`'s built-in auth product (`DECISIONS.md` D-005) — it may still use `supabase-adapter` for its own row storage, just not Supabase Auth as the auth mechanism.
- **Definition of Done:** flow in `APP_FLOW.md` Section 2 fully implemented end-to-end, including the anti-enumeration behavior on password recovery.

### 3.2 `services/mail-inbound`

- **Owns:** `FR-IN-01…08`, orchestrates `FR-SPAM-01…09` via `packages/security-pipeline`.
- **Deliverables (maps to `TASKS.md` T041–T052):** SMTP receive handoff, envelope validation, auth checks, MIME parsing, attachment analysis, rule/statistical scoring, policy decision gate, accept-path storage + event emission.
- **Data owned:** writes to `messages`, `attachments` (via `packages/domain` repositories), reads `domains`/`mailboxes` for routing.
- **Consumes:** `packages/security-pipeline`, `packages/infra-adapters/{database,storage,cache}`.
- **Produces:** `MailAccepted`, `MailRejected`, `MailQuarantined` events.
- **Definition of Done:** the inbound flow in `APP_FLOW.md` (implicitly, via realtime arrival into Inbox) is verified end-to-end from a real external SMTP send through to a `MailAccepted` event landing.

### 3.3 `services/mail-outbound`

- **Owns:** `FR-OUT-01…07`.
- **Deliverables (maps to `TASKS.md` T053–T060):** compose validation/sanitization, DKIM signing, rate limiting, delivery queue + MX resolution + STARTTLS, retry/backoff (per `LLD.md` Section 5.2 formula), delivery-state tracking, dead-letter handling.
- **Data owned:** `outbound_queue`, writes `delivery_state` on `messages`.
- **Consumes:** `packages/infra-adapters/{database,cache,email-transport}`.
- **Produces:** `MailDelivered`, `MailBounced` events.
- **Definition of Done:** Compose flow (`APP_FLOW.md` Section 4) verified end-to-end including bounce-handling UI state; backoff formula unit-tested against the exact constants in `LLD.md` Section 5.2.

### 3.4 `services/api`

- **Owns:** `FR-API-01…04`, `FR-MBOX-*`, `FR-SRCH-*` (query surface only), `FR-RULE-*`.
- **Deliverables:** every endpoint in `LLD.md` Section 3 table not owned by a more specific service; WebSocket gateway for realtime (`FR-RT-01`).
- **Data owned:** none directly — reads/writes via `packages/domain` repositories against shared tables.
- **Consumes:** `packages/infra-adapters/*` (via interfaces only), `packages/domain`.
- **Forbidden:** direct SMTP handling (delegates to `mail-inbound`/`mail-outbound`); direct OpenSearch writes (`DECISIONS.md` D-010 — query only).
- **Definition of Done:** Inbox/Search/Filters flows (`APP_FLOW.md` Sections 3, 5, 6) fully served by this service's endpoints; error responses conform to `LLD.md` Section 3.1 taxonomy on every endpoint.

### 3.5 `services/search-indexer`

- **Owns:** `FR-SRCH-01`, `FR-SRCH-05`.
- **Deliverables (maps to `TASKS.md` T061–T064):** event consumer for `MailAccepted`, document projection (`LLD.md` Section 6.4), OpenSearch write.
- **Forbidden:** serving any query traffic — that's `services/api`'s job exclusively (`DECISIONS.md` D-010).
- **Definition of Done:** indexing SLA (`NFR-PERF-02`) measured and met from a `MailAccepted` event to document availability.

### 3.6 `services/notification`

- **Owns:** `FR-RT-01…04`.
- **Deliverables:** realtime push dispatch (consumes all message-lifecycle events), webhook dispatch (`FR-RT-04`, P2 — post-MVP unless promoted).
- **Definition of Done:** `APP_FLOW.md` Section 9's realtime-degradation flow (polling fallback) implemented and tested by forcing a WebSocket disconnect.

### 3.7 `services/admin-service`

- **Owns:** `FR-ADMIN-01…05`, `FR-DOM-01…05`.
- **Deliverables:** org/domain provisioning, DNS verification polling (`LLD.md` Section 5.3 state machine), audit log query endpoint, cross-tenant isolation enforcement at the query layer.
- **Definition of Done:** Domain onboarding and Org policy flows (`APP_FLOW.md` Section 7) fully implemented; a test proves cross-tenant data access is impossible even with a manually crafted request (`FR-ADMIN-05`).

### 3.8 `services/ai-gateway`

- **Owns:** `FR-AI-01…04`.
- **Deliverables:** feature-flag check, routed calls to `packages/infra-adapters/ai`, advisory-only responses to `services/api`.
- **Forbidden:** any write path to `messages.spam_score`, `delivery_state`, or any policy/decision table (`DECISIONS.md` D-007) — enforced via DB grants, not just code review.
- **Definition of Done:** a negative test confirms this service's DB role literally cannot write to the decision-relevant columns, independent of application-layer logic.

---

## 4. App Modules (`apps/*`)

### 4.1 `apps/web`

- **Deliverables:** every screen in `DESIGN.md` Section 4 and every flow in `APP_FLOW.md` Sections 2–6, 8–9 (excluding admin-only screens).
- **Consumes:** `packages/contracts/api` (generated client only — never a direct import of any `services/*` internals), `packages/ui-kit`.
- **Definition of Done:** every entry/exit transition in `APP_FLOW.md` Section 10 is a working route; performance budgets in `DESIGN.md` Section 7 measured and met.

### 4.2 `apps/admin`

- **Deliverables:** Domain Setup Wizard, Mailbox/Alias Management, Org Policy Settings, Audit Log (`APP_FLOW.md` Section 7).
- **Scope guard:** consumes only `FR-ADMIN-*`/`FR-DOM-*`-related endpoints — must not grow end-user mailbox features (`DECISIONS.md` D-013's sibling discipline: keep admin scope from creeping into end-user scope, matching `ARCHITECTURE.md` Section 3.2's "must NOT contain" column).

### 4.3 `apps/mobile`

- **Deliverables:** Flutter parity for Sections 2–6, 8–9 of `APP_FLOW.md`, per `DESIGN.md` Section 8 parity notes.
- **Definition of Done:** cross-platform verification (Rule 81) on both Android and iOS minimum supported versions before sign-off.

---

## 5. Infra Modules (`infra/*`)

| Module | Deliverable | Definition of Done |
|---|---|---|
| `infra/docker/*` | Dockerfiles + config for Postgres, MinIO, OpenSearch, Valkey, Nginx, Postfix, Dovecot, Rspamd, ClamAV | Each container boots clean via `infra/deploy/compose/` with health checks passing (Rule 88) |
| `infra/deploy/compose` | Self-hosted single-node docker-compose | Full stack (all services + infra) runs end-to-end locally from a clean checkout |
| `infra/deploy/vercel` | `apps/web` deploy config | Deploys the same build artifact validated by CI (Rule 93) |
| `infra/deploy/render` | `services/api` + workers deploy config | Deploys the same Docker image used by `compose/` (`DECISIONS.md` D-004) |
| `infra/observability` | Prometheus + Grafana config | Dashboards render the metrics defined in `LLD.md`/`PRD.md` FR-OBS-02/03, plus the Supabase/Cloudinary free-tier alert thresholds (`ARCHITECTURE.md` Appendix A.3) |

---

## 6. Cross-Module Dependency Matrix (Quick Reference)

| Consumer ↓ / Provider → | domain | contracts | infra-adapters | security-pipeline | ui-kit |
|---|---|---|---|---|---|
| `services/identity` | ✅ | ✅ | ✅ (database, cache) | ❌ | — |
| `services/mail-inbound` | ✅ | ✅ | ✅ (database, storage, cache) | ✅ | — |
| `services/mail-outbound` | ✅ | ✅ | ✅ (database, cache, email-transport) | ❌ | — |
| `services/api` | ✅ | ✅ | ✅ (all except email-transport) | ❌ | — |
| `services/search-indexer` | ✅ | ✅ | ✅ (database, cache) | ❌ | — |
| `services/ai-gateway` | ✅ | ✅ | ✅ (ai only) | ❌ | — |
| `apps/web`, `apps/admin` | ❌ | ✅ (generated client) | ❌ | ❌ | ✅ |
| `apps/mobile` | ❌ | ✅ (generated client) | ❌ | ❌ | ✅ (ported tokens) |

A ❌ in this table is not a gap to fill later — it is a boundary this document exists to make explicit and enforceable (matches `ARCHITECTURE.md` Section 5.1).

---

## 7. From Here to `TASKS.md`

Each numbered deliverable bullet in Sections 2–5 above is sized to become one or a small cluster of sequential `TASKS.md` entries, in the same order this document lists them (Section 1's build order). Where `TASKS.md` already has matching task IDs (noted inline above, e.g. "maps to T026–T034"), those tasks remain valid and do not need to be rewritten — this document is the rationale layer underneath them, not a replacement.

---

## 8. Document Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | Draft | Initial MODULES.md — full module-level breakdown (purpose, deliverables, data owned, allowed/forbidden dependencies, Definition of Done) for every packages/services/apps/infra module, cross-referenced to existing TASKS.md IDs where they already exist |
