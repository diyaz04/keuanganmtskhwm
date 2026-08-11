import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envText = fs.readFileSync('.env', 'utf-8');
const env = {};
envText.split(/\r?\n/).forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length > 0) {
    let val = rest.join('=').trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[key.trim()] = val;
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('bills').select('id, status, nominal, terbayar').eq('status', 'paid');
  console.log('Paid bills:', data?.length);
  if (data && data.length > 0) {
    console.log('Sample:', data.slice(0, 5));
  }
}
check();
