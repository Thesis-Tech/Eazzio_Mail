import dns from 'dns';
import net from 'net';
import { Agent } from 'undici';

/**
 * Validates that an IP address is a safe, routable, non-private public IP.
 * Blocked IPv4 ranges:
 * - 0.0.0.0/8 (Current network / broadcast default)
 * - 10.0.0.0/8 (Private network RFC 1918)
 * - 127.0.0.0/8 (Loopback)
 * - 169.254.0.0/16 (Link-local, AWS/cloud metadata 169.254.169.254)
 * - 172.16.0.0/12 (Private network RFC 1918)
 * - 192.168.0.0/16 (Private network RFC 1918)
 * - 224.0.0.0/4 (Multicast)
 * - 240.0.0.0/4 (Reserved)
 *
 * Blocked IPv6 ranges:
 * - ::1 (Loopback)
 * - :: (Unspecified)
 * - fc00::/7 (Unique local address / private)
 * - fe80::/10 (Link-local unicast)
 * - ::ffff:0:0/96 (IPv4-mapped IPv6)
 */
export function isIpBlocked(ip: string): boolean {
  let cleaned = ip.trim();
  if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
    cleaned = cleaned.slice(1, -1);
  }

  const family = net.isIP(cleaned);
  if (!family) return true;

  if (family === 4) {
    const parts = cleaned.split('.').map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true;
    }

    const [b0, b1] = parts;

    // 0.0.0.0/8
    if (b0 === 0) return true;
    // 10.0.0.0/8
    if (b0 === 10) return true;
    // 127.0.0.0/8 (Loopback)
    if (b0 === 127) return true;
    // 169.254.0.0/16 (Link-local / cloud metadata)
    if (b0 === 169 && b1 === 254) return true;
    // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
    // 192.168.0.0/16
    if (b0 === 192 && b1 === 168) return true;
    // 224.0.0.0/4 (Multicast) and 240.0.0.0/4 (Reserved)
    if (b0 >= 224) return true;

    return false;
  }

  if (family === 6) {
    let normalized = cleaned.toLowerCase().trim();

    // Strip IPv6 zone ID if present (e.g. fe80::1%eth0)
    if (normalized.includes('%')) {
      normalized = normalized.split('%')[0];
    }

    // ::1 loopback, :: unspecified
    if (
      normalized === '::1' ||
      normalized === '::' ||
      normalized === '0:0:0:0:0:0:0:1' ||
      normalized === '0:0:0:0:0:0:0:0'
    ) {
      return true;
    }

    // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or hex format ::ffff:7f00:1)
    if (normalized.startsWith('::ffff:')) {
      const rest = normalized.replace('::ffff:', '');
      if (net.isIPv4(rest)) {
        return isIpBlocked(rest);
      }
      // Hex representation: ::ffff:7f00:1 -> 127.0.0.1
      const parts = rest.split(':');
      if (parts.length === 2) {
        const high = parseInt(parts[0], 16);
        const low = parseInt(parts[1], 16);
        if (!isNaN(high) && !isNaN(low)) {
          const b0 = (high >> 8) & 0xff;
          const b1 = high & 0xff;
          const b2 = (low >> 8) & 0xff;
          const b3 = low & 0xff;
          return isIpBlocked(`${b0}.${b1}.${b2}.${b3}`);
        }
      }
      return true;
    }

    // fc00::/7 (fc00:: - fdff::) Unique Local Address
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

    // fe80::/10 (fe80:: - febf::) Link-Local
    const firstWord = normalized.split(':')[0];
    if (firstWord.startsWith('fe')) {
      const secondNibble = parseInt(firstWord[2] || '0', 16);
      if (secondNibble >= 8 && secondNibble <= 11) return true;
    }

    return false;
  }

  return true;
}

/**
 * SSRF Protection Helper:
 * Validates protocol (http/https only) and ensures that all resolved IP addresses
 * for the host belong to public, non-private, non-loopback, non-metadata IP spaces.
 * Resolves all A/AAAA records to prevent multi-IP rotation bypasses.
 */
export async function isSafePublicUrl(urlString: string): Promise<boolean> {
  try {
    const parsed = new URL(urlString);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    let hostname = parsed.hostname.toLowerCase().trim();
    // Strip trailing dots and brackets
    if (hostname.endsWith('.')) {
      hostname = hostname.replace(/\.+$/, '');
    }
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      hostname = hostname.slice(1, -1);
    }

    if (
      !hostname ||
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      return false;
    }

    // Direct IP address in hostname
    if (net.isIP(hostname)) {
      return !isIpBlocked(hostname);
    }

    // Resolve all IPs (both IPv4 and IPv6)
    const records = await dns.promises.lookup(hostname, { all: true, verbatim: true });
    if (!records || records.length === 0) {
      return false;
    }

    // Reject if ANY resolved IP address is in a forbidden range
    for (const record of records) {
      if (isIpBlocked(record.address)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Undici Custom Safe Proxy Agent:
 * Intercepts DNS lookups directly inside socket connection phase to prevent
 * TOCTOU (Time-Of-Check to Time-Of-Use) and DNS Rebinding attacks.
 */
let cachedAgent: Agent | null = null;

export function getSafeProxyAgent(): Agent {
  if (cachedAgent) return cachedAgent;

  cachedAgent = new Agent({
    connect: {
      lookup: (hostname, options, callback) => {
        dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
          if (err) return callback(err, '', 4);

          const list = Array.isArray(addresses)
            ? addresses
            : [{ address: addresses as string, family: 4 }];

          // If any resolved address is private/forbidden, abort connection immediately
          for (const item of list) {
            if (isIpBlocked(item.address)) {
              return callback(new Error('Blocked private/local IP address'), '', 4);
            }
          }

          const chosen = list[0];
          callback(null, chosen.address, chosen.family);
        });
      },
    },
  });

  return cachedAgent;
}
