import { ProcessedMatch } from '@/types/match';
import { conditionalRulesService } from '@/services/conditionalRulesService';
import { RuleEvaluationContext } from '@/types/conditionalRules';

export interface DetectedOpportunity {
  type: string;
  prediction: string;
  odds: number;
  reason: string[];
  isInverted: boolean;
  priority: number;
}

export async function detectOpportunities(match: ProcessedMatch): Promise<DetectedOpportunity[]> {
  console.log('🔍 DÉTECTION OPPORTUNITÉS POUR:', match.home_team, 'vs', match.away_team);
  
  // Convert match data to rule evaluation context (keep decimals, don't convert to percentages)
  const context: RuleEvaluationContext = {
    vigorish_1x2: match.vig_1x2, // Keep as decimal
    vigorish_btts: match.vig_btts || 0,
    vigorish_ou25: match.vig_ou_2_5,
    probability_home: match.p_home_fair,
    probability_draw: match.p_draw_fair,
    probability_away: match.p_away_fair,
    probability_btts_yes: match.p_btts_yes_fair,
    probability_btts_no: match.p_btts_no_fair,
    probability_over25: match.p_over_2_5_fair,
    probability_under25: match.p_under_2_5_fair,
    odds_home: match.odds_home,
    odds_draw: match.odds_draw,
    odds_away: match.odds_away,
    odds_btts_yes: match.odds_btts_yes || null,
    odds_btts_no: match.odds_btts_no || null,
    odds_over25: match.odds_over_2_5 || null,
    odds_under25: match.odds_under_2_5 || null
  };

  // Evaluate conditional rules
  const ruleResults = await conditionalRulesService.evaluateRules(context);
  console.log('📋 RÈGLES ÉVALUÉES:', ruleResults.length, 'règles totales');
  console.log('📋 DÉTAIL ÉVALUATION:', ruleResults.map(r => `${r.ruleName}: ${r.conditionsMet ? '✅' : '❌'} (${r.evaluationDetails})`));
  
  // CORRECTION: Filtrer seulement les règles qui correspondent aux conditions
  const matchedRules = ruleResults.filter(result => result.conditionsMet);
  console.log('✅ RÈGLES CORRESPONDANTES:', matchedRules.length, matchedRules.map(r => r.ruleName));
  
  // Convert matched rule results to opportunities
  const opportunities: DetectedOpportunity[] = matchedRules.map(result => {
    console.log(`🔄 Conversion règle -> opportunité:`, {
      ruleName: result.ruleName,
      market: result.market,
      action: result.action,
      priority: result.priority
    });

    let prediction = '';
    let type = result.market; // Utiliser le marché directement comme type
    
    // Déterminer la prédiction selon l'action et le marché
    if (result.action === 'recommend_most_probable') {
      prediction = getMostProbablePrediction(result.market, context);
    } else if (result.action === 'recommend_least_probable') {
      prediction = getLeastProbablePrediction(result.market, context);
    } else {
      // Actions spécifiques comme 'recommend_over', 'recommend_yes', etc.
      prediction = result.action.replace('recommend_', '');
    }
    
    const odds = getOddsForPrediction(result.market, prediction, context);
    
    console.log(`✅ Opportunité créée:`, {
      type,
      prediction,
      odds,
      market: result.market
    });

    return {
      type,
      prediction,
      odds,
      reason: [`Règle: ${result.ruleName}`],
      isInverted: result.action.includes('invert'),
      priority: result.priority
    };
  });

  console.log('🎯 OPPORTUNITÉS DÉTECTÉES:', opportunities.length, opportunities.map(o => `${o.type}:${o.prediction}`));
  return opportunities;
}

// Helper function to get most probable prediction for a market
function getMostProbablePrediction(market: string, context: RuleEvaluationContext): string {
  if (market === '1X2') {
    const highest = Math.max(context.probability_home, context.probability_draw, context.probability_away);
    if (highest === context.probability_home) return 'Victoire domicile';
    if (highest === context.probability_away) return 'Victoire extérieur';
    return 'Match nul';
  }
  
  if (market === 'BTTS') {
    return context.probability_btts_yes > context.probability_btts_no ? 'Oui' : 'Non';
  }
  
  if (market === 'OU25') {
    return context.probability_over25 > context.probability_under25 ? '+2,5 buts' : '-2,5 buts';
  }
  
  return 'Unknown';
}

// Helper function to get least probable prediction for a market
function getLeastProbablePrediction(market: string, context: RuleEvaluationContext): string {
  if (market === '1X2') {
    const lowest = Math.min(context.probability_home, context.probability_draw, context.probability_away);
    if (lowest === context.probability_home) return 'Victoire domicile';
    if (lowest === context.probability_away) return 'Victoire extérieur';
    return 'Match nul';
  }
  
  if (market === 'BTTS') {
    return context.probability_btts_yes < context.probability_btts_no ? 'Oui' : 'Non';
  }
  
  if (market === 'OU25') {
    return context.probability_over25 < context.probability_under25 ? '+2,5 buts' : '-2,5 buts';
  }
  
  return 'Unknown';
}

// Helper function to get odds for a prediction
function getOddsForPrediction(market: string, prediction: string, context: RuleEvaluationContext): number {
  if (market === '1X2') {
    if (prediction.includes('domicile')) return context.odds_home || 0;
    if (prediction.includes('extérieur')) return context.odds_away || 0;
    if (prediction.includes('nul')) return context.odds_draw || 0;
  }
  
  if (market === 'BTTS') {
    if (prediction === 'Oui') return context.odds_btts_yes || 0;
    if (prediction === 'Non') return context.odds_btts_no || 0;
  }
  
  if (market === 'OU25') {
    if (prediction === '+2,5 buts') return context.odds_over25 || 0;
    if (prediction === '-2,5 buts') return context.odds_under25 || 0;
  }
  
  return 0;
}

