import { NextRequest, NextResponse } from 'next/server';
import { getProxyAuthHeaders } from '../../../lib/api-auth-helper';

const API_BACKEND_URL = process.env.API_BACKEND_URL || 'http://127.0.0.1:8080';

export async function GET(req: NextRequest) {
  try {
    const headers = getProxyAuthHeaders(req);
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();

    if (!q || q.length < 1) {
      return NextResponse.json({ success: true, data: [] });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let response: Response;
    try {
      response = await fetch(`${API_BACKEND_URL}/v1/contacts/suggest?q=${encodeURIComponent(q)}`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return NextResponse.json({ success: true, data: [] });
    }

    const json = await response.json();
    return NextResponse.json(json);
  } catch {
    return NextResponse.json({ success: true, data: [] });
  }
}
