-- Drop the existing check constraint on the role column
ALTER TABLE public.admin_profiles
  DROP CONSTRAINT IF EXISTS admin_profiles_role_check;

-- Add the new check constraint that includes 'koperasi'
ALTER TABLE public.admin_profiles
  ADD CONSTRAINT admin_profiles_role_check CHECK (role IN ('admin', 'bendahara', 'koperasi'));
