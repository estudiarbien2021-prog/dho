-- Corriger les règles conditionnelles avec priorités 17 et 18
-- Restructurer leur logique pour s'assurer que le vigorish soit toujours respecté

-- Rule Priority 17: Changer [AND, OR] vers [AND, AND] 
-- Cela forcera TOUTES les conditions à être vraies
UPDATE conditional_rules 
SET logical_connectors = '["AND", "AND"]'::jsonb,
    updated_at = now()
WHERE id = '9aae47b7-19c2-465f-9128-085f7a3d5886' AND priority = 17;

-- Rule Priority 18: Changer [AND, OR, AND] vers [AND, OR]  
-- Simplifier la logique et s'assurer que vigorish est toujours en premier
UPDATE conditional_rules 
SET logical_connectors = '["AND", "OR"]'::jsonb,
    updated_at = now()
WHERE id = 'ba7dfe0c-e8c7-4aed-851f-14279a0b22bf' AND priority = 18;