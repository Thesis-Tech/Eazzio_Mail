# Eazzio Mail — PDF Feature Reconciliation & Scope Traceability

This matrix maps capabilities found in the reference comparison PDF against the approved Eazzio requirements package (`Docs/PRD.md`, `Docs/ARCHITECTURE.md`, `Docs/LLD.md`).

| Feature / Capability | PDF Reference Origin | Approved Eazzio FR ID | Implementation Status & Boundary |
|---|---|---|---|
| Multi-label tagging without duplication | Gmail | `FR-MBOX-03` | **In Scope (Approved)** — Implemented via `message_labels` many-to-many relation. |
| Fast sub-second search & typeahead | Gmail | `FR-SRCH-01` to `06` | **In Scope (Approved)** — Implemented via `services/search-indexer` + OpenSearch. |
| Inbound rules & filter conditions | Gmail | `FR-RULE-01` to `03` | **In Scope (Approved)** — Implemented via `filters` table and rule evaluator. |
| Disposable domain aliases | Yahoo | `FR-DOM-04` | **In Scope (Approved P2)** — Managed via `domain_aliases` table. |
| Multi-tenant organization & domain admin | Outlook / Zoho | `FR-ADMIN-01` to `06` | **In Scope (Approved)** — Implemented via `services/admin-service` (4-check DNS). |
| Multi-device realtime sync | Outlook | `FR-RT-01` to `03` | **In Scope (Approved)** — Implemented via Eazzio WebSocket gateway. |
| Privacy Tiers & Zero Tracking Pixels | Proton | `FR-ENC-01`, `02` | **In Scope (Approved)** — Implemented (Sanitized HTML & Remote image blocker). |
| True End-to-End Encryption (E2EE) | Proton | `FR-ENC-03` | **Deferred / Coming Soon** — Explicitly marked as disabled in MVP until key management ships. |
| Standard IMAP / SMTP Interoperability | All | `FR-API-03`, `FR-IN-01` | **In Scope (Approved)** — Supported via Postfix/Dovecot Category A adapters. |
| Calendar / Contacts / Tasks Suite | Outlook / Zoho | **Excluded** | **Out of Scope** — Not in email MVP. Recorded as `PROPOSED_FUTURE_MODULE`. |
| Proprietary ActiveSync / MAPI Protocol | Outlook | **Excluded** | **Out of Scope** — Use RFC 5321/5322 & standard REST/WebSocket APIs. |
| Built-in Document Collaboration Suite | Zoho / Google | **Excluded** | **Out of Scope** — Eazzio Mail is dedicated to high-performance messaging. |
| Proton Bridge Local Decryption Daemon | Proton | **Excluded** | **Out of Scope** — Not applicable to initial architecture. |
