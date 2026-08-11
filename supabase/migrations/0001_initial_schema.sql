-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. admin_profiles (Extends auth.users for Admin & Bendahara roles)
CREATE TABLE public.admin_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nama TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'bendahara')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. employees (Guru & Karyawan)
CREATE TABLE public.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama TEXT NOT NULL,
    nip TEXT UNIQUE,
    kode_akses_hash TEXT, -- Disimpan dalam bentuk hash (seperti bcrypt) untuk login guru
    gaji_pokok NUMERIC NOT NULL DEFAULT 0,
    tunjangan NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('aktif', 'nonaktif')) DEFAULT 'aktif',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. students (Siswa)
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nisn TEXT UNIQUE NOT NULL,
    nama TEXT NOT NULL,
    kelas TEXT NOT NULL,
    nama_wali TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. deduction_types (Jenis Potongan: Koperasi, dll)
CREATE TABLE public.deduction_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama TEXT NOT NULL,
    tipe TEXT NOT NULL CHECK (tipe IN ('flat', 'persen')),
    default_nominal NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. payroll_records (Rekaman Penggajian Bulanan)
CREATE TABLE public.payroll_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    periode TEXT NOT NULL, -- Format contoh: '2026-08'
    gaji_pokok NUMERIC NOT NULL DEFAULT 0,
    total_potongan NUMERIC NOT NULL DEFAULT 0,
    gaji_bersih NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'paid')) DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. payroll_deductions (Detail Potongan Penggajian per Karyawan)
CREATE TABLE public.payroll_deductions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_record_id UUID NOT NULL REFERENCES public.payroll_records(id) ON DELETE CASCADE,
    deduction_type_id UUID NOT NULL REFERENCES public.deduction_types(id) ON DELETE RESTRICT,
    nominal NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. koperasi_uploads (Upload File Tagihan Koperasi)
CREATE TABLE public.koperasi_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    periode TEXT NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'processed', 'failed')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 8. bills (Tagihan Siswa)
CREATE TABLE public.bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    jenis_tagihan TEXT NOT NULL,
    nominal NUMERIC NOT NULL DEFAULT 0,
    jatuh_tempo DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('unpaid', 'partial', 'paid')) DEFAULT 'unpaid',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 9. payments (Pembayaran Tagihan Siswa)
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
    bukti_transfer_url TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    catatan TEXT,
    nomor_kwitansi TEXT,
    tanggal_bayar TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) CONFIGURATION
-- ==========================================

-- Mengaktifkan RLS untuk semua tabel
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deduction_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.koperasi_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Helper Function: Mengecek apakah user login adalah Admin / Bendahara
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_profiles WHERE id = auth.uid()
  );
$$;

-- Policies: Admin/Bendahara memiliki akses penuh (CRUD) ke seluruh tabel
CREATE POLICY "Admins can do everything on employees" ON public.employees FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can do everything on students" ON public.students FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can do everything on deduction_types" ON public.deduction_types FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can do everything on payroll_records" ON public.payroll_records FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can do everything on payroll_deductions" ON public.payroll_deductions FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can do everything on koperasi_uploads" ON public.koperasi_uploads FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can do everything on bills" ON public.bills FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can do everything on payments" ON public.payments FOR ALL USING (public.is_admin());

-- Policy khusus untuk admin_profiles
-- Admin bisa melihat semua profile, dan user bisa melihat profile-nya sendiri.
CREATE POLICY "Admins can do everything on admin_profiles" ON public.admin_profiles FOR ALL USING (public.is_admin());
CREATE POLICY "Users can view their own admin profile" ON public.admin_profiles FOR SELECT USING (auth.uid() = id);

-- CATATAN PENTING UNTUK AKSES PUBLIK (Guru / Orang Tua):
-- Tidak ada policy "anon" yang dibuat di sini. Dengan RLS aktif, akses langsung dari client via kunci anon (anon key) akan di-block secara otomatis (menghasilkan 0 rows).
-- Sesuai dengan spesifikasi, guru dan wali murid akan mengakses data lewat Edge Functions atau RPC (Database Functions) yang menggunakan SECURITY DEFINER 
-- sehingga mem-bypass RLS untuk read-only akses dan memvalidasi PIN/NISN terlebih dahulu.
