import { rulesService } from '@/services/rulesService';
import { ProcessedMatch } from '@/types/match';

export interface AIRecommendation {
  prediction: string;
  confidence: number;
  odds: number;
  probability: number;
  vigorish: number;
}

// Fallback constants (used if database is unavailable)
export const MIN_ODDS = 1.5;
export const MIN_PROBABILITY = 45;
export const HIGH_VIGORISH_THRESHOLD = 8.1;
export const LOW_VIGORISH_THRESHOLD = 6;
export const HIGH_PROBABILITY_THRESHOLD = 58;
export const DOUBLE_CHANCE_VIGORISH_THRESHOLD = 10;
export const DOUBLE_CHANCE_MAX_PROBABILITY = 65;
export const EQUALITY_TOLERANCE = 1;
export const MAX_RECOMMENDATIONS = 2;

function isEqual(prob1: number, prob2: number, tolerance: number): boolean {
  return Math.abs(prob1 - prob2) <= tolerance / 100;
}

function createRecommendation(prediction: string, description: string, ...odds: number[]): AIRecommendation {
  const validOdds = odds.filter(o => o > 0);
  const avgOdds = validOdds.length > 1 ? 
    validOdds.reduce((sum, odd) => sum + (1/odd), 0) : 
    1 / validOdds[0];
  
  const finalOdds = validOdds.length > 1 ? 1 / avgOdds : validOdds[0];
  const probability = (1 / finalOdds) * 100;
  
  return {
    prediction: `${prediction} - ${description} @ ${finalOdds.toFixed(2)}`,
    confidence: probability > 70 ? 90 : probability > 60 ? 75 : probability > 50 ? 60 : 45,
    odds: finalOdds,
    probability,
    vigorish: 0
  };
}

function getBTTSRecommendation(match: ProcessedMatch, invert: boolean, minOdds: number, minProb: number, tolerance: number): AIRecommendation | null {
  if (!match.odds_btts_yes || !match.odds_btts_no) return null;
  
  const yesProb = match.p_btts_yes_fair;
  const noProb = match.p_btts_no_fair;
  
  if (isEqual(yesProb, noProb, tolerance)) return null;
  
  let targetProb: number, targetOdds: number, prediction: string;
  
  if (invert) {
    // Recommend inverse of most probable
    if (yesProb > noProb) {
      targetProb = noProb;
      targetOdds = match.odds_btts_no;
      prediction = "BTTS Non";
    } else {
      targetProb = yesProb;
      targetOdds = match.odds_btts_yes;
      prediction = "BTTS Oui";
    }
  } else {
    // Recommend most probable
    if (yesProb > noProb) {
      targetProb = yesProb;
      targetOdds = match.odds_btts_yes;
      prediction = "BTTS Oui";
    } else {
      targetProb = noProb;
      targetOdds = match.odds_btts_no;
      prediction = "BTTS Non";
    }
  }
  
  if (targetOdds < minOdds || targetProb < minProb / 100) return null;
  
  return {
    prediction: `${prediction} @ ${targetOdds.toFixed(2)}`,
    confidence: targetProb > 0.7 ? 90 : targetProb > 0.6 ? 75 : 60,
    odds: targetOdds,
    probability: targetProb * 100,
    vigorish: match.vig_btts
  };
}

function getOURecommendation(match: ProcessedMatch, invert: boolean, minOdds: number, minProb: number, tolerance: number): AIRecommendation | null {
  if (!match.odds_over_2_5 || !match.odds_under_2_5) return null;
  
  const overProb = match.p_over_2_5_fair;
  const underProb = match.p_under_2_5_fair;
  
  if (isEqual(overProb, underProb, tolerance)) return null;
  
  let targetProb: number, targetOdds: number, prediction: string;
  
  if (invert) {
    // Recommend inverse of most probable
    if (overProb > underProb) {
      targetProb = underProb;
      targetOdds = match.odds_under_2_5;
      prediction = "Moins 2.5 buts";
    } else {
      targetProb = overProb;
      targetOdds = match.odds_over_2_5;
      prediction = "Plus 2.5 buts";
    }
  } else {
    // Recommend most probable
    if (overProb > underProb) {
      targetProb = overProb;
      targetOdds = match.odds_over_2_5;
      prediction = "Plus 2.5 buts";
    } else {
      targetProb = underProb;
      targetOdds = match.odds_under_2_5;
      prediction = "Moins 2.5 buts";
    }
  }
  
  if (targetOdds < minOdds || targetProb < minProb / 100) return null;
  
  return {
    prediction: `${prediction} @ ${targetOdds.toFixed(2)}`,
    confidence: targetProb > 0.7 ? 90 : targetProb > 0.6 ? 75 : 60,
    odds: targetOdds,
    probability: targetProb * 100,
    vigorish: match.vig_ou_2_5
  };
}

