-- Clear existing rules and create comprehensive set with realistic thresholds
DELETE FROM conditional_rules;

-- Insert comprehensive conditional rules with realistic decimal thresholds
INSERT INTO conditional_rules (name, market, conditions, logical_connectors, action, priority, enabled) VALUES 

-- BTTS Rules (priority 1-3)
('BTTS - Vigorish très faible', 'btts', 
 '[{"id": "btts_very_low_vig", "type": "vigorish", "operator": "<", "value": 0.09}]',
 '[]', 
 'recommend_most_probable', 1, true),

('BTTS - Haute probabilité', 'btts', 
 '[{"id": "btts_high_prob", "type": "probability_btts_yes", "operator": ">", "value": 0.60}, {"id": "btts_good_odds", "type": "odds_btts_yes", "operator": ">", "value": 1.3}]',
 '["AND"]', 
 'recommend_btts_yes', 2, true),

('BTTS - Probabilité modérée', 'btts', 
 '[{"id": "btts_moderate", "type": "probability_btts_yes", "operator": ">", "value": 0.45}]',
 '[]', 
 'recommend_btts_yes', 3, true),

-- 1X2 Rules (priority 4-6)
('1X2 - Opportunité vigorish', '1x2', 
 '[{"id": "1x2_low_vig", "type": "vigorish", "operator": "<", "value": 0.06}]',
 '[]', 
 'recommend_most_probable', 4, true),

('1X2 - Favoris clair', '1x2', 
 '[{"id": "clear_favorite", "type": "probability_home", "operator": ">", "value": 0.60}, {"id": "good_home_odds", "type": "odds_home", "operator": ">", "value": 1.4}]',
 '["AND"]', 
 'recommend_home', 5, true),

('1X2 - Match équilibré', '1x2', 
 '[{"id": "balanced_match", "type": "probability_home", "operator": "between", "value": 0.25, "valueMax": 0.45}]',
 '[]', 
 'recommend_most_probable', 6, true),

-- Over/Under Rules (priority 7)
('O/U 2.5 - Vigorish faible', 'ou25', 
 '[{"id": "ou_low_vig", "type": "vigorish", "operator": "<", "value": 0.07}]',
 '[]', 
 'recommend_most_probable', 7, true);