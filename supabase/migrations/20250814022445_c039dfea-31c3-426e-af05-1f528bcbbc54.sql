-- Create matches table to store all match data
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_date DATE NOT NULL DEFAULT CURRENT_DATE,
  league TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  country TEXT,
  kickoff_utc TIMESTAMP WITH TIME ZONE NOT NULL,
  kickoff_local TIMESTAMP WITH TIME ZONE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('first_div', 'second_div', 'continental_cup', 'national_cup')),
  
  -- Fair probabilities
  p_home_fair DECIMAL(5,4) NOT NULL DEFAULT 0,
  p_draw_fair DECIMAL(5,4) NOT NULL DEFAULT 0,
  p_away_fair DECIMAL(5,4) NOT NULL DEFAULT 0,
  p_btts_yes_fair DECIMAL(5,4) NOT NULL DEFAULT 0,
  p_btts_no_fair DECIMAL(5,4) NOT NULL DEFAULT 0,
  p_over_2_5_fair DECIMAL(5,4) NOT NULL DEFAULT 0,
  p_under_2_5_fair DECIMAL(5,4) NOT NULL DEFAULT 0,
  
  -- Vigorish
  vig_1x2 DECIMAL(6,4) NOT NULL DEFAULT 0,
  vig_btts DECIMAL(6,4) NOT NULL DEFAULT 0,
  vig_ou_2_5 DECIMAL(6,4) NOT NULL DEFAULT 0,
  
  -- Flags
  is_low_vig_1x2 BOOLEAN NOT NULL DEFAULT FALSE,
  watch_btts BOOLEAN NOT NULL DEFAULT FALSE,
  watch_over25 BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Original odds
  odds_home DECIMAL(6,2) NOT NULL DEFAULT 0,
  odds_draw DECIMAL(6,2) NOT NULL DEFAULT 0,
  odds_away DECIMAL(6,2) NOT NULL DEFAULT 0,
  odds_btts_yes DECIMAL(6,2),
  odds_btts_no DECIMAL(6,2),
  odds_over_2_5 DECIMAL(6,2),
  odds_under_2_5 DECIMAL(6,2),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE(match_date, league, home_team, away_team, kickoff_utc)
);

-- Create table for upload history and metadata
CREATE TABLE public.match_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_date DATE NOT NULL DEFAULT CURRENT_DATE,
  filename TEXT NOT NULL,
  total_matches INTEGER NOT NULL DEFAULT 0,
  processed_matches INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(upload_date)
);

-- Enable Row Level Security
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_uploads ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (matches are public data)
CREATE POLICY "Matches are publicly readable" 
ON public.matches 
FOR SELECT 
USING (true);

CREATE POLICY "Match uploads are publicly readable" 
ON public.match_uploads 
FOR SELECT 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_matches_date ON public.matches(match_date);
CREATE INDEX idx_matches_kickoff ON public.matches(kickoff_utc);
CREATE INDEX idx_matches_league ON public.matches(league);
CREATE INDEX idx_matches_category ON public.matches(category);
CREATE INDEX idx_matches_country ON public.matches(country);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_matches_updated_at
BEFORE UPDATE ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();