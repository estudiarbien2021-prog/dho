-- Table pour stocker les picks validés par l'admin
CREATE TABLE public.validated_picks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id TEXT NOT NULL,
  league TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  country TEXT,
  kickoff_utc TIMESTAMP WITH TIME ZONE NOT NULL,
  bet_type TEXT NOT NULL, -- 'BTTS' ou 'O/U 2.5'
  prediction TEXT NOT NULL, -- 'Oui'/'Non' pour BTTS, '+2,5 buts'/'-2,5 buts' pour O/U
  odds DECIMAL(5,2) NOT NULL,
  probability DECIMAL(5,4) NOT NULL, -- stocké en décimal (0.51 pour 51%)
  vigorish DECIMAL(8,4) NOT NULL,
  is_validated BOOLEAN NOT NULL DEFAULT false,
  validated_by UUID REFERENCES auth.users(id),
  validated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX idx_validated_picks_match_id ON public.validated_picks(match_id);
CREATE INDEX idx_validated_picks_validated ON public.validated_picks(is_validated);
CREATE INDEX idx_validated_picks_kickoff ON public.validated_picks(kickoff_utc);

-- Activer RLS
ALTER TABLE public.validated_picks ENABLE ROW LEVEL SECURITY;

-- Policies pour l'accès aux picks validés
CREATE POLICY "Admins can manage all validated picks" 
ON public.validated_picks 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Users can view validated picks only" 
ON public.validated_picks 
FOR SELECT 
USING (is_validated = true);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_validated_picks_updated_at
    BEFORE UPDATE ON public.validated_picks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();