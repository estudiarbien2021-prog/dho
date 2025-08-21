import Papa from 'papaparse';
import { format } from 'date-fns';
import { RawMatchData, ProcessedMatch } from '@/types/match';
import { leagueToFlag } from './leagueCountry';

// IFFHS Top 50 countries (2024)
const IFFHS_COUNTRIES = [
  'England', 'Spain', 'Italy', 'Germany', 'France', 'Brazil', 'Argentina', 'Netherlands', 'Portugal', 'Belgium',
  'Turkey', 'Greece', 'Czech Republic', 'Scotland', 'Norway', 'Sweden', 'Poland', 'Ukraine', 'Bulgaria', 'Austria',
  'Romania', 'Cyprus', 'Israel', 'Serbia', 'Azerbaijan', 'Slovenia', 'Armenia', 'Hungary', 'Latvia', 'Northern Ireland',
  'Switzerland', 'Denmark', 'Colombia', 'Paraguay', 'Uruguay', 'Ecuador', 'Chile', 'Bolivia', 'Peru', 'USA',
  'Mexico', 'Costa Rica', 'Egypt', 'Morocco', 'Algeria', 'Japan', 'South Korea', 'Saudi Arabia', 'Iran', 'Qatar'
];

// Second division leagues for top 10 countries
const SECOND_DIVISION_LEAGUES = [
  'Serie B', 'LaLiga 2', 'Hypermotion', 'EFL Championship', 'Championship', 'Série B', 
  '2. Bundesliga', 'Primera Nacional', 'Liga Portugal 2', 'LigaPro',
  'Ligue 2', 'Challenger Pro League', 'Eerste Divisie', 'Keuken Kampioen Divisie'
];

export function detectDateFormat(dateStr: string): 'unix' | 'gmt' | 'unknown' {
  if (/^\d{10}$/.test(dateStr)) return 'unix'; // seconds
  if (/^\d{13}$/.test(dateStr)) return 'unix'; // milliseconds  
  if (dateStr.includes('-') || dateStr.includes('/')) return 'gmt';
  return 'unknown';
}

export function parseDate(dateStr: string): Date {
  const format = detectDateFormat(dateStr);
  
  if (format === 'unix') {
    const timestamp = parseInt(dateStr);
    // Auto-detect if seconds or milliseconds
    const isMilliseconds = timestamp > 1e12;
    return new Date(isMilliseconds ? timestamp : timestamp * 1000);
  }
  
  return new Date(dateStr);
}

