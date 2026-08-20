import crypto from 'crypto';

export interface DkimSignParams {
  rawMime: Buffer;
  domainName: string;
  selector: string;
  privateKeyPem: string;
}

export class DkimSigner {
  /**
   * Relaxed body canonicalization per RFC 6376 Section 3.4.4.
   */
  public static canonicalizeBodyRelaxed(body: string): string {
    if (!body) return '';
    // 1. Remove all trailing whitespace from each line
    const lines = body.split(/\r?\n/).map((line) => line.replace(/[ \t]+$/, ''));
    // 2. Reduce multiple whitespace inside lines to single space
    const cleanedLines = lines.map((line) => line.replace(/[ \t]+/g, ' '));
    // 3. Remove all empty lines at the end of the body
    while (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1] === '') {
      cleanedLines.pop();
    }
    if (cleanedLines.length === 0) return '';
    return cleanedLines.join('\r\n') + '\r\n';
  }

  /**
   * Relaxed header canonicalization per RFC 6376 Section 3.4.2.
   */
  public static canonicalizeHeaderRelaxed(name: string, value: string): string {
    const cleanName = name.toLowerCase().trim();
    const cleanValue = value
      .replace(/\r?\n/g, '')
      .replace(/[ \t]+/g, ' ')
      .trim();
    return `${cleanName}:${cleanValue}`;
  }

  public static sign(params: DkimSignParams): Buffer {
    const rawStr = params.rawMime.toString('utf-8');
    const headerBodySplit = rawStr.indexOf('\r\n\r\n');
    const splitIndex = headerBodySplit !== -1 ? headerBodySplit : rawStr.indexOf('\n\n');
    const splitLen = headerBodySplit !== -1 ? 4 : 2;

    const rawHeaders = splitIndex !== -1 ? rawStr.slice(0, splitIndex) : rawStr;
    const rawBody = splitIndex !== -1 ? rawStr.slice(splitIndex + splitLen) : '';

    // 1. Compute Body Hash (bh=)
    const canonBody = this.canonicalizeBodyRelaxed(rawBody);
    const bodyHash = crypto.createHash('sha256').update(canonBody, 'utf-8').digest('base64');

    // 2. Parse headers
    const headerLines = rawHeaders.split(/\r?\n/);
    const parsedHeaders: Array<{ name: string; value: string }> = [];
    let currentHeader: { name: string; value: string } | null = null;

    for (const line of headerLines) {
      if (/^[ \t]/.test(line) && currentHeader) {
        currentHeader.value += ' ' + line.trim();
      } else {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          currentHeader = {
            name: line.slice(0, colonIdx).trim(),
            value: line.slice(colonIdx + 1).trim(),
          };
          parsedHeaders.push(currentHeader);
        }
      }
    }

    // Standard headers to sign
    const signHeaderNames = ['from', 'to', 'subject', 'date', 'message-id'];
    const canonicalHeadersToSign: string[] = [];
    const signedHeaderList: string[] = [];

    for (const target of signHeaderNames) {
      const found = parsedHeaders.find((h) => h.name.toLowerCase() === target);
      if (found) {
        canonicalHeadersToSign.push(this.canonicalizeHeaderRelaxed(found.name, found.value));
        signedHeaderList.push(found.name.toLowerCase());
      }
    }

    const headersTag = signedHeaderList.join(':');
    const dkimHeaderWithoutSig = `DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed; d=${params.domainName}; s=${params.selector}; h=${headersTag}; bh=${bodyHash}; b=`;

    // Canonicalize the DKIM-Signature header itself (without the 'b=' value)
    const canonDkimHeader = this.canonicalizeHeaderRelaxed(
      'dkim-signature',
      dkimHeaderWithoutSig.slice('DKIM-Signature:'.length),
    );

    const stringToSign = canonicalHeadersToSign.join('\r\n') + '\r\n' + canonDkimHeader;

    // 3. Sign using RSA-SHA256
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(stringToSign, 'utf-8');
    const signature = signer.sign(params.privateKeyPem, 'base64');

    const finalDkimHeader = `${dkimHeaderWithoutSig}${signature}\r\n`;

    return Buffer.concat([Buffer.from(finalDkimHeader, 'utf-8'), params.rawMime]);
  }

  /**
   * Verifies an RSA-SHA256 DKIM signature on a signed MIME buffer.
   */
  public static verify(signedMime: Buffer, publicKeyPem: string): boolean {
    const rawStr = signedMime.toString('utf-8');
    const dkimMatch = rawStr.match(/DKIM-Signature:\s*([^\r\n]+(?:\r?\n[ \t]+[^\r\n]+)*)/i);
    if (!dkimMatch) return false;

    const fullDkimHeader = dkimMatch[1]!;
    const sigMatch = fullDkimHeader.match(/b=([^;]+)/);
    const headersMatch = fullDkimHeader.match(/h=([^;]+)/);
    const bodyHashMatch = fullDkimHeader.match(/bh=([^;]+)/);

    if (!sigMatch || !headersMatch || !bodyHashMatch) return false;

    const signature = sigMatch[1]!.replace(/\s+/g, '');
    const headersList = headersMatch[1]!.split(':').map((h) => h.trim().toLowerCase());
    const expectedBodyHash = bodyHashMatch[1]!.trim();

    // Split headers and body
    const headerBodySplit = rawStr.indexOf('\r\n\r\n');
    const splitIndex = headerBodySplit !== -1 ? headerBodySplit : rawStr.indexOf('\n\n');
    const splitLen = headerBodySplit !== -1 ? 4 : 2;

    const rawHeaders = splitIndex !== -1 ? rawStr.slice(0, splitIndex) : rawStr;
    const rawBody = splitIndex !== -1 ? rawStr.slice(splitIndex + splitLen) : '';

    // Verify Body Hash
    const canonBody = this.canonicalizeBodyRelaxed(rawBody);
    const calculatedBodyHash = crypto
      .createHash('sha256')
      .update(canonBody, 'utf-8')
      .digest('base64');
    if (calculatedBodyHash !== expectedBodyHash) {
      return false;
    }

    // Verify Header Signatures
    const headerLines = rawHeaders.split(/\r?\n/);
    const parsedHeaders: Array<{ name: string; value: string }> = [];
    let currentHeader: { name: string; value: string } | null = null;

    for (const line of headerLines) {
      if (/^[ \t]/.test(line) && currentHeader) {
        currentHeader.value += ' ' + line.trim();
      } else {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          const name = line.slice(0, colonIdx).trim();
          const value = line.slice(colonIdx + 1).trim();
          if (name.toLowerCase() !== 'dkim-signature') {
            currentHeader = { name, value };
            parsedHeaders.push(currentHeader);
          }
        }
      }
    }

    const canonicalHeadersToVerify: string[] = [];
    for (const target of headersList) {
      const found = parsedHeaders.find((h) => h.name.toLowerCase() === target);
      if (found) {
        canonicalHeadersToVerify.push(this.canonicalizeHeaderRelaxed(found.name, found.value));
      }
    }

    const dkimHeaderWithoutSig = fullDkimHeader.replace(/b=[^;]+/, 'b=');
    const canonDkimHeader = this.canonicalizeHeaderRelaxed('dkim-signature', dkimHeaderWithoutSig);
    const stringToVerify = canonicalHeadersToVerify.join('\r\n') + '\r\n' + canonDkimHeader;

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(stringToVerify, 'utf-8');
    return verifier.verify(publicKeyPem, signature, 'base64');
  }
}
