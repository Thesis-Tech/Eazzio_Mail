#!/usr/bin/env bash
set -e

echo "════════════════════════════════════════════════════════════════"
echo "🛠️ EAZZIO MAIL — IPV6 PRODUCTION POSTFIX MTA & DUCKDNS SETUP"
echo "════════════════════════════════════════════════════════════════"
echo ""

DUCKDNS_DOMAIN="${1:-eazzio}"
DUCKDNS_TOKEN="${2:-$DUCKDNS_TOKEN}"
LMTP_TARGET="127.0.0.1:2424"

IPV6_ADDR=$(ip -6 addr show scope global | grep -oP '(?<=inet6 )[0-9a-f:]+' | grep -v '^fd' | head -n 1)

if [ -z "$IPV6_ADDR" ]; then
  echo "❌ Error: No global IPv6 address detected on this machine."
  exit 1
fi

echo "🌐 Active Global IPv6: $IPV6_ADDR"
echo "🏷️ Target DuckDNS Domain: ${DUCKDNS_DOMAIN}.duckdns.org"
echo "🎯 Local LMTP Ingest Target: $LMTP_TARGET"
echo ""

# 1. Update DuckDNS AAAA record if token provided
if [ -n "$DUCKDNS_TOKEN" ]; then
  echo "[Step 1] Updating DuckDNS AAAA record..."
  UPDATE_RES=$(curl -s "https://www.duckdns.org/update?domains=${DUCKDNS_DOMAIN}&token=${DUCKDNS_TOKEN}&ipv6=${IPV6_ADDR}&ip=")
  if [ "$UPDATE_RES" = "OK" ]; then
    echo "✅ DuckDNS AAAA record successfully updated to $IPV6_ADDR"
  else
    echo "⚠️ DuckDNS response: $UPDATE_RES (Check your domain and token)"
  fi
else
  echo "ℹ️ [Step 1] Skipping DuckDNS update (DUCKDNS_TOKEN not provided)."
  echo "   To update DuckDNS manually: curl 'https://www.duckdns.org/update?domains=${DUCKDNS_DOMAIN}&token=YOUR_TOKEN&ipv6=${IPV6_ADDR}'"
fi
echo ""

# 2. Check and Install Postfix
echo "[Step 2] Checking Postfix installation..."
if ! command -v postfix >/dev/null 2>&1; then
  echo "Installing Postfix..."
  sudo DEBIAN_FRONTEND=noninteractive apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postfix
fi
echo "✅ Postfix is installed."
echo ""

# 3. Configure Postfix for IPv6 and LMTP forwarding
echo "[Step 3] Configuring Postfix main.cf for IPv6 and Eazzio LMTP forwarding..."

sudo postconf -e "inet_interfaces = all"
sudo postconf -e "inet_protocols = all"
sudo postconf -e "myhostname = ${DUCKDNS_DOMAIN}.duckdns.org"
sudo postconf -e "mydomain = ${DUCKDNS_DOMAIN}.duckdns.org"
sudo postconf -e "myorigin = \$myhostname"
sudo postconf -e "mydestination = \$myhostname, ${DUCKDNS_DOMAIN}.duckdns.org, localhost"
sudo postconf -e "relayhost ="
sudo postconf -e "mynetworks = 127.0.0.0/8 [::ffff:127.0.0.0]/104 [::1]/128"

# Forward all virtual mailbox recipients to Eazzio LMTP daemon
sudo postconf -e "virtual_transport = lmtp:inet:$LMTP_TARGET"
sudo postconf -e "smtputf8_enable = no"
sudo postconf -e "message_size_limit = 26214400"

echo "✅ Postfix configuration applied."
echo ""

# 4. Restart Postfix Service
echo "[Step 4] Starting and enabling Postfix service..."
sudo systemctl restart postfix || sudo postfix reload
sudo systemctl enable postfix || true

echo "✅ Postfix restarted."
echo ""

# 5. Verify Postfix Listening Ports
echo "[Step 5] Checking active Postfix listener..."
if sudo ss -tulpn | grep -q ':25 '; then
  echo "🟢 Postfix is actively listening on Port 25:"
  sudo ss -tulpn | grep ':25 '
else
  echo "⚠️ Warning: Postfix does not appear to be listening on port 25."
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "🎉 POSTFIX IPV6 MTA CONFIGURATION COMPLETED!"
echo "════════════════════════════════════════════════════════════════"
echo "👉 Inbound Postfix Port: TCP 25 (IPv6 & IPv4)"
echo "👉 Forwarding Destination: Eazzio Inbound LMTP ($LMTP_TARGET)"
echo "👉 Ensure your router firewall allows inbound TCP 25 to: $IPV6_ADDR"
echo "════════════════════════════════════════════════════════════════"
