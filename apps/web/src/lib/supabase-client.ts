import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://flcubtmchuiavpxxacpa.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsY3VidG1jaHVpYXZweHhhY3BhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMjI5MjUsImV4cCI6MjEwMjY5ODkyNX0.7Zx4AKSeUa959LZGrJgmS_anGpXYDYsh_0ci5L2_o3Q';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
