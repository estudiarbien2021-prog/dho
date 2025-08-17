import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessedMatch {
  id: string;
  league: string;
  home_team: string;
  away_team: string;
  country?: string;
  match_date: string;
  kickoff_utc: Date;
  kickoff_local: Date;
  category: 'first_div' | 'second_div' | 'continental_cup' | 'national_cup';
  
  p_home_fair: number;
  p_draw_fair: number;
  p_away_fair: number;
  p_btts_yes_fair: number;
  p_btts_no_fair: number;
  p_over_2_5_fair: number;
  p_under_2_5_fair: number;
  
  vig_1x2: number;
  vig_btts: number;
  vig_ou_2_5: number;
  
  is_low_vig_1x2: boolean;
  watch_btts: boolean;
  watch_over25: boolean;
  
  odds_home: number;
  odds_draw: number;
  odds_away: number;
  odds_btts_yes?: number;
  odds_btts_no?: number;
  odds_over_2_5?: number;
  odds_under_2_5?: number;
  
  ai_prediction?: string | null;
  ai_confidence?: number;
}

interface OpportunityRecommendation {
  type: 'BTTS' | 'O/U 2.5' | '1X2';
  prediction: string;
  odds: number;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
}

// Detect opportunities based on vigorish and probabilities
function detectOpportunities(match: ProcessedMatch): OpportunityRecommendation[] {
  const opportunities: OpportunityRecommendation[] = [];
  
  // Check for negative vigorish (guaranteed opportunities)
  if (match.vig_1x2 < 0) {
    const homeProb = match.p_home_fair;
    const drawProb = match.p_draw_fair;
    const awayProb = match.p_away_fair;
    const maxProb = Math.max(homeProb, drawProb, awayProb);
    
    let prediction = '';
    let odds = 0;
    
    if (homeProb === maxProb) {
      prediction = 'Victoire domicile';
      odds = match.odds_home;
    } else if (drawProb === maxProb) {
      prediction = 'Match nul';
      odds = match.odds_draw;
    } else {
      prediction = 'Victoire extérieur';
      odds = match.odds_away;
    }
    
    opportunities.push({
      type: '1X2',
      prediction,
      odds,
      confidence: 'high',
      reasons: ['Vigorish négatif détecté']
    });
  }
  
  if (match.vig_btts < 0) {
    const prediction = match.p_btts_yes_fair > match.p_btts_no_fair ? 'Oui' : 'Non';
    const odds = prediction === 'Oui' ? (match.odds_btts_yes || 0) : (match.odds_btts_no || 0);
    
    opportunities.push({
      type: 'BTTS',
      prediction,
      odds,
      confidence: 'high',
      reasons: ['Vigorish négatif BTTS']
    });
  }
  
  if (match.vig_ou_2_5 < 0) {
    const prediction = match.p_over_2_5_fair > match.p_under_2_5_fair ? '+2,5 buts' : '-2,5 buts';
    const odds = prediction === '+2,5 buts' ? (match.odds_over_2_5 || 0) : (match.odds_under_2_5 || 0);
    
    opportunities.push({
      type: 'O/U 2.5',
      prediction,
      odds,
      confidence: 'high',
      reasons: ['Vigorish négatif O/U 2.5']
    });
  }
  
  // Check for high vigorish in 1X2 market (>= 10%)
  if (match.vig_1x2 >= 0.10) {
    // Look for double chance opportunities
    const homeDrawProb = match.p_home_fair + match.p_draw_fair;
    const homeAwayProb = match.p_home_fair + match.p_away_fair;
    const drawAwayProb = match.p_draw_fair + match.p_away_fair;
    
    const maxDoubleChance = Math.max(homeDrawProb, homeAwayProb, drawAwayProb);
    
    if (maxDoubleChance >= 0.65) { // 65% threshold for double chance
      let prediction = '';
      let odds = 0;
      
      if (homeDrawProb === maxDoubleChance) {
        prediction = '1X';
        odds = Math.min(match.odds_home, match.odds_draw);
      } else if (homeAwayProb === maxDoubleChance) {
        prediction = '12';
        odds = Math.min(match.odds_home, match.odds_away);
      } else {
        prediction = 'X2';
        odds = Math.min(match.odds_draw, match.odds_away);
      }
      
      opportunities.push({
        type: '1X2',
        prediction,
        odds,
        confidence: 'medium',
        reasons: [`Double chance avec ${(maxDoubleChance * 100).toFixed(1)}% de probabilité`]
      });
    }
  }
  
  // BTTS opportunities based on vigorish levels
  if (match.vig_btts < 0.06) { // Very low vigorish
    if (match.p_btts_yes_fair >= 0.52) {
      opportunities.push({
        type: 'BTTS',
        prediction: 'Oui',
        odds: match.odds_btts_yes || 0,
        confidence: 'high',
        reasons: ['Vigorish BTTS très faible', 'Probabilité favorable']
      });
    } else if (match.p_btts_no_fair >= 0.52) {
      opportunities.push({
        type: 'BTTS',
        prediction: 'Non',
        odds: match.odds_btts_no || 0,
        confidence: 'high',
        reasons: ['Vigorish BTTS très faible', 'Probabilité favorable']
      });
    }
  } else if (match.vig_btts >= 0.06 && match.vig_btts < 0.08) { // Medium vigorish
    if (match.p_btts_yes_fair >= 0.56) {
      opportunities.push({
        type: 'BTTS',
        prediction: 'Oui',
        odds: match.odds_btts_yes || 0,
        confidence: 'medium',
        reasons: ['Vigorish BTTS modéré', 'Forte probabilité BTTS Oui']
      });
    } else if (match.p_btts_no_fair >= 0.56) {
      opportunities.push({
        type: 'BTTS',
        prediction: 'Non',
        odds: match.odds_btts_no || 0,
        confidence: 'medium',
        reasons: ['Vigorish BTTS modéré', 'Forte probabilité BTTS Non']
      });
    }
  } else if (match.vig_btts >= 0.08) { // High vigorish
    if (match.p_btts_yes_fair >= 0.60) {
      opportunities.push({
        type: 'BTTS',
        prediction: 'Oui',
        odds: match.odds_btts_yes || 0,
        confidence: 'low',
        reasons: ['Vigorish BTTS élevé mais probabilité très forte']
      });
    } else if (match.p_btts_no_fair >= 0.60) {
      opportunities.push({
        type: 'BTTS',
        prediction: 'Non',
        odds: match.odds_btts_no || 0,
        confidence: 'low',
        reasons: ['Vigorish BTTS élevé mais probabilité très forte']
      });
    }
  }
  
  // O/U 2.5 opportunities
  if (match.vig_ou_2_5 < 0.06) { // Very low vigorish
    if (match.p_over_2_5_fair >= 0.52) {
      opportunities.push({
        type: 'O/U 2.5',
        prediction: '+2,5 buts',
        odds: match.odds_over_2_5 || 0,
        confidence: 'high',
        reasons: ['Vigorish O/U très faible', 'Probabilité favorable Over']
      });
    } else if (match.p_under_2_5_fair >= 0.52) {
      opportunities.push({
        type: 'O/U 2.5',
        prediction: '-2,5 buts',
        odds: match.odds_under_2_5 || 0,
        confidence: 'high',
        reasons: ['Vigorish O/U très faible', 'Probabilité favorable Under']
      });
    }
  } else if (match.vig_ou_2_5 >= 0.06 && match.vig_ou_2_5 < 0.08) { // Medium vigorish
    if (match.p_over_2_5_fair >= 0.56) {
      opportunities.push({
        type: 'O/U 2.5',
        prediction: '+2,5 buts',
        odds: match.odds_over_2_5 || 0,
        confidence: 'medium',
        reasons: ['Vigorish O/U modéré', 'Forte probabilité Over 2.5']
      });
    } else if (match.p_under_2_5_fair >= 0.56) {
      opportunities.push({
        type: 'O/U 2.5',
        prediction: '-2,5 buts',
        odds: match.odds_under_2_5 || 0,
        confidence: 'medium',
        reasons: ['Vigorish O/U modéré', 'Forte probabilité Under 2.5']
      });
    }
  } else if (match.vig_ou_2_5 >= 0.08) { // High vigorish
    if (match.p_over_2_5_fair >= 0.60) {
      opportunities.push({
        type: 'O/U 2.5',
        prediction: '+2,5 buts',
        odds: match.odds_over_2_5 || 0,
        confidence: 'low',
        reasons: ['Vigorish O/U élevé mais probabilité très forte']
      });
    } else if (match.p_under_2_5_fair >= 0.60) {
      opportunities.push({
        type: 'O/U 2.5',
        prediction: '-2,5 buts',
        odds: match.odds_under_2_5 || 0,
        confidence: 'low',
        reasons: ['Vigorish O/U élevé mais probabilité très forte']
      });
    }
  }
  
  return opportunities;
}

