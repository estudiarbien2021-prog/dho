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

  const getConfidenceLevel = (value: number) => {
    if (value >= 75) return { label: "Très Fort", color: "text-emerald-600" };
    if (value >= 60) return { label: "Fort", color: "text-green-600" };
    if (value >= 45) return { label: "Modéré", color: "text-blue-600" };
    return { label: "Faible", color: "text-amber-600" };
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/50 border-0 shadow-lg">
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl shadow-lg">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Scores de Confiance IA</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Analyse prédictive avancée</p>
        </div>
      </div>

      <div className="space-y-6">
        {predictions.map((prediction, index) => {
          const confidenceInfo = getConfidenceLevel(animatedValues[index]);
          return (
            <div key={prediction.label} className="group">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <div 
                    className="relative flex items-center justify-center w-12 h-12 rounded-2xl shadow-lg transition-all duration-300 group-hover:scale-110"
                    style={{ 
                      background: `linear-gradient(135deg, ${prediction.color}dd, ${prediction.color})`,
                      boxShadow: currentlyAnimating === index 
                        ? `0 8px 25px ${prediction.color}40` 
                        : `0 4px 15px ${prediction.color}20`
                    }}
                  >
                    <span className="text-lg filter drop-shadow-sm">{prediction.icon}</span>
                    {currentlyAnimating === index && (
                      <div className="absolute inset-0 rounded-2xl animate-pulse" 
                           style={{ backgroundColor: `${prediction.color}30` }} />
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
                      {prediction.label}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Analyse prédictive avancée
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div 
                    className="text-2xl font-bold transition-all duration-300 mb-1"
                    style={{ 
                      color: prediction.color,
                      textShadow: currentlyAnimating === index ? `0 0 10px ${prediction.color}40` : 'none'
                    }}
                  >
                    {animatedValues[index].toFixed(0)}%
                  </div>
                  <div className={`text-xs font-medium px-2 py-1 rounded-full ${confidenceInfo.color} bg-slate-100 dark:bg-slate-700`}>
                    {confidenceInfo.label}
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <div className="h-3 bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-600 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full rounded-full relative transition-all duration-300 ease-out"
                    style={{
                      width: `${animatedValues[index]}%`,
                      background: `linear-gradient(90deg, ${prediction.color}dd, ${prediction.color})`,
                      boxShadow: currentlyAnimating === index 
                        ? `0 0 15px ${prediction.color}60, inset 0 1px 2px rgba(255,255,255,0.3)` 
                        : `inset 0 1px 2px rgba(255,255,255,0.3)`
                    }}
                  >
                    {currentlyAnimating === index && (
                      <div 
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-full animate-pulse"
                      />
                    )}
                  </div>
                </div>
                
                {/* Progress markers */}
                <div className="flex justify-between mt-2 px-1">
                  {[0, 25, 50, 75, 100].map(marker => (
                    <span key={marker} className="text-xs text-slate-400 dark:text-slate-500">
                      {marker}%
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Synthèse Algorithmique améliorée */}
      <div className="mt-8 p-6 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 rounded-2xl border border-emerald-200/50 dark:border-emerald-800/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg shadow-md">
            <div className="w-2 h-2 bg-white rounded-full" />
          </div>
          <h4 className="font-bold text-emerald-800 dark:text-emerald-300">Synthèse Algorithmique</h4>
        </div>
        
        <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-4 leading-relaxed">
          L&apos;IA a analysé 6 facteurs critiques. Les algorithmes de machine learning identifient les variables les plus déterminantes pour prédire l&apos;issue du match avec une précision optimisée.
        </p>

        {/* Analyse détaillée avec design amélioré */}
        <div className="grid gap-4">
          <div className="p-4 bg-white/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-500 rounded-lg text-white text-sm font-bold">
                🤖
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-blue-700 dark:text-blue-300 mb-1">Machine Learning</h5>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Le modèle prédictif, alimenté par +54 800 affrontements similaires du football sud-américain avec contextes identiques (blessures/suspensions, arbitre, pelouse, supporters, enjeux, déplacements, fatigue, météo), détecte 50.0% de probabilité qu&apos;une équipe au minimum reste bredouille.
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-white/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 bg-emerald-500 rounded-lg text-white text-sm font-bold">
                💰
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-emerald-700 dark:text-emerald-300 mb-1">Profit Attendu</h5>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  La cote 1.62 génère une espérance de gain positive de +5.3% sur le long terme.
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-white/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 bg-violet-500 rounded-lg text-white text-sm font-bold">
                📊
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-violet-700 dark:text-violet-300 mb-1">Tarification Normale</h5>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Commission à 7.2%, conforme aux standards du marché d&apos;investissement sportif.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}