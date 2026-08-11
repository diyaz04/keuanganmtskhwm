import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Dapatkan auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. Buat Supabase Admin Client menggunakan Service Role Key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 3. Verifikasi JWT pemanggil (apakah user ini sedang login?)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid Token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 4. Verifikasi apakah pemanggil adalah 'admin'
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('admin_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !callerProfile || callerProfile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized: Only admins can create new accounts' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 5. Parse request body
    const { email, password, nama, role } = await req.json()
    
    if (!email || !password || !nama || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    
    if (!['admin', 'bendahara', 'koperasi'].includes(role)) {
      return new Response(JSON.stringify({ error: 'Invalid role' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 6. Buat user di auth.users via Admin API (tidak otomatis login)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true // bypass konfirmasi email untuk staf
    })

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 7. Simpan profile user ke tabel admin_profiles
    const { error: insertError } = await supabaseAdmin
      .from('admin_profiles')
      .insert([
        {
          id: newUser.user.id,
          nama: nama,
          role: role
        }
      ])

    if (insertError) {
      // Rollback: Hapus akun di auth.users jika gagal membuat profil
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      return new Response(JSON.stringify({ error: 'Failed to create admin profile: ' + insertError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ success: true, user: newUser.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
    
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
