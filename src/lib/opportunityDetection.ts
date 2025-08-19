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
  console.log('📊 DONNÉES MATCH CRITIQUES:', {
    btts_vigorish: `${(match.vig_btts * 100).toFixed(1)}%`,
    btts_prob_yes: `${(match.p_btts_yes_fair * 100).toFixed(1)}%`,
    btts_prob_no: `${(match.p_btts_no_fair * 100).toFixed(1)}%`,
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
    btts_odds_no: context.odds_btts_no
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

// NOUVELLE FONCTION: Sélectionner intelligemment jusqu'à 2 opportunités avec les meilleures priorités de marchés différents
export function prioritizeOpportunitiesByRealProbability(opportunities: DetectedOpportunity[], match: ProcessedMatch): DetectedOpportunity[] {
  console.log('🎯 PRIORISATION INTELLIGENTE - INPUT:', opportunities.map(o => `${o.type}:${o.prediction}(priorité:${o.priority})(cote:${o.odds})`));
  
  // ÉTAPE 1: Séparer les vraies recommandations des "no_recommendation"
  const realRecommendations = opportunities.filter(opp => 
    opp.prediction !== 'no_recommendation' && 
    opp.prediction !== 'No recommendation' &&
    !opp.prediction.toLowerCase().includes('no recommendation')
  );
  
  console.log('🔄 RECOMMANDATIONS VALIDES:', realRecommendations.length, realRecommendations.map(r => `${r.type}:${r.prediction}(priorité:${r.priority})(cote:${r.odds})`));
  
  if (realRecommendations.length === 0) {
    console.log('🚫 AUCUNE RECOMMANDATION VALIDE');
    return [];
  }
  
  // ÉTAPE 2: Détecter et résoudre les opportunités contradictoires sur le même marché
  const marketGroups = new Map<string, DetectedOpportunity[]>();
  
  // Normaliser les types de marchés et grouper les opportunités
  const normalizeMarketType = (type: string): string => {
    if (type === 'O/U 2.5' || type === 'OU25') return 'ou25';
    if (type === 'BTTS') return 'btts';
    if (type === '1X2') return '1x2';
    if (type === 'Double Chance') return 'double_chance';
    if (type === 'Remboursé si nul') return 'refund_if_draw';
    return type.toLowerCase();
  };
  
  realRecommendations.forEach(recommendation => {
    const normalizedMarket = normalizeMarketType(recommendation.type);
    if (!marketGroups.has(normalizedMarket)) {
      marketGroups.set(normalizedMarket, []);
    }
    marketGroups.get(normalizedMarket)!.push(recommendation);
  });
  
  console.log('📊 GROUPEMENT PAR MARCHÉ:', Array.from(marketGroups.entries()).map(([market, opps]) => 
    `${market}: ${opps.length} opportunité(s)`
  ));
  
  // ÉTAPE 3: Résoudre les contradictions en gardant la meilleure cote par marché
  const resolvedOpportunities: DetectedOpportunity[] = [];
  
  marketGroups.forEach((opportunities, market) => {
    if (opportunities.length > 1) {
      console.log(`⚠️ CONTRADICTION DÉTECTÉE sur marché ${market}:`, opportunities.map(o => `${o.prediction}(cote:${o.odds})`));
      
      // Détecter si les opportunités sont vraiment contradictoires
      const isContradictory = checkIfContradictory(opportunities, market);
      
      if (isContradictory) {
        // Garder celle avec la plus grosse cote
        const bestOddsOpportunity = opportunities.reduce((best, current) => 
          current.odds > best.odds ? current : best
        );
        console.log(`✅ RÉSOLUTION CONTRADICTION - Sélection de la meilleure cote:`, `${bestOddsOpportunity.prediction}(cote:${bestOddsOpportunity.odds})`);
        resolvedOpportunities.push(bestOddsOpportunity);
      } else {
        // Si pas vraiment contradictoires, garder toutes (ex: différents types de 1X2)
        resolvedOpportunities.push(...opportunities);
      }
    } else {
      // Pas de contradiction, garder l'opportunité unique
      resolvedOpportunities.push(opportunities[0]);
    }
  });
  
  console.log('🔄 APRÈS RÉSOLUTION DES CONTRADICTIONS:', resolvedOpportunities.length, resolvedOpportunities.map(r => `${r.type}:${r.prediction}(cote:${r.odds})`));
  
  // ÉTAPE 4: Trier toutes les recommandations par priorité (1 = plus prioritaire, donc tri ascendant)
  const sortedRecommendations = [...resolvedOpportunities].sort((a, b) => a.priority - b.priority);
  console.log('📊 RECOMMANDATIONS TRIÉES PAR PRIORITÉ:', sortedRecommendations.map(r => `${r.type}:${r.prediction}(priorité:${r.priority})(cote:${r.odds})`));
  
  // ÉTAPE 5: Sélectionner jusqu'à 2 opportunités de marchés différents selon l'ordre de priorité
  const selectedRecommendations: DetectedOpportunity[] = [];
  const usedMarkets = new Set<string>();
  
  // Parcourir les opportunités et sélectionner jusqu'à 2 de marchés différents
  for (const recommendation of sortedRecommendations) {
    const normalizedMarket = normalizeMarketType(recommendation.type);
    
    if (!usedMarkets.has(normalizedMarket) && selectedRecommendations.length < 2) {
      selectedRecommendations.push(recommendation);
      usedMarkets.add(normalizedMarket);
      console.log(`✅ SÉLECTION: ${recommendation.type}:${recommendation.prediction} (marché: ${normalizedMarket}) (cote: ${recommendation.odds})`);
    } else if (usedMarkets.has(normalizedMarket)) {
      console.log(`🚫 REJETÉ - Marché déjà utilisé: ${recommendation.type}:${recommendation.prediction} (marché: ${normalizedMarket})`);
    } else if (selectedRecommendations.length >= 2) {
      console.log(`🚫 REJETÉ - Limite de 2 opportunités atteinte: ${recommendation.type}:${recommendation.prediction}`);
    }
  }
  
  console.log('✅ SÉLECTION INITIALE:', selectedRecommendations.length, 'opportunités');
  console.log('📋 AVANT TRI PAR COTES:', selectedRecommendations.map(r => `${r.type}:${r.prediction}(cote:${r.odds})`));
  
  // ÉTAPE 6: TRI FINAL PAR COTES - Mettre en premier celle avec la cote la plus élevée
  if (selectedRecommendations.length === 2) {
    selectedRecommendations.sort((a, b) => b.odds - a.odds);
    console.log('🎯 TRI FINAL PAR COTES APPLIQUÉ - Principale (cote plus élevée) en premier');
    console.log('📊 APRÈS TRI PAR COTES:', selectedRecommendations.map(r => `${r.type}:${r.prediction}(cote:${r.odds})`));
  } else {
    console.log('🔍 UNE SEULE RECOMMANDATION - Pas de tri par cotes nécessaire');
  }
  
  console.log('🎯 MARCHÉS UTILISÉS:', Array.from(usedMarkets));
  console.log('🏆 RECOMMANDATION PRINCIPALE (1ère):', selectedRecommendations[0] ? `${selectedRecommendations[0].type}:${selectedRecommendations[0].prediction} (cote:${selectedRecommendations[0].odds})` : 'AUCUNE');
  console.log('🥈 RECOMMANDATION SECONDAIRE (2ème):', selectedRecommendations[1] ? `${selectedRecommendations[1].type}:${selectedRecommendations[1].prediction} (cote:${selectedRecommendations[1].odds})` : 'AUCUNE');
  
  return selectedRecommendations;
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
    reason: opportunity.reason
  };
}
