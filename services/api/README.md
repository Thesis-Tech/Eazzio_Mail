# services/api

## Purpose

Core REST API & WebSocket realtime gateway for Eazzio Mail.

## PRD FR-* IDs

- FR-API-01..04
- FR-MBOX-01..07
- FR-SRCH-01..04 (Query surface only)
- FR-RULE-01
- FR-RT-01

## Allowed Dependencies

- `packages/domain`
- `packages/contracts`
- `packages/infra-adapters/*` (via interfaces only)

## Forbidden Dependencies

- Direct SMTP/IMAP protocol handling
- Direct write access to OpenSearch (DECISIONS.md D-010)
