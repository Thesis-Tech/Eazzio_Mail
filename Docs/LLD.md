# Eazzio Mail — LLD.md (Low-Level Design)

**Document Type:** Low-Level Design — schemas, interfaces, API contracts, event payloads, state machines, core algorithms
**Parent Documents:** `PRD.md` v1.1 · `ARCHITECTURE.md` v1.2 · `AGENTS.md` v1.0 · `DECISIONS.md` v1.0 · `HLD.md` v1.0
**Status:** Draft v1.0 — Phase 3 (Design) deliverable. Implementation (Phase 4) remains on hold per `HLD.md` Section 0.

---

## 0. How to Use This Document

`ARCHITECTURE.md` says **where** code lives and **how layers talk**. `LLD.md` says **what the code inside each layer actually looks like** — table columns, interface method signatures, endpoint contracts, event payload shapes, and the exact logic of the algorithms `PRD.md` only describes in prose (spam scoring, thread grouping, retry backoff, etc.).

> **Rule for every contributor, human or AI agent:** implementation must match this document's schemas, signatures, and state machines exactly. If an implementation detail isn't covered here, that is a signal to propose an addition to this document (same change-control discipline as `PRD.md`/`ARCHITECTURE.md` — Rule 19), not to invent a shape ad hoc.

This document does not repeat `PRD.md`'s `FR-*` definitions or `ARCHITECTURE.md`'s folder rules — every section below cites the ID/section it implements instead of restating it.

---

## 1. Database Schema (PostgreSQL — canonical for both `postgres-adapter` and `supabase-adapter`)

Per `DECISIONS.md` D-004, this schema must run identically against both adapters — no Supabase-only column types or extensions in the core schema.

### 1.1 Identity & Access (`FR-AUTH-*`)

```sql
users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           citext UNIQUE NOT NULL,
  password_hash   text NOT NULL,           -- argon2id, per AGENTS.md Rule 64
  display_name    text,
  status          text NOT NULL DEFAULT 'active',  -- active | suspended | deleted
  mfa_enabled     boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
)

mfa_totp_secrets (
  user_id         uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  secret_encrypted text NOT NULL,
  confirmed_at     timestamptz
)

sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_label    text,
  ip_address      inet,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_seen_at    timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL,
  revoked_at      timestamptz              -- null = active
)

api_tokens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scopes          text[] NOT NULL,          -- e.g. {'mail:read','mail:send'}
  token_hash      text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz,
  revoked_at      timestamptz
)

roles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type      text NOT NULL,   -- platform | organization | domain | mailbox
  scope_id        uuid,            -- null for platform scope
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_name       text NOT NULL,   -- admin | member | viewer (per scope_type)
  granted_at      timestamptz NOT NULL DEFAULT now()
)
```

### 1.2 Organizations & Domains (`FR-ADMIN-*`, `FR-DOM-*`)

```sql
organizations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  policy          jsonb NOT NULL DEFAULT '{}',  -- password policy, MFA requirement, retention
  created_at      timestamptz NOT NULL DEFAULT now()
)

domains (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  domain_name     text UNIQUE NOT NULL,
  verification_status text NOT NULL DEFAULT 'pending', -- pending | partially_verified | verified | failed
  mx_verified     boolean NOT NULL DEFAULT false,
  spf_verified    boolean NOT NULL DEFAULT false,
  dkim_verified   boolean NOT NULL DEFAULT false,
  dmarc_verified  boolean NOT NULL DEFAULT false,
  dkim_private_key_ref text,        -- pointer into secrets store, never the key itself
  created_at      timestamptz NOT NULL DEFAULT now(),
  activated_at    timestamptz        -- set only once mx+spf+dkim+dmarc verified (FR-DOM-02)
)

domain_aliases (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id       uuid NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  alias_address   citext UNIQUE NOT NULL,
  target_mailbox_id uuid NOT NULL REFERENCES mailboxes(id),
  is_disposable   boolean NOT NULL DEFAULT false,
  expires_at      timestamptz          -- non-null only for disposable aliases
)
```

### 1.3 Mailbox Core (`FR-MBOX-*`)

