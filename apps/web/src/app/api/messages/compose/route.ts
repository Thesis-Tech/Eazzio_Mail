import { NextRequest, NextResponse } from 'next/server';

const API_BACKEND_URL = process.env.API_BACKEND_URL || 'http://127.0.0.1:8080';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const body = await req.json();

    const response = await fetch(`${API_BACKEND_URL}/v1/messages/compose`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader || 'Bearer default-token',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('API Gateway message compose proxy error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal service communication error',
      },
      { status: 502 }
    );
  }
}
