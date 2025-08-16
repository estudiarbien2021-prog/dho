import React from 'react';
import { ProcessedMatch } from '@/types/match';
import { PoissonInputs, calculatePoisson } from '@/lib/poisson';

interface ScorePredictionMatrixProps {
  match: ProcessedMatch;
  homeTeam?: string; // Compatibilité
  awayTeam?: string; // Compatibilité
  matchId?: string; // Compatibilité
  isActive?: boolean; // Compatibilité
  aiRecommendation?: any; // Garder la compatibilité avec l'ancien format
  secondRecommendation?: any; // Compatibilité
  thirdRecommendation?: any; // Compatibilité
  allRecommendations?: any[]; // Compatibilité
  marketRecommendations?: { type: string; prediction: string; confidence: number }[];
}

interface ScoreData {
  score: string;
  probability: number;
  multiplier: number;
  coherentRecommendations: string[];
}

interface Recommendation {
  source: 'AI' | 'Market' | 'Probabilistic';
  type: 'Double_Chance' | '1X2' | 'O_U_2_5' | 'BTTS';
  prediction: string;
  weight: number;
}

const ScorePredictionMatrix: React.FC<ScorePredictionMatrixProps> = ({ 
  match, 
  aiRecommendation,
  secondRecommendation,
  allRecommendations,
  marketRecommendations = []
}) => {
  
  // Parser les recommandations AI depuis le popup detail
  const parseAIRecommendations = (aiRec?: any): Recommendation[] => {
    if (!aiRec) return [];
    
    const recommendations: Recommendation[] = [];
    
    // Gérer différents formats d'entrée (string ou objet)
    let aiText = '';
    if (typeof aiRec === 'string') {
      aiText = aiRec;
    } else if (aiRec.prediction) {
      aiText = aiRec.prediction;
    } else {
      console.log('🤖 Format AI recommendation non reconnu:', aiRec);
      return [];
    }
    
    const parts = aiText.split(',').map(p => p.trim().toUpperCase());
    
    console.log('🤖 Parsing AI recommendations:', parts);
    
    for (const part of parts) {
      // Double Chance
      if (part.includes('1X')) {
        recommendations.push({
          source: 'AI',
          type: 'Double_Chance',
          prediction: '1X',
          weight: 3.0
        });
      } else if (part.includes('X2')) {
        recommendations.push({
          source: 'AI',
          type: 'Double_Chance', 
          prediction: 'X2',
          weight: 3.0
        });
      } else if (part.includes('12')) {
        recommendations.push({
          source: 'AI',
          type: 'Double_Chance',
          prediction: '12', 
          weight: 3.0
        });
      }
      
      // O/U 2.5
      if (part.includes('OVER') || part.includes('+2.5') || part.includes('+2,5')) {
        recommendations.push({
          source: 'AI',
          type: 'O_U_2_5',
          prediction: 'OVER_2_5',
          weight: 3.0
        });
      } else if (part.includes('UNDER') || part.includes('-2.5') || part.includes('-2,5')) {
        recommendations.push({
          source: 'AI', 
          type: 'O_U_2_5',
          prediction: 'UNDER_2_5',
          weight: 3.0
        });
      }
      
      // BTTS
      if (part.includes('BTTS') && (part.includes('OUI') || part.includes('YES'))) {
        recommendations.push({
          source: 'AI',
          type: 'BTTS',
          prediction: 'BTTS_OUI',
          weight: 3.0
        });
      } else if (part.includes('BTTS') && (part.includes('NON') || part.includes('NO'))) {
        recommendations.push({
          source: 'AI',
          type: 'BTTS', 
          prediction: 'BTTS_NON',
          weight: 3.0
        });
      }
      
      // 1X2 explicite
      if (part === '1' || part === 'HOME') {
        recommendations.push({
          source: 'AI',
          type: '1X2',
          prediction: 'HOME',
          weight: 3.0
        });
      } else if (part === 'X' || part === 'DRAW') {
        recommendations.push({
          source: 'AI',
          type: '1X2',
          prediction: 'DRAW', 
          weight: 3.0
        });
      } else if (part === '2' || part === 'AWAY') {
        recommendations.push({
          source: 'AI',
          type: '1X2',
          prediction: 'AWAY',
          weight: 3.0
        });
      }
    }
    
    console.log('🤖 AI recommendations parsed:', recommendations);
    return recommendations;
  };

  // Parser les recommandations Market depuis le popup detail
  const parseMarketRecommendations = (marketRecs: { type: string; prediction: string; confidence: number }[]): Recommendation[] => {
    console.log('📈 Parsing Market recommendations:', marketRecs);
    
    return marketRecs.map(rec => ({
      source: 'Market' as const,
      type: rec.type.replace(/\s+/g, '_') as any,
      prediction: rec.prediction.replace(/\s+/g, '_').toUpperCase(),
      weight: 3.0
    }));
  };

  // Générer automatiquement les recommandations probabilistiques
  const generateProbabilisticRecommendations = (): Recommendation[] => {
    const recommendations: Recommendation[] = [];
    
    console.log('📊 Generating probabilistic recommendations...');
    console.log('BTTS probabilities:', { yes: match.p_btts_yes_fair, no: match.p_btts_no_fair });
    console.log('O/U probabilities:', { over: match.p_over_2_5_fair, under: match.p_under_2_5_fair });
    
    // BTTS automatique si différence > 4%
    const bttsYesProbability = match.p_btts_yes_fair;
    const bttsNoProbability = match.p_btts_no_fair;
    const bttsDifference = Math.abs(bttsYesProbability - bttsNoProbability);
    
    if (bttsDifference > 0.04) {
      if (bttsYesProbability > bttsNoProbability) {
        recommendations.push({
          source: 'Probabilistic',
          type: 'BTTS',
          prediction: 'BTTS_OUI',
          weight: 0.25
        });
        console.log('📊 Added probabilistic BTTS OUI');
      } else {
        recommendations.push({
          source: 'Probabilistic',
          type: 'BTTS',
          prediction: 'BTTS_NON',
          weight: 0.25
        });
        console.log('📊 Added probabilistic BTTS NON');
      }
    }
    
    // O/U 2.5 automatique si différence > 4%
    const overProbability = match.p_over_2_5_fair;
    const underProbability = match.p_under_2_5_fair;
    const ouDifference = Math.abs(overProbability - underProbability);
    
    if (ouDifference > 0.04) {
      if (overProbability > underProbability) {
        recommendations.push({
          source: 'Probabilistic',
          type: 'O_U_2_5',
          prediction: 'OVER_2_5',
          weight: 0.25
        });
        console.log('📊 Added probabilistic OVER 2.5');
      } else {
        recommendations.push({
          source: 'Probabilistic',
          type: 'O_U_2_5', 
          prediction: 'UNDER_2_5',
          weight: 0.25
        });
        console.log('📊 Added probabilistic UNDER 2.5');
      }
    }
    
    return recommendations;
  };

  // Vérifier la cohérence d'un score avec une recommandation
  const isScoreCoherentWithRecommendation = (homeGoals: number, awayGoals: number, rec: Recommendation): boolean => {
    const totalGoals = homeGoals + awayGoals;
    const bothTeamsScore = homeGoals > 0 && awayGoals > 0;
    const homeWins = homeGoals > awayGoals;
    const awayWins = awayGoals > homeGoals;
    const isDraw = homeGoals === awayGoals;
    
    switch (rec.type) {
      case 'Double_Chance':
        switch (rec.prediction) {
          case '1X': return homeWins || isDraw;  // Home ou Draw
          case 'X2': return isDraw || awayWins;  // Draw ou Away  
          case '12': return homeWins || awayWins; // Home ou Away
          default: return false;
        }
        
      case '1X2':
        switch (rec.prediction) {
          case 'HOME': return homeWins;
          case 'DRAW': return isDraw;
          case 'AWAY': return awayWins;
          default: return false;
        }
        
      case 'O_U_2_5':
        switch (rec.prediction) {
          case 'OVER_2_5': return totalGoals > 2.5; // Au moins 3 buts
          case 'UNDER_2_5': return totalGoals <= 2; // Maximum 2 buts
          default: return false;
        }
        
      case 'BTTS':
        switch (rec.prediction) {
          case 'BTTS_OUI': return bothTeamsScore;
          case 'BTTS_NON': return !bothTeamsScore;
          default: return false;
        }
        
      default:
        return false;
    }
  };

  // Calculer le multiplicateur et les recommandations cohérentes pour un score
  const calculateScoreMultiplier = (homeGoals: number, awayGoals: number, recommendations: Recommendation[]): { multiplier: number; coherentRecs: string[] } => {
    let totalMultiplier = 0;
    const coherentRecs: string[] = [];
    
    console.log(`\n🎯 Checking coherence for score ${homeGoals}-${awayGoals}:`);
    
    for (const rec of recommendations) {
      const isCoherent = isScoreCoherentWithRecommendation(homeGoals, awayGoals, rec);
      
      console.log(`  ${rec.source} ${rec.type} ${rec.prediction} (x${rec.weight}): ${isCoherent ? '✅' : '❌'}`);
      
      if (isCoherent) {
        totalMultiplier += rec.weight;
        coherentRecs.push(`${rec.source} ${rec.prediction} (x${rec.weight})`);
      }
    }
    
    console.log(`  📊 Final multiplier: x${totalMultiplier}`);
    
    return { multiplier: totalMultiplier, coherentRecs };
  };

  // Calculer les probabilités de base avec Poisson
  const poissonInputs: PoissonInputs = {
    p_home_fair: match.p_home_fair,
    p_draw_fair: match.p_draw_fair,
    p_away_fair: match.p_away_fair,
    p_btts_yes_fair: match.p_btts_yes_fair,
    p_over_2_5_fair: match.p_over_2_5_fair
  };
  
  const poissonResult = calculatePoisson(poissonInputs);
  
  // Récupérer toutes les recommandations
  const aiRecs = parseAIRecommendations(aiRecommendation);
  
  // Utiliser allRecommendations si disponible, sinon fallback vers secondRecommendation
  let allMarketRecs: any[] = [];
  if (allRecommendations && allRecommendations.length > 0) {
    allMarketRecs = allRecommendations.map(rec => ({
      type: rec.betType || rec.type || 'Unknown',
      prediction: rec.prediction || '',
      confidence: rec.confidence || 0
    }));
  } else if (secondRecommendation) {
    allMarketRecs = [{
      type: secondRecommendation.type || 'Unknown',
      prediction: secondRecommendation.prediction || '',
      confidence: secondRecommendation.confidence || 0
    }];
  }
  
  const marketRecs = parseMarketRecommendations([...marketRecommendations, ...allMarketRecs]);
  const probabilisticRecs = generateProbabilisticRecommendations();
  const allRecommendationsData = [...aiRecs, ...marketRecs, ...probabilisticRecs];
  
  console.log('📋 All recommendations:', allRecommendationsData);
  
  // Calculer les scores ajustés
  const scoresWithMultipliers: ScoreData[] = [];
  
  // Parcourir tous les scores possibles (0-0 à 6-6)
  for (let homeGoals = 0; homeGoals <= 6; homeGoals++) {
    for (let awayGoals = 0; awayGoals <= 6; awayGoals++) {
      const score = `${homeGoals}-${awayGoals}`;
      const baseProbability = poissonResult.top_scores.find(s => s.home === homeGoals && s.away === awayGoals)?.prob || 0;
      
      if (baseProbability > 0) {
        const { multiplier, coherentRecs } = calculateScoreMultiplier(homeGoals, awayGoals, allRecommendationsData);
        
        // Seulement inclure les scores avec multiplicateur > 0
        if (multiplier > 0) {
          const adjustedProbability = baseProbability * multiplier;
          
          scoresWithMultipliers.push({
            score,
            probability: adjustedProbability,
            multiplier,
            coherentRecommendations: coherentRecs
          });
        }
      }
    }
  }
  
  // Trier par probabilité ajustée et prendre le top 3
  const topScores = scoresWithMultipliers
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 3);

  console.log('🏆 Top 3 scores:', topScores.map(s => ({ score: s.score, prob: s.probability, mult: s.multiplier })));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Matrice de Prédiction de Score</h3>
      </div>
      
      {/* Recommandations actives */}
      <div className="p-3 bg-muted/50 rounded-lg">
        <div className="text-sm font-medium text-foreground mb-2">Recommandations actives:</div>
        <div className="space-y-1 text-xs text-muted-foreground">
          {allRecommendationsData.map((rec, idx) => (
            <div key={idx} className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-primary/60"></span>
              <span>{rec.source} {rec.type.replace(/_/g, ' ')}: {rec.prediction.replace(/_/g, ' ')} (x{rec.weight})</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Top 3 scores */}
      <div className="space-y-3">
        {topScores.map((scoreData, index) => (
          <div key={scoreData.score} className={`p-4 rounded-lg border-2 ${
            index === 0 ? 'border-primary bg-primary/5' : 
            index === 1 ? 'border-secondary bg-secondary/5' : 
            'border-muted bg-muted/30'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <span className={`text-3xl font-bold ${
                  index === 0 ? 'text-primary' : 
                  index === 1 ? 'text-secondary' : 
                  'text-foreground'
                }`}>
                  {scoreData.score}
                </span>
                <span className="text-lg font-semibold text-foreground">
                  {(scoreData.probability * 100).toFixed(1)}%
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Multiplicateur: x{scoreData.multiplier.toFixed(2)}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Cohérent avec:</span> {scoreData.coherentRecommendations.join(', ')}
            </div>
          </div>
        ))}
      </div>
      
      {topScores.length === 0 && (
        <div className="text-center text-muted-foreground py-8 border-2 border-dashed border-muted rounded-lg">
          <div className="text-lg font-medium mb-2">Aucun score cohérent trouvé</div>
          <div className="text-sm">Vérifiez les recommandations AI et Market dans le popup détail</div>
        </div>
      )}
    </div>
  );
};

export default ScorePredictionMatrix;
export { ScorePredictionMatrix };