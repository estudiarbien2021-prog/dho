import { ProcessedMatch } from '@/types/match';

export interface AIRecommendation {
  betType: string;
  prediction: string;
  odds: number;
  confidence: 'high' | 'medium' | 'low';
}

export function generateAIRecommendation(match: ProcessedMatch, marketFilters: string[] = []): AIRecommendation | null {
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
    
    // NOUVELLE RÈGLE : Si vigorish BTTS >= 8.1%, proposer l'inverse
    const isHighVigBTTS = match.vig_btts >= HIGH_VIG_THRESHOLD;
    
    // Choisir la meilleure option BTTS (Oui ou Non)
    let bestBTTS = null;
    if (match.odds_btts_yes >= MIN_ODDS && bttsYesProb >= MIN_PROBABILITY) {
      bestBTTS = {
        type: 'BTTS',
        prediction: isHighVigBTTS ? 'Non' : 'Oui', // Inverse si vigorish élevé
        odds: isHighVigBTTS ? match.odds_btts_no : match.odds_btts_yes,
        probability: isHighVigBTTS ? bttsNoProb : bttsYesProb,
        vigorish: match.vig_btts,
        isInverted: isHighVigBTTS
      };
    }
    
    if (match.odds_btts_no >= MIN_ODDS && bttsNoProb >= MIN_PROBABILITY) {
      if (!bestBTTS || bttsNoProb > bestBTTS.probability) {
        bestBTTS = {
          type: 'BTTS',
          prediction: isHighVigBTTS ? 'Oui' : 'Non', // Inverse si vigorish élevé
          odds: isHighVigBTTS ? match.odds_btts_yes : match.odds_btts_no,
          probability: isHighVigBTTS ? bttsYesProb : bttsNoProb,
          vigorish: match.vig_btts,
          isInverted: isHighVigBTTS
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
    
    // Choisir la meilleure option O/U 2.5 (Over ou Under)
    let bestOU = null;
    if (match.odds_over_2_5 >= MIN_ODDS && overProb >= MIN_PROBABILITY) {
      bestOU = {
        type: 'O/U 2.5',
        prediction: '+2,5 buts',
        odds: match.odds_over_2_5,
        probability: overProb,
        vigorish: match.vig_ou_2_5
      };
    }
    
    if (match.odds_under_2_5 >= MIN_ODDS && underProb >= MIN_PROBABILITY) {
      if (!bestOU || underProb > bestOU.probability) {
        bestOU = {
          type: 'O/U 2.5',
          prediction: '-2,5 buts',
          odds: match.odds_under_2_5,
          probability: underProb,
          vigorish: match.vig_ou_2_5
        };
      }
    }
    
    if (bestOU) {
      availableMarkets.push(bestOU);
    }
  }
  
  if (availableMarkets.length === 0) {
    return null;
  }
  
  // NOUVELLE RÈGLE : Si vigorish BTTS >= 8.1% et qu'on avait une recommandation BTTS,
  // remplacer par Over/Under si disponible
  const bttsMarket = availableMarkets.find(m => m.type === 'BTTS');
  const ouMarket = availableMarkets.find(m => m.type === 'O/U 2.5');
  
  if (bttsMarket && bttsMarket.isInverted && ouMarket) {
    // Si BTTS a un vigorish élevé (inversé) et qu'on a Over/Under disponible,
    // préférer Over/Under
    return {
      betType: ouMarket.type,
      prediction: ouMarket.prediction,
      odds: ouMarket.odds,
      confidence: ouMarket.probability > 0.6 ? 'high' : ouMarket.probability > 0.5 ? 'medium' : 'low'
    };
  }
  
  // LOGIQUE STANDARD : Choisir le marché avec le vigorish le plus élevé
  const bestMarket = availableMarkets.sort((a, b) => b.vigorish - a.vigorish)[0];
  
  return {
    betType: bestMarket.type,
    prediction: bestMarket.prediction,
    odds: bestMarket.odds,
    confidence: bestMarket.probability > 0.6 ? 'high' : bestMarket.probability > 0.5 ? 'medium' : 'low'
  };
}