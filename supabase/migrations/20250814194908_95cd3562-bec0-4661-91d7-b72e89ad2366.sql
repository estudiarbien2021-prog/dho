-- Remettre à NULL les prédictions avec l'ancien format pour forcer la régénération
UPDATE matches 
SET ai_prediction = NULL, ai_confidence = NULL 
WHERE ai_prediction IN ('Oui', 'Non');