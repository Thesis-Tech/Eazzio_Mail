import { NextRequest, NextResponse } from 'next/server';
import { getProxyAuthHeaders } from '../../../lib/api-auth-helper';

const API_BACKEND_URL = process.env.API_BACKEND_URL || 'http://127.0.0.1:8080';

// Allowed folder values to prevent injection
const ALLOWED_FOLDERS = new Set([
  'inbox', 'drafts', 'starred', 'sent', 'spam', 'trash', 'archive',
  'snoozed', 'important', 'scheduled', 'all-mail',
]);

export async function GET(req: NextRequest) {
  try {
    const headers = getProxyAuthHeaders(req);
    const { searchParams } = new URL(req.url);
    const folder = searchParams.get('folder') || 'inbox';
    const limit = searchParams.get('limit') || '50';

    // Validate folder parameter
    if (!ALLOWED_FOLDERS.has(folder.toLowerCase().replace('fld-', ''))) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_FOLDER', message: `Invalid folder: ${folder}` } },
        { status: 400 }
      );
    }

    // Validate limit parameter
    const limitNum = parseInt(limit, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 200) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_LIMIT', message: 'Limit must be between 1 and 200' } },
        { status: 400 }
      );
    }

    let response: Response;
    try {
      response = await fetch(`${API_BACKEND_URL}/v1/messages?folder=${encodeURIComponent(folder)}&limit=${limitNum}`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(15000), // 15s timeout
      });
    } catch (fetchErr: any) {
      // Backend unreachable — distinguish from app errors
      console.error('Backend unreachable for /v1/messages:', fetchErr.message);
      return NextResponse.json(
        { success: false, error: { code: 'BACKEND_UNAVAILABLE', message: 'Mail service is temporarily unavailable' } },
        { status: 502 }
      );
    }

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      // Backend returned non-JSON (e.g. HTML error page)
      console.error('Backend returned non-JSON for /v1/messages:', response.status, responseText.slice(0, 200));
      data = { success: false, error: { code: 'BACKEND_ERROR', message: 'Unable to load messages' } };
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('API Gateway messages proxy error:', error.message);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal service communication error' } },
      { status: 502 }
    );
  }
}
