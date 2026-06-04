import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const defaultDatabasePath = path.resolve(currentDir, '../../data/meditrack.db');
const databasePath = process.env.DATABASE_URL?.startsWith('file:')
  ? process.env.DATABASE_URL.replace('file:', '')
  : defaultDatabasePath;

for (const file of [databasePath, `${databasePath}-wal`, `${databasePath}-shm`]) {
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

await import('./seed.js');
