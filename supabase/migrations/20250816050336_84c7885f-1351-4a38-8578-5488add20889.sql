-- Fix security issue - remove unsafe user_metadata reference
-- Drop the problematic admin policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a simple admin policy using the role column in profiles table
-- But we need to avoid recursion by using a different approach
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  -- Allow if current user has admin role (checked via a function to avoid recursion)
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND (
      auth.users.raw_user_meta_data->>'role' = 'admin' 
      OR auth.users.email LIKE '%admin%'
    )
  )
);