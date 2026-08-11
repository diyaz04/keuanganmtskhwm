-- Migration: Jatuh tempo tidak lagi wajib diisi saat membuat tagihan,
-- dan tambah info rekening pembayaran madrasah yang tampil di portal wali.

-- 1. Jatuh tempo dibuat opsional (kolom dipertahankan untuk kompatibilitas data lama)
ALTER TABLE public.bills ALTER COLUMN jatuh_tempo DROP NOT NULL;

-- 2. school_settings (baris tunggal berisi info rekening madrasah)
CREATE TABLE public.school_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    nama_bank TEXT,
    no_rekening TEXT,
    atas_nama TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

INSERT INTO public.school_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can do everything on school_settings" ON public.school_settings FOR ALL USING (public.is_admin());
