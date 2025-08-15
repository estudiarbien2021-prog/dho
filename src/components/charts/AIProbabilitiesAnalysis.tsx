import React from 'react';
import { ProcessedMatch } from '@/types/match';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Cell } from 'recharts';
import { generateAIRecommendation } from '@/lib/aiRecommendation';

interface AIProbabilitiesAnalysisProps {
  match: ProcessedMatch;
  className?: string;
}

export function AIProbabilitiesAnalysis({ match, className = "" }: AIProbabilitiesAnalysisProps) {
  // Calculer la prédiction 1X2 basée sur les probabilités
  const get1X2Prediction = () => {
    const probHome = 1 / match.odds_home;
    const probDraw = 1 / match.odds_draw;
    const probAway = 1 / match.odds_away;
    
    const outcomes = [
      { label: match.home_team, prob: probHome, odds: match.odds_home, type: 'home' },
      { label: 'Nul', prob: probDraw, odds: match.odds_draw, type: 'draw' },
      { label: match.away_team, prob: probAway, odds: match.odds_away, type: 'away' }
    ];
    
    return outcomes.sort((a, b) => b.prob - a.prob)[0];
  };

  // Obtenir les prédictions d'analyse (basées sur les probabilités, sans inversion)
  const bttsAnalysisPrediction = match.p_btts_yes_fair > match.p_btts_no_fair ? 'Oui' : 'Non';
  const overUnderAnalysisPrediction = match.p_over_2_5_fair > match.p_under_2_5_fair ? '+2,5 buts' : '-2,5 buts';

  const prediction1X2 = get1X2Prediction();

  // Données pour les graphiques en barres
  const get1X2Data = () => {
    const probHome = 1 / match.odds_home;
    const probDraw = 1 / match.odds_draw;
    const probAway = 1 / match.odds_away;
    const total = probHome + probDraw + probAway;
    
    return [
      { name: 'Domicile', value: (probHome / total) * 100, isSelected: prediction1X2.type === 'home' },
      { name: 'Nul', value: (probDraw / total) * 100, isSelected: prediction1X2.type === 'draw' },
      { name: 'Extérieur', value: (probAway / total) * 100, isSelected: prediction1X2.type === 'away' }
    ];
  };

  const getBTTSData = () => {
    const probYes = match.p_btts_yes_fair || 0.5;
    const probNo = match.p_btts_no_fair || 0.5;
    const total = probYes + probNo;
    
    return [
      { name: 'Oui', value: (probYes / total) * 100, isSelected: bttsAnalysisPrediction === 'Oui' },
      { name: 'Non', value: (probNo / total) * 100, isSelected: bttsAnalysisPrediction === 'Non' }
    ];
  };

  const getOverUnderData = () => {
    const probOver = match.p_over_2_5_fair || 0.5;
    const probUnder = match.p_under_2_5_fair || 0.5;
    const total = probOver + probUnder;
    
    return [
      { name: 'Plus de 2,5', value: (probOver / total) * 100, isSelected: overUnderAnalysisPrediction === '+2,5 buts' },
      { name: 'Moins de 2,5', value: (probUnder / total) * 100, isSelected: overUnderAnalysisPrediction === '-2,5 buts' }
    ];
  };

  // Couleurs cohérentes avec la Matrice de Prédiction de Score (système purple)
  const getColor = (probability: number, isSelected: boolean) => {
    if (isSelected) {
      // Couleurs principales purple pour les sélections
      if (probability >= 0.6) return '#9333ea';        // Purple-600 - Excellente probabilité
      if (probability >= 0.45) return '#a855f7';       // Purple-500 - Bonne probabilité  
      if (probability >= 0.35) return '#c084fc';       // Purple-400 - Probabilité moyenne
      return '#d8b4fe';                                 // Purple-300 - Faible probabilité
    }
    
    // Couleurs atténuées pour les options non sélectionnées
    if (probability >= 0.6) return '#e9d5ff';          // Purple-200
    if (probability >= 0.45) return '#f3e8ff';         // Purple-100
    if (probability >= 0.35) return '#faf5ff';         // Purple-50
    return '#f8fafc';                                   // Slate-50
  };

  // Fonction pour obtenir le pourcentage et la couleur du texte (système purple)
  const getProbabilityDisplay = (probability: number, isSelected: boolean) => {
    const percent = (probability * 100).toFixed(1);
    let colorClass = '';
    
    if (probability >= 0.6) colorClass = 'text-purple-700 font-bold';
    else if (probability >= 0.45) colorClass = 'text-purple-600 font-semibold';
    else if (probability >= 0.35) colorClass = 'text-purple-500 font-medium';
    else colorClass = 'text-purple-400 font-medium';

    return { percent, colorClass };
  };

  const CustomBarChart = ({ data, title, selectedLabel, recommendation }: {
    data: any[];
    title: string;
    selectedLabel: string;
    recommendation?: { prediction: string; odds: number; } | null;
  }) => (
    <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/50 rounded-xl p-4 border border-purple-200/30 shadow-lg">
      <h3 className="text-center text-sm font-medium text-foreground mb-4">{title}</h3>
      
      <div className="relative">
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis hide />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => {
                  const probability = entry.value / 100;
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getColor(probability, entry.isSelected)}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Label de sélection */}
        <div className="absolute top-2 right-2">
          <div className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
            {selectedLabel}
          </div>
        </div>
      </div>

      {/* Cotes et Probabilités */}
      <div className="mt-4 space-y-2">
        {title === "Résultat 1X2" && (
          <>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Domicile</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${getProbabilityDisplay(1 / match.odds_home, prediction1X2.type === 'home').colorClass}`}>
                  {getProbabilityDisplay(1 / match.odds_home, prediction1X2.type === 'home').percent}%
                </span>
                <span className={`font-bold ${prediction1X2.type === 'home' ? 'text-brand' : 'text-foreground'}`}>
                  {match.odds_home.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Nul</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${getProbabilityDisplay(1 / match.odds_draw, prediction1X2.type === 'draw').colorClass}`}>
                  {getProbabilityDisplay(1 / match.odds_draw, prediction1X2.type === 'draw').percent}%
                </span>
                <span className={`font-bold ${prediction1X2.type === 'draw' ? 'text-brand' : 'text-foreground'}`}>
                  {match.odds_draw.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Extérieur</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${getProbabilityDisplay(1 / match.odds_away, prediction1X2.type === 'away').colorClass}`}>
                  {getProbabilityDisplay(1 / match.odds_away, prediction1X2.type === 'away').percent}%
                </span>
                <span className={`font-bold ${prediction1X2.type === 'away' ? 'text-brand' : 'text-foreground'}`}>
                  {match.odds_away.toFixed(2)}
                </span>
              </div>
            </div>
          </>
        )}
        
        {title === "Les Deux Équipes Marquent" && match.odds_btts_yes && match.odds_btts_no && (
          <>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">BTTS Oui</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${getProbabilityDisplay(match.p_btts_yes_fair || 0.5, bttsAnalysisPrediction === 'Oui').colorClass}`}>
                  {getProbabilityDisplay(match.p_btts_yes_fair || 0.5, bttsAnalysisPrediction === 'Oui').percent}%
                </span>
                <span className={`font-bold ${bttsAnalysisPrediction === 'Oui' ? 'text-brand' : 'text-foreground'}`}>
                  {match.odds_btts_yes.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">BTTS Non</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${getProbabilityDisplay(match.p_btts_no_fair || 0.5, bttsAnalysisPrediction === 'Non').colorClass}`}>
                  {getProbabilityDisplay(match.p_btts_no_fair || 0.5, bttsAnalysisPrediction === 'Non').percent}%
                </span>
                <span className={`font-bold ${bttsAnalysisPrediction === 'Non' ? 'text-brand' : 'text-foreground'}`}>
                  {match.odds_btts_no.toFixed(2)}
                </span>
              </div>
            </div>
          </>
        )}
        
        {title === "Plus/Moins 2,5 Buts" && match.odds_over_2_5 && match.odds_under_2_5 && (
          <>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Plus de 2,5</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${getProbabilityDisplay(match.p_over_2_5_fair || 0.5, overUnderAnalysisPrediction === '+2,5 buts').colorClass}`}>
                  {getProbabilityDisplay(match.p_over_2_5_fair || 0.5, overUnderAnalysisPrediction === '+2,5 buts').percent}%
                </span>
                <span className={`font-bold ${overUnderAnalysisPrediction === '+2,5 buts' ? 'text-brand' : 'text-foreground'}`}>
                  {match.odds_over_2_5.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Moins de 2,5</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${getProbabilityDisplay(match.p_under_2_5_fair || 0.5, overUnderAnalysisPrediction === '-2,5 buts').colorClass}`}>
                  {getProbabilityDisplay(match.p_under_2_5_fair || 0.5, overUnderAnalysisPrediction === '-2,5 buts').percent}%
                </span>
                <span className={`font-bold ${overUnderAnalysisPrediction === '-2,5 buts' ? 'text-brand' : 'text-foreground'}`}>
                  {match.odds_under_2_5.toFixed(2)}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center">
        <h2 className="text-lg font-semibold text-brand mb-2 flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-brand rounded-full animate-pulse"></div>
          Analyse des Probabilités IA
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CustomBarChart
          data={get1X2Data()}
          title="Résultat 1X2"
          selectedLabel={prediction1X2.label}
          recommendation={null}
        />

        {match.odds_btts_yes && match.odds_btts_no && (
          <CustomBarChart
            data={getBTTSData()}
            title="Les Deux Équipes Marquent"
            selectedLabel={bttsAnalysisPrediction || 'N/A'}
            recommendation={null}
          />
        )}

        {match.odds_over_2_5 && match.odds_under_2_5 && (
          <CustomBarChart
            data={getOverUnderData()}
            title="Plus/Moins 2,5 Buts"
            selectedLabel={overUnderAnalysisPrediction === '+2,5 buts' ? '+2,5 buts' : '-2,5 buts'}
            recommendation={null}
          />
        )}
      </div>
    </div>
  );
}