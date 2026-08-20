export class HtmlSanitizer {
  public static sanitize(html: string): string {
    // Basic sanitization stripping script tags & dangerous javascript: protocols
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/href=["']javascript:[^"']*["']/gi, 'href="#"')
      .replace(/on\w+="[^"]*"/gi, '');
  }
}
