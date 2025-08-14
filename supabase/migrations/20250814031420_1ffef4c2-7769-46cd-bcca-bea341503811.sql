-- Supprimer les matchs du 13 et 14 août pour permettre le re-upload
DELETE FROM matches WHERE match_date IN ('2025-08-13', '2025-08-14');

-- Supprimer aussi les enregistrements d'upload correspondants
DELETE FROM match_uploads WHERE upload_date IN ('2025-08-13', '2025-08-14');