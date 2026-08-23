export interface ParsedDsnReport {
  isBounce: boolean;
  action?: 'failed' | 'delayed' | 'delivered' | 'relayed' | 'expanded';
  status?: string; // e.g. "5.1.1", "4.4.1"
  diagnosticCode?: string;
  originalMessageId?: string;
  originalRecipient?: string;
  reportingMta?: string;
}

export class DsnParser {
  /**
   * Parses standard RFC 3464 delivery status notification reports
   */
  public static parse(bodyText: string, headers: Record<string, string> = {}): ParsedDsnReport {
    const contentType = (headers['content-type'] || '').toLowerCase();
    const isReport = contentType.includes('multipart/report') || contentType.includes('delivery-status');
    const isSubjectBounce = /(undelivered|delivery status notification|failure notice|returned mail|mail delivery failed)/i.test(
      headers['subject'] || '',
    );

    if (!isReport && !isSubjectBounce) {
      return { isBounce: false };
    }

    let action: ParsedDsnReport['action'];
    let status: string | undefined;
    let diagnosticCode: string | undefined;
    let originalMessageId: string | undefined;
    let originalRecipient: string | undefined;
    let reportingMta: string | undefined;

    // 1. Extract Action (failed, delayed, delivered)
    const actionMatch = bodyText.match(/Action:\s*([a-zA-Z]+)/i);
    if (actionMatch && actionMatch[1]) {
      const act = actionMatch[1].toLowerCase();
      if (['failed', 'delayed', 'delivered', 'relayed', 'expanded'].includes(act)) {
        action = act as ParsedDsnReport['action'];
      }
    } else if (isSubjectBounce) {
      action = 'failed';
    }

    // 2. Extract Status code (e.g., 5.1.1, 4.4.1)
    const statusMatch = bodyText.match(/Status:\s*([45]\.\d+\.\d+)/i);
    if (statusMatch && statusMatch[1]) {
      status = statusMatch[1];
    } else {
      const altStatusMatch = bodyText.match(/(?:error|code)\s*[:=]?\s*([45]\d{2})/i);
      if (altStatusMatch && altStatusMatch[1]) {
        status = altStatusMatch[1];
      }
    }

    // 3. Extract Diagnostic-Code
    const diagMatch = bodyText.match(/Diagnostic-Code:\s*(?:smtp;)?\s*(.+)/i);
    if (diagMatch && diagMatch[1]) {
      diagnosticCode = diagMatch[1].trim();
    }

    // 4. Extract Original-Recipient / Final-Recipient
    const recipientMatch = bodyText.match(/(?:Final-Recipient|Original-Recipient):\s*(?:rfc822;)?\s*([^\s;]+)/i);
    if (recipientMatch && recipientMatch[1]) {
      originalRecipient = recipientMatch[1].trim();
    }

    // 5. Extract In-Reply-To / References / X-Original-Message-ID
    originalMessageId = headers['in-reply-to'] || headers['references'];
    if (!originalMessageId) {
      const origMsgIdMatch = bodyText.match(/Message-ID:\s*(<[^>]+>)/i);
      if (origMsgIdMatch && origMsgIdMatch[1]) {
        originalMessageId = origMsgIdMatch[1];
      }
    }

    // 6. Extract Reporting-MTA
    const mtaMatch = bodyText.match(/Reporting-MTA:\s*(?:dns;)?\s*([^\s;]+)/i);
    if (mtaMatch && mtaMatch[1]) {
      reportingMta = mtaMatch[1].trim();
    }

    return {
      isBounce: true,
      action: action || 'failed',
      status: status || '5.0.0',
      diagnosticCode,
      originalMessageId: originalMessageId || undefined,
      originalRecipient,
      reportingMta,
    };
  }
}
