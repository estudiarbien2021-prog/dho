-- Supprimer toutes les anciennes règles avec des seuils incorrects
DELETE FROM conditional_rules 
WHERE id IN (
  '50a83aae-18a6-4b4d-ad13-3d1f4a30d416', -- vigorish < 6 (incorrect)
  '9dd6e0a2-4c7d-4b54-a99b-066501d7c873', -- vigorish < 6 (incorrect)
  '89892d69-151f-458e-9866-2ee1fc8d281a', -- vigorish >= 8.1 (impossible)
  'd8a4bd1c-1adc-4ac2-95eb-346e86049d5e'  -- vigorish > 8.1 (impossible)
);

-- Ajouter une règle BTTS avec vigorish faible mais seuil correct
INSERT INTO conditional_rules (name, market, conditions, logical_connectors, action, priority, enabled) VALUES 
('BTTS - Vigorish très faible', 'btts', 
 '[{"id": "btts_very_low_vig", "type": "vigorish", "operator": "<", "value": 0.09}]',
 '[]', 
 'recommend_most_probable', 1, true);

-- Ajouter une règle pour les matchs équilibrés (probabilités proches)
INSERT INTO conditional_rules (name, market, conditions, logical_connectors, action, priority, enabled) VALUES 
('1X2 - Match équilibré', '1x2', 
 '[{"id": "balanced_match", "type": "probability_home", "operator": "between", "value": 0.25, "valueMax": 0.45}]',
 '[]', 
 'recommend_most_probable', 6, true);

-- Ajouter une règle pour BTTS si probabilité modérée
INSERT INTO conditional_rules (name, market, conditions, logical_connectors, action, priority, enabled) VALUES 
('BTTS - Probabilité modérée', 'btts', 
 '[{"id": "btts_moderate", "type": "probability_btts_yes", "operator": ">", "value": 0.45}]',
 '[]', 
 'recommend_btts_yes', 7, true);