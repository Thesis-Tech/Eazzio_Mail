# 🌐 IPv6 Inbound Mail Server Architecture, Testing & ISP Blocking Audit

---

## 1. Technical Concept: IPv6 Direct Inbound vs IPv4 CGNAT

On residential broadband connections (such as Airtel Broadband India):
- **IPv4:** The connection is placed behind Carrier-Grade NAT (CGNAT, `100.64.0.0/10`), sharing a public IPv4 with thousands of subscribers. Incoming unsolicited IPv4 traffic to port 25 cannot route to your computer.
- **IPv6:** Every device on your local network receives a globally unique, routable IPv6 address (e.g. `2401:4900:.../64`). In theory, devices on the internet can connect directly to your IPv6 address without NAT.

---

## 2. Step 1: Verifying IPv6 Port 25 Reachability

To test whether external MTAs can reach your machine on IPv6 port 25:

### 1. Run the Test Listener Script
```bash
./scripts/test-ipv6-inbound.sh
```
This detects your active global IPv6 address and starts a TCP socket listener on port 25:
```text
🌐 Detected Global IPv6 Address: 2401:4900:88a1:f8e:2e0:4cff:fe2d:a73c
🎯 Testing Port: 25 (SMTP)
----------------------------------------------------------------
Running Python3 IPv6 listener on port 25...
✅ Python IPv6 socket bound on [::]:25. Awaiting inbound connections...
```

### 2. Perform External Port Check
From an external IPv6-enabled network or using online tools:
- **Port Checker:** [https://ipv6-test.com/port/](https://ipv6-test.com/port/)
- **Host:** `<YOUR_IPV6_ADDRESS>` (e.g. `2401:4900:88a1:f8e:2e0:4cff:fe2d:a73c`)
- **Port:** `25`

### 3. Expected Results & Interpretation

| Result | Meaning | Next Step |
| :--- | :--- | :--- |
| 🟢 **OPEN / REACHABLE** | Airtel does not block port 25 on your line. | Run `./scripts/setup-ipv6-mailserver.sh` to configure Postfix and DuckDNS. |
| 🔴 **FILTERED / TIMED OUT** | Airtel ISP edge firewall drops inbound TCP port 25 traffic. | Your PC cannot receive direct port 25 SMTP. Use `pnpm mail:poller`. |

---

## 3. Postfix IPv6 Production MTA Configuration (If Port 25 is Open)

If your ISP allows port 25, run the automated setup script:

```bash
# Syntax: ./scripts/setup-ipv6-mailserver.sh <duckdns_subdomain> <duckdns_token>
./scripts/setup-ipv6-mailserver.sh eazzio YOUR_DUCKDNS_TOKEN
```

### What This Configures:
1. **DuckDNS Dynamic AAAA Record:** Updates `eazzio.duckdns.org` with your current IPv6 address (`2401:4900:...`).
2. **Postfix MTA (`/etc/postfix/main.cf`):**
   - `inet_interfaces = all`
   - `inet_protocols = all`
   - `myhostname = eazzio.duckdns.org`
   - `virtual_transport = lmtp:inet:127.0.0.1:2424`
3. **Eazzio Inbound LMTP Ingestion:**
   - Postfix receives the SMTP session on port 25, performs TLS and HELO negotiation, and forwards the raw MIME stream directly into Eazzio's `services/mail-inbound` daemon on `127.0.0.1:2424`.
   - Eazzio's `InboundPipeline` parses the message, validates domain/user in PostgreSQL, runs security checks, and broadcasts to the Web and Mobile UIs.

---

## 4. Technical Blockers Identified on Airtel Residential Broadband

During testing, three fundamental ISP-level and DNS constraints prevent residential PCs from acting as internet-facing mail servers:

1. **ISP Port 25 Filtering:**
   - Airtel residential broadband applies a network firewall policy at the BRAS/gateway level that drops incoming `SYN` packets targeting `TCP 25` on both IPv4 and IPv6 to prevent open relays and botnets.
2. **Dynamic IPv6 Prefix Delegation:**
   - Airtel assigns dynamic `/64` IPv6 prefixes. The address changes upon router reboot or lease renewal (e.g. from `88a3:ed2a:...` to `88a1:f8e:...`), breaking static DNS bindings.
3. **No MX or PTR Records on Dynamic DNS:**
   - DuckDNS only supports `A` and `AAAA` records. DuckDNS **cannot** create custom `MX` records, nor can residential ISPs delegate reverse DNS (`PTR` / FCrDNS) on dynamic residential IP pools.
   - Major sending MTAs (Gmail, Microsoft 365, Yahoo) reject or refuse to route emails to mail hosts that lack proper MX records or have residential dynamic PTR records.

---

## 5. Permanent Zero-Cost Inbound Solution: The Eazzio Poller Bridge

Because residential ISPs block port 25 and lack MX/PTR delegation, the **production-grade zero-cost solution** for Eazzio Mail is the **Inbound Poller Bridge**:

```bash
# 1. Start background services
pnpm dev

# 2. Start the live inbound bridge
pnpm mail:poller
```

- **Receives Real Emails from Gmail:** Generates an active, publicly receivable address (e.g. `eazziotestrahul@emalupe.com`).
- **100% Real Pipeline Execution:** Pulls raw MIME, streams via local LMTP socket (`127.0.0.1:2424`), parses into PostgreSQL, and displays in the web UI (`http://localhost:3000`).
- **Zero Cost & Zero Card Holds Forever.**