```sql
mailboxes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain_id       uuid REFERENCES domains(id),   -- null for platform-default domain
  address         citext UNIQUE NOT NULL,
  quota_bytes     bigint NOT NULL DEFAULT 5368709120,  -- 5GB default
  used_bytes      bigint NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
)

folders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id      uuid NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
  parent_folder_id uuid REFERENCES folders(id),
  name            text NOT NULL,
  kind            text NOT NULL DEFAULT 'custom', -- inbox|sent|drafts|spam|trash|archive|custom
  UNIQUE (mailbox_id, parent_folder_id, name)
)

labels (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id      uuid NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
  name            text NOT NULL,
  color           text,
  UNIQUE (mailbox_id, name)
)

threads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id      uuid NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
  subject_normalized text,
  last_message_at timestamptz NOT NULL,
  message_count   integer NOT NULL DEFAULT 0
)

messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id      uuid NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
  folder_id       uuid NOT NULL REFERENCES folders(id),      -- exactly one folder — DECISIONS.md D-009
  thread_id       uuid REFERENCES threads(id),
  message_id_header text NOT NULL,      -- RFC 5322 Message-ID
  in_reply_to     text,
  references_header text,
  from_address    citext NOT NULL,
  subject         text,
  snippet         text,
  size_bytes      integer NOT NULL,
  raw_object_key  text NOT NULL,        -- pointer into storage adapter, not the blob itself
  is_read         boolean NOT NULL DEFAULT false,
  is_starred      boolean NOT NULL DEFAULT false,
  is_important    boolean NOT NULL DEFAULT false,
  spam_score      numeric(5,4),
  auth_results    jsonb,                 -- {spf, dkim, dmarc, arc} pass/fail detail
  direction       text NOT NULL,         -- inbound | outbound
  delivery_state  text,                  -- see Section 5.1 state machine (outbound only)
  received_at     timestamptz NOT NULL DEFAULT now()
)

message_labels (                          -- many-to-many, never duplicate the message — D-009
  message_id      uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  label_id        uuid NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (message_id, label_id)
)

message_recipients (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  address         citext NOT NULL,
  kind            text NOT NULL          -- to | cc | bcc
)

attachments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  filename        text NOT NULL,
  mime_type       text NOT NULL,
  size_bytes      integer NOT NULL,
  sha256_hash     text NOT NULL,
  object_key      text NOT NULL,          -- pointer into storage adapter
  scan_status     text NOT NULL DEFAULT 'pending' -- pending | clean | infected | error
)

filters (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id      uuid NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
  conditions      jsonb NOT NULL,   -- [{field, operator, value}, ...]
  actions         jsonb NOT NULL,   -- [{type: label|move|forward|delete|star, ...}]
  is_enabled      boolean NOT NULL DEFAULT true,
  priority        integer NOT NULL DEFAULT 0
)
```

### 1.4 Delivery & Audit (`FR-OUT-*`, `FR-OBS-*`)

```sql
outbound_queue (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  recipient_address citext NOT NULL,
  state           text NOT NULL DEFAULT 'queued',  -- see Section 5.2 state machine
  attempt_count   integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error      text,
  idempotency_key text UNIQUE NOT NULL,   -- Rule 14 — required on every insert
  created_at      timestamptz NOT NULL DEFAULT now()
)

audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id   uuid REFERENCES users(id),
  actor_type      text NOT NULL,           -- user | system | admin
  action          text NOT NULL,           -- e.g. 'login', 'mail.rejected', 'domain.verified'
  target_type     text,
  target_id       uuid,
  metadata        jsonb NOT NULL DEFAULT '{}',
  occurred_at     timestamptz NOT NULL DEFAULT now()
  -- append-only: no UPDATE/DELETE grants on this table for any application role (FR-OBS-01)
)
```

### 1.5 Indexing Notes

- `messages(mailbox_id, folder_id, received_at DESC)` — primary inbox-list query path.
- `messages(mailbox_id, thread_id)` — thread assembly.
- `outbound_queue(state, next_attempt_at)` — worker poll query.
- `domain_aliases(alias_address)` and `mailboxes(address)` — unique, used on every inbound envelope lookup (hot path).
- Full-text content itself is **not** queried from Postgres — that's OpenSearch's job (Section 4). Postgres holds metadata only.

---

## 2. Interface Signatures (`packages/infra-adapters/*/interface.ts`)

Per `ARCHITECTURE.md` Section 5.1 and `DECISIONS.md` D-004, every adapter must implement these exactly — this is the contract the contract-tests (T019/T020, T022/T023 in `TASKS.md`) verify against.

### 2.1 `database/interface.ts`

