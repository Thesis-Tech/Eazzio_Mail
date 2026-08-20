# services/identity

## Purpose

Authentication, authorization (RBAC), session management, MFA (TOTP), and account recovery.

## PRD FR-* IDs

- FR-AUTH-01..08

## Allowed Dependencies

- `packages/domain`
- `packages/contracts`
- `packages/infra-adapters/database` (for row persistence)
- `packages/infra-adapters/cache` (rate limiting)

## Forbidden Dependencies

- Supabase Auth (DECISIONS.md D-005 - custom identity only)
- Mailbox or message business logic
