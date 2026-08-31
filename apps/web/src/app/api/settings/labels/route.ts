import { NextRequest, NextResponse } from 'next/server';
import { getProxyAuthHeaders } from '../../../../lib/api-auth-helper';

const API_BACKEND_URL = process.env.API_BACKEND_URL || 'http://127.0.0.1:8080';

export async function GET(req: NextRequest) {
  try {
    const headers = getProxyAuthHeaders(req);
    const response = await fetch(`${API_BACKEND_URL}/v1/settings/labels`, {
      method: 'GET',
      headers,
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error fetching labels' },
      { status: 502 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const headers = getProxyAuthHeaders(req);
    const body = await req.json();
    const response = await fetch(`${API_BACKEND_URL}/v1/settings/labels`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error creating label' },
      { status: 502 }
    );
  }
}