function parseFloatSafe(value: string | undefined): number {
  if (!value || value === 'N/A' || value === '') return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

export function categorizeLeague(league: string): ProcessedMatch['category'] {
  const lowerLeague = league.toLowerCase();
  
  // Continental cups
  if (/champions league|europa league|europa conference|libertadores|sudamericana/i.test(league)) {
    return 'continental_cup';
  }
  
  // National cups
  if (/cup|copa|coupe|pokal|beker|taça/i.test(league)) {
    return 'national_cup';
  }
  
  // Second divisions
  if (SECOND_DIVISION_LEAGUES.some(div => lowerLeague.includes(div.toLowerCase()))) {
    return 'second_div';
  }
  
  // Default to first division for IFFHS leagues
  return 'first_div';
}

export function shouldIncludeMatch(league: string): boolean {
  const lowerLeague = league.toLowerCase();
  
  // Exclude patterns
  if (/esoccer|amical|friendly|youth|u\d+|women|féminin|regional|local/i.test(league)) {
    return false;
  }
  
  // Include continental cups
  if (/champions league|europa league|europa conference|libertadores|sudamericana/i.test(league)) {
    return true;
  }
  
  // Include national cups
  if (/cup|copa|coupe|pokal|beker|taça/i.test(league)) {
    return true;
  }
  
  // Include second divisions for top countries
  if (SECOND_DIVISION_LEAGUES.some(div => lowerLeague.includes(div.toLowerCase()))) {
    return true;
  }
  
  // Include first divisions (basic heuristic)
  return true; // For now, include everything else after exclusions
}

export function calculateFairProbabilities(odds1: number, odds2: number, odds3?: number): {
  probs: number[];
  vig: number;
} {
  const impliedProbs = [1/odds1, 1/odds2];
  if (odds3) impliedProbs.push(1/odds3);
  
  const totalImplied = impliedProbs.reduce((sum, p) => sum + p, 0);
  const vig = totalImplied - 1;
  
  const fairProbs = impliedProbs.map(p => p / totalImplied);
  
  return { probs: fairProbs, vig };
}

export function detectOverUnderMarkets(row: RawMatchData): Array<{
  threshold: number;
  odds_over: number;
  odds_under: number;
}> {
  const markets: Array<{ threshold: number; odds_over: number; odds_under: number }> = [];
  
  Object.keys(row).forEach(key => {
    const overMatch = key.match(/^Odds_Over(\d+)(\d)/);
    if (overMatch) {
      const threshold = parseFloat(`${overMatch[1]}.${overMatch[2]}`);
      const underKey = `Odds_Under${overMatch[1]}${overMatch[2]}`;
      
      const oddsOver = parseFloatSafe(row[key]);
      const oddsUnder = parseFloatSafe(row[underKey]);
      
      if (oddsOver > 0 && oddsUnder > 0) {
        markets.push({
          threshold,
          odds_over: oddsOver,
          odds_under: oddsUnder
        });
      }
    }
  });
  
  return markets.sort((a, b) => a.threshold - b.threshold);
}

export function processCSVData(csvText: string): ProcessedMatch[] {
  const parseResult = Papa.parse<RawMatchData>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim()
  });
  
  console.log('CSV Headers:', parseResult.meta.fields);
  console.log('First CSV row sample:', parseResult.data[0]);
  
  if (parseResult.errors.length > 0) {
    console.warn('CSV parsing errors:', parseResult.errors);
  }
  
  const processed: ProcessedMatch[] = [];
  
  parseResult.data.forEach((row, index) => {
    try {
      if (!row.league || !row.home_team || !row.away_team) {
        return; // Skip incomplete rows
      }
      
      if (!shouldIncludeMatch(row.league)) {
        return; // Skip excluded leagues
      }
      
      // Parse datetime
      const dateField = row.kickoff_utc;
      if (!dateField) return;
      
      const kickoffUtc = parseDate(dateField);
      const kickoffLocal = new Date(kickoffUtc.toLocaleString());
      
      // Parse main odds
      const oddsHome = parseFloatSafe(row.odds_1x2_home);
      const oddsDraw = parseFloatSafe(row.odds_1x2_draw);  
      const oddsAway = parseFloatSafe(row.odds_1x2_away);
      
      if (!oddsHome || !oddsDraw || !oddsAway) return;
      
      // Calculate 1X2 probabilities
      const { probs: probs1x2, vig: vig1x2 } = calculateFairProbabilities(oddsHome, oddsDraw, oddsAway);
      
      // Parse BTTS odds
      const oddsBttsYes = parseFloatSafe(row.odds_btts_yes);
      const oddsBttsNo = parseFloatSafe(row.odds_btts_no);
      
      let probsBtts = [0.5, 0.5];
      let vigBtts = 0;
      
      // Si nous avons des probabilités et vigorish précalculés dans le CSV, les utiliser
      if (row.p_btts_yes_fair && row.p_btts_no_fair && row.vig_btts) {
        probsBtts = [parseFloatSafe(row.p_btts_yes_fair), parseFloatSafe(row.p_btts_no_fair)];
        vigBtts = parseFloatSafe(row.vig_btts);
      } else if (oddsBttsYes > 0 && oddsBttsNo > 0) {
        // Sinon calculer à partir des cotes
        const bttsResult = calculateFairProbabilities(oddsBttsYes, oddsBttsNo);
        probsBtts = bttsResult.probs;
        vigBtts = bttsResult.vig;
      }
      
      // Parse Over/Under 2.5
      const oddsOver25 = parseFloatSafe(row.odds_over_2_5);
      const oddsUnder25 = parseFloatSafe(row.odds_under_2_5);
      
      let probsOu25 = [0.5, 0.5];
      let vigOu25 = 0;
      
      // Si nous avons des probabilités et vigorish précalculés dans le CSV, les utiliser
      if (row.p_over_2_5_fair && row.p_under_2_5_fair && row.vig_ou_2_5) {
        probsOu25 = [parseFloatSafe(row.p_over_2_5_fair), parseFloatSafe(row.p_under_2_5_fair)];
        vigOu25 = parseFloatSafe(row.vig_ou_2_5);
      } else if (oddsOver25 > 0 && oddsUnder25 > 0) {
        // Sinon calculer à partir des cotes
        const ou25Result = calculateFairProbabilities(oddsOver25, oddsUnder25);
        probsOu25 = ou25Result.probs;
        vigOu25 = ou25Result.vig;
      }
      
      // Detect additional Over/Under markets
      const ouMarkets = detectOverUnderMarkets(row);
      const processedOuMarkets = ouMarkets.map(market => {
        const { probs, vig } = calculateFairProbabilities(market.odds_over, market.odds_under);
        return {
          threshold: market.threshold,
          odds_over: market.odds_over,
          odds_under: market.odds_under,
          p_over_fair: probs[0],
          p_under_fair: probs[1],
          vig
        };
      });
      
      // Calculate flags
      const isLowVig1x2 = vig1x2 <= 0.12;
      const watchBtts = probsBtts[0] >= 0.60 && vigBtts <= 0.15;
      const watchOver25 = probsOu25[0] >= 0.60 && vigOu25 <= 0.15;
      
      const match: ProcessedMatch = {
        id: `${format(kickoffUtc, 'yyyy-MM-dd')}-${index}`,
        league: row.league,
        home_team: row.home_team,
        away_team: row.away_team,
        match_date: format(kickoffUtc, 'yyyy-MM-dd'),
        kickoff_utc: kickoffUtc,
        kickoff_local: kickoffLocal,
        category: categorizeLeague(row.league),
        
        // Fair probabilities
        p_home_fair: probs1x2[0],
        p_draw_fair: probs1x2[1],
        p_away_fair: probs1x2[2],
        p_btts_yes_fair: probsBtts[0],
        p_btts_no_fair: probsBtts[1],
        p_over_2_5_fair: probsOu25[0],
        p_under_2_5_fair: probsOu25[1],
        
        // Vigorish
        vig_1x2: vig1x2,
        vig_btts: vigBtts,
        vig_ou_2_5: vigOu25,
        
        // Flags
        is_low_vig_1x2: isLowVig1x2,
        watch_btts: watchBtts,
        watch_over25: watchOver25,
        
        // Original odds
        odds_home: oddsHome,
        odds_draw: oddsDraw,
        odds_away: oddsAway,
        odds_btts_yes: oddsBttsYes > 0 ? oddsBttsYes : undefined,
        odds_btts_no: oddsBttsNo > 0 ? oddsBttsNo : undefined,
        odds_over_2_5: oddsOver25 > 0 ? oddsOver25 : undefined,
        odds_under_2_5: oddsUnder25 > 0 ? oddsUnder25 : undefined,
        
        // Additional markets
        over_under_markets: processedOuMarkets,
        
        // AI predictions
        ai_prediction: null,
        ai_confidence: 0,
        
        // Match results
        home_score: null,
        away_score: null,
        match_status: 'scheduled' as const
      };
      
      processed.push(match);
      
    } catch (error) {
      console.warn(`Error processing row ${index}:`, error);
    }
  });
  
  return processed;
}