function getMarketRecommendation(match: ProcessedMatch, marketType: string, invert: boolean): AIRecommendation | null {
  switch (marketType) {
    case 'BTTS_YES':
    case 'BTTS_NO':
      return getBTTSRecommendation(match, invert, 1.5, 45, 1);
    case 'OVER_2_5':
    case 'UNDER_2_5':
      return getOURecommendation(match, invert, 1.5, 45, 1);
    case 'HOME':
      if (match.odds_home >= 1.5 && match.p_home_fair >= 0.45) {
        return {
          prediction: `Victoire ${match.home_team} @ ${match.odds_home.toFixed(2)}`,
          confidence: match.p_home_fair > 0.7 ? 90 : match.p_home_fair > 0.6 ? 75 : 60,
          odds: match.odds_home,
          probability: match.p_home_fair * 100,
          vigorish: match.vig_1x2
        };
      }
      break;
    case 'DRAW':
      if (match.odds_draw && match.odds_draw >= 1.5 && match.p_draw_fair >= 0.45) {
        return {
          prediction: `Match nul @ ${match.odds_draw.toFixed(2)}`,
          confidence: match.p_draw_fair > 0.7 ? 90 : match.p_draw_fair > 0.6 ? 75 : 60,
          odds: match.odds_draw,
          probability: match.p_draw_fair * 100,
          vigorish: match.vig_1x2
        };
      }
      break;
    case 'AWAY':
      if (match.odds_away >= 1.5 && match.p_away_fair >= 0.45) {
        return {
          prediction: `Victoire ${match.away_team} @ ${match.odds_away.toFixed(2)}`,
          confidence: match.p_away_fair > 0.7 ? 90 : match.p_away_fair > 0.6 ? 75 : 60,
          odds: match.odds_away,
          probability: match.p_away_fair * 100,
          vigorish: match.vig_1x2
        };
      }
      break;
  }
  return null;
}

