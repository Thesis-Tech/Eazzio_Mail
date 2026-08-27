import { NextRequest } from 'next/server';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_jwt_key_must_change_in_prod';

export function getProxyAuthHeaders(req: NextRequest, defaultEmail?: string): Record<string, string> {
  const userEmail = (req.headers.get('x-user-email') || defaultEmail || '').trim().toLowerCase();
  let authHeader = req.headers.get('authorization') || '';

  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.includes('default-token') || authHeader.includes('token_')) {
    const effectiveEmail = userEmail || 'user@eazzio.com';
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        userId: `usr-${Buffer.from(effectiveEmail).toString('hex').slice(0, 16)}`,
        sessionId: `sess_${Date.now()}`,
        email: effectiveEmail,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    ).toString('base64url');

    const signature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');

    authHeader = `Bearer ${header}.${payload}.${signature}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: authHeader,
  };

  if (userEmail) {
    headers['x-user-email'] = userEmail;
  }

  return headers;
}
