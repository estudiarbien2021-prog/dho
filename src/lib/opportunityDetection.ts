
import { ProcessedMatch } from '@/types/match';

export interface DetectedOpportunity {
  type: string;
  prediction: string;
  odds: number;
  reason: string[];
  isInverted: boolean;
  priority: number;
}

export function detectOpportunities(match: ProcessedMatch): DetectedOpportunity[] {
  console.log('🔍 DÉTECTION OPPORTUNITÉS POUR:', match.home_team, 'vs', match.away_team);
  
  const opportunities: DetectedOpportunity[] = [];
  
  // Seuils de configuration
  const HIGH_VIG_THRESHOLD = 0.08; // 8%
  const LOW_VIG_THRESHOLD = 0.06;  // 6%
  const HIGH_PROB_THRESHOLD = 0.565; // 56.5%
  
  console.log('🔍 SEUILS:', {
    HIGH_VIG_THRESHOLD,
    LOW_VIG_THRESHOLD,
    HIGH_PROB_THRESHOLD
  });

  // === 1. OPPORTUNITÉS NÉGATIVES (Priorité maximale) ===
  
  // 1X2 Negative Vigorish
  if (match.vig_1x2 < 0) {
    const most1x2Prob = Math.max(match.p_home_fair, match.p_draw_fair, match.p_away_fair);
    let prediction1x2 = '';
    let odds1x2 = 0;
    
    if (most1x2Prob === match.p_home_fair) {
      prediction1x2 = 'Victoire domicile';
      odds1x2 = match.odds_home;
    } else if (most1x2Prob === match.p_away_fair) {
      prediction1x2 = 'Victoire extérieur';
      odds1x2 = match.odds_away;
    } else {
      prediction1x2 = 'Match nul';
      odds1x2 = match.odds_draw;
    }
    
    opportunities.push({
      type: '1X2_NEGATIVE',
      prediction: prediction1x2,
      odds: odds1x2,
      reason: [`Vigorish négatif exceptionnel: ${(match.vig_1x2 * 100).toFixed(2)}%`],
      isInverted: false,
      priority: 1
    });
    
    console.log('🎯 OPPORTUNITÉ NÉGATIVE 1X2 DÉTECTÉE:', prediction1x2, 'odds:', odds1x2);
  }
  
  // BTTS Negative Vigorish
  if (match.vig_btts && match.vig_btts < 0 && 
      match.p_btts_yes_fair > 0 && match.p_btts_no_fair > 0 && 
      match.odds_btts_yes && match.odds_btts_no) {
    
    // Vérifier que ce n'est pas une égalité 50/50
    const isBTTSEqual = Math.abs(match.p_btts_yes_fair - match.p_btts_no_fair) <= 0.01;
    
    if (!isBTTSEqual) {
      const mostBttsProb = Math.max(match.p_btts_yes_fair, match.p_btts_no_fair);
      const predictionBtts = mostBttsProb === match.p_btts_yes_fair ? 'Oui' : 'Non';
      const oddsBtts = mostBttsProb === match.p_btts_yes_fair ? match.odds_btts_yes : match.odds_btts_no;
      
      opportunities.push({
        type: 'BTTS_NEGATIVE',
        prediction: predictionBtts,
        odds: oddsBtts,
        reason: [`Vigorish négatif exceptionnel: ${(match.vig_btts * 100).toFixed(2)}%`],
        isInverted: false,
        priority: 1
      });
      
      console.log('🎯 OPPORTUNITÉ NÉGATIVE BTTS DÉTECTÉE:', predictionBtts, 'odds:', oddsBtts);
    }
  }
  
  // O/U 2.5 Negative Vigorish
  if (match.vig_ou_2_5 < 0) {
    // Vérifier que ce n'est pas une égalité 50/50
    const isOUEqual = Math.abs(match.p_over_2_5_fair - match.p_under_2_5_fair) <= 0.01;
    
    if (!isOUEqual) {
      const mostOuProb = Math.max(match.p_over_2_5_fair, match.p_under_2_5_fair);
      const predictionOu = mostOuProb === match.p_over_2_5_fair ? '+2,5 buts' : '-2,5 buts';
      const oddsOu = mostOuProb === match.p_over_2_5_fair ? match.odds_over_2_5 : match.odds_under_2_5;
      
      opportunities.push({
        type: 'OU_NEGATIVE',
        prediction: predictionOu,
        odds: oddsOu || 0,
        reason: [`Vigorish négatif exceptionnel: ${(match.vig_ou_2_5 * 100).toFixed(2)}%`],
        isInverted: false,
        priority: 1
      });
      
      console.log('🎯 OPPORTUNITÉ NÉGATIVE O/U DÉTECTÉE:', predictionOu, 'odds:', oddsOu);
    }
  }

  // === 2. OPPORTUNITÉS À PROBABILITÉ ÉLEVÉE (Priorité 2) ===
  
  // BTTS High Probability (56.5%+)
  if (match.p_btts_yes_fair > 0 && match.p_btts_no_fair > 0 && 
      match.odds_btts_yes && match.odds_btts_no) {
    
    const mostBttsProb = Math.max(match.p_btts_yes_fair, match.p_btts_no_fair);
    
    if (mostBttsProb >= HIGH_PROB_THRESHOLD) {
      const predictionBtts = mostBttsProb === match.p_btts_yes_fair ? 'Oui' : 'Non';
      const oddsBtts = mostBttsProb === match.p_btts_yes_fair ? match.odds_btts_yes : match.odds_btts_no;
      
      opportunities.push({
        type: 'BTTS',
        prediction: predictionBtts,
        odds: oddsBtts,
        reason: [`Probabilité élevée: ${(mostBttsProb * 100).toFixed(1)}%`],
        isInverted: false,
        priority: 2
      });
      
      console.log('🎯 BTTS HAUTE PROBABILITÉ:', predictionBtts, mostBttsProb.toFixed(3), 'odds:', oddsBtts);
    }
  }
  
  // O/U 2.5 High Probability (56.5%+)
  const mostOuProb = Math.max(match.p_over_2_5_fair, match.p_under_2_5_fair);
  
  if (mostOuProb >= HIGH_PROB_THRESHOLD) {
    const predictionOu = mostOuProb === match.p_over_2_5_fair ? '+2,5 buts' : '-2,5 buts';
    const oddsOu = mostOuProb === match.p_over_2_5_fair ? match.odds_over_2_5 : match.odds_under_2_5;
    
    opportunities.push({
      type: 'O/U 2.5',
      prediction: predictionOu,
      odds: oddsOu || 0,
      reason: [`Probabilité élevée: ${(mostOuProb * 100).toFixed(1)}%`],
      isInverted: false,
      priority: 2
    });
    
    console.log('🎯 O/U HAUTE PROBABILITÉ:', predictionOu, mostOuProb.toFixed(3), 'odds:', oddsOu);
  }

  // === 3. OPPORTUNITÉS D'INVERSION (Priorité 3) ===
  
  // BTTS Inversion (vigorish élevé + probabilité modérée)
  if (match.vig_btts && match.vig_btts >= HIGH_VIG_THRESHOLD && 
      match.p_btts_yes_fair > 0 && match.p_btts_no_fair > 0 && 
      match.odds_btts_yes && match.odds_btts_no) {
    
    const mostBttsProb = Math.max(match.p_btts_yes_fair, match.p_btts_no_fair);
    
    // Seulement si probabilité < 60% (possibilité d'inversion)
    if (mostBttsProb < 0.6) {
      const leastBttsProb = Math.min(match.p_btts_yes_fair, match.p_btts_no_fair);
      const invertedPrediction = leastBttsProb === match.p_btts_yes_fair ? 'Oui' : 'Non';
      const invertedOdds = leastBttsProb === match.p_btts_yes_fair ? match.odds_btts_yes : match.odds_btts_no;
      
      opportunities.push({
        type: 'BTTS',
        prediction: invertedPrediction,
        odds: invertedOdds,
        reason: [
          `Inversion détectée - Vigorish élevé: ${(match.vig_btts * 100).toFixed(1)}%`,
          `Probabilité inversée: ${(leastBttsProb * 100).toFixed(1)}%`
        ],
        isInverted: true,
        priority: 3
      });
      
      console.log('🔄 BTTS INVERSION:', invertedPrediction, 'prob inversée:', leastBttsProb.toFixed(3));
    }
  }
  
  // O/U 2.5 Inversion
  if (match.vig_ou_2_5 >= HIGH_VIG_THRESHOLD) {
    const mostOuProb = Math.max(match.p_over_2_5_fair, match.p_under_2_5_fair);
    
    // Seulement si probabilité < 60%
    if (mostOuProb < 0.6) {
      const leastOuProb = Math.min(match.p_over_2_5_fair, match.p_under_2_5_fair);
      const invertedPrediction = leastOuProb === match.p_over_2_5_fair ? '+2,5 buts' : '-2,5 buts';
      const invertedOdds = leastOuProb === match.p_over_2_5_fair ? match.odds_over_2_5 : match.odds_under_2_5;
      
      opportunities.push({
        type: 'O/U 2.5',
        prediction: invertedPrediction,
        odds: invertedOdds || 0,
        reason: [
          `Inversion détectée - Vigorish élevé: ${(match.vig_ou_2_5 * 100).toFixed(1)}%`,
          `Probabilité inversée: ${(leastOuProb * 100).toFixed(1)}%`
        ],
        isInverted: true,
        priority: 3
      });
      
      console.log('🔄 O/U INVERSION:', invertedPrediction, 'prob inversée:', leastOuProb.toFixed(3));
    }
  }

  // === 4. OPPORTUNITÉS DE MARCHÉ EFFICACE (Priorité 4) ===
  
  // 1X2 Low Vigorish
  if (match.vig_1x2 < LOW_VIG_THRESHOLD) {
    const most1x2Prob = Math.max(match.p_home_fair, match.p_draw_fair, match.p_away_fair);
    let prediction1x2 = '';
    let odds1x2 = 0;
    
    if (most1x2Prob === match.p_home_fair) {
      prediction1x2 = match.home_team;
      odds1x2 = match.odds_home;
    } else if (most1x2Prob === match.p_away_fair) {
      prediction1x2 = match.away_team;
      odds1x2 = match.odds_away;
    } else {
      prediction1x2 = 'Nul';
      odds1x2 = match.odds_draw;
    }
    
    opportunities.push({
      type: '1X2',
      prediction: prediction1x2,
      odds: odds1x2,
      reason: [`Marché efficace - Vigorish bas: ${(match.vig_1x2 * 100).toFixed(1)}%`],
      isInverted: false,
      priority: 4
    });
    
    console.log('🎯 1X2 MARCHÉ EFFICACE:', prediction1x2, 'vig:', match.vig_1x2.toFixed(3));
  }
  
  // BTTS Low Vigorish
  if (match.vig_btts && match.vig_btts < LOW_VIG_THRESHOLD && 
      match.p_btts_yes_fair > 0 && match.p_btts_no_fair > 0 && 
      match.odds_btts_yes && match.odds_btts_no) {
    
    const isBTTSEqual = Math.abs(match.p_btts_yes_fair - match.p_btts_no_fair) <= 0.01;
    
    if (!isBTTSEqual) {
      const mostBttsProb = Math.max(match.p_btts_yes_fair, match.p_btts_no_fair);
      const predictionBtts = mostBttsProb === match.p_btts_yes_fair ? 'Oui' : 'Non';
      const oddsBtts = mostBttsProb === match.p_btts_yes_fair ? match.odds_btts_yes : match.odds_btts_no;
      
      opportunities.push({
        type: 'BTTS',
        prediction: predictionBtts,
        odds: oddsBtts,
        reason: [`Marché efficace - Vigorish bas: ${(match.vig_btts * 100).toFixed(1)}%`],
        isInverted: false,
        priority: 4
      });
      
      console.log('🎯 BTTS MARCHÉ EFFICACE:', predictionBtts, 'vig:', match.vig_btts.toFixed(3));
    }
  }
  
  // O/U 2.5 Low Vigorish
  if (match.vig_ou_2_5 < LOW_VIG_THRESHOLD) {
    const isOUEqual = Math.abs(match.p_over_2_5_fair - match.p_under_2_5_fair) <= 0.01;
    
    if (!isOUEqual) {
      const mostOuProb = Math.max(match.p_over_2_5_fair, match.p_under_2_5_fair);
      const predictionOu = mostOuProb === match.p_over_2_5_fair ? '+2,5 buts' : '-2,5 buts';
      const oddsOu = mostOuProb === match.p_over_2_5_fair ? match.odds_over_2_5 : match.odds_under_2_5;
      
      opportunities.push({
        type: 'O/U 2.5',
        prediction: predictionOu,
        odds: oddsOu || 0,
        reason: [`Marché efficace - Vigorish bas: ${(match.vig_ou_2_5 * 100).toFixed(1)}%`],
        isInverted: false,
        priority: 4
      });
      
      console.log('🎯 O/U MARCHÉ EFFICACE:', predictionOu, 'vig:', match.vig_ou_2_5.toFixed(3));
    }
  }

  // === 5. DOUBLE CHANCE (Priorité 5 - LA PLUS BASSE) ===
  
  // Double Chance seulement si vigorish 1X2 très élevé (≥10%)
  if (match.vig_1x2 >= 0.1) {
    const probHome = match.p_home_fair;
    const probDraw = match.p_draw_fair;
    const probAway = match.p_away_fair;
    
    const outcomes = [
      { label: 'home', prob: probHome },
      { label: 'draw', prob: probDraw },
      { label: 'away', prob: probAway }
    ].sort((a, b) => b.prob - a.prob);
    
    const mostProbableOutcome = outcomes[0].label;
    
    let doubleChancePrediction = '';
    let doubleChanceOdds = 0;
    
    if (mostProbableOutcome === 'home') {
      doubleChancePrediction = 'X2';
      doubleChanceOdds = 1.5; // Estimation
    } else if (mostProbableOutcome === 'draw') {
      doubleChancePrediction = '12';
      doubleChanceOdds = 1.3;
    } else {
      doubleChancePrediction = '1X';
      doubleChanceOdds = 1.4;
    }
    
    opportunities.push({
      type: '1X2',
      prediction: doubleChancePrediction,
      odds: doubleChanceOdds,
      reason: [
        `Double chance recommandée`,
        `Vigorish 1X2 très élevé: ${(match.vig_1x2 * 100).toFixed(1)}%`,
        `Exclut l'outcome le plus probable: ${mostProbableOutcome}`
      ],
      isInverted: false,
      priority: 5 // PRIORITÉ LA PLUS BASSE
    });
    
    console.log('🎯 DOUBLE CHANCE:', doubleChancePrediction, 'exclut:', mostProbableOutcome);
  }

  console.log('🎯 OPPORTUNITÉS DÉTECTÉES:', opportunities.length, opportunities.map(o => `${o.type}:${o.prediction}(P${o.priority})`));
  
  return opportunities;
}

