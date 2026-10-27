# Eazzio Mail — Feature Roadmap & Achievement Log

> **Project Status:** `alpha` · Last Updated: 2026-09-03
>
> Eazzio Mail is a privacy-first, full-stack email platform built for teams using custom domains. It is designed to match the usability of Gmail, the enterprise capability of Outlook, and the security posture of ProtonMail.

---

## ✅ Achievements (Completed)

### Phase 0 — Audit & Discovery
- [x] **TASK-001** — Full codebase audit: identified mock stubs, missing adapters, and build issues.

### Phase 1 — Foundation & Infrastructure
- [x] **TASK-002** — Production-grade PostgreSQL adapter with connection pooling and parameterized queries.
- [x] **TASK-003** — Row Level Security (RLS) policies for all tenant tables (folders, labels, threads, attachments, filters, domains).
- [x] **TASK-004** — Concrete domain repositories: `PostgresUserRepository`, `PostgresMailboxRepository`, `PostgresMessageRepository`, `PostgresFolderRepository`, `PostgresLabelRepository`, `PostgresThreadRepository`, `PostgresDomainRepository`, `PostgresOrganizationRepository`.
- [x] **TASK-005** — OpenSearch adapter for full-text indexing and Valkey cache adapter with TTL.
- [x] **TASK-006** — Monorepo build tooling: clean `pnpm build`, `pnpm typecheck`, and `pnpm test` across all 15 workspace projects.

### Phase 2 — Backend Services
- [x] **TASK-007** — Database-backed Identity & Auth Service (JWT, TOTP, session revocation, refresh tokens).
- [x] **TASK-008** — REST API (`/v1/`) wired to Postgres + OpenSearch (folders, messages, labels, pagination, search).
- [x] **TASK-009** — Inbound mail pipeline: LMTP reception, MIME parsing, MinIO raw storage, Postgres insertion.
- [x] **TASK-010** — Outbound mail service with RSA-SHA256 DKIM signing and retry queue.
- [x] **TASK-011** — Search indexer event consumer (MailAcceptedEvent → OpenSearch document).
- [x] **TASK-012** — Realtime WebSocket gateway (`/ws`) with per-user channel subscriptions and <1s event push.
- [x] **TASK-013** — Admin service DNS 4-check validation (MX, SPF, DKIM, DMARC) via real Node DNS queries.
- [x] **TASK-014** — AI Gateway adapter (Gemini) with org opt-in policy and privacy-aware enforcement.

