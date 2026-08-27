import { NextRequest, NextResponse } from 'next/server';
import { getProxyAuthHeaders } from '../../../../../lib/api-auth-helper';

const API_BACKEND_URL = process.env.API_BACKEND_URL || 'http://127.0.0.1:8080';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const headers = getProxyAuthHeaders(req);

    const response = await fetch(`${API_BACKEND_URL}/v1/messages/${id}/spam`, {
      method: 'POST',
      headers,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Report spam API proxy error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error reporting spam' },
      { status: 502 }
    );
  }
}
