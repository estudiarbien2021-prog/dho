import { useState, useEffect, useMemo } from 'react';
import { ProcessedMatch } from '@/types/match';
import { supabase } from '@/integrations/supabase/client';
import { detectOpportunities, prioritizeOpportunitiesByRealProbability, convertOpportunityToAIRecommendation } from '@/lib/opportunityDetection';
import { generateConfidenceScore } from '@/lib/confidence';

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
  // Force rebuild - Performance optimized match data hook
  const [rawMatches, setRawMatches] = useState<ProcessedMatch[]>([]);
  const [filters, setFilters] = useState<MatchFilters>(defaultFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchOpportunities, setMatchOpportunities] = useState<Map<string, any[]>>(new Map());
  const [matchRecommendations, setMatchRecommendations] = useState<Map<string, any[]>>(new Map());

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

        // PERFORMANCE: Limit initial load to reduce processing time
        query = query.limit(200);
        
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
        
        // Load opportunities and recommendations for all matches in parallel (PERFORMANCE OPTIMIZATION)
        const opportunitiesMap = new Map();
        const recommendationsMap = new Map();
        
        try {
          const opportunityPromises = processedMatches.map(async (match) => {
            try {
              const opportunities = await detectOpportunities(match);
              
              // Pre-calculate AI recommendations
              let recommendations = [];
              if (opportunities.length > 0) {
                const prioritizedOpportunities = prioritizeOpportunitiesByRealProbability(opportunities, match);
                
                recommendations = prioritizedOpportunities.map(opp => {
                  const converted = convertOpportunityToAIRecommendation(opp);
                  
                  // Validate odds
                  if (!converted.odds || converted.odds <= 0) {
                    return null;
                  }
                  
                  return {
                    betType: converted.betType,
                    prediction: converted.prediction,
                    odds: converted.odds,
                    confidence: converted.confidence,
                    isInverted: opp?.isInverted || false,
                    reason: opp?.reason || [],
                    confidenceScore: generateConfidenceScore(match.id, {
                      type: converted.betType,
                      prediction: converted.prediction,
                      confidence: converted.confidence
                    })
                  };
                }).filter(Boolean);
              }
              
              return { 
                matchId: match.id, 
                opportunities,
                recommendations 
              };
            } catch (error) {
              console.error(`Error processing match ${match.id}:`, error);
              return { 
                matchId: match.id, 
                opportunities: [],
                recommendations: []
              };
            }
          });

          const results = await Promise.all(opportunityPromises);
          results.forEach(({ matchId, opportunities, recommendations }) => {
            opportunitiesMap.set(matchId, opportunities);
            recommendationsMap.set(matchId, recommendations);
          });
        } catch (error) {
          console.error('Error processing opportunities and recommendations in batch:', error);
        }
        
        setMatchOpportunities(opportunitiesMap);
        setMatchRecommendations(recommendationsMap);
        
        setIsLoading(false);
        
      } catch (err) {
        console.error('Database load error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load matches from database');
        setIsLoading(false);
      }
    };

    loadMatches();
  }, [specificDate]);

  // Function to check if match has minimum required data (RELAXED VALIDATION)
  const hasMinimumData = (match: ProcessedMatch) => {
    // Only require 1X2 data as minimum - this is the core market
    const has1X2Data = match.odds_home > 0 && match.odds_draw > 0 && match.odds_away > 0 &&
                       match.p_home_fair > 0 && match.p_draw_fair > 0 && match.p_away_fair > 0;
    
    return has1X2Data;
  };

  // Function to check if match has complete data for all markets  
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
    
    let matches = rawMatches.filter(match => {
      // ÉTAPE 1: VALIDATION MINIMALE DES DONNÉES (1X2 REQUIS SEULEMENT)
      const hasMinData = hasMinimumData(match);
      
      if (!hasMinData) {
        return false;
      }

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
    // Compter les matchs avec données complètes vs partielles
    const matchesCompleteData = filteredMatches.filter(match => hasCompleteData(match)).length;
    const matchesPartialData = filteredMatches.length - matchesCompleteData;
    
    return {
      total: filteredMatches.length,
      totalRaw: rawMatches.length,
      excludedIncompleteData: 0,
      excludedNoAI: 0,
      completeData: matchesCompleteData,
      partialData: matchesPartialData,
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

  // Cached match recommendations and opportunities 
  return {
    matches: filteredMatches,
    isLoading,
    error,
    filters,
    setFilters,
    availableLeagues,
    stats,
    matchOpportunities,
    matchRecommendations
  };
}