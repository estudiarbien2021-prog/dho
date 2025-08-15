import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { ProcessedMatch } from '@/types/match';
import { calculatePoisson } from '@/lib/poisson';
import { generateAIRecommendations, getAnalysisPrediction } from '@/lib/aiRecommendation';

interface ScorePredictionMatrixProps {
  homeTeam: string;
  awayTeam: string;
  matchId: string;
  isActive: boolean;
  match: ProcessedMatch;
}

interface ScoreCell {
  homeScore: number;
  awayScore: number;
  probability: number;
  isHighlighted: boolean;
  highlightReason?: string;
}

export function ScorePredictionMatrix({ homeTeam, awayTeam, matchId, isActive, match }: ScorePredictionMatrixProps) {
  const [matrix, setMatrix] = useState<ScoreCell[][]>([]);
  const [animationStep, setAnimationStep] = useState(0);

  // Détection d'opportunité de marché avec recommandation de double chance
  const getMarketOpportunity = () => {
    // Calculer les vigorish et détecter les opportunités
    const vigorishData = [
      { type: '1X2', value: match.vig_1x2 },
      { type: 'BTTS', value: match.vig_btts },
      { type: 'O/U2.5', value: match.vig_ou_2_5 }
    ].sort((a, b) => b.value - a.value);
    
    const highestVigorish = vigorishData[0];
    
    // Vérifier les marges négatives (opportunités premium)
    if (match.vig_1x2 < 0) {
      const homeProb = match.p_home_fair;
      const drawProb = match.p_draw_fair;
      const awayProb = match.p_away_fair;
      
      let prediction = '';
      if (homeProb > drawProb && homeProb > awayProb) {
        prediction = match.home_team;
      } else if (awayProb > drawProb && awayProb > homeProb) {
        prediction = match.away_team;
      } else {
        prediction = 'Nul';
      }
      
      return { 
        type: 'PREMIUM_OPPORTUNITY', 
        impact: 'HIGH',
        prediction,
        marketType: '1X2_NEGATIVE'
      };
    }
    
    // Double chance recommandée pour 1X2 avec vigorish élevé
    const is1X2TopTwo = vigorishData[0].type === '1X2' || vigorishData[1].type === '1X2';
    const is1X2HighVigorish = match.vig_1x2 >= 0.08;
    
    if (is1X2TopTwo && is1X2HighVigorish) {
      // Calculer les probabilités implicites
      const probHome = 1 / match.odds_home;
      const probDraw = 1 / match.odds_draw;
      const probAway = 1 / match.odds_away;
      
      // Créer un tableau des probabilités avec leurs labels
      const outcomes = [
        { label: match.home_team, prob: probHome, type: 'home' },
        { label: 'Nul', prob: probDraw, type: 'draw' },
        { label: match.away_team, prob: probAway, type: 'away' }
      ];
      
      // Trier par probabilité décroissante
      outcomes.sort((a, b) => b.prob - a.prob);
      
      // Prendre la 2ème et 3ème option pour la double chance
      const secondChoice = outcomes[1];
      const thirdChoice = outcomes[2];
      
      // Déterminer la combinaison de chance double
      let doubleChance = '';
      let doubleChanceTypes: string[] = [];
      
      if ((secondChoice.type === 'home' && thirdChoice.type === 'draw') || 
          (secondChoice.type === 'draw' && thirdChoice.type === 'home')) {
        doubleChance = '1X';
        doubleChanceTypes = ['home', 'draw'];
      } else if ((secondChoice.type === 'home' && thirdChoice.type === 'away') || 
                 (secondChoice.type === 'away' && thirdChoice.type === 'home')) {
        doubleChance = '12';
        doubleChanceTypes = ['home', 'away'];
      } else if ((secondChoice.type === 'draw' && thirdChoice.type === 'away') || 
                 (secondChoice.type === 'away' && thirdChoice.type === 'draw')) {
        doubleChance = 'X2';
        doubleChanceTypes = ['draw', 'away'];
      }
      
      const doubleChanceOdds = 1 / (probHome + probDraw + probAway - outcomes[0].prob);
      
      // Ne proposer que si les cotes de chance double sont <= 4
      if (doubleChanceOdds <= 4) {
        return { 
          type: 'DOUBLE_CHANCE', 
          impact: 'MEDIUM',
          doubleChance,
          doubleChanceTypes,
          doubleChanceOdds,
          secondChoice,
          thirdChoice
        };
      }
    }
    
    return null;
  };

  // Obtenir les recommandations IA principales et l'analyse des probabilités
  const getAIRecommendations = () => {
    // Utiliser les vraies recommandations IA de la section principale
    const primaryRecommendations = generateAIRecommendations(match);
    
    // Obtenir l'analyse des probabilités IA pour compléter
    const bttsAnalysis = getAnalysisPrediction(match, 'btts');
    const overUnderAnalysis = getAnalysisPrediction(match, 'over_under');
    
    // Prédiction 1X2 basée sur les probabilités
    const probHome = 1 / match.odds_home;
    const probDraw = 1 / match.odds_draw;
    const probAway = 1 / match.odds_away;
    
    const outcomes = [
      { label: match.home_team, prob: probHome, type: 'home' },
      { label: 'Nul', prob: probDraw, type: 'draw' },
      { label: match.away_team, prob: probAway, type: 'away' }
    ];
    
    const prediction1X2 = outcomes.sort((a, b) => b.prob - a.prob)[0];
    
    // Extraire les recommandations par type
    const bttsRec = primaryRecommendations.find(r => r.betType === 'BTTS');
    const overUnderRec = primaryRecommendations.find(r => r.betType === 'O/U 2.5');
    const doubleChanceRec = primaryRecommendations.find(r => r.betType === 'Double Chance');
    
    return {
      match1X2: prediction1X2,
      btts: bttsRec,
      overUnder: overUnderRec,
      doubleChance: doubleChanceRec,
      // Analyse des probabilités pour compléter (uniquement si pas contradictoire)
      bttsAnalysis: bttsRec ? null : bttsAnalysis, // Ne pas utiliser l'analyse si on a déjà une recommandation
      overUnderAnalysis: overUnderRec ? null : overUnderAnalysis
    };
  };

  // Generate probability matrix using real match data with Poisson model
  // Enhanced with AI recommendation, market opportunity, and odds integration
  const generateMatrix = () => {
    // Intégrer l'opportunité de marché et les recommandations IA
    const marketOpportunity = getMarketOpportunity();
    const aiRecommendations = getAIRecommendations();
    
    // Use the real match probabilities with Poisson model
    const poissonInputs = {
      p_home_fair: match.p_home_fair,
      p_draw_fair: match.p_draw_fair,
      p_away_fair: match.p_away_fair,
      p_btts_yes_fair: match.p_btts_yes_fair,
      p_over_2_5_fair: match.p_over_2_5_fair
    };

    const poissonResult = calculatePoisson(poissonInputs);
    
    // AI-enhanced probability adjustment factor based on market opportunity and AI analysis
    const aiConfidenceFactor = (() => {
      let baseFactor = 1.0;
      
      // Ajustement basé sur l'opportunité de marché
      if (marketOpportunity) {
        if (marketOpportunity.impact === 'HIGH') {
          baseFactor *= 1.15; // Augmenter la confiance pour les opportunités premium
        } else if (marketOpportunity.impact === 'MEDIUM') {
          baseFactor *= 1.08; // Ajustement modéré pour les distorsions de marché
        }
      }
      
      // Ajustement basé sur la cohérence des recommandations IA
      const vigorishPenalty = (match.vig_1x2 + match.vig_ou_2_5) / 2;
      const bttsConsistency = Math.abs(match.p_btts_yes_fair - (1 - match.p_btts_no_fair));
      
      // Intégrer les recommandations IA dans le calcul de confiance
      if (aiRecommendations.btts && aiRecommendations.overUnder) {
        baseFactor *= 1.05; // Bonus si les deux recommandations IA sont disponibles
      }
      
      // Lower vigorish + consistent BTTS + AI recommendations = higher confidence
      const finalFactor = baseFactor * Math.max(0.85, 1 - vigorishPenalty - bttsConsistency);
      return Math.min(1.25, finalFactor); // Plafonner à 125%
    })();
    
    const matrix: ScoreCell[][] = [];
    const maxScore = 5;
    const lambdaHome = poissonResult.lambda_home;
    const lambdaAway = poissonResult.lambda_away;
    const rho = poissonResult.rho;
    
    // Factorial helper function
    const factorial = (n: number): number => {
      if (n <= 1) return 1;
      return n * factorial(n - 1);
    };
    
    for (let home = 0; home <= maxScore; home++) {
      const row: ScoreCell[] = [];
      for (let away = 0; away <= maxScore; away++) {
        // Calculate probability using Poisson model
        const poissonHome = Math.exp(-lambdaHome) * Math.pow(lambdaHome, home) / factorial(home);
        const poissonAway = Math.exp(-lambdaAway) * Math.pow(lambdaAway, away) / factorial(away);
        let probability = poissonHome * poissonAway;
        
        // Apply Dixon-Coles adjustment for low scores
        if (home <= 1 && away <= 1) {
          const tau = lambdaHome * lambdaAway;
          
          if (home === 0 && away === 0) {
            probability *= (1 - rho * tau);
          } else if (home === 0 && away === 1) {
            probability *= (1 + rho * lambdaHome);
          } else if (home === 1 && away === 0) {
            probability *= (1 + rho * lambdaAway);
          } else if (home === 1 && away === 1) {
            probability *= (1 - rho);
          }
        }
        
        // Apply AI confidence factor to refine predictions based on market analysis
        probability *= aiConfidenceFactor;
        
        // Ajustement basé sur les recommandations IA pour mettre en évidence certains scores
        let isHighlighted = false;
        let highlightReason = '';
        
        // 1. Ajustement basé sur l'opportunité de marché (double chance)
        if (marketOpportunity?.type === 'DOUBLE_CHANCE') {
          const { doubleChanceTypes } = marketOpportunity;
          
          // Déterminer le résultat de ce score
          let scoreResult = '';
          if (home > away) scoreResult = 'home';
          else if (home === away) scoreResult = 'draw';
          else scoreResult = 'away';
          
          // Si le score correspond à la double chance recommandée
          if (doubleChanceTypes.includes(scoreResult)) {
            probability *= 1.15; // Augmentation significative pour les scores de double chance
            isHighlighted = true;
            highlightReason = 'Double Chance';
          }
        }
        
        // 2. Ajustement basé sur la prédiction 1X2 premium pour marges négatives
        if (marketOpportunity?.type === 'PREMIUM_OPPORTUNITY' && marketOpportunity.marketType === '1X2_NEGATIVE') {
          let scoreResult = '';
          if (home > away) scoreResult = match.home_team;
          else if (home === away) scoreResult = 'Nul';
          else scoreResult = match.away_team;
          
          if (scoreResult === marketOpportunity.prediction) {
            probability *= 1.2; // Augmentation forte pour les opportunités premium
            isHighlighted = true;
            highlightReason = 'Opportunité Premium';
          }
        }
        
        // 3. Ajustement basé sur les recommandations IA BTTS (priorité à la recommandation principale)
        if (aiRecommendations.btts) {
          if (aiRecommendations.btts.prediction === 'Oui' && home > 0 && away > 0) {
            probability *= aiRecommendations.btts.isInverted ? 1.18 : 1.12; // Plus forte pour opportunités détectées
            if (home <= 3 && away <= 3 && !isHighlighted) {
              isHighlighted = true;
              highlightReason = aiRecommendations.btts.isInverted ? 'BTTS Oui (Opportunité)' : 'BTTS Oui';
            }
          } else if (aiRecommendations.btts.prediction === 'Non' && (home === 0 || away === 0)) {
            probability *= aiRecommendations.btts.isInverted ? 1.18 : 1.12; // Plus forte pour opportunités détectées
            if (!isHighlighted) {
              isHighlighted = true;
              highlightReason = aiRecommendations.btts.isInverted ? 'BTTS Non (Opportunité)' : 'BTTS Non';
            }
          }
        } else if (aiRecommendations.bttsAnalysis) {
          // Compléter avec l'analyse des probabilités si pas de recommandation principale contradictoire
          if (aiRecommendations.bttsAnalysis === 'Oui' && home > 0 && away > 0) {
            probability *= 1.05; // Impact moindre pour l'analyse complémentaire
            if (home <= 3 && away <= 3 && !isHighlighted) {
              isHighlighted = true;
              highlightReason = 'Analyse BTTS Oui';
            }
          } else if (aiRecommendations.bttsAnalysis === 'Non' && (home === 0 || away === 0)) {
            probability *= 1.05;
            if (!isHighlighted) {
              isHighlighted = true;
              highlightReason = 'Analyse BTTS Non';
            }
          }
        }
        
        // 4. Ajustement basé sur les recommandations IA Over/Under (priorité à la recommandation principale)
        if (aiRecommendations.overUnder) {
          const totalGoals = home + away;
          if (aiRecommendations.overUnder.prediction === '+2,5 buts' && totalGoals > 2) {
            probability *= aiRecommendations.overUnder.isInverted ? 1.15 : 1.08; // Plus forte pour opportunités détectées
            if (totalGoals >= 3 && totalGoals <= 6 && !isHighlighted) {
              isHighlighted = true;
              highlightReason = aiRecommendations.overUnder.isInverted ? 'Over 2.5 (Opportunité)' : 'Over 2.5';
            }
          } else if (aiRecommendations.overUnder.prediction === '-2,5 buts' && totalGoals <= 2) {
            probability *= aiRecommendations.overUnder.isInverted ? 1.15 : 1.08; // Plus forte pour opportunités détectées
            if (totalGoals <= 2 && !isHighlighted) {
              isHighlighted = true;
              highlightReason = aiRecommendations.overUnder.isInverted ? 'Under 2.5 (Opportunité)' : 'Under 2.5';
            }
          }
        } else if (aiRecommendations.overUnderAnalysis) {
          // Compléter avec l'analyse des probabilités si pas de recommandation principale contradictoire
          const totalGoals = home + away;
          if (aiRecommendations.overUnderAnalysis === '+2,5 buts' && totalGoals > 2) {
            probability *= 1.04; // Impact moindre pour l'analyse complémentaire
            if (totalGoals >= 3 && totalGoals <= 6 && !isHighlighted) {
              isHighlighted = true;
              highlightReason = 'Analyse Over 2.5';
            }
          } else if (aiRecommendations.overUnderAnalysis === '-2,5 buts' && totalGoals <= 2) {
            probability *= 1.04;
            if (totalGoals <= 2 && !isHighlighted) {
              isHighlighted = true;
              highlightReason = 'Analyse Under 2.5';
            }
          }
        }
        
        // 5. Bonus de cohérence si plusieurs facteurs s'alignent
        let coherenceBonus = 0;
        if (marketOpportunity?.type === 'DOUBLE_CHANCE' && aiRecommendations.btts && aiRecommendations.overUnder) {
          // Vérifier la cohérence entre double chance et prédictions IA
          const totalGoals = home + away;
          const bothTeamsScore = home > 0 && away > 0;
          
          let coherenceCount = 0;
          
          // Cohérence BTTS
          if ((aiRecommendations.btts.prediction === 'Oui' && bothTeamsScore) ||
              (aiRecommendations.btts.prediction === 'Non' && !bothTeamsScore)) {
            coherenceCount++;
          }
          
          // Cohérence Over/Under
          if ((aiRecommendations.overUnder.prediction === '+2,5 buts' && totalGoals > 2) ||
              (aiRecommendations.overUnder.prediction === '-2,5 buts' && totalGoals <= 2)) {
            coherenceCount++;
          }
          
          if (coherenceCount >= 2) {
            coherenceBonus = 0.05; // 5% de bonus pour la cohérence totale
          } else if (coherenceCount === 1) {
            coherenceBonus = 0.02; // 2% de bonus pour cohérence partielle
          }
        }
        
        probability *= (1 + coherenceBonus);
        
        row.push({
          homeScore: home,
          awayScore: away,
          probability: probability * 100,
          isHighlighted,
          highlightReason,
        });
      }
      matrix.push(row);
    }

    return matrix;
  };

  const staticMatrix = generateMatrix();

  useEffect(() => {
    if (!isActive) {
      setMatrix([]);
      setAnimationStep(0);
      return;
    }

    const animateMatrix = async () => {
      const totalCells = (staticMatrix.length || 0) * (staticMatrix[0]?.length || 0);
      
      for (let step = 0; step <= totalCells; step++) {
        setAnimationStep(step);
        
        const newMatrix = staticMatrix.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const cellIndex = rowIndex * row.length + colIndex;
            return {
              ...cell,
              probability: cellIndex < step ? cell.probability : 0,
            };
          })
        );
        
        setMatrix(newMatrix);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    };

    animateMatrix();
  }, [isActive, matchId]);

  const getColorIntensity = (probability: number, isHighlighted: boolean = false, highlightReason?: string) => {
    const maxProb = Math.max(...matrix.flat().map(cell => cell.probability));
    const intensity = probability / maxProb;
    
    // Couleurs spéciales pour les scores mis en évidence par différentes raisons
    if (isHighlighted) {
      if (highlightReason === 'Double Chance') {
        if (intensity > 0.8) return 'bg-gradient-to-br from-amber-500 to-amber-600 ring-2 ring-amber-400 shadow-lg';
        if (intensity > 0.6) return 'bg-gradient-to-br from-amber-400 to-amber-500 ring-2 ring-amber-300 shadow-md';
        if (intensity > 0.4) return 'bg-gradient-to-br from-amber-300 to-amber-400 ring-2 ring-amber-200';
        return 'bg-gradient-to-br from-amber-200 to-amber-300 ring-1 ring-amber-100';
      } else if (highlightReason === 'Opportunité Premium') {
        if (intensity > 0.8) return 'bg-gradient-to-br from-red-500 to-red-600 ring-2 ring-red-400 shadow-lg';
        if (intensity > 0.6) return 'bg-gradient-to-br from-red-400 to-red-500 ring-2 ring-red-300 shadow-md';
        if (intensity > 0.4) return 'bg-gradient-to-br from-red-300 to-red-400 ring-2 ring-red-200';
        return 'bg-gradient-to-br from-red-200 to-red-300 ring-1 ring-red-100';
      } else if (highlightReason?.includes('BTTS')) {
        if (intensity > 0.8) return 'bg-gradient-to-br from-blue-500 to-blue-600 ring-2 ring-blue-400 shadow-lg';
        if (intensity > 0.6) return 'bg-gradient-to-br from-blue-400 to-blue-500 ring-2 ring-blue-300 shadow-md';
        if (intensity > 0.4) return 'bg-gradient-to-br from-blue-300 to-blue-400 ring-2 ring-blue-200';
        return 'bg-gradient-to-br from-blue-200 to-blue-300 ring-1 ring-blue-100';
      } else if (highlightReason?.includes('Over') || highlightReason?.includes('Under')) {
        if (intensity > 0.8) return 'bg-gradient-to-br from-emerald-500 to-emerald-600 ring-2 ring-emerald-400 shadow-lg';
        if (intensity > 0.6) return 'bg-gradient-to-br from-emerald-400 to-emerald-500 ring-2 ring-emerald-300 shadow-md';
        if (intensity > 0.4) return 'bg-gradient-to-br from-emerald-300 to-emerald-400 ring-2 ring-emerald-200';
        return 'bg-gradient-to-br from-emerald-200 to-emerald-300 ring-1 ring-emerald-100';
      } else {
        // Couleur générique pour les autres cas
        if (intensity > 0.8) return 'bg-gradient-to-br from-violet-500 to-violet-600 ring-2 ring-violet-400 shadow-lg';
        if (intensity > 0.6) return 'bg-gradient-to-br from-violet-400 to-violet-500 ring-2 ring-violet-300 shadow-md';
        if (intensity > 0.4) return 'bg-gradient-to-br from-violet-300 to-violet-400 ring-2 ring-violet-200';
        return 'bg-gradient-to-br from-violet-200 to-violet-300 ring-1 ring-violet-100';
      }
    }
    
    // Couleurs standards
    if (intensity > 0.8) return 'bg-purple-600';
    if (intensity > 0.6) return 'bg-purple-500';
    if (intensity > 0.4) return 'bg-purple-400';
    if (intensity > 0.2) return 'bg-purple-300';
    if (intensity > 0.1) return 'bg-purple-200';
    return 'bg-purple-100';
  };

  const getMostLikelyScores = () => {
    if (matrix.length === 0) return [];
    return matrix.flat()
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 3);
  };

  const getWinProbabilities = () => {
    if (matrix.length === 0) return { home: 0, draw: 0, away: 0 };
    
    let homeWin = 0, draw = 0, awayWin = 0;
    
    matrix.forEach((row, homeScore) => {
      row.forEach((cell, awayScore) => {
        if (homeScore > awayScore) homeWin += cell.probability;
        else if (homeScore === awayScore) draw += cell.probability;
        else awayWin += cell.probability;
      });
    });
    
    // Normaliser les probabilités pour qu'elles totalisent 100%
    const total = homeWin + draw + awayWin;
    if (total > 0) {
      return { 
        home: (homeWin / total) * 100, 
        draw: (draw / total) * 100, 
        away: (awayWin / total) * 100 
      };
    }
    
    return { home: 0, draw: 0, away: 0 };
  };

  const winProbs = getWinProbabilities();

  return (
    <Card className="p-6 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/50 border-0 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl shadow-lg">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Matrice de Prédiction de Score</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Probabilités pour chaque score exact</p>
        </div>
      </div>

      {/* Matrix Grid */}
      <div className="mb-6">
        <div className="grid grid-cols-7 gap-1 p-4 bg-slate-100 dark:bg-slate-800 rounded-xl">
          {/* Header row */}
          <div className="text-center font-semibold text-xs text-slate-600 dark:text-slate-400"></div>
          {[0, 1, 2, 3, 4, 5].map(score => (
            <div key={score} className="text-center font-semibold text-xs text-slate-600 dark:text-slate-400 p-2">
              {score}
            </div>
          ))}
          
          {/* Matrix rows */}
          {matrix.map((row, homeScore) => (
            <React.Fragment key={homeScore}>
              {/* Row header */}
              <div className="text-center font-semibold text-xs text-slate-600 dark:text-slate-400 p-2">
                {homeScore}
              </div>
              
              {/* Score cells */}
              {row.map((cell, awayScore) => (
                <div
                  key={`${homeScore}-${awayScore}`}
                  className={`
                    relative group cursor-pointer transition-all duration-200 rounded-lg p-2 text-center
                    ${getColorIntensity(cell.probability, cell.isHighlighted, cell.highlightReason)} 
                    hover:scale-110 hover:z-10 hover:shadow-xl
                    ${cell.isHighlighted ? 'animate-pulse' : ''}
                  `}
                  title={`${homeScore}-${awayScore}: ${cell.probability.toFixed(2)}%${cell.isHighlighted ? ` (${cell.highlightReason})` : ''}`}
                >
                  <div className={`text-xs font-bold ${
                    cell.isHighlighted 
                      ? cell.highlightReason === 'Double Chance' ? 'text-amber-900 dark:text-white'
                      : cell.highlightReason === 'Opportunité Premium' ? 'text-red-900 dark:text-white'
                      : cell.highlightReason?.includes('BTTS') ? 'text-blue-900 dark:text-white'
                      : cell.highlightReason?.includes('Over') || cell.highlightReason?.includes('Under') ? 'text-emerald-900 dark:text-white'
                      : 'text-violet-900 dark:text-white'
                      : 'text-purple-900 dark:text-white'
                  }`}>
                    {cell.probability > 0.1 ? cell.probability.toFixed(1) : ''}
                  </div>
                  
                  {/* Indicateur IA avec icône spécifique */}
                  {cell.isHighlighted && (
                    <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center ${
                      cell.highlightReason === 'Double Chance' ? 'bg-amber-500'
                      : cell.highlightReason === 'Opportunité Premium' ? 'bg-red-500'
                      : cell.highlightReason?.includes('BTTS') ? 'bg-blue-500'
                      : cell.highlightReason?.includes('Over') || cell.highlightReason?.includes('Under') ? 'bg-emerald-500'
                      : 'bg-violet-500'
                    }`}>
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>
                    </div>
                  )}
                  
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-20 shadow-xl">
                    <div className="font-semibold">{homeScore}-{awayScore}: {cell.probability.toFixed(2)}%</div>
                    {cell.isHighlighted && (
                      <div className={`font-semibold mt-1 ${
                        cell.highlightReason === 'Double Chance' ? 'text-amber-300'
                        : cell.highlightReason === 'Opportunité Premium' ? 'text-red-300'
                        : cell.highlightReason?.includes('BTTS') ? 'text-blue-300'
                        : cell.highlightReason?.includes('Over') || cell.highlightReason?.includes('Under') ? 'text-emerald-300'
                        : 'text-violet-300'
                      }`}>
                        ✨ {cell.highlightReason}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
          <span>{awayTeam} →</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-purple-100 rounded"></div>
            <span>Faible</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-purple-400 rounded"></div>
            <span>Moyenne</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-purple-600 rounded"></div>
            <span>Élevée</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gradient-to-r from-amber-400 to-amber-500 rounded ring-1 ring-amber-300"></div>
            <span>Double Chance</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gradient-to-r from-red-400 to-red-500 rounded ring-1 ring-red-300"></div>
            <span>Premium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-blue-500 rounded ring-1 ring-blue-300"></div>
            <span>BTTS</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded ring-1 ring-emerald-300"></div>
            <span>O/U 2.5</span>
          </div>
          <span>↑ {homeTeam}</span>
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl border border-indigo-200 dark:border-indigo-800">
          <h4 className="font-semibold text-indigo-700 dark:text-indigo-300 mb-2">Top 3 Scores Probables</h4>
          <div className="space-y-1">
            {getMostLikelyScores().map((score, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">
                  {score.homeScore}-{score.awayScore}
                </span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {score.probability.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-xl border border-purple-200 dark:border-purple-800">
          <h4 className="font-semibold text-purple-700 dark:text-purple-300 mb-2">Probabilités 1X2</h4>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">{homeTeam} gagne</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {winProbs.home.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Match nul</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {winProbs.draw.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">{awayTeam} gagne</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {winProbs.away.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}