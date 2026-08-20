# Eazzio Mail — APP_FLOW.md

**Document Type:** Application Flow Specification (navigation, screen-to-screen transitions, end-to-end user journeys)
**Parent Documents:** `PRD.md` v1.1 · `ARCHITECTURE.md` v1.2 · `AGENTS.md` v1.0 · `DECISIONS.md` v1.0 · `LLD.md` v1.0 · `DESIGN.md` v1.0
**Status:** Draft v1.0 — Phase 3 (Design) deliverable. Implementation (Phase 4) remains on hold per `HLD.md` Section 0.

---

## 0. Why This Document Exists

`DESIGN.md` Section 5 sketched four representative flows. This document is the **complete** navigation and flow map — every screen from `DESIGN.md` Section 4, wired together with every transition, guard condition, and error branch. It exists specifically so `TASKS.md` (or an expanded task list built from it) can be sequenced correctly: a task to "build Compose" is only well-specified once every entry point into Compose and every exit out of it is known.

> **Rule for every contributor, human or AI agent:** a UI task is not ready to implement until its screen appears in this document with its full transition set. If a screen or transition needed for a task isn't here, add it to this document first (same change-control discipline as every other doc in this stack), don't improvise it inline while building.

Every flow below cites the `FR-*` ID(s) it implements and the state machine in `LLD.md` Section 5 it depends on, where relevant.

---

## 1. Global Navigation Map

```text
                              ┌─────────────────────┐
                              │   Unauthenticated    │
                              │  Landing / Login /    │
                              │  Register / Recovery   │
                              └──────────┬───────────┘
                                         │ successful auth (FR-AUTH-02)
                                         ▼
                    ┌────────────────────────────────────────┐
                    │              AppShell (web)              │
                    │  ┌─────────┬─────────┬─────────┬──────┐ │
                    │  │ Inbox   │ Search  │ Compose │Settings│ │
                    │  └─────────┴─────────┴─────────┴──────┘ │
                    │  Folder/Label tree always visible in nav │
                    └───────────────┬──────────────────────────┘
                                    │ (org admin role present — FR-AUTH-06)
                                    ▼
                    ┌────────────────────────────────────────┐
                    │             Admin Portal (apps/admin)    │
                    │  Domains · Mailboxes · Org Policy ·       │
                    │  Audit Log                                │
                    └────────────────────────────────────────┘
```

Mobile (`apps/mobile`) mirrors the same five destinations (Inbox, Search, Compose, Folders, Settings) as bottom navigation, per `DESIGN.md` Section 8. Admin Portal is web-only for MVP — no `FR-*` currently requires a mobile admin surface, so none is designed (Section 5.2 default-deny rule still applies).

---

## 2. Authentication & Onboarding Flow (`FR-AUTH-01…05`)

```text
[Landing]
   ├─ "Sign up" → [Register]
   │     enter email + password
   │     ├─ validation fails → inline field errors (VALIDATION_ERROR, LLD.md 3.1)
   │     └─ success → [Verify Email] (pending state)
   │            └─ email link clicked → [Login] pre-filled, "Verified — please log in"
   │
   └─ "Log in" → [Login]
         enter email + password
         ├─ invalid credentials → generic "Incorrect email or password" (never reveal which field)
         ├─ mfa_enabled = true → [MFA Challenge]
         │        enter TOTP code
         │        ├─ fail (retry, rate-limited after N attempts — Rule 66) → stays on screen
         │        └─ success → [AppShell / Inbox]
         ├─ suspicious login detected (FR-AUTH-05) → [MFA Challenge] forced even if not normally required
         │        + notification event fired to existing sessions
         └─ success (no MFA) → [AppShell / Inbox]

[Login] → "Forgot password?" → [Recovery Request]
      enter email → recovery email sent (always shows same confirmation, regardless of
      whether the email exists, to avoid account enumeration)
      → [Recovery Confirm] (via emailed link) → set new password → [Login]
```

**First-run empty state (`FR-MBOX-01`):** on first successful login, `[Inbox]` renders `EmptyState` ("Send yourself a test message") rather than a bare empty list — no separate "welcome tour" screen is in scope (no `FR-*` covers one).

**Session/device management (`FR-AUTH-03`):** reachable only from `[Settings → Sessions]`, never a forced interstitial — revoking a session other than the current one shows an immediate `ToastStack` confirmation; revoking the *current* session logs the user out and returns to `[Landing]`.

---

## 3. Inbox → Triage → Reply Flow (`FR-MBOX-01…07`, `FR-OUT-01`)

