-- Supprimer les recommandations AI pour les matchs avec égalité 50/50 O/U
UPDATE matches 
SET ai_prediction = NULL, ai_confidence = NULL
WHERE ABS(p_over_2_5_fair - p_under_2_5_fair) <= 0.01
AND ai_prediction IS NOT NULL;