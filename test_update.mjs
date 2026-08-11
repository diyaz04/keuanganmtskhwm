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
  console.log('Running update...');
  const { data, error } = await supabase
    .from('bills')
    .update({ status: 'unpaid', nominal_terbayar: 0 })
    .neq('status', 'draft')
    .gt('nominal', 0)
    .select();
    
  console.log('Update error:', error?.message);
  console.log('Updated rows:', data?.length);
  
  if (data && data.length > 0) {
     const paid = data.filter(d => d.status === 'paid');
     console.log('Still paid after update:', paid.length);
  }
}
check();
