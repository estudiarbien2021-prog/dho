import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessedMatch {
  id: string;
  league: string;
  home_team: string;
  away_team: string;
  country?: string;
  kickoff_utc: string;
  kickoff_local: string;
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
}

interface AIRecommendation {
  betType: string;
  prediction: string;
  odds: number;
  confidence: 'high' | 'medium' | 'low';
}

function generateAIRecommendation(match: ProcessedMatch, marketFilters: string[] = []): { prediction: string; confidence: number } | null {
  console.log('=== Génération prédiction IA pour ===', {
    league: match.league,
    home_team: match.home_team,
    away_team: match.away_team,
    odds_btts_yes: match.odds_btts_yes,
    odds_btts_no: match.odds_btts_no,
    p_btts_yes_fair: match.p_btts_yes_fair,
    p_btts_no_fair: match.p_btts_no_fair,
    p_over_2_5_fair: match.p_over_2_5_fair,
    p_under_2_5_fair: match.p_under_2_5_fair,
    vig_btts: match.vig_btts,
    vig_ou_2_5: match.vig_ou_2_5
  });

  // Détection des égalités 50/50
  const isOUEqual = Math.abs((match.p_over_2_5_fair || 0) - (match.p_under_2_5_fair || 0)) <= 0.01;
  const isBTTSEqual = Math.abs((match.p_btts_yes_fair || 0) - (match.p_btts_no_fair || 0)) <= 0.01;
  
  if (isOUEqual) {
    console.log('🔄 O/U égalité détectée (50%/50%) → Exclusion O/U, fallback sur BTTS uniquement');
  }
  if (isBTTSEqual) {
    console.log('🔄 BTTS égalité détectée (50%/50%) → Exclusion BTTS, fallback sur O/U uniquement');
  }

  // Analyser uniquement les marchés BTTS et Over/Under selon les filtres
  const markets = [];

  // Vérifier si les filtres de marchés permettent les marchés BTTS
  const allowBttsYes = marketFilters.length === 0 || marketFilters.includes('btts_yes');
  const allowBttsNo = marketFilters.length === 0 || marketFilters.includes('btts_no');
  const allowOver25 = marketFilters.length === 0 || marketFilters.includes('over25');
  const allowUnder25 = marketFilters.length === 0 || marketFilters.includes('under25');

  // Marché BTTS - évaluer seulement si pas d'égalité 50/50
  if (!isBTTSEqual) {
    const bttsSuggestions = [];
    
    if (allowBttsYes && match.odds_btts_yes && match.odds_btts_yes >= 1.3 && match.p_btts_yes_fair && match.p_btts_yes_fair > 0.45) {
      const score = match.p_btts_yes_fair * match.odds_btts_yes * (1 + match.vig_btts);
      console.log('BTTS YES passed all conditions, score:', score);
      bttsSuggestions.push({
        betType: 'BTTS',
        prediction: 'Oui',
        odds: match.odds_btts_yes,
        probability: match.p_btts_yes_fair,
        vigorish: match.vig_btts,
        score,
        confidence: match.p_btts_yes_fair > 0.65 && match.vig_btts > 0.08 ? 'high' : 'medium'
      });
    }
    
    if (allowBttsNo && match.odds_btts_no && match.odds_btts_no >= 1.3 && match.p_btts_no_fair && match.p_btts_no_fair > 0.45) {
      const score = match.p_btts_no_fair * match.odds_btts_no * (1 + match.vig_btts);
      console.log('BTTS NO passed all conditions, score:', score);
      bttsSuggestions.push({
        betType: 'BTTS',
        prediction: 'Non',
        odds: match.odds_btts_no,
        probability: match.p_btts_no_fair,
        vigorish: match.vig_btts,
        score,
        confidence: match.p_btts_no_fair > 0.65 && match.vig_btts > 0.08 ? 'high' : 'medium'
      });
    }

    console.log('BTTS suggestions count:', bttsSuggestions.length);

    // Garder seulement la meilleure option BTTS
    if (bttsSuggestions.length > 0) {
      const bestBtts = bttsSuggestions.reduce((prev, current) => {
        const scoreDifference = Math.abs(current.score - prev.score);
        console.log('Comparing BTTS scores:', prev.prediction, prev.score, 'vs', current.prediction, current.score);
        
        // Si les scores sont très proches (différence < 0.001), choisir celui avec la plus haute probabilité
        if (scoreDifference < 0.001) {
          console.log('Scores égaux, choisir par probabilité:', prev.probability, 'vs', current.probability);
          return current.probability > prev.probability ? current : prev;
        }
        
        return current.score > prev.score ? current : prev;
      });
      console.log('Best BTTS chosen:', bestBtts.prediction, 'with score:', bestBtts.score, 'and probability:', bestBtts.probability);
      
      // Ajouter le préfixe BTTS à la prédiction
      bestBtts.prediction = `BTTS ${bestBtts.prediction}`;
      
      markets.push(bestBtts);
    }
  }

  // Marché Over/Under 2.5 - évaluer seulement si pas d'égalité 50/50
  if (!isOUEqual) {
    const ouSuggestions = [];
    if (allowOver25 && match.odds_over_2_5 && match.odds_over_2_5 >= 1.3 && match.p_over_2_5_fair > 0.45) {
      const score = match.p_over_2_5_fair * match.odds_over_2_5 * (1 + match.vig_ou_2_5);
      ouSuggestions.push({
        betType: 'O/U 2.5',
        prediction: '+2,5 buts',
        odds: match.odds_over_2_5,
        probability: match.p_over_2_5_fair,
        vigorish: match.vig_ou_2_5,
        score,
        confidence: match.p_over_2_5_fair > 0.65 && match.vig_ou_2_5 > 0.08 ? 'high' : 'medium'
      });
    }
    
    if (allowUnder25 && match.odds_under_2_5 && match.odds_under_2_5 >= 1.3 && match.p_under_2_5_fair > 0.45) {
      const score = match.p_under_2_5_fair * match.odds_under_2_5 * (1 + match.vig_ou_2_5);
      ouSuggestions.push({
        betType: 'O/U 2.5',
        prediction: '-2,5 buts',
        odds: match.odds_under_2_5,
        probability: match.p_under_2_5_fair,
        vigorish: match.vig_ou_2_5,
        score,
        confidence: match.p_under_2_5_fair > 0.65 && match.vig_ou_2_5 > 0.08 ? 'high' : 'medium'
      });
    }

    // Garder seulement la meilleure option Over/Under
    if (ouSuggestions.length > 0) {
      const bestOU = ouSuggestions.reduce((prev, current) => 
        current.score > prev.score ? current : prev
      );
      markets.push(bestOU);
    }
  }

  console.log('Total markets found:', markets.length);

  // Retourner le marché avec le meilleur score global (priorisant vigorish élevé)
  if (markets.length === 0) {
    console.log('No markets found - both markets may be at 50/50 equality or insufficient data');
    return null;
  }
  
  const bestMarket = markets.reduce((prev, current) => 
    current.score > prev.score ? current : prev
  );
  
  console.log('Final best market:', bestMarket.betType, '-', bestMarket.prediction);
  
  // Convertir la confiance en score numérique
  const confidenceScore = bestMarket.confidence === 'high' ? 0.8 : 
                         bestMarket.confidence === 'medium' ? 0.6 : 0.4;
  
  return {
    prediction: bestMarket.prediction,
    confidence: confidenceScore
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { matchIds } = await req.json();
    
    console.log('🤖 Génération des prédictions IA pour', matchIds?.length || 'tous les', 'matchs');

    // Récupérer les matchs à traiter
    let query = supabaseClient
      .from('matches')
      .select('*');
    
    if (matchIds && matchIds.length > 0) {
      query = query.in('id', matchIds);
    } else {
      // Si pas d'IDs spécifiés, traiter tous les matchs sans prédiction IA
      query = query.is('ai_prediction', null);
    }

    const { data: matches, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ Erreur lors de la récupération des matchs:', fetchError);
      throw fetchError;
    }

    console.log('📊 Matchs récupérés:', matches?.length || 0);

    if (!matches || matches.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Aucun match à traiter',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Générer les prédictions pour chaque match
    const updates = [];
    let processed = 0;

    for (const match of matches) {
      try {
        // Convertir le match en format ProcessedMatch
        const processedMatch: ProcessedMatch = {
          id: match.id,
          league: match.league,
          home_team: match.home_team,
          away_team: match.away_team,
          country: match.country,
          kickoff_utc: match.kickoff_utc,
          kickoff_local: match.kickoff_local,
          category: match.category,
          p_home_fair: Number(match.p_home_fair),
          p_draw_fair: Number(match.p_draw_fair),
          p_away_fair: Number(match.p_away_fair),
          p_btts_yes_fair: Number(match.p_btts_yes_fair),
          p_btts_no_fair: Number(match.p_btts_no_fair),
          p_over_2_5_fair: Number(match.p_over_2_5_fair),
          p_under_2_5_fair: Number(match.p_under_2_5_fair),
          vig_1x2: Number(match.vig_1x2),
          vig_btts: Number(match.vig_btts),
          vig_ou_2_5: Number(match.vig_ou_2_5),
          is_low_vig_1x2: match.is_low_vig_1x2,
          watch_btts: match.watch_btts,
          watch_over25: match.watch_over25,
          odds_home: Number(match.odds_home),
          odds_draw: Number(match.odds_draw),
          odds_away: Number(match.odds_away),
          odds_btts_yes: match.odds_btts_yes ? Number(match.odds_btts_yes) : undefined,
          odds_btts_no: match.odds_btts_no ? Number(match.odds_btts_no) : undefined,
          odds_over_2_5: match.odds_over_2_5 ? Number(match.odds_over_2_5) : undefined,
          odds_under_2_5: match.odds_under_2_5 ? Number(match.odds_under_2_5) : undefined,
        };

        // Générer la prédiction IA
        const aiRecommendation = generateAIRecommendation(processedMatch);
        
        if (aiRecommendation) {
          updates.push({
            id: match.id,
            ai_prediction: aiRecommendation.prediction,
            ai_confidence: aiRecommendation.confidence
          });
          processed++;
          console.log(`✅ Prédiction générée pour ${match.home_team} vs ${match.away_team}: ${aiRecommendation.prediction} (${(aiRecommendation.confidence * 100).toFixed(0)}%)`);
        } else {
          console.log(`⚠️ Aucune prédiction générée pour ${match.home_team} vs ${match.away_team}`);
        }
      } catch (error) {
        console.error(`❌ Erreur lors de la génération pour ${match.home_team} vs ${match.away_team}:`, error);
      }
    }

    // Mettre à jour les matchs avec les prédictions IA
    if (updates.length > 0) {
      console.log('💾 Sauvegarde des prédictions IA pour', updates.length, 'matchs');
      
      for (const update of updates) {
        const { error: updateError } = await supabaseClient
          .from('matches')
          .update({
            ai_prediction: update.ai_prediction,
            ai_confidence: update.ai_confidence
          })
          .eq('id', update.id);

        if (updateError) {
          console.error('❌ Erreur lors de la mise à jour du match:', update.id, updateError);
        }
      }
    }

    console.log('🎉 Génération des prédictions IA terminée:', processed, 'prédictions générées');

    return new Response(JSON.stringify({ 
      success: true, 
      processed,
      total: matches.length,
      message: `${processed} prédictions IA générées avec succès`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Erreur dans generate-ai-predictions:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});