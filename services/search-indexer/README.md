# services/search-indexer

## Purpose

Consumes MailAccepted events and indexes documents into OpenSearch.

## PRD FR-* IDs

- FR-SRCH-01
- FR-SRCH-05

## Allowed Dependencies

- `packages/contracts`
- `packages/infra-adapters/database`

## Forbidden Dependencies

- User-facing search query serving (DECISIONS.md D-010 - query serving belongs to services/api)
