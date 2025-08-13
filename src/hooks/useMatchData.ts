import { useState, useCallback } from 'react';
import { ProcessedMatch, UploadResult } from '@/types/match';
import { processCSVData } from '@/lib/csvProcessor';

export function useMatchData() {
  const [matches, setMatches] = useState<ProcessedMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpload, setLastUpload] = useState<UploadResult | null>(null);

  const processFile = useCallback(async (file: File): Promise<UploadResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const text = await file.text();
      const processed = processCSVData(text);
      
      setMatches(processed);
      
      const result: UploadResult = {
        success: true,
        date: new Date().toISOString().split('T')[0],
        total_matches: processed.length,
        iffhs_matches: processed.filter(m => 
          m.category === 'first_div' || 
          m.category === 'second_div' || 
          m.category === 'continental_cup' || 
          m.category === 'national_cup'
        ).length,
        shortlist_count: processed.filter(m => 
          m.is_low_vig_1x2 || m.watch_btts || m.watch_over25
        ).length
      };
      
      setLastUpload(result);
      return result;
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur lors du traitement du fichier';
      setError(errorMsg);
      
      return {
        success: false,
        date: new Date().toISOString().split('T')[0],
        total_matches: 0,
        iffhs_matches: 0,
        shortlist_count: 0,
        error: errorMsg
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearData = useCallback(() => {
    setMatches([]);
    setLastUpload(null);
    setError(null);
  }, []);

  return {
    matches,
    isLoading,
    error,
    lastUpload,
    processFile,
    clearData
  };
}