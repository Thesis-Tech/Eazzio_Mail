# Eazzio Mail — RISKS.md

## Live Risk Register (AGENTS.md Rule 26)

| ID      | Date       | Risk Description                                                                 | Likelihood | Impact   | Mitigation Strategy                                                                                                                  | Status    |
| ------- | ---------- | -------------------------------------------------------------------------------- | ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| RSK-001 | 2026-08-20 | Supabase 500MB free tier or Cloudinary 25GB free tier limit exceeded during MVP. | Medium     | High     | Implement usage monitoring in observability dashboards with alert thresholds (Appendix A.3); build self-hosted adapters in parallel. | Active    |
| RSK-002 | 2026-08-20 | Outbound deliverability reputation bootstrap challenges on new IP/domains.       | High       | High     | Enforce strict domain 4-check DNS gate (FR-DOM-02), rate-limiting for new accounts, and DKIM key custody.                            | Active    |
| RSK-003 | 2026-08-20 | Accidental leakage of Supabase Auth into application identity logic.             | Low        | Critical | Structurally isolated custom identity in `services/identity` (DECISIONS.md D-005).                                                   | Mitigated |
