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

    if (payload.role !== 'portal_user' || payload.type !== 'guru') {
      return new Response(JSON.stringify({ error: 'Unauthorized role' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const employeeId = payload.id as string

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Fetch payroll records with nested deductions
    const { data: records, error } = await supabaseAdmin
      .from('payroll_records')
      .select(`
        id, periode, gaji_pokok, total_potongan, gaji_bersih, status, created_at, penghasilan_details,
        employees ( nama, nip ),
        payroll_deductions (
          id, nominal,
          deduction_types ( nama )
        )
      `)
      .eq('employee_id', employeeId)
      .order('periode', { ascending: false })

    if (error) {
      throw error
    }

    return new Response(JSON.stringify({ records }), {
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
