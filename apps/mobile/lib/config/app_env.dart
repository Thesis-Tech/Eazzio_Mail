class AppEnv {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://web-eight-tau-ctmci0f810.vercel.app',
  );

  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://flcubtmchuiavpxxacpa.supabase.co',
  );

  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsY3VidG1jaHVpYXZweHhhY3BhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMjI5MjUsImV4cCI6MjEwMjY5ODkyNX0.7Zx4AKSeUa959LZGrJgmS_anGpXYDYsh_0ci5L2_o3Q',
  );

  static const String wsUrl = String.fromEnvironment(
    'WS_URL',
    defaultValue: 'wss://web-eight-tau-ctmci0f810.vercel.app/ws',
  );
}
