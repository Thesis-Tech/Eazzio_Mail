# Eazzio Mail — Security.md

**Document Type:** Security Architecture & Protection Plan
**Parent Documents:** `PRD.md` v1.1 · `ARCHITECTURE.md` v1.2 · `AGENTS.md` v1.0 · `DECISIONS.md` v1.0 · `LLD.md` v1.0 · `DESIGN.md` v1.0 · `APP_FLOW.md` v1.0 · `MODULES.md` v1.0 · `TechStack.md` v1.0
**Status:** Draft v1.0 — Phase 3 (Design) deliverable. Implementation (Phase 4) remains on hold per `HLD.md` Section 0.

Security is implemented as **defense-in-depth**. No single mechanism is considered sufficient. This document covers frontend, backend, API, authentication, authorization, database, storage, cache, mobile, and infrastructure security — plus a layer the generic security baseline this rewrites doesn't cover at all: **mail-specific security** (SPF/DKIM/DMARC/ARC, spam/phishing/malware pipeline, DKIM key custody), because Eazzio Mail's primary attack surface is inbound/outbound email, not just a web app.

---

## 0. Corrections to the Generic Baseline (Read First)

Same discipline as `TechStack.md` Section 0 — these are real conflicts with decisions already locked in this project, corrected explicitly rather than silently adopted.

| Generic baseline said | Eazzio Mail uses instead | Why |
|---|---|---|
| "Primary authentication platform: Supabase Auth" | Authentication is implemented in Eazzio's own `services/identity` (JWT issuance/verification, session rows, MFA) — Supabase is a Postgres-compatible row store only | `DECISIONS.md` D-005: identity is never delegated to a hosted auth product, even though Supabase is used for data storage in the MVP. This is the single most important correction in this document — every section below that mentions authentication assumes `services/identity`, not Supabase Auth. |
| "Redis security" / Redis-backed rate limiting | Valkey (self-hosted, Category A) / Render Key Value (MVP), both Redis-protocol-compatible | `PRD.md` Section 9.2/14.3 names Redis's licensing change as the exact trap to avoid — matches `TechStack.md` Section 0. |
| Roles: `USER / MODERATOR / MANAGER / ADMIN / SUPER_ADMIN` | `Platform Admin → Organization Admin → Domain Admin → Mailbox Admin → User` | This is `PRD.md` FR-AUTH-06's actual hierarchy (`LLD.md` `roles.scope_type`) — the generic role set doesn't correspond to anything in this project's schema. |
| No mail-specific threat surface covered | Section 5 below (SPF/DKIM/DMARC/ARC, spam/phishing/malware pipeline, DKIM key custody) added in full | The generic template was written for a typical SaaS app; it has no concept of inbound SMTP being the primary untrusted-input surface, which for Eazzio Mail it is. |

Everything else in the generic baseline (validation discipline, rate limiting, CORS/CSRF, security headers, incident response shape, CI/CD security gates) is sound and is adopted below with Eazzio-specific detail filled in.

---

## 1. Security Philosophy

1. Never trust the client — browser, mobile app, or third-party mail client (Dovecot/IMAP consumers) alike.
2. Authenticate before accessing protected resources.
3. Authorize every protected operation — including every mail-transport-level operation, not just API calls.
4. Validate data at every trust boundary — and for Eazzio Mail, **inbound SMTP is the highest-volume untrusted boundary in the system**, treated with at least as much rigor as the HTTP API.
5. Least privilege, secure defaults, no secrets to any client (browser, mobile, or `apps/admin`).
6. Treat every uploaded file **and every received email** as untrusted.
7. Log security-relevant events (`audit_log`, `LLD.md` Section 1.4).
8. Fail securely — a dependent-service outage never bypasses a security check (`NFR-REL-02` degrades functionality, never security).
9. Minimize stored sensitive information; keep dependencies and infrastructure patched; security is part of every SDLC phase, not a final gate.
10. **Deterministic security decisions are never delegated to AI/ML** (`DECISIONS.md` D-007) — this is Eazzio Mail's own addition to the standard philosophy list, because it's the one place this project's threat model diverges most from a generic app: an ML spam/phishing classifier can inform risk scoring, but the accept/reject/quarantine gate itself is rule-based and auditable, never an opaque model decision.

