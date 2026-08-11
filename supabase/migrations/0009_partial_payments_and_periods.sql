-- ==============================================================================
-- MIGRATION: 0009_partial_payments_and_periods.sql
-- PURPOSE: Support cicilan (partial payments) and billing template periods.
-- ==============================================================================

-- 1. Tambahkan tipe_periode ke tabel billing_templates
ALTER TABLE public.billing_templates 
ADD COLUMN tipe_periode TEXT NOT NULL CHECK (tipe_periode IN ('bulanan', 'tahunan', 'sekali_selama_sekolah')) DEFAULT 'bulanan';

-- 2. Tambahkan kolom untuk mendukung pembayaran parsial di tabel payments
ALTER TABLE public.payments 
ADD COLUMN nominal_dibayar NUMERIC;

-- 3. Tambahkan kolom nominal_terbayar di tabel bills untuk tracking cepat
ALTER TABLE public.bills 
ADD COLUMN nominal_terbayar NUMERIC NOT NULL DEFAULT 0;

-- 4. MIGRASI DATA LAMA: Update payment lama yang berstatus 'approved'
-- Kita asumsikan pembayaran lama yang sudah disetujui itu membayar penuh (karena sebelumnya tidak ada cicilan)
UPDATE public.payments p
SET nominal_dibayar = b.nominal
FROM public.bills b
WHERE p.bill_id = b.id AND p.status = 'approved';

-- 5. MIGRASI DATA LAMA: Update tagihan lama yang berstatus 'paid'
UPDATE public.bills
SET nominal_terbayar = nominal
WHERE status = 'paid';
