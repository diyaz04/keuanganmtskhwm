-- Migration to add avatar_url column to admin_profiles table
ALTER TABLE public.admin_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
