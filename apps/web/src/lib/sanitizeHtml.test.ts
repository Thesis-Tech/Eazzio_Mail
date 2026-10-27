import { describe, it, expect } from 'vitest';
import { sanitizeEmailHtml } from './sanitizeHtml';

describe('sanitizeEmailHtml', () => {
  it('strips <script> tags and their contents', () => {
    const input = '<p>Hello</p><script>alert("XSS")</script><span>World</span>';
    const output = sanitizeEmailHtml(input);
    expect(output).not.toContain('<script');
    expect(output).not.toContain('alert');
    expect(output).toContain('<p>Hello</p>');
    expect(output).toContain('<span>World</span>');
  });

  it('strips inline event handlers (onerror, onload, onclick, onmouseover)', () => {
    const input =
      '<img src="https://example.com/pic.png" onerror="alert(1)" onload="alert(2)" onclick="alert(3)">';
    const output = sanitizeEmailHtml(input);
    expect(output).toContain('src="https://example.com/pic.png"');
    expect(output).not.toContain('onerror');
    expect(output).not.toContain('onload');
    expect(output).not.toContain('onclick');
    expect(output).not.toContain('alert');
  });

  it('neutralizes javascript: URIs in href and src', () => {
    const input =
      '<a href="javascript:alert(1)">Click Me</a><iframe src="javascript:alert(2)"></iframe>';
    const output = sanitizeEmailHtml(input);
    expect(output).not.toContain('javascript:');
    expect(output).not.toContain('<iframe');
    expect(output).toContain('Click Me');
  });

  it('neutralizes data:image/svg+xml and data:text/html URIs', () => {
    const svgInput = '<img src="data:image/svg+xml;utf8,<svg onload=alert(1)/>">';
    const textHtmlInput =
      '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">bad</a>';

    expect(sanitizeEmailHtml(svgInput)).not.toContain('data:image/svg');
    expect(sanitizeEmailHtml(textHtmlInput)).not.toContain('data:text/html');
  });

  it('preserves safe raster image data URIs (png, jpeg, gif, webp)', () => {
    const png =
      '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=">';
    const jpeg =
      '<img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=">';

    expect(sanitizeEmailHtml(png)).toContain('data:image/png;base64,');
    expect(sanitizeEmailHtml(jpeg)).toContain('data:image/jpeg;base64,');
  });

  it('preserves cid: URIs for inline email attachments', () => {
    const input = '<img src="cid:ii_m4h1a8o20_18e123456" alt="embedded">';
    const output = sanitizeEmailHtml(input);
    expect(output).toContain('src="cid:ii_m4h1a8o20_18e123456"');
    expect(output).toContain('alt="embedded"');
  });

  it('removes <style> and <svg> tags entirely', () => {
    const input =
      '<style>body { background: red; }</style><svg><circle cx="50" cy="50" r="40" /></svg><p>Safe</p>';
    const output = sanitizeEmailHtml(input);
    expect(output).not.toContain('<style');
    expect(output).not.toContain('<svg');
    expect(output).not.toContain('circle');
    expect(output).toContain('<p>Safe</p>');
  });

  it('enforces target="_blank" and rel="noopener noreferrer" on external links', () => {
    const input = '<a href="https://example.com/docs">Read Documentation</a>';
    const output = sanitizeEmailHtml(input);
    expect(output).toContain('href="https://example.com/docs"');
    expect(output).toContain('target="_blank"');
    expect(output).toContain('rel="noopener noreferrer"');
  });

  it('preserves normal rich formatting tags untouched', () => {
    const input = `
      <div>
        <p>Paragraph with <b>bold</b>, <i>italic</i>, <u>underline</u> and <br></p>
        <table border="1" cellpadding="2">
          <tbody>
            <tr>
              <td>Cell 1</td>
              <td>Cell 2</td>
            </tr>
          </tbody>
        </table>
        <ul><li>Item A</li></ul>
        <ol><li>Item 1</li></ol>
      </div>
    `.trim();
    const output = sanitizeEmailHtml(input);
    expect(output).toContain('<b>bold</b>');
    expect(output).toContain('<i>italic</i>');
    expect(output).toContain('<u>underline</u>');
    expect(output).toContain('<table');
    expect(output).toContain('<td>Cell 1</td>');
    expect(output).toContain('<ul><li>Item A</li></ul>');
    expect(output).toContain('<ol><li>Item 1</li></ol>');
  });

  it('neutralizes nested and malformed obfuscated tags like <scr<script>ipt> without executable script', () => {
    const input = '<scr<script>ipt>alert("nested")</scr</script>ipt><img/src="x"/onerror=alert(1)>';
    const output = sanitizeEmailHtml(input);
    // Malformed script tags are broken into inert HTML-encoded text and cannot execute as <script>
    expect(output).not.toContain('<script');
    expect(output).not.toContain('onerror');
    // img tag exists without executable handler
    expect(output).toContain('<img');
    expect(output).not.toContain('onerror=alert(1)');
  });
});
