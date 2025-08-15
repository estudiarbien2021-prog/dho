import React, { useEffect, useState } from 'react';
import { ProcessedMatch } from '@/types/match';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { generateAIRecommendation } from '@/lib/aiRecommendation';

interface MarketEfficiencyGaugeProps {
  match: ProcessedMatch;
  className?: string;
}

export function MarketEfficiencyGauge({ match, className = "" }: MarketEfficiencyGaugeProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const [flawsDetected, setFlawsDetected] = useState(0);

  // Calculer l'efficacité du marché basée sur les vigorish réels
  const calculateEfficiency = () => {
    const avgVigorish = (match.vig_1x2 + match.vig_btts + match.vig_ou_2_5) / 3;
    // Plus le vigorish est bas, plus le marché est efficace
    const efficiency = Math.max(75, Math.min(98, (1 - avgVigorish) * 100 + 15));
    return Math.round(efficiency * 10) / 10;
  };

  const efficiency = calculateEfficiency();
  
  // Détecter les failles basées sur les flags réels
  const detectFlaws = () => {
    let flaws = 0;
    if (match.is_low_vig_1x2) flaws++;
    if (match.watch_btts) flaws++;
    if (match.watch_over25) flaws++;
    
    // Ajouter des failles basées sur les écarts de probabilités
    const oddsImpliedProb = 1 / match.odds_home + 1 / match.odds_draw + 1 / match.odds_away;
    if (oddsImpliedProb < 1.05) flaws++; // Marché très serré
    
    return flaws;
  };

  // Calculer les recommandations alternatives basées sur les vigorish élevés et marges négatives
  const getAlternativeRecommendation = () => {
    // Créer un tableau des vigorish avec leurs types et les trier
    const vigorishData = [
      { type: '1X2', value: match.vig_1x2 },
      { type: 'BTTS', value: match.vig_btts },
      { type: 'O/U2.5', value: match.vig_ou_2_5 }
    ].sort((a, b) => b.value - a.value);
    
    const highestVigorish = vigorishData[0];
    
    // Vérifier les marges négatives d'abord - utiliser les prédictions des sections correspondantes
    if (match.vig_1x2 < 0) {
      // Prendre la prédiction gagnante de la section 1X2
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
      
      return {
        type: '1X2_NEGATIVE',
        prediction,
        odds,
        reason: 'Marge négative détectée'
      };
    }
    
    if (match.vig_btts < 0 && match.odds_btts_yes && match.odds_btts_no) {
      // Prendre la prédiction gagnante de la section BTTS
      const bttsYesProb = match.p_btts_yes_fair;
      const bttsNoProb = match.p_btts_no_fair;
      
      const prediction = bttsYesProb > bttsNoProb ? 'Oui' : 'Non';
      const odds = bttsYesProb > bttsNoProb ? match.odds_btts_yes : match.odds_btts_no;
      
      return {
        type: 'BTTS_NEGATIVE',
        prediction,
        odds,
        reason: 'Marge négative détectée'
      };
    }
    
    if (match.vig_ou_2_5 < 0 && match.odds_over_2_5 && match.odds_under_2_5) {
      // Prendre la prédiction gagnante de la section O/U 2.5
      const overProb = match.p_over_2_5_fair;
      const underProb = match.p_under_2_5_fair;
      
      const prediction = overProb > underProb ? '+2,5 buts' : '-2,5 buts';
      const odds = overProb > underProb ? match.odds_over_2_5 : match.odds_under_2_5;
      
      return {
        type: 'OU_NEGATIVE',
        prediction,
        odds,
        reason: 'Marge négative détectée'
      };
    }
    
    // 1X2 : si c'est le plus élevé ou le deuxième plus élevé ET >= 8%
    const is1X2TopTwo = vigorishData[0].type === '1X2' || vigorishData[1].type === '1X2';
    const is1X2HighVigorish = match.vig_1x2 >= 0.08;
    
    if (is1X2TopTwo && is1X2HighVigorish) {
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
        // Calcul approximatif des cotes de chance double
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
        return { 
          type: '1X2',
          secondChoice, 
          thirdChoice, 
          doubleChance, 
          doubleChanceOdds,
          shouldMaskAI: false // Pour 1X2, on ne masque pas l'IA
        };
      }
    }
    
    // BTTS : si c'est le vigorish le plus élevé ET >= 8%
    if (highestVigorish.type === 'BTTS' && highestVigorish.value >= 0.08 && match.odds_btts_yes && match.odds_btts_no) {
      const aiRecommendation = generateAIRecommendation(match, ['btts']);
      if (aiRecommendation && aiRecommendation.betType === 'BTTS') {
        // Proposer l'inverse de la recommandation IA
        const inversePrediction = aiRecommendation.prediction === 'Oui' ? 'Non' : 'Oui';
        const inverseOdds = aiRecommendation.prediction === 'Oui' ? match.odds_btts_no : match.odds_btts_yes;
        
        return {
          type: 'BTTS',
          inversePrediction,
          inverseOdds,
          originalAI: aiRecommendation.prediction,
          shouldMaskAI: true // Masquer la recommandation IA si contradictoire
        };
      }
    }
    
    // O/U 2.5 : si c'est le vigorish le plus élevé ET >= 8%
    if (highestVigorish.type === 'O/U2.5' && highestVigorish.value >= 0.08 && match.odds_over_2_5 && match.odds_under_2_5) {
      const aiRecommendation = generateAIRecommendation(match, ['over_under']);
      if (aiRecommendation && aiRecommendation.betType === 'O/U 2.5') {
        // Proposer l'inverse de la recommandation IA
        const inversePrediction = aiRecommendation.prediction === '+2,5 buts' ? '-2,5 buts' : '+2,5 buts';
        const inverseOdds = aiRecommendation.prediction === '+2,5 buts' ? match.odds_under_2_5 : match.odds_over_2_5;
        
        return {
          type: 'O/U 2.5',
          inversePrediction,
          inverseOdds,
          originalAI: aiRecommendation.prediction,
          shouldMaskAI: true // Masquer la recommandation IA si contradictoire
        };
      }
    }
    
    return null;
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(efficiency);
      setFlawsDetected(detectFlaws());
    }, 300);
    return () => clearTimeout(timer);
  }, [efficiency]);

  const getEfficiencyColor = (value: number) => {
    if (value >= 95) return 'hsl(var(--destructive))'; // Rouge - marché trop efficace
    if (value >= 90) return 'hsl(var(--chart-1))'; // Orange
    if (value >= 85) return 'hsl(var(--primary))'; // Bleu - bon équilibre
    return 'hsl(var(--chart-2))'; // Vert - opportunités
  };

  const getStatusIcon = (value: number) => {
    if (value >= 95) return <AlertTriangle className="w-5 h-5 text-destructive" />;
    if (value >= 85) return <CheckCircle className="w-5 h-5 text-primary" />;
    return <TrendingUp className="w-5 h-5 text-chart-2" />;
  };

  const getStatusText = (value: number) => {
    if (value >= 95) return "Marché Verrouillé";
    if (value >= 90) return "Haute Efficacité";
    if (value >= 85) return "Équilibré";
    return "Opportunités Détectées";
  };

  // Données pour le graphique circulaire
  const data = [
    { name: 'Efficiency', value: animatedValue },
    { name: 'Remaining', value: 100 - animatedValue }
  ];

  const COLORS = [getEfficiencyColor(efficiency), 'hsl(var(--muted))'];

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Efficacité du Marché
        </h3>
        <p className="text-sm text-muted-foreground">
          Analyse en temps réel des distorsions
        </p>
      </div>

      <div className="relative">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                <linearGradient id="efficiencyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={getEfficiencyColor(efficiency)} stopOpacity={1} />
                  <stop offset="100%" stopColor={getEfficiencyColor(efficiency)} stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                startAngle={90}
                endAngle={-270}
                innerRadius={60}
                outerRadius={100}
                paddingAngle={0}
                dataKey="value"
              >
                <Cell fill="url(#efficiencyGradient)" />
                <Cell fill={COLORS[1]} />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Valeur centrale */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground animate-scale-in">
              {animatedValue.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {getStatusText(efficiency)}
            </div>
          </div>
        </div>
      </div>

      {/* Métriques détaillées */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
          <div className="flex items-center gap-2">
            {getStatusIcon(efficiency)}
            <span className="text-sm font-medium">État</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {getStatusText(efficiency)}
          </span>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-chart-2 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Failles</span>
          </div>
          <span className="text-sm font-bold text-chart-2">
            {flawsDetected} détectée{flawsDetected > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Analyse des vigorish */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Analyse des Marges</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">1X2</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-1000 ease-out"
                  style={{ width: `${Math.min(100, match.vig_1x2 * 1000)}%` }}
                ></div>
              </div>
              <span className="font-medium w-12 text-right">
                {(match.vig_1x2 * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">BTTS</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-chart-1 transition-all duration-1000 ease-out"
                  style={{ width: `${Math.min(100, match.vig_btts * 1000)}%` }}
                ></div>
              </div>
              <span className="font-medium w-12 text-right">
                {(match.vig_btts * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">O/U 2.5</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-chart-2 transition-all duration-1000 ease-out"
                  style={{ width: `${Math.min(100, match.vig_ou_2_5 * 1000)}%` }}
                ></div>
              </div>
              <span className="font-medium w-12 text-right">
                {(match.vig_ou_2_5 * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Recommandation alternative basée sur le vigorish le plus élevé */}
        {(() => {
          const altRecommendation = getAlternativeRecommendation();
          return altRecommendation ? (
            <div className="mt-4 p-3 bg-chart-2/10 border border-chart-2/30 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-chart-2" />
                <span className="text-sm font-semibold text-chart-2">Opportunité Détectée</span>
              </div>
              
              {altRecommendation.type === '1X2' ? (
                <>
                  {/* Chance Double Recommandée */}
                  <div className="text-sm text-foreground mb-3">
                    <span className="text-muted-foreground">Chance Double recommandée :</span>
                    <div className="font-bold mt-2 animate-pulse">
                      <span className="text-lg text-chart-2 font-extrabold animate-bounce">
                        {altRecommendation.doubleChance}
                      </span>
                      <span className="ml-2 px-3 py-1 bg-chart-2/20 text-chart-2 rounded text-sm font-bold animate-pulse">
                        @{altRecommendation.doubleChanceOdds.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Détail des probabilités */}
                  <div className="space-y-2 text-xs border-t border-chart-2/20 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">2ème choix :</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground animate-pulse">
                          {altRecommendation.secondChoice.label}
                        </span>
                        <span className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs">
                          @{altRecommendation.secondChoice.odds.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">3ème choix :</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground animate-pulse">
                          {altRecommendation.thirdChoice.label}
                        </span>
                        <span className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs">
                          @{altRecommendation.thirdChoice.odds.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : altRecommendation.type === '1X2_NEGATIVE' || altRecommendation.type === 'BTTS_NEGATIVE' || altRecommendation.type === 'OU_NEGATIVE' ? (
                <>
                  {/* Recommandation pour marge négative */}
                  <div className="text-sm text-foreground mb-3">
                    <span className="text-muted-foreground">{altRecommendation.reason} :</span>
                    <div className="font-bold mt-2 animate-pulse">
                      <span className="text-lg text-chart-2 font-extrabold animate-bounce">
                        {altRecommendation.prediction}
                      </span>
                      <span className="ml-2 px-3 py-1 bg-chart-2/20 text-chart-2 rounded text-sm font-bold animate-pulse">
                        @{altRecommendation.odds?.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </>
              ) : altRecommendation.type === 'BTTS' ? (
                <>
                  {/* Recommandation BTTS Inverse */}
                  <div className="text-sm text-foreground mb-3">
                    <span className="text-muted-foreground">Contraire de l'IA - BTTS :</span>
                    <div className="font-bold mt-2 animate-pulse">
                      <span className="text-lg text-chart-2 font-extrabold animate-bounce">
                        {altRecommendation.inversePrediction}
                      </span>
                      <span className="ml-2 px-3 py-1 bg-chart-2/20 text-chart-2 rounded text-sm font-bold animate-pulse">
                        @{altRecommendation.inverseOdds?.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Explication */}
                  <div className="text-xs text-muted-foreground border-t border-chart-2/20 pt-3">
                    <span>IA recommandait : <strong>{altRecommendation.originalAI}</strong></span>
                  </div>
                </>
              ) : altRecommendation.type === 'O/U 2.5' ? (
                <>
                  {/* Recommandation O/U 2.5 Inverse */}
                  <div className="text-sm text-foreground mb-3">
                    <span className="text-muted-foreground">Contraire de l'IA - Buts :</span>
                    <div className="font-bold mt-2 animate-pulse">
                      <span className="text-lg text-chart-2 font-extrabold animate-bounce">
                        {altRecommendation.inversePrediction}
                      </span>
                      <span className="ml-2 px-3 py-1 bg-chart-2/20 text-chart-2 rounded text-sm font-bold animate-pulse">
                        @{altRecommendation.inverseOdds?.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Explication */}
                  <div className="text-xs text-muted-foreground border-t border-chart-2/20 pt-3">
                    <span>IA recommandait : <strong>{altRecommendation.originalAI}</strong></span>
                  </div>
                </>
              ) : null}
            </div>
          ) : null;
        })()}
      </div>
    </div>
  );
}