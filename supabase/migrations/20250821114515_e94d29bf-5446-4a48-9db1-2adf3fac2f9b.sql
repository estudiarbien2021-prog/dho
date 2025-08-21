-- Fix la fonction is_admin pour qu'elle fonctionne correctement
DROP FUNCTION IF EXISTS public.is_admin();

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Vérifier d'abord si l'utilisateur est connecté
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  -- Vérifier le rôle admin dans la table profiles
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

-- Forcer une mise à jour des politiques RLS pour la table matches
DROP POLICY IF EXISTS "Admins can update matches" ON public.matches;

CREATE POLICY "Admins can update matches" 
ON public.matches 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Test direct pour s'assurer que ça fonctionne
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.matches TO authenticated;
GRANT ALL ON public.profiles TO authenticated;