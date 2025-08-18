UPDATE conditional_rules 
SET logical_connectors = '["AND", "OR"]'::jsonb
WHERE priority = 17;