// Fonction centralisée pour prioriser les opportunités par probabilité réelle
export function prioritizeOpportunitiesByRealProbability(opportunities: DetectedOpportunity[], match: ProcessedMatch): DetectedOpportunity[] {
  console.log('🎯 PRIORISATION CENTRALISÉE - INPUT:', opportunities.map(o => `${o.type}:${o.prediction}(inv:${o.isInverted})`));
  
  // Calculer la probabilité réelle pour chaque recommandation
  const calculateRealProbability = (opp: DetectedOpportunity) => {
    let probability = 0;
    
    if (opp.type === '1X2' || opp.type === 'Double Chance') {
      const probHome = match.p_home_fair;
      const probDraw = match.p_draw_fair;
      const probAway = match.p_away_fair;
      
      if (opp.prediction === 'Victoire domicile' || opp.prediction === match.home_team) probability = probHome;
      else if (opp.prediction === 'Victoire extérieur' || opp.prediction === match.away_team) probability = probAway;
      else if (opp.prediction === 'Match nul' || opp.prediction === 'Nul') probability = probDraw;
      else if (opp.prediction === '1X') probability = probHome + probDraw; // Double chance
      else if (opp.prediction === 'X2') probability = probDraw + probAway; // Double chance
      else if (opp.prediction === '12') probability = probHome + probAway; // Double chance
      else probability = Math.max(probHome, probDraw, probAway); // Fallback
      
    } else if (opp.type === 'BTTS') {
      if (opp.prediction === 'Oui') probability = match.p_btts_yes_fair;
      else if (opp.prediction === 'Non') probability = match.p_btts_no_fair;
      else probability = Math.max(match.p_btts_yes_fair, match.p_btts_no_fair); // Fallback
      
    } else if (opp.type === 'O/U 2.5') {
      if (opp.prediction === '+2,5 buts') probability = match.p_over_2_5_fair;
      else if (opp.prediction === '-2,5 buts') probability = match.p_under_2_5_fair;
      else probability = Math.max(match.p_over_2_5_fair, match.p_under_2_5_fair); // Fallback
    }
    
    return probability;
  };
  
  // Trier par priorité (croissant: 1, 2, 3, 4, 5), puis par probabilité réelle décroissante, puis par vigorish décroissant
  const sortedByPriority = [...opportunities].sort((a, b) => {
    // D'abord, trier par priorité (croissant: chiffre plus bas = priorité plus élevée)
    if (a.priority !== b.priority) {
      console.log('🎯 TRI PAR PRIORITÉ:', {
        'a.type': a.type,
        'a.prediction': a.prediction,
        'a.priority': a.priority,
        'b.type': b.type,
        'b.prediction': b.prediction,
        'b.priority': b.priority,
        'choix': a.priority < b.priority ? 'a (priorité plus élevée)' : 'b'
      });
      return a.priority - b.priority;
    }
    
    // Si les priorités sont égales, trier par probabilité réelle décroissante
    const aProbability = calculateRealProbability(a);
    const bProbability = calculateRealProbability(b);
    
    console.log('🔄 MÊME PRIORITÉ - COMPARAISON PROBABILITÉS RÉELLES:', {
      'a.type': a.type,
      'a.prediction': a.prediction,
      'a.realProbability': (aProbability * 100).toFixed(1) + '%',
      'b.type': b.type,
      'b.prediction': b.prediction,
      'b.realProbability': (bProbability * 100).toFixed(1) + '%'
    });
    
    // Si les probabilités sont très proches (différence < 0.01), trier par vigorish décroissant
    if (Math.abs(aProbability - bProbability) < 0.01) {
      const aVigorish = a.type === '1X2' || a.type === 'Double Chance' ? match.vig_1x2 : 
                       a.type === 'BTTS' ? match.vig_btts : match.vig_ou_2_5;
      const bVigorish = b.type === '1X2' || b.type === 'Double Chance' ? match.vig_1x2 : 
                       b.type === 'BTTS' ? match.vig_btts : match.vig_ou_2_5;
      
      console.log('🔄 ÉGALITÉ PROBABILITÉ - TRI PAR VIGORISH:', {
        'a.vigorish': (aVigorish * 100).toFixed(1) + '%',
        'b.vigorish': (bVigorish * 100).toFixed(1) + '%',
        'choix': bVigorish > aVigorish ? 'b (vigorish plus élevé)' : 'a'
      });
      
      return bVigorish - aVigorish; // Vigorish décroissant en cas d'égalité
    }
    
    // Sinon, trier par probabilité RÉELLE décroissante
    return bProbability - aProbability;
  });
  
  console.log('🎯 PRIORISATION CENTRALISÉE - ORDRE FINAL:', sortedByPriority.map((o, i) => {
    const realProb = calculateRealProbability(o);
    const vig = o.type === '1X2' || o.type === 'Double Chance' ? match.vig_1x2 : 
                o.type === 'BTTS' ? match.vig_btts : match.vig_ou_2_5;
    return `${i+1}. ${o.type}:${o.prediction} (prob:${(realProb*100).toFixed(1)}%, vig:${(vig*100).toFixed(1)}%, inv:${o.isInverted})`;
  }));
  
  return sortedByPriority;
}

export function convertOpportunityToAIRecommendation(opportunity: DetectedOpportunity) {
  return {
    betType: opportunity.type,
    prediction: opportunity.prediction,
    odds: opportunity.odds,
    confidence: opportunity.isInverted ? 'high' : 'medium',
    isInverted: opportunity.isInverted,
    reason: opportunity.reason
  };
}