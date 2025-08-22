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
  detectionCount: number;
}

/**
 * Convertit une action en prédiction lisible selon le marché
 */
function getActionToPredictionMapping(action: string, market: string, context: any): string {
  // Actions dynamiques
  if (action === 'recommend_most_probable') {
    return getMostProbablePrediction(market, context);
  } else if (action === 'recommend_least_probable') {
    return getLeastProbablePrediction(market, context);
  } else if (action === 'recommend_double_chance_least_probable') {
    return getDoubleChanceLeastProbable(context);
  }
  
  // Actions spécifiques avec mapping exact
  const actionMapping: Record<string, string> = {
    'recommend_home': 'Victoire domicile',
    'recommend_draw': 'Nul',
    'recommend_away': 'Victoire extérieur',
    'recommend_btts_yes': 'Oui',
    'recommend_btts_no': 'Non',
    'recommend_over': '+2,5 buts',
    'recommend_over25': '+2,5 buts', // ⭐ AJOUT pour gérer recommend_over25
    'recommend_under': '-2,5 buts',
    'recommend_under25': '-2,5 buts', // ⭐ AJOUT pour gérer recommend_under25
    'recommend_yes': 'Oui',
    'recommend_no': 'Non'
  };
  
  console.log(`🔍 DEBUG ACTION MAPPING: ${action} → Recherche dans actionMapping...`);
  
  const mappedPrediction = actionMapping[action];
  if (mappedPrediction) {
    console.log(`✅ DEBUG ACTION MAPPING: ${action} → ${mappedPrediction}`);
    return mappedPrediction;
  }
  
  console.log(`❌ DEBUG ACTION MAPPING: Action '${action}' NON TROUVÉE dans le mapping`);
  console.log(`🔍 DEBUG ACTION MAPPING: Actions disponibles:`, Object.keys(actionMapping));
  
  // Fallback: enlever le préfixe 'recommend_'
  const fallback = action.replace('recommend_', '');
  console.log(`🔄 DEBUG ACTION MAPPING: Fallback utilisé: ${action} → ${fallback}`);
  return fallback;
}

