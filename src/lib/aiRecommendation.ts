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
  
  const availableMarkets = [];
  
  // Évaluer BTTS si les cotes sont disponibles et respectent les filtres
  const includeBTTS = marketFilters.length === 0 || marketFilters.includes('btts');
  if (includeBTTS && match.odds_btts_yes && match.odds_btts_no && match.vig_btts > 0) {
    const bttsYesProb = match.p_btts_yes_fair;
    const bttsNoProb = match.p_btts_no_fair;
    const highestBTTSProb = Math.max(bttsYesProb, bttsNoProb);
    
    // EXCEPTION : Si la probabilité d'analyse >= 60%, ignorer le vigorish et choisir la plus probable
    const useHighProbabilityException = highestBTTSProb >= 0.6;
    
    // NOUVELLE RÈGLE : Si vigorish BTTS >= 8.1%, proposer l'inverse
    // EXCEPTION : Si la probabilité d'analyse >= 60%, garder la recommandation normale
    const isHighVigBTTS = match.vig_btts >= HIGH_VIG_THRESHOLD;
    const shouldInvertBTTS = isHighVigBTTS && !useHighProbabilityException; // Inverser seulement si < 60%
    
    // Choisir la meilleure option BTTS basée sur les probabilités (pour la recommandation)
    let bestBTTS = null;
    if (match.odds_btts_yes >= MIN_ODDS && bttsYesProb >= MIN_PROBABILITY) {
      bestBTTS = {
        type: 'BTTS',
        originalPrediction: 'Oui', // Prédiction originale basée sur les probabilités
        prediction: shouldInvertBTTS ? 'Non' : 'Oui', // Inverse seulement si conditions remplies
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
          originalPrediction: 'Non', // Prédiction originale basée sur les probabilités
          prediction: shouldInvertBTTS ? 'Oui' : 'Non', // Inverse seulement si conditions remplies
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
  const includeOU = marketFilters.length === 0 || marketFilters.includes('over_under');
  if (includeOU && match.odds_over_2_5 && match.odds_under_2_5 && match.vig_ou_2_5 > 0) {
    const overProb = match.p_over_2_5_fair;
    const underProb = match.p_under_2_5_fair;
    const highestOUProb = Math.max(overProb, underProb);
    
    // EXCEPTION : Si la probabilité d'analyse >= 60%, ignorer le vigorish et choisir la plus probable
    const useHighProbabilityException = highestOUProb >= 0.6;
    
    // NOUVELLE RÈGLE : Si vigorish O/U 2.5 >= 8.1%, proposer l'inverse
    // EXCEPTION : Si la probabilité d'analyse >= 60%, ne pas inverser
    const isHighVigOU = match.vig_ou_2_5 >= HIGH_VIG_THRESHOLD;
    const shouldInvertOU = isHighVigOU && !useHighProbabilityException; // Ne pas inverser si >= 60%
    
    // Choisir la meilleure option O/U 2.5 basée sur les probabilités (pour la recommandation)
    let bestOU = null;
    if (match.odds_over_2_5 >= MIN_ODDS && overProb >= MIN_PROBABILITY) {
      bestOU = {
        type: 'O/U 2.5',
        originalPrediction: '+2,5 buts', // Prédiction originale basée sur les probabilités
        prediction: shouldInvertOU ? '-2,5 buts' : '+2,5 buts', // Inverse seulement si conditions remplies
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
          originalPrediction: '-2,5 buts', // Prédiction originale basée sur les probabilités
          prediction: shouldInvertOU ? '+2,5 buts' : '-2,5 buts', // Inverse seulement si conditions remplies
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
  
  const recommendations: AIRecommendation[] = [];
  
  // NOUVELLE RÈGLE : Si les probabilités >= 60%, choisir la plus probable parmi les vigorish les plus faibles
  const bttsMarket = availableMarkets.find(m => m.type === 'BTTS');
  const ouMarket = availableMarkets.find(m => m.type === 'O/U 2.5');
  
  // Vérifier si on doit appliquer l'exception des 60%
  const bttsMaxProb = bttsMarket ? Math.max(match.p_btts_yes_fair, match.p_btts_no_fair) : 0;
  const ouMaxProb = ouMarket ? Math.max(match.p_over_2_5_fair, match.p_under_2_5_fair) : 0;
  const shouldUseHighProbabilityLogic = bttsMaxProb >= 0.6 || ouMaxProb >= 0.6;
  
  if (shouldUseHighProbabilityLogic) {
    // Comparer les vigorish des MARCHÉS (pas des prédictions individuelles)
    const marketVigorish = [];
    if (bttsMarket) marketVigorish.push({ market: 'BTTS', vigorish: match.vig_btts, items: [bttsMarket] });
    if (ouMarket) marketVigorish.push({ market: 'O/U', vigorish: match.vig_ou_2_5, items: [ouMarket] });
    
    // Trouver le marché avec le vigorish le plus faible
    const bestMarketInfo = marketVigorish.sort((a, b) => a.vigorish - b.vigorish)[0];
    
    if (bestMarketInfo) {
      // Choisir la prédiction la plus probable dans ce marché
      const bestMarket = bestMarketInfo.items[0];
      recommendations.push({
        betType: bestMarket.type,
        prediction: bestMarket.prediction,
        odds: bestMarket.odds,
        confidence: bestMarket.probability > 0.6 ? 'high' : bestMarket.probability > 0.5 ? 'medium' : 'low',
        isInverted: bestMarket.isInverted || false
      });
      
      // Deuxième recommandation du marché suivant si disponible
      const remainingMarkets = marketVigorish.filter(m => m !== bestMarketInfo);
      if (remainingMarkets.length > 0) {
        const secondMarket = remainingMarkets[0].items[0];
        if (secondMarket.probability >= 0.45) {
          recommendations.push({
            betType: secondMarket.type,
            prediction: secondMarket.prediction,
            odds: secondMarket.odds,
            confidence: secondMarket.probability > 0.6 ? 'high' : secondMarket.probability > 0.5 ? 'medium' : 'low',
            isInverted: secondMarket.isInverted || false
          });
        }
      }
    }
    
    return recommendations;
  }
  
  // Si BTTS est inversé et O/U disponible, ou si O/U est inversé et BTTS disponible
  if ((bttsMarket?.isInverted && ouMarket) || (ouMarket?.isInverted && bttsMarket)) {
    // Ajouter le marché inversé en premier
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
  if (sortedMarkets.length > 1 && sortedMarkets[1].vigorish >= 0.06) { // Seuil minimum 6% pour la 2ème recommandation
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