### Phase 3 — Web Application
- [x] **TASK-015** — Authenticated Next.js App Router shell: sidebar, header, login, registration, session management.
- [x] **TASK-016** — Mailbox thread list and conversation viewer with multi-message threading.
- [x] **TASK-017** — Rich mail composer: formatting toolbar, font picker, text/background colors, emoji picker, attachments, drag-and-drop, autosave draft.
- [x] **TASK-018** — Theming system: 8+ built-in themes (Cyber Emerald, Eazzio Teal, Midnight Navy, Solar Amber, …), custom CSS-variable-driven, LocalStorage persistence, SSR-safe (no hydration mismatch).
- [x] **TASK-019** — Folder management: Inbox, Sent, Drafts, Starred, Spam, Trash, Archive, Snoozed, All Mail, Scheduled, Important.
- [x] **TASK-020** — Label system: create custom labels with color swatches, apply/remove on threads.
- [x] **TASK-021** — Snooze feature: snooze emails with date/time picker; auto-resurface when snooze expires.
- [x] **TASK-022** — Keyboard shortcuts: C compose, R reply, E archive, # delete, U mark unread, S star, ? shortcuts modal, Cmd+K / Ctrl+K search.
- [x] **TASK-023** — Advanced search with operator syntax: from:, to:, subject:, has:attachment, is:unread, is:starred, label:, before:, after:.
- [x] **TASK-024** — Interactive search filter chips: active filter chip bar with per-chip remove and clear all.
- [x] **TASK-025** — Thread density selector: Default / Comfortable / Compact.
- [x] **TASK-026** — Reading pane modes: None (full-screen list), Right (split), Below (horizontal split) with resize handle.
- [x] **TASK-027** — Smart reply suggestions (AI-powered quick replies in conversation viewer).
- [x] **TASK-028** — Thread summarization (AI Summarize button in conversation header).
- [x] **TASK-029** — Email quote folding: Gmail/Outlook/Apple Mail/plain-text quote detection; hidden behind interactive ... expander pill.
- [x] **TASK-030** — Attachment previews: in-viewer modal for images, PDFs, and text files; ClamAV clean badge; secure download.
- [x] **TASK-031** — Unsubscribe badge: List-Unsubscribe / List-Id header parsing and one-click unsubscribe link in conversation header.
- [x] **TASK-032** — Inbound filter rules: create rules matching sender/subject/body, auto-apply folder moves, labels, stars, read flags.
- [x] **TASK-033** — Webhook event subscriptions: register endpoints, HMAC-SHA256 verification, test ping.
- [x] **TASK-034** — Bounce processing: RFC 3464 DSN parser; delivery_state = 'bounced' auto-update in DB, threaded bounce notifications.
- [x] **TASK-035** — Rate limiting on all API endpoints (Express middleware; prevents backend overload or DoS).
- [x] **TASK-036** — Cloudflare Inbound Email Routing webhook ingestion (/v1/messages/cloudflare-inbound).
- [x] **TASK-037** — Cloudflare + Brevo DNS preset auto-validator in Admin Portal (4-check pass/fail with 1-click guidance modal).
- [x] **TASK-038** — Privacy Mode enforcer: AI processing strictly blocked when enhanced privacy or user opt-out is active.
- [x] **TASK-039** — Mail flow stats & telemetry API (/v1/stats): inbound/outbound volume, delivery state breakdown, bounce rate, queue depth.
- [x] **TASK-040** — Admin portal telemetry dashboard: 24h mail flow chart, storage quota gauge, domain list with status.
- [x] **TASK-041** — Popout window: open any email thread in a detached browser window (/mail/popout/[threadId]).
- [x] **TASK-042** — Security badges in conversation viewer: SPF/DKIM/DMARC pass/fail indicators and ClamAV status.
- [x] **TASK-043** — Connection status indicator (Realtime connected / disconnected / reconnecting banner in header).
- [x] **TASK-044** — Storage quota bar in sidebar (used GB / total GB with progress bar).
- [x] **TASK-045** — Landing page with pricing, FAQ, interactive mail demo, and feature sections.

### Bug Fixes Delivered in This Session
- [x] **BUG-001** — Fixed HTTP 500 on all `/api/messages?folder=*` — root cause: PostgreSQL container stopped; fixed header sanitization to prevent 431 Request Header Fields Too Large.
- [x] **BUG-002** — Fixed React hydration mismatch: DashboardLayout theme state now initializes from default (SSR-safe) and hydrates from localStorage in useEffect.
- [x] **BUG-003** — Fixed email body rendering: quoteRegex was falsely matching `>` inside HTML closing tags (e.g. `<p>`) and collapsing the full message body behind `•••` expander. Fixed by anchoring markdown `>` quotes to start-of-line.
- [x] **BUG-004** — Fixed search filter chips hardcoded dark colors: replaced with CSS variable tokens so chips render correctly in both dark and light themes.

---

## 🚀 Next Features to Add

### Priority 1 — User Experience (Gmail / Outlook Parity)

- [x] **FE-001** — **Contact Autocomplete in Composer**
  Address chips in To:, Cc:, Bcc: autocomplete from previously sent/received addresses stored in contacts index. Matches Gmail's contact suggestion dropdown.

- [x] **FE-002** — **Vacation / Auto-Reply**
  Settings panel out-of-office auto-responder with custom message, start date, end date, and once-per-sender throttle.

- [x] **FE-003** — **Email Alias & Catch-All Routing**
  Create multiple aliases on owned domains (e.g. billing@thesistech.com → primary inbox) and configure catch-all routing for all unmatched addresses.

