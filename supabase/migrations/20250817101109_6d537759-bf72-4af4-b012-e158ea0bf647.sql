-- Supprimer les règles défectueuses avec actions "no_recommendation" et conditions impossibles
DELETE FROM conditional_rules 
WHERE action = 'no_recommendation' 
   OR id IN ('385a158e-6e1f-4973-82fe-05ebcdec35a5', '84f12ec2-26a8-47c5-afd5-155e11c8fbb8');

-- Créer de nouvelles règles réalistes avec des seuils corrects (en décimales)
-- Règle 1: BTTS avec vigorish faible
INSERT INTO conditional_rules (name, market, conditions, logical_connectors, action, priority, enabled) VALUES 
('BTTS - Vigorish faible', 'btts', 
 '[{"id": "btts_low_vig", "type": "vigorish", "operator": "<", "value": 0.08}]',
 '[]', 
 'recommend_most_probable', 1, true);

-- Règle 2: 1X2 avec vigorish très faible  
INSERT INTO conditional_rules (name, market, conditions, logical_connectors, action, priority, enabled) VALUES 
('1X2 - Opportunité vigorish', '1x2', 
 '[{"id": "1x2_very_low_vig", "type": "vigorish", "operator": "<", "value": 0.06}]',
 '[]', 
 'recommend_most_probable', 2, true);

-- Règle 3: Over/Under avec vigorish faible
INSERT INTO conditional_rules (name, market, conditions, logical_connectors, action, priority, enabled) VALUES 
('O/U 2.5 - Vigorish faible', 'ou25', 
 '[{"id": "ou_low_vig", "type": "vigorish", "operator": "<", "value": 0.07}]',
 '[]', 
 'recommend_most_probable', 3, true);

-- Règle 4: 1X2 - Favoris avec cotes intéressantes
INSERT INTO conditional_rules (name, market, conditions, logical_connectors, action, priority, enabled) VALUES 
('1X2 - Favoris clair', '1x2', 
 '[{"id": "home_strong", "type": "probability_home", "operator": ">", "value": 0.6}, {"id": "home_odds", "type": "odds_home", "operator": ">", "value": 1.4}]',
 '["AND"]', 
 'recommend_home', 4, true);

-- Règle 5: BTTS - Probabilité élevée avec bonnes cotes
INSERT INTO conditional_rules (name, market, conditions, logical_connectors, action, priority, enabled) VALUES 
('BTTS - Haute probabilité', 'btts', 
 '[{"id": "btts_high_prob", "type": "probability_btts_yes", "operator": ">", "value": 0.6}, {"id": "btts_good_odds", "type": "odds_btts_yes", "operator": ">", "value": 1.3}]',
 '["AND"]', 
 'recommend_btts_yes', 5, true);