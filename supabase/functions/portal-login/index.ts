import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"
import { SignJWT } from "https://deno.land/x/jose@v4.14.4/index.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Fungsi untuk SHA-256 Hashing PIN
async function hashPIN(pin: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(pin)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, credential } = await req.json()

    if (!type || !credential) {
      return new Response(JSON.stringify({ error: 'Missing type or credential' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (!['guru', 'siswa'].includes(type)) {
      return new Response(JSON.stringify({ error: 'Invalid type' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const jwtSecret = Deno.env.get('PORTAL_JWT_SECRET') ?? ''

    if (!supabaseUrl || !supabaseServiceKey || !jwtSecret) {
      throw new Error('Missing server configuration')
    }

    // Menggunakan service_role key untuk melewati RLS saat mencari data user
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    let userId = ''
    let userName = ''

    if (type === 'guru') {
      const hashedCredential = await hashPIN(credential)
      
      const { data, error } = await supabaseAdmin
        .from('employees')
        .select('id, nama')
        .eq('kode_akses_hash', hashedCredential)
        .eq('status', 'aktif')
        .single()

      if (error || !data) {
        return new Response(JSON.stringify({ error: 'Kode akses tidak valid atau akun tidak aktif' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      
      userId = data.id
      userName = data.nama
      
    } else if (type === 'siswa') {
      const { data, error } = await supabaseAdmin
        .from('students')
        .select('id, nama')
        .eq('nisn', credential)
        .single()

      if (error || !data) {
        return new Response(JSON.stringify({ error: 'NISN tidak ditemukan' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      
      userId = data.id
      userName = data.nama
    }

    // Generate Custom JWT
    const secret = new TextEncoder().encode(jwtSecret)
    const token = await new SignJWT({ 
        id: userId, 
        nama: userName,
        type: type, 
        role: 'portal_user' 
      })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('2h') // Berlaku 2 jam
      .sign(secret)

    return new Response(JSON.stringify({ token, user: { id: userId, nama: userName, type } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Internal Server Error: ' + err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