```ts
interface EazzioDatabase {
  // Generic — used by domain repositories; adapters map this onto Postgres wire protocol
  query<T>(sql: string, params: unknown[]): Promise<T[]>;
  transaction<T>(fn: (tx: EazzioDatabase) => Promise<T>): Promise<T>;
  healthCheck(): Promise<{ ok: boolean; latencyMs: number }>;
}
```

*Note: application code does not call `.query()` directly with hand-written SQL — it goes through typed repository classes in `packages/domain` that use this interface internally. This keeps SQL centralized and reviewable.*

### 2.2 `storage/interface.ts`

```ts
interface EazzioStorage {
  put(key: string, data: Buffer, contentType: string): Promise<{ key: string; sizeBytes: number }>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;
  healthCheck(): Promise<{ ok: boolean }>;
}
```

### 2.3 `cache/interface.ts`

```ts
interface EazzioCache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  incr(key: string, ttlSeconds?: number): Promise<number>;   // used for rate limiting (FR-OUT-03)
  del(key: string): Promise<void>;
}
```

### 2.4 `ai/interface.ts`

```ts
interface EazzioAI {
  // Every method is advisory-only — no method in this interface returns a value that
  // is permitted to gate accept/reject/quarantine (DECISIONS.md D-007 / PRD FR-AI-04).
  summarizeThread(messages: MessageSummaryInput[]): Promise<{ summary: string }>;
  suggestReply(thread: MessageSummaryInput[]): Promise<{ suggestions: string[] }>;
  classifyPriority(message: MessageSummaryInput): Promise<{ priorityHint: 'low'|'normal'|'high' }>;
  isEnabled(scopeId: string): Promise<boolean>;   // must be checked before any other call (FR-AI-03)
}
```

### 2.5 `email-transport/interface.ts`

```ts
interface EazzioEmailTransport {
  // Thin wrapper over Postfix/Dovecot integration points — not a full MTA reimplementation
  submitOutbound(rawMime: Buffer, envelopeFrom: string, envelopeTo: string[]): Promise<{ queueId: string }>;
  getDeliveryStatus(queueId: string): Promise<{ state: string; detail?: string }>;
}
```

---

## 3. API Contract Highlights (`packages/contracts/api`)

Full detail lives in the OpenAPI spec itself (T016); this section defines the highest-traffic/most structurally important endpoints so implementers don't have to reverse-engineer shape from the schema alone.

| Method | Path | Request (key fields) | Response (key fields) | FR-* |
|---|---|---|---|---|
| `POST` | `/v1/auth/register` | `email, password` | `userId` | FR-AUTH-01 |
| `POST` | `/v1/auth/login` | `email, password, mfaCode?` | `sessionToken, mfaRequired?` | FR-AUTH-02 |
| `GET` | `/v1/auth/sessions` | — | `Session[]` | FR-AUTH-03 |
| `DELETE` | `/v1/auth/sessions/{id}` | — | `204` | FR-AUTH-03 |
| `GET` | `/v1/mailboxes/{id}/folders` | — | `Folder[]` | FR-MBOX-01/02 |
| `GET` | `/v1/mailboxes/{id}/messages` | `folderId?, labelId?, cursor?` | `Message[], nextCursor` | FR-MBOX-01…04 |
| `POST` | `/v1/mailboxes/{id}/messages/{msgId}/labels` | `labelId` | `204` | FR-MBOX-03 |
| `POST` | `/v1/messages/compose` | `to, cc?, bcc?, subject, body, attachments?` | `messageId, outboundQueueId` | FR-OUT-01 |
| `GET` | `/v1/search` | `q, folderId?, labelId?, cursor?` | `Message[], nextCursor` | FR-SRCH-01…04 |
| `POST` | `/v1/domains` | `domainName, organizationId` | `domainId, dnsInstructions` | FR-DOM-01 |
| `GET` | `/v1/domains/{id}/verification` | — | `{mxVerified, spfVerified, dkimVerified, dmarcVerified, status}` | FR-DOM-02 |
| `POST` | `/v1/filters` | `conditions, actions, priority` | `filterId` | FR-RULE-01 |
| `GET` | `/v1/admin/audit-log` | `actorId?, action?, from?, to?` | `AuditEntry[]` | FR-OBS-01, FR-ADMIN-03 |

