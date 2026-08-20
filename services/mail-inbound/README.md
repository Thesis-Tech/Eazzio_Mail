# services/mail-inbound

## Purpose

Inbound SMTP receiver orchestration, security pipeline execution, and mailbox handoff.

## PRD FR-* IDs

- FR-IN-01..08
- FR-SPAM-01..09

## Allowed Dependencies

- `packages/domain`
- `packages/contracts`
- `packages/security-pipeline`
- `packages/infra-adapters/database`
- `packages/infra-adapters/storage`
- `packages/infra-adapters/cache`

## Forbidden Dependencies

- Direct OpenSearch indexing logic (consumes via events)
- Outbound delivery logic
