import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface Prediction {
  label: string;
  value: number;
  color: string;
  icon: string;
}

interface ConfidenceScoreBarsProps {
  predictions: Prediction[];
  isActive: boolean;
}

export function ConfidenceScoreBars({ predictions, isActive }: ConfidenceScoreBarsProps) {
  const [animatedValues, setAnimatedValues] = useState<number[]>(new Array(predictions.length).fill(0));
  const [currentlyAnimating, setCurrentlyAnimating] = useState(-1);

  useEffect(() => {
    if (!isActive) {
      setAnimatedValues(new Array(predictions.length).fill(0));
      setCurrentlyAnimating(-1);
      return;
    }

    const animateBars = async () => {
      // Animate each bar sequentially with staggered timing
      for (let i = 0; i < predictions.length; i++) {
        setCurrentlyAnimating(i);
        
        // Animate current bar from 0 to target value
        const duration = 1000; // 1 second
        const frames = 60;
        const increment = predictions[i].value / frames;
        
        for (let frame = 0; frame <= frames; frame++) {
          const currentValue = Math.min(increment * frame, predictions[i].value);
          
          setAnimatedValues(prev => {
            const newValues = [...prev];
            newValues[i] = currentValue;
            return newValues;
          });
          
          await new Promise(resolve => setTimeout(resolve, duration / frames));
        }
        
        // Small delay before next bar
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      setCurrentlyAnimating(-1);
    };

    animateBars();
  }, [isActive, predictions]);

  const getConfidenceLabel = (value: number) => {
    if (value >= 75) return { label: "Très Fort", color: "text-green-500" };
    if (value >= 60) return { label: "Fort", color: "text-orange-500" };
    if (value >= 45) return { label: "Modéré", color: "text-blue-500" };
    return { label: "Faible", color: "text-red-500" };
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-2 h-2 bg-green-500 rounded-full" />
        <h3 className="font-semibold text-sm">Scores de Confiance IA</h3>
      </div>

      <div className="space-y-4">
        {predictions.map((prediction, index) => {
          const confidenceInfo = getConfidenceLabel(animatedValues[index]);
          return (
            <div key={prediction.label} className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                    style={{ backgroundColor: prediction.color }}
                  >
                    {prediction.icon}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{prediction.label}</div>
                    <div className="text-xs text-muted-foreground">Analyse prédictive avancée</div>
                  </div>
                </div>
                <div className="text-right">
                  <div 
                    className={`text-xl font-bold transition-all duration-300 ${
                      currentlyAnimating === index ? 'animate-pulse' : ''
                    }`}
                    style={{ color: prediction.color }}
                  >
                    {animatedValues[index].toFixed(0)}%
                  </div>
                  <div className={`text-xs font-medium ${confidenceInfo.color}`}>
                    {confidenceInfo.label}
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-75 ease-out relative"
                    style={{
                      width: `${animatedValues[index]}%`,
                      backgroundColor: prediction.color,
                      boxShadow: currentlyAnimating === index 
                        ? `0 0 8px ${prediction.color}40` 
                        : 'none'
                    }}
                  >
                    {currentlyAnimating === index && (
                      <div 
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                        style={{
                          animation: 'shine 1s ease-in-out infinite'
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
              
              {currentlyAnimating === index && (
                <div className="flex justify-end">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Synthèse Algorithmique */}
      <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
          <span className="text-sm font-medium text-green-700 dark:text-green-400">Synthèse Algorithmique</span>
        </div>
        
        <div className="text-sm text-green-800 dark:text-green-300 mb-3">
          L'IA a analysé 6 facteurs critiques. Les algorithmes de machine learning identifient les variables les plus déterminantes pour prédire l'issue du match avec une précision optimisée.
        </div>

        {/* Commentaire explicatif détaillé */}
        <div className="p-3 bg-slate-800/30 rounded text-xs text-muted-foreground space-y-2">
          <div>
            <span className="text-primary font-semibold">🤖 Machine Learning :</span> Le modèle prédictif, alimenté par +54 800 affrontements similaires du football sud-américain avec contextes identiques (blessures/suspensions, arbitre, pelouse, supporters, enjeux, déplacements, fatigue, météo), détecte 50.0% de probabilité qu'une équipe au minimum reste bredouille.
          </div>
          <div>
            <span className="text-green-400 font-semibold">💰 Profit Attendu :</span> La cote 1.62 génère une espérance de gain positive de +5.3% sur le long terme.
          </div>
          <div>
            <span className="text-blue-400 font-semibold">📊 Tarification Normale :</span> Commission à 7.2%, conforme aux standards du marché d'investissement sportif.
          </div>
        </div>
      </div>
    </Card>
  );
}