
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
      priority: 4
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
        priority: 4
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
        priority: 4
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
      priority: 5
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
          priority: 5
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
        priority: 5
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
      priority: 1
    });
    
    console.log('🎲 DOUBLE CHANCE GÉNÉRÉE:', doubleChancePrediction, 'odds:', doubleChanceOdds);
  }

  // TRI FINAL par priorité (1 = priorité maximale)
  const sortedOpportunities = opportunities.sort((a, b) => a.priority - b.priority);
  
  // DÉDOUBLONNAGE: Éliminer les recommandations identiques (même marché + même prédiction)
  const uniqueOpportunities: DetectedOpportunity[] = [];
  const seenPredictions = new Set<string>();
  
  for (const opp of sortedOpportunities) {
    // Normaliser le type de marché pour le dédoublonnage
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
    if (opp.odds < 1.5) {
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
