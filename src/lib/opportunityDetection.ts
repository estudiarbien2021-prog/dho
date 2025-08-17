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
    let type = result.market;
    
    // Change type to string for user display, not type system constraint
    let userDisplayType: string = result.market;
    
    // Améliorer l'affichage du type de marché pour l'utilisateur
    if (result.market === 'ou25') {
      userDisplayType = 'O/U 2.5';
    } else if (result.market === 'btts') {
      userDisplayType = 'BTTS';
    } else if (result.market === '1x2') {
      userDisplayType = '1X2';
    }
    
    // Déterminer la prédiction selon l'action et le marché
    if (result.action === 'recommend_most_probable') {
      prediction = getMostProbablePrediction(result.market, context);
    } else if (result.action === 'recommend_least_probable') {
      prediction = getLeastProbablePrediction(result.market, context);
    } else if (result.action === 'recommend_double_chance_least_probable') {
      prediction = getDoubleChanceLeastProbable(context);
      userDisplayType = 'Double Chance';
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

    // Améliorer la raison avec une explication plus claire
    let reason = [`Règle: ${result.ruleName}`];
    if (result.action === 'recommend_least_probable' && (result.market === 'ou25' || result.market === 'btts')) {
      reason.push('Stratégie contrarian: parier contre le favori quand le vigorish est élevé');
    } else if (result.action === 'recommend_double_chance_least_probable') {
      reason = [`Double chance des 2 moins probables (Vigorish élevé: ${(context.vigorish_1x2 * 100).toFixed(1)}%)`];
    }

    return {
      type: userDisplayType,
      prediction,
      odds,
      reason,
      isInverted: result.action.includes('invert'),
      priority: result.priority
    };
  });

  console.log('🎯 OPPORTUNITÉS DÉTECTÉES:', opportunities.length, opportunities.map(o => `${o.type}:${o.prediction}`));
  return opportunities;
}

// Helper function for double chance least probable
function getDoubleChanceLeastProbable(context: RuleEvaluationContext): string {
  const outcomes = [
    { name: 'home', probability: context.probability_home },
    { name: 'draw', probability: context.probability_draw },
    { name: 'away', probability: context.probability_away }
  ];
  
  // Sort by probability ascending (least probable first)
  outcomes.sort((a, b) => a.probability - b.probability);
  
  // Get the two least probable outcomes
  const leastProbable1 = outcomes[0].name;
  const leastProbable2 = outcomes[1].name;
  
  // Map to double chance combinations
  const combination = `${leastProbable1}_${leastProbable2}`;
  
  switch (combination) {
    case 'home_draw':
    case 'draw_home':
      return '1X';
    case 'home_away':
    case 'away_home':
      return '12';
    case 'draw_away':
    case 'away_draw':
      return 'X2';
    default:
      return '1X'; // fallback
  }
}

// Helper function to get most probable prediction for a market
function getMostProbablePrediction(market: string, context: RuleEvaluationContext): string {
  console.log(`🎯 getMostProbablePrediction - market: ${market}`, {
    context_over25: context.probability_over25,
    context_under25: context.probability_under25,
    context_btts_yes: context.probability_btts_yes,
    context_btts_no: context.probability_btts_no
  });

  if (market === '1x2') {
    const highest = Math.max(context.probability_home, context.probability_draw, context.probability_away);
    if (highest === context.probability_home) return 'Victoire domicile';
    if (highest === context.probability_away) return 'Victoire extérieur';
    return 'Match nul';
  }
  
  if (market === 'btts') {
    const probYes = context.probability_btts_yes || 0;
    const probNo = context.probability_btts_no || 0;
    console.log(`🎯 BTTS probabilities: Yes=${probYes}, No=${probNo}`);
    return probYes > probNo ? 'Oui' : 'Non';
  }
  
  if (market === 'ou25') {
    const probOver = context.probability_over25 || 0;
    const probUnder = context.probability_under25 || 0;
    console.log(`🎯 OU25 probabilities: Over=${probOver}, Under=${probUnder}`);
    
    if (probOver === 0 && probUnder === 0) {
      console.log('❌ Both over/under probabilities are 0 for OU25 market');
      return 'Unknown';
    }
    
    const result = probOver > probUnder ? '+2,5 buts' : '-2,5 buts';
    console.log(`🎯 OU25 most probable result: ${result}`);
    return result;
  }
  
  console.log(`❌ Unknown market: ${market}`);
  return 'Unknown';
}

