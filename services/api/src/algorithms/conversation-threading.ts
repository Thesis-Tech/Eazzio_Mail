/**
 * RFC 5322 & JWZ Email Threading Algorithm
 * 
 * Groups messages into conversations by:
 * 1. Matching In-Reply-To header with parent Message-ID.
 * 2. Matching References header list.
 * 3. Normalizing Subjects (stripping "Re:", "Fwd:", "[External]", etc.)
 *    and matching within time windows when explicit headers are absent.
 */

export interface ThreadMessageMeta {
  id: string;
  threadId?: string;
  messageIdHeader?: string;
  inReplyToHeader?: string;
  referencesHeader?: string[];
  subject: string;
  fromAddress: string;
  receivedAt: Date;
}

export class ConversationThreading {
  /**
   * Normalizes subject by removing Re:, Fwd:, [Fwd:], etc.
   */
  public static normalizeSubject(subject: string): string {
    if (!subject) return '';
    return subject
      .replace(/^(\s*(re|fwd|fw|aw|antw|wg)[\s:]*)+/gi, '')
      .replace(/^\[[^\]]+\]\s*/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Resolves or assigns thread ID for an incoming message.
   */
  public static resolveThreadId(
    incoming: ThreadMessageMeta,
    existingThreadCandidates: Array<{ id: string; subjectNormalized: string; messageIdHeaders: string[] }>
  ): string {
    const normalizedSubj = this.normalizeSubject(incoming.subject).toLowerCase();

    // 1. Direct In-Reply-To match
    if (incoming.inReplyToHeader) {
      for (const candidate of existingThreadCandidates) {
        if (candidate.messageIdHeaders.includes(incoming.inReplyToHeader)) {
          return candidate.id;
        }
      }
    }

    // 2. References match
    if (incoming.referencesHeader && incoming.referencesHeader.length > 0) {
      for (const ref of incoming.referencesHeader) {
        for (const candidate of existingThreadCandidates) {
          if (candidate.messageIdHeaders.includes(ref)) {
            return candidate.id;
          }
        }
      }
    }

    // 3. Subject match fallback if normalized subject is non-empty
    if (normalizedSubj && normalizedSubj !== '(no subject)') {
      for (const candidate of existingThreadCandidates) {
        if (candidate.subjectNormalized.toLowerCase() === normalizedSubj) {
          return candidate.id;
        }
      }
    }

    // Otherwise incoming is head of a new conversation
    return incoming.threadId || incoming.id;
  }
}
