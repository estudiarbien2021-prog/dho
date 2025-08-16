-- Add market-specific thresholds for better granularity
INSERT INTO public.recommendation_rules (rule_name, value, type, description, category) VALUES
-- Seuils Over/Under 2.5 
('ou_high_vigorish_threshold', 8.1, 'percentage', 'Seuil vigorish élevé Over/Under pour inversions', 'global_thresholds'),
('ou_low_vigorish_threshold', 6, 'percentage', 'Seuil vigorish faible Over/Under pour recommandations directes', 'global_thresholds'),
('ou_min_odds', 1.5, 'threshold', 'Odds minimales pour recommandations Over/Under', 'global_thresholds'),
('ou_min_probability', 45, 'percentage', 'Probabilité minimale pour recommandations Over/Under', 'global_thresholds'),

-- Seuils BTTS (Both Teams To Score)
('btts_high_vigorish_threshold', 8.1, 'percentage', 'Seuil vigorish élevé BTTS pour inversions', 'global_thresholds'),
('btts_low_vigorish_threshold', 6, 'percentage', 'Seuil vigorish faible BTTS pour recommandations directes', 'global_thresholds'),
('btts_min_odds', 1.5, 'threshold', 'Odds minimales pour recommandations BTTS', 'global_thresholds'),
('btts_min_probability', 45, 'percentage', 'Probabilité minimale pour recommandations BTTS', 'global_thresholds'),

-- Seuils 1X2 (Match Result)
('1x2_high_vigorish_threshold', 8.1, 'percentage', 'Seuil vigorish élevé 1X2 pour inversions', 'global_thresholds'),
('1x2_low_vigorish_threshold', 6, 'percentage', 'Seuil vigorish faible 1X2 pour recommandations directes', 'global_thresholds'),
('1x2_min_odds', 1.5, 'threshold', 'Odds minimales pour recommandations 1X2', 'global_thresholds'),
('1x2_min_probability', 45, 'percentage', 'Probabilité minimale pour recommandations 1X2', 'global_thresholds');

-- Update existing generic rules to be legacy/fallback
UPDATE public.recommendation_rules 
SET description = description || ' (Legacy - utilisé si pas de seuil spécifique)',
    category = 'fallbacks'
WHERE rule_name IN ('high_vigorish_threshold', 'low_vigorish_threshold', 'min_odds', 'min_probability');