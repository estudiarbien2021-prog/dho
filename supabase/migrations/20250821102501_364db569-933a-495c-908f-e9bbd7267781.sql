-- Add score columns and match status to matches table
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS home_score integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS away_score integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS match_status text DEFAULT 'scheduled';

-- Create index for better performance on match status queries
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(match_status);
CREATE INDEX IF NOT EXISTS idx_matches_date_status ON public.matches(match_date, match_status);