# Eazzio Project Structure Architecture (Learnings from /home/rahul-kumar/Desktop/Git_Pull)

## 1. Project Organization Blueprint Across Eazzio Ecosystem

### A. Eazzio-Payroll Structure Analysis
The multi-platform repository in `Git_Pull/Eazzio-Payroll` organizes systems cleanly into:
1. `Documentation/` — Comprehensive design, deployment, database, security, and API documentation index.
2. `FFMS_BACKEND/backend/` — Express + Prisma backend with `src/{controllers, routes, middleware, services}`.
3. `FFMS_FRONTEND/frontend/` — Next.js App Router frontend with `app/`, `components/`, `lib/`, `types/`, and `tailwind.config.ts`.
4. `ffms_mobile/` — Flutter mobile application with `lib/{core, models, providers, screens, services, widgets}` and platform shells (`android/`, `ios/`, `web/`).

### B. Eazzio-Books Structure Analysis
1. `documentation/` — Database schemas, API docs, user manual.
2. `backend-books/` — Express backend with database models, controllers, and scripts.
3. `frontend-books/` — React frontend with components, contexts, layouts, and styles.

---

## 2. Eazzio Mail Monorepo Project Structure Standard

To combine high-performance monorepo workspaces (`pnpm workspace`) with the modular clarity from the Git_Pull reference structure:

```
Eazzio_Mail/
├── Docs/                           # Canonical specifications (PRD, ARCHITECTURE, DESIGN, LLD, etc.)
├── brain/                          # AI context, learnings, and architectural decisions
│   ├── LEARNINGS.md
│   └── STRUCTURE_LEARNINGS.md
├── TASK_IMPLEMENTATION.md          # Action-step task tracker with granular checkmarks
│
├── apps/
│   ├── web/                        # Next.js 15 Web Client (End-user mail portal)
│   │   ├── src/{app, components, lib, hooks, types}
│   │   └── tailwind.config.js
│   ├── admin/                      # Next.js 15 Admin Portal (Domain management & audit)
│   │   └── src/{app, components, lib, types}
│   └── mobile/                     # Flutter / Native Mobile Client (Matching ffms_mobile structure)
│       └── lib/{core, models, providers, screens, services, widgets}
│
├── services/                       # Backend Microservices (Node.js 22 LTS / Express)
│   ├── identity/                   # Custom JWT + Argon2id + TOTP MFA
│   ├── api/                        # Mailbox REST API & Search query surface
│   ├── mail-inbound/               # Postfix handoff, MIME parser, security decide()
│   ├── mail-outbound/              # Compose sanitizer, DKIM signer, exponential backoff queue
│   ├── search-indexer/             # Single-writer OpenSearch document projector
│   ├── notification/               # Realtime SSE/WebSocket channel hub & quota alerts
│   ├── admin-service/              # Domain 4-check DNS state machine & Org provisioning
│   └── ai-gateway/                 # Opt-in AI proxy (Summarize & Smart Reply)
│
├── packages/                       # Shared Zero-Dependency Workspace Packages
│   ├── domain/                     # Immutable domain models & value objects
│   ├── contracts/                  # OpenAPI 3.1 & typed event schemas
│   ├── infra-adapters/             # Database, storage, cache, ai, email-transport interfaces
│   ├── security-pipeline/          # Deterministic decide() security gate
│   └── ui-kit/                     # Shared UI tokens (colors, typography, badges)
│
└── infra/                          # Infrastructure & Deployment
    ├── docker/                     # Postfix, Dovecot, Rspamd, ClamAV, Postgres, Valkey, OpenSearch, MinIO
    ├── deploy/                     # Docker compose and cloud run manifests
    └── observability/              # Prometheus and Grafana dashboards
```
