import { simpleParser, ParsedMail, Attachment } from 'mailparser';
import crypto from 'crypto';

export interface ParsedAttachment {
  filename: string;
  contentType: string;
  sizeBytes: number;
  data: Buffer;
  sha256: string;
  isInline: boolean;
  contentId?: string;
}

export interface ParsedMimeMessage {
  messageIdHeader: string;
  inReplyTo?: string | null;
  referencesHeader?: string | null;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  attachments: ParsedAttachment[];
  listUnsubscribe?: string | null;
  listId?: string | null;
  headers?: Record<string, string>;
}

export class MimeParser {
  /**
   * Sanitizes filenames to eliminate path traversal attacks and control characters.
   */
  public static sanitizeFilename(filename: string | undefined, defaultIndex: number = 1): string {
    if (!filename || typeof filename !== 'string') {
      return `attachment_${defaultIndex}.bin`;
    }

    // Strip control chars, directory traversal patterns, and slashes
    const sanitized = filename
      .replace(/[\x00-\x1f\x7f]/g, '')
      .replace(/(\.\.[\/\\])+/g, '')
      .replace(/[\/\\]+/g, '_')
      .replace(/^\.+/, '')
      .trim();

    return sanitized.length > 0 ? sanitized : `attachment_${defaultIndex}.bin`;
  }

  public static async parse(rawMime: Buffer): Promise<ParsedMimeMessage> {
    try {
      const parsed: ParsedMail = await simpleParser(rawMime);

      const messageIdHeader = parsed.messageId
        ? parsed.messageId.trim()
        : `<${crypto.randomUUID()}@inbound.eazzio.mail>`;

      const from = parsed.from?.value?.[0]?.address || 'unknown@example.com';

      const to: string[] = [];
      if (parsed.to) {
        const toList = Array.isArray(parsed.to) ? parsed.to : [parsed.to];
        for (const addr of toList) {
          if (addr.value) {
            for (const v of addr.value) {
              if (v.address) to.push(v.address);
            }
          }
        }
      }

      const cc: string[] = [];
      if (parsed.cc) {
        const ccList = Array.isArray(parsed.cc) ? parsed.cc : [parsed.cc];
        for (const addr of ccList) {
          if (addr.value) {
            for (const v of addr.value) {
              if (v.address) cc.push(v.address);
            }
          }
        }
      }

      const inReplyTo = parsed.inReplyTo || null;
      const referencesHeader = Array.isArray(parsed.references)
        ? parsed.references.join(' ')
        : parsed.references || null;

      const attachments: ParsedAttachment[] = (parsed.attachments || []).map(
        (att: Attachment, idx: number) => {
          const safeFilename = MimeParser.sanitizeFilename(att.filename, idx + 1);
          const dataBuffer = Buffer.isBuffer(att.content) ? att.content : Buffer.from(att.content);
          const sha256 = crypto.createHash('sha256').update(dataBuffer).digest('hex');

          return {
            filename: safeFilename,
            contentType: att.contentType || 'application/octet-stream',
            sizeBytes: dataBuffer.length,
            data: dataBuffer,
            sha256,
            isInline: Boolean(att.related),
            contentId: att.contentId,
          };
        },
      );

      const rawHeaders: Record<string, string> = {};
      if (parsed.headers) {
        for (const [k, v] of parsed.headers) {
          rawHeaders[k.toLowerCase()] = typeof v === 'string' ? v : (v as any)?.text || JSON.stringify(v);
        }
      }

      const listUnsubscribeHeader = rawHeaders['list-unsubscribe'] || null;
      const listIdHeader = rawHeaders['list-id'] || null;

      return {
        messageIdHeader,
        inReplyTo,
        referencesHeader,
        from,
        to,
        cc,
        subject: parsed.subject || '(No Subject)',
        bodyText: parsed.text || '',
        bodyHtml: parsed.html || undefined,
        attachments,
        listUnsubscribe: listUnsubscribeHeader,
        listId: listIdHeader,
        headers: rawHeaders,
      };
    } catch {
      // Fallback simple parsing if rawMime is malformed
      return MimeParser.parseFallback(rawMime);
    }
  }

  private static parseFallback(rawMime: Buffer): ParsedMimeMessage {
    const rawStr = rawMime.toString('utf-8');
    const headers: Record<string, string> = {};
    const lines = rawStr.split(/\r?\n/);
    let bodyIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();
      if (line === '') {
        bodyIndex = i + 1;
        break;
      }
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim().toLowerCase();
        const value = line.slice(colonIndex + 1).trim();
        headers[key] = value;
      }
    }

    const bodyText = lines.slice(bodyIndex).join('\n').trim();

    return {
      messageIdHeader: headers['message-id'] || `<${crypto.randomUUID()}@inbound.eazzio.mail>`,
      inReplyTo: headers['in-reply-to'] || null,
      referencesHeader: headers['references'] || null,
      from: headers['from'] || 'unknown@example.com',
      to: (headers['to'] || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      subject: headers['subject'] || '(No Subject)',
      bodyText,
      attachments: [],
      listUnsubscribe: headers['list-unsubscribe'] || null,
      listId: headers['list-id'] || null,
      headers,
    };
  }
}
