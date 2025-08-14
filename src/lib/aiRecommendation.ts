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
  
  // Analyser uniquement les marchés BTTS et Over/Under selon les filtres
  const markets = [];

  // Vérifier si les filtres de marchés permettent les marchés BTTS
  const allowBttsYes = marketFilters.length === 0 || marketFilters.includes('btts_yes');
  const allowBttsNo = marketFilters.length === 0 || marketFilters.includes('btts_no');
  const allowOver25 = marketFilters.length === 0 || marketFilters.includes('over25');
  const allowUnder25 = marketFilters.length === 0 || marketFilters.includes('under25');

  // Marché BTTS - évaluer les deux options et garder la meilleure (seulement si on a des données)
  const bttsSuggestions = [];
  
  if (allowBttsYes && match.odds_btts_yes && match.odds_btts_yes >= MIN_ODDS && match.p_btts_yes_fair && match.p_btts_yes_fair > MIN_PROBABILITY) {
    const score = match.p_btts_yes_fair * match.odds_btts_yes * (1 + match.vig_btts);
    bttsSuggestions.push({
      betType: 'BTTS',
      prediction: 'Oui',
      odds: match.odds_btts_yes,
      probability: match.p_btts_yes_fair,
      vigorish: match.vig_btts,
      score,
      confidence: match.p_btts_yes_fair > 0.65 && match.vig_btts > 0.08 ? 'high' : 'medium'
    });
  }
  
  if (allowBttsNo && match.odds_btts_no && match.odds_btts_no >= MIN_ODDS && match.p_btts_no_fair && match.p_btts_no_fair > MIN_PROBABILITY) {
    const score = match.p_btts_no_fair * match.odds_btts_no * (1 + match.vig_btts);
    bttsSuggestions.push({
      betType: 'BTTS',
      prediction: 'Non',
      odds: match.odds_btts_no,
      probability: match.p_btts_no_fair,
      vigorish: match.vig_btts,
      score,
      confidence: match.p_btts_no_fair > 0.65 && match.vig_btts > 0.08 ? 'high' : 'medium'
    });
  }

  // Garder seulement la meilleure option BTTS en priorisant d'abord la probabilité IA
  if (bttsSuggestions.length > 0) {
    const bestBtts = bttsSuggestions.reduce((prev, current) => {
      // PRIORITÉ 1: Respect des probabilités IA - choisir celui avec la plus haute probabilité
      if (Math.abs(current.probability - prev.probability) > 0.01) { // Différence significative
        return current.probability > prev.probability ? current : prev;
      }
      // PRIORITÉ 2: Si probabilités similaires, utiliser le score
      const scoreDifference = Math.abs(current.score - prev.score);
      if (scoreDifference < 0.001) {
        return current.probability > prev.probability ? current : prev;
      }
      return current.score > prev.score ? current : prev;
    });
    markets.push(bestBtts);
  }

  // Marché Over/Under 2.5 - évaluer les deux options et garder la meilleure
  const ouSuggestions = [];
  if (allowOver25 && match.odds_over_2_5 && match.odds_over_2_5 >= MIN_ODDS && match.p_over_2_5_fair > MIN_PROBABILITY) {
    const score = match.p_over_2_5_fair * match.odds_over_2_5 * (1 + match.vig_ou_2_5);
    ouSuggestions.push({
      betType: 'O/U 2.5',
      prediction: '+2,5 buts',
      odds: match.odds_over_2_5,
      probability: match.p_over_2_5_fair,
      vigorish: match.vig_ou_2_5,
      score,
      confidence: match.p_over_2_5_fair > 0.65 && match.vig_ou_2_5 > 0.08 ? 'high' : 'medium'
    });
  }
  
  if (allowUnder25 && match.odds_under_2_5 && match.odds_under_2_5 >= MIN_ODDS && match.p_under_2_5_fair > MIN_PROBABILITY) {
    const score = match.p_under_2_5_fair * match.odds_under_2_5 * (1 + match.vig_ou_2_5);
    ouSuggestions.push({
      betType: 'O/U 2.5',
      prediction: '-2,5 buts',
      odds: match.odds_under_2_5,
      probability: match.p_under_2_5_fair,
      vigorish: match.vig_ou_2_5,
      score,
      confidence: match.p_under_2_5_fair > 0.65 && match.vig_ou_2_5 > 0.08 ? 'high' : 'medium'
    });
  }

  // Garder seulement la meilleure option Over/Under en priorisant d'abord la probabilité IA
  if (ouSuggestions.length > 0) {
    const bestOU = ouSuggestions.reduce((prev, current) => {
      // PRIORITÉ 1: Respect des probabilités IA - choisir celui avec la plus haute probabilité
      if (Math.abs(current.probability - prev.probability) > 0.01) { // Différence significative
        return current.probability > prev.probability ? current : prev;
      }
      // PRIORITÉ 2: Si probabilités similaires, utiliser le score
      return current.score > prev.score ? current : prev;
    });
    markets.push(bestOU);
  }

  // Retourner le marché avec la meilleure cohérence IA (probabilité d'abord, puis score)
  if (markets.length === 0) {
    return null;
  }
  
  const bestMarket = markets.reduce((prev, current) => {
    // PRIORITÉ 1: Respect des probabilités IA - choisir celui avec la plus haute probabilité
    if (Math.abs(current.probability - prev.probability) > 0.01) { // Différence significative
      return current.probability > prev.probability ? current : prev;
    }
    // PRIORITÉ 2: Si probabilités similaires, utiliser le score
    return current.score > prev.score ? current : prev;
  });
  
  return {
    betType: bestMarket.betType,
    prediction: bestMarket.prediction,
    odds: bestMarket.odds,
    confidence: bestMarket.confidence
  };
}