---

## 2. Security Architecture

```text
                         INTERNET
                    │                    │
          (HTTP/S traffic)      (SMTP inbound, port 25/587)
                    │                    │
                    ▼                    ▼
         ┌──────────────────┐   ┌──────────────────────┐
         │ DNS/CDN/WAF        │   │ Postfix (MTA)          │
         │ DDoS/Bot Protection │   │ TLS/STARTTLS enforced  │
         └─────────┬──────────┘   └──────────┬─────────────┘
                    │                          │
                    ▼                          ▼
         ┌──────────────────┐   ┌──────────────────────────┐
         │ Frontend (Next.js) │   │ services/mail-inbound      │
         │ Validation, CSP    │   │ SPF/DKIM/DMARC/ARC check   │
         └─────────┬──────────┘   │ Rspamd + ClamAV pipeline   │
                    │ HTTPS         │ Deterministic accept/       │
                    ▼               │ reject/quarantine gate      │
         ┌──────────────────┐   └──────────┬─────────────────┘
         │ services/api        │              │
         │ Auth Middleware     │◄─────────────┘ (MailAccepted event)
         │ Rate Limiting        │
         │ RBAC + Object-Level  │
         │ Security Headers      │
         │ Audit Logging          │
         └─────────┬──────────────┘
                    │
     ┌──────────────┼───────────────────┐
     ▼               ▼                   ▼
┌──────────┐   ┌────────────┐    ┌────────────┐
│ Postgres  │   │ Valkey      │    │ Cloudinary/ │
│ + RLS     │   │ Cache/Limits │    │ MinIO Media │
│ (Supabase │   │ (Render KV/  │    │              │
│ or self-  │   │ self-hosted) │    │              │
│ hosted)   │   │              │    │              │
└──────────┘   └────────────┘    └────────────┘
```

---

## 3. Security Zones

### Public Zone
Landing pages, public API endpoints (e.g., domain-DNS-instructions lookup), the SMTP inbound listener itself (Postfix accepts connections from any sender by design). Still requires rate limiting, input validation, abuse protection, logging, and — for SMTP specifically — the full authentication pipeline in Section 5 before anything is trusted.

### Authenticated Zone
Inbox, Compose, Search, Settings, Filters — every `FR-MBOX-*`/`FR-OUT-*`/`FR-SRCH-*` surface. Requires valid session/token, authorization check, and **resource ownership check scoped to `mailbox_id`** (Section 8).

### Privileged Zone
`apps/admin` — domain management, org policy, audit log, mailbox/alias provisioning. Requires authentication, elevated authorization (`Organization Admin`/`Domain Admin`/`Platform Admin` roles), mandatory MFA (Section 9), stronger rate limiting, and full audit logging on every action.

---

## 4. Transport Security

- TLS 1.2+ everywhere; HTTPS-only for all web/API/admin/webhook traffic; HTTP→HTTPS redirect; HSTS; secure cookies where cookies are used; no mixed content.
- **SMTP-specific:** STARTTLS enforced or preferred per domain policy on both inbound and outbound (`FR-IN-02`, `FR-OUT-04`); MTA-STS and TLS-RPT published so external senders/receivers know Eazzio's TLS policy (`PRD.md` Section 10); certificate validation is mandatory on outbound delivery attempts — a recipient MX presenting an invalid certificate is treated as a delivery failure, not silently downgraded to plaintext.
- IMAP/POP3/LMTP (Dovecot, third-party client interoperability per `DECISIONS.md` D-006) also enforces TLS — no plaintext credential submission is accepted.

---

## 5. Mail-Specific Security (No Equivalent in the Generic Baseline)

This section is Eazzio Mail's primary security surface and did not exist in the source template at all.

### 5.1 Inbound Authentication Pipeline (`FR-IN-04`, implements `LLD.md` Section 6.1 `decide()`)

