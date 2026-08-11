-- Migration: Konfigurasi Tagihan (Template + Pengecualian Berprestasi/Keringanan)

-- 1. billing_templates (Jenis tagihan standar yang bisa dipakai berulang)
CREATE TABLE public.billing_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jenis_tagihan TEXT NOT NULL,
    nominal NUMERIC NOT NULL DEFAULT 0,
    keterangan TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. student_billing_overrides (Pengecualian per siswa: gratis / keringanan)
CREATE TABLE public.student_billing_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    billing_template_id UUID NOT NULL REFERENCES public.billing_templates(id) ON DELETE CASCADE,
    tipe TEXT NOT NULL CHECK (tipe IN ('gratis', 'keringanan')),
    nominal_override NUMERIC,
    alasan TEXT NOT NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT chk_end_after_start CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT chk_keringanan_has_nominal CHECK (
        (tipe = 'keringanan' AND nominal_override IS NOT NULL AND nominal_override >= 0)
        OR (tipe = 'gratis')
    )
);

CREATE INDEX idx_sbo_student ON public.student_billing_overrides(student_id);
CREATE INDEX idx_sbo_template ON public.student_billing_overrides(billing_template_id);

-- RLS
ALTER TABLE public.billing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_billing_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on billing_templates" ON public.billing_templates FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can do everything on student_billing_overrides" ON public.student_billing_overrides FOR ALL USING (public.is_admin());
