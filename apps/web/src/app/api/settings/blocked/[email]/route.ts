import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.API_GATEWAY_URL || 'http://127.0.0.1:8080';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const { email } = await params;
    const authHeader = request.headers.get('authorization') || '';
    const cookieHeader = request.headers.get('cookie') || '';

    const res = await fetch(`${API_BASE}/v1/settings/blocked/${encodeURIComponent(email)}`, {
      method: 'DELETE',
      headers: {
        ...(authHeader ? { authorization: authHeader } : {}),
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
