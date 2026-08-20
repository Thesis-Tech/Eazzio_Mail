# Eazzio Mail — DECISIONS.md

**Document Type:** Decision Rationale Record (why things are this way)
**Parent Documents:** `PRD.md` v1.1 · `ARCHITECTURE.md` v1.2 · `AGENTS.md` v1.0
**Status:** Draft v1.0
**Purpose:** This document exists so an AI agent — or a human — encountering a decision that looks "suboptimal," "inconsistent," or "worth simplifying" does not silently change it. Every entry below was chosen deliberately, with a rejected alternative that was considered and set aside on purpose.

---

## 0. How to Use This Document

> **The core rule: if a choice below looks wrong to you, that is not evidence it IS wrong. Read the rationale first. If you still believe it should change, propose an ADR (`ARCHITECTURE.md` Section 10) and get explicit human sign-off — do not change it inline while doing something else.**

This is distinct from `docs/adr/*`: an ADR records a **new** decision going forward. `DECISIONS.md` records decisions **already made** — the ones most likely to look, to a fresh agent or reviewer, like an oversight, an inconsistency, or dead weight worth "cleaning up." Every entry follows the same shape:

- **Decision** — what we're doing.
- **Rejected alternative(s)** — what we deliberately did *not* do.
- **Why** — the actual reasoning.
- **An agent must NOT** — the specific "fix" this entry exists to prevent.
- **Source** — where this is also documented, so it isn't only here.

**Rule 116 applies directly here:** if a task or instruction conflicts with an entry below, flag the conflict explicitly and ask — do not silently comply (by "fixing" it) or silently refuse.

---

## 1. Architecture & Process Decisions

### D-001: Modular monolith, not microservices, for Phase 1

- **Decision:** Eazzio Mail starts as a single deployable modular monolith (`services/*` in one deployable unit, or a small number of units), not a microservices architecture.
- **Rejected alternative:** Splitting into many independently deployed services from day one (a natural instinct given the module list — identity, mail-inbound, mail-outbound, search-indexer, notification, admin-service, ai-gateway — looks like "obviously separate services").
- **Why:** Premature microservices add operational overhead (deployment, networking, observability, data consistency) before there is measured load that justifies it. `PRD.md` NFR-MAINT-01 and `ARCHITECTURE.md` Section 13 define a phased evolution (Phase 1 monolith → Phase 2+ extraction) specifically to avoid this trap.
- **An agent must NOT:** propose or scaffold separate deployable services/repos for `mail-inbound`, `search-indexer`, etc. "for cleanliness" before a phase gate authorizes that extraction. The module *folders* stay separate (Section 5 layer rules) — the *deployment unit* does not, until Phase 4.
- **Source:** `PRD.md` Section 13, NFR-MAINT-01; `ARCHITECTURE.md` Section 1, Section 13.

### D-002: Phase-gated waterfall, not agile/free-form iteration

- **Decision:** Work proceeds through explicit phase gates (Planning → Requirements → Design → Implementation → Testing → Deployment → Retro), with no implementation detail provided before Phase 4 is gate-approved.
- **Rejected alternative:** Iterative/agile flow where design and code interleave freely, which is the default instinct for most coding agents and most modern teams.
- **Why:** This project is explicitly optimizing for **auditability of AI-agent output against a fixed spec**, not delivery speed. Interleaving design and code makes it easy for scope and structure to drift from `PRD.md`/`ARCHITECTURE.md` without anyone noticing until much later.
- **An agent must NOT:** start writing code, config, or infra during Planning/Requirements/Design phases even if it would "save time later," and must not treat an approved phase as reopened without an explicit new gate instruction.
- **Source:** `AGENTS.md` Section 2 (Rules 1–4).

### D-003: Single-task loop, not parallel task batches

