-- Migration to add status column with constraints to students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('aktif', 'lulus', 'keluar')) DEFAULT 'aktif';
