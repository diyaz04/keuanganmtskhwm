-- Add penghasilan_details to store a JSON object of earnings breakdown
ALTER TABLE public.payroll_records 
ADD COLUMN IF NOT EXISTS penghasilan_details JSONB;
