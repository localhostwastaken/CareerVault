// Empties the Supabase Storage bucket (encrypted PDFs and wrapped org signing keys) as part
// of `npm run demo:reset-prod`. It must run together with the database reset: a database
// without these objects re-mints keys on first signature, but objects without their rows
// are orphaned ciphertext. Prints counts only, never object names or contents.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

if (process.env.STORAGE_DRIVER !== 'supabase') {
  console.log('STORAGE_DRIVER is not "supabase"; nothing to wipe.');
  process.exit(0);
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'careervault-storage';
if (!url || !key)
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
const storage = createClient(url, key, {
  auth: { persistSession: false },
}).storage.from(bucket);

// Supabase lists one folder level at a time; entries without an id are folders.
async function listFiles(prefix: string): Promise<string[]> {
  const files: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await storage.list(prefix, { limit: 1000, offset });
    if (error) throw new Error(`list failed: ${error.message}`);
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id) files.push(path);
      else files.push(...(await listFiles(path)));
    }
    if (data.length < 1000) return files;
  }
}

const files = await listFiles('');
for (let i = 0; i < files.length; i += 100) {
  const { error } = await storage.remove(files.slice(i, i + 100));
  if (error) throw new Error(`remove failed: ${error.message}`);
}
console.log(`Removed ${files.length} object(s) from the storage bucket.`);
