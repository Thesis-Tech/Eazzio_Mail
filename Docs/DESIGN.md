# Eazzio Mail — DESIGN.md

**Document Type:** UI/UX Design System & Screen/Flow Specification
**Parent Documents:** `PRD.md` v1.1 · `ARCHITECTURE.md` v1.2 · `AGENTS.md` v1.0 · `DECISIONS.md` v1.0 · `LLD.md` v1.0
**Status:** Draft v1.0 — Phase 3 (Design) deliverable. Implementation (Phase 4) remains on hold per `HLD.md` Section 0.

> **Always use the `ui-ux-pro-max` skill for any design work on this project — every screen, component, or flow produced for Eazzio Mail must be generated through it, not freehand.**

---

## 0. How to Use This Document

This is the visual/interaction counterpart to `LLD.md`: where `LLD.md` defines data shapes and backend logic, `DESIGN.md` defines what the person actually sees and touches — tokens, components, screens, and flows — scoped strictly to `PRD.md`'s `FR-*` IDs (Section 5.2 default-deny rule still applies: no screen exists for a feature without an `FR-*` ID). Every component defined here lives in `packages/ui-kit/` or the relevant `apps/*/src/features/<feature>/` folder per `ARCHITECTURE.md` Section 3.3/3.4.

---

## 1. Design Principles

| Principle | What it means for Eazzio Mail |
|---|---|
| Clarity over density | Inbox-first apps fail when cluttered; every screen leads with the one action the persona is there to do (`PRD.md` Section 3 personas) |
| Speed is a feature | Search, compose, and triage must feel instant — perceived latency budgets in Section 7 exist because of `NFR-PERF-01/02` |
| Honest privacy signaling | Per `DECISIONS.md` D-011, UI must never visually or textually imply E2EE for Standard/Enhanced Privacy Mode — see Section 6.5 |
| Accessible by default | WCAG 2.1 AA baseline (Rule 40) on every surface, not retrofitted |
| One system, three surfaces | Web, Admin, and Mobile (Flutter) share one token set and one component vocabulary — divergence is the exception, not the default |

---

## 2. Design Tokens

### 2.1 Color

```text
--color-bg-primary        (light: #FFFFFF   / dark: #0F1115)
--color-bg-secondary       (light: #F4F5F7   / dark: #16181D)
--color-bg-elevated        (light: #FFFFFF + shadow / dark: #1C1F26)
--color-border             (light: #E2E4E9   / dark: #2A2E37)
--color-text-primary       (light: #14161A   / dark: #EDEEF0)
--color-text-secondary     (light: #5B616E   / dark: #9AA0AC)
--color-brand-primary      #2D5BFF        (Eazzio blue — links, primary actions)
--color-brand-primary-hover #244ACC
--color-accent-mail        #FFA43D        (unread/badge accent)
--color-success            #1E9E5A
--color-warning            #D98A00
--color-danger             #D8394B        (used for spam/malware/reject states — never reused decoratively)
--color-info                #2D8FFF
```

Semantic mapping matters here — `--color-danger` is reserved for actual risk states (`FR-SPAM-*`, `FR-IN-07` reject/quarantine) so users learn to trust the color, not just aesthetic contrast.

### 2.2 Typography

```text
Font family:    Inter (UI), ui-monospace / "JetBrains Mono" (raw-source/headers view, admin diagnostics)
Scale:          12 / 14 / 16 / 18 / 22 / 28 / 36 (px, 1.25 modular-ish scale)
Weight:         400 regular, 500 medium (labels/emphasis), 600 semibold (headings, unread subject)
Line height:    1.4 body, 1.2 headings
```

### 2.3 Spacing & Grid

```text
Spacing scale (px): 4, 8, 12, 16, 24, 32, 48, 64
Base grid:      8px
Content max-width (web reading panes): 720px
Breakpoints:    mobile <640px · tablet 640–1024px · desktop >1024px
```

### 2.4 Radius, Elevation, Motion

```text
--radius-sm  4px   (chips, small buttons)
--radius-md  8px   (cards, inputs)
--radius-lg  12px  (modals, panels)

Elevation: 3 levels only (flat / raised / overlay) — no ad hoc box-shadow values per component
Motion:    150ms ease-out for micro-interactions (hover, toggle), 250ms ease-in-out for panel/modal transitions
           Respect prefers-reduced-motion — disable non-essential transition/animation when set
```