export function prioritizeOpportunitiesByRealProbability(opportunities: DetectedOpportunity[], match: ProcessedMatch): DetectedOpportunity[] {
  console.log('📊 PRIORISATION DES OPPORTUNITÉS:', opportunities.length);
  
  // Trier par priorité croissante (1 = plus haute priorité)
  const sorted = opportunities.sort((a, b) => {
    // D'abord par priorité
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    
    // Ensuite par probabilité réelle (plus élevée en premier)
    const getProbability = (opp: DetectedOpportunity) => {
      if (opp.type === 'BTTS') {
        return opp.prediction === 'Oui' ? match.p_btts_yes_fair : match.p_btts_no_fair;
      } else if (opp.type === 'O/U 2.5') {
        return opp.prediction === '+2,5 buts' ? match.p_over_2_5_fair : match.p_under_2_5_fair;
      } else if (opp.type === '1X2') {
        if (opp.prediction === match.home_team) return match.p_home_fair;
        if (opp.prediction === match.away_team) return match.p_away_fair;
        if (opp.prediction === 'Nul') return match.p_draw_fair;
        // Pour les doubles chances, retourner une probabilité combinée estimée
        if (opp.prediction === 'X2') return match.p_draw_fair + match.p_away_fair;
        if (opp.prediction === '1X') return match.p_home_fair + match.p_draw_fair;
        if (opp.prediction === '12') return match.p_home_fair + match.p_away_fair;
      }
      return 0.5; // fallback
    };
    
    return getProbability(b) - getProbability(a);
  });
  
  console.log('📊 OPPORTUNITÉS TRIÉES:', sorted.map((o, i) => `${i+1}. ${o.type}:${o.prediction}(P${o.priority})`));
  
  return sorted;
}

export function convertOpportunityToAIRecommendation(opportunity: DetectedOpportunity): any {
  return {
    betType: opportunity.type,
    prediction: opportunity.prediction,
    odds: opportunity.odds,
    confidence: opportunity.priority <= 2 ? 'high' : opportunity.priority <= 3 ? 'medium' : 'low',
    isInverted: opportunity.isInverted,
    reason: opportunity.reason
  };
}