```text
[Inbox] (MailList, folder = inbox, sorted by received_at DESC)
   ├─ tap/click a MailListItem → [ThreadView]
   │     ├─ RiskBanner shown IF spam_score/auth failure warrants it
   │     ├─ "Reply" → [ComposeSheet] (quoted, thread_id preserved) → Send → back to [ThreadView],
   │     │        new message appended, optimistic UI (Section 6, DESIGN.md)
   │     ├─ "Reply All" / "Forward" → same as Reply, differing recipient prefill
   │     ├─ label chip picker → toggles message_labels (many-to-many, no navigation change)
   │     ├─ star toggle → in-place, no navigation change
   │     └─ "Move to folder" → folder picker → message.folder_id updates, item leaves current list
   │
   ├─ multi-select mode (bulk actions, FR-MBOX-07)
   │     select N items → action bar appears (Archive / Delete / Label / Move)
   │     → confirmation only for destructive actions (Delete) → items animate out of list
   │
   └─ [FolderTree] item clicked → [Inbox] re-renders scoped to that folder_id (same screen, new query)
```

**Realtime update rule (`FR-RT-01/03`):** a `MailAccepted` event for the current mailbox inserts a new `MailListItem` at the top of `[Inbox]` without a manual refresh, and increments any folder/label unread badges currently visible — this must work identically whether the event arrives while `[Inbox]` or `[ThreadView]` is the active screen.

---

## 4. Compose & Send Flow (`FR-OUT-01…07`)

```text
Entry points: [Inbox] "Compose" button · [ThreadView] Reply/Reply All/Forward · [Search] "Compose" · deep link (mailto:)

[ComposeSheet]
   fields: To, Cc/Bcc (collapsed by default), Subject, Body, Attachments
   ├─ autosave every 5s → draft row persisted (folder = drafts)
   ├─ attachment added → upload progress inline → on complete, attaches to draft
   ├─ "Send" clicked
   │     ├─ client-side validation fails (no recipient, etc.) → inline error, stays open
   │     ├─ QUOTA_EXCEEDED from server → banner with specific copy (DESIGN.md 6.4), stays open
   │     ├─ RATE_LIMITED from server → banner with retry-after countdown, stays open
   │     └─ accepted by server → [ComposeSheet] closes, optimistic entry appears in [Sent],
   │            delivery_state begins at 'queued' (LLD.md 5.1) and updates live as
   │            MailDelivered/MailBounced events arrive — NO blocking spinner while
   │            actual SMTP delivery happens (NFR-PERF budget, DESIGN.md Section 7)
   │
   └─ "Discard" / navigate away with unsaved changes → confirm dialog if body/subject non-empty,
         otherwise silent discard of empty draft
```

**Bounce handling:** if `MailBounced` arrives for a sent message, `[ThreadView]`/`[Sent]` shows a `RiskBanner`-style inline notice on that specific message ("Delivery failed — recipient server rejected") rather than a generic toast, since the user may view this minutes or hours after sending.

---

## 5. Search Flow (`FR-SRCH-01…05`)

```text
[SearchBar] (available from AppShell top bar on every authenticated screen)
   type query → typeahead suggestions appear after 2+ chars (<400ms budget, DESIGN.md 7)
   ├─ suggestion selected, OR Enter pressed → [Search Results]
   │     results list (same MailListItem component as Inbox)
   │     ├─ empty results → EmptyState with query shown + "Check spelling or try different terms"
   │     ├─ filter chips (folder, label, date range) refine in place, no full navigation
   │     └─ item clicked → [ThreadView] (back button returns to Search Results, preserving query/filters)
   └─ query cleared → returns to whatever screen SearchBar was opened from (not forced to Inbox)
```

**Freshness note (`NFR-PERF-02`):** a message accepted via `MailAccepted` becomes searchable within the indexing SLA; `[Search Results]` does not need a manual "refresh index" action — this is a non-goal, since it would expose internal indexing mechanics with no corresponding `FR-*`.

---

## 6. Filters/Rules Flow (`FR-RULE-01`)

```text
[Settings → Filters] → list of existing filters (condition summary + enabled toggle)
   ├─ "New Filter" → [Filter Builder]
   │     add condition(s) (field/operator/value) → add action(s) (label/move/forward/delete/star)
   │     "Test against existing mail" (preview matches, read-only, no action applied) — optional step
   │     "Save" → filter persisted, priority = last
   ├─ existing filter → edit same [Filter Builder], pre-filled
   ├─ drag to reorder → updates priority
   └─ toggle enabled/disabled → in-place, no navigation change
```

---

## 7. Domain & Admin Flows (`FR-DOM-01…05`, `FR-ADMIN-01…05`)

### 7.1 Domain Onboarding

