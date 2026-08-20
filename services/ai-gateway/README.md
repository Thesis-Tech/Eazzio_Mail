# services/ai-gateway

## Purpose

Optional, advisory-only AI services (thread summarization, reply suggestions, priority prediction).

## PRD FR-* IDs

- FR-AI-01..04

## Allowed Dependencies

- `packages/contracts`
- `packages/infra-adapters/ai`

## Forbidden Dependencies & Grants

- Write access to accept/reject/quarantine decisions or policy tables (DECISIONS.md D-007, FR-AI-04)
- Packages from `packages/security-pipeline`
