import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"
import { jwtVerify } from "https://deno.land/x/jose@v4.14.4/index.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = Deno.env.get('PORTAL_JWT_SECRET') ?? ''
    
    if (!jwtSecret) {
      throw new Error('Missing server configuration')
    }

    // Verify Custom JWT
    const secret = new TextEncoder().encode(jwtSecret)
    let payload
    try {
      const verified = await jwtVerify(token, secret)
      payload = verified.payload
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (payload.role !== 'portal_user' || payload.type !== 'siswa') {
      return new Response(JSON.stringify({ error: 'Unauthorized role' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const studentId = payload.id as string

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Fetch bills with payments
    const { data: bills, error } = await supabaseAdmin
      .from('bills')
      .select(`
        id, jenis_tagihan, nominal, nominal_terbayar, status, created_at,
        students ( nama, nisn ),
        payments (
          id, status, catatan, nominal_dibayar, tanggal_bayar, nomor_kwitansi
        )
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // Info rekening madrasah untuk ditampilkan saat wali upload bukti transfer
    const { data: rekening } = await supabaseAdmin
      .from('school_settings')
      .select('nama_bank, no_rekening, atas_nama')
      .eq('id', 1)
      .maybeSingle()

    return new Response(JSON.stringify({ bills, rekening: rekening || null }), {
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
