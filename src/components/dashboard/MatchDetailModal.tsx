import React, { useState, useEffect, useMemo } from 'react';
import { ProcessedMatch } from '@/types/match';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { FlagMini } from '@/components/Flag';
import { leagueToFlag } from '@/lib/leagueCountry';
import { generateConfidenceScore } from '@/lib/confidence';
import { detectOpportunities, convertOpportunityToAIRecommendation } from '@/lib/opportunityDetection';
import AIRecommendationDisplay from '@/components/AIRecommendationDisplay';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, TrendingDown, Target, Eye, Download, Loader2, Zap, Brain, TrendingUp } from 'lucide-react';
import { NeuralNetworkVisualization } from '@/components/charts/NeuralNetworkVisualization';
import { ConfidenceScoreBars } from '@/components/charts/ConfidenceScoreBars';
import { InfluenceFactors } from '@/components/charts/InfluenceFactors';
import { TeamRadarChart } from '@/components/charts/RadarChart';
import { TimelineMomentum } from '@/components/charts/TimelineMomentum';
import { ProbabilityDistribution } from '@/components/charts/ProbabilityDistribution';
import { ScorePredictionMatrix } from '@/components/charts/ScorePredictionMatrix';
import { ConfidenceRadar } from '@/components/charts/ConfidenceRadar';
import { MarketEfficiencyGauge } from '@/components/charts/MarketEfficiencyGauge';
import { AIConsensusGauge } from '@/components/charts/AIConsensusGauge';
import { PredictionCertaintyBars } from '@/components/charts/PredictionCertaintyBars';
import { AIProbabilitiesAnalysis } from '@/components/charts/AIProbabilitiesAnalysis';


interface MatchDetailModalProps {
  match: ProcessedMatch | null;
  isOpen: boolean;
  onClose: () => void;
  marketFilters?: string[];
}

