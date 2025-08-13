import { useState, useEffect, useMemo } from 'react';
import { ProcessedMatch } from '@/types/match';
import Papa from 'papaparse';

export interface MatchFilters {
  search: string;
  leagues: string[];
  timeWindow: 'all' | '6h' | '12h' | '24h';
  groupBy: 'time' | 'competition';
  marketFilters: string[];
}

const defaultFilters: MatchFilters = {
  search: '',
  leagues: [],
  timeWindow: 'all',
  groupBy: 'time',
  marketFilters: []
};

export function useMatchesData() {
  const [rawMatches, setRawMatches] = useState<ProcessedMatch[]>([]);
  const [filters, setFilters] = useState<MatchFilters>(defaultFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load CSV data
  useEffect(() => {
    const loadMatches = async () => {
      try {
        setIsLoading(true);
        console.log('Loading matches...');
        
        const response = await fetch('/matchss.csv');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        console.log('CSV loaded, length:', csvText.length);
        
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            console.log('Parse complete, rows:', results.data.length);
            
            const processed = results.data.map((row: any, index: number) => {
              // Skip rows with missing odds
              if (!row.odds_1x2_home || !row.odds_1x2_draw || !row.odds_1x2_away) {
                return null;
              }
              
              return {
                id: `${index}-${row.home_team}-${row.away_team}`,
                league: row.league || '',
                home_team: row.home_team || '',
                away_team: row.away_team || '',
                kickoff_utc: new Date(row.kickoff_utc || Date.now()),
                kickoff_local: new Date(row.kickoff_sao_paulo || Date.now()),
                category: getCategoryFromLeague(row.league || ''),
                
                // Fair probabilities
                p_home_fair: parseFloat(row.p_home_fair) || 0,
                p_draw_fair: parseFloat(row.p_draw_fair) || 0,
                p_away_fair: parseFloat(row.p_away_fair) || 0,
                p_btts_yes_fair: parseFloat(row.p_btts_yes_fair) || 0,
                p_btts_no_fair: parseFloat(row.p_btts_no_fair) || 0,
                p_over_2_5_fair: parseFloat(row.p_over_2_5_fair) || 0,
                p_under_2_5_fair: parseFloat(row.p_under_2_5_fair) || 0,
                
                // Vigorish
                vig_1x2: parseFloat(row.vig_1x2) || 0,
                vig_btts: parseFloat(row.vig_btts) || 0,
                vig_ou_2_5: parseFloat(row.vig_ou_2_5) || 0,
                
                // Flags
                is_low_vig_1x2: row.is_low_vig_1x2 === 'True',
                watch_btts: row.watch_btts === 'True',
                watch_over25: row.watch_over25 === 'True',
                
                // Odds
                odds_home: parseFloat(row.odds_1x2_home) || 0,
                odds_draw: parseFloat(row.odds_1x2_draw) || 0,
                odds_away: parseFloat(row.odds_1x2_away) || 0,
                odds_btts_yes: parseFloat(row.odds_btts_yes) || undefined,
                odds_btts_no: parseFloat(row.odds_btts_no) || undefined,
                odds_over_2_5: parseFloat(row.odds_over_2_5) || undefined,
                odds_under_2_5: parseFloat(row.odds_under_2_5) || undefined,
                
                over_under_markets: []
              };
            }).filter(match => match !== null && match.odds_home > 0);
            
            console.log('Processed matches:', processed.length);
            setRawMatches(processed);
            setIsLoading(false);
          },
          error: (error) => {
            console.error('Parse error:', error);
            setError(error.message);
            setIsLoading(false);
          }
        });
      } catch (err) {
        console.error('Load error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load matches');
        setIsLoading(false);
      }
    };

    loadMatches();
  }, []);

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

  // Stats
  const stats = useMemo(() => ({
    total: filteredMatches.length,
    lowVig: filteredMatches.filter(m => m.is_low_vig_1x2).length,
    watchBtts: filteredMatches.filter(m => m.watch_btts).length,
    watchOver25: filteredMatches.filter(m => m.watch_over25).length,
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

function getCategoryFromLeague(league: string): ProcessedMatch['category'] {
  const l = league.toLowerCase();
  
  if (l.includes('libertadores') || l.includes('sudamericana') || l.includes('champions league') || 
      l.includes('europa league') || l.includes('conference league') || l.includes('afc cup')) {
    return 'continental_cup';
  }
  
  if (l.includes('cup') || l.includes('copa') || l.includes('coupe') || l.includes('pokal') || 
      l.includes('taça') || l.includes('beker')) {
    return 'national_cup';
  }
  
  if (l.includes('serie b') || l.includes('segunda') || l.includes('championship') || 
      l.includes('2. bundesliga') || l.includes('ligue 2')) {
    return 'second_div';
  }
  
  return 'first_div';
}