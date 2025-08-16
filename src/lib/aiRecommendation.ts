import { ProcessedMatch } from '@/types/match';

export interface AIRecommendation {
  betType: string;
  prediction: string;
  odds: number;
  confidence: 'high' | 'medium' | 'low';
  isInverted?: boolean; // Nouvelle propriété pour identifier les recommandations inversées
}

// Fonctions utilitaires pour détecter les égalités 50/50
function isOUEqual(match: ProcessedMatch, tolerance: number = 0.01): boolean {
  const overProb = match.p_over_2_5_fair;
  const underProb = match.p_under_2_5_fair;
  return Math.abs(overProb - underProb) <= tolerance;
}

function isBTTSEqual(match: ProcessedMatch, tolerance: number = 0.01): boolean {
  const yesProb = match.p_btts_yes_fair;
  const noProb = match.p_btts_no_fair;
  return Math.abs(yesProb - noProb) <= tolerance;
}

export function generateAIRecommendations(match: ProcessedMatch, marketFilters: string[] = []): AIRecommendation[] {
  console.log(`🔥 DÉBUT generateAIRecommendations pour ${match.home_team} vs ${match.away_team}`);
  
  // VALIDATION STRICTE DES DONNÉES DE BASE - BLOQUE LES RECOMMANDATIONS SI DONNÉES INCOMPLÈTES
  const hasComplete1X2Data = match.odds_home > 0 && match.odds_draw > 0 && match.odds_away > 0 &&
                              match.p_home_fair > 0 && match.p_draw_fair > 0 && match.p_away_fair > 0;
  
  const hasCompleteBTTSData = match.odds_btts_yes && match.odds_btts_no &&
                              match.odds_btts_yes > 0 && match.odds_btts_no > 0 &&
                              match.p_btts_yes_fair > 0 && match.p_btts_no_fair > 0;
  
  const hasCompleteOUData = match.odds_over_2_5 && match.odds_under_2_5 &&
                            match.odds_over_2_5 > 0 && match.odds_under_2_5 > 0 &&
                            match.p_over_2_5_fair > 0 && match.p_under_2_5_fair > 0;
  
  if (!hasComplete1X2Data || !hasCompleteBTTSData || !hasCompleteOUData) {
    console.log(`🚫 RECOMMANDATIONS IA BLOQUÉES - DONNÉES INCOMPLÈTES: ${match.home_team} vs ${match.away_team}`, {
      hasComplete1X2: hasComplete1X2Data,
      hasCompleteBTTS: hasCompleteBTTSData,
      hasCompleteOU: hasCompleteOUData,
      odds_1x2: { home: match.odds_home, draw: match.odds_draw, away: match.odds_away },
      odds_btts: { yes: match.odds_btts_yes, no: match.odds_btts_no },
      odds_ou: { over: match.odds_over_2_5, under: match.odds_under_2_5 },
      probs_1x2: { home: match.p_home_fair, draw: match.p_draw_fair, away: match.p_away_fair },
      probs_btts: { yes: match.p_btts_yes_fair, no: match.p_btts_no_fair },
      probs_ou: { over: match.p_over_2_5_fair, under: match.p_under_2_5_fair }
    });
    return []; // Retourner un tableau vide - AUCUNE RECOMMANDATION
  }
  
  console.log(`✅ DONNÉES COMPLÈTES VALIDÉES: ${match.home_team} vs ${match.away_team} - Génération des recommandations IA autorisée`);
  
  // Seuils uniformes pour toute l'application
  const MIN_ODDS = 1.3;
  const MIN_PROBABILITY = 0.45;
  const HIGH_VIG_THRESHOLD = 0.081; // 8.1%
  const HIGH_VIG_1X2_THRESHOLD = 0.10; // 10% pour le vigorish 1x2
  
  const recommendations: AIRecommendation[] = [];
  
  // DEBUG: Afficher les valeurs de vigorish
  console.log('🔍 DEBUG generateAIRecommendations - Valeurs vigorish:', {
    matchId: match.id,
    homeTeam: match.home_team,
    awayTeam: match.away_team,
    vigBTTS: match.vig_btts,
    vigOU: match.vig_ou_2_5,
    vig1x2: match.vig_1x2,
    highVigThreshold: HIGH_VIG_THRESHOLD,
    highVig1x2Threshold: HIGH_VIG_1X2_THRESHOLD
  });
  
  // RÈGLE PRIORITAIRE 1 : Si vigorish BTTS >= 8.1% OU vigorish O/U >= 8.1%, recommander l'opportunité détectée (inverse)
  // LOGIQUE DE FALLBACK CROISÉE : Exclure les marchés avec égalité 50/50
  const isOUEqualProbs = isOUEqual(match);
  const isBTTSEqualProbs = isBTTSEqual(match);
  
  console.log('🎯 DÉTECTION ÉGALITÉS 50/50:', {
    matchId: match.id,
    homeTeam: match.home_team,
    awayTeam: match.away_team,
    isOUEqual: isOUEqualProbs,
    isBTTSEqual: isBTTSEqualProbs,
    ouProbs: { over: match.p_over_2_5_fair, under: match.p_under_2_5_fair, diff: Math.abs(match.p_over_2_5_fair - match.p_under_2_5_fair) },
    bttsProbs: { yes: match.p_btts_yes_fair, no: match.p_btts_no_fair, diff: Math.abs(match.p_btts_yes_fair - match.p_btts_no_fair) }
  });
  
  if (isOUEqualProbs) {
    console.log('🚨 O/U ÉGALITÉ DÉTECTÉE - DOIT ÊTRE EXCLU!', {
      match: `${match.home_team} vs ${match.away_team}`,
      overProb: match.p_over_2_5_fair,
      underProb: match.p_under_2_5_fair,
      difference: Math.abs(match.p_over_2_5_fair - match.p_under_2_5_fair)
    });
  }
  
  if (isBTTSEqualProbs) {
    console.log('🚨 BTTS ÉGALITÉ DÉTECTÉE - DOIT ÊTRE EXCLU!', {
      match: `${match.home_team} vs ${match.away_team}`,
      yesProb: match.p_btts_yes_fair,
      noProb: match.p_btts_no_fair,
      difference: Math.abs(match.p_btts_yes_fair - match.p_btts_no_fair)
    });
  }
  
  const bttsHighVig = match.vig_btts > 0 && match.vig_btts >= HIGH_VIG_THRESHOLD && 
                      match.odds_btts_yes && match.odds_btts_no && !isBTTSEqualProbs;
  
  const ouHighVig = match.vig_ou_2_5 > 0 && match.vig_ou_2_5 >= HIGH_VIG_THRESHOLD && 
                    match.odds_over_2_5 && match.odds_under_2_5 && !isOUEqualProbs;
  
  // Si O/U est 50/50 mais BTTS éligible, forcer BTTS seulement
  const forceOnlyBTTS = isOUEqualProbs && !isBTTSEqualProbs && match.vig_btts > 0 && match.vig_btts >= HIGH_VIG_THRESHOLD && 
                        match.odds_btts_yes && match.odds_btts_no;
  
  // Si BTTS est 50/50 mais O/U éligible, forcer O/U seulement  
  const forceOnlyOU = isBTTSEqualProbs && !isOUEqualProbs && match.vig_ou_2_5 > 0 && match.vig_ou_2_5 >= HIGH_VIG_THRESHOLD && 
                      match.odds_over_2_5 && match.odds_under_2_5;

  if (bttsHighVig || ouHighVig || forceOnlyBTTS || forceOnlyOU) {
    const candidates = [];
    
    if (isOUEqualProbs && forceOnlyBTTS) {
      console.log('🔀 FALLBACK ACTIVÉ: O/U égalité 50/50 → Fallback sur BTTS uniquement');
    }
    
    if (isBTTSEqualProbs && forceOnlyOU) {
      console.log('🔀 FALLBACK ACTIVÉ: BTTS égalité 50/50 → Fallback sur O/U uniquement');
    }
    
    // Ajouter BTTS inversé si haut vigorish (ou fallback forcé)
    if (bttsHighVig || forceOnlyBTTS) {
      const bttsYesProb = match.p_btts_yes_fair;
      const bttsNoProb = match.p_btts_no_fair;
      
      // Recommander l'inverse de la prédiction la plus probable
      if (bttsYesProb > bttsNoProb && match.odds_btts_no! >= MIN_ODDS && bttsNoProb >= MIN_PROBABILITY) {
        candidates.push({
          type: 'BTTS',
          prediction: 'Non',
          odds: match.odds_btts_no!,
          probability: bttsNoProb,
          vigorish: match.vig_btts,
          isOpportunity: true
        });
      } else if (bttsNoProb > bttsYesProb && match.odds_btts_yes! >= MIN_ODDS && bttsYesProb >= MIN_PROBABILITY) {
        candidates.push({
          type: 'BTTS',
          prediction: 'Oui',
          odds: match.odds_btts_yes!,
          probability: bttsYesProb,
          vigorish: match.vig_btts,
          isOpportunity: true
        });
      }
    }
    
    // Ajouter O/U inversé si haut vigorish (ou fallback forcé)
    if (ouHighVig || forceOnlyOU) {
      const overProb = match.p_over_2_5_fair;
      const underProb = match.p_under_2_5_fair;
      
      // Recommander l'inverse de la prédiction la plus probable
      if (overProb > underProb && match.odds_under_2_5! >= MIN_ODDS && underProb >= MIN_PROBABILITY) {
        candidates.push({
          type: 'O/U 2.5',
          prediction: '-2,5 buts',
          odds: match.odds_under_2_5!,
          probability: underProb,
          vigorish: match.vig_ou_2_5,
          isOpportunity: true
        });
      } else if (underProb > overProb && match.odds_over_2_5! >= MIN_ODDS && overProb >= MIN_PROBABILITY) {
        candidates.push({
          type: 'O/U 2.5',
          prediction: '+2,5 buts',
          odds: match.odds_over_2_5!,
          probability: overProb,
          vigorish: match.vig_ou_2_5,
          isOpportunity: true
        });
      }
    }
    
    // Prendre la meilleure opportunité (plus haut vigorish)
    if (candidates.length > 0) {
      const bestOpportunity = candidates.sort((a, b) => b.vigorish - a.vigorish)[0];
      
      recommendations.push({
        betType: bestOpportunity.type,
        prediction: bestOpportunity.prediction,
        odds: bestOpportunity.odds,
        confidence: bestOpportunity.probability > 0.6 ? 'high' : bestOpportunity.probability > 0.5 ? 'medium' : 'low',
        isInverted: true
      });
      
      return recommendations;
    }
  }
  
  // RÈGLE PRIORITAIRE 2 : Si vigorish BTTS <= 6% OU vigorish O/U <= 6%, recommander la prédiction la plus probable
  // LOGIQUE DE FALLBACK CROISÉE : Exclure les marchés avec égalité 50/50
  const LOW_VIG_THRESHOLD = 0.06; // 6%
  
  // Vérifier si BTTS a un faible vigorish (et n'est pas en égalité 50/50)
  const bttsLowVig = match.vig_btts > 0 && match.vig_btts <= LOW_VIG_THRESHOLD && 
                     match.odds_btts_yes && match.odds_btts_no && !isBTTSEqualProbs;
  
  // Vérifier si O/U 2.5 a un faible vigorish (et n'est pas en égalité 50/50)
  const ouLowVig = match.vig_ou_2_5 > 0 && match.vig_ou_2_5 <= LOW_VIG_THRESHOLD && 
                   match.odds_over_2_5 && match.odds_under_2_5 && !isOUEqualProbs;
  
  // Si O/U est 50/50 mais BTTS éligible pour faible vigorish, forcer BTTS seulement
  const forceOnlyBTTSLowVig = isOUEqualProbs && !isBTTSEqualProbs && match.vig_btts > 0 && match.vig_btts <= LOW_VIG_THRESHOLD && 
                              match.odds_btts_yes && match.odds_btts_no;
  
  // Si BTTS est 50/50 mais O/U éligible pour faible vigorish, forcer O/U seulement  
  const forceOnlyOULowVig = isBTTSEqualProbs && !isOUEqualProbs && match.vig_ou_2_5 > 0 && match.vig_ou_2_5 <= LOW_VIG_THRESHOLD && 
                            match.odds_over_2_5 && match.odds_under_2_5;

  if (bttsLowVig || ouLowVig || forceOnlyBTTSLowVig || forceOnlyOULowVig) {
    const candidates = [];
    
    if (isOUEqualProbs && forceOnlyBTTSLowVig) {
      console.log('🔀 FALLBACK ACTIVÉ (Faible Vig): O/U égalité 50/50 → Fallback sur BTTS uniquement');
    }
    
    if (isBTTSEqualProbs && forceOnlyOULowVig) {
      console.log('🔀 FALLBACK ACTIVÉ (Faible Vig): BTTS égalité 50/50 → Fallback sur O/U uniquement');
    }
    
    // Ajouter BTTS si faible vigorish (ou fallback forcé)
    if (bttsLowVig || forceOnlyBTTSLowVig) {
      const bttsYesProb = match.p_btts_yes_fair;
      const bttsNoProb = match.p_btts_no_fair;
      
      if (bttsYesProb >= MIN_PROBABILITY && match.odds_btts_yes! >= MIN_ODDS) {
        candidates.push({
          type: 'BTTS',
          prediction: 'Oui',
          odds: match.odds_btts_yes!,
          probability: bttsYesProb,
          vigorish: match.vig_btts
        });
      }
      
      if (bttsNoProb >= MIN_PROBABILITY && match.odds_btts_no! >= MIN_ODDS) {
        candidates.push({
          type: 'BTTS',
          prediction: 'Non',
          odds: match.odds_btts_no!,
          probability: bttsNoProb,
          vigorish: match.vig_btts
        });
      }
    }
    
    // Ajouter O/U 2.5 si faible vigorish (ou fallback forcé) ET pas d'égalité 50/50
    if ((ouLowVig || forceOnlyOULowVig) && !isOUEqualProbs) {
      const overProb = match.p_over_2_5_fair;
      const underProb = match.p_under_2_5_fair;
      
      if (overProb >= MIN_PROBABILITY && match.odds_over_2_5! >= MIN_ODDS) {
        candidates.push({
          type: 'O/U 2.5',
          prediction: '+2,5 buts',
          odds: match.odds_over_2_5!,
          probability: overProb,
          vigorish: match.vig_ou_2_5
        });
      }
      
      if (underProb >= MIN_PROBABILITY && match.odds_under_2_5! >= MIN_ODDS) {
        candidates.push({
          type: 'O/U 2.5',
          prediction: '-2,5 buts',
          odds: match.odds_under_2_5!,
          probability: underProb,
          vigorish: match.vig_ou_2_5
        });
      }
    } else if (isOUEqualProbs && (ouLowVig || forceOnlyOULowVig)) {
      console.log('🔄 O/U égalité détectée dans faible vigorish → Exclusion O/U, évaluation BTTS uniquement');
    }
    
    // Prendre la prédiction la plus probable
    if (candidates.length > 0) {
      const bestCandidate = candidates.sort((a, b) => b.probability - a.probability)[0];
      
      recommendations.push({
        betType: bestCandidate.type,
        prediction: bestCandidate.prediction,
        odds: bestCandidate.odds,
        confidence: bestCandidate.probability > 0.6 ? 'high' : bestCandidate.probability > 0.5 ? 'medium' : 'low',
        isInverted: false
      });
      
      return recommendations;
    }
  }
  
  // RÈGLE PRIORITAIRE 2 : Si vigorish 1x2 >= 10%, recommander la double chance (opportunité détectée)
  if (match.vig_1x2 >= HIGH_VIG_1X2_THRESHOLD) {
    console.log('🚨 RÈGLE X2 ACTIVÉE:', {
      'match.vig_1x2': match.vig_1x2,
      'HIGH_VIG_1X2_THRESHOLD': HIGH_VIG_1X2_THRESHOLD,
      'match.odds_home': match.odds_home,
      'match.odds_draw': match.odds_draw,  
      'match.odds_away': match.odds_away
    });
    
    // Calculer les probabilités implicites des cotes 1x2
    const probHome = 1 / match.odds_home;
    const probDraw = 1 / match.odds_draw;
    const probAway = 1 / match.odds_away;
    
    // Créer un tableau des résultats avec leurs probabilités
    const outcomes = [
      { label: match.home_team, prob: probHome, type: 'home' },
      { label: 'Nul', prob: probDraw, type: 'draw' },
      { label: match.away_team, prob: probAway, type: 'away' }
    ];
    
    // Trier par probabilité décroissante (le plus probable en premier)
    outcomes.sort((a, b) => b.prob - a.prob);
    
    console.log('🚨 OUTCOMES TRIÉS:', outcomes);
    
    // Prendre la 2ème et 3ème option pour la double chance (exclure la plus probable)
    const secondChoice = outcomes[1];
    const thirdChoice = outcomes[2];
    
    // Déterminer la combinaison de double chance basée sur la logique d'opportunité détectée
    let doubleChance = '';
    let doubleChanceProb = 0;
    
    if ((secondChoice.type === 'home' && thirdChoice.type === 'draw') || 
        (secondChoice.type === 'draw' && thirdChoice.type === 'home')) {
      doubleChance = '1X';
      doubleChanceProb = match.p_home_fair + match.p_draw_fair;
    } else if ((secondChoice.type === 'home' && thirdChoice.type === 'away') || 
               (secondChoice.type === 'away' && thirdChoice.type === 'home')) {
      doubleChance = '12';
      doubleChanceProb = match.p_home_fair + match.p_away_fair;
    } else if ((secondChoice.type === 'draw' && thirdChoice.type === 'away') || 
               (secondChoice.type === 'away' && thirdChoice.type === 'draw')) {
      doubleChance = 'X2';
      doubleChanceProb = match.p_draw_fair + match.p_away_fair;
    }
    
    // Calculer les cotes de double chance
    const doubleChanceOdds = 1 / doubleChanceProb;
    
    console.log('🚨 DOUBLE CHANCE CALCULÉ:', {
      doubleChance,
      doubleChanceProb,
      doubleChanceOdds,
      'MIN_ODDS': MIN_ODDS,
      'MIN_PROBABILITY': MIN_PROBABILITY,
      'isValid_odds': doubleChanceOdds >= MIN_ODDS,
      'isValid_prob': doubleChanceProb >= MIN_PROBABILITY
    });
    
    // Vérifier si cette opportunité est valide (cote >= 1.3 et probabilité >= 45%)
    if (doubleChanceOdds >= MIN_ODDS && doubleChanceProb >= MIN_PROBABILITY) {
      console.log('🚨 X2 RECOMMENDATION CRÉÉE !');
      recommendations.push({
        betType: 'Double Chance',
        prediction: doubleChance,
        odds: doubleChanceOdds,
        confidence: doubleChanceProb > 0.75 ? 'high' : doubleChanceProb > 0.65 ? 'medium' : 'low',
        isInverted: false
      });
      
      return recommendations;
    } else {
      console.log('🚨 X2 RECOMMENDATION REJETÉE - conditions non remplies');
    }
  }
  
  // EXCEPTION PRIORITAIRE : Si une probabilité >= 60%, choisir le marché avec le vigorish le plus faible
  const includeBTTS = marketFilters.length === 0 || marketFilters.includes('btts');
  const includeOU = marketFilters.length === 0 || marketFilters.includes('over_under');
  
  let bttsAvailable = false;
  let ouAvailable = false;
  let bttsMaxProb = 0;
  let ouMaxProb = 0;
  
  if (includeBTTS && match.odds_btts_yes && match.odds_btts_no && match.vig_btts > 0) {
    bttsMaxProb = Math.max(match.p_btts_yes_fair, match.p_btts_no_fair);
    bttsAvailable = bttsMaxProb >= MIN_PROBABILITY;
  }
  
  if (includeOU && match.odds_over_2_5 && match.odds_under_2_5 && match.vig_ou_2_5 > 0) {
    ouMaxProb = Math.max(match.p_over_2_5_fair, match.p_under_2_5_fair);
    ouAvailable = ouMaxProb >= MIN_PROBABILITY;
  }
  
  // DEBUG: Log des valeurs pour comprendre le problème
  console.log('🔍 DEBUG generateAIRecommendations:', {
    bttsMaxProb,
    ouMaxProb,
    bttsAvailable,
    ouAvailable,
    bttsVigorish: match.vig_btts,
    ouVigorish: match.vig_ou_2_5,
    shouldUseException: (bttsMaxProb >= 0.6 || ouMaxProb >= 0.6) && (bttsAvailable || ouAvailable)
  });

  // Si une des probabilités >= 60%, appliquer l'exception
  if ((bttsMaxProb >= 0.6 || ouMaxProb >= 0.6) && (bttsAvailable || ouAvailable)) {
    const markets = [];
    
    if (bttsAvailable) {
      // Vérifier si BTTS doit être inversé (vigorish >= 8.1% ET probabilité max < 60%)
      const bttsYesProb = match.p_btts_yes_fair;
      const bttsNoProb = match.p_btts_no_fair;
      const isBttsYesBetter = bttsYesProb > bttsNoProb;
      const shouldInvertBTTS = match.vig_btts >= HIGH_VIG_THRESHOLD && bttsMaxProb < 0.6;
      
      // Appliquer l'inversion si nécessaire
      const finalBttsPrediction = shouldInvertBTTS ? 
        (isBttsYesBetter ? 'Non' : 'Oui') : 
        (isBttsYesBetter ? 'Oui' : 'Non');
      
      const finalBttsOdds = shouldInvertBTTS ?
        (isBttsYesBetter ? match.odds_btts_no! : match.odds_btts_yes!) :
        (isBttsYesBetter ? match.odds_btts_yes! : match.odds_btts_no!);
      
      const finalBttsProb = shouldInvertBTTS ?
        (isBttsYesBetter ? bttsNoProb : bttsYesProb) :
        Math.max(bttsYesProb, bttsNoProb);
      
      markets.push({
        type: 'BTTS',
        prediction: finalBttsPrediction,
        odds: finalBttsOdds,
        probability: finalBttsProb,
        vigorish: match.vig_btts,
        isInverted: shouldInvertBTTS
      });
    }
    
    if (ouAvailable) {
      // Vérifier si O/U doit être inversé (vigorish >= 8.1% ET probabilité max < 60%)
      const overProb = match.p_over_2_5_fair;
      const underProb = match.p_under_2_5_fair;
      const isOverBetter = overProb > underProb;
      const shouldInvertOU = match.vig_ou_2_5 >= HIGH_VIG_THRESHOLD && ouMaxProb < 0.6;
      
      // Appliquer l'inversion si nécessaire
      const finalOuPrediction = shouldInvertOU ?
        (isOverBetter ? '-2,5 buts' : '+2,5 buts') :
        (isOverBetter ? '+2,5 buts' : '-2,5 buts');
      
      const finalOuOdds = shouldInvertOU ?
        (isOverBetter ? match.odds_under_2_5! : match.odds_over_2_5!) :
        (isOverBetter ? match.odds_over_2_5! : match.odds_under_2_5!);
      
      const finalOuProb = shouldInvertOU ?
        (isOverBetter ? underProb : overProb) :
        Math.max(overProb, underProb);
      
      markets.push({
        type: 'O/U 2.5',
        prediction: finalOuPrediction,
        odds: finalOuOdds,
        probability: finalOuProb,
        vigorish: match.vig_ou_2_5,
        isInverted: shouldInvertOU
      });
    }
    
    // Trier par vigorish le plus faible, puis par probabilité la plus haute
    const sortedMarkets = markets.sort((a, b) => {
      if (a.vigorish !== b.vigorish) {
        return a.vigorish - b.vigorish; // Plus faible vigorish d'abord
      }
      return b.probability - a.probability; // Plus haute probabilité ensuite
    });
    
    // Ajouter les recommandations triées
    sortedMarkets.forEach(market => {
      recommendations.push({
        betType: market.type,
        prediction: market.prediction,
        odds: market.odds,
        confidence: market.probability > 0.6 ? 'high' : market.probability > 0.5 ? 'medium' : 'low',
        isInverted: market.isInverted || false
      });
    });
    
    return recommendations;
  }
  
  // LOGIQUE STANDARD si pas d'exception des 60%
  // LOGIQUE DE FALLBACK CROISÉE : Exclure les marchés avec égalité 50/50
  const availableMarkets = [];
  
  // Évaluer BTTS si les cotes sont disponibles et respectent les filtres (et pas d'égalité 50/50)
  if (includeBTTS && match.odds_btts_yes && match.odds_btts_no && match.vig_btts > 0 && !isBTTSEqualProbs) {
    const bttsYesProb = match.p_btts_yes_fair;
    const bttsNoProb = match.p_btts_no_fair;
    const highestBTTSProb = Math.max(bttsYesProb, bttsNoProb);
    
    // NOUVELLE RÈGLE : Si vigorish BTTS >= 8.1%, proposer l'inverse
    const isHighVigBTTS = match.vig_btts >= HIGH_VIG_THRESHOLD;
    const shouldInvertBTTS = isHighVigBTTS && highestBTTSProb < 0.6;
    
    // Choisir la meilleure option BTTS basée sur les probabilités (pour la recommandation)
    let bestBTTS = null;
    if (match.odds_btts_yes >= MIN_ODDS && bttsYesProb >= MIN_PROBABILITY) {
      bestBTTS = {
        type: 'BTTS',
        originalPrediction: 'Oui',
        prediction: shouldInvertBTTS ? 'Non' : 'Oui',
        odds: shouldInvertBTTS ? match.odds_btts_no : match.odds_btts_yes,
        probability: shouldInvertBTTS ? bttsNoProb : bttsYesProb,
        vigorish: match.vig_btts,
        isInverted: shouldInvertBTTS
      };
    }
    
    if (match.odds_btts_no >= MIN_ODDS && bttsNoProb >= MIN_PROBABILITY) {
      if (!bestBTTS || bttsNoProb > bestBTTS.probability) {
        bestBTTS = {
          type: 'BTTS',
          originalPrediction: 'Non',
          prediction: shouldInvertBTTS ? 'Oui' : 'Non',
          odds: shouldInvertBTTS ? match.odds_btts_yes : match.odds_btts_no,
          probability: shouldInvertBTTS ? bttsYesProb : bttsNoProb,
          vigorish: match.vig_btts,
          isInverted: shouldInvertBTTS
        };
      }
    }
    
    if (bestBTTS) {
      availableMarkets.push(bestBTTS);
    }
  }
  
  // Évaluer Over/Under 2.5 si les cotes sont disponibles et respectent les filtres (et pas d'égalité 50/50)
  if (includeOU && match.odds_over_2_5 && match.odds_under_2_5 && match.vig_ou_2_5 > 0 && !isOUEqualProbs) {
    const overProb = match.p_over_2_5_fair;
    const underProb = match.p_under_2_5_fair;
    const highestOUProb = Math.max(overProb, underProb);
    
    // NOUVELLE RÈGLE : Si vigorish O/U 2.5 >= 8.1%, proposer l'inverse
    const isHighVigOU = match.vig_ou_2_5 >= HIGH_VIG_THRESHOLD;
    const shouldInvertOU = isHighVigOU && highestOUProb < 0.6;
    
    // Choisir la meilleure option O/U 2.5 basée sur les probabilités (pour la recommandation)
    let bestOU = null;
    if (match.odds_over_2_5 >= MIN_ODDS && overProb >= MIN_PROBABILITY) {
      bestOU = {
        type: 'O/U 2.5',
        originalPrediction: '+2,5 buts',
        prediction: shouldInvertOU ? '-2,5 buts' : '+2,5 buts',
        odds: shouldInvertOU ? match.odds_under_2_5 : match.odds_over_2_5,
        probability: shouldInvertOU ? underProb : overProb,
        vigorish: match.vig_ou_2_5,
        isInverted: shouldInvertOU
      };
    }
    
    if (match.odds_under_2_5 >= MIN_ODDS && underProb >= MIN_PROBABILITY) {
      if (!bestOU || underProb > bestOU.probability) {
        bestOU = {
          type: 'O/U 2.5',
          originalPrediction: '-2,5 buts',
          prediction: shouldInvertOU ? '+2,5 buts' : '-2,5 buts',
          odds: shouldInvertOU ? match.odds_over_2_5 : match.odds_under_2_5,
          probability: shouldInvertOU ? overProb : underProb,
          vigorish: match.vig_ou_2_5,
          isInverted: shouldInvertOU
        };
      }
    }
    
    if (bestOU) {
      availableMarkets.push(bestOU);
    }
  }
  
  // FALLBACK FORCÉ : Si un marché est exclu à cause d'égalité 50/50, forcer l'autre marché
  if (isOUEqualProbs && !isBTTSEqualProbs && includeBTTS && match.odds_btts_yes && match.odds_btts_no && match.vig_btts > 0) {
    console.log('🔀 FALLBACK STANDARD ACTIVÉ: O/U égalité 50/50 → Fallback sur BTTS uniquement');
    
    const bttsYesProb = match.p_btts_yes_fair;
    const bttsNoProb = match.p_btts_no_fair;
    const highestBTTSProb = Math.max(bttsYesProb, bttsNoProb);
    
    const isHighVigBTTS = match.vig_btts >= HIGH_VIG_THRESHOLD;
    const shouldInvertBTTS = isHighVigBTTS && highestBTTSProb < 0.6;
    
    let fallbackBTTS = null;
    if (match.odds_btts_yes >= MIN_ODDS && bttsYesProb >= MIN_PROBABILITY) {
      fallbackBTTS = {
        type: 'BTTS',
        originalPrediction: 'Oui',
        prediction: shouldInvertBTTS ? 'Non' : 'Oui',
        odds: shouldInvertBTTS ? match.odds_btts_no : match.odds_btts_yes,
        probability: shouldInvertBTTS ? bttsNoProb : bttsYesProb,
        vigorish: match.vig_btts,
        isInverted: shouldInvertBTTS
      };
    }
    
    if (match.odds_btts_no >= MIN_ODDS && bttsNoProb >= MIN_PROBABILITY) {
      if (!fallbackBTTS || bttsNoProb > fallbackBTTS.probability) {
        fallbackBTTS = {
          type: 'BTTS',
          originalPrediction: 'Non',
          prediction: shouldInvertBTTS ? 'Oui' : 'Non',
          odds: shouldInvertBTTS ? match.odds_btts_yes : match.odds_btts_no,
          probability: shouldInvertBTTS ? bttsYesProb : bttsNoProb,
          vigorish: match.vig_btts,
          isInverted: shouldInvertBTTS
        };
      }
    }
    
    if (fallbackBTTS) {
      availableMarkets.push(fallbackBTTS);
    }
  }
  
  if (isBTTSEqualProbs && !isOUEqualProbs && includeOU && match.odds_over_2_5 && match.odds_under_2_5 && match.vig_ou_2_5 > 0) {
    console.log('🔀 FALLBACK STANDARD ACTIVÉ: BTTS égalité 50/50 → Fallback sur O/U uniquement');
    
    const overProb = match.p_over_2_5_fair;
    const underProb = match.p_under_2_5_fair;
    const highestOUProb = Math.max(overProb, underProb);
    
    const isHighVigOU = match.vig_ou_2_5 >= HIGH_VIG_THRESHOLD;
    const shouldInvertOU = isHighVigOU && highestOUProb < 0.6;
    
    let fallbackOU = null;
    if (match.odds_over_2_5 >= MIN_ODDS && overProb >= MIN_PROBABILITY) {
      fallbackOU = {
        type: 'O/U 2.5',
        originalPrediction: '+2,5 buts',
        prediction: shouldInvertOU ? '-2,5 buts' : '+2,5 buts',
        odds: shouldInvertOU ? match.odds_under_2_5 : match.odds_over_2_5,
        probability: shouldInvertOU ? underProb : overProb,
        vigorish: match.vig_ou_2_5,
        isInverted: shouldInvertOU
      };
    }
    
    if (match.odds_under_2_5 >= MIN_ODDS && underProb >= MIN_PROBABILITY) {
      if (!fallbackOU || underProb > fallbackOU.probability) {
        fallbackOU = {
          type: 'O/U 2.5',
          originalPrediction: '-2,5 buts',
          prediction: shouldInvertOU ? '+2,5 buts' : '-2,5 buts',
          odds: shouldInvertOU ? match.odds_over_2_5 : match.odds_under_2_5,
          probability: shouldInvertOU ? overProb : underProb,
          vigorish: match.vig_ou_2_5,
          isInverted: shouldInvertOU
        };
      }
    }
    
    if (fallbackOU) {
      availableMarkets.push(fallbackOU);
    }
  }
  
  // Si les deux marchés sont en égalité 50/50, ne générer aucune recommandation
  if (isOUEqualProbs && isBTTSEqualProbs) {
    console.log('⚠️  DOUBLE ÉGALITÉ 50/50: O/U et BTTS → Aucune recommandation générée');
    return [];
  }
  
  if (availableMarkets.length === 0) {
    return [];
  }
  
  // Logique standard pour les cas non couverts par l'exception des 60%
  const bttsMarket = availableMarkets.find(m => m.type === 'BTTS');
  const ouMarket = availableMarkets.find(m => m.type === 'O/U 2.5');
  
  // Si BTTS est inversé et O/U disponible, ou si O/U est inversé et BTTS disponible
  if ((bttsMarket?.isInverted && ouMarket) || (ouMarket?.isInverted && bttsMarket)) {
    const invertedMarket = bttsMarket?.isInverted ? bttsMarket : ouMarket;
    const normalMarket = bttsMarket?.isInverted ? ouMarket : bttsMarket;
    
    if (invertedMarket) {
      recommendations.push({
        betType: invertedMarket.type,
        prediction: invertedMarket.prediction,
        odds: invertedMarket.odds,
        confidence: invertedMarket.probability > 0.6 ? 'high' : invertedMarket.probability > 0.5 ? 'medium' : 'low',
        isInverted: invertedMarket.isInverted
      });
    }
    
    if (normalMarket) {
      recommendations.push({
        betType: normalMarket.type,
        prediction: normalMarket.prediction,
        odds: normalMarket.odds,
        confidence: normalMarket.probability > 0.6 ? 'high' : normalMarket.probability > 0.5 ? 'medium' : 'low',
        isInverted: normalMarket.isInverted || false
      });
    }
    
    return recommendations;
  }
  
  // LOGIQUE STANDARD : Proposer jusqu'à 2 marchés avec les meilleurs vigorish
  const sortedMarkets = availableMarkets.sort((a, b) => b.vigorish - a.vigorish);
  
  // Première recommandation (meilleur vigorish)
  const bestMarket = sortedMarkets[0];
  recommendations.push({
    betType: bestMarket.type,
    prediction: bestMarket.prediction,
    odds: bestMarket.odds,
    confidence: bestMarket.probability > 0.6 ? 'high' : bestMarket.probability > 0.5 ? 'medium' : 'low',
    isInverted: bestMarket.isInverted || false
  });
  
  // Deuxième recommandation si disponible et suffisamment différente
  if (sortedMarkets.length > 1 && sortedMarkets[1].vigorish >= 0.06) {
    const secondBestMarket = sortedMarkets[1];
    recommendations.push({
      betType: secondBestMarket.type,
      prediction: secondBestMarket.prediction,
      odds: secondBestMarket.odds,
      confidence: secondBestMarket.probability > 0.6 ? 'high' : secondBestMarket.probability > 0.5 ? 'medium' : 'low',
      isInverted: secondBestMarket.isInverted || false
    });
  }
  
  return recommendations;
}

