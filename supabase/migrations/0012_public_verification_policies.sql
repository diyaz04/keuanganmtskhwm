-- ==============================================================================
-- MIGRATION: 0012_public_verification_policies.sql
-- PURPOSE: Create secure RPC functions for public document verification.
-- ==============================================================================

-- 1. Create verify_payroll_record function
CREATE OR REPLACE FUNCTION public.verify_payroll_record(record_id UUID)
RETURNS TABLE (
  id UUID,
  periode TEXT,
  gaji_pokok NUMERIC,
  total_potongan NUMERIC,
  gaji_bersih NUMERIC,
  status TEXT,
  created_at TIMESTAMPTZ,
  penghasilan_details JSONB,
  employee_nama TEXT,
  employee_nip TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    pr.id, 
    pr.periode, 
    pr.gaji_pokok, 
    pr.total_potongan, 
    pr.gaji_bersih, 
    pr.status,
    pr.created_at,
    pr.penghasilan_details,
    e.nama, 
    e.nip
  FROM public.payroll_records pr
  JOIN public.employees e ON pr.employee_id = e.id
  WHERE pr.id = record_id;
$$;

-- Grant execute to public and anon roles
GRANT EXECUTE ON FUNCTION public.verify_payroll_record(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_payroll_record(UUID) TO authenticated;

-- 2. Create verify_payment_record function with backward-compatibility for bill_id
CREATE OR REPLACE FUNCTION public.verify_payment_record(search_id UUID)
RETURNS TABLE (
  id UUID,
  nomor_kwitansi TEXT,
  tanggal_bayar TIMESTAMPTZ,
  nominal_dibayar NUMERIC,
  student_nama TEXT,
  student_nisn TEXT,
  student_kelas TEXT,
  jenis_tagihan TEXT,
  catatan TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First try to match by payment_id
  IF EXISTS (SELECT 1 FROM public.payments WHERE id = search_id) THEN
    RETURN QUERY
    SELECT 
      p.id, 
      p.nomor_kwitansi, 
      p.tanggal_bayar, 
      COALESCE(p.nominal_dibayar, b.nominal), 
      s.nama, 
      s.nisn, 
      s.kelas, 
      b.jenis_tagihan, 
      p.catatan
    FROM public.payments p
    JOIN public.bills b ON p.bill_id = b.id
    JOIN public.students s ON b.student_id = s.id
    WHERE p.id = search_id;
  ELSE
    -- If not found, try to match by bill_id (for backward compatibility with old QR codes)
    RETURN QUERY
    SELECT 
      p.id, 
      p.nomor_kwitansi, 
      p.tanggal_bayar, 
      COALESCE(p.nominal_dibayar, b.nominal), 
      s.nama, 
      s.nisn, 
      s.kelas, 
      b.jenis_tagihan, 
      p.catatan
    FROM public.payments p
    JOIN public.bills b ON p.bill_id = b.id
    JOIN public.students s ON b.student_id = s.id
    WHERE b.id = search_id
    ORDER BY p.tanggal_bayar DESC, p.created_at DESC
    LIMIT 1;
  END IF;
END;
$$;

-- Grant execute to public and anon roles
GRANT EXECUTE ON FUNCTION public.verify_payment_record(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_payment_record(UUID) TO authenticated;
