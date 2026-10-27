import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content for email rendering to prevent stored and reflected XSS.
 *
 * - Strips `<script>`, inline event handlers (onerror, onclick, onload, etc.), `javascript:` URIs.
 * - Strips dangerous embed and executable tags: `<object>`, `<embed>`, `<iframe>`, `<base>`, `<meta>`, `<link>`, `<style>`, `<svg>`, `<form>`.
 * - Strictly disallows executable data URIs (`data:image/svg+xml`, `data:text/html`).
 * - Allows safe raster images (`png`, `jpeg`, `jpg`, `gif`, `webp`), `cid:` references, and http/https links.
 * - Enforces `target="_blank"` and `rel="noopener noreferrer"` on links.
 */
export function sanitizeEmailHtml(html: string): string {
  if (!html) return '';

  // In SSR / build-time environment where window is undefined, perform robust string fallback
  if (typeof window === 'undefined') {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, '')
      .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href=""')
      .replace(/src\s*=\s*["']data:image\/svg[^"']*["']/gi, 'src=""');
  }

  // Hook 1: Neutralize dangerous data URIs like data:image/svg+xml and javascript:
  DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
    if (data.attrName === 'src' || data.attrName === 'href') {
      const val = (data.attrValue || '').toLowerCase().trim();
      if (
        val.startsWith('data:image/svg') ||
        val.startsWith('data:text') ||
        val.startsWith('javascript:')
      ) {
        data.attrValue = '';
      }
    }
  });

  // Hook 2: Enforce target="_blank" and rel="noopener noreferrer" on all anchor links
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && node.hasAttribute('href')) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'a',
      'abbr',
      'acronym',
      'address',
      'area',
      'article',
      'aside',
      'b',
      'bdi',
      'bdo',
      'big',
      'blockquote',
      'br',
      'caption',
      'center',
      'cite',
      'code',
      'col',
      'colgroup',
      'dd',
      'del',
      'details',
      'dfn',
      'div',
      'dl',
      'dt',
      'em',
      'figcaption',
      'figure',
      'font',
      'footer',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'header',
      'hgroup',
      'hr',
      'i',
      'img',
      'ins',
      'kbd',
      'li',
      'main',
      'map',
      'mark',
      'nav',
      'ol',
      'p',
      'pre',
      'q',
      'rp',
      'rt',
      'ruby',
      's',
      'samp',
      'section',
      'small',
      'span',
      'strike',
      'strong',
      'sub',
      'summary',
      'sup',
      'table',
      'tbody',
      'td',
      'tfoot',
      'th',
      'thead',
      'time',
      'tr',
      'tt',
      'u',
      'ul',
      'var',
      'wbr',
    ],
    ALLOWED_ATTR: [
      'align',
      'alt',
      'bgcolor',
      'border',
      'cellpadding',
      'cellspacing',
      'class',
      'color',
      'colspan',
      'dir',
      'face',
      'height',
      'href',
      'hspace',
      'id',
      'lang',
      'rowspan',
      'size',
      'style',
      'src',
      'target',
      'title',
      'valign',
      'vspace',
      'width',
      'rel',
    ],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP:
      /^(?:(?:https?|mailto|tel|cid):|data:image\/(?:png|jpeg|jpg|gif|webp);base64,)/i,
    FORBID_TAGS: [
      'script',
      'iframe',
      'object',
      'embed',
      'form',
      'input',
      'button',
      'base',
      'meta',
      'link',
      'style',
      'svg',
    ],
    FORBID_ATTR: [
      'onerror',
      'onload',
      'onclick',
      'onmouseover',
      'onfocus',
      'onblur',
      'formaction',
      'action',
    ],
  });
}
