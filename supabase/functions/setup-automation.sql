-- Script pour configurer l'automatisation quotidienne du traitement CSV
-- Exécutez ces commandes dans l'éditeur SQL de Supabase

-- 1. Activer l'extension pg_cron si elle n'est pas déjà activée
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Configurer les secrets nécessaires (à faire via l'interface Supabase)
/*
Secrets à configurer dans l'interface Supabase :
- PRIMARY_CSV_URL : URL principale pour télécharger le CSV quotidien
- BACKUP_CSV_URL : URL de secours (optionnel)

Exemple :
PRIMARY_CSV_URL = https://example.com/daily-matches.csv
*/

-- 3. Programmer l'exécution quotidienne à 8h UTC (9h Paris en hiver, 10h en été)
SELECT cron.schedule(
  'daily-csv-processing',
  '0 8 * * *', -- Tous les jours à 8h UTC
  $$
  SELECT
    net.http_post(
        url:='https://dnasdyvakwsvngajpuds.supabase.co/functions/v1/daily-csv-processor',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuYXNkeXZha3dzdm5nYWpwdWRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwOTIyNTEsImV4cCI6MjA3MDY2ODI1MX0.cY9FA3vTQj7aOc4RBenTCHqAwM7-X98D4onxWoYDI9E"}'::jsonb,
        body:='{"automated": true, "source": "cron"}'::jsonb
    ) as request_id;
  $$
);

-- 4. Vérifier les tâches cron programmées
SELECT * FROM cron.job;

-- 5. Pour désactiver l'automatisation (si nécessaire)
-- SELECT cron.unschedule('daily-csv-processing');

-- 6. Pour reprogrammer à une autre heure (exemple : 6h UTC)
-- SELECT cron.schedule(
--   'daily-csv-processing-6am',
--   '0 6 * * *',
--   $$ ... même contenu ... $$
-- );

-- 7. Créer une vue pour monitorer l'activité quotidienne
CREATE OR REPLACE VIEW daily_processing_status AS
SELECT 
  upload_date,
  filename,
  status,
  total_matches,
  processed_matches,
  error_message,
  created_at,
  CASE 
    WHEN status = 'completed' THEN '✅'
    WHEN status = 'error' THEN '❌'
    WHEN status = 'processing' THEN '⏳'
    ELSE '⏸️'
  END as status_icon
FROM match_uploads
ORDER BY upload_date DESC
LIMIT 30;

-- 8. Fonction pour nettoyer les anciens logs (garder 30 jours)
CREATE OR REPLACE FUNCTION cleanup_old_matches()
RETURNS void AS $$
BEGIN
  -- Supprimer les matchs de plus de 30 jours
  DELETE FROM matches 
  WHERE match_date < CURRENT_DATE - INTERVAL '30 days';
  
  -- Garder seulement les 30 derniers uploads dans l'historique
  DELETE FROM match_uploads 
  WHERE upload_date < CURRENT_DATE - INTERVAL '30 days';
  
  RAISE NOTICE 'Cleanup completed';
END;
$$ LANGUAGE plpgsql;

-- 9. Programmer le nettoyage hebdomadaire (tous les dimanches à 2h UTC)
SELECT cron.schedule(
  'weekly-cleanup',
  '0 2 * * 0', -- Dimanche à 2h UTC
  'SELECT cleanup_old_matches();'
);

-- 10. Créer une fonction de diagnostic système
CREATE OR REPLACE FUNCTION system_diagnostics()
RETURNS TABLE(
  metric TEXT,
  value TEXT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'Total matches in DB'::TEXT as metric,
    COUNT(*)::TEXT as value,
    CASE WHEN COUNT(*) > 0 THEN '✅' ELSE '⚠️' END as status
  FROM matches
  
  UNION ALL
  
  SELECT 
    'Recent uploads (7 days)'::TEXT as metric,
    COUNT(*)::TEXT as value,
    CASE WHEN COUNT(*) > 0 THEN '✅' ELSE '⚠️' END as status
  FROM match_uploads 
  WHERE created_at > CURRENT_DATE - INTERVAL '7 days'
  
  UNION ALL
  
  SELECT 
    'Latest upload status'::TEXT as metric,
    COALESCE(status, 'No data')::TEXT as value,
    CASE 
      WHEN status = 'completed' THEN '✅'
      WHEN status = 'error' THEN '❌'
      ELSE '⚠️'
    END as status
  FROM match_uploads 
  ORDER BY created_at DESC 
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Utilisation : SELECT * FROM system_diagnostics();