/**
 * Gmail-Grade Advanced Search Query Parser & SQL Generator
 * 
 * Supports Gmail operators:
 *  - from:email or from:name
 *  - to:email or to:name
 *  - subject:"quoted string" or subject:word
 *  - has:attachment
 *  - is:unread / is:read
 *  - is:starred / is:unstarred
 *  - is:important
 *  - is:snoozed
 *  - after:YYYY-MM-DD / before:YYYY-MM-DD
 *  - larger:10M / smaller:500K
 *  - label:LabelName
 *  - Free-text terms (searches subject, snippet, body_text, from_address)
 */

export interface ParsedSearchFilters {
  from?: string;
  to?: string;
  subject?: string;
  hasAttachment?: boolean;
  isUnread?: boolean;
  isStarred?: boolean;
  isImportant?: boolean;
  isSnoozed?: boolean;
  afterDate?: Date;
  beforeDate?: Date;
  minBytes?: number;
  maxBytes?: number;
  label?: string;
  freeTextTerms: string[];
}

export class SearchQueryParser {
  /**
   * Parse a raw search query string into structured filter criteria.
   */
  public static parse(rawQuery: string): ParsedSearchFilters {
    const filters: ParsedSearchFilters = {
      freeTextTerms: [],
    };

    if (!rawQuery || !rawQuery.trim()) {
      return filters;
    }

    // Tokenize preserving quoted strings
    const regex = /(?:(\w+):(?:"([^"]+)"|(\S+)))|(?:"([^"]+)")|(\S+)/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(rawQuery)) !== null) {
      const operator = match[1]?.toLowerCase();
      const opValue = match[2] || match[3];
      const quotedTerm = match[4];
      const singleTerm = match[5];

      if (operator && opValue) {
        switch (operator) {
          case 'from':
            filters.from = opValue.trim();
            break;
          case 'to':
            filters.to = opValue.trim();
            break;
          case 'subject':
            filters.subject = opValue.trim();
            break;
          case 'has':
            if (opValue.toLowerCase() === 'attachment') {
              filters.hasAttachment = true;
            }
            break;
          case 'is': {
            const val = opValue.toLowerCase();
            if (val === 'unread') filters.isUnread = true;
            else if (val === 'read') filters.isUnread = false;
            else if (val === 'starred') filters.isStarred = true;
            else if (val === 'unstarred') filters.isStarred = false;
            else if (val === 'important') filters.isImportant = true;
            else if (val === 'snoozed') filters.isSnoozed = true;
            break;
          }
          case 'after':
          case 'since': {
            const d = new Date(opValue);
            if (!isNaN(d.getTime())) filters.afterDate = d;
            break;
          }
          case 'before':
          case 'until': {
            const d = new Date(opValue);
            if (!isNaN(d.getTime())) filters.beforeDate = d;
            break;
          }
          case 'larger': {
            filters.minBytes = this.parseSize(opValue);
            break;
          }
          case 'smaller': {
            filters.maxBytes = this.parseSize(opValue);
            break;
          }
          case 'label':
            filters.label = opValue.trim();
            break;
          default:
            filters.freeTextTerms.push(`${operator}:${opValue}`);
        }
      } else if (quotedTerm) {
        filters.freeTextTerms.push(quotedTerm.trim());
      } else if (singleTerm) {
        filters.freeTextTerms.push(singleTerm.trim());
      }
    }

