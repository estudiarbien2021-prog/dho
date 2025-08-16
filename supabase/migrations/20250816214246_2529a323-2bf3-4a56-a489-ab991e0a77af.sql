-- First, check what categories are currently allowed and remove the constraint
ALTER TABLE public.recommendation_rules DROP CONSTRAINT IF EXISTS recommendation_rules_category_check;

-- Add a new constraint that allows market-specific fallback categories
ALTER TABLE public.recommendation_rules ADD CONSTRAINT recommendation_rules_category_check 
CHECK (category IN (
  'global_thresholds', 
  'priority_rules', 
  'exclusions', 
  'fallbacks',
  'fallbacks_general',
  'fallbacks_ou',
  'fallbacks_btts', 
  'fallbacks_1x2'
));