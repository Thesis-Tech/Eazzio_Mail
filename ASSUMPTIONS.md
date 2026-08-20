# Eazzio Mail — ASSUMPTIONS.md

## Logged Assumptions (AGENTS.md Rule 23)

| ID      | Date       | Assumption                                                                                                                                                | Status    | Impact / Rationale                                                         |
| ------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------- |
| ASM-001 | 2026-08-20 | Monorepo uses pnpm workspaces with Node.js 22+ baseline runtime per TechStack.md.                                                                         | Confirmed | Standardized package manager & toolchain across all packages and services. |
| ASM-002 | 2026-08-20 | Category A infrastructure components (Postfix, Dovecot, Rspamd, ClamAV, Postgres, Valkey, OpenSearch, MinIO) run via Docker Compose in local development. | Confirmed | Enables self-hosted reproducibility from day one.                          |
