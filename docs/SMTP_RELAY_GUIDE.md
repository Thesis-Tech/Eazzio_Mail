# Eazzio Mail — SMTP Relay & External Delivery Guide

---

## 1. Root Cause Analysis: Why Direct Port 25 Delivery to Gmail Failed

During testing from your local Ubuntu machine, you observed:
1. `Port 25 OPEN` and TCP connections to `gmail-smtp-in.l.google.com:25` succeeded.
2. TLS 1.3 handshake completed with `mx.google.com`.
3. Envelope commands (`MAIL FROM`, `RCPT TO`) were initially accepted.
4. Upon message data submission (`DATA`), Google returned:
   ```text
   550-5.7.1 [2401:4900:88a3:ed2a:2e0:4cff:fe2d:a73c] The IP you're using to send
   550-5.7.1 mail is not authorized to send email directly to our servers. Please
   550-5.7.1 use the SMTP relay at your service provider instead.
   ```

### Why Google Rejects Direct Local Delivery:
- **Dynamic Residential IP Ranges:** Internet Service Providers (ISPs) classify home/broadband IPv4 and IPv6 subnets as residential. Major email receivers (Google, Microsoft 365, Yahoo) subscribe to the Spamhaus PBL (Policy Block List) and block direct unauthenticated SMTP from these ranges to prevent spam from compromised desktop PCs.
- **Missing Reverse DNS (PTR):** Direct MTA delivery on port 25 requires a valid PTR record matching your HELO hostname (e.g. `mail.eazzio.com`), which residential ISPs do not grant.
- **Sender Policy Framework (SPF) Mismatch:** The DNS record for `eazzio.com` is `"v=spf1 include:spf.em.secureserver.net ?all"`. Google checks if the connecting IP matches the SPF record of `eazzio.com`. Because the local IP is not in `secureserver.net`, delivery is rejected.

---

## 2. Production Architecture: Authenticated SMTP Relay

Instead of attempting direct unauthenticated delivery from residential IPs, the application uses an **Authenticated SMTP Submission Relay**:

```text
Eazzio Web / API (Local / Cloud)
  │
  ▼
OutboundService (Signs DKIM, sanitizes HTML, inserts into PostgreSQL outbound_queue)
  │
  ▼
QueueRunner (Asynchronous batch processor with exponential backoff)
  │
  ▼
SmtpAuthenticatedTransport (Nodemailer engine over TLS/STARTTLS on Port 587 / 465)
  │
  ▼
Authenticated Upstream Relay (GoDaddy / Brevo / Resend / Amazon SES / Gmail)
  │
  ▼ (Delivered with authorized SPF, DKIM, and PTR)
Gmail / Outlook / Yahoo Inboxes
```

---

## 3. Supported Relay Providers & Comparison

| Provider | Default Host | Port / TLS | Free Tier / Limits | Best Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **GoDaddy / Secureserver** | `smtpout.secureserver.net` | `587` (STARTTLS) | Included with your domain email | Immediate match for `eazzio.com` existing SPF |
| **Gmail (App Password)** | `smtp.gmail.com` | `587` (STARTTLS) | 500 emails/day | Instant free local testing without domain changes |
| **Brevo (Sendinblue)** | `smtp-relay.brevo.com` | `587` (STARTTLS) | 300 emails/day forever free | Best dedicated free transactional email tier |
| **Resend** | `smtp.resend.com` | `465` (Direct TLS) | 100 emails/day, 3,000/month free | Modern developer-first transactional API |
| **SMTP2GO** | `mail.smtp2go.com` | `587` (STARTTLS) | 1,000 emails/month free | Highly reliable SMTP relay |
| **Amazon SES** | `email-smtp.<region>.amazonaws.com` | `587` (STARTTLS) | 62,000 free/month from AWS | Lowest cost production scale ($0.10/1k) |

---

## 4. Environment Variables Configuration

Configure your chosen relay in `.env` or `services/api/.env`:

### Option 1: Using your `eazzio.com` GoDaddy Mailbox
```env
MAIL_TRANSPORT=relay
SMTP_HOST=smtpout.secureserver.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=rahulkumar@eazzio.com
SMTP_PASSWORD=your_eazzio_mailbox_password
SMTP_FROM_EMAIL=rahulkumar@eazzio.com
SMTP_FROM_NAME="Rahul Kumar"
```

### Option 2: Using Gmail SMTP Relay (with App Password)
1. Go to your Google Account > **Security** > **2-Step Verification** > **App Passwords**.
2. Generate a 16-character App Password for "Mail".
3. Configure `.env`:
```env
MAIL_TRANSPORT=relay
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=your_gmail_address@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx
SMTP_FROM_EMAIL=your_gmail_address@gmail.com
SMTP_FROM_NAME="Eazzio Mail"
```

### Option 3: Using Brevo (Free 300 emails/day)
```env
MAIL_RELAY_PROVIDER=brevo
MAIL_TRANSPORT=relay
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=your_brevo_login
SMTP_PASSWORD=your_brevo_smtp_key
SMTP_FROM_EMAIL=rahulkumar@eazzio.com
SMTP_FROM_NAME="Eazzio Mail"
```

---

## 5. DNS Records Configuration for `eazzio.com`

If sending from `@eazzio.com` via a third-party relay (like Brevo or Resend), merge your DNS records in your domain registrar:

### 1. SPF Record (Merge with existing):
- **Current:** `v=spf1 include:spf.em.secureserver.net ?all`
- **If using Brevo:** `v=spf1 include:spf.em.secureserver.net include:spf.brevo.com ~all`
- **If using Resend:** `v=spf1 include:spf.em.secureserver.net include:amazonses.com ~all`

### 2. DMARC Record:
- **Host:** `_dmarc.eazzio.com`
- **Type:** `TXT`
- **Value:** `v=DMARC1; p=none; sp=none; rua=mailto:dmarc-reports@eazzio.com`

---

## 6. How to Test Local-to-Gmail Delivery

Run the automated test runner:
```bash
# Test with configured credentials targeting your Gmail address:
pnpm mail:test:relay kumarrahulraj468@gmail.com
```

Or compose and send directly in the web dashboard at [http://localhost:3000](http://localhost:3000).