export async function generateAIRecommendationsAsync(matches: ProcessedMatch[]): Promise<ProcessedMatch[]> {
  // Load rules from database
  const rules = await rulesService.getRules();
  
  const minOdds = rules.get('min_odds') ?? MIN_ODDS;
  const minProbability = rules.get('min_probability') ?? MIN_PROBABILITY;
  const highVigorishThreshold = rules.get('high_vigorish_threshold') ?? HIGH_VIGORISH_THRESHOLD;
  const lowVigorishThreshold = rules.get('low_vigorish_threshold') ?? LOW_VIGORISH_THRESHOLD;
  const highProbabilityThreshold = rules.get('high_probability_threshold') ?? HIGH_PROBABILITY_THRESHOLD;
  const doubleChanceVigorishThreshold = rules.get('double_chance_vigorish_threshold') ?? DOUBLE_CHANCE_VIGORISH_THRESHOLD;
  const doubleChanceMaxProbability = rules.get('double_chance_max_probability') ?? DOUBLE_CHANCE_MAX_PROBABILITY;
  const equalityTolerance = rules.get('equality_tolerance') ?? EQUALITY_TOLERANCE;
  const maxRecommendations = rules.get('max_recommendations') ?? MAX_RECOMMENDATIONS;
  
  const doubleChanceEnabled = (rules.get('double_chance_enabled') ?? 1) === 1;
  const invertedOpportunitiesEnabled = (rules.get('inverted_opportunities_enabled') ?? 1) === 1;
  const directRecommendationsEnabled = (rules.get('direct_recommendations_enabled') ?? 1) === 1;
  const highProbabilityExceptionEnabled = (rules.get('high_probability_exception_enabled') ?? 1) === 1;

  const matchesWithRecommendations = matches.map(match => {
    // Validate complete 1X2 data
    if (!match.odds_home || !match.odds_draw || !match.odds_away || 
        !match.p_home_fair || !match.p_draw_fair || !match.p_away_fair) {
      return match; // Return without recommendation
    }

    // RÈGLE PRIORITAIRE ABSOLUE : Double Chance (X2)
    if (doubleChanceEnabled && match.vig_1x2 >= doubleChanceVigorishThreshold) {
      const probabilities = [match.p_home_fair, match.p_draw_fair, match.p_away_fair];
      const maxProb = Math.max(...probabilities);
      
      // Exclusions : probabilité max > 65%
      if (maxProb <= doubleChanceMaxProbability / 100) {
        const maxIndex = probabilities.indexOf(maxProb);
        
        let recommendation: AIRecommendation;
        if (maxIndex === 0) { // Home most probable
          recommendation = createRecommendation('X2', 'Nul ou Extérieur', match.odds_draw || 0, match.odds_away);
        } else if (maxIndex === 1) { // Draw most probable  
          recommendation = createRecommendation('12', 'Domicile ou Extérieur', match.odds_home, match.odds_away);
        } else { // Away most probable
          recommendation = createRecommendation('1X', 'Domicile ou Nul', match.odds_home, match.odds_draw || 0);
        }
        
        if (recommendation.odds >= minOdds) {
          return { ...match, ai_prediction: recommendation.prediction, ai_confidence: recommendation.confidence };
        }
      }
    }

    // RÈGLE 1 : Opportunités Inversées (Haut Vigorish)
    if (invertedOpportunitiesEnabled && (match.vig_btts >= highVigorishThreshold || match.vig_ou_2_5 >= highVigorishThreshold)) {
      const bttsRecommendation = getBTTSRecommendation(match, true, minOdds, minProbability, equalityTolerance);
      const ouRecommendation = getOURecommendation(match, true, minOdds, minProbability, equalityTolerance);
      
      const validRecommendations = [bttsRecommendation, ouRecommendation].filter(Boolean) as AIRecommendation[];
      
      if (validRecommendations.length > 0) {
        const bestRecommendation = validRecommendations.sort((a, b) => b.vigorish - a.vigorish)[0];
        return { ...match, ai_prediction: bestRecommendation.prediction, ai_confidence: bestRecommendation.confidence };
      }
    }

    // RÈGLE 2 : Recommandations Directes (Faible Vigorish)
    if (directRecommendationsEnabled && (match.vig_btts <= lowVigorishThreshold || match.vig_ou_2_5 <= lowVigorishThreshold)) {
      const bttsRecommendation = getBTTSRecommendation(match, false, minOdds, minProbability, equalityTolerance);
      const ouRecommendation = getOURecommendation(match, false, minOdds, minProbability, equalityTolerance);
      
      const validRecommendations = [bttsRecommendation, ouRecommendation].filter(Boolean) as AIRecommendation[];
      
      if (validRecommendations.length > 0) {
        const bestRecommendation = validRecommendations.sort((a, b) => b.probability - a.probability)[0];
        return { ...match, ai_prediction: bestRecommendation.prediction, ai_confidence: bestRecommendation.confidence };
      }
    }

    // RÈGLE EXCEPTION : Probabilité Élevée (≥ 58%)
    if (highProbabilityExceptionEnabled) {
      const highProbMarkets = [
        { type: 'BTTS_YES', prob: match.p_btts_yes_fair, vig: match.vig_btts },
        { type: 'BTTS_NO', prob: match.p_btts_no_fair, vig: match.vig_btts },
        { type: 'OVER_2_5', prob: match.p_over_2_5_fair, vig: match.vig_ou_2_5 },
        { type: 'UNDER_2_5', prob: match.p_under_2_5_fair, vig: match.vig_ou_2_5 },
        { type: 'HOME', prob: match.p_home_fair, vig: match.vig_1x2 },
        { type: 'DRAW', prob: match.p_draw_fair, vig: match.vig_1x2 },
        { type: 'AWAY', prob: match.p_away_fair, vig: match.vig_1x2 }
      ].filter(market => market.prob >= highProbabilityThreshold / 100);

      if (highProbMarkets.length > 0) {
        const bestMarket = highProbMarkets.sort((a, b) => a.vig - b.vig)[0];
        
        // Logique d'inversion : Si vigorish ≥ 8.1% ET probabilité < 58%, inverser
        const shouldInvert = bestMarket.vig >= highVigorishThreshold && bestMarket.prob < highProbabilityThreshold / 100;
        
        const recommendation = getMarketRecommendation(match, bestMarket.type, shouldInvert);
        if (recommendation && recommendation.odds >= minOdds && recommendation.probability >= minProbability) {
          return { ...match, ai_prediction: recommendation.prediction, ai_confidence: recommendation.confidence };
        }
      }
    }

    // RÈGLE STANDARD : Logique par Défaut
    const availableMarkets = [
      { type: 'BTTS_YES', prob: match.p_btts_yes_fair, vig: match.vig_btts },
      { type: 'BTTS_NO', prob: match.p_btts_no_fair, vig: match.vig_btts },
      { type: 'OVER_2_5', prob: match.p_over_2_5_fair, vig: match.vig_ou_2_5 },
      { type: 'UNDER_2_5', prob: match.p_under_2_5_fair, vig: match.vig_ou_2_5 }
    ].filter(market => market.prob >= minProbability / 100);

    // Évaluer les inversions selon vigorish ≥ 8.1%
    const recommendationsWithInversion = availableMarkets.map(market => {
      const shouldInvert = market.vig >= highVigorishThreshold;
      return getMarketRecommendation(match, market.type, shouldInvert);
    }).filter(rec => rec && rec.odds >= minOdds && rec.probability >= minProbability) as AIRecommendation[];

    // Trier par vigorish décroissant, proposer jusqu'à 2 recommandations
    const sortedRecommendations = recommendationsWithInversion
      .sort((a, b) => b.vigorish - a.vigorish)
      .slice(0, maxRecommendations);

    if (sortedRecommendations.length > 0) {
      const bestRecommendation = sortedRecommendations[0];
      return { ...match, ai_prediction: bestRecommendation.prediction, ai_confidence: bestRecommendation.confidence };
    }

    return match; // Return without recommendation
  });

  return matchesWithRecommendations.filter(match => {
    if (!match.ai_prediction) return false;
    
    // Extraire les odds de la prédiction pour vérification finale
    const predictionParts = match.ai_prediction.split(' - ');
    if (predictionParts.length < 2) return false;
    
    const oddsMatch = predictionParts[1].match(/(\d+\.?\d*)/);
    if (!oddsMatch) return false;
    
    const odds = parseFloat(oddsMatch[1]);
    return odds >= minOdds;
  });
}