```text
Inbound SMTP connection
  → envelope validation (sender/recipient existence, size, rate limits — FR-IN-03)
  → SPF check (packages/security-pipeline/spf)
  → DKIM check (packages/security-pipeline/dkim)
  → DMARC check (packages/security-pipeline/dmarc) — policy-dependent reject/quarantine
  → ARC check (packages/security-pipeline/arc) — preserves auth results across forwarding
  → MIME parsing (malformed messages logged, not silently dropped — FR-IN-05)
  → attachment analysis: type ID, hashing, known-threat check, ClamAV scan (FR-IN-06, FR-SPAM-07)
  → Rspamd rule engine (packages/security-pipeline/spam-rules — FR-SPAM-01)
  → Rspamd statistical/Bayesian layer (spam-statistical — FR-SPAM-02)
  → composite deterministic score → ACCEPT / QUARANTINE / REJECT (LLD.md Section 6.1)
```

**Binding rule (restated from `DECISIONS.md` D-007):** every gate in this pipeline is deterministic and independently testable. If an ML/AI signal is ever added, it enters as an additive term in the composite score — it is never given veto/override authority over accept/reject/quarantine, and `services/ai-gateway`'s database role has no write grant to any column this pipeline reads or writes (enforced at the DB-permission level, not just code review — see Section 8.4).

### 5.2 DKIM Key Custody (`FR-OUT-02`)

