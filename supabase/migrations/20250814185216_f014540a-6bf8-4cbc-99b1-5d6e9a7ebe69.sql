-- Ajouter une colonne pour la prédiction recommandée par l'IA
ALTER TABLE public.matches 
ADD COLUMN ai_prediction TEXT,
ADD COLUMN ai_confidence NUMERIC DEFAULT 0;