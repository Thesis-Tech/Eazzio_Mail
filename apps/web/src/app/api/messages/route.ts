import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const API_BACKEND_URL = process.env.API_BACKEND_URL || 'http://127.0.0.1:8080';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_jwt_key_must_change_in_prod';

function createDevToken(email: string = 'rahulkumar@eazzio.com'): string {
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

export async function GET(req: NextRequest) {
  try {
    let authHeader = req.headers.get('authorization') || '';
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.includes('default-token') || authHeader.includes('token_')) {
      authHeader = `Bearer ${createDevToken('rahulkumar@eazzio.com')}`;
    }

    const { searchParams } = new URL(req.url);
    const folder = searchParams.get('folder') || 'inbox';
    const limit = searchParams.get('limit') || '50';

    const response = await fetch(`${API_BACKEND_URL}/v1/messages?folder=${folder}&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { success: false, error: responseText || `Backend responded with status ${response.status}` };
    }
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('API Gateway messages list proxy error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal service communication error',
      },
      { status: 502 }
    );
  }
}