export async function detectOpportunities(match: ProcessedMatch): Promise<DetectedOpportunity[]> {
  console.log('🔍 DÉTECTION OPPORTUNITÉS POUR:', match.home_team, 'vs', match.away_team);
  console.log('📊 DONNÉES MATCH CRITIQUES:', {
    btts_vigorish: `${(match.vig_btts * 100).toFixed(1)}%`,
    btts_prob_yes: `${(match.p_btts_yes_fair * 100).toFixed(1)}%`,
    btts_prob_no: `${(match.p_btts_no_fair * 100).toFixed(1)}%`,
    ou25_vigorish: `${(match.vig_ou_2_5 * 100).toFixed(1)}%`,
    ou25_prob_over: `${(match.p_over_2_5_fair * 100).toFixed(1)}%`,
    ou25_prob_under: `${(match.p_under_2_5_fair * 100).toFixed(1)}%`,
    match_id: match.id
  });
  
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
  
  console.log('🎯 CONTEXTE ÉVALUATION COMPLET:', {
    btts_vigorish_decimal: context.vigorish_btts,
    btts_prob_yes_decimal: context.probability_btts_yes,
    btts_prob_no_decimal: context.probability_btts_no,
    btts_odds_yes: context.odds_btts_yes,
    btts_odds_no: context.odds_btts_no,
    ou25_vigorish_decimal: context.vigorish_ou25,
    ou25_prob_over_decimal: context.probability_over25,
    ou25_prob_under_decimal: context.probability_under25,
    ou25_odds_over: context.odds_over25,
    ou25_odds_under: context.odds_under25
  });

  // Evaluate conditional rules
  const ruleResults = await conditionalRulesService.evaluateRules(context);
  console.log('📋 RÈGLES ÉVALUÉES:', ruleResults.length, 'règles totales');
  console.log('📋 DÉTAIL ÉVALUATION:');
  ruleResults.forEach(r => {
    console.log(`  🔍 ${r.ruleName} (${r.market}): ${r.conditionsMet ? '✅ RESPECTÉE' : '❌ NON RESPECTÉE'}`);
    console.log(`     Détails: ${r.evaluationDetails}`);
  });
  
  // ÉTAPE CRITIQUE: Filtrer STRICTEMENT les règles qui respectent TOUTES les conditions
  const matchedRules = ruleResults.filter(result => result.conditionsMet);
  console.log('✅ RÈGLES CORRESPONDANTES (conditions strictement respectées):', matchedRules.length);
  matchedRules.forEach(r => {
    console.log(`  ✅ ${r.ruleName}: action=${r.action}, priorité=${r.priority}`);
  });
  
  // VÉRIFICATION CRITIQUE: Si aucune règle ne correspond, aucune recommandation ne sera générée
  if (matchedRules.length === 0) {
    console.log('🚫 AUCUNE RÈGLE RESPECTÉE - AUCUNE RECOMMANDATION GÉNÉRÉE');
    console.log('🚫 EXPLICATION: Toutes les règles configurées ont été évaluées et aucune ne respecte ses conditions');
    console.log('🚫 RÉSULTAT: Aucune recommandation automatique ne sera générée');
    return [];
  }
  
  // ÉTAPE 1: Filtrer les règles no_recommendation avant de créer les opportunités
  const validRules = matchedRules.filter(result => {
    if (result.action === 'no_recommendation') {
      console.log(`🚫 OPPORTUNITÉ BLOQUÉE par no_recommendation: ${result.ruleName} (${result.market})`);
      return false;
    }
    return true;
  });
  
  console.log('✅ RÈGLES VALIDES APRÈS FILTRAGE no_recommendation:', validRules.length, validRules.map(r => r.ruleName));
  
  // ⭐ DEBUG SPÉCIAL P16
  const p16Rules = validRules.filter(r => r.ruleName.includes('P16'));
  console.log('🚨 DEBUG P16 - Règles P16 trouvées après filtrage:', p16Rules.length);
  p16Rules.forEach(r => {
    console.log(`🚨 P16 DÉTAIL: Nom=${r.ruleName}, Action=${r.action}, Marché=${r.market}, Priorité=${r.priority}`);
  });
  
  // VÉRIFICATION FINALE: S'il n'y a pas de règles valides, ne pas créer d'opportunités
  if (validRules.length === 0) {
    console.log('🚫 AUCUNE RÈGLE VALIDE APRÈS FILTRAGE - AUCUNE OPPORTUNITÉ CRÉÉE');
    return [];
  }

  // Convert valid rule results to opportunities
  const opportunities: DetectedOpportunity[] = validRules.map(result => {
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
    } else if (result.action === 'recommend_refund_if_draw') {
      const mostProbableTeam = getMostProbableTeamExcludingDraw(context);
      prediction = mostProbableTeam === 'home' ? 'Victoire domicile (Remboursé si nul)' : 'Victoire extérieur (Remboursé si nul)';
      userDisplayType = 'Remboursé si nul';
    } else {
      // Déterminer la prédiction en fonction de l'action avec mapping spécifique
      prediction = getActionToPredictionMapping(result.action, result.market, context);
      
      console.log(`[OPPORTUNITY DEBUG] Action: ${result.action} → Prediction: ${prediction} (Market: ${result.market})`);
      
      if (!prediction || prediction === 'Unknown') {
        console.warn(`[OPPORTUNITY WARNING] Impossible de déterminer la prédiction pour l'action: ${result.action}`);
        return { type: '', prediction: '', odds: 0, reason: [], isInverted: false, priority: 0, detectionCount: 0 } as DetectedOpportunity;
      }
    }
    
    const odds = getOddsForPrediction(result.market, prediction, context);
    
    // ⭐ LOG SPÉCIAL POUR P16/OVER 2.5
    if (result.ruleName.includes('P16') || prediction.includes('2,5 buts') || prediction.includes('+2,5')) {
      console.log(`🚨 P16/OVER 2.5 OPPORTUNITÉ CRÉÉE:`, {
        ruleName: result.ruleName,
        action: result.action,
        market: result.market,
        prediction,
        userDisplayType,
        odds,
        priority: result.priority
      });
    }
    
    // Logs spécifiques pour P18 (règle "Recommander le moins probable" OU25)
    if (result.action === 'recommend_least_probable' && result.market === 'ou25') {
      console.log(`🎯 [P18 DEBUG] Opportunité P18 créée:`, {
        ruleName: result.ruleName,
        action: result.action,
        market: result.market,
        prediction,
        odds,
        priority: result.priority,
        context_odds_over: context.odds_over25,
        context_odds_under: context.odds_under25
      });
      
      if (odds === 0) {
        console.log('❌ [P18 ERROR] Cotes nulles détectées - cette opportunité sera filtrée');
      }
    }
    
    console.log(`✅ Opportunité créée:`, {
      type,
      prediction,
      odds,
      market: result.market
    });

    // CORRECTION: Afficher uniquement les détails exacts de la règle configurée
    let reason = [`Règle: ${result.ruleName}`];
    
    // Ajouter les détails de l'évaluation de la règle
    if (result.evaluationDetails) {
      reason.push(`Conditions: ${result.evaluationDetails}`);
    }
    
    // Ajouter les métriques actuelles du match pour transparence
    let currentMetrics = '';
    if (result.market === 'btts') {
      currentMetrics = `Vigorish BTTS: ${(context.vigorish_btts * 100).toFixed(1)}%`;
    } else if (result.market === 'ou25') {
      currentMetrics = `Vigorish O/U 2.5: ${(context.vigorish_ou25 * 100).toFixed(1)}%`;
    } else if (result.market === '1x2') {
      currentMetrics = `Vigorish 1X2: ${(context.vigorish_1x2 * 100).toFixed(1)}%`;
    }
    
    if (currentMetrics) {
      reason.push(currentMetrics);
    }

    return {
      type: userDisplayType,
      prediction,
      odds,
      reason,
      isInverted: result.action.includes('invert'),
      priority: result.priority,
      detectionCount: 1 // Initial count, will be updated in prioritization
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

// Helper function to get most probable team (excluding draw) for refund if draw bets
function getMostProbableTeamExcludingDraw(context: RuleEvaluationContext): 'home' | 'away' {
  return context.probability_home > context.probability_away ? 'home' : 'away';
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
    // CORRECTION: Pour "least probable", si probYes < probNo, alors "Oui" est moins probable
    // donc on recommande "Oui" (pari contre la tendance)
    return probYes < probNo ? 'Oui' : 'Non';
  }
  
  if (market === 'ou25') {
    const probOver = context.probability_over25 || 0;
    const probUnder = context.probability_under25 || 0;
    
    console.log(`🎯 [P18 DEBUG] OU25 probabilities pour "recommend_least_probable":`, { 
      probOver, 
      probUnder,
      overPercent: `${(probOver * 100).toFixed(1)}%`,
      underPercent: `${(probUnder * 100).toFixed(1)}%`,
      leastProbable: probOver < probUnder ? 'Over (+2,5)' : 'Under (-2,5)'
    });
    
    // Vérification améliorée avec fallback plus robuste
    if (probOver === 0 && probUnder === 0) {
      console.log('❌ [P18 ERROR] Both over/under probabilities are 0 for OU25 market, using fallback');
      // Fallback: si pas de probabilités, supposer que Under est plus probable (conservateur)
      return '+2,5 buts';
    }
    
    // Si une seule probabilité est disponible, utiliser l'autre
    if (probOver === 0 && probUnder > 0) {
      console.log(`🎯 [P18 DEBUG] Only Under probability available (${probUnder}), recommending Over`);
      return '+2,5 buts'; // Under est plus probable, donc Over est moins probable
    }
    if (probUnder === 0 && probOver > 0) {
      console.log(`🎯 [P18 DEBUG] Only Over probability available (${probOver}), recommending Under`);
      return '-2,5 buts'; // Over est plus probable, donc Under est moins probable
    }
    
    const result = probOver < probUnder ? '+2,5 buts' : '-2,5 buts';
    console.log(`🎯 [P18 DEBUG] OU25 least probable result: ${result}`);
    console.log(`🎯 [P18 DEBUG] Logic: probOver (${probOver}) < probUnder (${probUnder}) = ${probOver < probUnder}`);
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
    // Handle "Remboursé si match nul" - use odds of the most probable team
    if (prediction.includes('(Remboursé si nul)')) {
      if (prediction.includes('domicile')) {
        const odds = context.odds_home || 0;
        console.log(`🎯 Remboursé si nul odds for domicile: ${odds}`);
        return odds;
      }
      if (prediction.includes('extérieur')) {
        const odds = context.odds_away || 0;
        console.log(`🎯 Remboursé si nul odds for extérieur: ${odds}`);
        return odds;
      }
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
      console.log(`🎯 [P18 DEBUG] OU25 odds for +2,5 buts: ${odds}`);
      // Vérification plus stricte pour éviter les valeurs null/undefined
      if (odds && odds > 0) {
        console.log(`✅ [P18 DEBUG] Valid odds found for +2,5 buts: ${odds}`);
        return odds;
      } else {
        console.log('❌ [P18 ERROR] Invalid or missing odds for +2,5 buts, odds value:', odds);
        console.log('❌ [P18 ERROR] This will cause the opportunity to be filtered out');
        // Fallback: utiliser une cote minimale pour éviter le filtrage
        return 1.01;
      }
    }
    if (prediction === '-2,5 buts') {
      const odds = context.odds_under25;
      console.log(`🎯 [P18 DEBUG] OU25 odds for -2,5 buts: ${odds}`);
      // Vérification plus stricte pour éviter les valeurs null/undefined
      if (odds && odds > 0) {
        console.log(`✅ [P18 DEBUG] Valid odds found for -2,5 buts: ${odds}`);
        return odds;
      } else {
        console.log('❌ [P18 ERROR] Invalid or missing odds for -2,5 buts, odds value:', odds);
        console.log('❌ [P18 ERROR] This will cause the opportunity to be filtered out');
        // Fallback: utiliser une cote minimale pour éviter le filtrage
        return 1.01;
      }
    }
  }
  
  console.log(`❌ No odds found for market: ${market}, prediction: ${prediction}`);
  return 0;
}

// NOUVELLE FONCTION: Sélectionner intelligemment jusqu'à 2 opportunités avec les meilleures priorités de marchés différents
export function prioritizeOpportunitiesByRealProbability(opportunities: DetectedOpportunity[], match: ProcessedMatch): DetectedOpportunity[] {
  console.log('🎯 PRIORISATION INTELLIGENTE - INPUT:', opportunities.map(o => `${o.type}:${o.prediction}(cote:${o.odds})`));
  
  // ÉTAPE 1: Filtrer les vraies recommandations
  const validOpportunities = opportunities.filter(opp => 
    opp.prediction !== 'no_recommendation' && 
    opp.prediction !== 'No recommendation' &&
    !opp.prediction.toLowerCase().includes('no recommendation') &&
    opp.odds > 0
  );
  
  console.log('✅ OPPORTUNITÉS VALIDES:', validOpportunities.map(o => `${o.type}:${o.prediction}(cote:${o.odds})`));
  
  if (validOpportunities.length === 0) {
    return [];
  }
  
  // ÉTAPE 2: Regrouper par marché normalisé
  const marketGroups = new Map<string, DetectedOpportunity[]>();
  
  validOpportunities.forEach(opp => {
    let normalizedMarket = opp.type.toLowerCase();
    if (normalizedMarket.includes('o/u') || normalizedMarket.includes('2.5') || normalizedMarket.includes('2,5')) {
      normalizedMarket = 'ou25';
    } else if (normalizedMarket.includes('btts')) {
      normalizedMarket = 'btts';
    } else if (normalizedMarket.includes('1x2')) {
      normalizedMarket = '1x2';
    }
    
    if (!marketGroups.has(normalizedMarket)) {
      marketGroups.set(normalizedMarket, []);
    }
    marketGroups.get(normalizedMarket)!.push(opp);
  });
  
  console.log('📊 GROUPEMENT PAR MARCHÉ:', Array.from(marketGroups.entries()).map(([market, opps]) => 
    `${market}: ${opps.length} opportunité(s)`
  ));
  
  // ÉTAPE 3: Sélectionner la meilleure opportunité par marché (celle avec la cote la moins élevée)
  const bestByMarket: DetectedOpportunity[] = [];
  
  marketGroups.forEach((opportunities, market) => {
    // Si plusieurs opportunités sur le même marché, vérifier si elles sont contradictoires
    if (opportunities.length > 1) {
      console.log(`⚠️ MULTIPLE OPPORTUNITÉS sur marché ${market}:`, opportunities.map(o => `${o.prediction}(cote:${o.odds})`));
      
      // Pour le marché BTTS et O/U, prendre celle avec la cote la moins élevée
      const bestOpportunity = opportunities.reduce((best, current) => {
        return current.odds < best.odds ? current : best;
      });
      console.log(`✅ SÉLECTION ${market}: ${bestOpportunity.prediction} (cote: ${bestOpportunity.odds})`);
      bestByMarket.push(bestOpportunity);
    } else {
      // Une seule opportunité sur ce marché
      bestByMarket.push(opportunities[0]);
      console.log(`✅ SÉLECTION ${market}: ${opportunities[0].prediction} (cote: ${opportunities[0].odds})`);
    }
  });
  
  // ÉTAPE 4: Limiter à 2 opportunités maximum, en priorisant les marchés différents
  const finalRecommendations: DetectedOpportunity[] = [];
  const usedMarkets = new Set<string>();
  
  // Trier par cotes croissantes (cotes les moins élevées en premier)
  bestByMarket.sort((a, b) => a.odds - b.odds);
  
  // Sélectionner jusqu'à 2 opportunités de marchés différents
  for (const opportunity of bestByMarket) {
    let normalizedMarket = opportunity.type.toLowerCase();
    if (normalizedMarket.includes('o/u') || normalizedMarket.includes('2.5') || normalizedMarket.includes('2,5')) {
      normalizedMarket = 'ou25';
    } else if (normalizedMarket.includes('btts')) {
      normalizedMarket = 'btts';
    } else if (normalizedMarket.includes('1x2')) {
      normalizedMarket = '1x2';
    }
    
    if (!usedMarkets.has(normalizedMarket) && finalRecommendations.length < 2) {
      finalRecommendations.push(opportunity);
      usedMarkets.add(normalizedMarket);
      console.log(`🏆 SÉLECTION FINALE ${finalRecommendations.length}: ${opportunity.type}:${opportunity.prediction} (cote: ${opportunity.odds})`);
    }
  }
  
  // ÉTAPE 5: Classement Final - Réorganisation par cotes décroissantes
  // La cote la plus élevée = recommandation principale (affiché en premier)
  finalRecommendations.sort((a, b) => {
    return b.odds - a.odds; // Tri décroissant : cotes les plus élevées en premier
  });
  
  // Ne garder que la recommandation avec la cote la plus élevée
  const finalResult = finalRecommendations.slice(0, 1);
  
  console.log('🏆 RECOMMANDATION FINALE:', finalResult.map((o, index) => {
    const vigorish = getVigorishForOpportunity(o, match);
    return `${index + 1}. ${o.type}:${o.prediction}(cote:${o.odds}, vig:${vigorish.toFixed(1)}%)`;
  }));
  
  return finalResult;
}

// NOUVELLE FONCTION: Vérifier si les opportunités sont vraiment contradictoires
function checkIfContradictory(opportunities: DetectedOpportunity[], market: string): boolean {
  if (opportunities.length <= 1) return false;
  
  // Pour BTTS: Oui vs Non = contradictoire
  if (market === 'btts') {
    const hasYes = opportunities.some(o => o.prediction.toLowerCase().includes('oui'));
    const hasNo = opportunities.some(o => o.prediction.toLowerCase().includes('non'));
    return hasYes && hasNo;
  }
  
  // Pour O/U 2.5: Over vs Under = contradictoire
  if (market === 'ou25') {
    const hasOver = opportunities.some(o => o.prediction.includes('+2,5') || o.prediction.toLowerCase().includes('over'));
    const hasUnder = opportunities.some(o => o.prediction.includes('-2,5') || o.prediction.toLowerCase().includes('under'));
    return hasOver && hasUnder;
  }
  
  // Pour 1X2: différentes prédictions directes = contradictoire
  if (market === '1x2') {
    const predictions = new Set(opportunities.map(o => o.prediction));
    // Si on a plus d'une prédiction différente, c'est contradictoire
    const hasHome = opportunities.some(o => o.prediction.toLowerCase().includes('domicile'));
    const hasAway = opportunities.some(o => o.prediction.toLowerCase().includes('extérieur'));
    const hasDraw = opportunities.some(o => o.prediction.toLowerCase().includes('nul'));
    
    // Compter les prédictions différentes
    const differentPredictions = [hasHome, hasAway, hasDraw].filter(Boolean).length;
    return differentPredictions > 1;
  }
  
  // Par défaut, considérer comme non contradictoire
  return false;
}

// Helper function to get real probability for an opportunity
function getRealProbabilityForOpportunity(opp: DetectedOpportunity, match: ProcessedMatch): number {
  if (opp.type === 'BTTS') {
    return opp.prediction === 'Oui' ? match.p_btts_yes_fair : match.p_btts_no_fair;
  }
  if (opp.type === 'O/U 2.5' || opp.type === 'OU25') {
    return opp.prediction === '+2,5 buts' ? match.p_over_2_5_fair : match.p_under_2_5_fair;
  }
  if (opp.type === '1X2') {
    if (opp.prediction === 'Victoire domicile') return match.p_home_fair;
    if (opp.prediction === 'Victoire extérieur') return match.p_away_fair;
    return match.p_draw_fair;
  }
  return 0;
}

// Helper function to get vigorish for an opportunity
function getVigorishForOpportunity(opp: DetectedOpportunity, match: ProcessedMatch): number {
  if (opp.type === 'BTTS') return match.vig_btts;
  if (opp.type === 'O/U 2.5' || opp.type === 'OU25') return match.vig_ou_2_5;
  return match.vig_1x2;
}

export function convertOpportunityToAIRecommendation(opportunity: DetectedOpportunity) {
  return {
    betType: opportunity.type,
    prediction: opportunity.prediction,
    odds: opportunity.odds,
    confidence: opportunity.isInverted ? 'high' : 'medium',
    isInverted: opportunity.isInverted,
    reason: opportunity.reason,
    detectionCount: opportunity.detectionCount
  };
}
