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
  
  // Convert match data to rule evaluation context
  const context: RuleEvaluationContext = {
    vigorish_1x2: match.vig_1x2 * 100, // Convert to percentage
    vigorish_btts: match.vig_btts ? match.vig_btts * 100 : 0,
    vigorish_ou25: match.vig_ou_2_5 * 100,
    probability_home: match.p_home_fair * 100,
    probability_draw: match.p_draw_fair * 100,
    probability_away: match.p_away_fair * 100,
    probability_btts_yes: match.p_btts_yes_fair * 100,
    probability_btts_no: match.p_btts_no_fair * 100,
    probability_over25: match.p_over_2_5_fair * 100,
    probability_under25: match.p_under_2_5_fair * 100,
    odds_home: match.odds_home,
    odds_draw: match.odds_draw,
    odds_away: match.odds_away,
    odds_btts_yes: match.odds_btts_yes || 0,
    odds_btts_no: match.odds_btts_no || 0,
    odds_over25: match.odds_over_2_5 || 0,
    odds_under25: match.odds_under_2_5 || 0
  };

  // Evaluate conditional rules
  const ruleResults = await conditionalRulesService.evaluateRules(context);
  console.log('📋 RÈGLES ÉVALUÉES:', ruleResults.length, 'règles totales');
  console.log('📋 DÉTAIL ÉVALUATION:', ruleResults.map(r => `${r.ruleName}: ${r.conditionsMet ? '✅' : '❌'} (${r.evaluationDetails})`));
  
  // CORRECTION: Filtrer seulement les règles qui correspondent aux conditions
  const matchedRules = ruleResults.filter(result => result.conditionsMet);
  console.log('✅ RÈGLES CORRESPONDANTES:', matchedRules.length, matchedRules.map(r => r.ruleName));
  
  // Convert matched rule results to opportunities
  const opportunities: DetectedOpportunity[] = matchedRules.map(result => ({
    type: result.action.split('_')[1] || result.action, // Extract market from action
    prediction: result.action.includes('most_probable') ? getMostProbablePrediction(result.action, context) :
                result.action.includes('least_probable') ? getLeastProbablePrediction(result.action, context) :
                result.action.split('_').slice(-1)[0], // Extract specific prediction
    odds: getOddsForPrediction(result.action, context),
    reason: [`Règle: ${result.ruleName}`],
    isInverted: result.action.includes('invert'),
    priority: result.priority
  }));

  console.log('🎯 OPPORTUNITÉS DÉTECTÉES:', opportunities.length, opportunities.map(o => `${o.type}:${o.prediction}`));
  return opportunities;
}

// Helper function to get most probable prediction for a market
function getMostProbablePrediction(action: string, context: RuleEvaluationContext): string {
  if (action.includes('1x2')) {
    const highest = Math.max(context.probability_home, context.probability_draw, context.probability_away);
    if (highest === context.probability_home) return 'Victoire domicile';
    if (highest === context.probability_away) return 'Victoire extérieur';
    return 'Match nul';
  }
  
  if (action.includes('btts')) {
    return context.probability_btts_yes > context.probability_btts_no ? 'Oui' : 'Non';
  }
  
  if (action.includes('ou')) {
    return context.probability_over25 > context.probability_under25 ? '+2,5 buts' : '-2,5 buts';
  }
  
  return 'Unknown';
}

// Helper function to get least probable prediction for a market
function getLeastProbablePrediction(action: string, context: RuleEvaluationContext): string {
  if (action.includes('1x2')) {
    const lowest = Math.min(context.probability_home, context.probability_draw, context.probability_away);
    if (lowest === context.probability_home) return 'Victoire domicile';
    if (lowest === context.probability_away) return 'Victoire extérieur';
    return 'Match nul';
  }
  
  if (action.includes('btts')) {
    return context.probability_btts_yes < context.probability_btts_no ? 'Oui' : 'Non';
  }
  
  if (action.includes('ou')) {
    return context.probability_over25 < context.probability_under25 ? '+2,5 buts' : '-2,5 buts';
  }
  
  return 'Unknown';
}

// Helper function to get odds for a prediction
function getOddsForPrediction(action: string, context: RuleEvaluationContext): number {
  if (action.includes('1x2')) {
    if (action.includes('home')) return context.odds_home;
    if (action.includes('away')) return context.odds_away;
    if (action.includes('draw')) return context.odds_draw;
    
    // Most/least probable case
    if (action.includes('most_probable')) {
      const highest = Math.max(context.probability_home, context.probability_draw, context.probability_away);
      if (highest === context.probability_home) return context.odds_home;
      if (highest === context.probability_away) return context.odds_away;
      return context.odds_draw;
    } else if (action.includes('least_probable')) {
      const lowest = Math.min(context.probability_home, context.probability_draw, context.probability_away);
      if (lowest === context.probability_home) return context.odds_home;
      if (lowest === context.probability_away) return context.odds_away;
      return context.odds_draw;
    }
  }
  
  if (action.includes('btts')) {
    if (action.includes('yes')) return context.odds_btts_yes;
    if (action.includes('no')) return context.odds_btts_no;
    
    // Most/least probable case
    if (action.includes('most_probable')) {
      return context.probability_btts_yes > context.probability_btts_no ? 
             context.odds_btts_yes : context.odds_btts_no;
    } else if (action.includes('least_probable')) {
      return context.probability_btts_yes < context.probability_btts_no ? 
             context.odds_btts_yes : context.odds_btts_no;
    }
  }
  
  if (action.includes('ou')) {
    if (action.includes('over')) return context.odds_over25;
    if (action.includes('under')) return context.odds_under25;
    
    // Most/least probable case
    if (action.includes('most_probable')) {
      return context.probability_over25 > context.probability_under25 ? 
             context.odds_over25 : context.odds_under25;
    } else if (action.includes('least_probable')) {
      return context.probability_over25 < context.probability_under25 ? 
             context.odds_over25 : context.odds_under25;
    }
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