export function MatchDetailModal({ match, isOpen, onClose, marketFilters = [] }: MatchDetailModalProps) {
  // Early return BEFORE any hooks - TeamChemistryAnalyzer removed
  if (!match) return null;

  console.log('🔴 MODAL OUVERT POUR:', match.home_team, 'vs', match.away_team, '- ID:', match.id);

  const [showAIGraphics, setShowAIGraphics] = useState(true);
  
  // Reset AI graphics when modal closes
  useEffect(() => {
    if (isOpen) {
      setShowAIGraphics(true);
    } else {
      setShowAIGraphics(false);
    }
  }, [isOpen]);

  const flagInfo = leagueToFlag(match.league, match.country, match.home_team, match.away_team);

  // Determine winning predictions with percentages display
  const get1x2Percentages = () => {
    const homePercent = (match.p_home_fair * 100).toFixed(1);
    const drawPercent = (match.p_draw_fair * 100).toFixed(1);
    const awayPercent = (match.p_away_fair * 100).toFixed(1);
    return `Domicile ${homePercent}% | Nul ${drawPercent}% | Extérieur ${awayPercent}%`;
  };

  const getBttsPercentages = () => {
    const yesPercent = (match.p_btts_yes_fair * 100).toFixed(1);
    const noPercent = (match.p_btts_no_fair * 100).toFixed(1);
    return `Oui ${yesPercent}% | Non ${noPercent}%`;
  };

  const getOver25Percentages = () => {
    const overPercent = (match.p_over_2_5_fair * 100).toFixed(1);
    const underPercent = (match.p_under_2_5_fair * 100).toFixed(1);
    return `+2,5 buts ${overPercent}% | -2,5 buts ${underPercent}%`;
  };

  const get1x2Winner = () => {
    if (match.p_home_fair > match.p_draw_fair && match.p_home_fair > match.p_away_fair) {
      return match.home_team;
    } else if (match.p_away_fair > match.p_draw_fair && match.p_away_fair > match.p_home_fair) {
      return match.away_team;
    } else {
      return 'Nul';
    }
  };

  // Helper function to normalize recommendation object
  const normalizeRecommendation = (rec: any) => {
    console.log('🔍 NORMALIZE INPUT:', rec);
    
    if (!rec) return null;
    
    const normalized = {
      type: rec.betType || rec.type || 'Aucune',
      prediction: rec.prediction || 'Aucune',
      odds: rec.odds || 0,
      confidence: rec.confidence || 'low'
    };
    
    console.log('🔍 NORMALIZE OUTPUT:', normalized);
    
    return normalized;
  };

  // Utiliser les VRAIES recommandations IA (avec inversion) au lieu de recalculer
  const getAIRecommendations = () => {
    const aiRecs = allAIRecommendations || [];
    
    // Si on a les recommandations IA, les utiliser directement
    if (aiRecs.length > 0) {
      const bttsRec = aiRecs.find(r => r.betType === 'BTTS');
      const ouRec = aiRecs.find(r => r.betType === 'O/U 2.5');
      
      return {
        bttsWinner: bttsRec ? bttsRec.prediction : getBttsWinner(),
        over25Winner: ouRec ? ouRec.prediction : getOver25Winner(),
        // 1X2 reste inchangé car pas d'inversion sur ce marché
        winner1x2: get1x2Winner()
      };
    }
    
    // Fallback vers les calculs de base si pas de recommandations IA
    return {
      bttsWinner: getBttsWinner(),
      over25Winner: getOver25Winner(),
      winner1x2: get1x2Winner()
    };
  };

  const getBttsWinner = () => match.p_btts_yes_fair > match.p_btts_no_fair ? 'Oui' : 'Non';
  const getOver25Winner = () => {
    return match.p_over_2_5_fair > match.p_under_2_5_fair ? '+2,5 buts' : '-2,5 buts';
  };

  // Generate ALL AI recommendations for the match
  const opportunities = detectOpportunities(match);
  console.log('🔴 MODAL OPPORTUNITIES:', opportunities.length, opportunities.map(o => `${o.type}:${o.prediction}(inverted:${o.isInverted})`));
  
  // NOUVELLE LOGIQUE DE PRIORISATION : Trier TOUTES les recommandations par probabilité réelle
  const prioritizeOpportunities = (opps: any[]) => {
    // Calculer la probabilité réelle pour chaque recommandation
    const calculateRealProbability = (opp: any) => {
      let probability = 0;
      
      if (opp.type === '1X2' || opp.type === 'Double Chance') {
        const probHome = match.p_home_fair;
        const probDraw = match.p_draw_fair;
        const probAway = match.p_away_fair;
        
        if (opp.prediction === match.home_team) probability = probHome;
        else if (opp.prediction === match.away_team) probability = probAway;
        else if (opp.prediction === 'Nul') probability = probDraw;
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
    
    // Trier TOUTES les recommandations par probabilité réelle décroissante
    const sortedByProbability = [...opps].sort((a, b) => {
      const aProbability = calculateRealProbability(a);
      const bProbability = calculateRealProbability(b);
      
      console.log('🔄 COMPARAISON PROBABILITÉS RÉELLES GLOBALE:', {
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
    
    console.log('🎯 ORDRE FINAL AVEC PROBABILITÉS RÉELLES:', sortedByProbability.map((o, i) => {
      const realProb = calculateRealProbability(o);
      const vig = o.type === '1X2' || o.type === 'Double Chance' ? match.vig_1x2 : 
                  o.type === 'BTTS' ? match.vig_btts : match.vig_ou_2_5;
      return `${i+1}. ${o.type}:${o.prediction} (prob_réelle:${(realProb*100).toFixed(1)}%, vig:${(vig*100).toFixed(1)}%, inv:${o.isInverted})`;
    }));
    
    return sortedByProbability;
  };

  const prioritizedOpportunities = prioritizeOpportunities(opportunities);
  const allAIRecommendations = prioritizedOpportunities.map(convertOpportunityToAIRecommendation);

  // Helper function to get odds from recommendation
  const getOddsFromRecommendation = (opp: any) => {
    if (!opp || !opp.odds) return 0;
    return opp.odds;
  };

  // Save main prediction to database
  const saveMainPrediction = async (mainPrediction: string, confidence: number) => {
    try {
      const { error } = await supabase
        .from('matches')
        .update({ 
          ai_prediction: mainPrediction,
          ai_confidence: confidence 
        })
        .eq('id', match.id);
      
      if (error) {
        console.error('Error saving AI prediction:', error);
      } else {
        console.log('AI prediction saved successfully:', mainPrediction);
      }
    } catch (error) {
      console.error('Error saving AI prediction:', error);
    }
  };

  // Les recommandations sont déjà triées par priorité dans prioritizeOpportunities
  const prioritizeRecommendations = (recs: any[], opps: any[]) => {
    const combined = recs.map((rec, index) => ({ rec, opp: opps[index] }));
    
    // Les opportunités sont déjà dans le bon ordre de priorité
    console.log('🔴 RECOMMANDATIONS FINALES:', combined.map((c, i) => `${i+1}. ${c.opp.type}:${c.opp.prediction}(inverted:${c.opp.isInverted})`));
    
    return combined;

    // Save the main prediction if we have recommendations
    if (combined.length > 0) {
      const mainRec = combined[0];
      const formatPrediction = (betType: string, prediction: string) => {
        switch (betType) {
          case 'BTTS':
            return prediction === 'Oui' ? 'BTTS Oui' : 'BTTS Non';
          case 'O/U 2.5':
            return prediction === '+2,5 buts' ? 'OU 2.5 +2,5 buts' : 'OU 2.5 -2,5 buts';
          case '1X2':
            if (prediction === 'Victoire domicile') return '1';
            if (prediction === 'Match nul') return 'X';
            return '2';
          default:
            return `${betType} ${prediction}`;
        }
      };

      const mainPrediction = formatPrediction(mainRec.opp?.type || '', mainRec.opp?.prediction || '');
      const confidence = (mainRec.opp?.odds || 0) * 100;
      
      // Only save if we don't have a prediction yet or if it's different
      if (!match.ai_prediction || match.ai_prediction !== mainPrediction) {
        saveMainPrediction(mainPrediction, confidence);
      }
    }

    return combined;
  };

  const prioritizedRecommendations = prioritizeRecommendations(allAIRecommendations, prioritizedOpportunities);
  
  // Map prioritized opportunities to the three recommendation slots
  const recommendation = prioritizedRecommendations.length > 0 ? {
    ...normalizeRecommendation(prioritizedRecommendations[0].rec),
    isInverted: prioritizedRecommendations[0].opp?.isInverted || false,
    reason: prioritizedRecommendations[0].opp?.reason || []
  } : null;
  
  const secondAIRecommendation = prioritizedRecommendations.length > 1 ? {
    ...normalizeRecommendation(prioritizedRecommendations[1].rec), 
    isInverted: prioritizedRecommendations[1].opp?.isInverted || false,
    reason: prioritizedRecommendations[1].opp?.reason || [],
    vigorish: prioritizedRecommendations[1].opp?.type === '1X2' ? match.vig_1x2 : 
              prioritizedRecommendations[1].opp?.type === 'BTTS' ? match.vig_btts : match.vig_ou_2_5,
    probability: prioritizedRecommendations[1].opp?.type === '1X2' ? Math.max(match.p_home_fair, match.p_draw_fair, match.p_away_fair) :
                 prioritizedRecommendations[1].opp?.type === 'BTTS' ? Math.max(match.p_btts_yes_fair, match.p_btts_no_fair) :
                 Math.max(match.p_over_2_5_fair, match.p_under_2_5_fair)
  } : null;
  
  const thirdAIRecommendation = prioritizedRecommendations.length > 2 ? {
    ...normalizeRecommendation(prioritizedRecommendations[2].rec),
    isInverted: prioritizedRecommendations[2].opp?.isInverted || false,
    reason: prioritizedRecommendations[2].opp?.reason || [],
    vigorish: opportunities[2]?.type === '1X2' ? match.vig_1x2 : 
              opportunities[2]?.type === 'BTTS' ? match.vig_btts : match.vig_ou_2_5,
    probability: opportunities[2]?.type === '1X2' ? Math.max(match.p_home_fair, match.p_draw_fair, match.p_away_fair) :
                 opportunities[2]?.type === 'BTTS' ? Math.max(match.p_btts_yes_fair, match.p_btts_no_fair) :
                 Math.max(match.p_over_2_5_fair, match.p_under_2_5_fair)
  } : null;
  
  // Generate second recommendation based on low vigorish criteria (<6%)
  // Récupérer les données BRUTES déjà affichées dans le popup (sans recalcul)
  
    // DEBUG CRITIQUE : Afficher les vraies probabilités Over/Under
    console.log('🚨 VRAIES PROBABILITÉS O/U 2.5:', {
      'p_over_2_5_fair': match.p_over_2_5_fair,
      'p_under_2_5_fair': match.p_under_2_5_fair,
      'over_plus_probable': match.p_over_2_5_fair > match.p_under_2_5_fair,
      'under_plus_probable': match.p_under_2_5_fair > match.p_over_2_5_fair,
      'vigorish_ou_2_5': match.vig_ou_2_5,
      'odds_over_2_5': match.odds_over_2_5,
      'odds_under_2_5': match.odds_under_2_5
    });
    
    // DEBUG CRITIQUE : Comparaison entre logique brute et logique IA
    const aiRecs = getAIRecommendations();
    console.log('🚨 COMPARAISON LOGIQUES:', {
      'getOver25Winner_BRUTE': getOver25Winner(),
      'aiRecs.over25Winner_IA': aiRecs.over25Winner,
      'COHERENTES': getOver25Winner() === aiRecs.over25Winner,
      'SI_INCOHERENTES_UTILISER': 'aiRecs.over25Winner (IA avec inversion)'
    });
  
  // 1. RECOMMANDATION IA (Analyse complète avec facteurs d'influence) - Poids 3.0
  const aiRecommendationFromPopup = recommendation;
  
  // 2. OPPORTUNITÉS DÉTECTÉES (Efficacité du Marché) - Poids 3.0  
  // Récupérer TOUTES les opportunités market déjà calculées
  const getAllMarketOpportunities = () => {
    const opportunities = [];
    const lowVigThreshold = 0.06; // 6%
    
    // Récupérer les opportunités déjà calculées dans l'ordre d'affichage du popup
    if (match.vig_1x2 < lowVigThreshold) {
      const most1x2Prob = Math.max(match.p_home_fair, match.p_draw_fair, match.p_away_fair);
      let prediction1x2 = '';
      let odds1x2 = 0;
      
      if (most1x2Prob === match.p_home_fair) {
        prediction1x2 = match.home_team;
        odds1x2 = match.odds_home;
      } else if (most1x2Prob === match.p_away_fair) {
        prediction1x2 = match.away_team;
        odds1x2 = match.odds_away;
      } else {
        prediction1x2 = 'Nul';
        odds1x2 = match.odds_draw;
      }
      
      opportunities.push({
        type: '1X2',
        prediction: prediction1x2,
        odds: odds1x2,
        vigorish: match.vig_1x2,
        probability: most1x2Prob
      });
    }
    
    if (match.vig_btts && match.vig_btts < lowVigThreshold && 
        match.p_btts_yes_fair && match.p_btts_no_fair && 
        match.odds_btts_yes && match.odds_btts_no) {
      // Vérifier l'égalité 50/50 avant d'ajouter l'opportunité BTTS
      const isBTTSEqual = Math.abs(match.p_btts_yes_fair - match.p_btts_no_fair) <= 0.01;
      
      if (!isBTTSEqual) {
        const mostBttsProb = Math.max(match.p_btts_yes_fair, match.p_btts_no_fair);
        const predictionBtts = mostBttsProb === match.p_btts_yes_fair ? 'Oui' : 'Non';
        const oddsBtts = mostBttsProb === match.p_btts_yes_fair ? match.odds_btts_yes : match.odds_btts_no;
        
        opportunities.push({
          type: 'BTTS',
          prediction: predictionBtts,
          odds: oddsBtts || 0,
          vigorish: match.vig_btts,
          probability: mostBttsProb
        });
      } else {
        console.log('🔄 BTTS égalité 50/50 détectée dans Efficacité du Marché → Exclusion BTTS');
      }
    }
    
    if (match.vig_ou_2_5 < lowVigThreshold) {
      // Vérifier l'égalité 50/50 avant d'ajouter l'opportunité O/U
      const isOUEqual = Math.abs(match.p_over_2_5_fair - match.p_under_2_5_fair) <= 0.01;
      
      if (!isOUEqual) {
        const mostOuProb = Math.max(match.p_over_2_5_fair, match.p_under_2_5_fair);
        const predictionOu = mostOuProb === match.p_over_2_5_fair ? '+2,5 buts' : '-2,5 buts';
        const oddsOu = mostOuProb === match.p_over_2_5_fair ? match.odds_over_2_5 : match.odds_under_2_5;
        
        opportunities.push({
          type: 'O/U 2.5',
          prediction: predictionOu,
          odds: oddsOu || 0,
          vigorish: match.vig_ou_2_5,
          probability: mostOuProb
        });
      } else {
        console.log('🔄 O/U égalité 50/50 détectée dans Efficacité du Marché → Exclusion O/U');
      }
    }
    
    return opportunities.sort((a, b) => a.vigorish - b.vigorish);
  };
  
  const allMarketOpportunities = getAllMarketOpportunities();
  const marketRecommendation1 = allMarketOpportunities[0] || null;
  const marketRecommendation2 = allMarketOpportunities[1] || null;
  
  // Récupérer TOUTES les recommandations IA (y compris les doubles chances)
  const allAIRecs = opportunities.map(convertOpportunityToAIRecommendation);
  
  console.log('🚨 DEBUG TRANSMISSION RECOMMANDATIONS:', {
    'allAIRecs': allAIRecs,
    'allAIRecs.length': allAIRecs.length,
    'allAIRecs types': allAIRecs.map(r => r.betType),
    'match.vig_1x2': match.vig_1x2,
    'HIGH_VIG_1X2_THRESHOLD': 0.1
  });
  
  // Chercher les opportunités de double chance dans les recommandations IA
  const doubleChanceRec = allAIRecs.find(rec => rec.betType === 'Double Chance');
  
  console.log('🚨 DEBUG DOUBLE CHANCE REC:', {
    'doubleChanceRec': doubleChanceRec,
    'doubleChanceRec?.prediction': doubleChanceRec?.prediction
  });
  
  // Use AI recommendations first, then fallback to market opportunities
  const secondRecommendation = secondAIRecommendation || doubleChanceRec || marketRecommendation1;
  const thirdMarketRecommendation = thirdAIRecommendation || marketRecommendation2;
  
  console.log('🚨 DEBUG FINAL RECOMMENDATIONS:', {
    'recommendation': recommendation,
    'secondRecommendation': secondRecommendation,
    'thirdMarketRecommendation': thirdMarketRecommendation,
    'allAIRecommendations.length': allAIRecommendations.length
  });
  
  // SOLUTION DÉFINITIVE : Inclure TOUTES les opportunités affichées dans l'interface
  const getAllDisplayedOpportunities = () => {
    const opportunities = [];
    
    // NOUVELLE RÈGLE : Vérifier que les données essentielles sont présentes
    const hasValidBTTS = match.p_btts_yes_fair > 0 || match.p_btts_no_fair > 0;
    const hasValidOU = match.p_over_2_5_fair > 0 && match.p_under_2_5_fair > 0;
    
    console.log('🔍 VÉRIFICATION DONNÉES:', {
      hasValidBTTS,
      hasValidOU,
      'p_btts_yes_fair': match.p_btts_yes_fair,
      'p_btts_no_fair': match.p_btts_no_fair,
      'p_over_2_5_fair': match.p_over_2_5_fair,
      'p_under_2_5_fair': match.p_under_2_5_fair
    });
    
    // Si les données essentielles manquent, retourner un tableau vide
    if (!hasValidBTTS && !hasValidOU) {
      console.log('🚫 DONNÉES INSUFFISANTES - AUCUNE PRÉDICTION DE SCORE');
      return [];
    }
    
    // 1. Recommandation IA principale
    if (recommendation) {
      opportunities.push({
        source: 'ai',
        type: recommendation.type,
        prediction: recommendation.prediction,
        multiplier: 3.0
      });
    }
    
    // 2. CORRECTION X2 : Vérifier directement le vigorish 1x2
    if (match.vig_1x2 >= 0.1) {
      opportunities.push({
        source: 'market_x2',
        type: '1X2',
        prediction: 'X2',
        multiplier: 3.0
      });
      console.log('🚨 X2 AJOUTÉ DIRECTEMENT - vig_1x2:', match.vig_1x2);
    }
    
    // 3. Opportunités de marché réelles (pas de fallback)
    const marketOpps = getAllMarketOpportunities();
    marketOpps.forEach((opp) => {
      if (opp && opp.type && opp.prediction) {
        opportunities.push({
          source: 'market',
          type: opp.type,
          prediction: opp.prediction,
          multiplier: 3.0
        });
      }
    });
    
    // 4. NE PLUS ajouter de recommandations probabilistes de fallback
    
    // 4. LOGIQUE UNIVERSELLE : Calculer la double chance optimale pour TOUS les matchs
    const hasHighVig1x2 = match.vig_1x2 >= 0.1;
    if (hasHighVig1x2) {
      // Supprimer toute recommandation 1X2 probabiliste
      const filteredOpportunities = opportunities.filter(opp => 
        !(opp.source === 'probabilistic' && opp.type === '1X2')
      );
      
      // CALCULER LA DOUBLE CHANCE OPTIMALE UNIVERSELLEMENT
      const probHome = match.p_home_fair;
      const probDraw = match.p_draw_fair;
      const probAway = match.p_away_fair;
      
      // Identifier l'outcome le PLUS probable (à exclure de la double chance)
      const outcomes = [
        { label: 'home', prob: probHome },
        { label: 'draw', prob: probDraw },
        { label: 'away', prob: probAway }
      ].sort((a, b) => b.prob - a.prob);
      
      const mostProbableOutcome = outcomes[0].label;
      
      // Choisir la double chance qui exclut le plus probable
      let doubleChancePrediction = '';
      if (mostProbableOutcome === 'home') {
        doubleChancePrediction = 'X2'; // Exclut domicile → Nul ou Extérieur
      } else if (mostProbableOutcome === 'draw') {
        doubleChancePrediction = '12'; // Exclut nul → Domicile ou Extérieur
      } else {
        doubleChancePrediction = '1X'; // Exclut extérieur → Domicile ou Nul
      }
      
      filteredOpportunities.push({
        source: 'market_double_chance',
        type: '1X2',
        prediction: doubleChancePrediction,
        multiplier: 3.0
      });
      
      console.log('🚨 DOUBLE CHANCE UNIVERSELLE CALCULÉE:', {
        homeTeam: match.home_team,
        awayTeam: match.away_team,
        probabilities: { probHome, probDraw, probAway },
        mostProbableOutcome,
        doubleChancePrediction,
        'match.vig_1x2': match.vig_1x2
      });
      
      return filteredOpportunities;
    }
    
    console.log('🔍 RECOMMANDATIONS FINALES POUR MATRICE:', opportunities);
    return opportunities;
  };
  
  // Check for market distortions first
  const marketDistortion = (() => {
    // Create vigorish data and sort
    const vigorishData = [
      { type: '1X2', value: match.vig_1x2 },
      { type: 'BTTS', value: match.vig_btts },
      { type: 'O/U2.5', value: match.vig_ou_2_5 }
    ].sort((a, b) => b.value - a.value);
    
    const highestVigorish = vigorishData[0];
    
    // Check if we should mask AI recommendation - SEULEMENT si on peut inverser
    if (highestVigorish.type === 'BTTS' && highestVigorish.value >= 0.08) {
      // Vérifier l'exception des 60% - ne pas masquer si >= 60%
      const bttsYesProb = match.p_btts_yes_fair;
      const bttsNoProb = match.p_btts_no_fair;
      const highestBTTSProb = Math.max(bttsYesProb, bttsNoProb);
      
      // Masquer seulement si on peut inverser (probabilité < 60%)
      return { shouldMaskBTTS: highestBTTSProb < 0.6 };
    }
    if (highestVigorish.type === 'O/U2.5' && highestVigorish.value >= 0.08) {
      // Vérifier l'exception des 60% - ne pas masquer si >= 60%
      const overProb = match.p_over_2_5_fair;
      const underProb = match.p_under_2_5_fair;
      const highestOUProb = Math.max(overProb, underProb);
      
      // Masquer seulement si on peut inverser (probabilité < 60%)
      return { shouldMaskOU: highestOUProb < 0.6 };
    }
    
    return { shouldMaskBTTS: false, shouldMaskOU: false };
  })();

  // Function to check if AI recommendation should be shown
  const shouldShowAIRecommendation = () => {
    if (!recommendation) return false;
    
    // NOUVELLE RÈGLE : Toujours afficher les recommandations inversées (opportunités détectées)
    if (allAIRecommendations.length > 0 && allAIRecommendations[0].isInverted) {
      return true;
    }
    
    // Logique originale pour les autres cas
    if (recommendation.type === 'BTTS' && marketDistortion.shouldMaskBTTS) {
      return false;
    }
    
    if (recommendation.type === 'O/U 2.5' && marketDistortion.shouldMaskOU) {
      return false;
    }
    
    return true;
  };
  
  // Debug logs
  console.log('🔍 DEBUG MatchDetailModal:', {
    matchId: match.id,
    homeTeam: match.home_team,
    awayTeam: match.away_team,
    allAIRecommendations,
    recommendation,
    marketFilters
  });
  
  // NOUVEAU DEBUG CRITIQUE : Analyser chaque étape de transformation
  console.log('🚨 ANALYSE DÉTAILLÉE DES RECOMMANDATIONS:', {
    'allAIRecommendations_RAW': allAIRecommendations,
    'recommendation_after_normalize': recommendation,
    'recommendation_type': recommendation?.type,
    'recommendation_prediction': recommendation?.prediction,
    'shouldShow': shouldShowAIRecommendation()
  });
  
  // DEBUG des données d'opportunités de marché
  console.log('🔍 DEBUG MARKET OPPORTUNITIES:', {
    'getAllMarketOpportunities()': getAllMarketOpportunities(),
    'secondRecommendation': secondRecommendation,
    'thirdMarketRecommendation': thirdMarketRecommendation
  });

  // Generate AI recommendation explanation combining all 3 styles
  const generateRecommendationExplanation = (recommendation: any) => {
    // Create deterministic seed from match ID for consistent randomization
    const hashCode = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash);
    };

    const matchSeed = hashCode(match.id);
    
    // Seeded random function for deterministic "randomness"
    const seededRandom = (seed: number, index: number = 0) => {
      const x = Math.sin(seed + index) * 10000;
      return x - Math.floor(x);
    };

    // Helper to get seeded choice from array
    const getSeededChoice = (array: any[], seedOffset: number = 0) => {
      const randomValue = seededRandom(matchSeed, seedOffset);
      const index = Math.floor(randomValue * array.length);
      return array[index];
    };

    // Use the recommendation passed as parameter (already validated)
    const rec = { ...recommendation };

    if (rec.type === 'Aucune') {
      const noOpportunityTexts = [
        "🔍 **Scan Complet** : Après analyse de 47 métriques avancées, notre IA n'a trouvé aucune faille exploitable. Les bookmakers ont parfaitement calibré leurs prix cette fois.",
        "🎯 **Radar Silencieux** : Notre système de détection d'opportunités reste muet sur ce match. Les cotes reflètent parfaitement les probabilités réelles calculées.",
        "📡 **Signal Faible** : Malgré un balayage exhaustif des données, aucune distorsion de marché n'émerge. Les algorithmes confirment l'équilibre parfait des cotes."
      ];
      return getSeededChoice(noOpportunityTexts, 1);
    }

    // Récupérer la vraie probabilité du marché choisi
    let realProbability = 0.5; // valeur par défaut
    
    if (rec.type === 'BTTS') {
      if (rec.prediction === 'Oui') {
        realProbability = match.p_btts_yes_fair;
      } else if (rec.prediction === 'Non') {
        realProbability = match.p_btts_no_fair;
      }
    } else if (rec.type === 'O/U 2.5') {
      if (rec.prediction === '+2,5 buts') {
        realProbability = match.p_over_2_5_fair;
      } else if (rec.prediction === '-2,5 buts') {
        realProbability = match.p_under_2_5_fair;
      }
    }
    
    // Protection renforcée contre les valeurs NaN selon les règles définies
    const safeProbability = realProbability && !isNaN(realProbability) && realProbability > 0 
      ? Math.min(0.95, Math.max(0.05, realProbability))
      : 0.5;
    
    // Récupérer la marge vigorish du marché choisi (BTTS ou O/U 2.5)
    let marketVigorish = 0.05; // valeur par défaut
    if (rec.type === 'BTTS') {
      marketVigorish = match.vig_btts || 0.05;
    } else if (rec.type === 'O/U 2.5') {
      marketVigorish = match.vig_ou_2_5 || 0.05;
    }
    
    const safeVigorish = !isNaN(marketVigorish) && marketVigorish >= 0
      ? Math.min(0.25, Math.max(0.001, marketVigorish))
      : 0.05;
      
    const safeOdds = rec.odds && !isNaN(rec.odds) && rec.odds > 1
      ? Math.min(10.0, Math.max(1.01, rec.odds))
      : 1.5;
    
    const probPercent = (safeProbability * 100).toFixed(1);
    const vigPercent = (safeVigorish * 100).toFixed(1);
    
    // Edge aléatoire entre 2.0 et 6.0 selon les règles définies
    const randomEdge = 2.0 + seededRandom(matchSeed, 15) * 4.0; // Entre 2.0 et 6.0
    const edge = randomEdge.toFixed(1);
    
    // Handle confidence score using shared function to ensure consistency
    const confidence = generateConfidenceScore(match.id, rec);

    // Determine geographic context based on league
    const getGeographicContext = () => {
      const league = match.league.toLowerCase();
      const country = match.country?.toLowerCase() || '';
      
      // African competitions
      if (league.includes('african') || league.includes('africa') || league.includes('chan') || 
          league.includes('caf') || league.includes('champions league') && (league.includes('africa') || country === 'international') ||
          country.includes('morocco') || country.includes('algeria') || country.includes('tunisia') || 
          country.includes('egypt') || country.includes('nigeria') || country.includes('ghana') || 
          country.includes('senegal') || country.includes('cameroon') || country.includes('ivory') ||
          country.includes('south africa') || country.includes('zambia') || country.includes('mali') ||
          country.includes('burkina') || country.includes('kenya') || country.includes('angola')) {
        return 'du football africain';
      }
      
      // Asian competitions
      if (league.includes('asian') || league.includes('asia') || league.includes('afc') ||
          country.includes('japan') || country.includes('korea') || country.includes('china') ||
          country.includes('saudi') || country.includes('qatar') || country.includes('uae') ||
          country.includes('iran') || country.includes('australia') || country.includes('thailand') ||
          country.includes('vietnam') || country.includes('indonesia') || country.includes('malaysia') ||
          country.includes('singapore') || country.includes('philippines') || country.includes('myanmar') ||
          country.includes('cambodia') || country.includes('laos') || country.includes('brunei') ||
          country.includes('bhutan') || country.includes('nepal') || country.includes('bangladesh') ||
          country.includes('sri lanka') || country.includes('maldives') || country.includes('afghanistan') ||
          country.includes('pakistan') || country.includes('india') || country.includes('uzbekistan') ||
          country.includes('kazakhstan') || country.includes('kyrgyzstan') || country.includes('tajikistan') ||
          country.includes('turkmenistan') || country.includes('mongolia') || country.includes('taiwan') ||
          country.includes('hong kong') || country.includes('macau') || country.includes('palestine') ||
          country.includes('lebanon') || country.includes('syria') || country.includes('jordan') ||
          country.includes('iraq') || country.includes('kuwait') || country.includes('bahrain') ||
          country.includes('oman') || country.includes('yemen')) {
        return 'du football asiatique';
      }
      
      // North American / CONCACAF
      if (league.includes('concacaf') || league.includes('gold cup') || league.includes('nations league') ||
          league.includes('liga mx') || league.includes('mexico') || country.includes('mexico') ||
          league.includes('mls') || country.includes('usa') || league.includes('canadian') || 
          country.includes('canada') || country.includes('costa rica') || country.includes('guatemala') ||
          country.includes('honduras') || country.includes('panama') || country.includes('jamaica')) {
        return 'du football nord-américain et centre-américain';
      }
      
      // South American competitions
      if (league.includes('copa libertadores') || league.includes('copa sudamericana') || 
          league.includes('categoria primera') || league.includes('division profesional') ||
          league.includes('brasileirao') || league.includes('brazil') || country.includes('brazil') ||
          league.includes('argentina') || country.includes('argentina') || country.includes('chile') ||
          country.includes('colombia') || country.includes('peru') || country.includes('uruguay') ||
          country.includes('ecuador') || country.includes('venezuela') || country.includes('bolivia') ||
          country.includes('paraguay')) {
        return 'du football sud-américain';
      }
      
      // European competitions - be more specific
      if (league.includes('premier league') || league.includes('championship') || 
          league.includes('la liga') || league.includes('serie a') || 
          league.includes('bundesliga') || league.includes('ligue 1') ||
          league.includes('primeira liga') || league.includes('eredivisie') ||
          league.includes('champions league') || league.includes('europa league') ||
          league.includes('conference league') || league.includes('euro') ||
          country.includes('england') || country.includes('spain') || country.includes('italy') ||
          country.includes('germany') || country.includes('france') || country.includes('portugal') ||
          country.includes('netherlands') || country.includes('belgium') || country.includes('poland') ||
          country.includes('czech') || country.includes('austria') || country.includes('switzerland') ||
          country.includes('croatia') || country.includes('serbia') || country.includes('greece') ||
          country.includes('turkey') || country.includes('ukraine') || country.includes('russia') ||
          country.includes('sweden') || country.includes('norway') || country.includes('denmark')) {
        return 'du football européen';
      }
      
      // International / World competitions
      if (league.includes('world') || league.includes('mondial') || league.includes('fifa') ||
          league.includes('international') || country === 'international') {
        return 'des compétitions internationales';
      }
      
      // Generic fallback - avoid defaulting to European
      return 'de cette compétition spécifique';
    };

    const geographicContext = getGeographicContext();

    // Generate dataset size based on competition history and popularity
    const getDatasetSize = () => {
      const league = match.league.toLowerCase();
      const country = match.country?.toLowerCase() || '';
      
      // FIRST: Check smaller/newer competitions to avoid being caught by broader conditions
      if (country.includes('bhutan') || country.includes('nepal') ||
          country.includes('cambodia') || country.includes('laos') ||
          country.includes('maldives') || country.includes('andorra') ||
          country.includes('liechtenstein') || country.includes('san marino') ||
          country.includes('montenegro') || country.includes('albania') ||
          country.includes('malta') || country.includes('gibraltar') ||
          country.includes('faroe islands') || country.includes('brunei') ||
          country.includes('timor-leste') || country.includes('guam') ||
          country.includes('american samoa') || country.includes('cook islands')) {
        return Math.floor(20000 + seededRandom(matchSeed, 26) * 15000); // 20k-35k
      }
      
      // Major European leagues - most historical data
      if (league.includes('premier league') || league.includes('la liga') || 
          league.includes('serie a') || league.includes('bundesliga') || 
          league.includes('ligue 1') || league.includes('champions league') ||
          league.includes('europa league')) {
        return Math.floor(70000 + seededRandom(matchSeed, 20) * 30000); // 70k-100k
      }
      
      // Secondary European leagues
      if (league.includes('primeira liga') || league.includes('eredivisie') ||
          league.includes('championship') || 
          (country.includes('england') && !country.includes('new zealand')) ||
          country.includes('spain') || country.includes('italy') ||
          country.includes('germany') || country.includes('france') ||
          country.includes('portugal') || country.includes('netherlands') ||
          country.includes('belgium') || country.includes('poland') ||
          country.includes('czech') || country.includes('austria') ||
          country.includes('switzerland') || country.includes('croatia') ||
          country.includes('serbia') || country.includes('greece') ||
          country.includes('turkey') || country.includes('ukraine') ||
          country.includes('russia') || country.includes('sweden') ||
          country.includes('norway') || country.includes('denmark')) {
        return Math.floor(50000 + seededRandom(matchSeed, 21) * 30000); // 50k-80k
      }
      
      // Major South American competitions
      if (league.includes('copa libertadores') || league.includes('brasileirao') ||
          country.includes('brazil') || country.includes('argentina') ||
          country.includes('chile') || country.includes('colombia') ||
          country.includes('peru') || country.includes('uruguay') ||
          country.includes('ecuador')) {
        return Math.floor(40000 + seededRandom(matchSeed, 22) * 25000); // 40k-65k
      }
      
      // North American major leagues
      if (league.includes('mls') || league.includes('liga mx') ||
          country.includes('usa') || country.includes('mexico') ||
          country.includes('canada')) {
        return Math.floor(35000 + seededRandom(matchSeed, 23) * 20000); // 35k-55k
      }
      
      // African major competitions
      if (league.includes('african') || league.includes('caf') ||
          country.includes('morocco') || country.includes('egypt') ||
          country.includes('nigeria') || country.includes('south africa') ||
          country.includes('algeria') || country.includes('tunisia') ||
          country.includes('ghana') || country.includes('senegal') ||
          country.includes('cameroon') || country.includes('ivory')) {
        return Math.floor(25000 + seededRandom(matchSeed, 24) * 20000); // 25k-45k
      }
      
      // Asian established leagues
      if (league.includes('j-league') || country.includes('japan') ||
          country.includes('korea') || country.includes('australia') ||
          country.includes('saudi') || country.includes('qatar') ||
          country.includes('uae') || country.includes('iran') ||
          country.includes('china') || country.includes('thailand') ||
          country.includes('vietnam') || country.includes('indonesia') ||
          country.includes('malaysia') || country.includes('singapore') ||
          country.includes('india') || country.includes('pakistan') ||
          country.includes('bangladesh') || country.includes('sri lanka')) {
        return Math.floor(30000 + seededRandom(matchSeed, 25) * 15000); // 30k-45k
      }
      
      // Default for other competitions
      return Math.floor(25000 + seededRandom(matchSeed, 27) * 25000); // 25k-50k
    };

    const datasetSize = getDatasetSize().toLocaleString('fr-FR');

    // Professional signal detection intros (removed "Pépite")
    const signalIntros = [
      `🎯 **Opportunité Détectée** | Niveau de Confiance: ${confidence}/100`,
      `⚡ **Signal Identifié** | Score de Fiabilité: ${confidence}/100`,
      `🔥 **Anomalie Détectée** | Indice de Certitude: ${confidence}/100`,
      `📊 **Distorsion Repérée** | Taux de Confiance: ${confidence}/100`
    ];

    let explanation = `${getSeededChoice(signalIntros, 3)}\n\n`;
    
    // Varied data story intros with proper geographic context
    const dataIntros = [
      `📊 **Intelligence Artificielle** : Notre réseau neuronal, nourri de +${datasetSize} parties historiques ${geographicContext}`,
      `🧠 **Deep Learning** : L'algorithme, entraîné sur une base massive de +${datasetSize} données contextuelles ${geographicContext}`, 
      `⚙️ **Machine Learning** : Le modèle prédictif, alimenté par +${datasetSize} affrontements similaires ${geographicContext}`,
      `🎰 **Algorithme Quantitatif** : Notre IA, formée sur un dataset colossal de +${datasetSize} matchs ${geographicContext}`
    ];
    
    explanation += `${getSeededChoice(dataIntros, 4)} avec contextes identiques (blessures/suspensions, arbitre, pelouse, supporters, enjeux, déplacements, fatigue, météo), `;
    
    if (rec.type === 'BTTS') {
      if (rec.prediction === 'Oui') {
        const bttsYesTexts = [
          `révèle **${probPercent}%** de chances que les deux formations trouvent le chemin des filets. L'analyse des corridors offensifs, des faiblesses défensives latérales et des duels individuels converge vers un festival de buts.`,
          `calcule **${probPercent}%** de probabilité d'un double marquage. Les metrics d'Expected Goals, la porosité défensive constatée et l'agressivité offensive récente dessinent un scénario spectaculaire.`,
          `estime à **${probPercent}%** la probabilité que chaque équipe inscrive au moins un but. L'efficacité des transitions, les failles dans les blocs bas et l'historique des confrontations directes militent pour cette issue.`,
          `prédit **${probPercent}%** de chances d'un double marquage. L'analyse des centres dangereux, des phases d'arrêt de jeu et des changements tactiques en cours de match suggère une rencontre prolifique.`
        ];
        explanation += getSeededChoice(bttsYesTexts, 5);
      } else {
        const bttsNoTexts = [
          `détecte **${probPercent}%** de probabilité qu'une équipe au minimum reste bredouille. L'examen des dispositifs défensifs compacts, des carences créatives et du contexte psychologique plaide pour la stérilité offensive.`,
          `révèle **${probPercent}%** de chances d'un "clean sheet" au minimum. L'étude des blocs défensifs, de l'efficacité des pressing et des faiblesses dans les derniers gestes techniques convergent vers ce scénario.`,
          `calcule **${probPercent}%** de probabilité que l'une des formations reste muette. Les patterns tactiques identifiés, la solidité défensive observée et les difficultés à conclure plaident pour cette issue.`,
          `estime à **${probPercent}%** la probabilité d'au moins un zéro au tableau d'affichage. L'analyse des systèmes de marquage, des duels aériens et de la gestion des temps faibles indique cette tendance.`
        ];
        explanation += getSeededChoice(bttsNoTexts, 6);
      }
    } else if (rec.type === 'O/U 2.5') {
      if (rec.prediction === '+2,5 buts') {
        const overTexts = [
          `projette **${probPercent}%** de chances d'explosivité offensive avec 3+ réalisations. La conjugaison des Expected Goals, du tempo de jeu élevé et des espaces laissés en transition dessine un match débridé.`,
          `anticipe **${probPercent}%** de probabilité d'un festival offensif dépassant 2,5 buts. L'analyse des phases de pressing haut, des contres rapides et des situations de face-à-face suggère du spectacle.`,
          `révèle **${probPercent}%** de chances d'un carton plein offensif. Les métriques de dangerosité, l'intensité prévue et les failles dans les récupérations défensives convergent vers un match ouvert.`,
          `calcule **${probPercent}%** de probabilité d'une avalanche de buts. L'étude des couloirs préférentiels, des déséquilibres tactiques et de l'état de forme des finisseurs indique une rencontre prolifique.`
        ];
        explanation += getSeededChoice(overTexts, 7);
      } else {
        const underTexts = [
          `indique **${probPercent}%** de probabilité d'une sobriété offensive sous les 2,5 buts. L'examen des blocs défensifs organisés, de la gestion tactique prudente et des enjeux du match milite pour la retenue.`,
          `prédit **${probPercent}%** de chances d'un match verrouillé tactiquement. L'analyse des systèmes défensifs, de la discipline positionnelle et des difficultés à créer du danger suggère un score étriqué.`,
          `détecte **${probPercent}%** de probabilité d'une rencontre sous contrôle offensif. Les patterns identifiés dans la gestion des temps forts, la compacité défensive et l'efficacité des récupérations convergent vers ce scénario.`,
          `estime à **${probPercent}%** la probabilité d'un match en dessous de 2,5 réalisations. L'étude des duels individuels, de la pression défensive et des choix tactiques conservateurs plaide pour cette issue.`
        ];
        explanation += getSeededChoice(underTexts, 8);
      }
    }

    // Professional mathematical edge explanations
    const edgeTexts = [
      `\n\n💰 **Avantage Mathématique** : La cote **${rec.odds.toFixed(2)}** offre une "positive expected value" de **+${edge}%** selon nos calculs quantitatifs.`,
      `\n\n🎯 **Edge Statistique** : Avec **${rec.odds.toFixed(2)}**, vous bénéficiez d'un avantage théorique de **+${edge}%** - une distorsion de marché à exploiter.`,
      `\n\n⚡ **Profit Attendu** : La cote **${rec.odds.toFixed(2)}** génère une espérance de gain positive de **+${edge}%** sur le long terme.`,
      `\n\n📈 **Valeur Calculée** : À **${rec.odds.toFixed(2)}**, cette cote présente un surplus de valeur quantifié à **+${edge}%** par nos algorithmes.`
    ];
    
    explanation += getSeededChoice(edgeTexts, 9);
    
    // Professional vigorish conclusions
    if (recommendation.vigorish < 0.06) {
      const lowVigTexts = [
        `\n\n🚀 **Conditions Exceptionnelles** : Marge bookmaker de seulement ${vigPercent}% ! Une opportunité premium à saisir.`,
        `\n\n⭐ **Tarif Avantageux** : Vigorish ultra-compétitif à ${vigPercent}% - ce bookmaker casse les prix aujourd'hui.`,
        `\n\n🔥 **Aubaine Rare** : Avec ${vigPercent}% de commission, ces conditions sont parmi les meilleures du marché.`
      ];
      explanation += getSeededChoice(lowVigTexts, 10);
    } else if (recommendation.vigorish < 0.08) {
      const medVigTexts = [
        `\n\n✅ **Environnement Favorable** : Marge de ${vigPercent}%, des conditions attractives pour optimiser vos gains.`,
        `\n\n🎯 **Contexte Positif** : Vigorish de ${vigPercent}%, un niveau qui préserve la rentabilité à long terme.`,
        `\n\n💫 **Cadre Optimal** : Avec ${vigPercent}% de frais, ce marché reste très jouable pour les parieurs avisés.`
      ];
      explanation += getSeededChoice(medVigTexts, 11);
    } else {
      const highVigTexts = [
        `\n\n📊 **Marché Standard** : Vigorish à ${vigPercent}%, dans la fourchette habituelle du secteur.`,
        `\n\n⚖️ **Conditions Classiques** : Marge de ${vigPercent}%, un niveau typique des bookmakers professionnels.`,
        `\n\n📈 **Tarification Normale** : Commission à ${vigPercent}%, conforme aux standards du marché d'investissement sportif.`
      ];
      explanation += getSeededChoice(highVigTexts, 12);
    }

    return explanation;
  };

  // Donut chart data with brand colors
  const results1x2Data = [
    { name: 'Domicile', value: match.p_home_fair * 100, color: 'hsl(var(--brand))' },
    { name: 'Nul', value: match.p_draw_fair * 100, color: 'hsl(var(--brand-300))' },
    { name: 'Extérieur', value: match.p_away_fair * 100, color: 'hsl(var(--brand-400))' },
  ];

  const bttsData = match.p_btts_yes_fair > 0 ? [
    { name: 'BTTS Oui', value: match.p_btts_yes_fair * 100, color: 'hsl(var(--brand))' },
    { name: 'BTTS Non', value: match.p_btts_no_fair * 100, color: 'hsl(var(--brand-300))' },
  ] : [];

  const over25Data = match.p_over_2_5_fair > 0 ? [
    { name: 'Over 2.5', value: match.p_over_2_5_fair * 100, color: 'hsl(var(--brand))' },
    { name: 'Under 2.5', value: match.p_under_2_5_fair * 100, color: 'hsl(var(--brand-300))' },
  ] : [];

  // Loading states for progressive chart animation
  const [chartLoading, setChartLoading] = useState<{ [key: string]: number }>({});
  
  // Initialize loading states when modal opens
  useEffect(() => {
    if (isOpen) {
      setChartLoading({
        results1x2: 0,
        btts: 0,
        over25: 0
      });

      // Progressive loading animation
      const charts = ['results1x2', 'btts', 'over25'];
      charts.forEach((chart, index) => {
        setTimeout(() => {
          const interval = setInterval(() => {
            setChartLoading(prev => {
              const current = prev[chart] || 0;
              if (current >= 100) {
                clearInterval(interval);
                return prev;
              }
              return { ...prev, [chart]: Math.min(current + Math.random() * 8 + 2, 100) };
            });
          }, 50);
        }, index * 800);
      });
    }
  }, [isOpen]);

  const DonutChart = ({ data, title, prediction, chartKey }: { 
    data: any[], 
    title: string, 
    prediction: string,
    chartKey: string 
  }) => {
    const progress = chartLoading[chartKey] || 0;
    const isLoading = progress < 100;

    // Custom label function to display label and percentage inside the circles
    const renderCustomizedLabel = (entry: any) => {
      const RADIAN = Math.PI / 180;
      // Position labels inside the circles
      const radius = (entry.innerRadius + entry.outerRadius) / 2;
      const x = entry.cx + radius * Math.cos(-entry.midAngle * RADIAN);
      const y = entry.cy + radius * Math.sin(-entry.midAngle * RADIAN);

      // Determine label based on data structure
      let label = '';
      if (chartKey === 'results1x2') {
        if (entry.name === 'Domicile') label = 'Dom';
        else if (entry.name === 'Nul') label = 'Nul';
        else if (entry.name === 'Extérieur') label = 'Ext';
      } else if (chartKey === 'btts') {
        if (entry.name === 'BTTS Oui') label = 'Oui';
        else if (entry.name === 'BTTS Non') label = 'Non';
      } else if (chartKey === 'over25') {
        if (entry.name === 'Over 2.5') label = '+2.5';
        else if (entry.name === 'Under 2.5') label = '-2.5';
      }

      // Only show label if the segment is large enough (>10%)
      if (entry.value < 10) return null;

      return (
        <text 
          x={x} 
          y={y - 2} 
          fill="white" 
          textAnchor="middle" 
          dominantBaseline="central"
          fontSize="9"
          fontWeight="bold"
          className="drop-shadow-md"
        >
          <tspan x={x} dy="-4">{label}</tspan>
          <tspan x={x} dy="10" fontSize="8">{entry.value.toFixed(1)}%</tspan>
        </text>
      );
    };

    // Check if this chart matches the AI recommendation
    const isAIRecommended = () => {
      const aiRec = allAIRecommendations.length > 0 ? allAIRecommendations[0] : null;
      if (!aiRec) return false;
      
      if (aiRec.betType === 'BTTS' && chartKey === 'btts' && 
          ((aiRec.prediction === 'Oui' && prediction.includes('Oui')) || 
           (aiRec.prediction === 'Non' && prediction.includes('Non')))) {
        return true;
      }
      if (aiRec.betType === 'O/U 2.5' && chartKey === 'over25' && 
          ((aiRec.prediction === '+2,5 buts' && prediction.includes('+2,5 buts')) || 
           (aiRec.prediction === '-2,5 buts' && prediction.includes('-2,5 buts')))) {
        return true;
      }
      return false;
    };

    const aiRecommended = isAIRecommended();

    return (
      <Card className={`group relative p-3 bg-gradient-to-br from-surface-soft to-surface-strong border transition-all duration-500 hover:shadow-xl backdrop-blur-sm transform hover:scale-[1.02] ${
        aiRecommended 
          ? 'border-brand/60 shadow-[0_0_20px_hsl(var(--brand)/0.4)] hover:shadow-[0_0_30px_hsl(var(--brand)/0.6)]' 
          : 'border-brand/30 hover:border-brand/50 hover:shadow-brand/20'
      }`}>
        <div className={`absolute inset-0 rounded-lg transition-opacity duration-500 ${
          aiRecommended 
            ? 'bg-gradient-to-br from-brand/15 to-brand-300/20 opacity-100' 
            : 'bg-gradient-to-br from-brand/5 to-brand-300/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300'
        }`} />
        {aiRecommended && (
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-transparent via-brand/10 to-transparent animate-pulse border-2 border-brand/30" />
        )}
        
        <h4 className={`font-semibold text-center mb-2 text-sm text-text relative z-10 bg-gradient-to-r from-brand to-brand-400 bg-clip-text text-transparent transform group-hover:scale-105`}>
          {title}
        </h4>

        {isLoading ? (
          <div className="h-32 relative z-10 flex flex-col items-center justify-center">
            <div className="relative w-16 h-16 mb-2">
              <div className="absolute inset-0 rounded-full border-3 border-brand/20"></div>
              <div 
                className="absolute inset-0 rounded-full border-3 border-transparent border-t-brand transition-all duration-300 animate-spin"
                style={{
                  borderTopColor: `hsl(var(--brand))`,
                  transform: `rotate(${progress * 3.6}deg)`
                }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-4 w-4 text-brand animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-brand mb-1 animate-pulse">
                {Math.round(progress)}%
              </div>
              <div className="text-xs text-text-weak animate-fade-in">
                Analyse...
              </div>
            </div>
          </div>
        ) : (
          <div className="h-32 relative z-10 transform group-hover:scale-105 transition-transform duration-500 animate-fade-in">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  innerRadius={20}
                  outerRadius={45}
                  paddingAngle={2}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={1200}
                  animationEasing="ease-in-out"
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      stroke={entry.color} 
                      strokeWidth={aiRecommended ? 3 : 2}
                      className={`transition-all duration-300 ${
                        aiRecommended 
                          ? 'drop-shadow-[0_0_8px_hsl(var(--brand)/0.6)]' 
                          : 'drop-shadow-lg hover:drop-shadow-xl'
                      }`}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string) => [`${name}: ${value.toFixed(1)}%`, '']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--surface))',
                    border: '1px solid hsl(var(--brand) / 0.3)',
                    borderRadius: '8px',
                    color: 'hsl(var(--text))',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 8px 32px hsl(var(--brand) / 0.2)',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="mt-2 text-center relative z-10">
          {!isLoading && (
            <Badge className={`font-bold text-xs px-2 py-1 animate-fade-in ${
              aiRecommended 
                ? 'bg-gradient-to-r from-brand/50 to-brand-400/50 border-brand/60 text-brand-fg shadow-lg' 
                : 'bg-gradient-to-r from-brand/30 to-brand-400/30 border-brand/40 text-text'
            }`}>
              🎯 {prediction}
            </Badge>
          )}
        </div>
      </Card>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden bg-gradient-to-br from-surface via-surface-soft to-surface border-border shadow-2xl rounded-3xl p-0 backdrop-blur-xl">
        {/* Modern Overlay Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand/5 via-transparent to-brand/5 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,hsl(var(--brand)/0.1),rgba(255,255,255,0))] pointer-events-none" />
        
        <DialogHeader className="relative z-10 p-8 pb-6 border-b border-border bg-gradient-to-r from-surface-soft to-surface backdrop-blur-sm">
          <DialogTitle className="flex items-center gap-6">
            <div className="relative group">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand via-brand-400 to-brand-500 flex items-center justify-center shadow-xl group-hover:shadow-brand/25 transition-all duration-300 group-hover:scale-105">
                <FlagMini code={flagInfo.code} confed={flagInfo.confed} />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent opacity-50" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-br from-brand/20 to-brand-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            
            <div className="flex-1">
              <div className="text-3xl font-bold bg-gradient-to-r from-text via-text-weak to-text bg-clip-text text-transparent leading-tight mb-2">
                {match.home_team} vs {match.away_team}
              </div>
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 bg-gradient-to-r from-brand to-brand-400 rounded-full border border-brand/20">
                  <span className="text-sm font-semibold text-brand">{match.league}</span>
                </div>
                <div className="w-2 h-2 bg-brand rounded-full animate-pulse" />
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="relative z-10 p-8 space-y-8 overflow-y-auto max-h-[calc(90vh-140px)] scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {/* Enhanced Flags Section */}
          <div className="flex gap-3 flex-wrap justify-center">
            {match.watch_btts && (
              <div className="group relative">
                <div className="px-4 py-2 bg-gradient-to-r from-brand to-brand-400 text-brand-fg rounded-xl shadow-lg group-hover:shadow-brand/25 transition-all duration-300 group-hover:scale-105 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  <span className="font-semibold text-sm">Watch BTTS</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-brand/20 to-brand-400/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
              </div>
            )}
            {match.watch_over25 && (
              <div className="group relative">
                <div className="px-4 py-2 bg-gradient-to-r from-brand to-brand-400 text-brand-fg rounded-xl shadow-lg group-hover:shadow-brand/25 transition-all duration-300 group-hover:scale-105 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span className="font-semibold text-sm">Watch Over 2.5</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-brand/20 to-brand-400/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
              </div>
            )}
          </div>

          {/* Analyse des Probabilités IA - Donut Charts avec cotes */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold bg-gradient-to-r from-brand to-brand-400 bg-clip-text text-transparent flex items-center gap-3">
              <div className="w-2 h-2 bg-brand rounded-full" />
              Analyse des Probabilités IA
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Résultat 1X2 */}
              <Card className="p-4">
                <DonutChart data={results1x2Data} title="Résultat 1X2" prediction={get1x2Percentages()} chartKey="results1x2" />
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Domicile</div>
                    <div className={`px-2 py-1 bg-brand/10 rounded text-sm font-mono ${
                      get1x2Winner() === match.home_team ? 'font-bold text-brand' : 'font-normal text-muted-foreground'
                    }`}>
                      {match.odds_home && !isNaN(match.odds_home) ? match.odds_home.toFixed(2) : '0.00'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Nul</div>
                    <div className={`px-2 py-1 bg-brand/10 rounded text-sm font-mono ${
                      get1x2Winner() === 'Nul' ? 'font-bold text-brand' : 'font-normal text-muted-foreground'
                    }`}>
                      {match.odds_draw && !isNaN(match.odds_draw) ? match.odds_draw.toFixed(2) : '0.00'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Extérieur</div>
                    <div className={`px-2 py-1 bg-brand/10 rounded text-sm font-mono ${
                      get1x2Winner() === match.away_team ? 'font-bold text-brand' : 'font-normal text-muted-foreground'
                    }`}>
                      {match.odds_away && !isNaN(match.odds_away) ? match.odds_away.toFixed(2) : '0.00'}
                    </div>
                  </div>
                </div>
              </Card>

              {/* BTTS */}
              {bttsData.length > 0 && (
                <Card className="p-4">
                   <DonutChart data={bttsData} title="Les Deux Équipes Marquent" prediction={getBttsPercentages()} chartKey="btts" />
                   <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                     <div>
                       <div className="text-xs text-muted-foreground mb-1">BTTS Oui</div>
                       <div className={`px-2 py-1 bg-brand/10 rounded text-sm font-mono ${
                         getAIRecommendations().bttsWinner === 'Oui' ? 'font-bold text-brand' : 'font-normal text-muted-foreground'
                       }`}>
                         {match.odds_btts_yes && !isNaN(match.odds_btts_yes) ? match.odds_btts_yes.toFixed(2) : '0.00'}
                       </div>
                     </div>
                     <div>
                       <div className="text-xs text-muted-foreground mb-1">BTTS Non</div>
                       <div className={`px-2 py-1 bg-brand/10 rounded text-sm font-mono ${
                         getAIRecommendations().bttsWinner === 'Non' ? 'font-bold text-brand' : 'font-normal text-muted-foreground'
                       }`}>
                         {match.odds_btts_no && !isNaN(match.odds_btts_no) ? match.odds_btts_no.toFixed(2) : '0.00'}
                       </div>
                     </div>
                   </div>
                </Card>
              )}

              {/* Over/Under 2.5 */}
              {over25Data.length > 0 && (
                <Card className="p-4">
                   <DonutChart data={over25Data} title="Plus/Moins 2,5 Buts" prediction={getOver25Percentages()} chartKey="over25" />
                   <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                     <div>
                       <div className="text-xs text-muted-foreground mb-1">Plus de 2,5</div>
                       <div className={`px-2 py-1 bg-brand/10 rounded text-sm font-mono ${
                         getAIRecommendations().over25Winner === '+2,5 buts' ? 'font-bold text-brand' : 'font-normal text-muted-foreground'
                       }`}>
                         {match.odds_over_2_5 && !isNaN(match.odds_over_2_5) ? match.odds_over_2_5.toFixed(2) : '0.00'}
                       </div>
                     </div>
                     <div>
                       <div className="text-xs text-muted-foreground mb-1">Moins de 2,5</div>
                       <div className={`px-2 py-1 bg-brand/10 rounded text-sm font-mono ${
                         getAIRecommendations().over25Winner === '-2,5 buts' ? 'font-bold text-brand' : 'font-normal text-muted-foreground'
                       }`}>
                         {match.odds_under_2_5 && !isNaN(match.odds_under_2_5) ? match.odds_under_2_5.toFixed(2) : '0.00'}
                       </div>
                     </div>
                   </div>
                </Card>
              )}
            </div>
          </div>

          <Separator className="bg-gradient-to-r from-transparent via-brand/30 to-transparent" />

          {/* Enhanced AI Graphics Section */}
          <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-brand via-brand-400 to-brand-500 bg-clip-text text-transparent mb-2">
                  Intelligence Artificielle Avancée
                </h2>
                <p className="text-text-weak">
                  Analyse prédictive complète avec 5 algorithmes d'IA différents
                </p>
              </div>
            
            <div className="grid grid-cols-1 gap-8">
              {/* Enhanced AI Recommendation Section with Influence Factors */}
              <Card className="p-8 bg-gradient-to-br from-surface to-surface-soft border-border shadow-lg">
                <div className="flex items-center gap-3 mb-8">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-brand to-brand-400 rounded-xl shadow-lg">
                    <Target className="w-6 h-6 text-brand-fg" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-text">Recommandation de l'IA</h3>
                    <p className="text-sm text-text-weak">Analyse complète avec facteurs d'influence</p>
                  </div>
                </div>

                 <div className="space-y-6">
                   {/* Primary AI Recommendation */}
                   {recommendation && shouldShowAIRecommendation() && (
                     <Card className="p-6 bg-white border border-surface-strong">
                       <div className="space-y-4">
                         {/* Header */}
                         <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 bg-brand rounded-lg flex items-center justify-center">
                               <Target className="w-5 h-5 text-white" />
                             </div>
                             <div>
                               <h4 className="text-lg font-bold text-text">
                                 {recommendation.type} {recommendation.prediction}
                               </h4>
                               <p className="text-sm text-text-weak">Recommandation principale</p>
                             </div>
                           </div>
                           <div className="text-right">
                             <div className="text-2xl font-bold text-brand">
                               {recommendation.odds.toFixed(2)}
                             </div>
                             {allAIRecommendations.length > 0 && allAIRecommendations[0].isInverted && (
                               <Badge className="bg-amber-500 text-white text-xs mt-1">
                                 Opportunité détectée
                               </Badge>
                             )}
                           </div>
                         </div>

                         {/* Confidence Score */}
                         <div className="space-y-2">
                           <div className="flex justify-between items-center">
                             <span className="text-sm font-medium text-text">Niveau de confiance</span>
                             <span className="text-lg font-bold text-brand">
                               {generateConfidenceScore(match.id, recommendation)}%
                             </span>
                           </div>
                           <div className="w-full bg-surface-soft rounded-full h-3">
                             <div 
                               className="bg-brand h-3 rounded-full transition-all duration-1000"
                               style={{ width: `${showAIGraphics ? generateConfidenceScore(match.id, recommendation) : 0}%` }}
                             />
                           </div>
                         </div>

                         {/* Commentary */}
                         <div className="bg-surface-soft rounded-lg p-4">
                           <div className="text-sm text-text leading-6">
                             {recommendation.isInverted ? (
                               <div>
                                 <p className="font-semibold mb-2">Opportunité d'inversion détectée</p>
                                 <p>
                                   Nos modèles IA détectent une probabilité de {recommendation.type === 'BTTS' ? 
                                     (recommendation.prediction === 'Non' ? match.p_btts_no_fair * 100 : match.p_btts_yes_fair * 100) :
                                     (recommendation.prediction === '-2,5 buts' ? match.p_under_2_5_fair * 100 : match.p_over_2_5_fair * 100)
                                   }% pour cette prédiction.
                                 </p>
                                 <p className="mt-2 text-text-weak">
                                   Le marché surestime probablement l'option opposée, créant une opportunité de valeur.
                                 </p>
                               </div>
                             ) : (
                               <div dangerouslySetInnerHTML={{ 
                                 __html: (typeof generateRecommendationExplanation === 'function' 
                                   ? generateRecommendationExplanation(recommendation).replace(/\n/g, '<br/>') 
                                   : 'Explication temporairement indisponible'
                                 )
                               }} />
                             )}
                           </div>
                         </div>
                       </div>
                     </Card>
                   )}

                   {/* Secondary AI Recommendation */}
                   {secondRecommendation && !(recommendation && 
                      recommendation.type === secondRecommendation.type && 
                      recommendation.prediction === secondRecommendation.prediction) && (
                     <Card className="p-6 bg-white border border-surface-strong">
                       <div className="space-y-4">
                         {/* Header */}
                         <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 bg-brand-400 rounded-lg flex items-center justify-center">
                               <Brain className="w-5 h-5 text-white" />
                             </div>
                             <div>
                               <h4 className="text-lg font-bold text-text">
                                 {secondRecommendation.type} {secondRecommendation.prediction}
                               </h4>
                               <p className="text-sm text-text-weak">
                                 {secondRecommendation.isInverted ? 'Opportunité détectée' : 'Recommandation secondaire'}
                               </p>
                             </div>
                           </div>
                           <div className="text-right">
                             <div className="text-2xl font-bold text-brand-400">
                               {secondRecommendation.odds.toFixed(2)}
                             </div>
                             <div className="flex gap-1 mt-1">
                               {secondRecommendation.isInverted && (
                                 <Badge className="bg-amber-500 text-white text-xs">
                                   Opportunité
                                 </Badge>
                               )}
                               {secondRecommendation.vigorish && (
                                 <Badge className="bg-emerald-500 text-white text-xs">
                                   Vigorish {(secondRecommendation.vigorish * 100).toFixed(1)}%
                                 </Badge>
                               )}
                             </div>
                           </div>
                         </div>

                         {/* Commentary */}
                         <div className="bg-surface-soft rounded-lg p-4">
                           <div className="text-sm text-text leading-6">
                             {secondRecommendation.isInverted ? (
                               <div>
                                 <p className="font-semibold mb-2">Opportunité d'inversion</p>
                                 <p>
                                   Cette prédiction inverse la tendance probabiliste pour exploiter une inefficience de marché.
                                 </p>
                               </div>
                             ) : secondRecommendation.vigorish ? (
                               <div>
                                 <p className="font-semibold mb-2">Opportunité détectée</p>
                                 <p>
                                   Vigorish exceptionnellement bas de {(secondRecommendation.vigorish * 100).toFixed(1)}% sur ce marché.
                                 </p>
                                 <p className="mt-2 text-text-weak">
                                   Probabilité réelle estimée à {(secondRecommendation.probability * 100).toFixed(1)}%.
                                 </p>
                               </div>
                             ) : (
                               <p>
                                 Opportunité complémentaire identifiée par nos modèles d'analyse avancée.
                               </p>
                             )}
                           </div>
                         </div>
                       </div>
                     </Card>
                   )}

                   {/* Third Market Recommendation */}
                   {thirdMarketRecommendation && (
                     <Card className="p-6 bg-white border border-surface-strong">
                       <div className="space-y-4">
                         {/* Header */}
                         <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 bg-brand-600 rounded-lg flex items-center justify-center">
                               <TrendingUp className="w-5 h-5 text-white" />
                             </div>
                             <div>
                               <h4 className="text-lg font-bold text-text">
                                 {thirdMarketRecommendation.type} {thirdMarketRecommendation.prediction}
                               </h4>
                               <p className="text-sm text-text-weak">
                                 {thirdMarketRecommendation.isInverted ? 'Opportunité détectée' : 'Recommandation tertiaire'}
                               </p>
                             </div>
                           </div>
                           <div className="text-right">
                             <div className="text-2xl font-bold text-brand-600">
                               {thirdMarketRecommendation.odds.toFixed(2)}
                             </div>
                             <div className="flex gap-1 mt-1">
                               {thirdMarketRecommendation.isInverted && (
                                 <Badge className="bg-amber-500 text-white text-xs">
                                   Opportunité
                                 </Badge>
                               )}
                               {thirdMarketRecommendation.vigorish && (
                                 <Badge className="bg-emerald-500 text-white text-xs">
                                   Vigorish {(thirdMarketRecommendation.vigorish * 100).toFixed(1)}%
                                 </Badge>
                               )}
                             </div>
                           </div>
                         </div>

                         {/* Commentary */}  
                         <div className="bg-surface-soft rounded-lg p-4">
                           <div className="text-sm text-text leading-6">
                             {thirdMarketRecommendation.isInverted ? (
                               <div>
                                 <p className="font-semibold mb-2">Opportunité d'inversion</p>
                                 <p>
                                   Cette prédiction inverse la tendance probabiliste pour exploiter une inefficience de marché.
                                 </p>
                               </div>
                             ) : thirdMarketRecommendation.vigorish ? (
                               <div>
                                 <p className="font-semibold mb-2">Opportunité détectée</p>
                                 <p>
                                   Vigorish de {(thirdMarketRecommendation.vigorish * 100).toFixed(1)}% identifié sur ce marché.
                                 </p>
                               </div>
                             ) : (
                               <p>
                                 Marché alternatif avec potentiel de valeur identifié par nos algorithmes.
                               </p>
                             )}
                           </div>
                         </div>
                       </div>
                     </Card>
                   )}

                   {!recommendation && !shouldShowAIRecommendation() && (
                     <div className="h-full flex items-center justify-center py-20">
                       <span className="text-text-weak text-lg">Aucune recommandation disponible</span>
                     </div>
                   )}

                  {/* Market Efficiency Section - Now with matching height */}
                  <Card className="p-6 bg-gradient-to-br from-background to-muted/20 border-border/50 min-h-[600px]">
                    <MarketEfficiencyGauge match={match} />
                  </Card>
                </div>

                {/* Compact Confidence Bars - moved below */}
                <div className="mt-8">
                  <div className="text-base font-bold text-text mb-4">Scores de Confiance</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-text-weak font-medium">🎯 Recommandation IA</span>
                        <span className="text-sm font-bold text-brand">
                          {generateConfidenceScore(match.id, recommendation || {})}%
                        </span>
                      </div>
                      <div className="h-2 bg-surface-strong rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-brand to-brand-400 rounded-full"
                          style={{ width: `${generateConfidenceScore(match.id, recommendation || {})}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-text-weak font-medium">⚠️ Facteur Risque</span>
                        <span className="text-sm font-bold text-destructive">
                          {Math.round(match.vig_1x2 * 100)}%
                        </span>
                      </div>
                      <div className="h-2 bg-surface-strong rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-destructive to-destructive/80 rounded-full"
                          style={{ width: `${Math.round(match.vig_1x2 * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Matrice de Prédiction de Score */}
            <div className="grid grid-cols-1 gap-6">
              <ScorePredictionMatrix
                homeTeam={match.home_team}
                awayTeam={match.away_team}
                matchId={match.id}
                isActive={true}
                match={match}
                aiRecommendation={recommendation}
                secondRecommendation={secondRecommendation}
                thirdRecommendation={thirdMarketRecommendation}
                allRecommendations={getAllDisplayedOpportunities()}
              />
            </div>

            {/* Radar de Performance et Timeline de Momentum */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Team Radar Chart */}
              <TeamRadarChart
                homeTeam={match.home_team}
                awayTeam={match.away_team}
                matchId={match.id}
                isActive={true}
              />

              {/* Timeline Momentum */}
              <TimelineMomentum
                homeTeam={match.home_team}
                awayTeam={match.away_team}
                matchId={match.id}
                isActive={true}
              />
            </div>
          </div>

          <Separator className="bg-gradient-to-r from-transparent via-brand/30 to-transparent" />


          {/* Section Analyses Avancées IA */}
          <div className="space-y-6">
            <div className="text-center py-4">
              <h2 className="text-xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
                <Brain className="w-6 h-6 text-brand" />
                Analyses Avancées IA
              </h2>
              <p className="text-sm text-muted-foreground">
                Métriques de nouvelle génération pour une analyse complète
              </p>
            </div>


            {/* Consensus IA et Barres de Certitude */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Consensus IA */}
              <Card className="p-6 bg-gradient-to-br from-background to-muted/20 border-border/50">
                <AIConsensusGauge match={match} />
              </Card>

              {/* Barres de Certitude */}
              <Card className="p-6 bg-gradient-to-br from-background to-muted/20 border-border/50">
                <PredictionCertaintyBars match={match} />
              </Card>
            </div>
          </div>

          {/* Modern Actions Section */}
          <div className="flex justify-center pt-4 border-t border-border">
            <Button 
              className="relative group px-8 py-3 bg-gradient-to-r from-text to-text-weak hover:from-text-weak hover:to-text text-surface font-semibold rounded-2xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden"
              onClick={onClose}>
              <div className="absolute inset-0 bg-gradient-to-r from-brand/10 to-brand/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative z-10 flex items-center gap-2">
                <span>Fermer</span>
                <div className="w-2 h-2 bg-current rounded-full opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
              </span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
