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

    const { distributions, file_base64, content_type, bukti_url } = await req.json()

    if (!distributions || !Array.isArray(distributions) || distributions.length === 0 || (!file_base64 && !bukti_url)) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    let publicUrl = bukti_url || ''

    // Only upload to Cloudinary if bukti_url is not provided (legacy base64 flow)
    if (!bukti_url && file_base64) {
      const cloudinaryCloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME') ?? ''
      const cloudinaryApiKey = Deno.env.get('CLOUDINARY_API_KEY') ?? ''
      const cloudinaryApiSecret = Deno.env.get('CLOUDINARY_API_SECRET') ?? ''

      if (!cloudinaryCloudName || !cloudinaryApiKey || !cloudinaryApiSecret) {
         return new Response(JSON.stringify({ error: 'Cloudinary configuration missing' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Upload file to Cloudinary
      const timestamp = Math.round(new Date().getTime() / 1000).toString()
      const folder = `payment_proofs/${studentId}`
      const strToSign = `folder=${folder}&timestamp=${timestamp}${cloudinaryApiSecret}`
      
      const msgBuffer = new TextEncoder().encode(strToSign)
      const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      const formData = new FormData()
      formData.append('file', `data:${content_type || 'image/jpeg'};base64,${file_base64}`)
      formData.append('api_key', cloudinaryApiKey)
      formData.append('timestamp', timestamp)
      formData.append('folder', folder)
      formData.append('signature', signature)

      const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`, {
        method: 'POST',
        body: formData
      })

      if (!cloudinaryRes.ok) {
        const errorText = await cloudinaryRes.text()
        throw new Error(`Cloudinary upload failed: ${errorText}`)
      }

      const cloudinaryData = await cloudinaryRes.json()
      publicUrl = cloudinaryData.secure_url
    }

    const paymentsInserted = []

    for (const dist of distributions) {
      const { data: billData } = await supabaseAdmin.from('bills').select('*').eq('id', dist.bill_id).eq('student_id', studentId).single()
      if (!billData) continue;

      let remaining_to_distribute = dist.nominal_dibayar;
      let current_bill = billData;

      const regex = /^(.+) \((Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember) (\d{4})\)$/;
      const match = current_bill.jenis_tagihan.match(regex);

      if (match && remaining_to_distribute > (current_bill.nominal - current_bill.nominal_terbayar)) {
        // Overpayment for monthly bill
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        const baseName = match[1];
        let currentMonthIndex = months.indexOf(match[2]);
        let currentYear = parseInt(match[3]);

        while (remaining_to_distribute > 0) {
          let to_pay_this_bill = Math.min(remaining_to_distribute, current_bill.nominal - current_bill.nominal_terbayar);
          if (to_pay_this_bill <= 0) {
            to_pay_this_bill = Math.min(remaining_to_distribute, current_bill.nominal);
          }
          
          const { data: payInsert } = await supabaseAdmin.from('payments').insert({
            bill_id: current_bill.id,
            bukti_transfer_url: publicUrl,
            catatan: dist.catatan || '',
            nominal_dibayar: to_pay_this_bill,
            status: 'pending'
          }).select().single();
          
          if (payInsert) paymentsInserted.push(payInsert);

          remaining_to_distribute -= to_pay_this_bill;

          if (remaining_to_distribute > 0) {
            currentMonthIndex++;
            if (currentMonthIndex > 11) {
              currentMonthIndex = 0;
              currentYear++;
            }
            const nextMonthName = months[currentMonthIndex];
            const nextJenisTagihan = `${baseName} (${nextMonthName} ${currentYear})`;
            
            const { data: existingBill } = await supabaseAdmin.from('bills')
              .select('*')
              .eq('student_id', studentId)
              .eq('jenis_tagihan', nextJenisTagihan)
              .maybeSingle();

            if (existingBill) {
              current_bill = existingBill;
            } else {
              // Generate date string for next month's 10th
              let monthStr = (currentMonthIndex + 1).toString().padStart(2, '0');
              const { data: newBill } = await supabaseAdmin.from('bills').insert({
                student_id: studentId,
                jenis_tagihan: nextJenisTagihan,
                nominal: current_bill.nominal,
                jatuh_tempo: `${currentYear}-${monthStr}-10`,
                status: 'unpaid'
              }).select('*').single();
              if (newBill) current_bill = newBill;
            }
          }
        }
      } else {
        // Normal payment
        const { data: payInsert } = await supabaseAdmin.from('payments').insert({
          bill_id: current_bill.id,
          bukti_transfer_url: publicUrl,
          catatan: dist.catatan || '',
          nominal_dibayar: dist.nominal_dibayar,
          status: 'pending'
        }).select().single();
        if (payInsert) paymentsInserted.push(payInsert);
      }
    }

    return new Response(JSON.stringify({ success: true, payments: paymentsInserted }), {
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
