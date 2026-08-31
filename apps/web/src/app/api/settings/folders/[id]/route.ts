import { NextRequest, NextResponse } from 'next/server';
import { getProxyAuthHeaders } from '../../../../../lib/api-auth-helper';

const API_BACKEND_URL = process.env.API_BACKEND_URL || 'http://127.0.0.1:8080';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const headers = getProxyAuthHeaders(req);
    const body = await req.json();
    const response = await fetch(`${API_BACKEND_URL}/v1/settings/folders/${id}`, {
      method: 'PATCH',
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
      { success: false, error: error.message || 'Error updating folder' },
      { status: 502 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const headers = getProxyAuthHeaders(req);
    const response = await fetch(`${API_BACKEND_URL}/v1/settings/folders/${id}`, {
      method: 'DELETE',
      headers,
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error deleting folder' },
      { status: 502 }
    );
  }
}
