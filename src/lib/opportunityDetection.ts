
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
        type: 'O/U_2.5_NEGATIVE',
        prediction: predictionOu,
        odds: oddsOu,
        reason: [`Vigorish négatif exceptionnel: ${(match.vig_ou_2_5 * 100).toFixed(2)}%`],
        isInverted: false,
        priority: 1
      });
      
      console.log('🎯 OPPORTUNITÉ NÉGATIVE O/U DÉTECTÉE:', predictionOu, 'odds:', oddsOu);
    }
  }

  // === 2. OPPORTUNITÉS D'INVERSION (Vigorish élevé + probabilité < 56.5%) ===
  
  // BTTS Inversion
  if (match.vig_btts && match.vig_btts >= HIGH_VIG_THRESHOLD && 
      match.p_btts_yes_fair > 0 && match.p_btts_no_fair > 0 && 
      match.odds_btts_yes && match.odds_btts_no) {
    
    console.log('🔍 ANALYSE BTTS INVERSION:', {
      'vig_btts': match.vig_btts,
      'p_btts_yes_fair': match.p_btts_yes_fair,
      'p_btts_no_fair': match.p_btts_no_fair,
      'seuil_inversion': HIGH_PROB_THRESHOLD
    });
    
    // Vérifier que ce n'est pas une égalité 50/50
    const isBTTSEqual = Math.abs(match.p_btts_yes_fair - match.p_btts_no_fair) <= 0.01;
    
    if (!isBTTSEqual) {
      const mostBttsProb = Math.max(match.p_btts_yes_fair, match.p_btts_no_fair);
      
      // INVERSION: Si probabilité la plus élevée < 56.5%, on inverse
      if (mostBttsProb < HIGH_PROB_THRESHOLD) {
        const inversePrediction = mostBttsProb === match.p_btts_yes_fair ? 'Non' : 'Oui';
        const inverseOdds = mostBttsProb === match.p_btts_yes_fair ? match.odds_btts_no : match.odds_btts_yes;
        
        opportunities.push({
          type: 'BTTS',
          prediction: inversePrediction,
          odds: inverseOdds,
          reason: [
            `Inversion stratégique`,
            `Vigorish élevé: ${(match.vig_btts * 100).toFixed(1)}%`,
            `Probabilité max: ${(mostBttsProb * 100).toFixed(1)}% < ${(HIGH_PROB_THRESHOLD * 100).toFixed(1)}%`
          ],
          isInverted: true,
          priority: 2
        });
        
        console.log('🔄 INVERSION BTTS APPLIQUÉE:', inversePrediction, 'odds:', inverseOdds);
      } else {
        console.log('❌ INVERSION BTTS REFUSÉE - Probabilité trop élevée:', (mostBttsProb * 100).toFixed(1), '%');
      }
    } else {
      console.log('🔄 BTTS égalité 50/50 détectée → Exclusion');
    }
  }
  
  // O/U 2.5 Inversion
  if (match.vig_ou_2_5 >= HIGH_VIG_THRESHOLD) {
    console.log('🔍 ANALYSE O/U INVERSION:', {
      'vig_ou_2_5': match.vig_ou_2_5,
      'p_over_2_5_fair': match.p_over_2_5_fair,
      'p_under_2_5_fair': match.p_under_2_5_fair,
      'seuil_inversion': HIGH_PROB_THRESHOLD
    });
    
    // Vérifier que ce n'est pas une égalité 50/50
    const isOUEqual = Math.abs(match.p_over_2_5_fair - match.p_under_2_5_fair) <= 0.01;
    
    if (!isOUEqual) {
      const mostOuProb = Math.max(match.p_over_2_5_fair, match.p_under_2_5_fair);
      
      // INVERSION: Si probabilité la plus élevée < 56.5%, on inverse
      if (mostOuProb < HIGH_PROB_THRESHOLD) {
        const inversePrediction = mostOuProb === match.p_over_2_5_fair ? '-2,5 buts' : '+2,5 buts';
        const inverseOdds = mostOuProb === match.p_over_2_5_fair ? match.odds_under_2_5 : match.odds_over_2_5;
        
        opportunities.push({
          type: 'O/U 2.5',
          prediction: inversePrediction,
          odds: inverseOdds,
          reason: [
            `Inversion stratégique`,
            `Vigorish élevé: ${(match.vig_ou_2_5 * 100).toFixed(1)}%`,
            `Probabilité max: ${(mostOuProb * 100).toFixed(1)}% < ${(HIGH_PROB_THRESHOLD * 100).toFixed(1)}%`
          ],
          isInverted: true,
          priority: 2
        });
        
        console.log('🔄 INVERSION O/U APPLIQUÉE:', inversePrediction, 'odds:', inverseOdds);
      } else {
        console.log('❌ INVERSION O/U REFUSÉE - Probabilité trop élevée:', (mostOuProb * 100).toFixed(1), '%');
      }
    } else {
      console.log('🔄 O/U égalité 50/50 détectée → Exclusion');
    }
  }

  // === 3. OPPORTUNITÉS DIRECTES (Faible vigorish) ===
  
  // 1X2 Direct (Faible vigorish)
  if (match.vig_1x2 < LOW_VIG_THRESHOLD) {
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
      type: '1X2',
      prediction: prediction1x2,
      odds: odds1x2,
      reason: [`Faible vigorish: ${(match.vig_1x2 * 100).toFixed(1)}%`, `Probabilité élevée: ${(most1x2Prob * 100).toFixed(1)}%`],
      isInverted: false,
      priority: 3
    });
    
    console.log('💰 OPPORTUNITÉ DIRECTE 1X2:', prediction1x2, 'odds:', odds1x2);
  }
  
  // BTTS Direct (Faible vigorish)
  if (match.vig_btts && match.vig_btts < LOW_VIG_THRESHOLD && 
      match.p_btts_yes_fair > 0 && match.p_btts_no_fair > 0 && 
      match.odds_btts_yes && match.odds_btts_no) {
    
    // Vérifier que ce n'est pas une égalité 50/50
    const isBTTSEqual = Math.abs(match.p_btts_yes_fair - match.p_btts_no_fair) <= 0.01;
    
    if (!isBTTSEqual) {
      const mostBttsProb = Math.max(match.p_btts_yes_fair, match.p_btts_no_fair);
      const predictionBtts = mostBttsProb === match.p_btts_yes_fair ? 'Oui' : 'Non';
      const oddsBtts = mostBttsProb === match.p_btts_yes_fair ? match.odds_btts_yes : match.odds_btts_no;
      
      opportunities.push({
        type: 'BTTS',
        prediction: predictionBtts,
        odds: oddsBtts,
        reason: [`Faible vigorish: ${(match.vig_btts * 100).toFixed(1)}%`, `Probabilité élevée: ${(mostBttsProb * 100).toFixed(1)}%`],
        isInverted: false,
        priority: 3
      });
      
      console.log('💰 OPPORTUNITÉ DIRECTE BTTS:', predictionBtts, 'odds:', oddsBtts);
    }
  }
  
  // O/U 2.5 Direct (Faible vigorish)
  if (match.vig_ou_2_5 < LOW_VIG_THRESHOLD) {
    // Vérifier que ce n'est pas une égalité 50/50
    const isOUEqual = Math.abs(match.p_over_2_5_fair - match.p_under_2_5_fair) <= 0.01;
    
    if (!isOUEqual) {
      const mostOuProb = Math.max(match.p_over_2_5_fair, match.p_under_2_5_fair);
      const predictionOu = mostOuProb === match.p_over_2_5_fair ? '+2,5 buts' : '-2,5 buts';
      const oddsOu = mostOuProb === match.p_over_2_5_fair ? match.odds_over_2_5 : match.odds_under_2_5;
      
      opportunities.push({
        type: 'O/U 2.5',
        prediction: predictionOu,
        odds: oddsOu,
        reason: [`Faible vigorish: ${(match.vig_ou_2_5 * 100).toFixed(1)}%`, `Probabilité élevée: ${(mostOuProb * 100).toFixed(1)}%`],
        isInverted: false,
        priority: 3
      });
      
      console.log('💰 OPPORTUNITÉ DIRECTE O/U:', predictionOu, 'odds:', oddsOu);
    }
  }

  // === 4. OPPORTUNITÉS DE HAUTE PROBABILITÉ ===
  
  // 1X2 Haute Probabilité
  const most1x2Prob = Math.max(match.p_home_fair, match.p_draw_fair, match.p_away_fair);
  if (most1x2Prob >= HIGH_PROB_THRESHOLD) {
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
      type: '1X2',
      prediction: prediction1x2,
      odds: odds1x2,
      reason: [`Probabilité élevée: ${(most1x2Prob * 100).toFixed(1)}%`],
      isInverted: false,
      priority: 4
    });
    
    console.log('📈 OPPORTUNITÉ HAUTE PROB 1X2:', prediction1x2, 'odds:', odds1x2);
  }
  
  // BTTS Haute Probabilité
  if (match.p_btts_yes_fair > 0 && match.p_btts_no_fair > 0 && 
      match.odds_btts_yes && match.odds_btts_no) {
    
    // Vérifier que ce n'est pas une égalité 50/50
    const isBTTSEqual = Math.abs(match.p_btts_yes_fair - match.p_btts_no_fair) <= 0.01;
    
    if (!isBTTSEqual) {
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
          priority: 4
        });
        
        console.log('📈 OPPORTUNITÉ HAUTE PROB BTTS:', predictionBtts, 'odds:', oddsBtts);
      }
    }
  }
  
  // O/U 2.5 Haute Probabilité
  const isOUEqual = Math.abs(match.p_over_2_5_fair - match.p_under_2_5_fair) <= 0.01;
  
  if (!isOUEqual) {
    const mostOuProb = Math.max(match.p_over_2_5_fair, match.p_under_2_5_fair);
    
    if (mostOuProb >= HIGH_PROB_THRESHOLD) {
      const predictionOu = mostOuProb === match.p_over_2_5_fair ? '+2,5 buts' : '-2,5 buts';
      const oddsOu = mostOuProb === match.p_over_2_5_fair ? match.odds_over_2_5 : match.odds_under_2_5;
      
      opportunities.push({
        type: 'O/U 2.5',
        prediction: predictionOu,
        odds: oddsOu,
        reason: [`Probabilité élevée: ${(mostOuProb * 100).toFixed(1)}%`],
        isInverted: false,
        priority: 4
      });
      
      console.log('📈 OPPORTUNITÉ HAUTE PROB O/U:', predictionOu, 'odds:', oddsOu);
    }
  }

  // === 5. DOUBLE CHANCE (Vigorish 1X2 >= 10%) ===
  
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
    let doubleChanceOdds = 1.5; // Odds estimées par défaut
    
    if (mostProbableOutcome === 'home') {
      doubleChancePrediction = 'X2';
    } else if (mostProbableOutcome === 'draw') {
      doubleChancePrediction = '12';
    } else {
      doubleChancePrediction = '1X';
    }
    
    opportunities.push({
      type: 'Double Chance',
      prediction: doubleChancePrediction,
      odds: doubleChanceOdds,
      reason: [
        `Vigorish 1X2 élevé: ${(match.vig_1x2 * 100).toFixed(1)}%`,
        `Stratégie d'exclusion du plus probable: ${mostProbableOutcome}`
      ],
      isInverted: false,
      priority: 5
    });
    
    console.log('🎲 DOUBLE CHANCE GÉNÉRÉE:', doubleChancePrediction, 'odds:', doubleChanceOdds);
  }

  // FILTRAGE FINAL: Supprimer les recommandations principales avec odds < 1.5
  const filteredOpportunities = opportunities.filter((opp, index) => {
    // Si c'est la première opportunité (recommandation principale) et odds < 1.5, on l'exclut
    if (index === 0 && opp.odds < 1.5) {
      console.log('❌ RECOMMANDATION PRINCIPALE EXCLUE - Odds trop faibles:', opp.odds, 'pour', opp.type, opp.prediction);
      return false;
    }
    return true;
  });

  // TRI FINAL par priorité (1 = priorité maximale)
  const sortedOpportunities = filteredOpportunities.sort((a, b) => a.priority - b.priority);
  
  console.log('🏆 OPPORTUNITÉS FINALES TRIÉES:', sortedOpportunities.map((o, i) => 
    `${i+1}. ${o.type}:${o.prediction} (priority:${o.priority}, inverted:${o.isInverted}, odds:${o.odds})`
  ));
  
  return sortedOpportunities;
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