- [x] **FE-004** — **Scheduled Send**
  Compose an email and schedule delivery for a future date/time (Tomorrow morning, afternoon, next week). Show scheduled emails in /mail/scheduled folder.

- [x] **FE-005** — **Undo Send**
  After clicking Send, an interactive toast with an "Undo" action delays actual SMTP dispatch by 10 seconds, matching Gmail's undo send feature.

- [x] **FE-006** — **Conversation Mute / Unmute**
  Mute a thread so new replies are silently archived without generating inbox notifications. Shows muted indicator badge on thread row and quick-action mute toggle.

- [x] **FE-007** — **Full-Featured Contact Manager**
  Dedicated `/contacts` page with contact cards (name, email, phone, notes, organization), dynamic search, create dialog, and direct compose integration.

- [ ] **FE-008** — **Swipe Actions on Mobile**
  On mobile viewports, implement left/right swipe gestures on thread rows to quickly archive, delete, or star. Match Gmail's mobile UX.

- [x] **FE-009** — **Bulk Action Bar**
  When one or more threads are checkbox-selected, sticky contextual action bar displays at the top with bulk Archive/Unarchive, Delete, Mark Read/Unread, Star, Snooze, Report Spam, and Select All.

- [x] **FE-010** — **Print / Export Thread**
  Print button in conversation header renders a clean print-friendly view; plus "Export as .eml" RFC822 download option on each message.

---

### Priority 2 — Security & Privacy (ProtonMail Parity)

- [ ] **SEC-001** — **End-to-End PGP Encryption**
  In-browser key generation (OpenPGP.js), key import/export, public key directory lookup, encrypt-on-send badge, and automatic decryption for PGP-encrypted inbound messages.

- [ ] **SEC-002** — **S/MIME Certificate Support**
  Upload personal X.509 S/MIME certificates, sign outbound messages, and verify signatures on inbound S/MIME emails.

- [ ] **SEC-003** — **Two-Factor Authentication (2FA) Enforcement**
  Admin-enforced 2FA policy per organization. Support TOTP, WebAuthn/FIDO2 hardware keys, and backup codes.

- [ ] **SEC-004** — **Zero-Knowledge Encrypted Draft Storage**
  Drafts encrypted client-side before upload so the server never sees plaintext draft content.

- [x] **SEC-005** — **Remote Image Proxy**
  Proxy all remote images in HTML emails through privacy-preserving server-side image proxy (`/api/image-proxy`) with aggressive caching and nosniff headers to prevent tracking pixels and IP leaks.

- [ ] **SEC-006** — **Message Expiry (Self-Destructing Emails)**
  Set a TTL on outbound emails; after expiry, the message is permanently purged from server and the recipient sees an expiry notice.

---

### Priority 3 — Integrations & Productivity

- [x] **INT-001** — **Calendar Integration (Google Calendar / CalDAV)**
  Detect event invitations (`.ics` attachments, `BEGIN:VCALENDAR`, `invitation:` subject) and display inline RSVP Yes / Maybe / No action card with calendar icon.

- [ ] **INT-002** — **Google / Outlook OAuth Email Import (Migration)**
  One-click "Import from Gmail / Outlook" IMAP bridge to migrate existing emails into Eazzio Mail mailbox.

- [ ] **INT-003** — **IMAP / POP3 Gateway**
  Allow users to connect Eazzio Mail to third-party clients (Apple Mail, Thunderbird, Outlook desktop) via standard IMAP4 and POP3 protocols.

- [ ] **INT-004** — **Zapier / Make Webhook Triggers**
  Extend webhook system with Zapier-compatible trigger format and pre-built templates for "New Email → Slack", "New Email → Notion", etc.

- [ ] **INT-005** — **AI Smart Triage (Priority Inbox)**
  ML-based inbox prioritization that learns user interaction history and surfaces high-priority emails above low-signal newsletters.

- [ ] **INT-006** — **AI Compose Assist**
  While composing, a right-rail AI panel suggests completions, rephrases for tone (formal/casual/assertive), proofreads grammar, and translates.

