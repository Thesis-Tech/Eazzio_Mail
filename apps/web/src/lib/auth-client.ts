import { supabase } from './supabase-client';

export const authClient = {
  signIn: supabase.auth.signInWithPassword.bind(supabase.auth),
  signUp: supabase.auth.signUp.bind(supabase.auth),
  signOut: supabase.auth.signOut.bind(supabase.auth),
  getSession: supabase.auth.getSession.bind(supabase.auth),
  getUser: supabase.auth.getUser.bind(supabase.auth),
  verifyOtp: supabase.auth.verifyOtp.bind(supabase.auth),
  resetPasswordForEmail: supabase.auth.resetPasswordForEmail.bind(supabase.auth),
};

export const signIn = authClient.signIn;
export const signUp = authClient.signUp;
export const signOut = authClient.signOut;
export const getSession = authClient.getSession;
