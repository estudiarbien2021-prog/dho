-- Create table for recommendation rules configuration
CREATE TABLE public.recommendation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_name TEXT NOT NULL UNIQUE,
  value NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('threshold', 'boolean', 'percentage')),
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('global_thresholds', 'priority_rules', 'exclusions', 'fallbacks')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recommendation_rules ENABLE ROW LEVEL SECURITY;

-- Create policies - only admins can manage rules
CREATE POLICY "Admins can manage recommendation rules"
ON public.recommendation_rules
FOR ALL
USING (is_admin());

-- Insert default rule values
INSERT INTO public.recommendation_rules (rule_name, value, type, description, category) VALUES
-- Global Thresholds
('min_odds', 1.5, 'threshold', 'Odds minimales pour les recommandations', 'global_thresholds'),
('min_probability', 45, 'percentage', 'Probabilité minimale pour les recommandations', 'global_thresholds'),
('high_vigorish_threshold', 8.1, 'percentage', 'Seuil vigorish élevé pour inversions', 'global_thresholds'),
('low_vigorish_threshold', 6, 'percentage', 'Seuil vigorish faible pour recommandations directes', 'global_thresholds'),
('high_probability_threshold', 58, 'percentage', 'Seuil probabilité élevée', 'global_thresholds'),
('double_chance_vigorish_threshold', 10, 'percentage', 'Seuil vigorish 1X2 pour Double Chance', 'global_thresholds'),

-- Priority Rules  
('double_chance_enabled', 1, 'boolean', 'Activer la règle Double Chance prioritaire', 'priority_rules'),
('double_chance_max_probability', 65, 'percentage', 'Probabilité max pour Double Chance', 'priority_rules'),
('inverted_opportunities_enabled', 1, 'boolean', 'Activer les opportunités inversées', 'priority_rules'),
('direct_recommendations_enabled', 1, 'boolean', 'Activer les recommandations directes', 'priority_rules'),
('high_probability_exception_enabled', 1, 'boolean', 'Activer exception probabilité élevée', 'priority_rules'),

-- Exclusions
('equality_tolerance', 1, 'percentage', 'Tolérance pour égalités 50/50', 'exclusions'),
('exclude_incomplete_data', 1, 'boolean', 'Exclure données incomplètes', 'exclusions'),

-- Fallbacks
('max_recommendations', 2, 'threshold', 'Nombre max de recommandations standard', 'fallbacks');

-- Create trigger for updated_at
CREATE TRIGGER update_recommendation_rules_updated_at
BEFORE UPDATE ON public.recommendation_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();