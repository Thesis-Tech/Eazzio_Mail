# services/mail-outbound

## Purpose

Outbound composition validation, DKIM signing, delivery queueing, retry scheduling, and SMTP transmission.

## PRD FR-* IDs

- FR-OUT-01..07

## Allowed Dependencies

- `packages/domain`
- `packages/contracts`
- `packages/security-pipeline` (DKIM signing)
- `packages/infra-adapters/database`
- `packages/infra-adapters/cache`
- `packages/infra-adapters/email-transport`

## Forbidden Dependencies

- Inbound spam/malware scanning
