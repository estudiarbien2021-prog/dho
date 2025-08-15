import React from 'react';
import { ProcessedMatch } from '@/types/match';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
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

  // Obtenir les recommandations IA pour BTTS et O/U
  const bttsRecommendation = generateAIRecommendation(match, ['btts']);
  const overUnderRecommendation = generateAIRecommendation(match, ['over_under']);

  const prediction1X2 = get1X2Prediction();

  // Données pour les graphiques circulaires
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
      { name: 'Oui', value: (probYes / total) * 100, isSelected: bttsRecommendation?.prediction === 'Oui' },
      { name: 'Non', value: (probNo / total) * 100, isSelected: bttsRecommendation?.prediction === 'Non' }
    ];
  };

  const getOverUnderData = () => {
    const probOver = match.p_over_2_5_fair || 0.5;
    const probUnder = match.p_under_2_5_fair || 0.5;
    const total = probOver + probUnder;
    
    return [
      { name: 'Plus de 2,5', value: (probOver / total) * 100, isSelected: overUnderRecommendation?.prediction === '+2,5 buts' },
      { name: 'Moins de 2,5', value: (probUnder / total) * 100, isSelected: overUnderRecommendation?.prediction === '-2,5 buts' }
    ];
  };

  // Couleurs cohérentes avec le thème et code couleur de performance
  const getColor = (isSelected: boolean, probability: number) => {
    if (isSelected) {
      // Code couleur basé sur la performance/probabilité
      if (probability >= 0.6) return 'hsl(var(--brand))';        // Vert - Excellente probabilité
      if (probability >= 0.45) return 'hsl(220 70% 50%)';        // Bleu - Bonne probabilité  
      if (probability >= 0.35) return 'hsl(35 80% 55%)';         // Orange - Probabilité moyenne
      return 'hsl(var(--destructive))';                          // Rouge - Faible probabilité
    }
    
    // Couleurs atténuées pour les options non sélectionnées
    if (probability >= 0.6) return 'hsl(var(--brand-300))';
    if (probability >= 0.45) return 'hsl(220 50% 70%)';
    if (probability >= 0.35) return 'hsl(35 60% 75%)';
    return 'hsl(var(--destructive) / 0.6)';
  };

  // Fonction pour obtenir le pourcentage et la couleur du texte
  const getProbabilityDisplay = (probability: number, isSelected: boolean) => {
    const percent = (probability * 100).toFixed(1);
    let colorClass = '';
    
    if (probability >= 0.6) colorClass = 'text-brand font-bold';
    else if (probability >= 0.45) colorClass = 'text-blue-600 font-semibold';
    else if (probability >= 0.35) colorClass = 'text-orange-600 font-medium';
    else colorClass = 'text-destructive font-medium';

    return { percent, colorClass };
  };

  const CustomPieChart = ({ data, title, selectedLabel, recommendation }: {
    data: any[];
    title: string;
    selectedLabel: string;
    recommendation?: { prediction: string; odds: number; } | null;
  }) => (
    <div className="bg-surface-soft rounded-xl p-4 border border-border/30">
      <h3 className="text-center text-sm font-medium text-foreground mb-4">{title}</h3>
      
      <div className="relative">
        <div className="h-[120px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={55}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => {
                  const probability = entry.value / 100; // Convertir le pourcentage en probabilité
                  return (
                    <Cell key={`cell-${index}`} fill={getColor(entry.isSelected, probability)} />
                  );
                })}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Label central */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="bg-brand text-brand-fg px-3 py-1 rounded-full text-xs font-bold">
              {selectedLabel}
            </div>
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
                <span className={`text-xs ${getProbabilityDisplay(match.p_btts_yes_fair || 0.5, bttsRecommendation?.prediction === 'Oui').colorClass}`}>
                  {getProbabilityDisplay(match.p_btts_yes_fair || 0.5, bttsRecommendation?.prediction === 'Oui').percent}%
                </span>
                <span className={`font-bold ${bttsRecommendation?.prediction === 'Oui' ? 'text-brand' : 'text-foreground'}`}>
                  {match.odds_btts_yes.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">BTTS Non</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${getProbabilityDisplay(match.p_btts_no_fair || 0.5, bttsRecommendation?.prediction === 'Non').colorClass}`}>
                  {getProbabilityDisplay(match.p_btts_no_fair || 0.5, bttsRecommendation?.prediction === 'Non').percent}%
                </span>
                <span className={`font-bold ${bttsRecommendation?.prediction === 'Non' ? 'text-brand' : 'text-foreground'}`}>
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
                <span className={`text-xs ${getProbabilityDisplay(match.p_over_2_5_fair || 0.5, overUnderRecommendation?.prediction === '+2,5 buts').colorClass}`}>
                  {getProbabilityDisplay(match.p_over_2_5_fair || 0.5, overUnderRecommendation?.prediction === '+2,5 buts').percent}%
                </span>
                <span className={`font-bold ${overUnderRecommendation?.prediction === '+2,5 buts' ? 'text-brand' : 'text-foreground'}`}>
                  {match.odds_over_2_5.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Moins de 2,5</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${getProbabilityDisplay(match.p_under_2_5_fair || 0.5, overUnderRecommendation?.prediction === '-2,5 buts').colorClass}`}>
                  {getProbabilityDisplay(match.p_under_2_5_fair || 0.5, overUnderRecommendation?.prediction === '-2,5 buts').percent}%
                </span>
                <span className={`font-bold ${overUnderRecommendation?.prediction === '-2,5 buts' ? 'text-brand' : 'text-foreground'}`}>
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
        <CustomPieChart
          data={get1X2Data()}
          title="Résultat 1X2"
          selectedLabel={prediction1X2.label}
          recommendation={null}
        />

        {match.odds_btts_yes && match.odds_btts_no && (
          <CustomPieChart
            data={getBTTSData()}
            title="Les Deux Équipes Marquent"
            selectedLabel={bttsRecommendation?.prediction || 'N/A'}
            recommendation={bttsRecommendation}
          />
        )}

        {match.odds_over_2_5 && match.odds_under_2_5 && (
          <CustomPieChart
            data={getOverUnderData()}
            title="Plus/Moins 2,5 Buts"
            selectedLabel={overUnderRecommendation?.prediction === '+2,5 buts' ? '+2,5 buts' : '-2,5 buts'}
            recommendation={overUnderRecommendation}
          />
        )}
      </div>
    </div>
  );
}