**Standard error shape (Rule 54), used on every endpoint above:**

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "human-readable summary", "details": [ { "field": "email", "issue": "invalid format" } ] } }
```

### 3.1 Error Code Taxonomy

| Code | HTTP status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request shape/content invalid |
| `AUTH_REQUIRED` | 401 | Missing/expired session or token |
| `FORBIDDEN` | 403 | Authenticated but not authorized for this scope (FR-AUTH-06) |
| `NOT_FOUND` | 404 | Resource doesn't exist or isn't visible to this tenant (cross-tenant isolation, FR-ADMIN-05) |
| `CONFLICT` | 409 | e.g., duplicate domain, duplicate label name |
| `RATE_LIMITED` | 429 | Rule 66 — includes `Retry-After` header |
| `QUOTA_EXCEEDED` | 413 | Mailbox quota exceeded on send/receive |
| `UPSTREAM_UNAVAILABLE` | 503 | A dependent service (search, AI) is down — core send/receive must not be gated by this (NFR-REL-02) |
| `INTERNAL_ERROR` | 500 | Unhandled — always logged with a correlation ID, never a stack trace to the client (Rule 63) |

---

## 4. Event Payload Schemas (`packages/contracts/events`)

```ts
type MailAccepted = {
  eventId: string; occurredAt: string;
  messageId: string; mailboxId: string; folderId: string;
  fromAddress: string; subject: string; sizeBytes: number;
};

type MailRejected = {
  eventId: string; occurredAt: string;
  envelopeFrom: string; envelopeTo: string;
  reasonCode: 'SPF_FAIL'|'DKIM_FAIL'|'DMARC_REJECT'|'MALWARE_DETECTED'|'RATE_LIMITED'|'POLICY_REJECT';
  reasonDetail: string;
};

type MailQuarantined = {
  eventId: string; occurredAt: string;
  messageId: string; mailboxId: string; spamScore: number; reasonCode: string;
};

type MailDelivered = {
  eventId: string; occurredAt: string;
  outboundQueueId: string; messageId: string; recipientAddress: string;
};

type MailBounced = {
  eventId: string; occurredAt: string;
  outboundQueueId: string; messageId: string; recipientAddress: string;
  bounceType: 'permanent'|'transient_exhausted'; smtpCode?: string;
};

type DomainVerified = {
  eventId: string; occurredAt: string;
  domainId: string; domainName: string;
};
```

**Idempotency requirement (Rule 14, FR-OBS-04):** every event consumer must be safe to receive the same `eventId` twice — consumers dedupe on `eventId`, not on inferred uniqueness of the payload fields.

---

## 5. State Machines

### 5.1 `messages.delivery_state` (outbound messages only — `FR-OUT-06`)

```text
(created) → queued → sending → delivered
                    ↘ retrying → sending   (loops until max attempts or success)
                    ↘ bounced              (permanent failure, or retry exhausted)

Allowed transitions only:
  queued      → sending
  sending     → delivered | retrying | bounced
  retrying    → sending
  (no transition ever leaves 'delivered' or 'bounced' — terminal states)
```

### 5.2 `outbound_queue.state`

```text
queued → sending → { delivered | retrying | dead_letter }
retrying → sending
retrying → dead_letter   (after max_attempts exceeded — FR-OUT-07)
```

Backoff formula (temporary failure, Rule: exponential with cap):

```text
next_attempt_at = now() + min( base_seconds * 2^attempt_count, max_backoff_seconds )
base_seconds = 30
max_backoff_seconds = 3600  (1 hour)
max_attempts = 8  → beyond this, transition to dead_letter (T060) and emit MailBounced(bounceType='transient_exhausted')
```

### 5.3 `domains.verification_status` (`FR-DOM-02`)

```text
pending → partially_verified → verified
pending → failed   (if verification checks error out, e.g. malformed DNS)

Activation rule: domains.activated_at is set ONLY when
  mx_verified = true AND spf_verified = true AND dkim_verified = true AND dmarc_verified = true
A domain with any of these false may show verification_status = 'partially_verified'
but MUST NOT be usable for sending/receiving mail (enforced at the application layer,
not just surfaced in the UI).
```

### 5.4 `sessions` lifecycle (`FR-AUTH-03`)

```text
active → revoked   (explicit user/admin action, OR expires_at reached)
(no transition back to active — a revoked/expired session token is never reactivated;
 a new login creates a new session row)
