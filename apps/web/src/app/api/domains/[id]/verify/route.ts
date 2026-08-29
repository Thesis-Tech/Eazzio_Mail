import { NextRequest, NextResponse } from 'next/server';
import { getProxyAuthHeaders } from '../../../../../lib/api-auth-helper';

const API_BACKEND_URL = process.env.API_BACKEND_URL || 'http://127.0.0.1:8080';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const headers = getProxyAuthHeaders(req);
    const response = await fetch(`${API_BACKEND_URL}/v1/domains/${params.id}/verify`, {
      method: 'POST',
      headers,
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Error verifying domain DNS' } },
      { status: 502 }
    );
  }
}
