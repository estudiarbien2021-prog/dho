-- Create a security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the current user has admin role in their metadata or email
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND (
      raw_user_meta_data->>'role' = 'admin' 
      OR email LIKE '%admin%'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Update all policies to use the new function instead of direct auth.users access

-- Fix validated_picks policy
DROP POLICY IF EXISTS "Admins can manage all validated picks" ON public.validated_picks;
CREATE POLICY "Admins can manage all validated picks"
ON public.validated_picks
FOR ALL
USING (public.is_admin());

-- Fix matches policies  
DROP POLICY IF EXISTS "Admins can delete matches" ON public.matches;
DROP POLICY IF EXISTS "Admins can insert matches" ON public.matches;
DROP POLICY IF EXISTS "Admins can update matches" ON public.matches;

CREATE POLICY "Admins can delete matches"
ON public.matches
FOR DELETE
USING (public.is_admin());

CREATE POLICY "Admins can insert matches"
ON public.matches
FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update matches"
ON public.matches
FOR UPDATE
USING (public.is_admin());

-- Fix profiles policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_admin());