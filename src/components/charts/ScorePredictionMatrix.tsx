import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { ProcessedMatch } from '@/types/match';
import { calculatePoisson } from '@/lib/poisson';

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

  // Debug : afficher les recommandations reçues
  console.log('🔍 ScorePredictionMatrix DEBUG:', {
    aiRecommendation,
    secondRecommendation,
    matchId: match.id,
    homeTeam: match.home_team,
    awayTeam: match.away_team
  });

  // LOGIQUE ULTRA-SIMPLE : Analyser directement les recommandations
  const analyzeRecommendations = () => {
    const analysis = {
      over25: false,
      under25: false,
      bttsYes: false,
      bttsNo: false,
      homeWin: false,
      awayWin: false,
      draw: false,
      favoriteTeam: 'none'
    };

    // 1. Recommandation principale IA
    if (aiRecommendation && aiRecommendation.betType !== 'Aucune') {
      if (aiRecommendation.betType === 'O/U 2.5') {
        if (aiRecommendation.prediction === '+2,5 buts') analysis.over25 = true;
        if (aiRecommendation.prediction === '-2,5 buts') analysis.under25 = true;
      }
      if (aiRecommendation.betType === 'BTTS') {
        if (aiRecommendation.prediction === 'Oui') analysis.bttsYes = true;
        if (aiRecommendation.prediction === 'Non') analysis.bttsNo = true;
      }
      if (aiRecommendation.betType === '1X2') {
        if (aiRecommendation.prediction === match.home_team) analysis.homeWin = true;
        if (aiRecommendation.prediction === match.away_team) analysis.awayWin = true;
        if (aiRecommendation.prediction === 'Nul') analysis.draw = true;
      }
    }

    // 2. Seconde recommandation (efficacité marché)
    if (secondRecommendation) {
      if (secondRecommendation.type === 'O/U 2.5') {
        if (secondRecommendation.prediction === '+2,5 buts') analysis.over25 = true;
        if (secondRecommendation.prediction === '-2,5 buts') analysis.under25 = true;
      }
      if (secondRecommendation.type === 'BTTS') {
        if (secondRecommendation.prediction === 'Oui') analysis.bttsYes = true;
        if (secondRecommendation.prediction === 'Non') analysis.bttsNo = true;
      }
      if (secondRecommendation.type === '1X2') {
        if (secondRecommendation.prediction === match.home_team) analysis.homeWin = true;
        if (secondRecommendation.prediction === match.away_team) analysis.awayWin = true;
        if (secondRecommendation.prediction === 'Nul') analysis.draw = true;
      }
    }

    // 3. Déterminer le favori automatiquement si pas de recommandation 1X2
    if (!analysis.homeWin && !analysis.awayWin && !analysis.draw) {
      if (match.p_home_fair > match.p_away_fair && match.p_home_fair > match.p_draw_fair) {
        analysis.favoriteTeam = 'home';
      } else if (match.p_away_fair > match.p_home_fair && match.p_away_fair > match.p_draw_fair) {
        analysis.favoriteTeam = 'away';
      } else {
        analysis.favoriteTeam = 'draw';
      }
    }

    console.log('🎯 ANALYSE FINALE:', analysis);
    return analysis;
  };

  // Générer la matrice avec logique forcée ET NORMALISÉE
  const generateMatrix = () => {
    const analysis = analyzeRecommendations();

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
    
    // Première passe : calculer toutes les probabilités de base
    let totalBaseProbability = 0;
    const baseProbabilities: number[][] = [];
    
    for (let home = 0; home <= maxScore; home++) {
      const row: number[] = [];
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
        
        row.push(probability);
        totalBaseProbability += probability;
      }
      baseProbabilities.push(row);
    }
    
    // Deuxième passe : appliquer la logique de recommandations de façon STRICTE
    let totalAdjustedProbability = 0;
    const adjustedProbabilities: Array<{probability: number, reasons: string[], isValid: boolean}> = [];
    
    for (let home = 0; home <= maxScore; home++) {
      for (let away = 0; away <= maxScore; away++) {
        let probability = baseProbabilities[home][away];
        
        // LOGIQUE STRICTE : Analyser ce score
        const totalGoals = home + away;
        const bothTeamsScore = home > 0 && away > 0;
        const homeWins = home > away;
        const awayWins = away > home;
        const isDraw = home === away;
        
        let reasons: string[] = [];
        let isCompletelyValid = true; // DOIT respecter TOUTES les conditions
        
        // 1. OVER/UNDER 2.5 - CONDITION OBLIGATOIRE si recommandé
        if (analysis.over25 && totalGoals <= 2) {
          isCompletelyValid = false; // ÉLIMINER si ne respecte pas +2,5
        }
        if (analysis.under25 && totalGoals > 2) {
          isCompletelyValid = false; // ÉLIMINER si ne respecte pas -2,5
        }
        
        if (analysis.over25 && totalGoals > 2) {
          reasons.push('+2.5 buts');
        }
        if (analysis.under25 && totalGoals <= 2) {
          reasons.push('-2.5 buts');
        }
        
        // 2. BTTS - CONDITION OBLIGATOIRE si recommandé
        if (analysis.bttsYes && !bothTeamsScore) {
          isCompletelyValid = false;
        }
        if (analysis.bttsNo && bothTeamsScore) {
          isCompletelyValid = false;
        }
        
        if (analysis.bttsYes && bothTeamsScore) {
          reasons.push('BTTS Oui');
        }
        if (analysis.bttsNo && !bothTeamsScore) {
          reasons.push('BTTS Non');
        }
        
        // 3. 1X2 - CONDITION OBLIGATOIRE si recommandé
        if (analysis.homeWin && !homeWins) {
          isCompletelyValid = false;
        }
        if (analysis.awayWin && !awayWins) {
          isCompletelyValid = false;
        }
        if (analysis.draw && !isDraw) {
          isCompletelyValid = false;
        }
        
        if (analysis.homeWin && homeWins) {
          reasons.push(match.home_team);
        }
        if (analysis.awayWin && awayWins) {
          reasons.push(match.away_team);
        }
        if (analysis.draw && isDraw) {
          reasons.push('Nul');
        }
        
        // 4. Favoris automatiques (seulement si aucune recommandation 1X2)
        if (!analysis.homeWin && !analysis.awayWin && !analysis.draw) {
          if (analysis.favoriteTeam === 'home' && homeWins) {
            reasons.push(`${match.home_team} (favori)`);
          }
          if (analysis.favoriteTeam === 'away' && awayWins) {
            reasons.push(`${match.away_team} (favori)`);
          }
          if (analysis.favoriteTeam === 'draw' && isDraw) {
            reasons.push('Nul (favori)');
          }
        }
        
        // APPLIQUER LA LOGIQUE STRICTE
        if (!isCompletelyValid) {
          probability *= 0.001; // Diviser par 1000 les scores invalides
        } else if (reasons.length > 0) {
          // Boost modéré pour les scores valides (pas de multiplicateurs fous)
          probability *= (1 + reasons.length * 0.5); // +50% par raison valide
        }
        
        adjustedProbabilities.push({
          probability,
          reasons,
          isValid: isCompletelyValid && reasons.length > 0
        });
        
        totalAdjustedProbability += probability;
      }
    }
    
    // Troisième passe : NORMALISER pour que la somme = 100%
    let index = 0;
    for (let home = 0; home <= maxScore; home++) {
      const row: ScoreCell[] = [];
      for (let away = 0; away <= maxScore; away++) {
        const adjustedData = adjustedProbabilities[index];
        
        // Normaliser la probabilité
        const normalizedProbability = (adjustedData.probability / totalAdjustedProbability) * 100;
        
        // Déterminer le highlight
        const isHighlighted = adjustedData.isValid;
        const highlightReason = adjustedData.reasons.length > 0 ? 
          (adjustedData.reasons.length > 1 ? `🎯 PARFAIT: ${adjustedData.reasons.join(' + ')}` : `✅ ${adjustedData.reasons[0]}`) : '';
        
        row.push({
          homeScore: home,
          awayScore: away,
          probability: normalizedProbability,
          isHighlighted,
          highlightReason,
        });
        
        index++;
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
      if (highlightReason?.includes('PARFAIT')) {
        if (intensity > 0.8) return 'bg-gradient-to-br from-emerald-500 to-emerald-600 ring-2 ring-emerald-400 shadow-lg text-white';
        if (intensity > 0.6) return 'bg-gradient-to-br from-emerald-400 to-emerald-500 ring-2 ring-emerald-300 shadow-md text-white';
        if (intensity > 0.4) return 'bg-gradient-to-br from-emerald-300 to-emerald-400 ring-2 ring-emerald-200 text-white';
        return 'bg-gradient-to-br from-emerald-200 to-emerald-300 ring-1 ring-emerald-100 text-gray-800';
      }
      
      if (highlightReason?.includes('IA:')) {
        if (intensity > 0.8) return 'bg-gradient-to-br from-brand to-brand-400 ring-2 ring-brand-300 shadow-lg text-white';
        if (intensity > 0.6) return 'bg-gradient-to-br from-brand/80 to-brand-400/80 ring-2 ring-brand-200 shadow-md text-white';
        if (intensity > 0.4) return 'bg-gradient-to-br from-brand/60 to-brand-400/60 ring-2 ring-brand-100 text-white';
        return 'bg-gradient-to-br from-brand/40 to-brand-400/40 ring-1 ring-brand-50 text-gray-800';
      }
      
      if (highlightReason?.includes('Marché:')) {
        if (intensity > 0.8) return 'bg-gradient-to-br from-blue-500 to-blue-600 ring-2 ring-blue-400 shadow-lg text-white';
        if (intensity > 0.6) return 'bg-gradient-to-br from-blue-400 to-blue-500 ring-2 ring-blue-300 shadow-md text-white';
        if (intensity > 0.4) return 'bg-gradient-to-br from-blue-300 to-blue-400 ring-2 ring-blue-200 text-white';
        return 'bg-gradient-to-br from-blue-200 to-blue-300 ring-1 ring-blue-100 text-gray-800';
      }
    }
    
    // Couleurs normales pour les scores non-highlightés
    if (intensity > 0.8) return 'bg-gradient-to-br from-purple-200 to-purple-300 text-gray-800';
    if (intensity > 0.6) return 'bg-gradient-to-br from-purple-100 to-purple-200 text-gray-800';
    if (intensity > 0.4) return 'bg-gradient-to-br from-purple-50 to-purple-100 text-gray-700';
    if (intensity > 0.2) return 'bg-gradient-to-br from-gray-50 to-purple-50 text-gray-600';
    return 'bg-gradient-to-br from-gray-25 to-gray-50 text-gray-500';
  };

  if (!matrix.length) {
    return (
      <Card className="p-8 bg-gradient-to-br from-surface to-surface-soft border-border shadow-lg">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-text mb-2">Matrice de Prédiction de Score</h3>
            <p className="text-text-weak">Calcul des probabilités en cours...</p>
          </div>
        </div>
      </Card>
    );
  }

  // Find top 3 most probable scores
  const allScores = matrix.flat()
    .filter(cell => cell.probability > 0)
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 3);

  return (
    <Card className="p-8 bg-gradient-to-br from-surface to-surface-soft border-border shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-lg">
          <span className="text-2xl">⚽</span>
        </div>
        <div>
          <h3 className="text-xl font-bold text-text">Matrice de Prédiction de Score</h3>
          <p className="text-sm text-text-weak">Probabilités pour chaque score exact</p>
        </div>
      </div>

      {/* Score Matrix */}
      <div className="mb-8">
        <div className="grid grid-cols-7 gap-2 mb-4">
          <div className="p-2"></div>
          {[0, 1, 2, 3, 4, 5].map(away => (
            <div key={away} className="p-2 text-center text-sm font-semibold text-text-weak">
              {away}
            </div>
          ))}
        </div>
        
        {matrix.map((row, homeIndex) => (
          <div key={homeIndex} className="grid grid-cols-7 gap-2 mb-2">
            <div className="p-2 text-center text-sm font-semibold text-text-weak">
              {homeIndex}
            </div>
            {row.map((cell, awayIndex) => (
              <div
                key={`${homeIndex}-${awayIndex}`}
                className={`
                  relative p-3 rounded-lg text-center text-sm font-semibold transition-all duration-300
                  ${getColorIntensity(cell.probability, cell.isHighlighted, cell.highlightReason)}
                  ${cell.isHighlighted ? 'transform scale-105' : ''}
                `}
                title={cell.highlightReason || `${cell.homeScore}-${cell.awayScore}: ${cell.probability.toFixed(1)}%`}
              >
                <div className="text-lg font-bold">
                  {cell.probability.toFixed(1)}
                </div>
                {cell.isHighlighted && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center">
                    <span className="text-xs">⭐</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 text-xs mb-6">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-200 rounded"></div>
          <span className="text-text-weak">{awayTeam} →</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-purple-300 rounded"></div>
          <span className="text-text-weak">Faible</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-purple-500 rounded"></div>
          <span className="text-text-weak">Moyenne</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-purple-700 rounded"></div>
          <span className="text-text-weak">Élevée</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-emerald-500 rounded"></div>
          <span className="text-text-weak">🎯 PARFAIT</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-brand rounded"></div>
          <span className="text-text-weak">✅ IA</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span className="text-text-weak">📊 Marché</span>
        </div>
        <div className="text-text-weak">↑ {homeTeam}</div>
      </div>

      {/* Top 3 Scores and 1X2 Probabilities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top 3 Scores */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
          <h4 className="font-bold text-purple-900 mb-3">Top 3 Scores Probables</h4>
          <div className="space-y-2">
            {allScores.map((score, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="font-medium text-purple-800">
                  {score.homeScore}-{score.awayScore}
                  {score.isHighlighted && <span className="ml-1 text-xs">⭐</span>}
                </span>
                <span className="font-bold text-purple-900">
                  {score.probability.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 1X2 Probabilities */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
          <h4 className="font-bold text-blue-900 mb-3">Probabilités 1X2</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-blue-800">{homeTeam} gagne</span>
              <span className="font-bold text-blue-900">
                {(match.p_home_fair * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-blue-800">Match nul</span>
              <span className="font-bold text-blue-900">
                {(match.p_draw_fair * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-blue-800">{awayTeam} gagne</span>
              <span className="font-bold text-blue-900">
                {(match.p_away_fair * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}