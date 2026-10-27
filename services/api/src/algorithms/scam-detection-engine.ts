/**
 * Advanced Multi-Vector Scam & Phishing Detection Engine
 * Matches ProtonMail & Gmail security postures.
 */

export type ThreatSeverity = 'clean' | 'suspicious' | 'dangerous';

export interface ThreatAnalysisResult {
  score: number; // 0.00 (clean) to 1.00 (critical threat)
  severity: ThreatSeverity;
  isPhishing: boolean;
  isSpoofed: boolean;
  warnings: string[];
  neutralizeLinks: boolean;
  detectedBrands: string[];
}

export interface EmailScanPayload {
  fromAddress: string;
  fromDisplayName?: string;
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  spfVerified?: boolean;
  dkimVerified?: boolean;
  dmarcVerified?: boolean;
}

export class ScamDetectionEngine {
  // High-profile brand names frequently targeted for spoofing
  private static readonly MONITORED_BRANDS: Array<{ name: string; officialDomains: string[] }> = [
    { name: 'paypal', officialDomains: ['paypal.com', 'paypal-communication.com'] },
    { name: 'google', officialDomains: ['google.com', 'accounts.google.com'] },
    { name: 'apple', officialDomains: ['apple.com', 'icloud.com'] },
    { name: 'microsoft', officialDomains: ['microsoft.com', 'office.com', 'live.com', 'outlook.com'] },
    { name: 'amazon', officialDomains: ['amazon.com', 'amazon.in', 'amazon.co.uk'] },
    { name: 'netflix', officialDomains: ['netflix.com'] },
    { name: 'meta', officialDomains: ['facebookmail.com', 'metamail.com', 'meta.com'] },
    { name: 'chase', officialDomains: ['chase.com'] },
    { name: 'bank of america', officialDomains: ['bankofamerica.com'] },
    { name: 'wells fargo', officialDomains: ['wellsfargo.com'] },
    { name: 'binance', officialDomains: ['binance.com'] },
    { name: 'coinbase', officialDomains: ['coinbase.com'] },
  ];

  // Urgent coercion keywords indicative of social engineering
  private static readonly URGENT_COERCION_PATTERNS = [
    /account (suspended|locked|deactivated|terminated|closed)/i,
    /unauthorized (activity|transaction|access|login)/i,
    /verify your (identity|account|credentials|card|billing)/i,
    /update your (payment|billing|credit card) information/i,
    /security alert:? (urgent|action required)/i,
    /immediate action required/i,
    /password (expired|compromised|reset request)/i,
    /wire transfer (request|instruction|confirmation)/i,
    /gift cards? for (boss|ceo|client)/i,
    /bitcoin|crypto|wallet address|btc address/i,
    /lottery (winner|prize|claim)/i,
    /inheritance (funds|sum|beneficiary)/i,
  ];

  public static analyze(email: EmailScanPayload): ThreatAnalysisResult {
    let threatScore = 0.0;
    const warnings: string[] = [];
    const detectedBrands: string[] = [];
    let isSpoofed = false;

    const fromEmail = (email.fromAddress || '').toLowerCase().trim();
    const fromDomain = fromEmail.split('@')[1] || '';
    const displayName = (email.fromDisplayName || fromEmail.split('@')[0] || '').toLowerCase();
    const subject = email.subject || '';
    const fullText = `${subject} ${email.bodyText || ''} ${email.bodyHtml || ''}`;

    // 1. Brand Impersonation & Display Name Spoofing
    for (const brand of this.MONITORED_BRANDS) {
      const mentionsBrand = displayName.includes(brand.name) || subject.toLowerCase().includes(brand.name);
      if (mentionsBrand) {
        const isOfficial = brand.officialDomains.some(d => fromDomain === d || fromDomain.endsWith(`.${d}`));
        if (!isOfficial) {
          threatScore += 0.50;
          isSpoofed = true;
          detectedBrands.push(brand.name);
          warnings.push(`Sender claims to be "${brand.name.toUpperCase()}" but sent from non-official domain "@${fromDomain}"`);
        }
      }
    }

    // 2. Urgent Social Engineering / Coercion Language
    let coercionMatches = 0;
    for (const pattern of this.URGENT_COERCION_PATTERNS) {
      if (pattern.test(fullText)) {
        coercionMatches++;
      }
    }
    if (coercionMatches >= 2) {
      threatScore += 0.35;
      warnings.push(`Contains high-pressure psychological coercion and urgency triggers (${coercionMatches} indicators)`);
    } else if (coercionMatches === 1) {
      threatScore += 0.15;
      warnings.push('Contains urgent account security or payment requests');
    }

    // 3. Deceptive / Masked Links in HTML
    if (email.bodyHtml) {
      const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
      let linkMatch: RegExpExecArray | null;

      while ((linkMatch = linkRegex.exec(email.bodyHtml)) !== null) {
        const href = linkMatch[1] || '';
        const anchorText = linkMatch[2]?.replace(/<[^>]*>/g, '').trim() || '';

        // IP address URL (e.g. http://192.168.1.1/login)
        if (/^https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/i.test(href)) {
          threatScore += 0.40;
          warnings.push(`Suspicious direct IP address link detected: ${href}`);
        }

        // Masked link: Text looks like a trusted domain, but href points elsewhere
        if (anchorText.startsWith('http://') || anchorText.startsWith('https://') || anchorText.includes('.com') || anchorText.includes('.org')) {
          try {
            const parsedHref = new URL(href);
            const anchorDomain = anchorText.replace(/^https?:\/\//i, '').split('/')[0]?.toLowerCase();
            if (anchorDomain && !parsedHref.hostname.endsWith(anchorDomain)) {
              threatScore += 0.45;
              warnings.push(`Deceptive link: text displays "${anchorDomain}" but destination URL leads to "${parsedHref.hostname}"`);
            }
          } catch (_) {}
        }
      }
    }

    // 4. Authentication Alignment Check
    if (email.spfVerified === false && email.dkimVerified === false) {
      threatScore += 0.25;
      warnings.push('Sender failed both SPF and DKIM email authentication checks');
    }

    // Normalize final score between 0.0 and 1.0
    const finalScore = Math.min(1.0, Math.max(0.0, Number(threatScore.toFixed(2))));
    
    let severity: ThreatSeverity = 'clean';
    if (finalScore >= 0.70) {
      severity = 'dangerous';
    } else if (finalScore >= 0.35) {
      severity = 'suspicious';
    }

    return {
      score: finalScore,
      severity,
      isPhishing: finalScore >= 0.70 || isSpoofed,
      isSpoofed,
      warnings,
      neutralizeLinks: severity === 'dangerous',
      detectedBrands,
    };
  }
}
