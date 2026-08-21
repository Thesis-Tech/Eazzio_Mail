import fs from 'fs';
import path from 'path';
import { app } from './app.js';

// Load .env and .env.local if present
function loadEnvFile(filePath: string) {
  if (fs.existsSync(filePath)) {
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...v] = trimmed.split('=');
        if (k && !process.env[k.trim()]) {
          process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    }
  }
}

loadEnvFile(path.resolve(process.cwd(), '.env'));
loadEnvFile(path.resolve(process.cwd(), '.env.local'));
loadEnvFile(path.resolve(process.cwd(), '../../.env.local'));

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`🚀 Eazzio Mail Backend API Server listening on port ${port} (Transport: ${process.env.MAIL_TRANSPORT || 'smtp'})`);
});