// Legacy compatibility function for single match processing
export function generateAIRecommendation(match: ProcessedMatch, marketFilters: string[] = []): AIRecommendation | null {
  // Validate complete 1X2 data
  if (!match.odds_home || !match.odds_draw || !match.odds_away || 
      !match.p_home_fair || !match.p_draw_fair || !match.p_away_fair) {
    return null;
  }

  // Use hardcoded values for legacy compatibility
  const minOdds = 1.5;
  const minProbability = 45;
  const highVigorishThreshold = 8.1;
  const lowVigorishThreshold = 6;
  const equalityTolerance = 1;

  // Try BTTS first
  if (match.odds_btts_yes && match.odds_btts_no) {
    const yesProb = match.p_btts_yes_fair;
    const noProb = match.p_btts_no_fair;
    
    if (!isEqual(yesProb, noProb, equalityTolerance)) {
      const isHighVig = match.vig_btts >= highVigorishThreshold;
      const recommendation = getBTTSRecommendation(match, isHighVig, minOdds, minProbability, equalityTolerance);
      
      if (recommendation) {
        return {
          prediction: recommendation.prediction.includes('Oui') ? 'Oui' : 'Non',
          confidence: recommendation.confidence,
          odds: recommendation.odds,
          probability: recommendation.probability,
          vigorish: recommendation.vigorish
        };
      }
    }
  }

  // Try O/U if BTTS didn't work
  if (match.odds_over_2_5 && match.odds_under_2_5) {
    const overProb = match.p_over_2_5_fair;
    const underProb = match.p_under_2_5_fair;
    
    if (!isEqual(overProb, underProb, equalityTolerance)) {
      const isHighVig = match.vig_ou_2_5 >= highVigorishThreshold;
      const recommendation = getOURecommendation(match, isHighVig, minOdds, minProbability, equalityTolerance);
      
      if (recommendation) {
        return {
          prediction: recommendation.prediction.includes('Plus') ? '+2,5 buts' : '-2,5 buts',
          confidence: recommendation.confidence,
          odds: recommendation.odds,
          probability: recommendation.probability,
          vigorish: recommendation.vigorish
        };
      }
    }
  }

  return null;
}

// Legacy export for backward compatibility
export const generateAIRecommendations = generateAIRecommendationsAsync;