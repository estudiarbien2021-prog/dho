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

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        <h3 className="font-semibold text-sm">Scores de Confiance IA</h3>
      </div>

      <div className="space-y-6">
        {predictions.map((prediction, index) => (
          <div key={prediction.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">{prediction.icon}</span>
                <span className="text-sm font-medium">{prediction.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className={`text-lg font-bold transition-all duration-300 ${
                    currentlyAnimating === index ? 'animate-pulse text-primary' : ''
                  }`}
                  style={{ color: prediction.color }}
                >
                  {animatedValues[index].toFixed(1)}%
                </div>
                {currentlyAnimating === index && (
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                )}
              </div>
            </div>
            
            <div className="relative">
              <div 
                className="h-3 rounded-full bg-muted overflow-hidden"
                style={{
                  background: `linear-gradient(90deg, 
                    hsl(var(--muted)) 0%, 
                    hsl(var(--muted)) ${animatedValues[index]}%, 
                    hsl(var(--muted)) 100%)`
                }}
              >
                <div
                  className="h-full rounded-full relative overflow-hidden transition-all duration-75 ease-out"
                  style={{
                    width: `${animatedValues[index]}%`,
                    backgroundColor: prediction.color,
                    boxShadow: currentlyAnimating === index 
                      ? `0 0 10px ${prediction.color}` 
                      : 'none'
                  }}
                >
                  {/* Animated shine effect */}
                  {currentlyAnimating === index && (
                    <div 
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"
                      style={{
                        animation: 'shine 1s ease-in-out infinite'
                      }}
                    />
                  )}
                </div>
              </div>
              
              {/* Progress markers */}
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend with verdict */}
      <div className="mt-6 p-4 bg-muted/20 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 bg-primary rounded-full" />
          <span className="text-xs font-medium">Verdict IA</span>
        </div>
        
        {currentlyAnimating === -1 && predictions.length > 0 ? (
          <div className="space-y-1">
            <div className="text-sm font-bold text-primary">
              🎯 Prédiction Principale: {predictions[0].label}
            </div>
            <div className="text-xs text-muted-foreground">
              Confiance: {predictions[0].value.toFixed(1)}% • 
              {predictions[0].value >= 75 ? " Très fiable" : 
               predictions[0].value >= 60 ? " Modérément fiable" : 
               " Incertain"}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>• 70-100% : Très forte confiance</div>
            <div>• 50-69% : Confiance modérée</div>
            <div>• 30-49% : Incertitude</div>
            <div>• 0-29% : Faible probabilité</div>
          </div>
        )}
      </div>
    </Card>
  );
}