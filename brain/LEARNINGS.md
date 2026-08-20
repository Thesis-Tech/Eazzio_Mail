# Eazzio Mail — Architectural & UI/UX Learnings (From Git_Pull Reference Projects)

## 1. Project Reference Analysis

### A. Eazzio-Books (`/home/rahul-kumar/Desktop/Git_Pull/Eazzio-Books`)
* **Architecture:** React SPA with modular layout (`Layout.js`, `Navbar.js`, `Sidebar.js`).
* **Design Patterns:**
  - Multi-tenant Organization context (`OrganizationSettings.js`, `ThemeContext.js`).
  - Strict modal/side-panel interactions for item details and transactions (`ItemSidePanel.js`).
  - Status badges for document life-cycles (Draft, Sent, Paid, Overdue).
  - Clean table data presentation with bulk action toolbars and keyboard navigation.

### B. Eazzio-Payroll (`/home/rahul-kumar/Desktop/Git_Pull/Eazzio-Payroll`)
* **Architecture:**
  - `FFMS_BACKEND`: Express.js + Prisma ORM + PostgreSQL with modular services.
  - `FFMS_FRONTEND`: Next.js App Router + Tailwind CSS with dark-mode sidebar (`--sidebar-bg: #081d39`) and card-based statistics dashboard.
  - `ffms_mobile`: Flutter client with Provider state management, offline SQLite caching, and native background tracking.
* **Security & Auth Patterns:**
  - Dedicated JWT authentication middleware with refresh token rotation.
  - Granular RBAC hierarchy matching company/tenant structure.
  - Input validation using Zod/Joi schemas before reaching service layers.

---

## 2. Synthesis for Eazzio Mail

### UI/UX Rules (Applying ui-ux-pro-max):
1. **Unified Eazzio Design System:**
   - Primary Brand Color: `#2D5BFF` (Eazzio Blue)
   - Mail Accent Color: `#FFA43D` (Eazzio Amber/Gold)
   - Dark Mode Surface: `#0F1115` (Deep Slate background), `#16181D` (Surface muted), `#1C1F26` (Surface elevated).
2. **Layout Blueprint:**
   - 3-Pane Desktop Layout: Collapsible Folder Nav (left) + Virtualized Message List (center) + Reading Pane (right).
   - Instant Typeahead Search bar (`<400ms`) prominently fixed in top app bar.
   - Privacy Mode Badge (`Standard encryption`, `Enhanced privacy`, `End-to-end encrypted`) in the header.
3. **Frontend-Backend Contract:**
   - All client communication passes through `@eazzio/contracts` typed API clients.
   - Zero inline business logic in React components; state managed via lightweight hooks and server actions.
4. **Mobile Native Alignment (Flutter):**
   - Seamless offline sync using SQLite metadata caching.
   - Gesture-based triage (swipe to archive / trash) and biometric FaceID/Fingerprint lock.
