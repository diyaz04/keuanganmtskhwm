-- Migration to add angkatan column to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS angkatan TEXT;
