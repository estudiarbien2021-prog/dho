-- Now add market-specific fallback parameters
INSERT INTO public.recommendation_rules (rule_name, value, type, description, category) VALUES
-- Fallbacks Over/Under 2.5 
('ou_max_recommendations', 2, 'threshold', 'Nombre max de recommandations Over/Under standard', 'fallbacks_ou'),
('ou_default_sort_by_vigorish', 1, 'boolean', 'Trier par vigorish décroissant pour Over/Under', 'fallbacks_ou'),
('ou_enable_deduplication', 1, 'boolean', 'Éviter les recommandations Over/Under identiques', 'fallbacks_ou'),
('ou_fallback_to_highest_prob', 1, 'boolean', 'Fallback vers probabilité la plus haute O/U', 'fallbacks_ou'),

-- Fallbacks BTTS (Both Teams To Score)
('btts_max_recommendations', 2, 'threshold', 'Nombre max de recommandations BTTS standard', 'fallbacks_btts'),
('btts_default_sort_by_vigorish', 1, 'boolean', 'Trier par vigorish décroissant pour BTTS', 'fallbacks_btts'),
('btts_enable_deduplication', 1, 'boolean', 'Éviter les recommandations BTTS identiques', 'fallbacks_btts'),
('btts_fallback_to_highest_prob', 1, 'boolean', 'Fallback vers probabilité la plus haute BTTS', 'fallbacks_btts'),

-- Fallbacks 1X2 (Match Result)
('1x2_max_recommendations', 1, 'threshold', 'Nombre max de recommandations 1X2 standard', 'fallbacks_1x2'),
('1x2_default_sort_by_vigorish', 1, 'boolean', 'Trier par vigorish décroissant pour 1X2', 'fallbacks_1x2'),
('1x2_enable_deduplication', 1, 'boolean', 'Éviter les recommandations 1X2 identiques', 'fallbacks_1x2'),
('1x2_fallback_to_double_chance', 1, 'boolean', 'Fallback vers double chance si 1X2 échoue', 'fallbacks_1x2');

-- Update existing fallback rules to be general
UPDATE public.recommendation_rules 
SET description = description || ' (Général - tous marchés)',
    category = 'fallbacks_general'
WHERE category = 'fallbacks';