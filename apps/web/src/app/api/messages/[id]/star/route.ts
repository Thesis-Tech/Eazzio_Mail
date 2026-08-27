import { NextRequest, NextResponse } from 'next/server';
import { getProxyAuthHeaders } from '../../../../../lib/api-auth-helper';

const API_BACKEND_URL = process.env.API_BACKEND_URL || 'http://127.0.0.1:8080';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const headers = getProxyAuthHeaders(req);

    let body = {};
    try {
      body = await req.json();
    } catch {
      // Empty body allowed
    }

    const response = await fetch(`${API_BACKEND_URL}/v1/messages/${id}/star`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Star API proxy error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Star update error' },
      { status: 502 }
    );
  }
}
