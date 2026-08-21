import fs from 'fs';
import path from 'path';

function loadEnvFile(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const eqIdx = trimmed.indexOf('=');
          const k = trimmed.slice(0, eqIdx).trim();
          const v = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
          if (k && !process.env[k]) {
            process.env[k] = v;
          }
        }
      }
    }
  } catch {
    // Ignore error in reading env file
  }
}

// Search root and service level .env files
loadEnvFile(path.resolve(process.cwd(), '.env'));
loadEnvFile(path.resolve(process.cwd(), '.env.local'));
loadEnvFile(path.resolve(process.cwd(), '../../.env'));
loadEnvFile(path.resolve(process.cwd(), '../../.env.local'));
loadEnvFile(path.resolve(process.cwd(), 'services/api/.env'));
loadEnvFile(path.resolve(process.cwd(), 'services/api/.env.local'));
