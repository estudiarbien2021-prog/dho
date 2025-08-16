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
  aiRecommendation?: any; // Recommandation principale de l'IA du modal
  secondRecommendation?: any; // Seconde recommandation du modal
}

interface ScoreCell {
  homeScore: number;
  awayScore: number;
  probability: number;
  isHighlighted: boolean;
  highlightReason?: string;
}

export function ScorePredictionMatrix({ homeTeam, awayTeam, matchId, isActive, match, aiRecommendation, secondRecommendation }: ScorePredictionMatrixProps) {
  const [matrix, setMatrix] = useState<ScoreCell[][]>([]);
  const [animationStep, setAnimationStep] = useState(0);

  // NOUVELLE LOGIQUE : Évaluer la cohérence d'un score avec toutes les recommandations
  const evaluateScoreCoherence = (homeScore: number, awayScore: number, recommendations: any[]) => {
    const totalGoals = homeScore + awayScore;
    const bothTeamsScore = homeScore > 0 && awayScore > 0;
    
    // Déterminer le résultat de ce score
    let scoreResult = '';
    if (homeScore > awayScore) scoreResult = match.home_team;
    else if (homeScore === awayScore) scoreResult = 'Nul';
    else scoreResult = match.away_team;
    
    let coherentRecommendations = [];
    let totalBoost = 1.0;
    
    // Analyser chaque recommandation
    recommendations.forEach(rec => {
      let isCoherent = false;
      let boost = 1.0;
      
      // Déterminer la cohérence selon le type
      if (rec.type === 'O/U 2.5') {
        if (rec.prediction === '+2,5 buts' && totalGoals > 2) isCoherent = true;
        if (rec.prediction === '-2,5 buts' && totalGoals <= 2) isCoherent = true;
      }
      else if (rec.type === 'BTTS') {
        if (rec.prediction === 'Oui' && bothTeamsScore) isCoherent = true;
        if (rec.prediction === 'Non' && !bothTeamsScore) isCoherent = true;
      }
      else if (rec.type === '1X2') {
        if (scoreResult === rec.prediction) isCoherent = true;
      }
      
      // Calculer le boost selon la source et la priorité
      if (isCoherent) {
        if (rec.source === 'IA_PRINCIPALE') boost = 3.0; // Boost maximal
        else if (rec.source === 'EFFICACITE_MARCHE') boost = 2.5; // Boost élevé
        else if (rec.source === 'ANALYSE_PROBABILITE') boost = 1.8; // Boost modéré
        
        coherentRecommendations.push({
          ...rec,
          boost
        });
        totalBoost *= boost;
      }
    });
    
    // Bonus de cohérence multiple
    if (coherentRecommendations.length >= 3) {
      totalBoost *= 2.0; // Double bonus pour cohérence totale
    } else if (coherentRecommendations.length >= 2) {
      totalBoost *= 1.5; // Bonus pour cohérence multiple
    }
    
    return {
      coherentRecommendations,
      totalBoost,
      coherenceCount: coherentRecommendations.length
    };
  };

  // Debug : afficher les recommandations reçues
  console.log('🔍 ScorePredictionMatrix DEBUG:', {
    aiRecommendation,
    secondRecommendation,
    matchId: match.id,
    homeTeam: match.home_team,
    awayTeam: match.away_team
  });

  // NOUVELLE LOGIQUE : Collecter TOUTES les recommandations disponibles
  const getAllRecommendations = () => {
    const recommendations = [];
    
    // 1. Recommandation principale de l'IA
    if (aiRecommendation && aiRecommendation.betType !== 'Aucune') {
      recommendations.push({
        source: 'IA_PRINCIPALE',
        type: aiRecommendation.betType,
        prediction: aiRecommendation.prediction,
        confidence: 'high',
        priority: 1
      });
    }
    
    // 2. Seconde recommandation (faible vigorish)
    if (secondRecommendation) {
      recommendations.push({
        source: 'EFFICACITE_MARCHE',
        type: secondRecommendation.type,
        prediction: secondRecommendation.prediction,
        confidence: 'medium',
        priority: 2,
        vigorish: secondRecommendation.vigorish
      });
    }
    
    // 3. Déterminer le vainqueur le plus probable (1X2) si pas déjà recommandé
    const hasWinnerRecommendation = recommendations.some(r => r.type === '1X2');
    if (!hasWinnerRecommendation) {
      const mostProbable1X2 = Math.max(match.p_home_fair, match.p_draw_fair, match.p_away_fair);
      let winner = '';
      if (mostProbable1X2 === match.p_home_fair) winner = match.home_team;
      else if (mostProbable1X2 === match.p_away_fair) winner = match.away_team;
      else winner = 'Nul';
      
      // Ajouter seulement si la probabilité est significative (>40%)
      if (mostProbable1X2 > 0.4) {
        recommendations.push({
          source: 'ANALYSE_PROBABILITE',
          type: '1X2',
          prediction: winner,
          confidence: 'low',
          priority: 3,
          probability: mostProbable1X2
        });
      }
    }
    
    // 4. BTTS le plus probable si pas déjà recommandé
    const hasBTTSRecommendation = recommendations.some(r => r.type === 'BTTS');
    if (!hasBTTSRecommendation) {
      const mostProbableBTTS = Math.max(match.p_btts_yes_fair, match.p_btts_no_fair);
      const bttsPrediction = mostProbableBTTS === match.p_btts_yes_fair ? 'Oui' : 'Non';
      
      // Ajouter seulement si la probabilité est significative (>55%) 
      if (mostProbableBTTS > 0.55) {
        recommendations.push({
          source: 'ANALYSE_PROBABILITE',
          type: 'BTTS',
          prediction: bttsPrediction,
          confidence: 'low',
          priority: 4,
          probability: mostProbableBTTS
        });
      }
    }
    
    console.log('🎯 Toutes les recommandations collectées:', recommendations);
    return recommendations;
  };

  // Generate probability matrix using real match data with Poisson model
  // NOUVELLE APPROCHE : Se baser sur les recommandations collectées
  const generateMatrix = () => {
    // Collecter toutes les recommandations disponibles
    const allRecommendations = getAllRecommendations();
    
    console.log('🎯 Génération matrice avec recommandations:', allRecommendations);

    // Use the real match probabilities with Poisson model
    const poissonInputs = {
      p_home_fair: match.p_home_fair,
      p_draw_fair: match.p_draw_fair,
      p_away_fair: match.p_away_fair,
      p_btts_yes_fair: match.p_btts_yes_fair,
      p_over_2_5_fair: match.p_over_2_5_fair
    };

    const poissonResult = calculatePoisson(poissonInputs);
    
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
        // Calculate base probability using Poisson model
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
        
        // NOUVELLE LOGIQUE : Évaluer la cohérence avec toutes les recommandations
        const coherenceResult = evaluateScoreCoherence(home, away, allRecommendations);
        
        // Appliquer le boost de cohérence
        probability *= coherenceResult.totalBoost;
        
        // Déterminer le highlight et la raison
        let isHighlighted = false;
        let highlightReason = '';
        
        if (coherenceResult.coherenceCount >= 3) {
          isHighlighted = true;
          const sources = coherenceResult.coherentRecommendations.map(r => {
            if (r.type === '1X2') return r.prediction;
            if (r.type === 'BTTS') return `BTTS ${r.prediction}`;
            if (r.type === 'O/U 2.5') return r.prediction;
            return r.type;
          }).join(' + ');
          highlightReason = `🎯 PARFAIT: ${sources}`;
        }
        else if (coherenceResult.coherenceCount >= 2) {
          isHighlighted = true;
          const sources = coherenceResult.coherentRecommendations.map(r => {
            if (r.type === '1X2') return r.prediction;
            if (r.type === 'BTTS') return `BTTS ${r.prediction}`;
            if (r.type === 'O/U 2.5') return r.prediction;
            return r.type;
          }).join(' + ');
          highlightReason = `⭐ EXCELLENT: ${sources}`;
        }
        else if (coherenceResult.coherenceCount === 1) {
          const cr = coherenceResult.coherentRecommendations[0];
          if (cr.source === 'IA_PRINCIPALE') {
            isHighlighted = true;
            if (cr.type === '1X2') highlightReason = `✅ IA: ${cr.prediction}`;
            else if (cr.type === 'BTTS') highlightReason = `✅ IA: BTTS ${cr.prediction}`;
            else if (cr.type === 'O/U 2.5') highlightReason = `✅ IA: ${cr.prediction}`;
          }
          else if (cr.source === 'EFFICACITE_MARCHE') {
            isHighlighted = true;
            if (cr.type === '1X2') highlightReason = `📊 Marché: ${cr.prediction}`;
            else if (cr.type === 'BTTS') highlightReason = `📊 Marché: BTTS ${cr.prediction}`;
            else if (cr.type === 'O/U 2.5') highlightReason = `📊 Marché: ${cr.prediction}`;
          }
        }
        
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