# @eazzio/security-pipeline

## Purpose

Deterministic security checks (SPF, DKIM, DMARC, ARC, spam rules, statistical scoring, malware analysis).

## Allowed Dependencies

- `@eazzio/domain`
- `@eazzio/contracts`

## Forbidden Dependencies

- Must never be imported by `services/ai-gateway`