// Fonction de compatibilité pour les composants existants
export function generateAIRecommendation(match: ProcessedMatch, marketFilters: string[] = []): AIRecommendation | null {
  // UTILISE LA MÊME VALIDATION STRICTE QUE generateAIRecommendations
  const recommendations = generateAIRecommendations(match, marketFilters);
  
  if (recommendations.length === 0) {
    console.log(`🚫 generateAIRecommendation: Aucune recommandation pour ${match.home_team} vs ${match.away_team} - Données incomplètes ou pas d'opportunités`);
    return null;
  }
  
  console.log(`✅ generateAIRecommendation: Recommandation générée pour ${match.home_team} vs ${match.away_team}:`, recommendations[0]);
  return recommendations[0];
}

// Fonction pour obtenir la prédiction d'analyse (basée sur les probabilités, sans inversion)
export function getAnalysisPrediction(match: ProcessedMatch, market: 'btts' | 'over_under'): string | null {
  if (market === 'btts' && match.odds_btts_yes && match.odds_btts_no) {
    const bttsYesProb = match.p_btts_yes_fair;
    const bttsNoProb = match.p_btts_no_fair;
    return bttsYesProb > bttsNoProb ? 'Oui' : 'Non';
  }
  
  if (market === 'over_under' && match.odds_over_2_5 && match.odds_under_2_5) {
    const overProb = match.p_over_2_5_fair;
    const underProb = match.p_under_2_5_fair;
    return overProb > underProb ? '+2,5 buts' : '-2,5 buts';
  }
  
  return null;
}