-- Test de mise à jour directe pour diagnostiquer le problème
UPDATE matches 
SET ai_prediction = '1', ai_confidence = 0.88 
WHERE id = '02f921d3-b9d5-4093-b851-e52417e12dfc';