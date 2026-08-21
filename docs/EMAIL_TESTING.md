# Eazzio Mail — Testing & Operational Modes Guide

---

## Overview

Eazzio Mail supports **three decoupled operational modes**. A developer can run, test, and develop the full mail application locally with **₹0 server cost, zero credit cards, and zero external dependencies**.

```mermaid
graph TD
    subgraph Mode 1: LOCAL (Default / Free / Offline)
        UI1[Web UI :3000] --> API1[API :8080]
        API1 --> OS1[OutboundService]
        OS1 --> Q1[PostgreSQL Queue]
        Q1 --> QR1[QueueRunner]
        QR1 --> MP1[Local Mailpit :1025 / Local Inbound Daemon :3424]
    end

    subgraph Mode 2: RELAY (Optional Real Gmail Delivery / Free Tier)
        UI2[Web UI :3000] --> API2[API :8080]
        API2 --> OS2[OutboundService]
        OS2 --> Q2[PostgreSQL Queue]
        Q2 --> QR2[QueueRunner]
        QR2 --> SAT[SmtpAuthenticatedTransport :587 / :465]
        SAT --> RELAY[Free Relay: Brevo / Gmail App Password / SMTP2GO]
        RELAY --> GMAIL2[Real Gmail Inbox]
    end

    subgraph Mode 3: DIRECT (Production Cloud / Self-Hosted VPS)
        UI3[Web UI] --> API3[API]
        API3 --> OS3[OutboundService]
        OS3 --> Q3[PostgreSQL Queue]
        Q3 --> QR3[QueueRunner]
        QR3 --> DMT[DirectMtaEmailTransport :25]
        DMT -->|Port 25 with Static IP + PTR| GMAIL3[Global Inboxes]
    end
```

---

## 1. Mode 1: LOCAL Mode (Default for Development — ₹0 Cost)

**Use Case:** Everyday development, feature work, frontend UI testing, multi-user mailbox verification, and automated tests.

### Configuration (`.env.local`)
```env
EMAIL_MODE=local
MAIL_TRANSPORT=local
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_HELO_NAME=mail.eazzio.com
SMTP_FROM_EMAIL=rahulkumar@eazzio.com
SMTP_FROM_NAME="Rahul Kumar"
```

### How to Run:
```bash
# 1. Start local Docker dependencies (Postgres, Valkey, Mailpit)
docker compose -f infra/deploy/compose/docker-compose.yml up -d

# 2. Run the automated local test suites
pnpm mail:test:local
pnpm mail:test:dual
pnpm mail:test:multi-user

# 3. Start Web and API servers
pnpm --filter @eazzio/api start
pnpm --filter @eazzio/web dev
```
- **Web UI:** [http://localhost:3000](http://localhost:3000)
- **API Health:** [http://localhost:8080/health](http://localhost:8080/health)
- **Local Mailbox Viewer (Mailpit):** [http://localhost:8025](http://localhost:8025)

---

## 2. Mode 2: RELAY Mode (Optional Real Gmail Testing at ₹0 Cost)

**Use Case:** Sending a real email to `kumarrahulraj468@gmail.com` from your local machine without a VPS or server IP.

Because home broadband IPv4/IPv6 addresses are blocked by Gmail's anti-spam policy for direct port 25 submissions, you use an authenticated relay over port 587.

### Free Provider Options (No Credit Card Required)

| Provider | Free Quota | Setup Method |
| :--- | :--- | :--- |
| **Gmail App Password** | **500 emails/day** | Go to Google Account > Security > 2-Step Verification > App Passwords > Generate 16-character key. |
| **Brevo (Sendinblue)** | **300 emails/day** (Forever Free) | Create free account at brevo.com > SMTP & API > Generate SMTP Key. Zero credit card required. |
| **SMTP2GO** | **1,000 emails/month** (Free) | Create free account at smtp2go.com > Add SMTP user. Zero credit card required. |
| **GoDaddy / Secureserver** | Included with domain | Use your `rahulkumar@eazzio.com` mailbox password (matches domain SPF). |

### Configuration (`.env.local`)
```env
EMAIL_MODE=relay
MAIL_TRANSPORT=relay

# Example: Using Gmail App Password (Free)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=youraccount@gmail.com
SMTP_PASSWORD=your_16_char_app_password
SMTP_FROM_EMAIL=youraccount@gmail.com
SMTP_FROM_NAME="Rahul Kumar"

# Example: Using Brevo (Free)
# MAIL_RELAY_PROVIDER=brevo
# SMTP_HOST=smtp-relay.brevo.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USERNAME=your_brevo_login
# SMTP_PASSWORD=your_brevo_smtp_key
# SMTP_FROM_EMAIL=rahulkumar@eazzio.com
```

### How to Test:
```bash
# Test external delivery to your Gmail address
pnpm mail:test:relay kumarrahulraj468@gmail.com
```

---

## 3. Mode 3: DIRECT Mode (Production Self-Hosted VPS Deployment)

**Use Case:** When Eazzio Mail is deployed in production on a cloud server/VPS.

### Requirements:
1. Cloud VPS (e.g. AWS EC2, DigitalOcean, Hetzner, Linode) with static public IPv4/IPv6.
2. Reverse DNS (PTR record) configured in the VPS control panel pointing to `mail.eazzio.com`.
3. DNS TXT records for SPF (`v=spf1 ip4:<SERVER_IP> ~all`), DKIM (`default._domainkey.eazzio.com`), and DMARC (`_dmarc.eazzio.com`).

### Configuration (`.env.production` on server)
```env
EMAIL_MODE=direct
MAIL_TRANSPORT=direct
SMTP_HELO_NAME=mail.eazzio.com
```

### How to Test:
```bash
pnpm mail:test:external kumarrahulraj468@gmail.com
```

---

## 4. Test Script Reference

| Command | Operational Mode | What It Tests |
| :--- | :--- | :--- |
| `pnpm mail:test:local` | **LOCAL** | Local SmtpSubmissionTransport ➔ Mailpit (1025) ➔ Message capture & attachments. |
| `pnpm mail:test:dual` | **LOCAL** | Two isolated instances (`mail-a.test` ➔ `mail-b.test`) with separate DBs, LMTP daemons, and storage. |
| `pnpm mail:test:multi-user` | **LOCAL** | User identity isolation, anti-spoofing enforcement, and header validation. |
| `pnpm mail:test:relay <to>` | **RELAY** | Upstream authenticated submission over TLS (587) targeting real external inboxes. |
| `pnpm mail:test:external <to>` | **DIRECT** | Direct port 25 MX resolution and handshake against remote mail exchangers. |
