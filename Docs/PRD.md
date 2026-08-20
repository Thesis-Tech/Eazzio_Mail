# Eazzio Mail — Product Requirements Document (PRD)

**Document Type:** Product Requirements Document
**Parent Document:** Eazzio Mail — Final Master Project Overview (Task 1)
**Status:** Draft v1.0 — for team and AI-agent ("Antigravity") reference
**Owner:** Eazzio Mail Project Team

---

## 0. How to Use This Document

This PRD translates the Eazzio Mail Master Project Overview into actionable, buildable requirements. It is written to be consumed by two audiences simultaneously:

1. **Human team members** — engineers, designers, and reviewers who need scope, priority, and acceptance criteria.
2. **AI coding agents (e.g., Antigravity)** — which need explicit, unambiguous, testable requirements, module boundaries, and constraints to generate code without re-deriving architectural intent.

Every requirement below is written to be independently implementable and testable. Where the source overview specifies a principle or rule, this PRD converts it into a concrete requirement, an acceptance criterion, and (where useful) a priority tag.

**Priority legend:** `P0` = must-have for MVP · `P1` = required for v1 GA · `P2` = advanced/near-term · `P3` = future/ecosystem

> **Before implementing anything, read [Section 5.2](#52-scope-boundary-rule-mandatory--read-before-implementing-anything).** It defines a default-deny scope rule and a list of specifically excluded features. This document's `FR-*`/`NFR-*` tables — not the narrative Master Project Overview — are the only implementable specification.

---

## 1. Product Summary

**Product name:** Eazzio Mail

**One-line definition:** An independent, open-source-first, standards-based, self-hostable email and communication ecosystem that combines the strongest usability, enterprise, privacy, and intelligence concepts from Gmail, Yahoo Mail, Outlook/Exchange, Proton Mail, and Zoho Mail into one unified, vendor-independent architecture.

**What it is not:** A clone of any single provider. Eazzio does not copy proprietary implementations; it re-implements comparable capability using open standards and open-source components, with Eazzio-owned business logic on top.

**Core promise:** A team or individual can deploy Eazzio Mail entirely on infrastructure they control, using free/open-source software throughout the core stack, and get a mail platform with Gmail-grade search/organization, Outlook-grade enterprise administration, Proton-grade privacy options, Zoho-grade multi-tenant business hosting, and Yahoo-grade high-volume mailbox handling and aliasing.

---

## 2. Goals and Non-Goals

### 2.1 Product Goals

| # | Goal | Priority |
|---|---|---|
| G1 | Send and receive standards-compliant internet email (SMTP/IMAP/MIME) | P0 |
| G2 | Provide a secure, filtered, malware-scanned mail pipeline out of the box | P0 |
| G3 | Provide fast full-text search, labels, folders, and threading | P0 |
| G4 | Support custom domains and multi-tenant business hosting | P1 |
| G5 | Provide a modern API-first web and mobile client experience | P0 |
| G6 | Offer configurable privacy tiers up to end-to-end encryption | P1/P2 |
| G7 | Offer optional, self-hostable AI assistance without mandatory third-party AI dependency | P2 |
| G8 | Guarantee the entire core platform can run without any proprietary SaaS dependency | P0 (architectural constraint, applies to all phases) |
| G9 | Provide a documented, versioned governance process for every dependency's license and sustainability | P0 |

### 2.2 Non-Goals (for this PRD's scope)

- Eazzio Mail is **not** committing, in this document, to shipping Calendar, Contacts, Tasks, Notes, Cloud Storage, or Collaboration modules — these are catalogued as **Future/Ecosystem (P3)** and are out of scope for the mail-platform MVP and v1 GA.
- Eazzio Mail will **not** require any proprietary vendor account (Google, Microsoft, AWS, Cloudflare, Vercel, Netlify, OpenAI, Anthropic, etc.) to operate its core functionality. Optional integrations with such vendors may exist strictly as opt-in, replaceable add-ons.
- Eazzio Mail will **not** invent new cryptographic primitives or a non-standard mail transport protocol.
- This PRD does not select final library versions — see [Section 9](#9-technology-selection-framework) for the selection process, deferred to a dedicated Technology Selection task.

---

## 3. Target Users and Personas

| Persona | Description | Primary Needs |
|---|---|---|
| **Individual user** | Uses Eazzio as a personal Gmail/Yahoo alternative | Fast search, labels/folders, spam filtering, mobile + web client, privacy controls |
| **Privacy-focused user** | Wants Proton-like guarantees | Enhanced privacy mode, E2EE mode, self-hosted AI or AI opt-out |
| **Domain/business owner** | Runs a small business on a custom domain | Custom domain onboarding, aliases, quotas, admin portal, delegated access |
| **Organization admin** | Manages a multi-tenant deployment (Zoho/Exchange-like) | Multi-tenancy, org policies, audit logs, user provisioning, reporting |
| **Third-party mail client user** | Wants to use Thunderbird/Outlook/Apple Mail | Standards-compliant IMAP/SMTP submission access |
| **Developer / integrator** | Builds on top of Eazzio | REST API, webhooks, API scopes/service accounts |
| **Self-hoster / operator** | Deploys and maintains Eazzio infrastructure | Clear deployment path, observability, backup/DR, no mandatory license fees |
| **AI agent (Antigravity)** | Implements features against this PRD | Unambiguous requirements, module boundaries, explicit interfaces, acceptance criteria |

---

## 4. Guiding Principles (Non-Negotiable Constraints)

These principles apply across every requirement in this document and must not be violated by any implementation decision, including by an AI coding agent acting autonomously.

1. **Open-source-first, free-forever core.** The core platform must never become architecturally dependent on a proprietary SaaS API, paid-only library, closed-source infrastructure, mandatory commercial SDK, vendor-locked database, proprietary mail server, paid search engine, paid authentication provider, paid observability system, or mandatory cloud-specific service. Hosting/infrastructure costs (servers, bandwidth, IPs, domains, electricity, optional commercial support) are acceptable and expected.
2. **License Gate.** Every new dependency must pass the Eazzio License Gate (see [Section 9.2](#92-license-gate-checklist)) before being adopted. "Free tier" is not equivalent to "open source" (e.g., Redis's source-available editions are explicitly called out as a trap to avoid).
3. **Standards over invention.** SMTP, IMAP, MIME, DNS, SPF, DKIM, DMARC, TLS, and related IETF standards are the foundation. Eazzio does not invent an incompatible mail protocol and does not invent cryptography.
4. **Deterministic security is never delegated to AI.** TLS, authentication, SPF/DKIM/DMARC verification, access control, file validation, and antivirus decisions are deterministic and rule-based. AI may inform ranking/suggestions/classification but never overrides a security decision.
5. **Vendor independence via abstraction.** Every external subsystem (storage, AI, identity, etc.) sits behind an internal interface with at least one open-source/self-hosted implementation, so any single vendor or library can be replaced without a system redesign.
6. **API-first.** All first-party clients (web, mobile) consume the same Eazzio API/realtime layer used by third parties, with IMAP reserved for third-party client interoperability rather than as the internal application protocol.
7. **Start simple, evolve deliberately.** Architecture begins as a modular monolith and evolves toward independently scaled services only as load requires (see [Section 13](#13-architectural-evolution-phases)) — Eazzio does not begin as dozens of microservices.
8. **Privacy tiers are honestly labeled.** The system must never describe TLS-in-transit plus encrypted-at-rest storage as "end-to-end encryption." E2EE is a distinct, explicitly implemented mode.

---

## 5. Scope of the Platform

### 5.1 In-Scope Functional Layers

- **User Layer:** registration, authentication, password management, recovery, MFA, sessions, devices, profiles, preferences.
- **Mailbox Layer:** Inbox, Sent, Drafts, Spam, Trash, Archive, Starred, Important, Folders, Labels, Threads, Categories.
- **Mail Infrastructure:** SMTP, IMAP, LMTP (where appropriate), MIME, message parsing, routing, queues, retry, bounce processing, delivery tracking.
- **Security:** TLS, SPF, DKIM, DMARC, ARC, MTA-STS, TLS-RPT, optional DANE, authN/authZ, encryption at rest, optional E2EE.
- **Intelligence:** rule filtering, statistical/Bayesian classification, reputation analysis, spam scoring, phishing detection, malware/attachment risk analysis, ML, optional AI assistance.
- **Data:** PostgreSQL (structured metadata), object storage (large data), search index, cache, queues, audit data.
- **Platform:** REST API, WebSocket/realtime, webhooks, notifications, admin, multi-tenancy, custom domains, aliases, disposable addresses, quotas.
- **Ecosystem (future):** Calendar, Contacts, Tasks, Notes, Storage, Collaboration, Automation, mobile apps, developer APIs.

### 5.2 Scope Boundary Rule (Mandatory — Read Before Implementing Anything)

> **Default-deny rule:** If a feature, module, endpoint, UI element, or behavior does not map to an `FR-*` ID (or an explicitly listed P2/P3 item below) in this document, it is **out of scope** and must **not** be implemented, scaffolded, or stubbed — regardless of whether it seems like a natural extension, a "nice to have," or something implied by the Gmail/Yahoo/Outlook/Proton/Zoho comparison in the parent Master Project Overview.

This rule exists specifically because Eazzio Mail is defined by synthesizing ideas from five major providers ([Section 2](#2-goals-and-non-goals)). That comparison is architectural inspiration, not a feature backlog. An AI agent must not treat "Gmail/Yahoo/Outlook/Proton/Zoho have X" as sufficient justification to build X.

**Procedure for any agent (human or AI) before adding a new feature:**
1. Search this document for a matching `FR-*` ID. If found, implement only what that ID (and its acceptance criteria) states — no additions "while you're in there."
2. If no `FR-*` ID exists, do not implement the feature. File it as a proposed requirement for human review instead of writing code for it.
3. Never infer a requirement from the Master Project Overview's narrative text, diagrams, or provider comparisons directly — only this PRD's `FR-*`/`NFR-*` tables are implementable specification. The Overview is background context, not a task list.
4. If a task description or user request conflicts with this scope boundary, implement only the in-scope portion and flag the rest back to a human rather than silently expanding scope.

#### 5.2.1 Explicitly Excluded Modules (P3 — Future Ecosystem, not started)

- Calendar
- Contacts
- Tasks
- Notes
- Cloud Storage (as a general-purpose file-storage product, distinct from mail's internal object storage)
- Collaboration / shared-document features
- Any mobile or desktop app beyond the web client and the API surface defined in [Section 6.12](#612-api-webhooks--interoperability)

#### 5.2.2 Explicitly Excluded Capabilities (deferred past MVP/v1 — do not build early)

- DANE (DNSSEC-based certificate association) — Optional/Advanced only.
- Dynamic sandbox/detonation-based malware analysis — Advanced phase only, after static/signature scanning (FR-SPAM-07/08) is stable.
- Full End-to-End Encryption Mode — deferred until Enhanced Privacy Mode is stable ([Section 8.6](#86-privacy-tiers)); do not build E2EE key exchange before FR-ENC-02 ships.
- ML-based spam/priority classification as a *sole* gate for accept/reject/quarantine — always additive, never a replacement for the deterministic pipeline (Guiding Principle 4).
- Any mandatory dependency on a proprietary vendor (Google, Microsoft, AWS, Cloudflare, Vercel, Netlify, OpenAI, Anthropic, or equivalent) — see [Section 4, Principle 1](#4-guiding-principles-non-negotiable-constraints).

#### 5.2.3 Specifically Excluded "Tempting" Features (named because they are the most likely features an AI agent would infer from the provider comparison, and must not be built without an explicit `FR-*` ID)

| Feature an agent might infer | Source of temptation | Status |
|---|---|---|
| Gmail-style "Smart Reply" / one-tap AI reply chips | Gmail comparison + AI section | Not specified — only FR-AI-01's "reply suggestions" (P2, optional, self-hosted) is in scope; a branded/one-tap UI feature is not |
| Gmail-style tabbed inbox (Primary/Social/Promotions) as a fixed, non-optional layout | Gmail comparison | Only FR-MBOX-06 (optional, rule/ML-assisted categorization) is in scope; a hardcoded tab UI is not |
| Yahoo-style themed/customizable inbox views or mailbox "skins" | Yahoo comparison | Not specified anywhere — excluded |
| Outlook/Exchange-style full Calendar and meeting-scheduling integration | Outlook comparison | Excluded — see 5.2.1 |
| Outlook-style "Focused Inbox" as a shipped default | Outlook comparison | Not specified — excluded unless a future `FR-*` covers it |
| Proton-style dedicated desktop "Bridge" application for legacy client encryption | Proton comparison | Not specified — excluded |
| Proton-style anonymous/no-log account creation with no recovery mechanism | Proton comparison | Conflicts with FR-AUTH-04 (recovery is required); excluded |
| Zoho-style bundled office suite (docs/sheets/slides) | Zoho comparison | Excluded — see 5.2.1 (Collaboration) |
| Zoho-style CRM/helpdesk integration | Zoho comparison | Not specified anywhere — excluded |
| Any browser extension, desktop client, or OS-level mail app beyond the web client | General inference from "modern mail client" framing | Not specified — excluded (see 5.2.1) |
| Any built-in analytics/tracking (e.g., read receipts, open tracking pixels) | Common in commercial mail platforms | Not specified anywhere — excluded, and would need explicit privacy review before ever being proposed |

**If a task instruction elsewhere (chat message, ticket, follow-up prompt) asks for something in the tables above without also amending this PRD, treat the PRD as authoritative and ask for clarification rather than implementing it.**

---

## 6. Functional Requirements

Each requirement includes an ID, description, priority, and acceptance criteria. IDs are stable identifiers for cross-referencing by engineering tickets and AI-agent task decomposition.

### 6.1 Identity, Authentication & Authorization

| ID | Requirement | Priority |
|---|---|---|
| FR-AUTH-01 | Users can register an account with email/username and password, subject to password strength policy. | P0 |
| FR-AUTH-02 | Users can authenticate via password, with MFA (TOTP at minimum) as an optional/enforceable second factor. | P0 |
| FR-AUTH-03 | System supports session and device management: list active sessions/devices, revoke individually or all. | P0 |
| FR-AUTH-04 | Account recovery flow exists (e.g., recovery email/codes) without weakening password/MFA security. | P0 |
| FR-AUTH-05 | Suspicious-login detection triggers additional verification or notification. | P1 |
| FR-AUTH-06 | Authorization model implements a hierarchy: Platform Admin → Organization Admin → Domain Admin → Mailbox Admin → User, each scoped strictly to its level. | P0 |
| FR-AUTH-07 | API access is governed by scoped tokens/service accounts, not full-privilege credentials. | P1 |
| FR-AUTH-08 | Delegated mailbox access (e.g., shared/assistant access) is supported without sharing primary credentials. | P2 |

**Acceptance criteria (representative):** A user can register, verify, enable TOTP MFA, log in from a new device (triggering a notification), view their active sessions, and revoke a specific session — all via API and reflected in the web client within one request/response cycle.

### 6.2 Mailbox & Organization

| ID | Requirement | Priority |
|---|---|---|
| FR-MBOX-01 | Standard system folders exist: Inbox, Sent, Drafts, Spam, Trash, Archive. | P0 |
| FR-MBOX-02 | Users can create, rename, and delete custom folders (hierarchical). | P0 |
| FR-MBOX-03 | Users can create, apply, and remove labels; a message may carry one folder and multiple labels simultaneously without duplicating the underlying message. | P0 |
| FR-MBOX-04 | Messages are automatically grouped into threads using Message-ID, In-Reply-To, References, and subject/participant heuristics, while each message remains independently stored and addressable. | P0 |
| FR-MBOX-05 | Users can star/flag messages and mark as important. | P1 |
| FR-MBOX-06 | Categorization (e.g., Primary/Social/Promotions-style) is supported as an optional, rule/ML-assisted layer, not a mandatory rigid taxonomy. | P2 |
| FR-MBOX-07 | Bulk actions (archive, delete, label, move) are supported across selections and search results. | P1 |

### 6.3 Mail Transport (Inbound)

| ID | Requirement | Priority |
|---|---|---|
| FR-IN-01 | System receives inbound SMTP mail per RFC 5321, resolved via DNS MX records. | P0 |
| FR-IN-02 | TLS/STARTTLS is enforced or preferred per policy on inbound connections. | P0 |
| FR-IN-03 | Envelope validation (sender/recipient existence, size limits, rate limits) occurs before acceptance. | P0 |
| FR-IN-04 | SPF, DKIM, and DMARC/ARC checks are performed on inbound mail and results are attached to the message for downstream policy decisions. | P0 |
| FR-IN-05 | MIME parsing extracts headers, body parts (text/HTML), and attachments reliably, including malformed/edge-case messages (best-effort with logging, not silent failure). | P0 |
| FR-IN-06 | Attachments are analyzed (type identification, hashing, known-threat check, antivirus scan) before delivery to mailbox. | P0 |
| FR-IN-07 | Spam/phishing scoring pipeline (rule engine + statistical + optional ML) assigns a risk score and routes to Inbox / Suspicious / Spam / Reject / Quarantine per policy. | P0 |
| FR-IN-08 | Accepted mail is persisted to PostgreSQL (metadata), object storage (raw MIME/attachments), and indexed for search, then a realtime notification is emitted. | P0 |

**End-to-end acceptance criteria:** A test message sent from an external mail server with valid SPF/DKIM/DMARC arrives in the recipient's Inbox within an agreed SLA (see NFR-PERF-01), is searchable within N seconds, and triggers a realtime client notification. A message failing DMARC with a `reject` policy is not delivered to the inbox and is logged in the audit trail.

### 6.4 Mail Transport (Outbound)

| ID | Requirement | Priority |
|---|---|---|
| FR-OUT-01 | Users can compose and send mail via the API; server performs validation, HTML sanitization, and MIME construction. | P0 |
| FR-OUT-02 | Outgoing messages are DKIM-signed using the sending domain's private key. | P0 |
| FR-OUT-03 | Outbound policy (rate limiting, per-user/per-domain sending limits) is enforced before queuing. | P0 |
| FR-OUT-04 | Delivery queue resolves recipient MX, applies MTA-STS/DANE policy where published, negotiates STARTTLS, validates certificates, and attempts SMTP delivery. | P0 |
| FR-OUT-05 | Temporary failures are retried with exponential backoff within a bounded retry window; permanent failures generate a bounce notification to the sender. | P0 |
| FR-OUT-06 | Delivery state (queued/sent/retrying/bounced/delivered) is tracked and queryable per message. | P1 |
| FR-OUT-07 | Dead-letter handling captures messages that exhaust retries for operator review. | P1 |

### 6.5 Domains, Aliases & Custom Domain Hosting

| ID | Requirement | Priority |
|---|---|---|
| FR-DOM-01 | Domain owners can add a custom domain and receive step-by-step DNS instructions (MX, SPF, DKIM, DMARC, MTA-STS, TLS-RPT). | P1 |
| FR-DOM-02 | System verifies DNS records and reports per-record verification status; domain activates only once required records (MX, SPF, DKIM, DMARC at minimum) are verified. | P1 |
| FR-DOM-03 | Domain admins can create mailboxes/aliases under the verified domain, set quotas, and manage per-domain policy. | P1 |
| FR-DOM-04 | Disposable/temporary alias creation is supported for privacy-preserving sign-ups. | P2 |
| FR-DOM-05 | Group/distribution addresses are supported (mail to one address fans out to multiple mailboxes). | P2 |

### 6.6 Search & Indexing

| ID | Requirement | Priority |
|---|---|---|
| FR-SRCH-01 | Full-text search covers sender, recipient, CC, BCC, subject, body, filename/attachment text (where extractable), date, folder, label, thread, domain, status, and size. | P0 |
| FR-SRCH-02 | Search supports boolean operators, phrase matching, prefix search, and fuzzy matching. | P1 |
| FR-SRCH-03 | Search results are relevance-ranked with recency/engagement signals available as tunable factors. | P1 |
| FR-SRCH-04 | Autocomplete/typeahead is available for search and recipient fields. | P1 |
| FR-SRCH-05 | New/incoming mail becomes searchable within an agreed indexing SLA (see NFR-PERF-02). | P0 |

### 6.7 Spam, Phishing & Malware Intelligence

| ID | Requirement | Priority |
|---|---|---|
| FR-SPAM-01 | A rule-engine layer applies deterministic, admin/user-configurable filtering rules (e.g., sender, subject, header conditions). | P0 |
| FR-SPAM-02 | A statistical/Bayesian layer scores messages using content and header features. | P0 |
| FR-SPAM-03 | Authentication results (SPF/DKIM/DMARC/ARC) feed directly into the spam/risk score. | P0 |
| FR-SPAM-04 | URL analysis flags known-malicious or suspicious links. | P1 |
| FR-SPAM-05 | An ML classification layer may be introduced as an additive signal, never as the sole gate for accept/reject decisions on authentication or malware findings (see Guiding Principle 4). | P2 |
| FR-SPAM-06 | User feedback (mark as spam / not spam) retrains or adjusts per-user/per-domain filtering signals. | P1 |
| FR-SPAM-07 | Attachments undergo MIME validation, file-type identification, hashing, known-threat lookup, and antivirus scanning before delivery. | P0 |
| FR-SPAM-08 | Archive attachments are inspected recursively (within safe resource limits) rather than trusted opaquely. | P1 |
| FR-SPAM-09 | Dynamic sandboxing/detonation of attachments is an Advanced-tier capability, not required for MVP. | P2 |

### 6.8 Filtering Rules & Mailing-List Intelligence

| ID | Requirement | Priority |
|---|---|---|
| FR-RULE-01 | Users can define custom filter rules (conditions → actions: label, move, forward, delete, star) via API and UI. | P1 |
| FR-RULE-02 | System recognizes mailing-list headers (List-Unsubscribe, etc.) and offers one-click unsubscribe / list-specific handling. | P2 |
| FR-RULE-03 | Abuse-prevention limits (sending rate caps, new-account restrictions, reputation-based throttling) protect platform deliverability. | P1 |

### 6.9 Realtime, Notifications & Sync

| ID | Requirement | Priority |
|---|---|---|
| FR-RT-01 | Clients receive realtime updates (new mail, flag changes, deletions) via WebSocket or equivalent self-hosted push mechanism. | P0 |
| FR-RT-02 | Mobile clients receive push notifications for new mail (via a self-hostable or abstracted push mechanism — see Guiding Principle 5). | P1 |
| FR-RT-03 | Multi-device state stays consistent (e.g., read state, folder moves) across simultaneous sessions without requiring manual refresh. | P1 |
| FR-RT-04 | Webhooks allow third-party/developer integrations to subscribe to mailbox events. | P2 |

### 6.10 Multi-Tenancy & Administration

| ID | Requirement | Priority |
|---|---|---|
| FR-ADMIN-01 | Organizations can be created, each with isolated users, domains, and policies (tenant boundary enforced at the data-access layer, not only the UI). | P1 |
| FR-ADMIN-02 | Organization admins can provision/deprovision users, set quotas, and configure org-wide policy (password policy, MFA requirement, retention). | P1 |
| FR-ADMIN-03 | Admin portal exposes audit logs, delivery/queue health, and domain status. | P1 |
| FR-ADMIN-04 | Platform admins have a separate, more restricted super-admin scope distinct from any single organization. | P0 |
| FR-ADMIN-05 | Cross-tenant data access is impossible by default at the query layer (defense in depth beyond authorization checks). | P0 |

### 6.11 Encryption & Privacy Tiers

| ID | Requirement | Priority |
|---|---|---|
| FR-ENC-01 | **Standard Mode:** TLS in transit; encryption at rest for stored mail; server can run spam/malware scanning, indexing, and optional AI. | P0 |
| FR-ENC-02 | **Enhanced Privacy Mode:** user can opt in to restrict server-side processing (e.g., reduced AI processing, stricter key handling) with clearly documented trade-offs (e.g., reduced search capability). | P2 |
| FR-ENC-03 | **End-to-End Encryption Mode:** message is encrypted on the sender's device and only decryptable on recipient device(s); server never has plaintext access. Uses established, audited open-source cryptographic libraries — no custom cryptography. | P2 |
| FR-ENC-04 | UI/API must never label Standard or Enhanced Privacy Mode as "end-to-end encrypted." | P0 |
| FR-ENC-05 | Key management supports device keys, recovery keys, and key rotation. | P2 |

### 6.12 API, Webhooks & Interoperability

| ID | Requirement | Priority |
|---|---|---|
| FR-API-01 | A REST API covers auth, users, organizations, domains, mailboxes, messages, labels/folders, search, filters, and admin functions. | P0 |
| FR-API-02 | API is versioned and documented (OpenAPI/Swagger) for both human and AI-agent consumption. | P0 |
| FR-API-03 | Third-party mail clients (Thunderbird, Apple Mail, Outlook desktop, etc.) can connect via standards-compliant IMAP and SMTP submission. | P1 |
| FR-API-04 | Webhooks notify external systems of mailbox events (new mail, delivery status). | P2 |

### 6.13 AI Mail System (Optional Layer)

| ID | Requirement | Priority |
|---|---|---|
| FR-AI-01 | AI features (summarization, smart categorization, smart compose, reply suggestions, priority prediction, semantic search, thread summarization, phishing explanation, attachment understanding, inbox cleanup suggestions) are additive and fully optional. | P2 |
| FR-AI-02 | Default AI implementation path is self-hosted/open model runtime (e.g., local inference); external proprietary AI APIs are optional, swappable integrations behind an AI interface, never a hard dependency. | P2 |
| FR-AI-03 | Users/organizations can disable AI processing entirely; this setting must be honestly enforced (no background AI calls when disabled). | P2 |
| FR-AI-04 | AI never makes or overrides deterministic security decisions (spam/reject/quarantine gating remains rule/score-based per Guiding Principle 4; AI may only add advisory signals). | P0 (constraint applies whenever AI ships) |

### 6.14 Observability, Audit & Reliability

| ID | Requirement | Priority |
|---|---|---|
| FR-OBS-01 | All security-relevant actions (login, permission change, domain change, admin action, mail rejection reason) are recorded in an immutable audit log. | P0 |
| FR-OBS-02 | Metrics are exposed for mail flow (accepted/rejected/queued/delivered/bounced), system health, and queue depth. | P1 |
| FR-OBS-03 | Dashboards visualize the above metrics for operators. | P1 |
| FR-OBS-04 | Mail processing is idempotent — re-delivery or retry of the same operation does not create duplicate messages or duplicate side effects. | P0 |
| FR-OBS-05 | Backup and disaster-recovery procedures exist for PostgreSQL, object storage, and search index, with a documented and tested restore process. | P1 |

---

## 7. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-PERF-01 | Performance | Inbound mail from acceptance to inbox visibility should complete within a low-single-digit-second target under normal load (exact SLO to be finalized during architecture task). |
| NFR-PERF-02 | Performance | New mail should be search-indexed within a short, defined SLA after storage (target: near-real-time, finalized during architecture task). |
| NFR-SCALE-01 | Scalability | Architecture must support horizontal scaling of stateless services (API, workers) independent of the database tier. |
| NFR-SCALE-02 | Scalability | System must support the phased evolution in [Section 13](#13-architectural-evolution-phases) without requiring a full rewrite between phases. |
| NFR-SEC-01 | Security | All external network traffic uses TLS; internal service-to-service traffic should be encrypted or run within a trusted network boundary. |
| NFR-SEC-02 | Security | Security-by-design: every subsystem is threat-modeled at design time, not retrofitted. |
| NFR-REL-01 | Reliability | Mail delivery must tolerate transient network failure via durable queues and retries; no message may be silently lost. |
| NFR-REL-02 | Reliability | System should degrade gracefully — e.g., if AI or search is unavailable, core send/receive must continue functioning. |
| NFR-PORT-01 | Portability | Every core dependency must be self-hostable on commodity Linux infrastructure without a proprietary control plane. |
| NFR-PORT-02 | Portability | Storage, AI, and identity subsystems must be swappable via internal interfaces (see Guiding Principle 5). |
| NFR-COMPAT-01 | Compatibility | IMAP/SMTP interfaces must interoperate correctly with major existing mail clients. |
| NFR-MAINT-01 | Maintainability | Codebase should remain a modular monolith until a specific, measured scaling need justifies extraction of a worker/service (avoid premature microservices). |
| NFR-DOC-01 | Documentation | Every subsystem's design decisions must be documented per the "what, why, how, why-Eazzio" rule ([Section 14](#14-engineering--governance-rules)). |

---

## 8. System Architecture Overview

### 8.1 High-Level Component Map

```text
                         Clients (Web / Mobile / Third-party IMAP)
                                        │
                                 Eazzio REST API + Realtime (WebSocket)
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        │                                │                                │
  Identity/AuthZ                   Mail Orchestration                Admin / Org / Domain
  Service                          (compose, rules, policy)          Management
        │                                │                                │
        └───────────────┬────────────────┴───────────────┬───────────────┘
                         │                                │
                SMTP Inbound/Outbound              Search / Indexing (OpenSearch)
                (Postfix-based)                            │
                         │                          Notification Service
                Security Pipeline                          │
                (SPF/DKIM/DMARC/Rspamd/ClamAV)      Object Storage (MinIO)
                         │                                │
                         └──────────────┬─────────────────┘
                                        │
                              PostgreSQL (metadata) + Valkey (cache/session)
```

### 8.2 Inbound Mail Pipeline (Authoritative Flow)

```text
Internet → DNS/MX → SMTP Receiver → TLS Handling → Envelope Validation
  → SPF Check → DKIM Check → DMARC/ARC → MIME Parser → Header Extraction
  → Attachment Analysis → Antivirus Scan → (optional) Sandbox
  → Reputation Analysis → Spam Classification → Phishing Detection
  → Rule Engine → Policy Decision → {Reject | Quarantine | Accept}
  → Accept path: Storage (DB + Search Index + Object Store) → Notification → Mailbox
```

### 8.3 Outbound Mail Pipeline (Authoritative Flow)

```text
User → Eazzio API → Message Validation → HTML Sanitization → MIME Construction
  → DKIM Signing → Outbound Policy → Rate Limiting → Delivery Queue
  → Recipient Domain DNS/MX Lookup → MTA-STS/DANE Policy Check → STARTTLS
  → Certificate Validation → SMTP Delivery
  → {Success → Delivered | Temporary Fail → Backoff → Retry | Permanent Fail → Bounce}
```

### 8.4 Data Architecture

| Store | Responsibility | Preferred Technology Direction |
|---|---|---|
| Relational metadata | Users, orgs, domains, mailboxes, message metadata, recipients, labels, folders, threads, policies, sessions, audit records | PostgreSQL |
| Object storage | Raw MIME, attachments, media, large objects | MinIO or other self-hostable S3-compatible store |
| Search index | Full-text terms, metadata, ranking, filtering | OpenSearch |
| Fast/cache layer | Sessions, caching, rate-limit counters, temporary state, lightweight queues | Valkey |

### 8.5 Labels vs. Folders (Data Model Note)

A message belongs to exactly one folder (hierarchical, interoperable with IMAP) but may carry zero or more labels (flexible metadata, Gmail-inspired). Labels must be implemented as a many-to-many relation referencing the message, not as duplicated copies of the message.

### 8.6 Privacy Tiers

See [FR-ENC-01 through FR-ENC-05](#611-encryption--privacy-tiers). Standard → Enhanced Privacy → E2EE, each with explicitly documented server-visibility guarantees. No tier may borrow the marketing language of a stronger tier.

### 8.7 Deterministic vs. Probabilistic Boundary

```text
Security → Trust Boundary → Deterministic Policy → Optional AI
```

Never: `AI → Decides whether security is valid`. This boundary must be enforced structurally (i.e., AI services should not have write access to accept/reject/quarantine decisions), not merely by convention.

---

## 9. Technology Selection Framework

### 9.1 Selection Sequence

For every technology decision:

```text
Open Standard → Open Source → Self-hostable → No recurring license requirement
  → Strong community → Stable project governance → Security maturity
  → Performance → Scalability → Ease of replacement
```

Price is not the sole criterion; a technically inferior project is not automatically chosen for being free.

### 9.2 License Gate Checklist

Every major dependency must answer:

1. Is the current release actually open source under a recognized license?
2. Can Eazzio self-host it?
3. Can it be used commercially?
4. Does it require a recurring license fee?
5. Does its license create unacceptable obligations for Eazzio?
6. Can Eazzio continue using the selected version if the upstream license changes?
7. Is there an open-source replacement?
8. Can the component be replaced without redesigning the entire system?

### 9.3 Proposed Foundation (subject to the Technology Selection task)

| Layer | Preferred Direction |
|---|---|
| OS | Debian / Ubuntu Server |
| Reverse proxy / web server | Nginx |
| MTA | Postfix |
| IMAP/POP3/LMTP | Dovecot Community Edition |
| Spam filtering | Rspamd |
| Antivirus | ClamAV |
| Database | PostgreSQL |
| Cache / fast KV | Valkey |
| Search | OpenSearch |
| Container engine | Podman |
| Backend services | Python/FastAPI (or equivalent open-source backend) |
| Web frontend | React + Next.js (or equivalent open-source stack) |
| Realtime | WebSocket / self-hosted event infrastructure |
| Metrics | Prometheus |
| Visualization | Grafana OSS |
| Object storage | MinIO (or equivalent self-hostable S3-compatible store) |
| DNS | Self-managed authoritative DNS or open-source DNS infrastructure |
| CI/CD | Self-hosted open-source CI where practical |
| Containers | OCI-compatible |

### 9.4 Technology Categories

- **Category A — Core Open Source:** permanent foundations (PostgreSQL, Nginx, Postfix, Dovecot CE, Rspamd, ClamAV, OpenSearch, Valkey, Podman, etc.).
- **Category B — Open Standards:** protocols/specs, not products (SMTP, IMAP, MIME, DNS, SPF, DKIM, DMARC, ARC, TLS, MTA-STS, TLS-RPT).
- **Category C — Eazzio-Owned Code:** APIs, mailbox rules, authorization, tenant logic, UI, workflows, mail orchestration, policy engine, Eazzio-specific security controls — always built in-house.
- **Category D — Optional External Integrations:** third-party AI, commercial cloud storage, optional SaaS integrations, commercial monitoring, optional external identity providers — never mandatory core dependencies.

---

## 10. Standards Compliance Requirements

Eazzio's mail engine must correctly implement, at minimum:

- **Transport:** SMTP, SMTP Submission, STARTTLS, TLS.
- **Access/Sync:** IMAP (for interoperability); internal clients use the Eazzio API/realtime layer.
- **Message format:** RFC 5322 (Internet Message Format), MIME.
- **Domain authentication:** SPF, DKIM, DMARC; ARC for forwarding/intermediary continuity.
- **Transport security policy:** MTA-STS, TLS-RPT; DANE as optional/advanced.
- **DNS:** MX and supporting record types for the above.

Protocol stack reference:

```text
APPLICATION: REST API · WebSocket/Realtime · Web/Mobile Push
MAIL ACCESS: IMAP · SMTP Submission
MAIL TRANSPORT: SMTP
MESSAGE: RFC 5322 · MIME
AUTHENTICATION: SPF · DKIM · DMARC · ARC
TRANSPORT SECURITY: TLS · STARTTLS · MTA-STS · TLS-RPT · (optional DANE)
NETWORK: TCP/IP · DNS
```

---

## 11. Security Requirements Summary

| Area | Requirement |
|---|---|
| Domain onboarding | New domain must pass DNS verification (MX, SPF, DKIM, DMARC minimum) before activation. |
| Transport | TLS/STARTTLS enforced or preferred per policy on all SMTP connections; certificate validation on outbound delivery. |
| Malware | All attachments pass MIME validation, type identification, hashing, known-threat check, and antivirus scanning before delivery. |
| Spam/Phishing | Multi-layer (rule + statistical + optional ML) scoring; authentication results are a mandatory input signal. |
| AuthN/AuthZ | MFA-capable authentication; hierarchical authorization (Platform → Org → Domain → Mailbox → User); scoped API tokens. |
| Tenant isolation | Cross-tenant data access blocked at the data-access layer, not only the application layer. |
| Encryption | Encryption at rest by default; explicit, honestly-labeled privacy tiers up to E2EE. |
| Audit | Immutable audit log for all security-relevant actions. |
| Abuse prevention | Rate limiting and reputation-based throttling on both inbound acceptance and outbound sending. |
| Dependency security | Every dependency passes the License Gate and is tracked for security/maintainer health (see [Section 9.2](#92-license-gate-checklist) and [Section 14.3](#143-dependency-firewall)). |

---

## 12. Success Criteria

Eazzio Mail is considered architecturally successful when it can:

- send email; receive email; store email; synchronize email; search email; organize email;
- filter spam; scan attachments; authenticate domains; enforce transport security;
- support custom domains; support aliases; support third-party mail clients; provide APIs;
- provide administration; support organizations; protect tenant boundaries;
- recover from failures; expose observability; scale independently;
- operate without proprietary SaaS dependencies;
- operate using self-hostable open-source infrastructure.

### 12.1 Core Feature Matrix (Status Reference)

| Capability | Status |
|---|---|
| Email sending / receiving / SMTP / SMTP Submission | Core |
| IMAP | Core interoperability |
| MIME / TLS / SPF / DKIM / DMARC | Core |
| ARC / MTA-STS / TLS-RPT | Advanced |
| DANE | Optional advanced |
| Spam filtering / Statistical filtering | Core |
| Bayesian filtering | Candidate |
| ML classification | Advanced |
| Malware scanning / Phishing detection / Rule engine | Core |
| Sandboxing | Advanced |
| Search / Full-text indexing / Labels / Folders / Threads / Attachments / Aliases | Core |
| Disposable aliases | Advanced |
| Custom domains | Advanced / Core for business edition |
| API | Core |
| Webhooks | Advanced |
| Realtime synchronization / Push notifications | Core |
| Multi-tenancy | Advanced |
| Admin portal | Core for organization edition |
| Audit logs / Monitoring / Encryption at rest | Core |
| Privacy mode / E2EE | Advanced |
| AI | Advanced |
| Calendar / Contacts / Tasks / Cloud storage / Collaboration | Future |

---

## 13. Architectural Evolution Phases

```text
Phase 1 — Modular Monolith
Phase 2 — Mail Workers (extract inbound/outbound processing)
Phase 3 — Search / Notification / Scan Workers (extract search, notification, AV/spam scanning)
Phase 4 — Independently Scaled Services
Phase 5 — Distributed Multi-Tenant Platform
```

**Rule:** Do not extract a service until a specific, measured scaling or reliability need justifies it. Each phase must be reachable from the previous one without a full rewrite.

### 13.1 Suggested MVP → GA Mapping

| Phase | Suggested Scope | Primary FR IDs |
|---|---|---|
| MVP (Phase 1) | Auth, mailbox core (folders/labels/threads), inbound/outbound SMTP with SPF/DKIM/DMARC, spam+AV scanning, search, web client, REST API, audit logging | FR-AUTH-01…04, FR-MBOX-01…04, FR-IN-01…08, FR-OUT-01…05, FR-SPAM-01…03/07, FR-SRCH-01/05, FR-API-01/02, FR-OBS-01/04 |
| v1 GA (Phases 2–3) | Custom domains, multi-tenancy, admin portal, IMAP interoperability, realtime/push, advanced search, rule engine, backup/DR | FR-DOM-*, FR-ADMIN-*, FR-API-03, FR-RT-*, FR-SRCH-02…04, FR-RULE-*, FR-OBS-02/03/05 |
| Advanced (Phase 4) | Enhanced privacy mode, ML spam signals, sandboxing, disposable aliases, webhooks, optional AI | FR-ENC-02, FR-SPAM-05/09, FR-DOM-04, FR-API-04, FR-AI-* |
| Future Ecosystem (Phase 5+) | E2EE mode, Calendar/Contacts/Tasks/Notes/Storage/Collaboration | FR-ENC-03…05, ecosystem modules (not yet specified as FRs) |

---

## 14. Engineering & Governance Rules

### 14.1 Fundamental Engineering Rule

> Understand the problem first → Select the open standard where one exists → Select the strongest suitable open-source implementation → Use an independent Eazzio implementation where necessary → Document what, why, how, and why-Eazzio → Never allow a convenient proprietary dependency to become an unavoidable core dependency → Build every subsystem so that security, interoperability, reliability, scalability, privacy, and long-term independence are preserved.

### 14.2 What Eazzio Will Not Do

- Blindly copy Gmail's proprietary architecture.
- Reproduce Microsoft's proprietary Exchange implementation.
- Claim Proton's exact security model without implementing the necessary cryptographic guarantees.
- Depend permanently on OpenAI or another proprietary AI provider.
- Make a paid SaaS database, search engine, mail server, observability platform, or hosting provider mandatory.
- Treat a "free tier" SaaS product as equivalent to open source.
- Invent cryptographic algorithms.
- Sacrifice security merely to avoid licensing costs.

### 14.3 Dependency Firewall

No new dependency enters production merely because it is popular. Every major dependency is evaluated for: license, security, maintainer health, community health, self-hostability, commercial-use rights, vendor lock-in, data ownership, migration difficulty, and long-term sustainability. A dependency that fails this policy is replaced or isolated behind an interface.

### 14.4 Vendor Abstraction Pattern (Required for AI Agent Implementation)

Any subsystem with an external or swappable dependency must be implemented behind an internal interface. Example:

```text
Eazzio Storage Interface → MinIO | Local filesystem | S3-compatible storage | Future provider
Eazzio AI Interface       → Local Model | Ollama | Open-source inference server | Optional external API
```

**Directive to AI coding agents:** when implementing any subsystem in [Category D](#94-technology-categories) (optional external integrations), always implement the interface/abstraction first and the concrete adapter second. Do not hard-wire a specific vendor SDK into business logic.

### 14.5 Documentation Architecture

This PRD is a working child of the Master Project Overview and a sibling reference for subsequent technical documents. The full downstream documentation set (to be produced) is:

```text
01. Project Overview
02. Requirements Specification (this PRD formalizes and extends this)
03. System Architecture
04. Open-Source Technology Stack
05. Protocol & Mail Standards
06. Database Architecture
07. Mail Flow Architecture
08. Spam & Filtering Engine
09. Malware & Attachment Security
10. Security Architecture
11. Encryption Architecture
12. Authentication & Authorization
13. API Specification
14. Search & Indexing
15. Storage Architecture
16. Queue & Delivery System
17. Notification & Realtime
18. Multi-Tenancy
19. Domain & DNS Architecture
20. Administration
21. Observability & Audit
22. Backup & Disaster Recovery
23. Web Application
24. Mobile Application
25. AI Mail System
26. Testing Strategy
27. Deployment & Infrastructure
28. License & Dependency Governance
29. Future Eazzio Ecosystem
```

Later documents must remain consistent with this PRD and the Master Project Overview; they expand, not contradict.

---

## 15. Risks and Open Questions

| Risk / Open Question | Impact | Suggested Mitigation |
|---|---|---|
| Self-hosted mail deliverability (IP/domain reputation) is hard to bootstrap | High — mail may land in recipient spam folders | Plan warm-up strategy, monitor DMARC aggregate/forensic reports, consider reputable outbound relay as an optional (non-mandatory) integration |
| Multi-layer spam/AV pipeline adds latency to inbound acceptance | Medium | Define and test against NFR-PERF-01 early; make sandboxing (heaviest step) asynchronous/advanced-tier |
| E2EE mode limits server-side search and AI on affected mail | Medium — expected trade-off | Document clearly in product UI/UX; do not let this trade-off block delivery of Standard/Enhanced modes |
| Avoiding microservice sprawl while still meeting scalability goals | Medium | Enforce the Phase 1–5 evolution discipline in [Section 13](#13-architectural-evolution-phases); require a measured justification before each extraction |
| Exact final tech stack versions/licenses may drift over time (e.g., licensing changes like Redis's) | Medium | Formal, recurring License Gate re-checks per [Section 9.2](#92-license-gate-checklist) and [Section 14.3](#143-dependency-firewall) |
| Scope is very large (mail + business platform + AI + future ecosystem) | High — risk of scope creep in MVP | Strict adherence to the MVP → GA → Advanced → Future phasing in [Section 13.1](#131-suggested-mvp--ga-mapping) |

---

## 16. Glossary

| Term | Meaning |
|---|---|
| MTA | Mail Transfer Agent — software that routes/delivers email between servers (e.g., Postfix) |
| MDA / IMAP server | Software providing mailbox access (e.g., Dovecot) |
| SPF | Sender Policy Framework — DNS-based sender authorization |
| DKIM | DomainKeys Identified Mail — cryptographic message signing |
| DMARC | Domain-based Message Authentication, Reporting & Conformance — policy layer over SPF/DKIM |
| ARC | Authenticated Received Chain — preserves authentication results across forwarding |
| MTA-STS | SMTP MTA Strict Transport Security — DNS/HTTPS-published policy requiring secure transport |
| TLS-RPT | TLS Reporting — reporting mechanism for TLS delivery failures |
| DANE | DNS-Based Authentication of Named Entities — DNSSEC-based certificate association |
| E2EE | End-to-End Encryption — only sender/recipient devices can decrypt content |
| Modular monolith | A single deployable application internally organized into clear module boundaries, as opposed to microservices |
| License Gate | Eazzio's required checklist every dependency must pass before adoption |

---

## 17. Document Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | Draft | Initial PRD derived from Eazzio Mail — Final Master Project Overview (Task 1) |
| 1.1 | Draft | Hardened Section 5.2 into a mandatory, default-deny scope-boundary rule with an explicit list of excluded modules, deferred capabilities, and named "tempting" features an AI agent might otherwise infer from the provider comparison |

---

*This PRD is the authoritative requirements reference for engineering and AI-agent (Antigravity) implementation work until superseded by a newer version. All downstream design documents listed in [Section 14.5](#145-documentation-architecture) must remain consistent with the principles and requirements defined here.*