```

---

## 6. Core Algorithms

### 6.1 Inbound Decision Pipeline (`services/mail-inbound/src/application`, implements `FR-IN-07`)

Deterministic, sequential, short-circuiting — per `DECISIONS.md` D-007, no ML output is permitted to appear in this function's control flow as anything other than an additive numeric input.

```text
function decide(message, authResults, spamRuleResult, spamStatisticalScore, avResult):

  # Hard gates first — these short-circuit regardless of any score
  if avResult.status == 'infected':
      return REJECT(reason='MALWARE_DETECTED')

  if authResults.dmarc == 'fail' and domainPolicy(authResults.fromDomain) == 'reject':
      return REJECT(reason='DMARC_REJECT')

  if rateLimiter.exceeded(envelopeFrom):
      return REJECT(reason='RATE_LIMITED')

  # Composite score — deterministic weighted sum, weights configured per PRD FR-SPAM-01..03
  score = spamRuleResult.score
        + spamStatisticalScore
        + authPenalty(authResults)     # e.g. +0.3 if SPF soft-fail, +0.5 if DKIM fail
        + urlRiskScore(message)        # FR-SPAM-04

  if score >= REJECT_THRESHOLD:        # configurable, default 0.95
      return REJECT(reason='POLICY_REJECT')
  elif score >= QUARANTINE_THRESHOLD:  # configurable, default 0.6
      return QUARANTINE(score)
  else:
      return ACCEPT()
```

**Binding constraint:** `ai-gateway`'s advisory priority/classification output is never a parameter to `decide()`. If a future FR authorizes an ML signal here, it enters as another additive term in `score`, never as its own gate — consistent with D-007.

### 6.2 Thread Grouping Heuristic (`FR-MBOX-04`)

```text
function assignThread(message, mailboxId):
  # 1. Strict match: In-Reply-To / References header points at a known Message-ID
  if message.inReplyTo or message.referencesHeader:
      candidateIds = parseMessageIds(message.inReplyTo, message.referencesHeader)
      existing = findMessagesByMessageIdHeader(mailboxId, candidateIds)
      if existing:
          return existing[0].threadId

  # 2. Fallback heuristic: normalized subject + overlapping participants within a time window
  normalizedSubject = stripReplyPrefixes(message.subject)   # strips "Re:", "Fwd:", etc.
  candidate = findRecentThread(mailboxId, normalizedSubject, participantsOf(message), windowDays=30)
  if candidate:
      return candidate.threadId

  # 3. No match — new thread
  return createThread(mailboxId, normalizedSubject)
```

### 6.3 DKIM Signing (Outbound, `FR-OUT-02`)

```text
function signOutbound(rawMime, domain):
  key = secretsStore.getPrivateKey(domain.dkimPrivateKeyRef)   # never logged, never in app DB directly
  headerFields = ['from', 'to', 'subject', 'date', 'message-id']
  signature = dkimSign(rawMime, key, selector=domain.dkimSelector, headerFields=headerFields)
  return prependHeader(rawMime, 'DKIM-Signature', signature)
```

### 6.4 Search Indexing Trigger (`FR-SRCH-05`, single-writer rule D-010)

```text
on MailAccepted event:
  doc = projectToSearchDocument(messageId)   # pulls metadata from Postgres, never re-parses raw MIME here
  openSearchClient.index(doc)                 # search-indexer is the ONLY caller of this client
  # services/api never calls openSearchClient.index() directly — see DECISIONS.md D-010
```

---

## 7. Cross-Cutting Rules Applied at LLD Level

| Rule | How it's enforced structurally in this LLD |
|---|---|
| Idempotency (Rule 14) | `outbound_queue.idempotency_key` UNIQUE constraint; event consumers dedupe on `eventId` |
| No hard-coding (Rule 9) | `REJECT_THRESHOLD`, `QUARANTINE_THRESHOLD`, backoff constants, quota defaults are config-loaded, not literals in the algorithm bodies above |
| UTC discipline (Rule 56) | Every `timestamptz` column; no `timestamp without time zone` anywhere in the schema |
| Least privilege (Rule 59) | `audit_log` has no UPDATE/DELETE grant for any application role |
| Consistent error shape (Rule 54) | Single JSON error envelope, Section 3 |
| Cross-tenant isolation (FR-ADMIN-05) | Every tenant-scoped table keyed through `mailbox_id`/`domain_id`/`organization_id`; query layer must filter by tenant on every read, never rely on API-layer checks alone |

---

## 8. Document Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | Draft | Initial LLD.md — database schema, adapter interfaces, API contract highlights, event payloads, state machines, and core algorithm pseudocode for MVP scope |
