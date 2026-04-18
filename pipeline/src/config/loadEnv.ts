import { existsSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';

const candidates = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '..', '.env'),
];

let loaded = false;
for (const path of candidates) {
  if (existsSync(path)) {
    config({ path });
    loaded = true;
    break;
  }
}

if (!loaded) {
  // Fallback to dotenv default lookup behavior.
  config();
}
