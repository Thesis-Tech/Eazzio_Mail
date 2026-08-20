export interface ParsedMimeMessage {
  messageIdHeader: string;
  from: string;
  to: string[];
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  attachments: Array<{
    filename: string;
    mimeType: string;
    data: Buffer;
    sizeBytes: number;
    sha256: string;
  }>;
}

export class MimeParser {
  public static parse(rawMime: Buffer): ParsedMimeMessage {
    const rawStr = rawMime.toString('utf-8');
    const headers: Record<string, string> = {};
    const lines = rawStr.split('\n');
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
      from: headers['from'] || 'unknown@example.com',
      to: (headers['to'] || '').split(',').map(s => s.trim()).filter(Boolean),
      subject: headers['subject'] || '(No Subject)',
      bodyText,
      attachments: []
    };
  }
}
