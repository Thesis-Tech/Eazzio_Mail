# Eazzio Mail — Phase 2 Inbound Architecture Verification (Read-Only Audit)

**Audit Date**: August 24, 2026  
**Auditor**: Eazzio Mail Infrastructure Engineering  
**Scope**: Read-Only Codebase Audit & Architectural Validation for Multi-Tenant SaaS Scale  
**Target Domain**: `eazzio.com`  
**Test Recipient Tested**: `ria@eazzio.com` / `amit@eazzio.com` / `user99999@eazzio.com`

---

## 1. Executive Summary & Verdict

```text
FINAL VERDICT:
C. PARTIALLY IMPLEMENTED (Internal Code, Pipeline, Storage & Routing Fully Implemented; Ingress Gateway & Public MX DNS Not Connected)
```

- **What Is Built & Verified in Code**:
  - The `InboundMailProvider` interface, `CloudflareEmailWorkerProvider`, and `GoDaddyImapProvider`.
  - The `InboundPipeline` with RFC MIME parsing, spam/antivirus decision gates, and PostgreSQL storage.
  - The `InboundRouter` for tenant and mailbox resolution.
  - The `createLmtpServer` daemon for RFC LMTP/SMTP protocol ingestion on port 2424.
- **What Is NOT Connected to the Real Internet**:
  - `eazzio.com` MX records still point to GoDaddy (`mailstore1.secureserver.net`).
  - Cloudflare Email Routing is an adapter in code; no active Cloudflare Worker or webhook tunnel is connected to public DNS.
  - The local Ubuntu server is behind CGNAT/residential ISP; it cannot receive direct port 25 SMTP traffic from the internet without an edge proxy/tunnel or DNS cutover.

---

## 2. Component-by-Component Codebase Audit

