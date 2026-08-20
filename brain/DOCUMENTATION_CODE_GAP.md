# Eazzio Mail — DOCUMENTATION_CODE_GAP.md

**Document Type:** Documentation vs. Codebase Discrepancy & Gap Log  
**Parent Documents:** `Docs/PRD.md` · `Docs/ARCHITECTURE.md` · `Docs/TechStack.md` · `Docs/Security.md`  
**Status:** Baseline Reality Audit (Task-001)

---

## 1. Documentation vs. Code Discrepancy Register

| ID | Documentation Says | Repository Actually Has | Severity | Corrective Action |
|---|---|---|---|---|
| **GAP-001** | Backend database persistence and RLS is fully operational (`TASKS.md` Phase 4 claims). | `PostgresAdapter` and `SupabaseAdapter` are mock stubs returning `[]`. Domain repositories have 0 database implementations. | **CRITICAL** | Implement real PostgreSQL adapter using `pg`/`postgres` and write repository implementations for User, Mailbox, Message, Folder, Label, Domain, and Thread. |
| **GAP-002** | RLS protects all tenant data boundaries (`Security.md` Section 3). | `002_rls_and_security_policies.sql` enabled RLS on 9 tables but only defined policies for 3 (`mailboxes`, `messages`, `audit_log`). 6 tables (`folders`, `labels`, `threads`, `attachments`, `filters`, `domains`) have RLS enabled with 0 policies, blocking non-superuser access. | **CRITICAL** | Create migration `003_complete_rls_policies.sql` adding tenant-scoped policies for all remaining tables. |
| **GAP-003** | OpenSearch query engine delivers Gmail-grade search <400ms (`PRD.md` FR-SRCH-02, `TechStack.md` Section 0). | `services/api/src/api/v1/search.ts` uses an inline `mockSearchAdapter` returning hardcoded dummy strings (`prefix suggestion 1`). No OpenSearch client exists. | **HIGH** | Implement `OpenSearchAdapter` in `packages/infra-adapters` and wire to `services/search-indexer` and `services/api`. |
| **GAP-004** | Web application shell is built and functional (`TASKS.md` Phase 4 claims). | `apps/web` contains only a landing page mockup and `NavigationSidebar.tsx`. `pnpm test` fails in `apps/web` due to module resolution error in `tests/web.test.ts`. `pnpm build` fails due to CommonJS syntax in `postcss.config.js`. | **HIGH** | Fix `postcss.config.js` to ESM export, configure Vitest path resolution for `@eazzio/*` packages, and build out authenticated app routes. |
| **GAP-005** | Admin Portal exists for domain DNS verification and mailbox provisioning (`MODULES.md` Section 4). | `apps/admin` contains only a `README.md` file (0 frontend code). | **HIGH** | Scaffold Next.js admin application in `apps/admin` wired to `services/admin-service`. |
| **GAP-006** | Mobile Flutter application is functional with GoRouter, secure storage, and screens (`TASKS.md`). | `apps/mobile/lib/main.dart` contains a 27-line placeholder displaying static text `Text('Eazzio Mail Mobile')`. | **HIGH** | Build full Flutter application structure with auth, mailbox list, message view, and compose screens. |
| **GAP-007** | Postfix, Dovecot, Rspamd, and ClamAV mail transport pipeline is configured (`TechStack.md` Section 3). | `infra/docker/*` has bare Alpine Dockerfiles without daemon configuration files (`main.cf`, `dovecot.conf`, rspamd rules). Node services do not listen on or communicate with mail sockets. | **HIGH** | Add production-grade configuration files for Postfix, Dovecot, Rspamd, ClamAV and wire LMTP/SMTP transport adapters. |
| **GAP-008** | Node.js 24 LTS runtime baseline specified in `TechStack.md` Section 2. | Host environment is running Node.js `v22.22.1 LTS`. | **LOW** | Node.js 22 LTS is fully compatible with ES2022 and modern TypeScript features; update `TechStack.md` documentation to permit Node 22+ LTS baseline. |
| **GAP-009** | Next.js 16.x baseline specified in `TechStack.md` Section 1. | `apps/web/package.json` uses Next.js `15.1.7`. | **LOW** | Next.js 15.1.7 is stable and standard with React 19; document version baseline in `TechStack.md`. |
| **GAP-010** | DKIM signer performs cryptographic RSA-SHA256 signature injection (`Security.md` Section 5.3). | `DkimSigner` in `services/mail-outbound/src/domain/dkim-signer.ts` injects a placeholder header string. | **MEDIUM** | Implement true RSA-SHA256 DKIM header signing using Node `crypto.createSign('RSA-SHA256')`. |