// Helper function to get least probable prediction for a market
function getLeastProbablePrediction(market: string, context: RuleEvaluationContext): string {
  console.log(`🎯 getLeastProbablePrediction - market: ${market}`, {
    context_over25: context.probability_over25,
    context_under25: context.probability_under25,
    context_btts_yes: context.probability_btts_yes,
    context_btts_no: context.probability_btts_no
  });

  if (market === '1x2') {
    const lowest = Math.min(context.probability_home, context.probability_draw, context.probability_away);
    if (lowest === context.probability_home) return 'Victoire domicile';
    if (lowest === context.probability_away) return 'Victoire extérieur';
    return 'Match nul';
  }
  
  if (market === 'btts') {
    const probYes = context.probability_btts_yes || 0;
    const probNo = context.probability_btts_no || 0;
    console.log(`🎯 BTTS probabilities: Yes=${probYes}, No=${probNo}`);
    return probYes < probNo ? 'Oui' : 'Non';
  }
  
  if (market === 'ou25') {
    const probOver = context.probability_over25 || 0;
    const probUnder = context.probability_under25 || 0;
    console.log(`🎯 OU25 probabilities: Over=${probOver}, Under=${probUnder}`);
    
    // Vérification améliorée avec fallback plus robuste
    if (probOver === 0 && probUnder === 0) {
      console.log('❌ Both over/under probabilities are 0 for OU25 market, using fallback');
      // Fallback: si pas de probabilités, supposer que Under est plus probable (conservateur)
      return '+2,5 buts';
    }
    
    // Si une seule probabilité est disponible, utiliser l'autre
    if (probOver === 0 && probUnder > 0) {
      return '+2,5 buts'; // Under est plus probable, donc Over est moins probable
    }
    if (probUnder === 0 && probOver > 0) {
      return '-2,5 buts'; // Over est plus probable, donc Under est moins probable
    }
    
    const result = probOver < probUnder ? '+2,5 buts' : '-2,5 buts';
    console.log(`🎯 OU25 least probable result: ${result}`);
    return result;
  }
  
  console.log(`❌ Unknown market: ${market}`);
  return 'Unknown';
}

// Helper function to get odds for a prediction
function getOddsForPrediction(market: string, prediction: string, context: RuleEvaluationContext): number {
  console.log(`🎯 getOddsForPrediction - market: ${market}, prediction: ${prediction}`, {
    odds_over25: context.odds_over25,
    odds_under25: context.odds_under25,
    odds_btts_yes: context.odds_btts_yes,
    odds_btts_no: context.odds_btts_no
  });

  if (market === '1x2') {
    if (prediction.includes('domicile')) {
      const odds = context.odds_home || 0;
      console.log(`🎯 1X2 odds for domicile: ${odds}`);
      return odds;
    }
    if (prediction.includes('extérieur')) {
      const odds = context.odds_away || 0;
      console.log(`🎯 1X2 odds for extérieur: ${odds}`);
      return odds;
    }
    if (prediction.includes('nul')) {
      const odds = context.odds_draw || 0;
      console.log(`🎯 1X2 odds for nul: ${odds}`);
      return odds;
    }
    // Handle double chance predictions
    if (prediction === '1X') {
      // Double chance home/draw - calculate based on individual odds
      const homeOdds = context.odds_home || 0;
      const drawOdds = context.odds_draw || 0;
      if (homeOdds > 0 && drawOdds > 0) {
        return 1 / ((1/homeOdds) + (1/drawOdds));
      }
    }
    if (prediction === '12') {
      // Double chance home/away
      const homeOdds = context.odds_home || 0;
      const awayOdds = context.odds_away || 0;
      if (homeOdds > 0 && awayOdds > 0) {
        return 1 / ((1/homeOdds) + (1/awayOdds));
      }
    }
    if (prediction === 'X2') {
      // Double chance draw/away
      const drawOdds = context.odds_draw || 0;
      const awayOdds = context.odds_away || 0;
      if (drawOdds > 0 && awayOdds > 0) {
        return 1 / ((1/drawOdds) + (1/awayOdds));
      }
    }
  }
  
  if (market === 'btts') {
    if (prediction === 'Oui') {
      const odds = context.odds_btts_yes || 0;
      console.log(`🎯 BTTS odds for Oui: ${odds}`);
      return odds;
    }
    if (prediction === 'Non') {
      const odds = context.odds_btts_no || 0;
      console.log(`🎯 BTTS odds for Non: ${odds}`);
      return odds;
    }
  }
  
  if (market === 'ou25') {
    if (prediction === '+2,5 buts') {
      const odds = context.odds_over25;
      console.log(`🎯 OU25 odds for +2,5 buts: ${odds}`);
      // Vérification plus stricte pour éviter les valeurs null/undefined
      if (odds && odds > 0) {
        return odds;
      } else {
        console.log('❌ Invalid or missing odds for +2,5 buts, odds value:', odds);
        return 0;
      }
    }
    if (prediction === '-2,5 buts') {
      const odds = context.odds_under25;
      console.log(`🎯 OU25 odds for -2,5 buts: ${odds}`);
      // Vérification plus stricte pour éviter les valeurs null/undefined
      if (odds && odds > 0) {
        return odds;
      } else {
        console.log('❌ Invalid or missing odds for -2,5 buts, odds value:', odds);
        return 0;
      }
    }
  }
  
  console.log(`❌ No odds found for market: ${market}, prediction: ${prediction}`);
  return 0;
}

