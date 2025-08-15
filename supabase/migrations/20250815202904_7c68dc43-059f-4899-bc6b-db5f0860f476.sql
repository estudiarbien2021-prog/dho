-- Fix security vulnerability: Restrict profile access to protect email addresses
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Profiles are publicly readable" ON public.profiles;

-- Create a secure policy that only allows users to view their own profiles
-- and admins to view all profiles for management purposes
CREATE POLICY "Users can view own profile, admins can view all" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);