- **Decision:** One actionable, non-coding-adjacent task is assigned and completed at a time; the agent waits for explicit "Task Completed" before starting the next.
- **Rejected alternative:** Batching several related tasks together for efficiency (the natural instinct when tasks look small and clearly sequential).
- **Why:** This keeps every unit of work individually reviewable and keeps the task/status board (Rule 104) accurate — batching silently breaks the traceability this whole rule set exists to provide.
- **An agent must NOT:** pick up the "next obvious" task on its own initiative because the current one is done and the next seems unambiguous.
- **Source:** `AGENTS.md` Section 2.3, Rule 4.

---

## 2. Technology & Dependency Decisions

### D-004: Open-source-first core, with a named, time-boxed MVP exception — not a full pivot to managed services

- **Decision:** The long-term architectural target remains self-hosted PostgreSQL, MinIO, and self-managed deploy (`infra/deploy/compose/`). Supabase, Cloudinary, Vercel, and Render are adopted **only** as swappable Category D adapters for the MVP phase, per `ARCHITECTURE.md` Appendix A / ADR 0001.
- **Rejected alternative(s):** (a) Building entirely open-source/self-hosted from day one, which was the original plan before MVP cost/speed constraints were introduced. (b) Fully adopting the managed-service stack as the permanent architecture, discarding the open-source-first principle.
- **Why:** Neither extreme fit — (a) was too slow/costly to bootstrap an MVP with zero budget, (b) would violate `PRD.md` Guiding Principle 1 and create the exact vendor lock-in the whole PRD exists to prevent. The adapter-interface pattern already in the architecture made a middle path possible: use managed services now, without the *core* ever importing them directly.
- **An agent must NOT:**
  - Treat the presence of Supabase/Cloudinary/Vercel/Render as license to import their SDKs directly into `services/*/src/application` or `domain/` — they stay behind `packages/infra-adapters/*/interface.ts`.
  - Treat "it's just Postgres underneath" as a reason to skip building or contract-testing `postgres-adapter`/`minio-adapter` in parallel — Section 9.4 of `ARCHITECTURE.md` requires both from day one, not just the managed one.
  - "Simplify" by removing the self-hosted adapters as dead code because they aren't wired into production yet — they are intentionally built early specifically so the migration path is tested, not theoretical.
  - Quietly extend the MVP exception past the v1 GA gate without it being explicitly re-evaluated (Section 9.4, point 4).
- **Source:** `PRD.md` Guiding Principle 1, Section 9.2, Section 14.3; `ARCHITECTURE.md` Section 9, Appendix A.

### D-005: `services/identity` is never delegated to Supabase Auth

- **Decision:** Even though Supabase is used for structured data storage in the MVP, authentication/session/MFA/authorization logic stays entirely inside Eazzio's own `services/identity`.
- **Rejected alternative:** Using Supabase's built-in Auth product, which would reduce initial build effort significantly and is the more "efficient" choice by pure MVP-speed logic.
- **Why:** Identity is the single most expensive subsystem to migrate later — usernames, password hashes, session semantics, and MFA state are deeply entangled with a specific vendor's auth product once adopted. Every other MVP adapter (data, storage, hosting) has a clean swap path; auth does not. This is a deliberately asymmetric decision, not an oversight.
- **An agent must NOT:** propose switching to Supabase Auth (or any other hosted identity provider) as a scope-reduction or velocity improvement without this being raised as an explicit, human-approved ADR — not a routine implementation choice.
- **Source:** `ARCHITECTURE.md` Section 9.3; `PRD.md` FR-AUTH-01…08.

### D-006: IMAP is for third-party interoperability only — it is not the internal application protocol

- **Decision:** First-party clients (`apps/web`, `apps/mobile`, `apps/admin`) talk to the backend exclusively via the Eazzio REST API and realtime/WebSocket layer. IMAP exists so external clients (Thunderbird, Apple Mail, Outlook desktop) can connect.
- **Rejected alternative:** Using IMAP as the single access protocol for everything, including first-party clients, since it's already "the mail protocol" and building a second API surface looks redundant.
- **Why:** IMAP is a 1980s-designed sync protocol poorly suited to modern realtime UX, push notifications, and rich API semantics (labels vs. folders, threading heuristics, admin operations). Building the API-first layer as primary — with IMAP as a compatibility layer — is what lets Eazzio's own UX evolve independent of IMAP's constraints.
- **An agent must NOT:** route `apps/*` traffic through IMAP "since the mail server already speaks it," or treat the REST/WebSocket API as a redundant duplicate of IMAP that could be dropped for the first-party clients.
- **Source:** `PRD.md` Guiding Principle 6; `ARCHITECTURE.md` Section 3.4, Section 4.

