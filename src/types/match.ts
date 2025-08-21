export interface RawMatchData {
  League: string;
  "Home Team": string;
  "Away Team": string;
  date_unix?: string;
  date_GMT?: string;
  Odds_Home_Win: string;
  Odds_Draw: string;
  Odds_Away_Win: string;
  Odds_BTTS_Yes?: string;
  Odds_BTTS_No?: string;
  Odds_Over25?: string;
  Odds_Under25?: string;
  [key: string]: string | undefined;
}

export interface ProcessedMatch {
  id: string;
  league: string;
  home_team: string;
  away_team: string;
  country?: string; // Nouvelle colonne du CSV
  match_date: string; // Date officielle du match (YYYY-MM-DD)
  kickoff_utc: Date;
  kickoff_local: Date;
  category: 'first_div' | 'second_div' | 'continental_cup' | 'national_cup';
  
  // Fair probabilities
  p_home_fair: number;
  p_draw_fair: number;
  p_away_fair: number;
  p_btts_yes_fair: number;
  p_btts_no_fair: number;
  p_over_2_5_fair: number;
  p_under_2_5_fair: number;
  
  // Vigorish
  vig_1x2: number;
  vig_btts: number;
  vig_ou_2_5: number;
  
  // Flags
  is_low_vig_1x2: boolean;
  watch_btts: boolean;
  watch_over25: boolean;
  
  // Original odds
  odds_home: number;
  odds_draw: number;
  odds_away: number;
  odds_btts_yes?: number;
  odds_btts_no?: number;
  odds_over_2_5?: number;
  odds_under_2_5?: number;
  
  // Over/Under additional markets
  over_under_markets: Array<{
    threshold: number;
    odds_over: number;
    odds_under: number;
    p_over_fair: number;
    p_under_fair: number;
    vig: number;
  }>;
  
  // AI predictions from admin
  ai_prediction?: string | null;
  ai_confidence?: number;

  // Match results
  home_score?: number | null;
  away_score?: number | null;
  match_status: 'scheduled' | 'live' | 'finished' | 'cancelled' | 'postponed';
}

export interface UploadResult {
  success: boolean;
  date: string;
  total_matches: number;
  iffhs_matches: number;
  shortlist_count: number;
  error?: string;
}