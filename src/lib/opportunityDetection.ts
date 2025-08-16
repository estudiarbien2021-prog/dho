
import { ProcessedMatch } from '@/types/match';

export interface OpportunityRecommendation {
  type: '1X2' | 'BTTS' | 'O/U 2.5' | '1X2_NEGATIVE' | 'BTTS_NEGATIVE' | 'OU_NEGATIVE';
  prediction?: string;
  odds?: number;
  confidence?: string;
  reason?: string;
  isInverted?: boolean;
  
  // Pour les recommandations 1X2
  doubleChance?: string;
  doubleChanceOdds?: number;
  secondChoice?: { label: string; prob: number; odds: number; type: string };
  thirdChoice?: { label: string; prob: number; odds: number; type: string };
  
  // Pour les recommandations inverses
  inversePrediction?: string;
  inverseOdds?: number;
  originalAI?: string;
  shouldMaskAI?: boolean;
}

/**
 * Détecte les opportunités basées sur les vigorish élevés et les marges négatives
 * Logique unifiée utilisée par MarketEfficiencyGauge et AIRecommendationDisplay
 */
export function detectOpportunities(match: ProcessedMatch): OpportunityRecommendation[] {
  console.log(`🎯 DETECT OPPORTUNITIES - ${match.home_team} vs ${match.away_team}`);
  console.log(`📊 Vigorish: 1X2=${(match.vig_1x2 * 100).toFixed(1)}%, BTTS=${(match.vig_btts * 100).toFixed(1)}%, O/U=${(match.vig_ou_2_5 * 100).toFixed(1)}%`);
  console.log(`🔍 Probabilités BTTS: Oui=${(match.p_btts_yes_fair * 100).toFixed(1)}%, Non=${(match.p_btts_no_fair * 100).toFixed(1)}%`);
  console.log(`🔍 Probabilités O/U 2.5: Over=${(match.p_over_2_5_fair * 100).toFixed(1)}%, Under=${(match.p_under_2_5_fair * 100).toFixed(1)}%`);
  
  const opportunities: OpportunityRecommendation[] = [];
  
  // Créer un tableau des vigorish avec leurs types et les trier
  const vigorishData = [
    { type: '1X2', value: match.vig_1x2 },
    { type: 'BTTS', value: match.vig_btts },
    { type: 'O/U2.5', value: match.vig_ou_2_5 }
  ].sort((a, b) => b.value - a.value);
  
  const highestVigorish = vigorishData[0];
  
  // 1. Vérifier les marges négatives d'abord (opportunités premium)
  console.log(`🔍 VÉRIFICATION MARGES NÉGATIVES:`);
  
  if (match.vig_1x2 < 0) {
    console.log(`✅ 1X2 NÉGATIF détecté: ${(match.vig_1x2 * 100).toFixed(1)}%`);
    const homeProb = match.p_home_fair;
    const drawProb = match.p_draw_fair;
    const awayProb = match.p_away_fair;
    
    let prediction = '';
    let odds = 0;
    
    if (homeProb > drawProb && homeProb > awayProb) {
      prediction = match.home_team;
      odds = match.odds_home;
    } else if (awayProb > drawProb && awayProb > homeProb) {
      prediction = match.away_team;
      odds = match.odds_away;
    } else {
      prediction = 'Nul';
      odds = match.odds_draw;
    }
    
    opportunities.push({
      type: '1X2_NEGATIVE',
      prediction,
      odds,
      confidence: 'Très élevée',
      reason: 'Opportunité Premium Disponible',
      isInverted: false
    });
  }
  
  if (match.vig_btts < 0 && match.odds_btts_yes && match.odds_btts_no) {
    console.log(`✅ BTTS NÉGATIF détecté: ${(match.vig_btts * 100).toFixed(1)}%`);
    const bttsYesProb = match.p_btts_yes_fair;
    const bttsNoProb = match.p_btts_no_fair;
    
    // Vérifier l'égalité 50/50 même pour les marges négatives
    const isBTTSEqual = Math.abs(bttsYesProb - bttsNoProb) <= 0.01;
    if (isBTTSEqual) {
      console.log(`⚠️ BTTS 50/50 détecté même avec marge négative - PAS DE RECOMMANDATION`);
    } else {
      const prediction = bttsYesProb > bttsNoProb ? 'Oui' : 'Non';
      const odds = bttsYesProb > bttsNoProb ? match.odds_btts_yes : match.odds_btts_no;
      
      opportunities.push({
        type: 'BTTS_NEGATIVE',
        prediction,
        odds,
        confidence: 'Très élevée',
        reason: 'Opportunité Premium Disponible',
        isInverted: false
      });
    }
  }
  
  if (match.vig_ou_2_5 < 0 && match.odds_over_2_5 && match.odds_under_2_5) {
    console.log(`✅ O/U 2.5 NÉGATIF détecté: ${(match.vig_ou_2_5 * 100).toFixed(1)}%`);
    const overProb = match.p_over_2_5_fair;
    const underProb = match.p_under_2_5_fair;
    
    // Vérifier l'égalité 50/50 même pour les marges négatives
    const isOUEqual = Math.abs(overProb - underProb) <= 0.01;
    if (isOUEqual) {
      console.log(`⚠️ O/U 2.5 50/50 détecté même avec marge négative - PAS DE RECOMMANDATION`);
    } else {
      const prediction = overProb > underProb ? '+2,5 buts' : '-2,5 buts';
      const odds = overProb > underProb ? match.odds_over_2_5 : match.odds_under_2_5;
      
      opportunities.push({
        type: 'OU_NEGATIVE',
        prediction,
        odds,
        confidence: 'Très élevée',
        reason: 'Opportunité Premium Disponible',
        isInverted: false
      });
    }
  }
  
  // 2. 1X2 : si c'est le plus élevé ou le deuxième plus élevé ET >= 10%
  console.log(`🔍 VÉRIFICATION 1X2 DOUBLE CHANCE:`);
  const is1X2TopTwo = vigorishData[0].type === '1X2' || vigorishData[1].type === '1X2';
  const is1X2HighVigorish = match.vig_1x2 >= 0.10;
  
  if (is1X2TopTwo && is1X2HighVigorish) {
    console.log(`✅ 1X2 CONDITIONS REMPLIES: TopTwo=${is1X2TopTwo}, HighVig=${is1X2HighVigorish} (${(match.vig_1x2 * 100).toFixed(1)}%)`);
    
    // Calculer les probabilités implicites
    const probHome = 1 / match.odds_home;
    const probDraw = 1 / match.odds_draw;
    const probAway = 1 / match.odds_away;
    
    // Créer un tableau des probabilités avec leurs labels
    const outcomes = [
      { label: match.home_team, prob: probHome, odds: match.odds_home, type: 'home' },
      { label: 'Nul', prob: probDraw, odds: match.odds_draw, type: 'draw' },
      { label: match.away_team, prob: probAway, odds: match.odds_away, type: 'away' }
    ];
    
    // Trier par probabilité décroissante
    outcomes.sort((a, b) => b.prob - a.prob);
    
    // Prendre la 2ème et 3ème option
    const secondChoice = outcomes[1];
    const thirdChoice = outcomes[2];
    
    // Calculer les chances doubles
    let doubleChance = '';
    let doubleChanceOdds = 0;
    
    // Déterminer la combinaison de chance double basée sur les 2ème et 3ème choix
    if ((secondChoice.type === 'home' && thirdChoice.type === 'draw') || 
        (secondChoice.type === 'draw' && thirdChoice.type === 'home')) {
      doubleChance = '1X';
      doubleChanceOdds = 1 / (probHome + probDraw);
    } else if ((secondChoice.type === 'home' && thirdChoice.type === 'away') || 
               (secondChoice.type === 'away' && thirdChoice.type === 'home')) {
      doubleChance = '12';
      doubleChanceOdds = 1 / (probHome + probAway);
    } else if ((secondChoice.type === 'draw' && thirdChoice.type === 'away') || 
               (secondChoice.type === 'away' && thirdChoice.type === 'draw')) {
      doubleChance = 'X2';
      doubleChanceOdds = 1 / (probDraw + probAway);
    }
    
    // Ne proposer que si les cotes de chance double sont <= 4
    if (doubleChanceOdds <= 4) {
      console.log(`✅ DOUBLE CHANCE AJOUTÉE: ${doubleChance} @${doubleChanceOdds.toFixed(2)}`);
      opportunities.push({
        type: '1X2',
        prediction: doubleChance,
        odds: doubleChanceOdds,
        confidence: 'Élevée',
        doubleChance,
        doubleChanceOdds,
        secondChoice,
        thirdChoice,
        shouldMaskAI: false,
        isInverted: true
      });
    } else {
      console.log(`❌ DOUBLE CHANCE REJETÉE: cotes trop élevées (${doubleChanceOdds.toFixed(2)} > 4.0)`);
    }
  } else {
    console.log(`❌ 1X2 CONDITIONS NON REMPLIES: TopTwo=${is1X2TopTwo}, HighVig=${is1X2HighVigorish} (${(match.vig_1x2 * 100).toFixed(1)}%)`);
  }
  
  // 3. BTTS : nouvelle logique avec vérification d'égalité 50/50
  console.log(`🔍 VÉRIFICATION BTTS:`);
  if (match.odds_btts_yes && match.odds_btts_no) {
    const bttsYesProb = match.p_btts_yes_fair;
    const bttsNoProb = match.p_btts_no_fair;
    const highestBTTSProb = Math.max(bttsYesProb, bttsNoProb);
    
    // VÉRIFICATION CRITIQUE: Égalité 50/50
    const isBTTSEqual = Math.abs(bttsYesProb - bttsNoProb) <= 0.01;
    console.log(`🎯 BTTS Égalité 50/50: ${isBTTSEqual} (diff: ${Math.abs(bttsYesProb - bttsNoProb).toFixed(3)})`);
    
    if (isBTTSEqual) {
      console.log(`⚠️ BTTS 50/50 DÉTECTÉ - AUCUNE RECOMMANDATION BTTS`);
    } else {
      // Si vigorish < 6%, proposer directement (plus haute probabilité)
      if (match.vig_btts < 0.06) {
        console.log(`✅ BTTS Vigorish < 6%: ${(match.vig_btts * 100).toFixed(1)}%`);
        const prediction = bttsYesProb > bttsNoProb ? 'Oui' : 'Non';
        const odds = bttsYesProb > bttsNoProb ? match.odds_btts_yes : match.odds_btts_no;
        
        opportunities.push({
          type: 'BTTS',
          prediction,
          odds,
          confidence: 'Élevée',
          reason: 'Faible vigorish détecté',
          isInverted: false
        });
      }
      // NOUVELLE CONDITION: Si vigorish 6-8% ET probabilité > 60%, proposer directement
      else if (match.vig_btts >= 0.06 && match.vig_btts < 0.08 && highestBTTSProb > 0.60) {
        console.log(`✅ BTTS Forte probabilité: ${(match.vig_btts * 100).toFixed(1)}% vig, ${(highestBTTSProb * 100).toFixed(1)}% prob`);
        const prediction = bttsYesProb > bttsNoProb ? 'Oui' : 'Non';
        const odds = bttsYesProb > bttsNoProb ? match.odds_btts_yes : match.odds_btts_no;
        
        opportunities.push({
          type: 'BTTS',
          prediction,
          odds,
          confidence: 'Élevée',
          reason: 'Forte probabilité détectée',
          isInverted: false
        });
      }
      // Si vigorish >= 8%, proposer l'inverse (sauf si probabilité >= 56.5%)
      else if (match.vig_btts >= 0.08 && highestBTTSProb < 0.565) {
        console.log(`🔄 BTTS Inversion: vig=${(match.vig_btts * 100).toFixed(1)}%, prob=${(highestBTTSProb * 100).toFixed(1)}%`);
        
        // Utiliser la prédiction d'analyse (basée sur les probabilités)
        const analysisOriginalPrediction = bttsYesProb > bttsNoProb ? 'Oui' : 'Non';
        
        // Proposer l'inverse de la prédiction d'analyse
        const inversePrediction = analysisOriginalPrediction === 'Oui' ? 'Non' : 'Oui';
        const inverseOdds = analysisOriginalPrediction === 'Oui' ? match.odds_btts_no : match.odds_btts_yes;
        
        opportunities.push({
          type: 'BTTS',
          prediction: inversePrediction,
          odds: inverseOdds,
          confidence: 'Élevée',
          inversePrediction,
          inverseOdds,
          originalAI: analysisOriginalPrediction,
          shouldMaskAI: true,
          isInverted: true
        });
      }
      // Si probabilité >= 56.5%, recommander directement le plus probable (ignorer vigorish)
      else if (highestBTTSProb >= 0.565) {
        console.log(`✅ BTTS Probabilité élevée: ${(highestBTTSProb * 100).toFixed(1)}% (ignore vigorish)`);
        const directPrediction = bttsYesProb > bttsNoProb ? 'Oui' : 'Non';
        const directOdds = directPrediction === 'Oui' ? match.odds_btts_yes : match.odds_btts_no;
        
        opportunities.push({
          type: 'BTTS',
          prediction: directPrediction,
          odds: directOdds,
          confidence: 'Modérée', // Car vigorish élevé mais probabilité solide
          reason: 'Probabilité élevée (>56.5%)',
          isInverted: false
        });
      } else {
        console.log(`❌ BTTS Aucune condition remplie`);
      }
    }
  } else {
    console.log(`❌ BTTS Cotes manquantes`);
  }
  
  // 4. O/U 2.5 : nouvelle logique avec vérification d'égalité 50/50
  console.log(`🔍 VÉRIFICATION O/U 2.5:`);
  if (match.odds_over_2_5 && match.odds_under_2_5) {
    const overProb = match.p_over_2_5_fair;
    const underProb = match.p_under_2_5_fair;
    const highestOUProb = Math.max(overProb, underProb);
    
    // VÉRIFICATION CRITIQUE: Égalité 50/50
    const isOUEqual = Math.abs(overProb - underProb) <= 0.01;
    console.log(`🎯 O/U 2.5 Égalité 50/50: ${isOUEqual} (diff: ${Math.abs(overProb - underProb).toFixed(3)})`);
    
    if (isOUEqual) {
      console.log(`⚠️ O/U 2.5 50/50 DÉTECTÉ - AUCUNE RECOMMANDATION O/U 2.5`);
    } else {
      // Si vigorish < 6%, proposer directement (plus haute probabilité)
      if (match.vig_ou_2_5 < 0.06) {
        console.log(`✅ O/U 2.5 Vigorish < 6%: ${(match.vig_ou_2_5 * 100).toFixed(1)}%`);
        const prediction = overProb > underProb ? '+2,5 buts' : '-2,5 buts';
        const odds = overProb > underProb ? match.odds_over_2_5 : match.odds_under_2_5;
        
        opportunities.push({
          type: 'O/U 2.5',
          prediction,
          odds,
          confidence: 'Élevée',
          reason: 'Faible vigorish détecté',
          isInverted: false
        });
      }
      // NOUVELLE CONDITION: Si vigorish 6-8% ET probabilité > 60%, proposer directement
      else if (match.vig_ou_2_5 >= 0.06 && match.vig_ou_2_5 < 0.08 && highestOUProb > 0.60) {
        console.log(`✅ O/U 2.5 Forte probabilité: ${(match.vig_ou_2_5 * 100).toFixed(1)}% vig, ${(highestOUProb * 100).toFixed(1)}% prob`);
        const prediction = overProb > underProb ? '+2,5 buts' : '-2,5 buts';
        const odds = overProb > underProb ? match.odds_over_2_5 : match.odds_under_2_5;
        
        opportunities.push({
          type: 'O/U 2.5',
          prediction,
          odds,
          confidence: 'Élevée',
          reason: 'Forte probabilité détectée',
          isInverted: false
        });
      }
      // Si vigorish >= 8%, proposer l'inverse (sauf si probabilité >= 56.5%)
      else if (match.vig_ou_2_5 >= 0.08 && highestOUProb < 0.565) {
        console.log(`🔄 O/U 2.5 Inversion: vig=${(match.vig_ou_2_5 * 100).toFixed(1)}%, prob=${(highestOUProb * 100).toFixed(1)}%`);
        
        // Utiliser la prédiction d'analyse (basée sur les probabilités)
        const analysisOriginalPrediction = overProb > underProb ? '+2,5 buts' : '-2,5 buts';
        
        // Proposer l'inverse de la prédiction d'analyse
        const inversePrediction = analysisOriginalPrediction === '+2,5 buts' ? '-2,5 buts' : '+2,5 buts';
        const inverseOdds = analysisOriginalPrediction === '+2,5 buts' ? match.odds_under_2_5 : match.odds_over_2_5;
        
        opportunities.push({
          type: 'O/U 2.5',
          prediction: inversePrediction,
          odds: inverseOdds,
          confidence: 'Élevée',
          inversePrediction,
          inverseOdds,
          originalAI: analysisOriginalPrediction,
          shouldMaskAI: true,
          isInverted: true
        });
      }
      // Si probabilité >= 56.5%, recommander directement le plus probable (ignorer vigorish)
      else if (highestOUProb >= 0.565) {
        console.log(`✅ O/U 2.5 Probabilité élevée: ${(highestOUProb * 100).toFixed(1)}% (ignore vigorish)`);
        const directPrediction = overProb > underProb ? '+2,5 buts' : '-2,5 buts';
        const directOdds = directPrediction === '+2,5 buts' ? match.odds_over_2_5 : match.odds_under_2_5;
        
        opportunities.push({
          type: 'O/U 2.5',
          prediction: directPrediction,
          odds: directOdds,
          confidence: 'Modérée', // Car vigorish élevé mais probabilité solide
          reason: 'Probabilité élevée (>56.5%)',
          isInverted: false
        });
      } else {
        console.log(`❌ O/U 2.5 Aucune condition remplie`);
      }
    }
  } else {
    console.log(`❌ O/U 2.5 Cotes manquantes`);
  }
  
  console.log('🔚 OPPORTUNITIES FINALES:', opportunities.map(o => 
    `${o.type}: ${o.prediction} @${o.odds?.toFixed(2)} (inverted:${o.isInverted}) (${o.reason})`
  ));
  
  return opportunities;
}

/**
 * Convertit une opportunité en format AIRecommendation pour la compatibilité
 */
export function convertOpportunityToAIRecommendation(opportunity: OpportunityRecommendation) {
  return {
    betType: opportunity.type === '1X2' ? 'chance double' : opportunity.type,
    prediction: opportunity.prediction || '',
    odds: opportunity.odds || 0,
    confidence: opportunity.confidence || 'low',
    isInverted: opportunity.isInverted || false,
    reason: opportunity.reason || []
  };
}