### D-007: Deterministic security decisions are never delegated to AI/ML

- **Decision:** SPF/DKIM/DMARC verification, spam/reject/quarantine gating, and malware decisions are rule- and score-based. AI/ML may add advisory signals but has no write path to the accept/reject/quarantine decision.
- **Rejected alternative:** Letting an ML classifier make or override the final accept/reject decision, which is a common and often more "accurate" approach in commercial spam filtering.
- **Why:** Explainability, auditability, and predictable failure modes matter more here than marginal accuracy gains — a rule-based pipeline can be reasoned about, tested, and defended; a black-box ML gate cannot, especially for a self-hosted platform without a large ops team to babysit model drift.
- **An agent must NOT:** give `services/ai-gateway` write access to policy/decision tables, or restructure the spam pipeline so an ML score alone determines accept/reject, even if it would measurably improve a benchmark.
- **Source:** `PRD.md` Guiding Principle 4, FR-AI-04; `ARCHITECTURE.md` Section 4.4, Section 5.1.

### D-008: No custom cryptography, no custom mail transport protocol

- **Decision:** All cryptography and transport use established, audited, standard implementations (TLS, SPF/DKIM/DMARC, IMAP/SMTP). Eazzio never invents its own algorithm or protocol.
- **Rejected alternative:** Designing a proprietary, "more efficient" internal protocol or encryption scheme tailored to Eazzio's exact needs.
- **Why:** This isn't a corner an MVP or a clever agent gets to cut for elegance — unaudited cryptography and non-standard transport are a correctness and security risk disproportionate to any efficiency gained, and standards compliance is required for interoperability with the rest of the email ecosystem anyway.
- **An agent must NOT:** propose a custom encryption scheme "optimized for our use case," even inside `services/ai-gateway` or a seemingly isolated feature like disposable aliases.
- **Source:** `PRD.md` Guiding Principle 3, Section 10.

---

## 3. Data Model Decisions

### D-009: A message has one folder but many labels — not duplicated per label

- **Decision:** Folder is a single-parent hierarchical placement (IMAP-compatible); labels are a many-to-many relation referencing the same underlying message row/object, never a duplicated copy.
- **Rejected alternative:** Treating labels as "virtual folders" implemented by copying the message into multiple folder-like containers, which is a simpler mental model and easier to reason about naively.
- **Why:** Duplicating messages per label multiplies storage, breaks single-source-of-truth for read/flag state, and creates sync/consistency bugs across devices. The many-to-many relation is more work up front and is the correct model.
- **An agent must NOT:** "simplify" the schema by denormalizing labels into per-label message copies, even if a specific query looks faster that way — solve query performance with indexing, not denormalization of this relationship.
- **Source:** `PRD.md` FR-MBOX-03; `ARCHITECTURE.md` Section 8.5.

### D-010: `search-indexer` writes to the search index; `api` reads from it — never crossed

- **Decision:** Only `services/search-indexer` writes to OpenSearch (consuming `MailAccepted`/similar events); only `services/api` queries it for user-facing results.
- **Rejected alternative:** Letting `services/api` write directly to the index when convenient (e.g., for a quick "reindex on demand" endpoint), since it already has a search client available.
- **Why:** A single writer keeps index-consistency reasoning simple and matches the event-driven flow the rest of the architecture depends on. Multiple writers is exactly the kind of shortcut that becomes an untraceable bug months later.
- **An agent must NOT:** add a direct OpenSearch write call inside `services/api` for convenience — route it through an event to `search-indexer` instead, even for admin/debug tooling.
- **Source:** `ARCHITECTURE.md` Section 4.3.