---

## 3. Component Inventory (`packages/ui-kit/components/`)

| Component | Used by | Notes |
|---|---|---|
| `AppShell` | web, admin | Left nav + top bar + content pane; collapses to bottom nav on mobile breakpoint |
| `MailList` | web (Inbox, Search results), admin (audit log list) | Virtualized list, supports bulk-select (`FR-MBOX-07`) |
| `MailListItem` | MailList | Sender, subject, snippet, label chips, star, unread dot |
| `ThreadView` | web | Expand/collapse per message in a thread (`FR-MBOX-04`) |
| `ComposeSheet` | web, mobile | Modal (web) / full-screen (mobile); autosave draft every 5s |
| `LabelChip` | MailList, ThreadView, Compose | Color-coded, matches `labels.color` from `LLD.md` schema |
| `FolderTree` | AppShell sidebar | Hierarchical, drag-to-move messages (`FR-MBOX-02`) |
| `SearchBar` | web, mobile | Typeahead (`FR-SRCH-04`), operator hints (`from:`, `has:attachment`) |
| `DomainVerificationCard` | admin | Shows MX/SPF/DKIM/DMARC status per `LLD.md` Section 5.3 state machine — four discrete indicators, never collapsed into one "verified/not" boolean |
| `PrivacyModeBadge` | Compose, message header | See Section 6.5 — strict, non-negotiable copy rules |
| `RiskBanner` | ThreadView | Shown when `spam_score` crosses quarantine threshold or auth_results has a failure; explains *why*, not just a warning icon |
| `AuditLogTable` | admin | Read-only, filterable, exports CSV |
| `ToastStack` | all | Non-blocking confirmations/errors, auto-dismiss 4s, dismissible early |
| `EmptyState` | MailList, SearchBar results | Every list has a designed empty state — never a bare blank pane (Rule 34 edge-case coverage) |

---

## 4. Screen Inventory (Mapped to `FR-*`)

| Screen | Surface | FR-* | Primary action |
|---|---|---|---|
| Register / Onboarding | web, mobile | FR-AUTH-01 | Create account |
| Login + MFA challenge | web, mobile | FR-AUTH-02 | Authenticate |
| Session/Device manager | web (Settings) | FR-AUTH-03 | Revoke a device |
| Inbox | web, mobile | FR-MBOX-01…04, FR-SRCH-01 | Triage mail |
| Thread view | web, mobile | FR-MBOX-04 | Read/reply |
| Compose | web, mobile | FR-OUT-01 | Send mail |
| Search results | web, mobile | FR-SRCH-01…04 | Find mail |
| Filters/Rules manager | web (Settings) | FR-RULE-01 | Create a filter |
| Domain setup wizard | admin | FR-DOM-01/02 | Verify a custom domain |
| Mailbox/alias management | admin | FR-DOM-03/04 | Provision a mailbox |
| Org policy settings | admin | FR-ADMIN-02 | Set password/MFA policy |
| Audit log | admin | FR-OBS-01, FR-ADMIN-03 | Investigate an action |
| Privacy mode settings | web (Settings) | FR-ENC-01/02 | Choose privacy tier — see Section 6.5 |

**No screen exists in this document for Calendar, Contacts, Tasks, Notes, Storage, or Collaboration** — consistent with `PRD.md` Section 5.2.1 and `DECISIONS.md` D-012. Do not design placeholder screens for these.

---

## 5. Key User Flows

### 5.1 First-Run Onboarding (`FR-AUTH-01`)

```text
Landing → Register (email + password) → Verify email → Optional: enable MFA
  → Optional: connect/verify a custom domain (skippable, defaults to platform domain)
  → Land in empty Inbox with EmptyState guidance ("Send yourself a test message")
```

### 5.2 Triage → Reply (`FR-MBOX-*`, `FR-OUT-01`)

```text
Inbox (MailList) → tap/click MailListItem → ThreadView opens
  → RiskBanner shown IF spam_score/auth failure warrants it (never hidden by default)
  → Reply → ComposeSheet pre-filled (quoted thread, per Section 6.3) → Send
  → Optimistic UI: message appears in Sent immediately; delivery_state updates via realtime (FR-RT-01)
```

### 5.3 Domain Onboarding (`FR-DOM-01/02`)