- [x] **INT-008** — **Cloudinary Multi-Account Pooled Storage & 500 MB Free Tier**
  Pooled storage manager supporting up to 10 Cloudinary accounts (25 GB each = 250 GB total capacity) with automated 5 GB watermark spillover, dynamic real usage calculation, and strict 500 MB free quota accounting per user.

- [x] **INT-009** — **Inbound Bounce Mail & DSN Handling System**
  Automatic detection of Delivery Status Notifications (DSN, Mailer-Daemon, 550 User Unknown) in `SchedulerWorker` with automatic queue failure status updates and WebSocket real-time delivery failure alerts.

---

### Priority 4 — Reliability & Scale

- [ ] **REL-001** — **Progressive Web App (PWA) / Offline Mode**
  Install Eazzio Mail as a PWA with service worker caching, offline thread reading, and background sync for queued sends.

- [ ] **REL-002** — **Push Notifications (Web Push API)**
  Browser and mobile push notifications for new email arrivals even when the tab is closed, using Web Push API (VAPID keys).

- [ ] **REL-003** — **End-to-End Test Suite (Playwright)**
  Full Playwright E2E test suite covering login, compose, send, receive, search, label, filter, and settings flows against a local Docker stack.

- [ ] **REL-004** — **Multi-Region Deployment & Geo-Routing**
  Deploy API and inbound services to multiple regions (EU, US, APAC). Route inbound mail to the nearest region via GeoDNS.

- [ ] **REL-005** — **Spam Model Training Pipeline**
  Replace static spam score with a user-feedback-driven Bayesian or transformer-based spam classifier trained on per-mailbox signals.

- [ ] **REL-006** — **Rate Limit Dashboard & Abuse Alerting**
  Admin view showing per-IP / per-user rate limit hit metrics, suspicious sender patterns, and automated abuse alerts.

---

### Priority 5 — Platform & Developer

- [ ] **PLT-001** — **Mobile Native App (React Native)**
  iOS and Android native app sharing domain logic and reusing backend API. Gmail-style swipe navigation with push notifications.

- [ ] **PLT-002** — **Multi-Account Switcher**
  Add multiple email accounts (different mailboxes) to one Eazzio session, switchable from the sidebar avatar — like Gmail's multi-account dropdown.

- [ ] **PLT-003** — **Admin Multi-Tenant SSO (SAML / OIDC)**
  Enterprise SSO login using SAML 2.0 or OIDC for organizations that use Okta, Azure AD, or Google Workspace.

- [ ] **PLT-004** — **Public API v2 (REST + GraphQL)**
  Developer-facing public API with API keys, per-key scopes, usage quotas, and GraphQL endpoint for flexible querying.

- [ ] **PLT-005** — **White-Label / Custom Branding**
  Allow enterprise customers to replace Eazzio branding with their own logo, domain, and color palette in the webmail interface.

---

## Architecture Reference

| Layer | Technology | Status |
|---|---|---|
| Web Frontend | Next.js 15, React 19, Tailwind CSS | Active |
| API Gateway | Express.js, TypeScript | Active |
| Identity Service | JWT, TOTP, Postgres sessions | Active |
| Inbound Pipeline | LMTP, MIME Parser, ClamAV | Active |
| Outbound Pipeline | SMTP, DKIM RSA-SHA256, Retry Queue | Active |
| Realtime Gateway | WebSocket, Valkey pub/sub | Active |
| Search | OpenSearch (full-text) | Active |
| AI Gateway | Gemini API, Privacy enforcer | Active |
| Admin Portal | Next.js, DNS 4-check validator | Active |
| Storage | PostgreSQL 15, MinIO (raw MIME) | Active |
| Cache | Valkey (Redis-compatible) | Active |
| Email Ingest | Cloudflare Email Workers → webhook | Active |
| PGP Encryption | OpenPGP.js | Planned |
| Calendar | CalDAV / ics parsing | Planned |
| IMAP/POP3 Gateway | Node IMAP server | Planned |
| PWA / Offline | Service Worker, Background Sync | Planned |
| Mobile App | React Native | Planned |

---

*This file is maintained by the Eazzio development team. Update it after every sprint or major feature milestone.*
