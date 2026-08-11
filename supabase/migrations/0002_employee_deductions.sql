-- 10. employee_deductions (Template Potongan per Pegawai)
CREATE TABLE public.employee_deductions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    deduction_type_id UUID NOT NULL REFERENCES public.deduction_types(id) ON DELETE CASCADE,
    custom_nominal NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    -- Memastikan satu pegawai tidak punya duplikat untuk jenis potongan yang sama
    UNIQUE(employee_id, deduction_type_id)
);

-- Mengaktifkan RLS
ALTER TABLE public.employee_deductions ENABLE ROW LEVEL SECURITY;

-- Memberikan akses penuh bagi Admin
CREATE POLICY "Admins can do everything on employee_deductions" 
ON public.employee_deductions FOR ALL 
USING (public.is_admin());