---

## 4. Privacy & Labeling Decisions

### D-011: Privacy tiers are honestly labeled — Standard/Enhanced Privacy mode is never called "end-to-end encrypted"

- **Decision:** TLS-in-transit plus encryption-at-rest is described exactly as that — never marketed or documented internally as E2EE. E2EE is a distinct, separately implemented mode (FR-ENC-03).
- **Rejected alternative:** Using "encrypted" or "private" loosely across all tiers in UI copy or docs, since users (and agents writing copy) often don't distinguish the tiers precisely.
- **Why:** This is a trust and legal-exposure issue, not a copy nitpick — claiming E2EE without the server-side plaintext-inaccessibility guarantee it implies is a materially false claim about user privacy.
- **An agent must NOT:** write UI copy, docs, or marketing text that says "end-to-end encrypted" for Standard or Enhanced Privacy Mode, even as a shorthand or "it's basically the same thing" simplification.
- **Source:** `PRD.md` Guiding Principle 8, FR-ENC-01…04.

---

## 5. Scope Decisions

### D-012: Calendar, Contacts, Tasks, Notes, Storage, Collaboration are excluded from MVP/v1 — not merely deprioritized

- **Decision:** These modules have zero `FR-*` IDs and zero folders in `ARCHITECTURE.md`. They are not "later sprints of the same plan" — they require a PRD amendment before any code exists for them.
- **Rejected alternative:** Building lightweight versions of these modules early "since they're part of the eventual vision anyway" and the comparison to Gmail/Outlook/Zoho invites it.
- **Why:** This is the single biggest scope-creep risk identified for this project (`PRD.md` Section 5.2.3) — the provider comparison that inspired Eazzio is architectural inspiration, not a feature backlog.
- **An agent must NOT:** scaffold a `services/calendar/` or similar folder, even as an empty placeholder "for future use," without a PRD amendment adding the corresponding `FR-*` IDs first.
- **Source:** `PRD.md` Section 5.2, Section 5.2.1; `ARCHITECTURE.md` Section 8.

### D-013: Documents are embedded, self-contained files — not a web of cross-referenced fragments

- **Decision:** `ARCHITECTURE.md` embeds ADR 0001 in full (Appendix A) rather than linking to a separate file; `AGENTS.md` embeds the full 117-rule governance set rather than referencing an attachment.
- **Rejected alternative:** Keeping each decision/rule set in its own small file and cross-referencing, which is more "modular" by conventional documentation practice.
- **Why:** For a set of documents an AI agent re-reads at the start of every session (`AGENTS.md` Section 0), self-containment beats modularity — it removes the risk of an agent reading one file and missing critical context that only exists in a separate, unlinked file it didn't think to open.
- **An agent must NOT:** "clean up" these documents by splitting embedded content back out into separate linked files for tidiness — the duplication-avoidance instinct is wrong here specifically because these are agent-facing operational documents, not conventional reference docs.
- **Source:** `ARCHITECTURE.md` Section 11 note; `AGENTS.md` Section 7 preamble.

---

## 6. What to Do When You Disagree With a Decision Here

1. Do not change it inline while doing unrelated work.
2. Re-read the **Why** — if the reasoning was clearly about a constraint that no longer applies (e.g., the MVP phase has genuinely ended), that's a legitimate trigger for re-evaluation, not evidence the original choice was a mistake.
3. Write an ADR (`ARCHITECTURE.md` Section 10) proposing the change, including what in this document it would supersede.
4. Get explicit human sign-off (per Rule 19's change-control discipline) before implementing.
5. Once accepted, update the relevant `D-*` entry here to point to the new ADR rather than deleting the old entry — the history of *why we changed our mind* is as valuable as the original rationale.

---

## 7. Document Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | Draft | Initial DECISIONS.md — 13 decision records capturing rationale behind architecture, technology, data-model, privacy, and scope choices already made across PRD.md, ARCHITECTURE.md, and AGENTS.md |
