-- Supprimer les matchs mal importés du 13 août
DELETE FROM matches WHERE match_date = '2025-08-13';
DELETE FROM match_uploads WHERE upload_date = '2025-08-13';