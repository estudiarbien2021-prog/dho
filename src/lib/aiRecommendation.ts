import { ProcessedMatch } from '@/types/match';

export interface AIRecommendation {
  betType: string;
  prediction: string;
  odds: number;
  confidence: 'high' | 'medium' | 'low';
  isInverted?: boolean; // Nouvelle propriété pour identifier les recommandations inversées
}

export function generateAIRecommendations(match: ProcessedMatch, marketFilters: string[] = []): AIRecommendation[] {
  // Seuils uniformes pour toute l'application
  const MIN_ODDS = 1.3;
  const MIN_PROBABILITY = 0.45;
  const HIGH_VIG_THRESHOLD = 0.081; // 8.1%
  const HIGH_VIG_1X2_THRESHOLD = 0.10; // 10% pour le vigorish 1x2
  
  const recommendations: AIRecommendation[] = [];
  
  // RÈGLE PRIORITAIRE : Si vigorish 1x2 >= 10%, utiliser l'opportunité détectée
  if (match.vig_1x2 >= HIGH_VIG_1X2_THRESHOLD) {
    const includeBTTS = marketFilters.length === 0 || marketFilters.includes('btts');
    const includeOU = marketFilters.length === 0 || marketFilters.includes('over_under');
    
    // Trouver la meilleure opportunité parmi les marchés disponibles
    const opportunities = [];
    
    if (includeBTTS && match.odds_btts_yes && match.odds_btts_no && match.vig_btts > 0) {
      const bttsYesProb = match.p_btts_yes_fair;
      const bttsNoProb = match.p_btts_no_fair;
      
      if (match.odds_btts_yes >= MIN_ODDS && bttsYesProb >= MIN_PROBABILITY) {
        opportunities.push({
          type: 'BTTS',
          prediction: 'Oui',
          odds: match.odds_btts_yes,
          probability: bttsYesProb,
          vigorish: match.vig_btts,
          comment: `Vigorish 1x2 élevé (${(match.vig_1x2 * 100).toFixed(1)}%) - Opportunité BTTS détectée avec vigorish favorable (${(match.vig_btts * 100).toFixed(1)}%)`
        });
      }
      
      if (match.odds_btts_no >= MIN_ODDS && bttsNoProb >= MIN_PROBABILITY) {
        opportunities.push({
          type: 'BTTS',
          prediction: 'Non',
          odds: match.odds_btts_no,
          probability: bttsNoProb,
          vigorish: match.vig_btts,
          comment: `Vigorish 1x2 élevé (${(match.vig_1x2 * 100).toFixed(1)}%) - Opportunité BTTS détectée avec vigorish favorable (${(match.vig_btts * 100).toFixed(1)}%)`
        });
      }
    }
    
    if (includeOU && match.odds_over_2_5 && match.odds_under_2_5 && match.vig_ou_2_5 > 0) {
      const overProb = match.p_over_2_5_fair;
      const underProb = match.p_under_2_5_fair;
      
      if (match.odds_over_2_5 >= MIN_ODDS && overProb >= MIN_PROBABILITY) {
        opportunities.push({
          type: 'O/U 2.5',
          prediction: '+2,5 buts',
          odds: match.odds_over_2_5,
          probability: overProb,
          vigorish: match.vig_ou_2_5,
          comment: `Vigorish 1x2 élevé (${(match.vig_1x2 * 100).toFixed(1)}%) - Opportunité O/U 2.5 détectée avec vigorish favorable (${(match.vig_ou_2_5 * 100).toFixed(1)}%)`
        });
      }
      
      if (match.odds_under_2_5 >= MIN_ODDS && underProb >= MIN_PROBABILITY) {
        opportunities.push({
          type: 'O/U 2.5',
          prediction: '-2,5 buts',
          odds: match.odds_under_2_5,
          probability: underProb,
          vigorish: match.vig_ou_2_5,
          comment: `Vigorish 1x2 élevé (${(match.vig_1x2 * 100).toFixed(1)}%) - Opportunité O/U 2.5 détectée avec vigorish favorable (${(match.vig_ou_2_5 * 100).toFixed(1)}%)`
        });
      }
    }
    
    if (opportunities.length > 0) {
      // Trier par vigorish le plus faible, puis par probabilité la plus haute
      const bestOpportunity = opportunities.sort((a, b) => {
        if (a.vigorish !== b.vigorish) {
          return a.vigorish - b.vigorish; // Plus faible vigorish d'abord
        }
        return b.probability - a.probability; // Plus haute probabilité ensuite
      })[0];
      
      recommendations.push({
        betType: bestOpportunity.type,
        prediction: bestOpportunity.prediction,
        odds: bestOpportunity.odds,
        confidence: bestOpportunity.probability > 0.6 ? 'high' : bestOpportunity.probability > 0.5 ? 'medium' : 'low',
        isInverted: false
      });
      
      return recommendations;
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
      // Choisir la prédiction BTTS la plus probable directement
      const bttsYesProb = match.p_btts_yes_fair;
      const bttsNoProb = match.p_btts_no_fair;
      const isBttsYesBetter = bttsYesProb > bttsNoProb;
      
      markets.push({
        type: 'BTTS',
        prediction: isBttsYesBetter ? 'Oui' : 'Non',
        odds: isBttsYesBetter ? match.odds_btts_yes! : match.odds_btts_no!,
        probability: Math.max(bttsYesProb, bttsNoProb),
        vigorish: match.vig_btts
      });
    }
    
    if (ouAvailable) {
      // Choisir la prédiction O/U la plus probable directement
      const overProb = match.p_over_2_5_fair;
      const underProb = match.p_under_2_5_fair;
      const isOverBetter = overProb > underProb;
      
      markets.push({
        type: 'O/U 2.5',
        prediction: isOverBetter ? '+2,5 buts' : '-2,5 buts',
        odds: isOverBetter ? match.odds_over_2_5! : match.odds_under_2_5!,
        probability: Math.max(overProb, underProb),
        vigorish: match.vig_ou_2_5
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
        isInverted: false
      });
    });
    
    return recommendations;
  }
  
  // LOGIQUE STANDARD si pas d'exception des 60%
  const availableMarkets = [];
  
  // Évaluer BTTS si les cotes sont disponibles et respectent les filtres
  if (includeBTTS && match.odds_btts_yes && match.odds_btts_no && match.vig_btts > 0) {
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
  
  // Évaluer Over/Under 2.5 si les cotes sont disponibles et respectent les filtres
  if (includeOU && match.odds_over_2_5 && match.odds_under_2_5 && match.vig_ou_2_5 > 0) {
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
  const recommendations = generateAIRecommendations(match, marketFilters);
  return recommendations.length > 0 ? recommendations[0] : null;
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