```text
[Admin → Domains] → "Add Domain" → enter domain name → [Domain Setup Wizard]
   step 1: DNS instructions shown (MX, SPF, DKIM, DMARC records to add — FR-DOM-01)
   step 2: [DomainVerificationCard] — 4 independent indicators (LLD.md 5.3 state machine)
        polls verification_status periodically (or via realtime event DomainVerified)
        ├─ all 4 fail/pending → "Not yet verified — DNS changes can take up to 48h"
        ├─ partial (1-3 of 4) → explicit count shown, mailbox creation blocked with
        │        inline explanation (DESIGN.md 5.3 — never implies partial = usable)
        └─ all 4 verified → domains.activated_at set → "Domain active" →
                 [Admin → Domains → {domain} → Mailboxes] unlocked
```

### 7.2 Mailbox/Alias Management (post-activation)

```text
[Admin → Domains → {domain} → Mailboxes] → "Add Mailbox" → address + quota → created
   → "Add Alias" → alias address + target mailbox (+ optional disposable/expiry — FR-DOM-04) → created
```

### 7.3 Org Policy & Audit

```text
[Admin → Organization Settings] → password policy, MFA requirement, retention → Save
   (changes apply to new sessions/enforcement going forward — does not retroactively
   invalidate existing sessions, matching LLD.md 5.4 session lifecycle: no forced
   transition back to active/invalid outside explicit revoke or expiry)

[Admin → Audit Log] → filterable table (actor, action, date range) → row expand → metadata detail
   (read-only surface — no edit/delete affordance anywhere, matching audit_log's
    no-UPDATE/DELETE grant in LLD.md Section 1.4)
```

---

## 8. Privacy Mode Flow (`FR-ENC-01/02`, binding on `DECISIONS.md` D-011)

```text
[Settings → Privacy] → current tier shown via PrivacyModeBadge (DESIGN.md 6.5 fixed copy)
   ├─ Standard → Enhanced Privacy: confirmation dialog states the trade-off explicitly
   │        ("Reduces server-side search and some AI features") before applying
   ├─ Enhanced Privacy → Standard: no confirmation needed (relaxing, not losing capability)
   └─ E2EE tier: not selectable in MVP (FR-ENC-03 not yet shipped) — option shown
            disabled/greyed with "Coming soon" rather than hidden, so the roadmap is
            visible without implying it's available now
```

---

## 9. Error & Degraded-State Flows (Rule 34, `NFR-REL-02`)

These are not edge cases bolted on — they are first-class flows every screen above must handle.

| Condition | Flow behavior |
|---|---|
| Network loss mid-session | `AppShell` shows a persistent, non-blocking connectivity banner; queued actions (send, label change) retry automatically on reconnect rather than silently failing |
| Search/AI service unavailable | `[SearchBar]`/AI-assist affordances degrade to "temporarily unavailable" state; **Inbox/Compose/send-receive continue working normally** — this is the UI expression of `NFR-REL-02` |
| Realtime channel disconnected | Falls back to periodic polling for new-mail badge until WebSocket reconnects — no user-visible error unless disconnection exceeds a threshold |
| Session expired mid-action (e.g., mid-compose) | Draft is preserved locally; user is prompted to re-authenticate in place rather than losing the draft and being hard-redirected to `[Login]` |
| Concurrent edit (two devices label the same message differently) | Last-write-wins at the data layer; both devices reconcile via the next realtime/poll update — no merge-conflict UI in MVP scope (no `FR-*` covers one) |

---

## 10. Screen Transition Reference Table

For quick lookup when sequencing implementation tasks — every screen from `DESIGN.md` Section 4, with its valid entry and exit points.

| Screen | Entry from | Exit to |
|---|---|---|
| Login | Landing, session expiry, logout | AppShell/Inbox, MFA Challenge, Recovery Request |
| MFA Challenge | Login, suspicious-login trigger | AppShell/Inbox, back to Login (cancel) |
| Recovery Request → Confirm | Login | Login |
| Inbox | AppShell default, FolderTree click, back from ThreadView/Search | ThreadView, ComposeSheet, Search Results |
| ThreadView | Inbox, Search Results, Sent | Inbox/Search (back), ComposeSheet (reply) |
| ComposeSheet | Inbox, ThreadView, Search, deep link | Sent (on send), previous screen (on discard/cancel) |
| Search Results | SearchBar (any authenticated screen) | ThreadView, previous screen (on query clear) |
| Filters list → Builder | Settings | Filters list (on save/cancel) |
| Domain Setup Wizard | Admin → Domains | Admin → Domains → Mailboxes (on full verification) |
| Mailbox/Alias Management | Domain Setup Wizard (post-activation), Admin → Domains | stays within Admin |
| Org Policy Settings | Admin nav | stays within Admin |
| Audit Log | Admin nav | row expand (in place) |
| Privacy Settings | Settings nav | stays within Settings |

---

## 11. Document Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | Draft | Initial APP_FLOW.md — global navigation map, full auth/inbox/compose/search/filters/admin/privacy flows, error/degraded-state flows, and a screen transition reference table, all mapped to FR-* IDs and LLD.md state machines |
