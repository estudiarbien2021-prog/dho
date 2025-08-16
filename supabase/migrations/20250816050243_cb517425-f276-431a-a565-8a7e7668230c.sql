-- Fix infinite recursion in profiles policies
-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view own profile, admins can view all" ON public.profiles;

-- Create a simple policy that avoids recursion
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create a separate policy for admins using auth.jwt() to avoid recursion
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  COALESCE(auth.jwt() ->> 'user_role', '') = 'admin'
  OR 
  COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') = 'admin'
);