```text
Admin → Domains → Add Domain → enter domain name
  → DomainVerificationCard renders with 4 pending indicators (MX/SPF/DKIM/DMARC)
  → Each indicator independently polls/updates as DNS propagates (LLD.md Section 5.3 state machine)
  → Domain unusable for send/receive until ALL FOUR are verified — UI must show this
    explicitly ("3 of 4 verified — mailboxes cannot send until DMARC is verified"),
    never imply partial verification is sufficient
```

### 5.4 Spam/Quarantine Review (`FR-SPAM-*`)

```text
Inbox → Spam folder → MailListItem shows reasonCode-derived plain-language explanation
  (e.g. "Failed sender verification (DKIM)") — never just a numeric score to end users;
  the numeric score is available in admin/debug views only
→ Mark as Not Spam → feeds filtering signal per FR-SPAM-06, message moves to Inbox
```

---

## 6. Cross-Cutting UI Rules

### 6.1 Accessibility (Rule 40, WCAG 2.1 AA)

- Minimum contrast 4.5:1 body text, 3:1 large text/icons.
- Every interactive element reachable and operable via keyboard; visible focus ring (`--color-brand-primary` outline, 2px).
- All icons carry an accessible label; decorative icons are `aria-hidden`.
- Screen-reader pass required before sign-off (Rule 79), not just automated contrast checks.

### 6.2 Internationalization Readiness (Rule 41)

- No hard-coded user-facing strings in component code — all copy through a string table, even though i18n isn't v1 scope.
- Dates/times rendered via a locale-aware formatter, sourced from UTC per `LLD.md` Section 7 — never formatted manually.

### 6.3 Compose & Quoting Conventions

- Reply quotes original message body under a collapsed `<details>`-style disclosure, not inlined by default — keeps the visible compose area focused on the new content.
- Autosave draft indicator is always visible during composition ("Saved" / "Saving…") — never silent.

### 6.4 Error & Empty States

- Every error surfaced to the user maps to the `LLD.md` Section 3.1 error code taxonomy — copy is written per error code, not a generic "Something went wrong" for everything.
- `RATE_LIMITED` and `QUOTA_EXCEEDED` get specific, actionable copy (e.g., "You've hit your daily sending limit — resets in 3h"), not a generic failure toast.

### 6.5 Privacy Mode Labeling (Binding — `DECISIONS.md` D-011)

- `PrivacyModeBadge` copy is fixed per tier and may not be edited ad hoc by a design iteration:
  - Standard: **"Standard encryption"** (TLS in transit + encrypted at rest)
  - Enhanced Privacy: **"Enhanced privacy — reduced server processing"**
  - E2EE (when shipped, `FR-ENC-03`): **"End-to-end encrypted"**
- The words "end-to-end encrypted," "E2EE," or a closed-padlock-with-key icon may **only** appear on the E2EE tier badge. No copywriter, designer, or agent may apply that language or iconography to Standard or Enhanced Privacy Mode, even as marketing shorthand.

---

## 7. Performance Budgets (tie to `NFR-PERF-01/02`)

| Interaction | Budget |
|---|---|
| Inbox initial paint (cached session) | < 1.5s |
| MailList scroll → next page load | < 300ms |
| Search results (typeahead) | < 400ms first result |
| Compose → Send confirmation (optimistic UI) | < 150ms perceived, actual delivery tracked async |
| Realtime new-mail badge update | < 2s from server accept (matches NFR-PERF-01 inbox-visibility target) |

---

## 8. Mobile (Flutter) Parity Notes

- Token set (Section 2) is ported 1:1 into a Flutter `ThemeData`/design-token package — no separate mobile-only palette.
- `ComposeSheet` becomes a full-screen route on mobile rather than a modal overlay (small-viewport constraint), but retains identical field order and validation behavior as web.
- Bottom navigation replaces `AppShell`'s left nav below the tablet breakpoint, but the same five primary destinations (Inbox, Search, Compose, Folders, Settings) apply on both surfaces.

---

## 9. Document Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | Draft | Initial DESIGN.md — design tokens, component inventory, screen inventory mapped to FR-* IDs, key user flows, accessibility/i18n/privacy-labeling rules, performance budgets, and mobile parity notes. Mandates the `ui-ux-pro-max` skill for all design work on this project. |
