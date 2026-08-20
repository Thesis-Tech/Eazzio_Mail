# apps/web

## Purpose

First-party web client for Eazzio Mail (Next.js 16 + React 19).

## PRD FR-* IDs

- FR-AUTH-01..05
- FR-MBOX-01..07
- FR-OUT-01
- FR-SRCH-01..04
- FR-RULE-01
- FR-ENC-01..02
- FR-RT-01, FR-RT-03

## Allowed Dependencies

- `packages/contracts` (generated API client & event types only)
- `packages/ui-kit` (design system components)

## Forbidden Dependencies

- Any direct imports from `services/*` internals
- Any database drivers or SDKs