- One DKIM keypair per verified domain; private key stored via a secrets store, referenced in `domains.dkim_private_key_ref` (`LLD.md` Section 1.2) — **the key itself is never stored in the application database, never logged, and never returned by any API response.**
- Key rotation procedure: generate new keypair → publish new DNS selector → dual-sign during a transition window → retire old selector once propagation is confirmed. Rotation must be possible without downtime (mirrors Section 22's general secret-rotation requirement, specialized for DKIM).
- Compromise response: if a domain's DKIM private key is suspected compromised, treat it as a compromised credential incident (Section 21) — immediate key rotation, review of all mail signed under the old key during the suspected exposure window, and a domain-owner notification.

### 5.3 Domain Verification as a Security Gate (`FR-DOM-02`, `LLD.md` Section 5.3)

A domain is **not** usable for sending or receiving mail until **all four** of MX, SPF, DKIM, and DMARC are independently verified — this is enforced at the application layer (not just surfaced in the UI, per `LLD.md` Section 5.3's activation rule), because a partially-verified domain sending mail without DKIM/SPF configured would both fail deliverability and make Eazzio-originated spoofing trivially easy for anyone who claimed the domain prematurely.

### 5.4 Outbound Abuse Prevention (`FR-OUT-03`, Rule 66)

- Per-user and per-domain sending rate limits, backed by Valkey `incr()` (`TechStack.md` Section 7).
- New-account sending limits are stricter than established accounts (reputation-based throttling, `FR-RULE-03`) — this protects the platform's overall IP/domain deliverability reputation, which is a shared resource across all tenants.
- Compromised-account mass-send pattern (sudden spike in outbound volume/recipient diversity from one mailbox) is a monitored signal (Section 18) that can trigger automatic throttling ahead of a human investigating.

### 5.5 Privacy Tier Security Boundary (`DECISIONS.md` D-011, `FR-ENC-*`)

- Standard Mode: TLS in transit, encryption at rest — the server can read plaintext for spam/malware scanning, indexing, and optional AI. This is a real, useful security posture, but it is **not** E2EE, and no code path, UI copy, or log message may describe it as such (binding on engineering and on documentation, not just marketing — see `DESIGN.md` Section 6.5).
- Enhanced Privacy Mode and E2EE Mode (when shipped) use established, audited cryptographic libraries only — `DECISIONS.md` D-008 forbids custom cryptography anywhere in this system, including inside `services/ai-gateway` or any seemingly isolated feature.

---

## 6. Authentication (`services/identity`)

- Email/password, OAuth 2.0/OIDC (Google + other approved providers) as additional **login methods into** Eazzio's own session issuance — never a delegation of session authority.
- Email verification, password reset (short-lived, rate-limited, expiring tokens — Section 20), account recovery, MFA (TOTP; WebAuthn/passkeys as a P2 enhancement).
- Authentication is never implemented only on the frontend — every check in this section is re-verified server-side regardless of what the client claims.

### 6.1 Password Security

- Argon2id hashing (per `AGENTS.md` Rule 64), never plaintext, never logged.
- Policy: minimum 12 characters, no arbitrary complexity rules, no forced periodic rotation, passphrases encouraged, password managers supported. Password-reset endpoints rate-limited (Section 12).
- Password change triggers a review of existing sessions per the org's session policy (`FR-ADMIN-02`) — not necessarily a blanket revoke, but always an explicit, logged decision.

---

## 7. MFA / 2FA

- Primary: TOTP. Secondary/roadmap: WebAuthn/passkeys, recovery codes (one-time use, hashed at rest, regeneration invalidates prior codes, never logged — matches `LLD.md`'s `mfa_totp_secrets` table storing only `secret_encrypted`).
- SMS is not used as a primary MFA mechanism (SIM-swap risk).
- **Optional** for standard users, **mandatory** for `Domain Admin`/`Organization Admin`/`Platform Admin` roles (Section 9's role table), and required as a re-authentication step before: password change, email change, MFA disable, API-token creation, domain/DKIM key rotation, org-ownership transfer, privileged-account creation.

---

## 8. Authorization

### 8.1 RBAC (`FR-AUTH-06`, `LLD.md` `roles` table)

| Operation | User | Mailbox Admin | Domain Admin | Organization Admin | Platform Admin |
|---|---:|---:|---:|---:|---:|
| Read own mailbox | Yes | Yes | Yes | Yes | Yes |
| Manage own filters/labels | Yes | Yes | Yes | Yes | Yes |
| Provision mailboxes on a domain | No | Limited (own) | Yes | Yes | Yes |
| Verify/manage a domain | No | No | Yes | Yes | Yes |
| Set org-wide policy (password/MFA/retention) | No | No | No | Yes | Yes |
| Read audit log | No | No | Domain-scoped | Org-scoped | Yes |
| Platform-wide configuration | No | No | No | No | Yes |

### 8.2 Permission-Based Authorization

```text
mailbox.read        mailbox.write        mailbox.delete
message.send         message.read          message.delete
domain.verify         domain.manage
org.policy.manage     org.users.manage
admin.audit.read       admin.sessions.revoke
```

The backend checks permissions server-side on every request — a hidden/disabled button in `apps/web` or `apps/admin` is a UX convenience, never a security control.

### 8.3 Object-Level Authorization (the single most important control for a multi-tenant mailbox platform)

```text
Bad:
  GET /v1/mailboxes/{id}/messages/{msgId}
  check: user.isAuthenticated === true

Correct:
  authenticated user
    → mailbox {id} exists
    → user has a role scoped to this mailbox (or its parent domain/org)
    → message {msgId} belongs to mailbox {id}
    → permission allows this operation
    → allow / deny
```

Every tenant-scoped table (`mailboxes`, `messages`, `domains`, `organizations` — `LLD.md` Section 1) is keyed through `mailbox_id`/`domain_id`/`organization_id`, and the query layer filters by tenant on **every** read — this is `FR-ADMIN-05`'s cross-tenant isolation requirement, and it is checked at the query layer, not assumed from the API layer alone.

### 8.4 Structural Enforcement of D-007 (AI Never Gates Security Decisions)

This is Eazzio Mail's authorization model applied to a non-human actor: `services/ai-gateway`'s database role has no `UPDATE`/`INSERT` grant on `messages.spam_score`, `messages.delivery_state`, `messages.auth_results`, or `outbound_queue.state`. This is enforced via PostgreSQL role grants (verified by a negative test — `MODULES.md` Section 3.8's Definition of Done), not merely by the application code choosing not to call those methods.

---

## 9. Session & JWT Security

- Short-lived access tokens; session rows (`LLD.md` `sessions` table) back refresh/revocation and device visibility — matches the state machine in `LLD.md` Section 5.4 (active → revoked, no reactivation).
- JWTs are verified on every request: signature, issuer, audience where applicable, expiration, claim shape. User-supplied role claims are never trusted — authorization is re-derived from the `roles` table server-side on every check, not read out of the token payload as ground truth for anything beyond identity.
- Users can view and revoke active sessions/devices (`APP_FLOW.md` Section 2) — approximate device/location shown, nothing more granular than necessary.
- Suspicious-login detection (`FR-AUTH-05`) forces an MFA challenge even for accounts that don't normally require one, and notifies existing sessions.

---

## 10. Frontend & Backend Validation

- Frontend (Zod + React Hook Form + TypeScript) exists for UX, not security — **frontend validation is never a security boundary.**
- Backend validates every external input — request body, query/URL params, headers, uploaded files, webhook payloads, and (uniquely to this project) **inbound SMTP envelopes and MIME content**, which are the highest-volume untrusted input this system processes.
- The same Zod schemas back both layers (`TechStack.md` Section 1), so validation logic isn't defined twice and can't silently drift.
- Input normalization (trim, canonicalize email addresses, enforce length limits) happens before business logic, without silently changing intended meaning.
- Output filtering: never return password hashes, MFA secrets, DKIM private keys, API token hashes, or internal-only fields; sanitize any HTML rendered in message bodies (Section 14).

---

## 11. CORS, CSRF, Security Headers, CSP

- CORS: explicit allowlist per environment (`https://app.eazzio.mail`, `https://admin.eazzio.mail`, etc.) — never `*` for authenticated endpoints.
- CSRF: SameSite cookies + CSRF tokens where cookie-based auth is used; bearer tokens in `Authorization` headers have different CSRF characteristics but are still reviewed.
- Headers: `Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`/`Cross-Origin-Resource-Policy` as applicable.
- CSP tightened over time; never `script-src *`. **Message body rendering gets its own, stricter CSP context** — HTML email is one of the highest-risk rendering surfaces in the entire product (tracking pixels, embedded scripts attempted via malformed MIME), so `ThreadView`'s message-body iframe/sandbox uses a maximally restrictive CSP independent of the app shell's general policy.

---

## 12. Rate Limiting & Brute-Force Protection

| Category | Starting policy (calibrate in production) |
|---|---|
| Public API | 60 req/min/IP |
| Authenticated API | 120 req/min/user |
| Login | 5 failed attempts / 15 min |
| Password reset | 3 requests / hour / IP+account |
| MFA/OTP verification | 5 attempts / 10 min |
| File/attachment upload | 20 uploads / hour / user |
| **Inbound SMTP per sending IP** | Rspamd-managed, reputation-adjusted — new/unknown senders throttled harder than established ones |
| **Outbound send** | Per `FR-OUT-03` policy, org/user-tier dependent |

Multi-dimensional limiting (IP + user ID + endpoint + auth state) prevents bypass via IP rotation alone. Exponential backoff and temporary throttling are preferred over permanent lockouts, which can be weaponized as a denial-of-service against legitimate users. Credential-stuffing patterns (many accounts from one IP, one account from many IPs, abnormal velocity) trigger additional verification or throttling, and are logged as security events (Section 18).

---

## 13. Injection & Application-Layer Protections

- **SQL injection:** parameterized queries only, via `packages/domain` repositories → `packages/infra-adapters/database` adapters — no raw string concatenation from user input anywhere, including inside adapter-internal Prisma usage (`TechStack.md` Section 5).
- **XSS:** React's default escaping preserved; `dangerouslySetInnerHTML` avoided except in the sandboxed message-body renderer (Section 11), which applies explicit HTML sanitization (`FR-OUT-01`'s compose-side sanitization has a mirror on the render side for received HTML mail).
- **SSRF:** any URL-fetch functionality (e.g., a future link-preview feature) allowlists domains, blocks private IP ranges/localhost/metadata services, restricts protocols/ports, validates redirects, applies timeouts. No such feature exists in MVP scope — this is a standing constraint for if/when one is proposed.

---

## 14. File Upload & Attachment Security

All uploaded files and all received email attachments are untrusted, without exception.

- File-size limits, MIME validation, extension validation, magic-byte/file-signature validation, filename sanitization.
- ClamAV scan before an attachment is ever delivered to a mailbox (`FR-IN-06`) or accepted from a compose upload.
- Archive attachments inspected recursively within safe resource limits, not trusted opaquely (`FR-SPAM-08`).
- Metadata stripping where appropriate; signed URLs for download access (`packages/infra-adapters/storage` `getSignedUrl`, `LLD.md` Section 2.2).
- **Storage adapter security (`Cloudinary`/`MinIO`, `DECISIONS.md` D-004):** signed uploads, restricted presets/resource-type restrictions on Cloudinary; equivalent bucket-policy restrictions on MinIO for the Category A path — both adapters enforce the same restriction *shape* even though the mechanism differs, since application code only sees `EazzioStorage`'s interface.
- Never trust filename, `Content-Type`, extension, or client-side validation alone — this applies identically to a web upload and to a MIME attachment parsed from inbound SMTP.

---

## 15. Secrets Management

Never committed: API keys, JWT signing secrets, database credentials, DKIM private keys, Cloudinary/Supabase credentials, OAuth client secrets. Managed via environment variables (Vercel/Render env vars for MVP, equivalent mechanism for self-hosted `compose/` deployment), never in Git, never in a frontend or mobile bundle. Separate credentials per environment (local/dev/staging/prod). Rotation procedure exists for every secret category, including the DKIM-specific rotation flow in Section 5.2.

---

## 16. Database Security

- Native PostgreSQL Row Level Security (RLS) — **not Supabase-specific**, so policies written for `supabase-adapter` (MVP) port unchanged to `postgres-adapter` (Category A), directly supporting the migration requirement in `DECISIONS.md` D-004.
- RLS enforces tenant/ownership boundaries as defense-in-depth *underneath* the application-layer object-level checks in Section 8.3 — two independent layers, not one relied on alone.
- Least privilege per service role (`services/ai-gateway`'s restricted grants, Section 8.4; `audit_log`'s no-`UPDATE`/`DELETE` grant for any application role — `LLD.md` Section 1.4).
- Constraints, foreign keys, unique indexes, check constraints, safe/reversible migrations (Rule 86), tested backups (Section 24).
- **Service-role/superuser database credentials are never exposed to the browser or mobile app** — they exist only inside `services/*` server environments, same rule the generic baseline stated for Supabase specifically, generalized here to apply to `postgres-adapter` as well.

---

## 17. Cache Security (Valkey)

Not exposed publicly; authenticated access, TLS where supported, restricted network access, namespaced keys, TTL on all ephemeral data, monitored. Valkey/Render Key Value is never the source of truth for durable business data (`TechStack.md` Section 7) — this is itself a security property, since anything cached is by definition allowed to be lost or reset without a data-integrity incident.

---

## 18. Logging, Audit & Monitoring

### 18.1 Logging Discipline

Never logged: passwords, JWTs/session tokens, MFA codes/recovery codes, API secrets, database credentials, DKIM private keys. Safe: `request_id`, `user_id`, endpoint, status code, latency, timestamp, `security_event_type`. Values redacted where sensitive.

### 18.2 Audit Log (`LLD.md` Section 1.4, `FR-OBS-01`)

Append-only (`audit_log` has no `UPDATE`/`DELETE` grant for any application role). Captures, at minimum: `LOGIN_SUCCESS/FAILURE`, `MFA_ENABLED/DISABLED`, `PASSWORD_CHANGED`, `EMAIL_CHANGED`, `SESSION_REVOKED`, `ROLE_CHANGED`, `DOMAIN_VERIFIED`, `DKIM_KEY_ROTATED`, `ADMIN_LOGIN`, `ADMIN_ACTION`, `MAIL_REJECTED` (with reason code from `LLD.md` Section 4's `MailRejected` event), `ACCOUNT_DELETED`. Each entry includes timestamp, event type, actor, request ID, and outcome.

### 18.3 Monitoring & Alerting

Monitored: auth failures, authz failures (401/403 patterns), rate-limit violations, MFA failures, password-reset abuse, admin activity, large data exports, **repeated DMARC/DKIM/SPF failures from a specific domain** (may indicate spoofing attempts against Eazzio-hosted domains), **sudden outbound volume spikes** (compromised-account signal, Section 5.4), webhook signature failures, dependency vulnerabilities, Supabase/Cloudinary free-tier threshold breaches (`ARCHITECTURE.md` Appendix A.3 — a capacity issue with security-adjacent urgency, since exceeding a free tier unexpectedly can mean silent service degradation).

---

## 19. Account Enumeration & Error Handling

- Password recovery and registration responses never reveal whether an account exists ("If the account exists, instructions have been sent" — regardless of actual existence, matching `APP_FLOW.md` Section 2's recovery flow).
- API errors never leak internal detail (DB connection strings, stack traces) — matches `LLD.md` Section 3.1's error taxonomy; internal detail is logged server-side with a correlation ID, the client sees a controlled error code and message only.

---

## 20. Webhook Security (`FR-RT-04`, P2)

```text
Webhook received → verify signature → validate timestamp → validate payload against
packages/contracts/events schema → check idempotency (dedupe on eventId, LLD.md Section 4) → process
```

Never processed before signature verification. Same idempotency discipline as internal event consumers (Rule 14).

---

## 21. Incident Response

Standard flow: Detect → Contain → Investigate → Eradicate → Recover → Validate → Document → Improve.

**Compromised API token/session:** revoke token/session → rotate if a shared secret is implicated → inspect usage via audit log → identify affected mailboxes/resources → notify affected org admin.

**Compromised mailbox account (mass-send abuse):** automatic throttle trigger (Section 5.4) → revoke sessions → force password reset + MFA → review `outbound_queue`/audit log for the exposure window → notify user.

**Compromised DKIM private key:** immediate key rotation (Section 5.2) → review all mail signed under the old key during the suspected window → domain-owner notification → consider temporary DMARC policy tightening for the affected domain during investigation.

**Suspected inbound-pipeline bypass (e.g., malware reaching a mailbox despite scanning):** quarantine the message and any structurally similar recent messages → review `packages/security-pipeline` logs for the specific gate that should have caught it → patch/update signatures → retroactive scan of recently delivered mail matching the same signature.

---

## 22. Secret & Key Rotation

Rotation processes exist for: API keys, OAuth client secrets, database credentials, Cloudinary/storage credentials, Valkey credentials, JWT signing keys, **and DKIM private keys per domain** (Section 5.2's specific procedure). Emergency rotation must be possible without a broader application redeploy.

---

## 23. Mobile Security (`apps/mobile`)

The Flutter app is an **untrusted client**, identical in trust level to a browser. Never embeds server secrets, database credentials, or DKIM/API keys. Uses Secure Storage for tokens, HTTPS everywhere, backend-side re-validation of everything, no sensitive data in device logs. Certificate/network security controls applied where justified. This mirrors Section 6's "authentication is never frontend-only" principle extended to the mobile surface.

---

## 24. Backup, Disaster Recovery & Dependency Security

- Backups (Postgres, storage, search index — `FR-OBS-05`) are encrypted, access-controlled, and **periodically test-restored** — an untested backup is not considered reliable (Rule 90).
- RPO/RTO targets defined per `PRD.md`'s reliability requirements once quantified in a future revision; not assumed universal here.
- Dependency scanning (`npm audit`/equivalent, Dependabot/Renovate, SAST) on every dependency addition — this is where `AGENTS.md` Rule 6 (License Gate) and Rule 67 (CVE scanning) both apply, not just at project start (`TechStack.md` Section 16).
- Secret scanning in CI/pre-commit; leaked secrets rotated immediately per Section 22.

---

## 25. Security Testing Matrix

| Area | Frontend | Backend | Mail Pipeline | Database | Infrastructure |
|---|---:|---:|---:|---:|---:|
| Input validation | Yes | Yes | Yes (MIME/envelope) | Yes | — |
| Authentication | UI | Yes | — | Yes | Yes |
| Authorization | UI guard | Yes | — | RLS | Yes |
| Rate limiting | — | Yes | Yes (SMTP/Rspamd) | — | Yes |
| XSS | Yes | Yes | Yes (HTML mail render) | — | — |
| SQL injection | — | Yes | — | Yes | — |
| Malware/attachment scanning | — | — | Yes (ClamAV) | — | Yes |
| SPF/DKIM/DMARC/ARC | — | — | Yes | — | — |
| File upload | Yes | Yes | — | — | Yes |
| Secrets (incl. DKIM keys) | — | Yes | Yes | Yes | Yes |
| Logging/audit | — | Yes | Yes | Yes | Yes |
| DDoS | — | — | Yes (SMTP flood) | — | Yes |
| MFA | UI | Yes | — | — | Yes |

Security tests required before production sign-off include: negative-role tests for `services/ai-gateway` (Section 8.4), a DMARC-reject fixture that must never reach an inbox, a malware-attachment fixture that must always quarantine, and object-level authorization tests proving a user cannot read another mailbox's messages via ID manipulation.

---

## 26. Security Priority Order (Implementation Sequencing)

```text
1. HTTPS/TLS (web + SMTP STARTTLS/MTA-STS)
2. Authentication (services/identity — never Supabase Auth)
3. Authorization (RBAC + object-level + RLS)
4. Inbound mail authentication pipeline (SPF/DKIM/DMARC/ARC — Section 5.1)
5. Backend validation
6. Rate limiting (API + SMTP)
7. Session security
8. MFA/2FA
9. Malware/spam pipeline (ClamAV + Rspamd)
10. Security headers/CSP (incl. sandboxed message-body rendering)
11. CORS
12. File-upload security
13. DKIM key custody & rotation procedure
14. Secret management
15. Audit logging
16. Monitoring & alerting
17. Dependency security
18. Automated security testing
19. WAF / advanced abuse controls
20. Threat modeling refresh
21. Incident response drills
22. Continuous security review
```

Mail-pipeline authentication (item 4) is placed deliberately early — ahead of several generic-baseline items — because it gates the platform's core untrusted-input surface and everything downstream (mailbox storage, search indexing, notification) assumes mail has already passed it.

---

## 27. Minimum Security Baseline Before Production

```text
Authentication:  [ ] services/identity JWT+session flow  [ ] MFA for privileged roles  [ ] email verification/recovery
Authorization:   [ ] RBAC (5-tier hierarchy)  [ ] object-level checks  [ ] native Postgres RLS
Mail Security:   [ ] SPF/DKIM/DMARC/ARC pipeline  [ ] ClamAV scanning  [ ] Rspamd rule+statistical layers
                 [ ] DKIM key custody/rotation procedure  [ ] domain 4-check activation gate enforced server-side
API Security:    [ ] rate limiting  [ ] input/output validation  [ ] CORS allowlist  [ ] security headers
                 [ ] request-size limits  [ ] timeouts
Data Security:   [ ] Postgres constraints  [ ] RLS  [ ] least privilege  [ ] encrypted transport  [ ] tested backups
Infrastructure:  [ ] HTTPS  [ ] CDN  [ ] WAF  [ ] DDoS protection  [ ] secrets never in Git/bundles
Monitoring:      [ ] structured logs  [ ] audit log (append-only)  [ ] error monitoring  [ ] mail-specific alerts (Section 18.3)
Development:     [ ] dependency scanning  [ ] secret scanning  [ ] automated security tests  [ ] CI/CD security gates
```

---

## 28. Document Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | Draft | Initial Security.md — rewrote the generic security baseline for Eazzio Mail; corrected Supabase Auth→services/identity and Redis→Valkey per the same conflicts identified in TechStack.md; replaced the generic role table with the project's actual FR-AUTH-06 hierarchy; added Section 5 (mail-specific security: SPF/DKIM/DMARC/ARC pipeline, DKIM key custody, domain-verification security gate, outbound abuse prevention, privacy-tier security boundary) with no equivalent in the source template; added structural enforcement of DECISIONS.md D-007 (AI never gates security decisions) as a first-class authorization control |
