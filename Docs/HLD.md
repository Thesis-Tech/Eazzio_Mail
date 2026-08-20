# Eazzio Mail — HLD.md (High-Level Design Index)

**Document Type:** HLD Package Index — confirms scope, maps requirements to existing docs, records gate status
**Status:** Draft v1.0 — Phase 3 (Design) deliverables confirmed complete; Phase 4 (Implementation) NOT authorized
**Note:** This index does not rewrite or restate the content of `PRD.md`, `ARCHITECTURE.md`, `AGENTS.md`, or `DECISIONS.md`. Those four files are finalized as written. This document exists only to confirm coverage and hold the gate.

---

## 0. Gate Status

> **Phase 4 (Implementation) is on hold.** No application code is authorized. `TASKS.md` exists as a sequenced backlog but execution has not started and will not start until the human sends the explicit instruction **"Gate Approved: Proceed to Phase 4"** (per `AGENTS.md` Section 2.2, `TASKS.md` Section 0).

The four documents below constitute the complete High-Level Design (HLD) package for Eazzio Mail. Each has already been produced, reviewed, and iterated to its current version — no rewrite was performed in response to this request.

---

## 1. HLD Coverage Map

| File | What it defines | Where in the doc | Version |
|---|---|---|---|
| **`PRD.md`** | Core features, user flows, explicit out-of-scope list | Section 6 (all `FR-*` functional requirements) · Section 3 (personas/user flows) · Section 5.2 (default-deny scope boundary, with a named table of "tempting" features an agent might otherwise infer — Section 5.2.3) | v1.1 |
| **`ARCHITECTURE.md`** | Folder structure, layer boundaries, tech stack, data flow | Section 3 (full repo tree) · Section 5 (`api → application → domain ← infra` dependency rules) · Section 3.3 + Appendix A (Category A tech stack + MVP adapter stack) · Section 4 (inbound/outbound/search/AI data flow diagrams) | v1.2 |
| **`AGENTS.md`** | Standing operating rules, code conventions, execution commands | Section 2 (phase-gate process) · Section 3 (stack) · Section 4 (commands) · Section 5 (conventions) · Section 7 (full 117-rule governance set, embedded) | v1.0 |
| **`DECISIONS.md`** | Architectural choices + trade-offs, anti-refactoring record | 13 decision records (D-001–D-013), each with Decision → Rejected alternative → Why → **"An agent must NOT"** | v1.0 |

## 2. Requirement Checklist (from this request)

- [x] `PRD.md` — core features, user flows, explicit out-of-scope list to avoid feature creep → satisfied by PRD.md Sections 3, 6, 5.2.
- [x] `ARCHITECTURE.md` — folder structure, layer boundaries, tech stack, data flow → satisfied by ARCHITECTURE.md Sections 3, 4, 5, Appendix A.
- [x] `AGENTS.md` — standing operating rules, code conventions, execution commands for all sessions → satisfied by AGENTS.md Sections 2–5, 7.
- [x] `DECISIONS.md` — key architectural choices and trade-offs to prevent unauthorized refactoring → satisfied by DECISIONS.md D-001–D-013.
- [x] `TASKS.md` NOT generated/re-triggered as part of this request, and no implementation begun.

## 3. How These Four Interlock (No New Content — Pointers Only)

```text
PRD.md         → WHAT to build            (FR-*/NFR-* IDs, scope boundary)
ARCHITECTURE.md → WHERE it lives           (folders, layers, data flow, stack)
AGENTS.md       → HOW we work, every session (process, conventions, commands, rulebook)
DECISIONS.md    → WHY it's built this way   (rationale, guards against "fixing" it)
        ↓
TASKS.md        → the ordered execution backlog — on hold (Phase 4 not gated)
```

Conflict precedence when documents disagree, unchanged from `AGENTS.md` Section 8: PRD.md → ARCHITECTURE.md → AGENTS.md → a specific `docs/adr/*` entry → in-session chat instructions.

## 4. Next Action

The HLD package is complete. No further HLD document is outstanding. When ready to begin implementation, send:

> **"Gate Approved: Proceed to Phase 4"**

This will unlock `TASKS.md` starting at **T008** (repository & infrastructure scaffold) — the first task after the design-phase deliverables already checked off in `TASKS.md` T001–T007.

---

## 5. Document Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | Draft | Initial HLD.md — index confirming the four HLD documents (PRD, ARCHITECTURE, AGENTS, DECISIONS) are complete and finalized; no content rewritten; Phase 4 gate remains held |
