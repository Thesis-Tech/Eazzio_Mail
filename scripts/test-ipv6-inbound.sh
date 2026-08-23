#!/usr/bin/env bash
set -e

echo "════════════════════════════════════════════════════════════════"
echo "🔍 EAZZIO MAIL — IPV6 PORT 25 INBOUND REACHABILITY TESTER"
echo "════════════════════════════════════════════════════════════════"
echo ""

IPV6_ADDR=$(ip -6 addr show scope global | grep -oP '(?<=inet6 )[0-9a-f:]+' | grep -v '^fd' | head -n 1)

if [ -z "$IPV6_ADDR" ]; then
  echo "❌ Error: No global IPv6 address detected on this machine."
  exit 1
fi

echo "🌐 Detected Global IPv6 Address: $IPV6_ADDR"
echo "🎯 Testing Port: 25 (SMTP)"
echo ""

# Check if port 25 is already bound
if ss -tulpn | grep -q ':25 '; then
  echo "⚠️ Port 25 is currently in use by another process:"
  ss -tulpn | grep ':25 '
  echo ""
fi

echo "----------------------------------------------------------------"
echo "1. Starting temporary IPv6 SMTP test listener on port 25..."
echo "----------------------------------------------------------------"
echo "👉 Listening on [::]:25. Send a test packet or check via external tool."
echo "👉 External test tool: https://ipv6-test.com/port/ or https://mxtoolbox.com"
echo "👉 Target IPv6: $IPV6_ADDR"
echo "👉 Target Port: 25"
echo ""
echo "Press Ctrl+C to stop the test listener when done."
echo "----------------------------------------------------------------"

if command -v socat >/dev/null 2>&1; then
  echo "Running socat IPv6 listener on port 25 (requires root privileges if port < 1024)..."
  exec sudo socat -v TCP6-LISTEN:25,reuseaddr,fork SYSTEM:"echo '220 eazzio-ipv6-test SMTP Ready'"
elif command -v python3 >/dev/null 2>&1; then
  echo "Running Python3 IPv6 listener on port 25..."
  sudo python3 -c "
import socket
s = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
s.bind(('::', 25))
s.listen(5)
print('✅ Python IPv6 socket bound on [::]:25. Awaiting inbound connections...')
while True:
    conn, addr = s.accept()
    print('⚡ INBOUND CONNECTION RECEIVED FROM:', addr)
    conn.sendall(b'220 eazzio-ipv6-test SMTP Ready\r\n')
    data = conn.recv(1024)
    print('   Data:', data)
    conn.close()
"
else
  echo "❌ Please install socat (sudo apt install socat -y) or python3 to run the listener."
  exit 1
fi
