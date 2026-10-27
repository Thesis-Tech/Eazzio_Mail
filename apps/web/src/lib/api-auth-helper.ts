import { NextRequest } from 'next/server';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_jwt_key_must_change_in_prod';

export function getProxyAuthHeaders(req: NextRequest, defaultEmail?: string): Record<string, string> {
  const userEmail = (req.headers.get('x-user-email') || defaultEmail || '').trim().toLowerCase();
  let authHeader = req.headers.get('authorization') || '';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (authHeader) {
    headers['Authorization'] = authHeader;
  }

  if (userEmail) {
    headers['x-user-email'] = userEmail;
  }

  return headers;
}
