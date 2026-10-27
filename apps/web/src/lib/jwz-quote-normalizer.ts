/**
 * JWZ Quoted Content & Thread Delta Normalizer
 *
 * Implements resilient quote trimming, thread delta extraction, and quote collapsing
 * inspired by the Jamie Zawinski (JWZ) threading algorithm and modern email clients (Gmail, Fastmail).
 *
 * Prevents redundant nested quote expansion from bloating memory, payload size, and DOM node count.
 */

export interface JWZThreadSplit {
  primaryContent: string;
  quotedContent: string;
  hasQuotedContent: boolean;
  isHtml: boolean;
}

// Universal email quote boundary patterns:
// 1. Gmail quote block: <div class="gmail_quote"> or <blockquote class="gmail_quote">
// 2. Standard blockquote: <blockquote>
// 3. Outlook header: -----Original Message----- or ________________________________
// 4. Forwarded header: ---------- Forwarded message ---------
// 5. Classic attribution line: "On [Date/Time], [Name/Email] wrote:"
// 6. RFC 2822 / Markdown line quoting: consecutive lines starting with ">"
export const EMAIL_QUOTE_REGEX = /(?:<div\s+class=[\"']gmail_quote[\"']|<blockquote\b|<div\s+class=[\"']gmail_attr[\"']|-----Original Message-----|---------- Forwarded message ---------|(?:\r?\n|^|\s)On\s+[^\n]+?wrote:?|(?:\r?\n|^)\s*_{20,}|(?:\r?\n|^)\s*>+[\s\S]*)/i;

/**
 * Strips or splits quoted content from plain text or HTML email body.
 */
export function stripQuotedContent(content: string, isHtml = false): JWZThreadSplit {
  if (!content) {
    return {
      primaryContent: '',
      quotedContent: '',
      hasQuotedContent: false,
      isHtml,
    };
  }

  // Detect HTML if not explicitly specified
  const effectiveIsHtml = isHtml || (content.includes('<') && content.includes('>') && (content.includes('</div>') || content.includes('</p>') || content.includes('<br')));

  const match = content.match(EMAIL_QUOTE_REGEX);
  if (match && match.index !== undefined && match.index >= 0) {
    const primaryContent = content.slice(0, match.index).trim();
    const quotedContent = content.slice(match.index).trim();
    return {
      primaryContent,
      quotedContent,
      hasQuotedContent: true,
      isHtml: effectiveIsHtml,
    };
  }

  return {
    primaryContent: content,
    quotedContent: '',
    hasQuotedContent: false,
    isHtml: effectiveIsHtml,
  };
}

/**
 * Collapses deeply nested blockquotes into a single clean level to prevent DOM explosion.
 */
export function foldNestedQuotes(htmlContent: string, maxDepth = 2): string {
  if (!htmlContent) return '';
  // Recursively collapse blockquotes that exceed maxDepth
  let result = htmlContent;
  const deepBlockquoteRegex = /(<blockquote[^>]*>[\s\S]*?)(<blockquote[^>]*>)([\s\S]*?)(<\/blockquote>)([\s\S]*?<\/blockquote>)/gi;
  // If multiple nested blockquotes exist, simplify them into a single folded container
  for (let i = 0; i < maxDepth; i++) {
    result = result.replace(deepBlockquoteRegex, '$1<div class="nested-quote-folded" style="margin-left: 10px; border-left: 1px solid #ccc; padding-left: 8px;">$3</div>$5');
  }
  return result;
}
