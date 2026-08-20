# Eazzio Mail — ARCHITECTURE_REALITY_AUDIT.md

**Document Type:** Architectural Reality & Compliance Audit  
**Parent Documents:** `Docs/ARCHITECTURE.md` v1.2 · `Docs/DECISIONS.md` v1.0 · `Docs/TechStack.md` v1.0  
**Status:** Baseline Reality Audit (Task-001)

---

## 1. Monorepo & Architectural Boundary Compliance

### 1.1 Structural Layout
The monorepo conforms to the designated folder structure:
- `packages/`: `domain`, `contracts`, `infra-adapters`, `security-pipeline`, `ui-kit`
- `services/`: `identity`, `api`, `mail-inbound`, `mail-outbound`, `search-indexer`, `notification`, `admin-service`, `ai-gateway`
- `apps/`: `web`, `admin`, `mobile`
- `infra/`: `deploy/compose`, `docker/*`

---

## 2. Layering & Dependency Direction Audit

### 2.1 Four-Layer Domain-Driven Architecture
`ARCHITECTURE.md` Section 5 defines four strict layers:
1. `api/` (Controllers, Route Handlers, HTTP mapping)
2. `application/` (Use-case Orchestration)
3. `domain/` (Pure Entities, Value Objects, Domain Services, Repository Interfaces)
4. `infra-adapters/` (Database, Cache, Object Storage, Email Transport, AI Adapters)

### 2.2 Compliance Evaluation:
- **`packages/domain`:** **COMPLIANT.** Pure TypeScript entities and value objects with zero external runtime dependencies.
- **`packages/contracts`:** **COMPLIANT.** Houses OpenAPI schema definitions and strongly typed event contracts.
- **`packages/security-pipeline`:** **COMPLIANT.** Pure deterministic rule evaluation (`decide()`) isolated from I/O.
- **`packages/infra-adapters`:** **PARTIAL COMPLIANCE.** Contains TypeScript interfaces for Database, Storage, Cache, Transport, and AI. However, concrete implementations for Postgres and Supabase are currently stubs (`PostgresAdapter` and `SupabaseAdapter` return empty arrays `[]`), and no implementations exist for Valkey, MinIO, or live SMTP transport.
- **`services/*`:** **ARCHITECTURAL VIOLATION IDENTIFIED:**
  - `services/api` directly imports `@eazzio/identity` internal classes (`PasswordService`, `TokenService`, `IdentityService`) in `services/api/src/middleware/auth.ts`.
  - In a strict modular monolith, `services/api` should verify tokens via shared contract/library or identity middleware exported interface rather than treating another service as an internal library without contract boundaries.

---

## 3. Subsystem Architectural Audits

### 3.1 Authentication & Identity Ownership (`services/identity`)
- **Rule (DECISIONS.md D-005):** Eazzio Mail must own its identity authority; Supabase Auth is strictly forbidden from being the identity provider.
- **Reality:** **100% COMPLIANT.** `services/identity` uses `argon2` for password hashing and `jsonwebtoken` for tokens. Zero Supabase Auth dependencies exist.
- **Gap:** In-memory execution only; user entities and session tokens are not persisted to the PostgreSQL `users` or `sessions` tables.

### 3.2 Database & Multi-Tenant RLS (`packages/infra-adapters`)
- **Rule (Security.md Section 3):** All tenant tables must have Row Level Security (RLS) enabled and enforced via session variable `app.current_user_id`.
- **Reality:**
  - Tables defined in `001_initial_schema.sql` (211 lines).
  - RLS enabled on 9 tables in `002_rls_and_security_policies.sql`.
- **Gap / Violation:**
  - `002_rls_and_security_policies.sql` created policies for `mailboxes`, `messages`, and `audit_log`, but **omitted RLS policies** for `folders`, `labels`, `threads`, `attachments`, `filters`, and `domains`. Because RLS is enabled without matching policies, standard application queries against these tables will fail with permission denied unless explicit policies are applied.

### 3.3 Search Subsystem (`services/search-indexer`)
- **Rule (ARCHITECTURE.md Section 8.4):** Single-writer architecture where `services/search-indexer` alone writes to OpenSearch; `services/api` reads via search adapter.
- **Reality:** `SearchDocumentProjector` correctly maps `MailAcceptedEvent` to search schema.
- **Gap / Violation:** `services/api/src/api/v1/search.ts` uses an inline hardcoded mock (`mockSearchAdapter`) rather than a real OpenSearch client adapter.

### 3.4 Realtime Subsystem (`services/notification`)
- **Rule (TechStack.md Section 1):** WebSocket Gateway is primary; SSE/polling is degraded fallback.
- **Reality:** `NotificationChannelManager` constructs channel names and payloads.
- **Gap:** No live WebSocket server (`ws` / `Socket.io`) or connection lifecycle manager is instantiated.

### 3.5 Mail Infrastructure (`infra/docker/*`)
- **Rule (TechStack.md Section 3):** Postfix (SMTP), Dovecot (IMAP/LMTP), Rspamd (Spam), ClamAV (Antivirus).
- **Reality:** Base Dockerfiles exist for each daemon.
- **Gap:** Configuration templates (`main.cf`, `dovecot.conf`, rspamd rules) and live inter-service sockets are not wired into the Node backend services.

### 3.6 AI Boundary (`services/ai-gateway`)
- **Rule (DECISIONS.md D-007, Security.md Section 8.4):** AI Gateway is strictly read-only for message summarization/suggestions, guarded by organization opt-in policy, and forbidden from writing to database decision fields.
- **Reality:** **COMPLIANT.** `AiPolicyEvaluator` enforces org-level opt-in before invocation; `002_rls_and_security_policies.sql` explicitly revokes INSERT/UPDATE/DELETE permissions from the `eazzio_ai_gateway` database role.

---

## 4. Summary of Architectural Violations & Corrective Actions

| ID | Component | Architectural Violation / Gap | Corrective Action |
|---|---|---|---|
| **ARC-V01** | `packages/infra-adapters` | Concrete DB adapters are dummy stubs returning `[]` | Implement real `PostgresAdapter` with connection pooling and parameter binding. |
| **ARC-V02** | `packages/infra-adapters` | Incomplete RLS policies for `folders`, `labels`, `threads`, `attachments`, `filters`, `domains` | Create migration `003_complete_rls_policies.sql` adding tenant-scoped policies. |
| **ARC-V03** | `services/api` | Direct cross-service internal coupling to `services/identity` | Expose clean identity middleware/client package or contract boundary. |
| **ARC-V04** | `services/api` | Hardcoded mock search adapter in production route | Wire `OpenSearchAdapter` from `packages/infra-adapters` to `services/api`. |
| **ARC-V05** | `services/*` | Missing database repositories implementing `packages/domain/repositories` | Create concrete Postgres repositories implementing `UserRepository`, `MailboxRepository`, `MessageRepository`, etc. |
