-- Nettoyer l'upload bloqué
DELETE FROM match_uploads WHERE status = 'processing' AND upload_date = '2025-08-13';