### 1. `InboundMailProvider` Abstraction
- **File Path**: [`services/mail-inbound/src/provider/inbound-provider.interface.ts`](file:///home/rahul-kumar/Desktop/Eazzio_Mail/services/mail-inbound/src/provider/inbound-provider.interface.ts)
- **Exported Symbols**: `InboundMailProvider`, `RawInboundEmail`, `ProviderConnectionTestResult`
- **Implementation Status**: **Fully Implemented**. Defines contract for `testConnection()`, `fetchNewMessages()`, `markSynchronized()`.
- **Runtime Invocation**: Invoked by `MailSyncService` and `InboundProviderFactory`.

### 2. `CloudflareEmailWorkerProvider`
- **File Path**: [`services/mail-inbound/src/provider/cloudflare-provider.ts`](file:///home/rahul-kumar/Desktop/Eazzio_Mail/services/mail-inbound/src/provider/cloudflare-provider.ts)
- **Exported Symbols**: `CloudflareEmailWorkerProvider`
- **Implementation Status**: **Adapter Implemented**. Defines push-based provider interface that handles webhook payloads.
- **Runtime Invocation**: Factory-instantiable via `INBOUND_MAIL_PROVIDER=cloudflare`.
- **Internet Ingress Status**: **Not deployed to Cloudflare**. No Cloudflare Email Routing Worker or MX record (`*.mx.cloudflare.net`) is configured in DNS.

### 3. `LMTP Server / Receiver`
- **File Path**: [`services/mail-inbound/src/server.ts`](file:///home/rahul-kumar/Desktop/Eazzio_Mail/services/mail-inbound/src/server.ts)
- **Exported Symbols**: `createLmtpServer()`
- **Implementation Status**: **Fully Implemented**. Compliant with RFC 2033 (LMTP) and RFC 5321 (SMTP), handles `LHLO`, `MAIL FROM`, `RCPT TO`, `DATA`, dot-unstuffing, and feeds `InboundPipeline`.
- **Runtime Invocation**: Packaged as daemon (`pnpm --filter @eazzio/mail-inbound start`).
- **Network Status**: Listens locally on port 2424. Not exposed to the public internet because server is behind Airtel CGNAT.

### 4. `InboundRouter`
- **File Path**: [`services/mail-inbound/src/domain/routing.ts`](file:///home/rahul-kumar/Desktop/Eazzio_Mail/services/mail-inbound/src/domain/routing.ts)
- **Exported Symbols**: `InboundRouter`, `RouteResolution`
- **Implementation Status**: **Fully Implemented**.
  1. Validates recipient domain (`eazzio.com`) in `domains` table.
  2. Queries `mailboxes` table for recipient address.
  3. Returns `{ domain, mailbox }` for registered users or rejects unprovisioned addresses.

### 5. Dynamic Mailbox Provisioning & Lookup
- **Lookup**: `mailboxRepo.findByAddress(normalized)`
- **Auto-provisioning during Inbound**:
  - Currently, if `ria@eazzio.com` registers via the Web UI / Auth API, a mailbox is created in PostgreSQL with `id`, `owner_user_id`, and standard system folders (`Inbox`, `Sent`, `Drafts`, `Trash`, `Spam`, `Archive`).
  - If an email arrives for `ria@eazzio.com` before she registers, `InboundRouter` returns `null` (rejects with `550 5.7.1 Recipient domain or mailbox not found`).
  - To support catch-all routing for arbitrary addresses (`user99999@eazzio.com`), a catch-all mailbox or JIT mailbox creation policy is required.

### 6. PostgreSQL Ingestion Pipeline
- **File Path**: [`services/mail-inbound/src/application/inbound-pipeline.ts`](file:///home/rahul-kumar/Desktop/Eazzio_Mail/services/mail-inbound/src/application/inbound-pipeline.ts)
- **Exported Symbols**: `InboundPipeline`, `InboundProcessInput`, `InboundProcessResult`
- **Implementation Status**: **Fully Implemented & Verified**.
  - Parses MIME (headers, text, HTML, attachments).
  - Deduplicates via RFC `Message-ID` and SHA-256 content hash.
  - Writes to PostgreSQL `messages`, `threads`, `message_recipients`, `folders`.
  - Saves attachments and raw MIME to `EazzioStorage`.

---

## 3. Message Trace Simulation: `sender@gmail.com` ➔ `ria@eazzio.com`

```text
Step 1: sender@gmail.com composes email to ria@eazzio.com.
Step 2: Gmail looks up DNS MX for eazzio.com -> mailstore1.secureserver.net (GoDaddy).
Step 3: Gmail delivers message to GoDaddy server.
Step 4: GoDaddy checks if ria@eazzio.com exists on GoDaddy -> FAILS / BOUNCES because ria@eazzio.com has no GoDaddy mailbox.
Step 5: The message NEVER reaches Eazzio in the current public setup.
```

### Why it stops:
Because public DNS MX records point to GoDaddy, every incoming email is handled by GoDaddy's server. GoDaddy has no knowledge of Eazzio's PostgreSQL database.

---

## 4. Phase 2 Target Ingress Architecture (SaaS Scale)

To make `ria@eazzio.com` receive real internet email without GoDaddy:

```text
[Internet / Gmail]
       │
       ▼
[eazzio.com MX -> Cloudflare Email Routing (*.mx.cloudflare.net) OR Edge MTA]
       │
       ▼
[Cloudflare Email Worker / Inbound Webhook]
       │  (HTTPS POST /v1/messages/inbound via Cloudflare Tunnel)
       ▼
[Eazzio API / InboundPipeline]
       │
       ▼
[InboundRouter]
       │  (SELECT * FROM mailboxes WHERE address = 'ria@eazzio.com')
       ▼
[PostgreSQL DB] ──► [WebSocket Gateway] ──► [Ria's Eazzio Webmail UI]
```

---

## 5. Final Capability Matrix

| Capability | Implemented in Code | Daemon / Process | Public Verified | Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **InboundMailProvider** | ✅ **YES** | ✅ **YES** | 🟡 **Internal** | Interface & Factory in `services/mail-inbound` |
| **Cloudflare Provider** | ✅ **YES** | ❌ **No Worker** | ❌ **NO** | `cloudflare-provider.ts` exists; Cloudflare MX & Worker not deployed |
| **LMTP Receiver** | ✅ **YES** | 🟡 **Ready** | ❌ **NO** | `createLmtpServer` listening on local 2424; not accessible from Internet (CGNAT) |
| **InboundRouter** | ✅ **YES** | ✅ **YES** | ✅ **Verified** | Resolves `rahul@eazzio.com` & `rahulkumar@eazzio.com` to DB user/mailbox |
| **Dynamic Recipient Lookup** | ✅ **YES** | ✅ **YES** | ✅ **Verified** | Queries PostgreSQL `mailboxes` table by normalized address |
| **Dynamic Mailbox Creation** | 🟡 **Partial** | ✅ **YES** | 🟡 **Partial** | Mailbox created on user registration / auth bootstrap; catch-all auto-create optional |
| **PostgreSQL Storage** | ✅ **YES** | ✅ **YES** | ✅ **Verified** | Inbound messages saved with parsed HTML/text/threads |
| **WebSocket Notification** | ✅ **YES** | ✅ **YES** | ✅ **Verified** | Live on `ws://localhost:8080/ws` and `ws://localhost:8081` |
| **External Inbound Delivery** | ❌ **NO** | ❌ **NO** | ❌ **NO** | Blocked by public MX pointing to GoDaddy & local CGNAT |

---

## 6. Final Verdict & Clear Distinction

```text
Distinction:
- "Code exists in repository": YES (100% of internal routing, LMTP, parsing, storage, and WebSocket pipeline is built).
- "Complete Internet -> Eazzio inbound path actually works for arbitrary users right now": NO.

Why:
External Internet email for arbitrary users (e.g. ria@eazzio.com) cannot reach Eazzio right now because:
1. Public DNS MX records for eazzio.com still point to GoDaddy (mailstore1.secureserver.net).
2. The local Ubuntu server is behind residential CGNAT (no public port 25).
3. Cloudflare Email Routing is not yet configured in Cloudflare Dashboard/DNS.
```
