import { NextRequest, NextResponse } from 'next/server';
import { getProxyAuthHeaders } from '../../../../../../lib/api-auth-helper';

const API_BACKEND_URL = process.env.API_BACKEND_URL || 'http://127.0.0.1:8080';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const headers = getProxyAuthHeaders(req);

    const response = await fetch(`${API_BACKEND_URL}/v1/messages/outbound/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      headers,
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = {
        success: false,
        error: responseText || `Backend responded with status ${response.status}`,
      };
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('API Gateway outbound cancel proxy error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal service communication error',
      },
      { status: 502 }
    );
  }
}
