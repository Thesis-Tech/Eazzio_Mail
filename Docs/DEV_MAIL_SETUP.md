# Temporary Mail Transport & Development Relay Setup

This document explains how to run outbound and inbound email workflows during development or staging when DNS access for `eazzio.com` (SPF, DKIM, and DMARC verification records) is pending or blocked.

---

## 1. Why Pluggable Providers Exist

When `eazzio.com` lacks public DNS control:
1. **Outbound**: Sending directly from `@eazzio.com` results in hard bounces or spam drop by recipient servers (Gmail, Outlook, Yahoo) due to failing SPF/DMARC alignment.
2. **Inbound**: Receiving directly on `@eazzio.com` requires MX records pointing to our server.

To unblock testing without rewriting the core mail pipeline, we support pluggable adapters:
- **Outbound**: MailerSend REST/SMTP relay with automatic From-domain rewriting.
- **Inbound**: Generic IMAP mailbox polling for any test inbox/domain.

---

## 2. Configuration via Environment Variables

All behavior is controlled via `.env` variables with safe fallbacks. **No code changes are required.**

### Outbound Options (`OUTBOUND_MAIL_PROVIDER`)

| Provider | Value | Description |
|---|---|---|
| **Postfix (Default)** | `OUTBOUND_MAIL_PROVIDER="postfix"` | Uses the standard Postfix / MTA submission transport. |
| **MailerSend Relay** | `OUTBOUND_MAIL_PROVIDER="mailersend"` | Relays outbound emails through MailerSend's verified domain. |

#### MailerSend Configuration:
```env
OUTBOUND_MAIL_PROVIDER="mailersend"
MAILERSEND_API_KEY="ms_live_xxxxxxxxxxxxxxxxxxxxxx"
MAILERSEND_FROM_DOMAIN="trial-xxxxxxxx.mailersend.net" # Rewrites sender to your verified sandbox/domain
MAILERSEND_SMTP_HOST="smtp.mailersend.net"
MAILERSEND_SMTP_PORT="587"
```

> **Note on Retry & Queueing:** `QueueRunner` wraps both Postfix and MailerSend uniformly. If MailerSend fails or hits a rate limit, the message is automatically queued for exponential backoff retry.

---

### Inbound Options (`INBOUND_MAIL_PROVIDER`)

| Provider | Value | Description |
|---|---|---|
| **GoDaddy IMAP (Default)** | `INBOUND_MAIL_PROVIDER="godaddy"` | Retains the existing GoDaddy IMAP inbound poller. |
| **Generic IMAP** | `INBOUND_MAIL_PROVIDER="generic-imap"` | Polls any standard IMAP mailbox (Gmail, Fastmail, custom domain). |

#### Generic IMAP Configuration:
```env
INBOUND_MAIL_PROVIDER="generic-imap"
IMAP_HOST="imap.your-test-domain.com"
IMAP_PORT="993"
IMAP_TLS="true"
IMAP_USERNAME="tester@your-test-domain.com"
IMAP_PASSWORD="your-secure-password"
IMAP_FOLDER="INBOX"
```

---

## 4. Docker Compose & External PostgreSQL Architecture

In this environment, PostgreSQL is externally managed by the host container **`kc-postgres`** (PostgreSQL 16) running on port `5432`.

### Key Points:
1. **Never kill or overwrite `kc-postgres`**: It houses existing customer/investment databases (`kc_invest_db`) alongside `eazzio_mail`.
2. **Database & Migrations**: The `eazzio_mail` database is owned by `eazzio_user` with all 7 schema migrations applied.
3. **Network Connection**:
   `kc-postgres` is attached to Docker network `compose_default` with network alias `postgres`. Any container in `docker-compose.yml` can address the database at `postgres:5432`.
4. **Compose Isolation**:
   The `postgres` service in `infra/deploy/compose/docker-compose.yml` is assigned `profiles: [bundled-db]`. Running standard `docker compose up -d` starts only the non-conflicting Eazzio stack (`valkey`, `opensearch`, `minio`, `rspamd`, `clamav`, `mailpit`, `postfix`, `dovecot`) without colliding on port 5432.

