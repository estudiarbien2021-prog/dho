-- Supprimer les données du 14 août pour permettre un nouvel upload avec le filtre de doublons
DELETE FROM matches WHERE match_date = '2025-08-14';
DELETE FROM match_uploads WHERE upload_date = '2025-08-14';