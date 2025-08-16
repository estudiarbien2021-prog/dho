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

// Interface pour les recommandations
interface Recommendation {
  source: 'ai' | 'market' | 'probabilistic';
  type: 'O/U 2.5' | 'BTTS' | '1X2';
  prediction: string;
  multiplier: number;
}

export function ScorePredictionMatrix({ homeTeam, awayTeam, matchId, isActive, match, aiRecommendation, secondRecommendation }: ScorePredictionMatrixProps) {
  const [matrix, setMatrix] = useState<ScoreCell[][]>([]);
  const [animationStep, setAnimationStep] = useState(0);

  // DEBUG CRITIQUE : Afficher TOUS les props reçus
  console.log('🚨 PROPS COMPLETS REÇUS:', {
    homeTeam,
    awayTeam, 
    matchId,
    aiRecommendation: JSON.stringify(aiRecommendation),
    secondRecommendation: JSON.stringify(secondRecommendation),
    'aiRecommendation.type': aiRecommendation?.type,
    'aiRecommendation.betType': aiRecommendation?.betType,
    'aiRecommendation.prediction': aiRecommendation?.prediction,
    'secondRecommendation.type': secondRecommendation?.type,
    'secondRecommendation.prediction': secondRecommendation?.prediction
  });

  // Collecte TOUTES les recommandations disponibles
  const getAllRecommendations = (): Recommendation[] => {
    const recommendations: Recommendation[] = [];

    // Fonction utilitaire pour mapper les types de paris
    const mapBetType = (betType: string): 'O/U 2.5' | 'BTTS' | '1X2' | null => {
      if (betType === 'O/U 2.5') return 'O/U 2.5';
      if (betType === 'BTTS') return 'BTTS';
      if (betType === '1X2' || betType === 'Double Chance') return '1X2';
      // Autres mappings possibles
      if (betType === 'Over/Under 2.5' || betType === 'Over/Under') return 'O/U 2.5';
      if (betType === 'Both Teams To Score') return 'BTTS';
      return null;
    };

    // 1. IA PRINCIPALE (x3.0)
    if (aiRecommendation && aiRecommendation.betType !== 'Aucune') {
      console.log('🔍 DEBUG aiRecommendation structure:', {
        aiRecommendation,
        betType: aiRecommendation.betType,
        type: aiRecommendation.type, // Nouvelle propriété détectée
        betTypeType: typeof aiRecommendation.betType,
        prediction: aiRecommendation.prediction
      });

      // Handle different betType structures - try both betType and type
      let betTypeString = '';
      if (typeof aiRecommendation.betType === 'string') {
        betTypeString = aiRecommendation.betType;
      } else if (aiRecommendation.type && typeof aiRecommendation.type === 'string') {
        betTypeString = aiRecommendation.type; // Utiliser la propriété 'type'
      } else if (aiRecommendation.betType && aiRecommendation.betType.value) {
        betTypeString = aiRecommendation.betType.value;
      } else if (aiRecommendation.betType && aiRecommendation.betType._type) {
        betTypeString = aiRecommendation.betType._type;
      }

      // Extract prediction information to deduce bet type
      const predictionText = aiRecommendation.prediction || '';
      
      // Try to deduce bet type from prediction if betType is undefined
      if (!betTypeString || betTypeString === 'undefined') {
        if (predictionText.includes('2,5') || predictionText.includes('2.5') || 
            predictionText.includes('SOUS') || predictionText.includes('SUR') ||
            predictionText.includes('OVER') || predictionText.includes('UNDER') ||
            predictionText.toLowerCase().includes('buts')) {
          betTypeString = 'O/U 2.5';
        } else if (predictionText.includes('BTTS') || predictionText.includes('Oui') || predictionText.includes('Non')) {
          betTypeString = 'BTTS';
        } else if (predictionText.includes('1X') || predictionText.includes('X2') || predictionText.includes('12')) {
          betTypeString = 'Double Chance';
        } else if (predictionText.includes('Botafogo') || predictionText.includes('LDU') || predictionText.includes('Inter Miami') || predictionText.includes('Huntsville')) {
          betTypeString = '1X2';
        }
        console.log('🔍 DEDUCED betType from prediction:', betTypeString, 'from:', predictionText);
      }

      const mappedType = mapBetType(betTypeString);
      if (mappedType) {
        recommendations.push({
          source: 'ai',
          type: mappedType,
          prediction: aiRecommendation.prediction,
          multiplier: 3.0
        });
        console.log('🎯 IA PRINCIPALE AJOUTÉE:', {
          originalType: betTypeString,
          mappedType,
          prediction: aiRecommendation.prediction
        });
      } else {
        console.warn('⚠️ TYPE IA NON RECONNU:', {
          betTypeString,
          originalBetType: aiRecommendation.betType,
          originalType: aiRecommendation.type,
          prediction: aiRecommendation.prediction
        });
      }
    }

    // 2. EFFICACITÉ MARCHÉ (x3.0)
    if (secondRecommendation) {
      const mappedType = mapBetType(secondRecommendation.type);
      if (mappedType) {
        recommendations.push({
          source: 'market', 
          type: mappedType,
          prediction: secondRecommendation.prediction,
          multiplier: 3.0
        });
        console.log('📊 MARCHÉ AJOUTÉ:', {
          originalType: secondRecommendation.type,
          mappedType,
          prediction: secondRecommendation.prediction
        });
      }
    }

    // 3. ANALYSES PROBABILISTES (x0.25) - seulement si un marché manque
    const hasOU25 = recommendations.some(r => r.type === 'O/U 2.5');
    const hasBTTS = recommendations.some(r => r.type === 'BTTS');
    const has1X2 = recommendations.some(r => r.type === '1X2');

    if (!hasOU25) {
      // Ajouter recommandation O/U basée sur probabilités
      if (match.p_over_2_5_fair > 0.55) {
        recommendations.push({
          source: 'probabilistic',
          type: 'O/U 2.5',
          prediction: '+2,5 buts',
          multiplier: 0.25
        });
      } else if (match.p_over_2_5_fair < 0.45) {
        recommendations.push({
          source: 'probabilistic',
          type: 'O/U 2.5', 
          prediction: '-2,5 buts',
          multiplier: 0.25
        });
      }
    }

    if (!hasBTTS) {
      // Ajouter recommandation BTTS basée sur probabilités
      if (match.p_btts_yes_fair > 0.55) {
        recommendations.push({
          source: 'probabilistic',
          type: 'BTTS',
          prediction: 'Oui',
          multiplier: 0.25
        });
      } else if (match.p_btts_yes_fair < 0.45) {
        recommendations.push({
          source: 'probabilistic',
          type: 'BTTS',
          prediction: 'Non',
          multiplier: 0.25
        });
      }
    }

    if (!has1X2) {
      // Ajouter recommandation 1X2 basée sur probabilités
      const maxProb = Math.max(match.p_home_fair, match.p_draw_fair, match.p_away_fair);
      if (maxProb > 0.4) {
        if (match.p_home_fair === maxProb) {
          recommendations.push({
            source: 'probabilistic',
            type: '1X2',
            prediction: match.home_team,
            multiplier: 0.25
          });
        } else if (match.p_away_fair === maxProb) {
          recommendations.push({
            source: 'probabilistic',
            type: '1X2',
            prediction: match.away_team,
            multiplier: 0.25
          });
        } else {
          recommendations.push({
            source: 'probabilistic',
            type: '1X2',
            prediction: 'Nul',
            multiplier: 0.25
          });
        }
      }
    }

    console.log('🔍 TOUTES LES RECOMMANDATIONS COLLECTÉES:', recommendations);
    return recommendations;
  };

  // Évalue la cohérence d'un score avec toutes les recommandations
  const evaluateScoreCoherence = (homeScore: number, awayScore: number, recommendations: Recommendation[]) => {
    const totalGoals = homeScore + awayScore;
    const bothTeamsScore = homeScore > 0 && awayScore > 0;
    const homeWins = homeScore > awayScore;
    const awayWins = awayScore > homeScore;
    const isDraw = homeScore === awayScore;

    let totalMultiplier = 1.0;
    const coherentRecommendations: string[] = [];

    console.log(`🔍 ÉVALUATION SCORE ${homeScore}-${awayScore}:`, {
      totalGoals,
      bothTeamsScore,
      homeWins,
      awayWins,
      isDraw,
      recommendations: recommendations.map(r => `${r.source}:${r.type}:${r.prediction}`)
    });

    recommendations.forEach(rec => {
      let isCoherent = false;

      if (rec.type === 'O/U 2.5') {
        if (rec.prediction.includes('+2,5') || rec.prediction.includes('SUR') || rec.prediction.includes('OVER')) {
          isCoherent = totalGoals > 2; // Plus de 2.5 buts
          console.log(`  🎯 O/U 2.5 OVER: ${totalGoals} > 2 = ${isCoherent}`);
        } else if (rec.prediction.includes('-2,5') || rec.prediction.includes('SOUS') || rec.prediction.includes('UNDER')) {
          isCoherent = totalGoals <= 2; // 2.5 buts ou moins
          console.log(`  🎯 O/U 2.5 UNDER: ${totalGoals} <= 2 = ${isCoherent}`);
        }
      } else if (rec.type === 'BTTS') {
        if (rec.prediction === 'Oui' || rec.prediction.includes('Oui')) {
          isCoherent = bothTeamsScore; // Les deux équipes marquent
          console.log(`  🎯 BTTS OUI: ${homeScore} > 0 && ${awayScore} > 0 = ${isCoherent}`);
        } else if (rec.prediction === 'Non' || rec.prediction.includes('Non')) {
          isCoherent = !bothTeamsScore; // Au moins une équipe ne marque pas
          console.log(`  🎯 BTTS NON: !bothTeamsScore = ${isCoherent}`);
        }
      } else if (rec.type === '1X2') {
        // Gestion spécifique des prédictions 1X2 et Double Chance
        const prediction = rec.prediction.toLowerCase();
        
        if (rec.prediction === match.home_team) {
          isCoherent = homeWins;
          console.log(`  🎯 1X2 HOME: ${match.home_team} wins = ${isCoherent}`);
        } else if (rec.prediction === match.away_team) {
          isCoherent = awayWins;
          console.log(`  🎯 1X2 AWAY: ${match.away_team} wins = ${isCoherent}`);
        } else if (rec.prediction === 'Nul' || prediction.includes('nul')) {
          isCoherent = isDraw;
          console.log(`  🎯 1X2 DRAW: ${isDraw} = ${isCoherent}`);
        } else if (rec.prediction === '1X' || prediction.includes('1x')) {
          // Double Chance 1X = Domicile gagne OU Match nul
          isCoherent = homeWins || isDraw;
          console.log(`  🎯 DOUBLE CHANCE 1X: (${homeWins} || ${isDraw}) = ${isCoherent}`);
        } else if (rec.prediction === 'X2' || prediction.includes('x2') || prediction.includes('double chance x2')) {
          // Double Chance X2 = Match nul OU Extérieur gagne  
          isCoherent = isDraw || awayWins;
          console.log(`  🎯 DOUBLE CHANCE X2: (${isDraw} || ${awayWins}) = ${isCoherent} - Score ${homeScore}-${awayScore}`);
        } else if (rec.prediction === '12' || prediction.includes('12')) {
          // Double Chance 12 = Domicile gagne OU Extérieur gagne
          isCoherent = homeWins || awayWins;
          console.log(`  🎯 DOUBLE CHANCE 12: (${homeWins} || ${awayWins}) = ${isCoherent}`);
        } else {
          console.log(`  ⚠️ PRÉDICTION 1X2 NON RECONNUE: "${rec.prediction}"`);
        }
      }

      if (isCoherent) {
        totalMultiplier *= rec.multiplier;
        coherentRecommendations.push(`${rec.source}:${rec.type}`);
        console.log(`  ✅ COHÉRENT: ${rec.source}:${rec.type} (x${rec.multiplier})`);
      } else {
        console.log(`  ❌ INCOHÉRENT: ${rec.source}:${rec.type}`);
      }
    });

    // BONUS COHÉRENCE MULTIPLE
    if (coherentRecommendations.length >= 3) {
      totalMultiplier *= 2.0; // x2.0 pour 3+ cohérences
    } else if (coherentRecommendations.length === 2) {
      totalMultiplier *= 1.5; // x1.5 pour 2 cohérences
    }

    console.log(`  🏆 RÉSULTAT ${homeScore}-${awayScore}: multiplier=${totalMultiplier.toFixed(2)}, cohérences=${coherentRecommendations.length}`);
    
    return {
      multiplier: totalMultiplier,
      coherentRecommendations,
      coherenceLevel: coherentRecommendations.length
    };
  };

  // Générer la matrice avec nouvelle logique de recommandations
  const generateMatrix = () => {
    const recommendations = getAllRecommendations();

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
    
    // Première passe : calculer toutes les probabilités de base avec Poisson
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
    
    // Deuxième passe : créer un système de scoring basé sur la cohérence pure
    const scoreResults: Array<{
      probability: number;
      coherenceLevel: number;
      coherentRecommendations: string[];
      highlightReason: string;
      baseProbability: number;
      coherenceScore: number;
    }> = [];
    
    // Calculer les scores de cohérence pour tous les scores possibles
    const coherenceScores: number[] = [];
    for (let home = 0; home <= maxScore; home++) {
      for (let away = 0; away <= maxScore; away++) {
        const coherenceResult = evaluateScoreCoherence(home, away, recommendations);
        
        // Créer un score de cohérence basé sur le niveau et les multiplicateurs
        let coherenceScore = 0;
        if (coherenceResult.coherenceLevel >= 3) {
          coherenceScore = 1000; // Score maximum pour 3+ cohérences
        } else if (coherenceResult.coherenceLevel === 2) {
          coherenceScore = 100; // Score élevé pour 2 cohérences
        } else if (coherenceResult.coherenceLevel === 1) {
          // Score variable selon la source de la cohérence
          const hasAI = coherenceResult.coherentRecommendations.some(r => r.startsWith('ai:'));
          const hasMarket = coherenceResult.coherentRecommendations.some(r => r.startsWith('market:'));
          if (hasAI) coherenceScore = 30; // IA principale
          else if (hasMarket) coherenceScore = 30; // Marché
          else coherenceScore = 10; // Probabiliste seul
        } else {
          coherenceScore = 1; // Score minimal pour incohérent
        }
        
        // Ajouter un bonus basé sur la probabilité Poisson pour départager
        const poissonBonus = baseProbabilities[home][away] * 10;
        coherenceScore += poissonBonus;
        
        coherenceScores.push(coherenceScore);
      }
    }
    
    // Normaliser les scores de cohérence en probabilités
    const totalCoherenceScore = coherenceScores.reduce((sum, score) => sum + score, 0);
    
    let index = 0;
    for (let home = 0; home <= maxScore; home++) {
      for (let away = 0; away <= maxScore; away++) {
        const coherenceResult = evaluateScoreCoherence(home, away, recommendations);
        const baseProbability = baseProbabilities[home][away];
        const coherenceScore = coherenceScores[index];
        const finalProbability = coherenceScore / totalCoherenceScore;
        
        // DEBUG pour les scores clés
        if ((home === 1 && away === 0) || (home === 0 && away === 0) || 
            (home === 1 && away === 1) || (home === 2 && away === 1) || 
            (home === 2 && away === 2) || (home === 3 && away === 1)) {
          console.log(`🔍 NOUVEAU SYSTÈME ${home}-${away}:`, {
            coherenceLevel: coherenceResult.coherenceLevel,
            coherenceScore,
            baseProbability,
            finalProbability: (finalProbability * 100).toFixed(2) + '%',
            coherentRecs: coherenceResult.coherentRecommendations
          });
        }
        
        // Générer la raison d'highlight
        let highlightReason = '';
        if (coherenceResult.coherenceLevel >= 3) {
          highlightReason = `🎯 PARFAIT: ${coherenceResult.coherentRecommendations.map(r => {
            const [source, type] = r.split(':');
            if (source === 'ai') return '✅ IA';
            if (source === 'market') return '📊 Marché';
            return '📈 Probabiliste';
          }).join(' + ')}`;
        } else if (coherenceResult.coherenceLevel === 2) {
          highlightReason = `⭐ EXCELLENT: ${coherenceResult.coherentRecommendations.map(r => {
            const [source, type] = r.split(':');
            if (source === 'ai') return '✅ IA';
            if (source === 'market') return '📊 Marché';
            return '📈 Probabiliste';
          }).join(' + ')}`;
        } else if (coherenceResult.coherenceLevel === 1) {
          const [source, type] = coherenceResult.coherentRecommendations[0].split(':');
          if (source === 'ai') {
            highlightReason = '✅ IA';
          } else if (source === 'market') {
            highlightReason = '📊 Marché';
          } else {
            highlightReason = '📈 Probabiliste';
          }
        }
        
        scoreResults.push({
          probability: finalProbability,
          coherenceLevel: coherenceResult.coherenceLevel,
          coherentRecommendations: coherenceResult.coherentRecommendations,
          highlightReason,
          baseProbability,
          coherenceScore
        });
        
        index++;
      }
    }
    
    // Troisième passe : construire la matrice finale
    let matrixIndex = 0;
    for (let home = 0; home <= maxScore; home++) {
      const row: ScoreCell[] = [];
      for (let away = 0; away <= maxScore; away++) {
        const result = scoreResults[matrixIndex];
        
        // Les probabilités sont déjà normalisées dans le système de cohérence
        const normalizedProbability = result.probability * 100;
        
        row.push({
          homeScore: home,
          awayScore: away,
          probability: normalizedProbability,
          isHighlighted: result.coherenceLevel > 0,
          highlightReason: result.highlightReason,
        });
        
        matrixIndex++;
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

  // CRITICAL DEBUG: Vérifier les scores aberrants
  console.log('🔍 TOP SCORES DEBUG:', {
    matchId,
    homeTeam: match.home_team,
    awayTeam: match.away_team,
    allScores: allScores.map(s => ({
      homeScore: s.homeScore,
      awayScore: s.awayScore,
      probability: s.probability.toFixed(2),
      formatted: `${s.homeScore}-${s.awayScore}`
    })),
    matrixSize: matrix.length,
    totalCells: matrix.flat().length,
    nonZeroCells: matrix.flat().filter(c => c.probability > 0).length
  });

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