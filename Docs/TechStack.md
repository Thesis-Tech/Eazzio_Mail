# Eazzio Mail — TechStack.md

**Document Type:** Concrete Technology Baseline (finalizes `PRD.md` Section 9.3's "Technology Selection" task)
**Parent Documents:** `PRD.md` v1.1 · `ARCHITECTURE.md` v1.2 · `AGENTS.md` v1.0 · `DECISIONS.md` v1.0 · `LLD.md` v1.0 · `DESIGN.md` v1.0 · `APP_FLOW.md` v1.0 · `MODULES.md` v1.0
**Status:** Draft v1.0 — Phase 3 (Design) deliverable. Implementation (Phase 4) remains on hold per `HLD.md` Section 0.

---

## 0. What This Document Is (and Three Corrections It Makes)

This rewrites a generic 2026 SaaS technology baseline into Eazzio Mail's actual stack. Most of the generic baseline fits cleanly — but three items conflict with decisions already locked in this project's doc stack and are corrected below rather than adopted as-is. Each is a real conflict, flagged the same way `ARCHITECTURE.md` Appendix A flagged the Supabase/Cloudinary/Vercel/Render deviation — not silently absorbed.

| Generic baseline said | Eazzio Mail uses instead | Why |
|---|---|---|
| **Redis** for cache/queue | **Valkey** (Redis-protocol-compatible, open-source fork), with Render Key Value as the MVP-only Category D adapter | Redis's licensing change is the exact trap `PRD.md` Section 9.2/14.3 names explicitly — "free tier" or "Redis-compatible" is not the same as open source. Valkey is the drop-in-compatible, License-Gate-passing choice; BullMQ and any Redis-protocol client work against it unmodified. |
| **Supabase Auth** as the authentication system | Eazzio's own `services/identity` issues and verifies JWTs; Supabase is used **only** as a Postgres-compatible row store via `supabase-adapter` | `DECISIONS.md` D-005 is explicit and binding: identity is the one subsystem too costly to migrate later, so it is never delegated to a hosted auth product, even though Supabase is used elsewhere in the MVP stack. |
| **PostgreSQL Full-Text Search initially**, dedicated search engine only "when scale justifies it" | **OpenSearch from Phase 1**, per `ARCHITECTURE.md` Section 8.4 and `PRD.md` FR-SRCH-01 (P0) | For most SaaS products, deferring a dedicated search engine is correct default-avoid-premature-infra thinking. For Eazzio Mail specifically, fast full-text mail search *is* a P0 core feature (Gmail-grade search is a named product goal, `PRD.md` G3) — this is core scope, not a premature optimization, so `services/search-indexer` and OpenSearch are Category A from day one. |

Everything else in the generic baseline is adopted with Eazzio-specific detail filled in below, and one addition the generic template didn't need to cover at all: **Section 3, the mail transport and security pipeline layer**, which has no equivalent in a typical SaaS stack.

---

## 1. Frontend (`apps/web`, `apps/admin`)

### Core Framework

- React 19 · Next.js 16.x (stay current on the 16.x line, don't pin to an outdated minor)
- TypeScript, strict mode (Rule: no unnecessary `any`, per `AGENTS.md` Section 5/C-43…58 equivalent)
- App Router, Server Components + Client Components, Server Actions where appropriate
- Route Handlers only for lightweight BFF-style needs — real business logic stays in `services/api` (`ARCHITECTURE.md` Section 5.1's "apps never talk to services internals" rule still applies: Route Handlers may proxy to `packages/contracts/api`, they do not reimplement backend logic)
- SSR/SSG/ISR used per-route as appropriate (e.g., marketing/landing pages SSG, authenticated Inbox client-rendered against realtime data)

### UI / Styling

- Tailwind CSS, CSS Modules for isolated cases
- shadcn/ui + Radix UI primitives as the base component layer inside `packages/ui-kit`
- Lucide Icons
- Design tokens, dark/light theme, mobile-first, accessibility-first — implements `DESIGN.md` Section 2 tokens directly; **components generated via the `ui-ux-pro-max` skill per `DESIGN.md`'s standing directive**

### State Management

- Server state via React Server Components / Server Actions where possible
- React Context for lightweight global state (auth session presence, theme)
- Zustand for complex client state (e.g., multi-select bulk-action state in `MailList`, `DESIGN.md` Section 3)
- TanStack Query for client-side sync against `services/api` where a Server Component boundary isn't practical (e.g., realtime-augmented Inbox list)
- URL/search-params for shareable state (search query, folder/label filters — `APP_FLOW.md` Section 5)

### Forms & Validation

- React Hook Form + Zod
- The **same Zod schemas** back both client-side validation and `packages/contracts/api` request validation — one schema, not two definitions that can drift (supports Rule 15 contract-first discipline)

### Performance, Animation, Content

- Next.js Image Optimization, dynamic imports, code splitting, route-level + HTTP + CDN caching, Core Web Vitals monitoring — targets tie to `DESIGN.md` Section 7 performance budgets
- Framer Motion / CSS transitions, `prefers-reduced-motion` respected (`DESIGN.md` Section 2.4)
- MDX/Markdown only for non-product content (docs, help pages) — not used for mail content rendering, which has its own sanitization pipeline (`FR-OUT-01`)

---

## 2. Backend (`services/api`, and shared conventions across all `services/*`)

### Runtime

- Node.js 24 LTS baseline, TypeScript, pnpm workspaces (monorepo package manager — replaces the `<pkg-manager>` placeholder in `AGENTS.md` Section 4)

**Note — this finalizes a previously open decision:** `PRD.md` Section 9.3 listed "Python/FastAPI (or equivalent open-source backend)" as a *preferred direction*, explicitly deferred to a Technology Selection task. This document **is** that task's output: Node.js/Express/TypeScript is the selected backend stack going forward. `PRD.md` Section 9.3's table should be updated to reflect this in its next revision (Rule 19 change control) — noted here so the discrepancy isn't silently left standing between the two documents.

### Framework & Structure

- Express.js, REST architecture, modular routing
- Layering maps directly onto `ARCHITECTURE.md` Section 5's four layers — the generic template's controller/service/repository split is the same shape, renamed to match this project's existing vocabulary:

```text
Generic template term   →  ARCHITECTURE.md layer
controllers/             →  src/api/            (route handlers, request/response mapping only)
services/                →  src/application/    (use-case orchestration)
repositories/             →  src/domain/ interfaces, implemented via packages/infra-adapters
middleware/               →  src/api/ (cross-cutting: auth check, rate limit, request-id)
validators/               →  src/api/ (Zod schemas shared with apps/web per Section 1)
```

- Versioned routes nest inside each service's `src/api/` folder, e.g. `services/api/src/api/v1/{auth,mailboxes,messages,search,filters,domains,admin}/` — this is a sub-structure *within* `ARCHITECTURE.md`'s existing `api/` layer, not a competing top-level layout.

### API Standards

- REST, JSON, versioned (`/v1/...` — matches `LLD.md` Section 3 endpoint table), pagination/filtering/sorting/search, rate limiting, idempotency (`outbound_queue.idempotency_key`, `LLD.md` Section 1.4), request IDs, standard error codes (`LLD.md` Section 3.1 taxonomy — binding, not a suggestion)
- OpenAPI 3.x + Swagger UI, generated from `packages/contracts/api` (Rule 97 — docs generated from contract, never hand-written and left to drift)

---

## 3. Mail Transport & Security Pipeline (no equivalent in a generic SaaS stack — Eazzio-specific, Category A)

This is the layer that makes Eazzio Mail an email platform rather than a generic web app, and it does not get replaced by any of the managed-service substitutions elsewhere in this document.

| Component | Role | Category |
|---|---|---|
| Postfix | MTA — inbound/outbound SMTP | A (self-hosted, permanent) |
| Dovecot Community Edition | IMAP/POP3/LMTP — third-party client interoperability (`DECISIONS.md` D-006) | A |
| Rspamd | Spam filtering rule/statistical engine, backs `packages/security-pipeline/spam-rules`, `spam-statistical` | A |
| ClamAV | Antivirus scanning, backs `FR-SPAM-07` | A |
| OpenSearch | Full-text mail search, `services/search-indexer` writes / `services/api` reads only (`DECISIONS.md` D-010) | A |

These run in `infra/docker/*` and are orchestrated by `services/mail-inbound`/`services/mail-outbound` (Node.js/TypeScript), which speak to Postfix/Dovecot via milter/local-delivery integration points behind `packages/infra-adapters/email-transport/interface.ts` (`LLD.md` Section 2.5) — the Node.js backend does not reimplement SMTP/IMAP protocol handling itself.

---

## 4. Authentication & Identity (`services/identity`)

- **Custom JWT issuance/verification** inside `services/identity` — short-lived access tokens, session rows in Postgres (`sessions` table, `LLD.md` Section 1.1) backing refresh/revocation, matching the `sessions` state machine in `LLD.md` Section 5.4.
- OAuth 2.0 / OpenID Connect support (Google + other providers) implemented as additional login methods **into** `services/identity`'s own session issuance — not a delegation of session authority to the OAuth provider or to Supabase Auth.
- Email/password, email verification, password reset, MFA (TOTP) — all `services/identity` logic per `LLD.md` Section 1.1 schema and `APP_FLOW.md` Section 2 flow.
- **Authorization:** RBAC via the `roles` table (`LLD.md` Section 1.1) implementing the Platform→Org→Domain→Mailbox→User hierarchy (`FR-AUTH-06`), enforced in `services/*` application layers.
- **Row Level Security (RLS):** used at the PostgreSQL layer as defense-in-depth for cross-tenant isolation (`FR-ADMIN-05`). RLS is native PostgreSQL (available since 9.5) — **not** a Supabase-only feature — so RLS policies defined for the MVP `supabase-adapter` path port unchanged to `postgres-adapter`, which is exactly what keeps this consistent with `DECISIONS.md` D-004's migration requirement.
- **Binding constraint restated:** frontend is never a trusted environment; all authorization decisions are enforced server-side and via RLS — the frontend holding a valid-looking token is never sufficient on its own.

---

## 5. Database (`packages/infra-adapters/database`)

- Schema is `LLD.md` Section 1, run identically against both adapters per `DECISIONS.md` D-004:
  - **MVP adapter:** `supabase-adapter` (Supabase-managed Postgres, free tier 500MB)
  - **Category A target, built in parallel:** `postgres-adapter` (self-hosted PostgreSQL)
- ACID transactions, foreign keys, indexes (`LLD.md` Section 1.5), constraints, views/materialized views where needed, triggers (e.g., `updated_at` maintenance), native RLS.
- **ORM:** Prisma used *inside* each adapter implementation (`postgres-adapter`/`supabase-adapter`) as a query-building convenience — it never appears as a type in `packages/infra-adapters/database/interface.ts` itself (Section 2.1 of `LLD.md`), so swapping adapters never means swapping ORMs at the application-code boundary. Raw SQL is used directly inside an adapter where Prisma would obscure a mail-specific query (e.g., the hot-path envelope lookup in `LLD.md` Section 1.5).
- Migrations: versioned, every migration ships a tested rollback (Rule 86); seed scripts for local/dev only.

---

## 6. Storage & Media (`packages/infra-adapters/storage`)

- **MVP adapter:** Cloudinary (free tier 25GB) — used for attachment blobs and any user-facing media (avatars, org branding if added later).
- **Category A target, built in parallel:** MinIO (self-hosted, S3-compatible).
- Both implement `EazzioStorage` (`LLD.md` Section 2.2) — `put`/`get`/`delete`/`getSignedUrl` — identically.
- Attachment folder/key convention: `mailboxes/{mailboxId}/messages/{messageId}/{attachmentId}-{filename}` — deterministic, so either adapter's underlying folder/bucket organization is derivable from `LLD.md`'s `attachments.object_key` column without a lookup table.
- Raw MIME storage for accepted mail (`FR-IN-08`) uses the same interface, keyed as `mailboxes/{mailboxId}/messages/{messageId}/raw.eml`.

---

## 7. Caching, Queues & Background Jobs (`packages/infra-adapters/cache`)

- **Valkey** (self-hosted, Category A) as the primary target; **Render Key Value** (Redis-protocol-compatible managed offering) as the MVP deploy-convenience option — both speak the same wire protocol, so this is a deployment choice, not an adapter-interface fork the way database/storage are (no separate `interface.ts` variants needed; same `EazzioCache` client library works against either).
- **BullMQ** for background jobs (Node.js-native, Redis-protocol-based — works unmodified against Valkey/Render Key Value): outbound retry scheduling (`LLD.md` Section 5.2 backoff), attachment/malware scan orchestration, domain DNS re-verification polling (`LLD.md` Section 5.3), scheduled cleanup (expired disposable aliases, `FR-DOM-04`).
- Use cases beyond queueing: rate limiting (`EazzioCache.incr`, `FR-OUT-03`/Rule 66), OTP/MFA throttling, idempotency-key short-term dedup, Pub/Sub backing for realtime fan-out where WebSocket server instances need to coordinate.
- **Binding constraint (unchanged from the generic baseline, and correct as-is):** Valkey/Redis-protocol cache never becomes the source of truth for durable business data — PostgreSQL remains that, per `LLD.md` Section 1 and `PRD.md` Section 8.4.

---

## 8. Security

- JWT validation, OAuth/OIDC where used, RBAC + RLS (Section 4), input/output validation (Zod schemas shared frontend/backend), secure headers, CORS policy, CSRF protection where cookie-based sessions are used, XSS/SQL-injection/SSRF/path-traversal protection, file-upload MIME/size validation feeding into `FR-SPAM-07`'s malware scan path.
- API security: rate limiting, request throttling, IP- and user-based limits, correlation/request IDs on every request and audit-log entry (`LLD.md` Section 1.4), idempotency protection.
- Secrets: environment variables only, never in Git or frontend bundles, separate per environment (local/dev/staging/prod), rotation procedure documented — DKIM private keys specifically stored via a secrets store, referenced (never embedded) in the `domains` table (`LLD.md` Section 1.2, `dkim_private_key_ref`).
- Infrastructure security: HTTPS/TLS everywhere, secure cookies, CDN/WAF/DDoS protection at the edge, restricted DB access (least privilege, `audit_log`'s no-UPDATE/DELETE grant from `LLD.md` Section 7), production environment isolation.

---

## 9. Traffic, CDN & Edge

```text
User → DNS → CDN/Edge (Vercel Edge + Cloudinary CDN + Cloudflare optional) → Next.js frontend
     → HTTPS REST/WebSocket → services/api (stateless Node.js instances)
     → Valkey/Render KV + PostgreSQL (Supabase/self-hosted) + Cloudinary/MinIO
     → BullMQ workers (Render Background Worker / self-hosted)
```

`services/*` remain stateless wherever possible (session state lives in Postgres/cache, not in-process) so horizontal scaling is a deployment-layer concern, not an application concern — consistent with `ARCHITECTURE.md` NFR-SCALE-01.

---

## 10. Frontend Deployment — Vercel (MVP, Category D)

Per `ARCHITECTURE.md` Appendix A: builds `apps/web`'s Next.js output, global CDN/edge delivery, preview + production deployments, Git-triggered builds. Self-hosted Category A fallback is Nginx serving the static/SSR build via `infra/deploy/compose/`.

## 11. Backend Deployment — Render (MVP, Category D)

Per `ARCHITECTURE.md` Appendix A: `services/api` and workers run as a Render Web Service + Background Worker + Cron Jobs, from the **same Docker image** validated by CI and used in `infra/deploy/compose/` — no Render-specific application code. Render Key Value used per Section 7 above. Self-hosted Category A fallback is the same image running under `infra/deploy/compose/`.

---

## 12. Mobile Application (`apps/mobile`)

- Flutter + Dart, feature-based/Clean Architecture, repository pattern mirroring `packages/domain`'s repository interfaces conceptually (Dart-side, not shared code with the TS backend — Flutter consumes the REST/WebSocket API only, per `ARCHITECTURE.md` Section 3.4).
- State: Riverpod. Navigation: GoRouter.
- Networking: REST + JSON over the same `packages/contracts/api`-defined endpoints as `apps/web`; typed Dart client generated from the OpenAPI spec (mirrors Rule 15/97 on the web side).
- Security: Secure Storage for tokens, certificate/network security controls, secure logging (no PII/secrets in device logs, mirrors Rule 63).
- Features: push notifications (Section 20 below), deep linking (`mailto:` links, `APP_FLOW.md` Section 4 entry points), background processing where the OS allows, camera/gallery for attachment composition.
- Design parity: `DESIGN.md` Section 8 — same token set ported into Flutter `ThemeData`, same five primary destinations as bottom navigation.

---

## 13. Observability

- **Error monitoring:** Sentry — frontend, backend, and mobile crash/error tracking.
- **Logging:** structured JSON, request/correlation IDs, error classification, security-event and audit logging feeding `LLD.md`'s `audit_log` table (`FR-OBS-01`).
- **Metrics:** Prometheus (per `ARCHITECTURE.md` Section 3.5, Category A) for API latency, throughput, error rate, DB performance, cache hit/miss, queue depth (BullMQ), worker failures, resource usage; Grafana OSS dashboards. Frontend Core Web Vitals tracked separately (Section 1).
- **Tracing:** OpenTelemetry, trace/span IDs propagated from `apps/*` through `services/*` to `packages/infra-adapters/*` calls.
- **Free-tier monitoring (MVP-specific, `ARCHITECTURE.md` Appendix A.3):** explicit alert thresholds for Supabase (500MB) and Cloudinary (25GB) usage, surfaced on the same Grafana dashboards as everything else — not a separate, easy-to-forget system.

---

## 14. Testing

- **Unit:** Vitest (backend + frontend logic), Flutter unit tests (mobile).
- **Backend integration:** API integration tests, auth/authz tests, database tests (against both `postgres-adapter` and `supabase-adapter` — `ARCHITECTURE.md` Section 9.4 point 1), cache tests.
- **Frontend:** component + integration tests.
- **E2E:** Playwright (web), Flutter integration tests (mobile) — covering the flows in `APP_FLOW.md` Sections 2–8.
- **Security testing:** dependency vulnerability scanning (Rule 67), SAST, auth/authz-specific test suites, secret scanning in CI.
- **Contract tests:** adapter-interface pairs (`database`, `storage`) tested against a shared suite so `supabase-adapter`↔`postgres-adapter` and `cloudinary-adapter`↔`minio-adapter` are provably interchangeable (`DECISIONS.md` D-004).

---

## 15. DevOps & CI/CD

- Git + GitHub. GitHub Actions: lint, typecheck, test, security scan, build — CI gate before merge (Rule 83), no override without written justification.
- Deployment flow: GitHub Actions → build artifact → Vercel (frontend) + Render (backend/workers), same artifact promoted through environments (Rule 93 — immutable build artifacts).
- Environments: local, development, staging, production — isolated credentials/config per environment.

---

## 16. Code Quality & Dependency Management

- TypeScript strict mode, ESLint, Prettier, no unnecessary `any`, typed API contracts (shared Zod schemas, Section 1/2).
- Architecture rules: separation of concerns, DRY/SOLID where appropriate, no business logic in UI components, no secrets in source — all consistent with `AGENTS.md` Section 5/7 (Parts C, D).
- pnpm + lockfiles, Dependabot/Renovate, vulnerability auditing, license checking — the license check step is where `AGENTS.md` Rule 6 (License Gate) and Rule 67 (CVE scanning) both apply on every dependency addition, not just at project start.
- Dependency rule unchanged from the generic baseline and correct as-is: introduce a dependency only when it provides meaningful value over native platform/framework functionality.

---

## 17. Search — OpenSearch (Category A, P0, from Phase 1 — see Section 0 correction)

- Full-text indexing across sender/recipient/subject/body/attachment-text/date/folder/label/thread (`FR-SRCH-01`, `LLD.md` Section 6.4 indexing trigger).
- `services/search-indexer` writes; `services/api` queries — never crossed (`DECISIONS.md` D-010).
- PostgreSQL indexes/trigram search are still used for non-full-text, structured lookups (e.g., exact address match on inbound envelope routing, `LLD.md` Section 1.5) — this is a complementary use, not a substitute for OpenSearch on user-facing mail search.

---

## 18. Notifications

- **Email (transactional, platform-internal):** Eazzio's own outbound pipeline (`services/mail-outbound`) sends verification/recovery/system emails — no third-party transactional email API, consistent with `PRD.md` Guiding Principle 1 (the platform is a mail sender, it doesn't need an external one).
- **Push (mobile):** Firebase Cloud Messaging for device push, device-token management in `services/notification`.
- **In-app:** Postgres-backed notification records + realtime WebSocket delivery (`FR-RT-01`), matching `services/notification`'s scope in `MODULES.md` Section 3.6.

---

## 19. Realtime Communication

- WebSockets (via `services/api`'s realtime gateway, `ARCHITECTURE.md` Section 3.1) for live mailbox updates, matching `FR-RT-01…03` and `APP_FLOW.md` Section 9's polling-fallback behavior.
- Supabase Realtime is **not** used as the realtime transport — it would tie first-party client sync to the MVP-only Supabase adapter, contradicting the same reasoning as D-005 (don't build a hard dependency into a subsystem meant to be swappable). Eazzio's own WebSocket gateway is adapter-agnostic with respect to which database backs it.
- SSE not currently needed — no one-way streaming use case exists in MVP scope.

---

## 20. API Integration & Webhooks

- Outbound webhooks (`FR-RT-04`, P2) — signature verification, timestamp validation, replay protection, idempotent processing, event logging, matching the event schemas in `LLD.md` Section 4.
- No inbound third-party API dependencies are required for core mail flow (Guiding Principle 1) — any future integration (e.g., an optional external AI API adapter, `packages/infra-adapters/ai/external-api-adapter/`) follows the same signature/timeout/circuit-breaker discipline as any other external call.

---

## 21. Recommended Production Stack Summary

| Layer | Technology |
|---|---|
| Frontend | React 19 + Next.js 16 + TypeScript |
| Styling | Tailwind CSS + shadcn/ui + Radix UI |
| State | React Context + Zustand + TanStack Query where needed |
| Forms/Validation | React Hook Form + Zod (shared with backend) |
| Backend Runtime | Node.js 24 LTS + TypeScript |
| Backend Framework | Express.js (finalizes PRD.md Section 9.3) |
| API | REST + OpenAPI, versioned |
| Mail Transport | Postfix + Dovecot CE + Rspamd + ClamAV (Category A, self-hosted, permanent) |
| Search | OpenSearch (Category A, P0, from Phase 1) |
| Authentication | Custom (`services/identity`) — JWT + OAuth/OIDC login methods, never delegated to Supabase Auth |
| Authorization | RBAC + native PostgreSQL RLS |
| Database | PostgreSQL — `supabase-adapter` (MVP) / `postgres-adapter` (Category A), same schema, same interface |
| ORM | Prisma, adapter-internal only |
| Storage | `cloudinary-adapter` (MVP) / `minio-adapter` (Category A) |
| Cache/Queue | Valkey (Category A) / Render Key Value (MVP) + BullMQ |
| Frontend Hosting | Vercel (MVP) / Nginx self-hosted (Category A) |
| Backend Hosting | Render (MVP) / self-hosted compose (Category A) |
| Mobile | Flutter + Dart + Riverpod + GoRouter + FCM |
| Testing | Vitest + Playwright + Flutter Test |
| Observability | Sentry + Prometheus + Grafana OSS + OpenTelemetry |
| DevOps | Git + GitHub + GitHub Actions |
| Realtime | Eazzio-owned WebSocket gateway (not Supabase Realtime) |

---

## 22. Architecture Principles (carried forward, with corrections applied)

1. API-first architecture (`PRD.md` Guiding Principle 6).
2. Frontend and backend independently deployable.
3. Backend owns business logic; frontend is never a trusted environment (Section 4).
4. Frontend never contains secret credentials.
5. PostgreSQL remains the system of record; Valkey is ephemeral/cache/queue only, never durable business data.
6. Cloudinary/MinIO handle media, not PostgreSQL.
7. **Authentication is centralized through Eazzio's own `services/identity`, not a hosted auth product** (corrected from the generic template — Section 0).
8. Authorization enforced server-side and via native PostgreSQL RLS.
9. Backend services remain stateless; long-running work moves to BullMQ workers.
10. All external webhooks verified and idempotent; all APIs versioned; all deployments automated.
11. Observability built in from Phase 1, not added later.
12. Performance, accessibility, security, and scalability are first-class (`DESIGN.md` Section 7, `PRD.md` NFRs).
13. Managed infrastructure (Supabase/Cloudinary/Vercel/Render) is used deliberately and time-boxed (`DECISIONS.md` D-004) — not adopted as a permanent architecture without the parallel self-hosted path being built and tested.
14. **A dedicated search engine (OpenSearch) is not deferred here** — mail search is core scope, corrected from the generic template's general "don't add search prematurely" default (Section 0).
15. Do not introduce distributed infrastructure (e.g., microservices split, Kubernetes) until the product actually requires it (`ARCHITECTURE.md` Section 13 phased evolution).

---

## 23. Document Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | Draft | Initial TechStack.md — rewrote the generic 2026 SaaS baseline for Eazzio Mail; corrected three conflicts (Redis→Valkey per License Gate, Supabase Auth→custom identity per DECISIONS.md D-005, deferred search→OpenSearch-from-Phase-1 since mail search is P0 core scope); added the mail transport/security pipeline layer (Section 3) with no equivalent in the generic template; finalized PRD.md Section 9.3's open backend-framework choice as Node.js/Express |
