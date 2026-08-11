import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envText = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envText.split(/\r?\n/).forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length > 0) {
    env[key.trim()] = rest.join('=').trim();
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: bills, error: err1 } = await supabase.from('bills').select('id, status, nominal, terbayar').eq('status', 'paid');
  console.log('Paid bills:', bills?.length, 'error:', err1);
  if (bills && bills.length > 0) {
    console.log('Sample:', bills.slice(0, 3));
  }
}
check();
