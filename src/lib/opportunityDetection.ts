
import { ProcessedMatch } from '@/types/match';
import { rulesService } from '@/services/rulesService';

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
  
  const opportunities: DetectedOpportunity[] = [];
  
  // Charger les règles configurables depuis la base de données
  const generalRules = await rulesService.getRules();
  const ouRules = await rulesService.getMarketRules('ou');
  const bttsRules = await rulesService.getMarketRules('btts');
  const x12Rules = await rulesService.getMarketRules('1x2');
  
  // Seuils généraux
  const EQUALITY_TOLERANCE = (generalRules.get('equality_tolerance') ?? 1) / 100;
  const MIN_ODDS = generalRules.get('min_odds') ?? 1.5;
  const MIN_PROBABILITY = (generalRules.get('min_probability') ?? 45) / 100;
  
  // Double Chance
  const DOUBLE_CHANCE_ENABLED = (generalRules.get('double_chance_enabled') ?? 1) === 1;
  const DOUBLE_CHANCE_VIG_THRESHOLD = (generalRules.get('double_chance_vigorish_threshold') ?? 10) / 100;
  const DOUBLE_CHANCE_MAX_PROB = (generalRules.get('double_chance_max_probability') ?? 65) / 100;
  
  console.log('🔍 SEUILS CONFIGURABLES:', {
    ouRules,
    bttsRules,
    x12Rules,
    DOUBLE_CHANCE_ENABLED,
    DOUBLE_CHANCE_VIG_THRESHOLD,
    DOUBLE_CHANCE_MAX_PROB
  });

  // === 1. RÈGLE PRIORITAIRE ABSOLUE : Double Chance (X2) ===
  
  if (DOUBLE_CHANCE_ENABLED && match.vig_1x2 >= DOUBLE_CHANCE_VIG_THRESHOLD) {
    const probHome = match.p_home_fair;
    const probDraw = match.p_draw_fair;
    const probAway = match.p_away_fair;
    
    const outcomes = [
      { label: 'home', prob: probHome },
      { label: 'draw', prob: probDraw },
      { label: 'away', prob: probAway }
    ].sort((a, b) => b.prob - a.prob);
    
    const mostProbableOutcome = outcomes[0].label;
    const highestProb = outcomes[0].prob;
    
    // EXCLUSION : la probabilité la plus haute entre 1 X 2 > seuil configuré
    if (highestProb <= DOUBLE_CHANCE_MAX_PROB) {
      let doubleChancePrediction = '';
      let doubleChanceProb = 0;
      
      if (mostProbableOutcome === 'home') {
        doubleChancePrediction = 'X2';
        doubleChanceProb = probDraw + probAway;
      } else if (mostProbableOutcome === 'draw') {
        doubleChancePrediction = '12';
        doubleChanceProb = probHome + probAway;
      } else {
        doubleChancePrediction = '1X';
        doubleChanceProb = probHome + probDraw;
      }
      
      const doubleChanceOdds = 1 / doubleChanceProb;
      
      opportunities.push({
        type: 'Double Chance',
        prediction: doubleChancePrediction,
        odds: doubleChanceOdds,
        reason: [
          `Vigorish 1X2 élevé: ${(match.vig_1x2 * 100).toFixed(1)}%`,
          `Stratégie d'exclusion du plus probable: ${mostProbableOutcome}`
        ],
        isInverted: false,
        priority: 1
      });
      
      console.log('🎲 DOUBLE CHANCE GÉNÉRÉE:', doubleChancePrediction, 'odds:', doubleChanceOdds);
      
      // RETOUR IMMÉDIAT - Double Chance est prioritaire absolu
      return opportunities.filter(opp => opp.odds >= MIN_ODDS);
    } else {
      console.log('❌ DOUBLE CHANCE EXCLUE - Probabilité trop élevée:', (highestProb * 100).toFixed(1), '% >', (DOUBLE_CHANCE_MAX_PROB * 100).toFixed(1), '%');
    }
  }
  
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
      priority: 3
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
        priority: 3
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
        priority: 3
      });
      
      console.log('🎯 OPPORTUNITÉ NÉGATIVE O/U DÉTECTÉE:', predictionOu, 'odds:', oddsOu);
    }
  }

  // === 2. RÈGLE 1 : Opportunités Inversées (Haut Vigorish) ===
  
  // BTTS Inversion
  if (bttsRules.invertedOpportunitiesEnabled && 
      match.vig_btts && match.vig_btts >= bttsRules.highVigorishThreshold / 100 && 
      match.p_btts_yes_fair > 0 && match.p_btts_no_fair > 0 && 
      match.odds_btts_yes && match.odds_btts_no) {
    
    console.log('🔍 ANALYSE BTTS INVERSION:', {
      'vig_btts': match.vig_btts,
      'p_btts_yes_fair': match.p_btts_yes_fair,
      'p_btts_no_fair': match.p_btts_no_fair,
      'seuil_inversion': bttsRules.highProbabilityThreshold / 100
    });
    
    // Vérifier que ce n'est pas une égalité 50/50
    const isBTTSEqual = Math.abs(match.p_btts_yes_fair - match.p_btts_no_fair) <= EQUALITY_TOLERANCE;
    
    if (!isBTTSEqual) {
      const mostBttsProb = Math.max(match.p_btts_yes_fair, match.p_btts_no_fair);
      
      // INVERSION: Si probabilité la plus élevée < seuil configuré, on inverse
      if (mostBttsProb < bttsRules.highProbabilityThreshold / 100) {
        const inversePrediction = mostBttsProb === match.p_btts_yes_fair ? 'Non' : 'Oui';
        const inverseOdds = mostBttsProb === match.p_btts_yes_fair ? match.odds_btts_no : match.odds_btts_yes;
        
        if (inverseOdds >= bttsRules.minOdds) {
          opportunities.push({
            type: 'BTTS',
            prediction: inversePrediction,
            odds: inverseOdds,
            reason: [
              `Inversion stratégique`,
              `Vigorish élevé: ${(match.vig_btts * 100).toFixed(1)}%`,
              `Probabilité max: ${(mostBttsProb * 100).toFixed(1)}% < ${(bttsRules.highProbabilityThreshold).toFixed(1)}%`
            ],
            isInverted: true,
            priority: 2
          });
        }
        
        console.log('🔄 INVERSION BTTS APPLIQUÉE:', inversePrediction, 'odds:', inverseOdds);
      } else {
        console.log('❌ INVERSION BTTS REFUSÉE - Probabilité trop élevée:', (mostBttsProb * 100).toFixed(1), '%');
      }
    } else {
      console.log('🔄 BTTS égalité 50/50 détectée → Exclusion');
    }
  }
  
  // O/U 2.5 Inversion
  if (ouRules.invertedOpportunitiesEnabled && 
      match.vig_ou_2_5 >= ouRules.highVigorishThreshold / 100) {
    console.log('🔍 ANALYSE O/U INVERSION:', {
      'vig_ou_2_5': match.vig_ou_2_5,
      'p_over_2_5_fair': match.p_over_2_5_fair,
      'p_under_2_5_fair': match.p_under_2_5_fair,
      'seuil_inversion': ouRules.highProbabilityThreshold / 100
    });
    
    // Vérifier que ce n'est pas une égalité 50/50
    const isOUEqual = Math.abs(match.p_over_2_5_fair - match.p_under_2_5_fair) <= EQUALITY_TOLERANCE;
    
    if (!isOUEqual) {
      const mostOuProb = Math.max(match.p_over_2_5_fair, match.p_under_2_5_fair);
      
      // INVERSION: Si probabilité la plus élevée < seuil configuré, on inverse
      if (mostOuProb < ouRules.highProbabilityThreshold / 100) {
        const inversePrediction = mostOuProb === match.p_over_2_5_fair ? '-2,5 buts' : '+2,5 buts';
        const inverseOdds = mostOuProb === match.p_over_2_5_fair ? match.odds_under_2_5 : match.odds_over_2_5;
        
        if (inverseOdds >= ouRules.minOdds) {
          opportunities.push({
            type: 'O/U 2.5',
            prediction: inversePrediction,
            odds: inverseOdds,
            reason: [
              `Inversion stratégique`,
              `Vigorish élevé: ${(match.vig_ou_2_5 * 100).toFixed(1)}%`,
              `Probabilité max: ${(mostOuProb * 100).toFixed(1)}% < ${(ouRules.highProbabilityThreshold).toFixed(1)}%`
            ],
            isInverted: true,
            priority: 2
          });
        }
        
        console.log('🔄 INVERSION O/U APPLIQUÉE:', inversePrediction, 'odds:', inverseOdds);
      } else {
        console.log('❌ INVERSION O/U REFUSÉE - Probabilité trop élevée:', (mostOuProb * 100).toFixed(1), '%');
      }
    } else {
      console.log('🔄 O/U égalité 50/50 détectée → Exclusion');
    }
  }

  // === 3. RÈGLE 2 : Recommandations Directes (Faible vigorish) ===
  
  // 1X2 Direct (Faible vigorish)
  if (x12Rules.directRecommendationsEnabled && 
      match.vig_1x2 < x12Rules.lowVigorishThreshold / 100) {
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
    
    if (odds1x2 >= x12Rules.minOdds && most1x2Prob >= x12Rules.minProbability / 100) {
      opportunities.push({
        type: '1X2',
        prediction: prediction1x2,
        odds: odds1x2,
        reason: [`Faible vigorish: ${(match.vig_1x2 * 100).toFixed(1)}%`, `Probabilité élevée: ${(most1x2Prob * 100).toFixed(1)}%`],
        isInverted: false,
        priority: 4
      });
    }
    
    console.log('💰 OPPORTUNITÉ DIRECTE 1X2:', prediction1x2, 'odds:', odds1x2);
  }
  
  // BTTS Direct (Faible vigorish)
  if (bttsRules.directRecommendationsEnabled && 
      match.vig_btts && match.vig_btts < bttsRules.lowVigorishThreshold / 100 && 
      match.p_btts_yes_fair > 0 && match.p_btts_no_fair > 0 && 
      match.odds_btts_yes && match.odds_btts_no) {
    
    // Vérifier que ce n'est pas une égalité 50/50
    const isBTTSEqual = Math.abs(match.p_btts_yes_fair - match.p_btts_no_fair) <= EQUALITY_TOLERANCE;
    
    if (!isBTTSEqual) {
      const mostBttsProb = Math.max(match.p_btts_yes_fair, match.p_btts_no_fair);
      const predictionBtts = mostBttsProb === match.p_btts_yes_fair ? 'Oui' : 'Non';
      const oddsBtts = mostBttsProb === match.p_btts_yes_fair ? match.odds_btts_yes : match.odds_btts_no;
      
      if (oddsBtts >= bttsRules.minOdds && mostBttsProb >= bttsRules.minProbability / 100) {
        opportunities.push({
          type: 'BTTS',
          prediction: predictionBtts,
          odds: oddsBtts,
          reason: [`Faible vigorish: ${(match.vig_btts * 100).toFixed(1)}%`, `Probabilité élevée: ${(mostBttsProb * 100).toFixed(1)}%`],
          isInverted: false,
          priority: 4
        });
      }
      
      console.log('💰 OPPORTUNITÉ DIRECTE BTTS:', predictionBtts, 'odds:', oddsBtts);
    }
  }
  
  // O/U 2.5 Direct (Faible vigorish)
  if (ouRules.directRecommendationsEnabled && 
      match.vig_ou_2_5 < ouRules.lowVigorishThreshold / 100) {
    // Vérifier que ce n'est pas une égalité 50/50
    const isOUEqual = Math.abs(match.p_over_2_5_fair - match.p_under_2_5_fair) <= EQUALITY_TOLERANCE;
    
    if (!isOUEqual) {
      const mostOuProb = Math.max(match.p_over_2_5_fair, match.p_under_2_5_fair);
      const predictionOu = mostOuProb === match.p_over_2_5_fair ? '+2,5 buts' : '-2,5 buts';
      const oddsOu = mostOuProb === match.p_over_2_5_fair ? match.odds_over_2_5 : match.odds_under_2_5;
      
      if (oddsOu >= ouRules.minOdds && mostOuProb >= ouRules.minProbability / 100) {
        opportunities.push({
          type: 'O/U 2.5',
          prediction: predictionOu,
          odds: oddsOu,
          reason: [`Faible vigorish: ${(match.vig_ou_2_5 * 100).toFixed(1)}%`, `Probabilité élevée: ${(mostOuProb * 100).toFixed(1)}%`],
          isInverted: false,
          priority: 4
        });
      }
      
      console.log('💰 OPPORTUNITÉ DIRECTE O/U:', predictionOu, 'odds:', oddsOu);
    }
  }

  // === 4. RÈGLE EXCEPTION : Probabilité Élevée (≥ seuil configuré) ===
  
  // 1X2 Haute Probabilité
  const most1x2Prob = Math.max(match.p_home_fair, match.p_draw_fair, match.p_away_fair);
  if (x12Rules.highProbabilityExceptionEnabled && 
      most1x2Prob >= x12Rules.highProbabilityThreshold / 100) {
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
    
    if (odds1x2 >= x12Rules.minOdds) {
      opportunities.push({
        type: '1X2',
        prediction: prediction1x2,
        odds: odds1x2,
        reason: [`Probabilité élevée: ${(most1x2Prob * 100).toFixed(1)}%`],
        isInverted: false,
        priority: 5
      });
    }
    
    console.log('📈 OPPORTUNITÉ HAUTE PROB 1X2:', prediction1x2, 'odds:', odds1x2);
  }
  
  // BTTS Haute Probabilité
  if (bttsRules.highProbabilityExceptionEnabled && 
      match.p_btts_yes_fair > 0 && match.p_btts_no_fair > 0 && 
      match.odds_btts_yes && match.odds_btts_no) {
    
    // Vérifier que ce n'est pas une égalité 50/50
    const isBTTSEqual = Math.abs(match.p_btts_yes_fair - match.p_btts_no_fair) <= EQUALITY_TOLERANCE;
    
    if (!isBTTSEqual) {
      const mostBttsProb = Math.max(match.p_btts_yes_fair, match.p_btts_no_fair);
      
      if (mostBttsProb >= bttsRules.highProbabilityThreshold / 100) {
        const predictionBtts = mostBttsProb === match.p_btts_yes_fair ? 'Oui' : 'Non';
        const oddsBtts = mostBttsProb === match.p_btts_yes_fair ? match.odds_btts_yes : match.odds_btts_no;
        
        if (oddsBtts >= bttsRules.minOdds) {
          opportunities.push({
            type: 'BTTS',
            prediction: predictionBtts,
            odds: oddsBtts,
            reason: [`Probabilité élevée: ${(mostBttsProb * 100).toFixed(1)}%`],
            isInverted: false,
            priority: 5
          });
        }
        
        console.log('📈 OPPORTUNITÉ HAUTE PROB BTTS:', predictionBtts, 'odds:', oddsBtts);
      }
    }
  }
  
  // O/U 2.5 Haute Probabilité
  const isOUEqual = Math.abs(match.p_over_2_5_fair - match.p_under_2_5_fair) <= EQUALITY_TOLERANCE;
  
  if (ouRules.highProbabilityExceptionEnabled && !isOUEqual) {
    const mostOuProb = Math.max(match.p_over_2_5_fair, match.p_under_2_5_fair);
    
    if (mostOuProb >= ouRules.highProbabilityThreshold / 100) {
      const predictionOu = mostOuProb === match.p_over_2_5_fair ? '+2,5 buts' : '-2,5 buts';
      const oddsOu = mostOuProb === match.p_over_2_5_fair ? match.odds_over_2_5 : match.odds_under_2_5;
      
      if (oddsOu >= ouRules.minOdds) {
        opportunities.push({
          type: 'O/U 2.5',
          prediction: predictionOu,
          odds: oddsOu,
          reason: [`Probabilité élevée: ${(mostOuProb * 100).toFixed(1)}%`],
          isInverted: false,
          priority: 5
        });
      }
      
      console.log('📈 OPPORTUNITÉ HAUTE PROB O/U:', predictionOu, 'odds:', oddsOu);
    }
  }

  // === 5. RÈGLE STANDARD : Logique par Défaut ===
  
  // Évaluer inversions selon seuils configurés
  if (bttsRules.invertedOpportunitiesEnabled && 
      match.vig_btts && match.vig_btts >= bttsRules.highVigorishThreshold / 100 && 
      match.p_btts_yes_fair > 0 && match.p_btts_no_fair > 0 && 
      match.odds_btts_yes && match.odds_btts_no) {
    
    const isBTTSEqual = Math.abs(match.p_btts_yes_fair - match.p_btts_no_fair) <= EQUALITY_TOLERANCE;
    
    if (!isBTTSEqual) {
      const mostBttsProb = Math.max(match.p_btts_yes_fair, match.p_btts_no_fair);
      const inversePrediction = mostBttsProb === match.p_btts_yes_fair ? 'Non' : 'Oui';
      const inverseOdds = mostBttsProb === match.p_btts_yes_fair ? match.odds_btts_no : match.odds_btts_yes;
      
      if (inverseOdds >= bttsRules.minOdds) {
        opportunities.push({
          type: 'BTTS',
          prediction: inversePrediction,
          odds: inverseOdds,
          reason: [
            `Standard - Inversion vigorish élevé`,
            `Vigorish: ${(match.vig_btts * 100).toFixed(1)}%`
          ],
          isInverted: true,
          priority: 6
        });
      }
    }
  }
  
  if (ouRules.invertedOpportunitiesEnabled && 
      match.vig_ou_2_5 >= ouRules.highVigorishThreshold / 100) {
    const isOUEqual = Math.abs(match.p_over_2_5_fair - match.p_under_2_5_fair) <= EQUALITY_TOLERANCE;
    
    if (!isOUEqual) {
      const mostOuProb = Math.max(match.p_over_2_5_fair, match.p_under_2_5_fair);
      const inversePrediction = mostOuProb === match.p_over_2_5_fair ? '-2,5 buts' : '+2,5 buts';
      const inverseOdds = mostOuProb === match.p_over_2_5_fair ? match.odds_under_2_5 : match.odds_over_2_5;
      
      if (inverseOdds >= ouRules.minOdds) {
        opportunities.push({
          type: 'O/U 2.5',
          prediction: inversePrediction,
          odds: inverseOdds,
          reason: [
            `Standard - Inversion vigorish élevé`,
            `Vigorish: ${(match.vig_ou_2_5 * 100).toFixed(1)}%`
          ],
          isInverted: true,
          priority: 6
        });
      }
    }
  }

  // TRI FINAL par priorité (1 = priorité maximale)
  const sortedOpportunities = opportunities.sort((a, b) => a.priority - b.priority);
  
  // DÉDOUBLONNAGE: Éliminer les recommandations identiques (même marché + même prédiction)
  const uniqueOpportunities: DetectedOpportunity[] = [];
  const seenPredictions = new Set<string>();
  
  for (const opp of sortedOpportunities) {
  const normalizedType = opp.type.replace('_NEGATIVE', '').replace('_DIRECT', '');
    const predictionKey = `${normalizedType}|${opp.prediction}`;
    
    if (!seenPredictions.has(predictionKey)) {
      seenPredictions.add(predictionKey);
      uniqueOpportunities.push(opp);
    } else {
      console.log('🚫 DOUBLON ÉLIMINÉ:', opp.type, opp.prediction, 'odds:', opp.odds);
    }
  }
  
  console.log('📊 DÉDOUBLONNAGE:', {
    'opportunités_avant': sortedOpportunities.length,
    'opportunités_après': uniqueOpportunities.length,
    'doublons_éliminés': sortedOpportunities.length - uniqueOpportunities.length
  });
  
  // FILTRAGE FINAL: Supprimer TOUTES les recommandations avec odds < 1.5 (APRÈS le tri par priorité et dédoublonnage)
  const validOpportunities = uniqueOpportunities.filter((opp) => {
    if (opp.odds < MIN_ODDS) {
      console.log('❌ RECOMMANDATION EXCLUE - Odds trop faibles:', opp.odds, 'pour', opp.type, opp.prediction);
      return false;
    }
    return true;
  });
  
  console.log('📊 FILTRAGE PAR COTE MINIMALE (1.5):', {
    'opportunités_avant_filtrage': sortedOpportunities.length,
    'opportunités_après_filtrage': validOpportunities.length,
    'opportunités_filtrées': sortedOpportunities.length - validOpportunities.length
  });
  
  if (validOpportunities.length === 0) {
    console.log('❌ AUCUNE RECOMMANDATION VALIDE - Match exclu du dashboard');
    return [];
  }
  
  console.log('🏆 OPPORTUNITÉS FINALES TRIÉES:', validOpportunities.map((o, i) => 
    `${i+1}. ${o.type}:${o.prediction} (priority:${o.priority}, inverted:${o.isInverted}, odds:${o.odds})`
  ));
  
  return validOpportunities;
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
