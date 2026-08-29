import { NextRequest, NextResponse } from 'next/server';
import { getProxyAuthHeaders } from '../../../../lib/api-auth-helper';

const API_BACKEND_URL = process.env.API_BACKEND_URL || 'http://127.0.0.1:8080';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const headers = getProxyAuthHeaders(req);
    const response = await fetch(`${API_BACKEND_URL}/v1/domains/${id}`, {
      method: 'GET',
      headers,
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Error fetching domain' } },
      { status: 502 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const headers = getProxyAuthHeaders(req);
    const response = await fetch(`${API_BACKEND_URL}/v1/domains/${id}`, {
      method: 'DELETE',
      headers,
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Error deleting domain' } },
      { status: 502 }
    );
  }
}

