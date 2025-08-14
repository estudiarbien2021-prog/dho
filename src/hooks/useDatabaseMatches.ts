import { useState, useEffect, useMemo } from 'react';
import { ProcessedMatch } from '@/types/match';
import { supabase } from '@/integrations/supabase/client';

export interface MatchFilters {
  search: string;
  leagues: string[];
  timeWindow: 'all' | '6h' | '12h' | '24h';
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
          
          over_under_markets: []
        }));
        
        setRawMatches(processedMatches);
        setIsLoading(false);
        
      } catch (err) {
        console.error('Database load error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load matches from database');
        setIsLoading(false);
      }
    };

    loadMatches();
  }, [specificDate]);

  // Filter matches
  const filteredMatches = useMemo(() => {
    let matches = rawMatches.filter(match => {
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
        
        const maxHours = filters.timeWindow === '6h' ? 6 : filters.timeWindow === '12h' ? 12 : 24;
        if (hoursDiff < 0 || hoursDiff > maxHours) {
          return false;
        }
      }

      // AI Opportunity filter - only show matches with AI recommendations
      const hasAIOpportunity = () => {
        // BTTS opportunities
        const bttsSuggestions = [];
        
        if (match.odds_btts_yes && match.odds_btts_yes >= 1.3 && match.p_btts_yes_fair && match.p_btts_yes_fair > 0.45) {
          bttsSuggestions.push('btts_yes');
        }
        
        if (match.odds_btts_no && match.odds_btts_no >= 1.3 && match.p_btts_no_fair && match.p_btts_no_fair > 0.45) {
          bttsSuggestions.push('btts_no');
        }

        // Over/Under opportunities
        const ouSuggestions = [];
        if (match.odds_over_2_5 && match.odds_over_2_5 >= 1.3 && match.p_over_2_5_fair > 0.45) {
          ouSuggestions.push('over25');
        }
        
        if (match.odds_under_2_5 && match.odds_under_2_5 >= 1.3 && match.p_under_2_5_fair > 0.45) {
          ouSuggestions.push('under25');
        }

        return bttsSuggestions.length > 0 || ouSuggestions.length > 0;
      };
      
      if (!hasAIOpportunity()) {
        return false;
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
  }, [rawMatches, filters]);

  // Get unique values for filters
  const availableLeagues = useMemo(() => 
    [...new Set(rawMatches.map(m => m.league))].sort(), [rawMatches]
  );

  // Function to check if match has AI recommendation for specific market
  const hasAIRecommendation = (match: ProcessedMatch, marketType: 'BTTS' | 'OU') => {
    if (marketType === 'BTTS') {
      const bttsYesValid = match.odds_btts_yes && match.odds_btts_yes >= 1.3 && match.p_btts_yes_fair > 0.45;
      const bttsNoValid = match.odds_btts_no && match.odds_btts_no >= 1.3 && match.p_btts_no_fair > 0.45;
      return bttsYesValid || bttsNoValid;
    } else if (marketType === 'OU') {
      const overValid = match.odds_over_2_5 && match.odds_over_2_5 >= 1.3 && match.p_over_2_5_fair > 0.45;
      const underValid = match.odds_under_2_5 && match.odds_under_2_5 >= 1.3 && match.p_under_2_5_fair > 0.45;
      return overValid || underValid;
    }
    return false;
  };

  // Stats
  const stats = useMemo(() => ({
    total: filteredMatches.length,
    lowVig: filteredMatches.filter(m => m.is_low_vig_1x2).length,
    watchBtts: filteredMatches.filter(m => hasAIRecommendation(m, 'BTTS')).length,
    watchOver25: filteredMatches.filter(m => hasAIRecommendation(m, 'OU')).length,
    avgVig: filteredMatches.length > 0 
      ? filteredMatches.reduce((sum, m) => sum + m.vig_1x2, 0) / filteredMatches.length 
      : 0
  }), [filteredMatches]);

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