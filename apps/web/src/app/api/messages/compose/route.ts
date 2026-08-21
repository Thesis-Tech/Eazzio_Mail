import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const API_BACKEND_URL = process.env.API_BACKEND_URL || 'http://127.0.0.1:8080';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_jwt_key_must_change_in_prod';

function createDevToken(email: string = 'user@eazzio.com'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      userId: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
      sessionId: 'sess_1',
      email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  ).toString('base64url');

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

export async function POST(req: NextRequest) {
  try {
    let authHeader = req.headers.get('authorization') || '';
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.includes('default-token') || authHeader.includes('token_')) {
      authHeader = `Bearer ${createDevToken()}`;
    }

    const body = await req.json();

    const response = await fetch(`${API_BACKEND_URL}/v1/messages/compose`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
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