// Fonction centralisée pour prioriser les opportunités par probabilité réelle
export function prioritizeOpportunitiesByRealProbability(opportunities: DetectedOpportunity[], match: ProcessedMatch): DetectedOpportunity[] {
  console.log('🎯 PRIORISATION CENTRALISÉE - INPUT:', opportunities.map(o => `${o.type}:${o.prediction}(inv:${o.isInverted})`));
  
  // ÉTAPE 1: Séparer les vraies recommandations des "no_recommendation"
  const realRecommendations = opportunities.filter(opp => 
    opp.prediction !== 'no_recommendation' && 
    opp.prediction !== 'No recommendation' &&
    !opp.prediction.toLowerCase().includes('no recommendation')
  );
  
  const noRecommendations = opportunities.filter(opp => 
    opp.prediction === 'no_recommendation' || 
    opp.prediction === 'No recommendation' ||
    opp.prediction.toLowerCase().includes('no recommendation')
  );
  
  console.log('🔄 SÉPARATION RECOMMANDATIONS:', {
    'vraies_recommandations': realRecommendations.length,
    'no_recommendations': noRecommendations.length,
    'vraies_détail': realRecommendations.map(r => `${r.type}:${r.prediction}`),
    'no_rec_détail': noRecommendations.map(r => `${r.type}:${r.prediction}`)
  });
  
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
      
    } else if (opp.type === 'O/U 2.5' || opp.type === 'OU25') {
      if (opp.prediction === '+2,5 buts') probability = match.p_over_2_5_fair;
      else if (opp.prediction === '-2,5 buts') probability = match.p_under_2_5_fair;
      else probability = Math.max(match.p_over_2_5_fair, match.p_under_2_5_fair); // Fallback
    }
    
    return probability;
  };
  
  // ÉTAPE 2: Trier les vraies recommandations par priorité puis probabilité réelle
  const sortRealRecommendations = (recommendations: DetectedOpportunity[]) => {
    return [...recommendations].sort((a, b) => {
      // D'abord, trier par priorité (croissant: chiffre plus bas = priorité plus élevée)
      if (a.priority !== b.priority) {
        console.log('🎯 TRI VRAIES REC PAR PRIORITÉ:', {
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
                         a.type === 'BTTS' ? match.vig_btts : 
                         (a.type === 'O/U 2.5' || a.type === 'OU25') ? match.vig_ou_2_5 : match.vig_ou_2_5;
        const bVigorish = b.type === '1X2' || b.type === 'Double Chance' ? match.vig_1x2 : 
                         b.type === 'BTTS' ? match.vig_btts : 
                         (b.type === 'O/U 2.5' || b.type === 'OU25') ? match.vig_ou_2_5 : match.vig_ou_2_5;
        
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
  };
  
  // ÉTAPE 3: Prioriser les vraies recommandations, puis les no_recommendation seulement si nécessaire
  let finalRecommendations: DetectedOpportunity[] = [];
  
  if (realRecommendations.length > 0) {
    // Il y a des vraies recommandations : les prioriser
    const sortedRealRecommendations = sortRealRecommendations(realRecommendations);
    finalRecommendations = sortedRealRecommendations;
    
    console.log('✅ VRAIES RECOMMANDATIONS TROUVÉES - IGNORANT LES NO_RECOMMENDATION:', {
      'vraies_recommandations': sortedRealRecommendations.length,
      'no_recommendations_ignorées': noRecommendations.length
    });
  } else {
    // Aucune vraie recommandation : utiliser les no_recommendation
    const sortedNoRecommendations = [...noRecommendations].sort((a, b) => a.priority - b.priority);
    finalRecommendations = sortedNoRecommendations;
    
    console.log('⚠️ AUCUNE VRAIE RECOMMANDATION - UTILISANT NO_RECOMMENDATION:', {
      'no_recommendations': sortedNoRecommendations.length
    });
  }
  
  console.log('🎯 PRIORISATION CENTRALISÉE - ORDRE FINAL:', finalRecommendations.map((o, i) => {
    const realProb = calculateRealProbability(o);
    const vig = o.type === '1X2' || o.type === 'Double Chance' ? match.vig_1x2 : 
                o.type === 'BTTS' ? match.vig_btts : 
                (o.type === 'O/U 2.5' || o.type === 'OU25') ? match.vig_ou_2_5 : match.vig_ou_2_5;
    return `${i+1}. ${o.type}:${o.prediction} (prob:${(realProb*100).toFixed(1)}%, vig:${(vig*100).toFixed(1)}%, inv:${o.isInverted})`;
  }));
  
  return finalRecommendations;
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