// Get probability from recommendation
function getProbabilityFromRecommendation(opp: OpportunityRecommendation, match: ProcessedMatch): number {
  switch (opp.type) {
    case 'BTTS':
      return opp.prediction === 'Oui' ? match.p_btts_yes_fair : match.p_btts_no_fair;
    case 'O/U 2.5':
      return opp.prediction === '+2,5 buts' ? match.p_over_2_5_fair : match.p_under_2_5_fair;
    case '1X2':
      if (opp.prediction === 'Victoire domicile') return match.p_home_fair;
      if (opp.prediction === 'Match nul') return match.p_draw_fair;
      return match.p_away_fair;
    default:
      return 0;
  }
}

// Format prediction for storage
function formatPrediction(betType: string, prediction: string): string {
  switch (betType) {
    case 'BTTS':
      return prediction === 'Oui' ? 'BTTS Oui' : 'BTTS Non';
    case 'O/U 2.5':
      return prediction === '+2,5 buts' ? 'OU 2.5 +2,5 buts' : 'OU 2.5 -2,5 buts';
    case '1X2':
      if (prediction === 'Victoire domicile') return '1';
      if (prediction === 'Match nul') return 'X';
      if (prediction === 'Victoire extérieur') return '2';
      return prediction; // For double chance predictions like 1X, 12, X2
    default:
      return `${betType} ${prediction}`;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('Starting batch AI predictions processing...');
    
    // Fetch all matches without AI predictions
    const { data: matches, error: fetchError } = await supabase
      .from('matches')
      .select('*')
      .or('ai_prediction.is.null,ai_prediction.eq.""');
      
    if (fetchError) {
      console.error('Error fetching matches:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch matches', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!matches || matches.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No matches found without AI predictions',
          processed_count: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Found ${matches.length} matches without AI predictions`);
    
    let processedCount = 0;
    const updates = [];
    
    for (const match of matches) {
      try {
        // Convert database match to ProcessedMatch format
        const processedMatch: ProcessedMatch = {
          ...match,
          kickoff_utc: new Date(match.kickoff_utc),
          kickoff_local: new Date(match.kickoff_local),
        };
        
        // Detect opportunities for this match
        const opportunities = detectOpportunities(processedMatch);
        
        if (opportunities.length > 0) {
          // Sort opportunities by highest probability first
          const sortedOpportunities = opportunities.sort((a, b) => {
            const probA = getProbabilityFromRecommendation(a, processedMatch);
            const probB = getProbabilityFromRecommendation(b, processedMatch);
            return probB - probA; // Descending order
          });
          
          const mainOpportunity = sortedOpportunities[0];
          const mainPrediction = formatPrediction(mainOpportunity.type, mainOpportunity.prediction);
          const confidence = getProbabilityFromRecommendation(mainOpportunity, processedMatch) * 100;
          
          updates.push({
            id: match.id,
            ai_prediction: mainPrediction,
            ai_confidence: confidence
          });
          
          processedCount++;
        }
      } catch (error) {
        console.error(`Error processing match ${match.id}:`, error);
      }
    }
    
    // Batch update all predictions
    if (updates.length > 0) {
      console.log(`Updating ${updates.length} matches with AI predictions...`);
      
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('matches')
          .update({ 
            ai_prediction: update.ai_prediction,
            ai_confidence: update.ai_confidence 
          })
          .eq('id', update.id);
          
        if (updateError) {
          console.error(`Error updating match ${update.id}:`, updateError);
        }
      }
    }
    
    console.log(`Batch processing completed. Processed: ${processedCount} matches`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        processed_count: processedCount,
        total_matches_checked: matches.length,
        message: `Successfully processed ${processedCount} matches with AI predictions`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in batch-ai-predictions function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});