import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase-client';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  let next = searchParams.get('next') ?? '/mail';
  if (!next.startsWith('/')) {
    next = '/mail';
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.session) {
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      const redirectTarget = isLocalEnv
        ? `${origin}${next}`
        : forwardedHost
        ? `https://${forwardedHost}${next}`
        : `${origin}${next}`;

      const res = NextResponse.redirect(redirectTarget);
      // Ensure session cookie or redirect is returned
      return res;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
