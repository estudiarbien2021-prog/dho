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

export async function detectOpportunities(match: ProcessedMatch): Promise<DetectedOpportunity[]> {
  console.log('🔍 DÉTECTION OPPORTUNITÉS POUR:', match.home_team, 'vs', match.away_team, '- ID:', match.id);
  
  // DEBUG SPÉCIAL POUR ZORYA vs HIRNYK
  if ((match.home_team.includes('Zorya') && match.away_team.includes('Hirnyk')) || 
      (match.home_team.includes('Hirnyk') && match.away_team.includes('Zorya'))) {
    console.log('🚨🚨🚨 MATCH ZORYA vs HIRNYK DÉTECTÉ - DEBUG DÉTAILLÉ!');
    console.log('📊 TOUTES LES VALEURS DU MATCH:', {
      id: match.id,
      league: match.league,
      home_team: match.home_team,
      away_team: match.away_team,
      vigorish_ou25_percent: (match.vig_ou_2_5 * 100).toFixed(1) + '%',
      vigorish_ou25_decimal: match.vig_ou_2_5,
      prob_over25_percent: (match.p_over_2_5_fair * 100).toFixed(1) + '%',
      prob_over25_decimal: match.p_over_2_5_fair,
      prob_under25_percent: (match.p_under_2_5_fair * 100).toFixed(1) + '%', 
      prob_under25_decimal: match.p_under_2_5_fair,
      odds_over25: match.odds_over_2_5,
      odds_under25: match.odds_under_2_5,
      has_ou25_data: !!(match.odds_over_2_5 && match.odds_under_2_5)
    });
  }
  
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

  const opportunities: DetectedOpportunity[] = [];

  try {
    // Appel du service de règles conditionnelles pour chaque marché
    const markets = ['1x2', 'btts', 'ou25'] as const;
    
    // DEBUG SPÉCIAL POUR ZORYA vs HIRNYK
    if ((match.home_team.includes('Zorya') && match.away_team.includes('Hirnyk')) || 
        (match.home_team.includes('Hirnyk') && match.away_team.includes('Zorya'))) {
      console.log('🔍 ÉVALUATION DES RÈGLES CONDITIONNELLES POUR ZORYA vs HIRNYK');
      console.log('📊 CONTEXTE RÈGLES:', context);
    }
    
    for (const market of markets) {
      // DEBUG SPÉCIAL POUR ZORYA vs HIRNYK
      if ((match.home_team.includes('Zorya') && match.away_team.includes('Hirnyk')) || 
          (match.home_team.includes('Hirnyk') && match.away_team.includes('Zorya'))) {
        console.log(`🎯 ÉVALUATION MARCHÉ: ${market.toUpperCase()}`);
      }
      
      const marketOpportunities = await conditionalRulesService.evaluateRules(context);
      
      // DEBUG SPÉCIAL POUR ZORYA vs HIRNYK
      if ((match.home_team.includes('Zorya') && match.away_team.includes('Hirnyk')) || 
          (match.home_team.includes('Hirnyk') && match.away_team.includes('Zorya'))) {
        console.log(`📊 RÉSULTATS MARCHÉ ${market.toUpperCase()}:`, marketOpportunities);
      }
      
      // Convertir les résultats en opportunités
      marketOpportunities.forEach(result => {
        if (result.conditionsMet && result.action !== 'no_recommendation') {
          let prediction = '';
          let odds = 0;
          
          // Déterminer la prédiction selon l'action
          if (result.action === 'recommend_most_probable') {
            prediction = getMostProbablePrediction(market, context);
          } else if (result.action === 'recommend_least_probable') {
            prediction = getLeastProbablePrediction(market, context);
          } else if (result.action === 'recommend_btts_yes') {
            prediction = 'Oui';
          } else if (result.action === 'recommend_btts_no') {
            prediction = 'Non';
          } else if (result.action === 'recommend_over25') {
            prediction = '+2,5 buts';
          } else if (result.action === 'recommend_under25') {
            prediction = '-2,5 buts';
          } else if (result.action === 'recommend_home') {
            prediction = 'Victoire domicile';
          } else if (result.action === 'recommend_away') {
            prediction = 'Victoire extérieur';
          } else if (result.action === 'recommend_draw') {
            prediction = 'Match nul';
          }
          
          odds = getOddsForPrediction(market, prediction, context);
          
          if (odds > 0) {
            opportunities.push({
              type: market.toUpperCase(),
              prediction,
              odds,
              reason: [`Règle: ${result.ruleName}`],
              isInverted: false,
              priority: result.priority || 1,
              detectionCount: 1
            });
          }
        }
      });
    }
  } catch (error) {
    console.error('Error during conditional rules evaluation:', error);
  }

  console.log(`🔍 OPPORTUNITÉS DÉTECTÉES POUR ${match.home_team} vs ${match.away_team}:`, opportunities.length);
  
  // DEBUG SPÉCIAL POUR ZORYA vs HIRNYK
  if ((match.home_team.includes('Zorya') && match.away_team.includes('Hirnyk')) || 
      (match.home_team.includes('Hirnyk') && match.away_team.includes('Zorya'))) {
    console.log('🚨🚨🚨 OPPORTUNITÉS FINALES POUR ZORYA vs HIRNYK:', {
      total_opportunities: opportunities.length,
      opportunities: opportunities.map(opp => ({
        type: opp.type,
        market: opp.type,
        recommendation: opp.prediction,
        reason: opp.reason
      }))
    });
  }
  
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
  
  // ÉTAPE 2: NOUVEAU - Compter les détections identiques (même marché + même prédiction)
  const detectionMap = new Map<string, DetectedOpportunity>();
  const normalizeMarketType = (type: string): string => {
    if (type === 'O/U 2.5' || type === 'OU25') return 'ou25';
    if (type === 'BTTS') return 'btts';
    if (type === '1X2') return '1x2';
    if (type === 'Double Chance') return 'double_chance';
    if (type === 'Remboursé si nul') return 'refund_if_draw';
    return type.toLowerCase();
  };

  // Grouper les opportunités identiques et compter les détections
  realRecommendations.forEach(opp => {
    const normalizedMarket = normalizeMarketType(opp.type);
    const detectionKey = `${normalizedMarket}:${opp.prediction}`;
    
    if (detectionMap.has(detectionKey)) {
      // Incrementer le compteur de détection
      const existingOpp = detectionMap.get(detectionKey)!;
      existingOpp.detectionCount += 1;
      // Garder la meilleure cote
      if (opp.odds > existingOpp.odds) {
        existingOpp.odds = opp.odds;
        existingOpp.reason = [...existingOpp.reason, ...opp.reason];
      }
      console.log(`🔄 DÉTECTION SUPPLÉMENTAIRE: ${detectionKey} (total: ${existingOpp.detectionCount})`);
    } else {
      // Première détection de cette opportunité
      detectionMap.set(detectionKey, { ...opp, detectionCount: 1 });
      console.log(`🆕 NOUVELLE DÉTECTION: ${detectionKey} (détections: 1)`);
    }
  });

  const consolidatedOpportunities = Array.from(detectionMap.values());
  console.log('📊 OPPORTUNITÉS CONSOLIDÉES:', consolidatedOpportunities.map(o => 
    `${o.type}:${o.prediction}(détections:${o.detectionCount})(cote:${o.odds})`
  ));

  // ÉTAPE 3: Détecter et résoudre les opportunités contradictoires sur le même marché
  const marketGroups = new Map<string, DetectedOpportunity[]>();
  
  consolidatedOpportunities.forEach(opportunity => {
    const normalizedMarket = normalizeMarketType(opportunity.type);
    if (!marketGroups.has(normalizedMarket)) {
      marketGroups.set(normalizedMarket, []);
    }
    marketGroups.get(normalizedMarket)!.push(opportunity);
  });
  
  console.log('📊 GROUPEMENT PAR MARCHÉ:', Array.from(marketGroups.entries()).map(([market, opps]) => 
    `${market}: ${opps.length} opportunité(s)`
  ));
  
  // ÉTAPE 4: Résoudre les contradictions en gardant la meilleure cote par marché
  const resolvedOpportunities: DetectedOpportunity[] = [];
  
  marketGroups.forEach((opportunities, market) => {
    if (opportunities.length > 1) {
      console.log(`⚠️ CONTRADICTION DÉTECTÉE sur marché ${market}:`, opportunities.map(o => `${o.prediction}(détections:${o.detectionCount})(cote:${o.odds})`));
      
      // Détecter si les opportunités sont vraiment contradictoires
      const isContradictory = checkIfContradictory(opportunities, market);
      
      if (isContradictory) {
        // Garder celle avec la plus grosse cote
        const bestOddsOpportunity = opportunities.reduce((best, current) => 
          current.odds > best.odds ? current : best
        );
        console.log(`✅ RÉSOLUTION CONTRADICTION - Sélection de la meilleure cote:`, `${bestOddsOpportunity.prediction}(détections:${bestOddsOpportunity.detectionCount})(cote:${bestOddsOpportunity.odds})`);
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
  
  console.log('🔄 APRÈS RÉSOLUTION DES CONTRADICTIONS:', resolvedOpportunities.length, resolvedOpportunities.map(r => `${r.type}:${r.prediction}(détections:${r.detectionCount})(cote:${r.odds})`));
  
  // ÉTAPE 5: NOUVEAU - Prioriser par consensus (3+ détections) puis par priorité et cotes
  const consensusOpportunities = resolvedOpportunities.filter(o => o.detectionCount >= 3);
  const normalOpportunities = resolvedOpportunities.filter(o => o.detectionCount < 3);
  
  console.log('⭐ OPPORTUNITÉS CONSENSUS (3+ détections):', consensusOpportunities.map(o => 
    `${o.type}:${o.prediction}(détections:${o.detectionCount})(cote:${o.odds})`
  ));
  console.log('📊 OPPORTUNITÉS NORMALES:', normalOpportunities.map(o => 
    `${o.type}:${o.prediction}(détections:${o.detectionCount})(cote:${o.odds})`
  ));

  // Trier les opportunités consensus par nombre de détections (décroissant) puis par cotes (décroissant)
  consensusOpportunities.sort((a, b) => {
    if (b.detectionCount !== a.detectionCount) {
      return b.detectionCount - a.detectionCount;
    }
    return b.odds - a.odds;
  });

  // Trier les opportunités normales par cotes (décroissant) puis par priorité (croissant)
  normalOpportunities.sort((a, b) => {
    if (b.odds !== a.odds) {
      return b.odds - a.odds;
    }
    return a.priority - b.priority;
  });
  
  // ÉTAPE 6: Sélectionner jusqu'à 2 opportunités de marchés différents
  const selectedRecommendations: DetectedOpportunity[] = [];
  const usedMarkets = new Set<string>();
  
  // D'abord, traiter les opportunités consensus
  for (const opportunity of consensusOpportunities) {
    const normalizedMarket = normalizeMarketType(opportunity.type);
    
    if (!usedMarkets.has(normalizedMarket) && selectedRecommendations.length < 2) {
      selectedRecommendations.push(opportunity);
      usedMarkets.add(normalizedMarket);
      console.log(`⭐ SÉLECTION CONSENSUS: ${opportunity.type}:${opportunity.prediction} (détections: ${opportunity.detectionCount}) (cote: ${opportunity.odds})`);
    }
  }
  
  // Ensuite, compléter avec les opportunités normales
  for (const opportunity of normalOpportunities) {
    const normalizedMarket = normalizeMarketType(opportunity.type);
    
    if (!usedMarkets.has(normalizedMarket) && selectedRecommendations.length < 2) {
      selectedRecommendations.push(opportunity);
      usedMarkets.add(normalizedMarket);
      console.log(`✅ SÉLECTION NORMALE: ${opportunity.type}:${opportunity.prediction} (détections: ${opportunity.detectionCount}) (cote: ${opportunity.odds})`);
    }
  }
  
  console.log('🎯 MARCHÉS UTILISÉS:', Array.from(usedMarkets));
  console.log('🏆 RECOMMANDATION PRINCIPALE (1ère):', selectedRecommendations[0] ? 
    `${selectedRecommendations[0].type}:${selectedRecommendations[0].prediction} (détections:${selectedRecommendations[0].detectionCount})(cote:${selectedRecommendations[0].odds})` : 'AUCUNE');
  console.log('🥈 RECOMMANDATION SECONDAIRE (2ème):', selectedRecommendations[1] ? 
    `${selectedRecommendations[1].type}:${selectedRecommendations[1].prediction} (détections:${selectedRecommendations[1].detectionCount})(cote:${selectedRecommendations[1].odds})` : 'AUCUNE');
  
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
    reason: opportunity.reason,
    detectionCount: opportunity.detectionCount
  };
}