    return filters;
  }

  /**
   * Parses size strings like '10M', '500K', '1G' into bytes.
   */
  private static parseSize(str: string): number {
    const s = str.trim().toUpperCase();
    const num = parseFloat(s);
    if (isNaN(num)) return 0;
    if (s.endsWith('G') || s.endsWith('GB')) return num * 1024 * 1024 * 1024;
    if (s.endsWith('M') || s.endsWith('MB')) return num * 1024 * 1024;
    if (s.endsWith('K') || s.endsWith('KB')) return num * 1024;
    return num;
  }

  /**
   * Builds parameterized SQL query clauses from parsed search filters.
   */
  public static buildSqlQuery(
    mailboxId: string,
    filters: ParsedSearchFilters,
    limit: number = 50
  ): { sql: string; params: any[] } {
    const params: any[] = [mailboxId];
    const whereClauses: string[] = ['m.mailbox_id = $1'];

    if (filters.from) {
      params.push(`%${filters.from.toLowerCase()}%`);
      whereClauses.push(`LOWER(m.from_address) LIKE $${params.length}`);
    }

    if (filters.to) {
      params.push(`%${filters.to.toLowerCase()}%`);
      whereClauses.push(`EXISTS (
        SELECT 1 FROM message_recipients mr 
        WHERE mr.message_id = m.id AND LOWER(mr.address) LIKE $${params.length}
      )`);
    }

    if (filters.subject) {
      params.push(`%${filters.subject.toLowerCase()}%`);
      whereClauses.push(`LOWER(m.subject) LIKE $${params.length}`);
    }

    if (filters.hasAttachment) {
      whereClauses.push(`EXISTS (
        SELECT 1 FROM attachments att WHERE att.message_id = m.id
      )`);
    }

    if (filters.isUnread !== undefined) {
      whereClauses.push(filters.isUnread ? 'm.is_read = false' : 'm.is_read = true');
    }

    if (filters.isStarred !== undefined) {
      whereClauses.push(filters.isStarred ? 'm.is_starred = true' : 'm.is_starred = false');
    }

    if (filters.isImportant !== undefined) {
      whereClauses.push(filters.isImportant ? 'm.is_important = true' : 'm.is_important = false');
    }

    if (filters.isSnoozed) {
      whereClauses.push('m.is_snoozed = true AND (m.snoozed_until IS NULL OR m.snoozed_until > now())');
    }

    if (filters.afterDate) {
      params.push(filters.afterDate);
      whereClauses.push(`m.received_at >= $${params.length}`);
    }

    if (filters.beforeDate) {
      params.push(filters.beforeDate);
      whereClauses.push(`m.received_at <= $${params.length}`);
    }

    if (filters.minBytes !== undefined) {
      params.push(filters.minBytes);
      whereClauses.push(`m.size_bytes >= $${params.length}`);
    }

    if (filters.maxBytes !== undefined) {
      params.push(filters.maxBytes);
      whereClauses.push(`m.size_bytes <= $${params.length}`);
    }

    if (filters.label) {
      params.push(filters.label.toLowerCase());
      whereClauses.push(`EXISTS (
        SELECT 1 FROM message_labels ml
        JOIN labels l ON l.id = ml.label_id
        WHERE ml.message_id = m.id AND LOWER(l.name) = $${params.length}
      )`);
    }

    // Free text terms across subject, snippet, body_text, and sender
    for (const term of filters.freeTextTerms) {
      params.push(`%${term.toLowerCase()}%`);
      const idx = params.length;
      whereClauses.push(`(
        LOWER(m.subject) LIKE $${idx} OR
        LOWER(m.snippet) LIKE $${idx} OR
        LOWER(m.from_address) LIKE $${idx} OR
        (m.body_text IS NOT NULL AND LOWER(m.body_text) LIKE $${idx})
      )`);
    }

    params.push(limit);
    const limitIdx = params.length;

    const sql = `
      SELECT m.id, m.mailbox_id, m.folder_id, m.thread_id, m.message_id_header,
             m.from_address, m.subject, m.snippet, m.body_text, m.body_html, m.size_bytes,
             m.is_read, m.is_starred, m.is_important, m.direction, m.delivery_state,
             m.received_at,
             COALESCE(
               (SELECT json_agg(json_build_object('name', split_part(r.address::text, '@', 1), 'email', r.address::text, 'type', r.kind))
                FROM message_recipients r WHERE r.message_id = m.id),
               '[]'::json
             ) as recipients
      FROM messages m
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY m.received_at DESC
      LIMIT $${limitIdx}
    `;

    return { sql, params };
  }
}
