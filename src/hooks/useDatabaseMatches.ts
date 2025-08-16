import { useState, useEffect, useMemo } from 'react';
import { ProcessedMatch } from '@/types/match';
import { supabase } from '@/integrations/supabase/client';
import { detectOpportunities } from '@/lib/opportunityDetection';

export interface MatchFilters {
  search: string;
  leagues: string[];
  timeWindow: 'all' | '1h' | '2h' | '4h';
  groupBy: 'time' | 'competition';
  marketFilters: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}

const defaultFilters: MatchFilters = {
  search: '',
  leagues: [],
  timeWindow: 'all',
  groupBy: 'time',
  marketFilters: []
};

export function useDatabaseMatches(specificDate?: string) {
  const [rawMatches, setRawMatches] = useState<ProcessedMatch[]>([]);
  const [filters, setFilters] = useState<MatchFilters>(defaultFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchOpportunities, setMatchOpportunities] = useState<Map<string, any[]>>(new Map());

  // Load matches from database
  useEffect(() => {
    const loadMatches = async () => {
      try {
        setIsLoading(true);
        console.log('Loading matches from database...');
        
        let query = supabase
          .from('matches')
          .select('*')
          .order('kickoff_utc', { ascending: true });
        
        // Filter by specific date if provided
        if (specificDate) {
          query = query.eq('match_date', specificDate);
        } else {
          // Default: show today's matches and future matches
          const today = new Date().toISOString().split('T')[0];
          query = query.gte('match_date', today);
        }
        
        const { data, error: dbError } = await query;
        
        if (dbError) {
          throw dbError;
        }
        
        console.log(`Loaded ${data?.length || 0} matches from database`);
        
        // Transform database data to match ProcessedMatch interface
        const processedMatches: ProcessedMatch[] = (data || []).map(match => ({
          id: match.id,
          league: match.league,
          home_team: match.home_team,
          away_team: match.away_team,
          country: match.country,
          match_date: match.match_date,
          kickoff_utc: new Date(match.kickoff_utc),
          kickoff_local: new Date(match.kickoff_local),
          category: match.category as ProcessedMatch['category'],
          
          // Fair probabilities
          p_home_fair: Number(match.p_home_fair),
          p_draw_fair: Number(match.p_draw_fair),
          p_away_fair: Number(match.p_away_fair),
          p_btts_yes_fair: Number(match.p_btts_yes_fair),
          p_btts_no_fair: Number(match.p_btts_no_fair),
          p_over_2_5_fair: Number(match.p_over_2_5_fair),
          p_under_2_5_fair: Number(match.p_under_2_5_fair),
          
          // Vigorish
          vig_1x2: Number(match.vig_1x2),
          vig_btts: Number(match.vig_btts),
          vig_ou_2_5: Number(match.vig_ou_2_5),
          
          // Flags
          is_low_vig_1x2: match.is_low_vig_1x2,
          watch_btts: match.watch_btts,
          watch_over25: match.watch_over25,
          
          // Odds
          odds_home: Number(match.odds_home),
          odds_draw: Number(match.odds_draw),
          odds_away: Number(match.odds_away),
          odds_btts_yes: match.odds_btts_yes ? Number(match.odds_btts_yes) : undefined,
          odds_btts_no: match.odds_btts_no ? Number(match.odds_btts_no) : undefined,
          odds_over_2_5: match.odds_over_2_5 ? Number(match.odds_over_2_5) : undefined,
          odds_under_2_5: match.odds_under_2_5 ? Number(match.odds_under_2_5) : undefined,
          
          // AI predictions
          ai_prediction: match.ai_prediction,
          ai_confidence: match.ai_confidence ? Number(match.ai_confidence) : 0,
          
          over_under_markets: []
        }));
        
        setRawMatches(processedMatches);
        
        // Load opportunities for all matches
        const opportunitiesMap = new Map();
        for (const match of processedMatches) {
          try {
            const opportunities = await detectOpportunities(match);
            opportunitiesMap.set(match.id, opportunities);
          } catch (error) {
            console.error(`Error detecting opportunities for match ${match.id}:`, error);
            opportunitiesMap.set(match.id, []);
          }
        }
        setMatchOpportunities(opportunitiesMap);
        
        setIsLoading(false);
        
      } catch (err) {
        console.error('Database load error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load matches from database');
        setIsLoading(false);
      }
    };

    loadMatches();
  }, [specificDate]);

  // Function to check if match has complete basic data (STRICT VALIDATION)
  const hasCompleteData = (match: ProcessedMatch) => {
    // Check 1X2 data completeness
    const has1X2Data = match.odds_home > 0 && match.odds_draw > 0 && match.odds_away > 0 &&
                       match.p_home_fair > 0 && match.p_draw_fair > 0 && match.p_away_fair > 0;
    
    // Check BTTS data completeness  
    const hasBTTSData = match.odds_btts_yes && match.odds_btts_no &&
                        match.odds_btts_yes > 0 && match.odds_btts_no > 0 &&
                        match.p_btts_yes_fair > 0 && match.p_btts_no_fair > 0;
    
    // Check Over/Under data completeness
    const hasOUData = match.odds_over_2_5 && match.odds_under_2_5 &&
                      match.odds_over_2_5 > 0 && match.odds_under_2_5 > 0 &&
                      match.p_over_2_5_fair > 0 && match.p_under_2_5_fair > 0;
    
    return has1X2Data && hasBTTSData && hasOUData;
  };

  // Filter matches
  const filteredMatches = useMemo(() => {
    console.log('🔍 Filtering matches, total rawMatches:', rawMatches.length);
    
    let matches = rawMatches.filter(match => {
      // ÉTAPE 1: VALIDATION STRICTE DES DONNÉES DE BASE (PRIORITÉ ABSOLUE)
      const isDataComplete = hasCompleteData(match);
      
      if (!isDataComplete) {
        console.log(`🚫 EXCLU (DONNÉES INCOMPLÈTES): ${match.home_team} vs ${match.away_team}`, {
          odds_home: match.odds_home,
          odds_draw: match.odds_draw, 
          odds_away: match.odds_away,
          odds_btts_yes: match.odds_btts_yes,
          odds_btts_no: match.odds_btts_no,
          odds_over_2_5: match.odds_over_2_5,
          odds_under_2_5: match.odds_under_2_5,
          p_home_fair: match.p_home_fair,
          p_draw_fair: match.p_draw_fair,
          p_away_fair: match.p_away_fair,
          p_btts_yes_fair: match.p_btts_yes_fair,
          p_btts_no_fair: match.p_btts_no_fair,
          p_over_2_5_fair: match.p_over_2_5_fair,
          p_under_2_5_fair: match.p_under_2_5_fair
        });
        return false;
      }

      // ÉTAPE 2: Vérification des opportunités IA (après validation des données)
      const opportunities = matchOpportunities.get(match.id) || [];
      
      if (opportunities.length === 0) {
        console.log(`❌ EXCLU (PAS D'OPPORTUNITÉ IA): ${match.home_team} vs ${match.away_team} - Données complètes mais pas d'opportunité IA`);
        return false;
      }
      
      console.log(`✅ MATCH VALIDÉ: ${match.home_team} vs ${match.away_team} - Données complètes + ${opportunities.length} opportunité(s) IA disponible(s)`);

      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        if (
          !match.league.toLowerCase().includes(searchTerm) &&
          !match.home_team.toLowerCase().includes(searchTerm) &&
          !match.away_team.toLowerCase().includes(searchTerm)
        ) {
          return false;
        }
      }

      // Leagues filter
      if (filters.leagues.length > 0 && !filters.leagues.includes(match.league)) {
        return false;
      }

      // Market filters
      if (filters.marketFilters && filters.marketFilters.length > 0) {
        const hasMarket = filters.marketFilters.every(market => {
          switch (market) {
            case 'btts_yes': return match.odds_btts_yes && match.odds_btts_yes > 0;
            case 'btts_no': return match.odds_btts_no && match.odds_btts_no > 0;
            case 'over25': return match.odds_over_2_5 && match.odds_over_2_5 > 0;
            case 'under25': return match.odds_under_2_5 && match.odds_under_2_5 > 0;
            default: return true;
          }
        });
        if (!hasMarket) return false;
      }

      // Time window filter
      if (filters.timeWindow !== 'all') {
        const now = new Date();
        const matchTime = new Date(match.kickoff_utc);
        const hoursDiff = (matchTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        const maxHours = filters.timeWindow === '1h' ? 1 : filters.timeWindow === '2h' ? 2 : 4;
        if (hoursDiff < 0 || hoursDiff > maxHours) {
          return false;
        }
      }

      return true;
    });

    // Apply grouping/sorting
    if (filters.groupBy === 'competition') {
      matches.sort((a, b) => {
        if (a.league !== b.league) {
          return a.league.localeCompare(b.league);
        }
        return a.kickoff_utc.getTime() - b.kickoff_utc.getTime();
      });
    } else {
      matches.sort((a, b) => a.kickoff_utc.getTime() - b.kickoff_utc.getTime());
    }

    return matches;
  }, [rawMatches, filters, matchOpportunities]);

  // Get unique values for filters
  const availableLeagues = useMemo(() => 
    [...new Set(rawMatches.map(m => m.league))].sort(), [rawMatches]
  );

  // Stats
  const stats = useMemo(() => {
    // Compter les matchs exclus pour données incomplètes
    const excludedForIncompleteData = rawMatches.filter(match => !hasCompleteData(match)).length;
    
    // Compter les matchs exclus pour pas d'opportunité IA
    const matchesWithCompleteData = rawMatches.filter(match => hasCompleteData(match));
    const excludedForNoAI = matchesWithCompleteData.filter(match => {
      const opportunities = matchOpportunities.get(match.id) || [];
      return opportunities.length === 0;
    }).length;
    
    console.log(`📊 STATS FILTRAGE: ${rawMatches.length} total → ${excludedForIncompleteData} exclus (données incomplètes) → ${excludedForNoAI} exclus (pas d'IA) → ${filteredMatches.length} final`);
    
    return {
      total: filteredMatches.length,
      totalRaw: rawMatches.length,
      excludedIncompleteData: excludedForIncompleteData,
      excludedNoAI: excludedForNoAI,
      lowVig: filteredMatches.filter(m => m.is_low_vig_1x2).length,
      watchBtts: filteredMatches.filter(m => {
        const opportunities = matchOpportunities.get(m.id) || [];
        return opportunities.some(opp => opp.type === 'BTTS' || opp.type === 'BTTS_NEGATIVE');
      }).length,
      watchOver25: filteredMatches.filter(m => {
        const opportunities = matchOpportunities.get(m.id) || [];
        return opportunities.some(opp => opp.type === 'O/U 2.5' || opp.type === 'OU_NEGATIVE');
      }).length,
      avgVig: filteredMatches.length > 0 
        ? filteredMatches.reduce((sum, m) => sum + m.vig_1x2, 0) / filteredMatches.length 
        : 0
    };
  }, [filteredMatches, rawMatches, matchOpportunities]);

  return {
    matches: filteredMatches,
    isLoading,
    error,
    filters,
    setFilters,
    availableLeagues,
    stats
  };
}