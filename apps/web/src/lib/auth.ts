import { supabase } from './supabase-client';

export const auth = {
  client: supabase,
  api: {
    async getSession({ headers }: { headers?: Headers | any } = {}) {
      const authHeader = headers?.get?.('authorization') || headers?.get?.('Authorization') || headers?.['authorization'] || headers?.['Authorization'];
      const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : null;
      if (token) {
        const { data, error } = await supabase.auth.getUser(token);
        if (!error && data?.user) {
          return {
            user: {
              id: data.user.id,
              email: data.user.email || '',
              name: (data.user.user_metadata?.displayName as string) || data.user.email?.split('@')[0] || '',
            },
            session: {
              token,
              userId: data.user.id,
            },
          };
        }
      }
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        return {
          user: {
            id: data.session.user.id,
            email: data.session.user.email || '',
            name: (data.session.user.user_metadata?.displayName as string) || data.session.user.email?.split('@')[0] || '',
          },
          session: {
            token: data.session.access_token,
            userId: data.session.user.id,
          },
        };
      }
      return null;
    },
  },
};
