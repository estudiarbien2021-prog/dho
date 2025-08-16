-- Fix remaining recursion issues in validated_picks and matches policies
-- First, let's update the validated_picks admin policy to avoid profiles table recursion

-- Drop and recreate the admin policy for validated_picks
DROP POLICY IF EXISTS "Admins can manage all validated picks" ON public.validated_picks;

CREATE POLICY "Admins can manage all validated picks"
ON public.validated_picks
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND (
      auth.users.raw_user_meta_data->>'role' = 'admin' 
      OR auth.users.email LIKE '%admin%'
    )
  )
);

-- Update matches policies to avoid profiles table recursion
DROP POLICY IF EXISTS "Admins can delete matches" ON public.matches;
DROP POLICY IF EXISTS "Admins can insert matches" ON public.matches;  
DROP POLICY IF EXISTS "Admins can update matches" ON public.matches;

CREATE POLICY "Admins can delete matches"
ON public.matches
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND (
      auth.users.raw_user_meta_data->>'role' = 'admin' 
      OR auth.users.email LIKE '%admin%'
    )
  )
);

CREATE POLICY "Admins can insert matches"
ON public.matches
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND (
      auth.users.raw_user_meta_data->>'role' = 'admin' 
      OR auth.users.email LIKE '%admin%'
    )
  )
);

CREATE POLICY "Admins can update matches"
ON public.matches
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND (
      auth.users.raw_user_meta_data->>'role' = 'admin' 
      OR auth.users.email LIKE '%admin%'
    )
  )
);