# Eazzio Mail — FEATURE_IMPLEMENTATION_MATRIX.md

**Document Type:** Feature Implementation Reality Matrix  
**Parent Documents:** `Docs/PRD.md` v1.1 · `Docs/ARCHITECTURE.md` v1.2 · `Docs/TASKS.md` v2.0  
**Status:** Baseline Reality Audit (Task-001)

---

## 1. Feature Traceability Matrix

| FR/NFR ID | Requirement Summary | Expected Layer | Current Code Implementation | Status | Evidence in Code | Real Implementation Gap |
|---|---|---|---|---|---|---|
| **FR-AUTH-01** | Multi-tenant user registration (Argon2id) | `services/identity` | `IdentityService.register()` in `services/identity/src/application/identity-service.ts` | **PARTIAL** | Pure in-memory user instance returned; password hashed with Argon2id | Not wired to Postgres database or repository; user is not persisted to DB. |
| **FR-AUTH-02** | Password authentication & session JWT | `services/identity` | `IdentityService.authenticate()` in `services/identity/src/application/identity-service.ts` | **PARTIAL** | Password verified against hash; JWT signed via `TokenService` | Takes user object as in-memory parameter; no session row saved to `sessions` table. |
| **FR-AUTH-03** | Multi-Factor Authentication (TOTP) | `services/identity` | `TotpService` in `services/identity/src/domain/totp.ts` | **PARTIAL** | `otplib` used for verification; schema has `mfa_totp_secrets` | No TOTP setup flow, QR code generator, recovery codes, or DB secret encryption. |
| **FR-AUTH-04** | Session management & device revocation | `services/identity` | `SessionState` in `services/identity/src/domain/session-state.ts` | **NOT WIRED** | Pure memory active/revoked check logic | No active session querying API, no Redis/Valkey session cache, no DB update. |
| **FR-AUTH-05** | Account recovery & password reset | `services/identity` | `IdentityService.getRecoveryResponse()` | **PLACEHOLDER** | Returns static string message | No token generation, no reset email trigger, no expiry validation. |
| **FR-AUTH-06** | Role-Based Access Control (5-tier scopes) | `packages/domain` | `roles` table schema + `Policy` domain models | **PARTIAL** | SQL schema defines `roles` table with `scope_type`; domain models exist | No authorization middleware enforcing role hierarchy on routes. |
| **FR-AUTH-07** | Scoped API tokens | `packages/domain` | `api_tokens` table schema in `001_initial_schema.sql` | **NOT WIRED** | Table defined with scopes array & token hash | No token generation, validation, or header extraction middleware. |
| **FR-MBX-01** | Mailbox provisioning & quota allocation | `services/api` | `PostgresMailboxRepository` & `/v1/mailboxes` | **COMPLETE** | Full CRUD, quota validation, and multi-tenant isolation | Fully wired and tested |
| **FR-MBX-02** | System & custom folders hierarchy | `services/api` | `PostgresFolderRepository` & `/v1/mailboxes/:id/folders` | **COMPLETE** | DB-backed system and custom folders hierarchy | Fully wired and tested |
| **FR-MBX-03** | Non-duplicative labels & tagging | `services/api` | `PostgresLabelRepository` & `/v1/mailboxes/:id/labels` | **COMPLETE** | Non-duplicative label creation & assignment in PostgreSQL | Fully wired and tested |
| **FR-MBX-04** | Thread grouping & conversation view | `services/api` | `PostgresThreadRepository` & `ThreadViewer` | **COMPLETE** | RFC 5322 In-Reply-To/References threading in DB & UI | Fully wired and tested |
| **FR-MBX-05** | Quota calculation & soft/hard enforcement | `services/notification` | `NotificationService.checkQuota()` & Admin dashboard | **COMPLETE** | Real-time quota calculation & soft warning threshold | Fully wired and tested |
| **FR-DOM-01** | Custom domain management | `services/admin-service` | `PostgresDomainRepository` & `AdminService` | **COMPLETE** | Full CRUD and organization domain management | Fully wired and tested |
| **FR-DOM-02** | Strict 4-check DNS gate (MX, SPF, DKIM, DMARC) | `services/admin-service` | `Dns4CheckRunner` & `DnsGuidanceModal.tsx` | **COMPLETE** | Real Node DNS resolver for Cloudflare Inbound & Brevo Outbound | Fully wired and tested |
| **FR-DOM-03** | Domain aliases & disposable addresses | `packages/infra-adapters` | `domain_aliases` table & routing resolver | **COMPLETE** | Inbound alias recipient routing to primary mailbox | Fully wired and tested |
| **FR-IN-01** | Inbound SMTP reception & LMTP delivery | `services/mail-inbound` | `LmtpServer` & Cloudflare Inbound Webhook | **COMPLETE** | Socket LMTP daemon on `127.0.0.1:2424` + Cloudflare webhook | Fully wired and tested |
| **FR-IN-02** | MIME parsing & attachment extraction | `services/mail-inbound` | `MimeParser.parse()` & Sandboxed Attachment Viewer | **COMPLETE** | RFC 822 parser, HTML/Text body extraction, and sandboxed preview | Fully wired and tested |
| **FR-IN-03** | SPF, DKIM, DMARC, ARC evaluation gate | `packages/security-pipeline` | `decide()` in `packages/security-pipeline/src/decide.ts` | **COMPLETE** | Fully tested pure deterministic evaluation logic | Fully wired and tested |
| **FR-IN-04** | Inbound filtering rule engine | `services/mail-inbound` | `Filter` entity, `PostgresFilterRepository`, `/v1/filters` | **COMPLETE** | Rule engine evaluating conditions and applying actions on arrival | Fully wired and tested |
| **FR-IN-05** | Mailing-list recognition & 1-click unsubscribe | `services/mail-inbound` | RFC 2369 / RFC 8058 `List-Unsubscribe` parser | **COMPLETE** | Parsed in MIME and rendered in conversation viewer | Fully wired and tested |
| **FR-OUT-01** | Mail composition & HTML sanitization | `services/mail-outbound` | `HtmlSanitizer` & `ComposerModal.tsx` | **COMPLETE** | Rich MIME constructor with Brevo relay routing | Fully wired and tested |
| **FR-OUT-02** | Authenticated Outbound Transport (Brevo) | `packages/infra-adapters` | `SmtpAuthenticatedTransport` | **COMPLETE** | Authenticated TLS delivery via Brevo SMTP relay | Fully wired and tested |
| **FR-OUT-03** | Outbound queue & exponential backoff | `services/mail-outbound` | `PostgresOutboundQueueRepository` & Delivery Runner | **COMPLETE** | DB-backed queue with exponential retry backoff | Fully wired and tested |
| **FR-OUT-04** | RFC 3464 DSN & Automated Bounce Processor | `services/mail-inbound` | `DsnParser` & `InboundPipeline` | **COMPLETE** | Auto-detects 550 bounces, updates state to `bounced`, and threads notice | Fully wired and tested |
| **FR-SRCH-01** | Full-text message indexing & search | `services/search-indexer` | `SearchDocumentProjector` & In-Memory/OpenSearch Indexer | **COMPLETE** | Indexed message search with token matching | Fully wired and tested |
| **FR-SRCH-02** | Sub-second search & filter chips syntax helper | `apps/web` | `SearchBar.tsx` & Quick Filter Preset Bar in `page.tsx` | **COMPLETE** | Interactive filter pills (`has:attachment`, `is:unread`, `is:starred`) | Fully wired and tested |
| **FR-REAL-01** | WebSocket realtime event gateway | `services/notification` | `WebSocketGateway` & `WebSocketClient.ts` | **COMPLETE** | Live real-time socket events for message arrival and updates | Fully wired and tested |
| **FR-API-04** | Webhooks & Event Subscription Engine | `services/api` | `/v1/webhooks` CRUD & HMAC-SHA256 test dispatcher | **COMPLETE** | Webhook registration, secret signing, and ping tester | Fully wired and tested |
| **FR-OBS-03** | Mail Flow Telemetry & System Stats API | `services/api` | `/v1/stats` & Admin Portal Overview Dashboard | **COMPLETE** | Live volume, delivery success rate, and cluster storage gauge | Fully wired and tested |
| **FR-ADM-01** | Admin Web Portal | `apps/admin` | Full Next.js 15 Admin Portal (`apps/admin`) | **COMPLETE** | Multi-tenant RBAC, domain 4-check wizard, mailbox management | Fully wired and tested |
