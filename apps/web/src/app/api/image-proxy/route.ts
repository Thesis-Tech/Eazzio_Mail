import { NextRequest, NextResponse } from 'next/server';
import { isSafePublicUrl, getSafeProxyAgent } from '@/lib/isSafePublicUrl';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    if (!url) {
      return new NextResponse('Missing url parameter', { status: 400 });
    }

    // SSRF Validation: verify protocol and verify hostname resolves strictly to public, non-private IPs
    const isSafe = await isSafePublicUrl(url);
    if (!isSafe) {
      return new NextResponse('Invalid or forbidden URL', { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let response: Response;
    try {
      // getSafeProxyAgent enforces custom DNS lookup at socket-connection time to eliminate TOCTOU / DNS-rebinding
      const dispatcher = getSafeProxyAgent();
      response = await fetch(url, {
        headers: {
          'User-Agent': 'EazzioMailProxy/1.0 (Privacy-Preserving)',
          Accept: 'image/*',
        },
        signal: controller.signal,
        // @ts-expect-error Node fetch dispatcher option
        dispatcher,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return new NextResponse('Failed to fetch remote image', { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse('Proxy error', { status: 502 });
  }
}
