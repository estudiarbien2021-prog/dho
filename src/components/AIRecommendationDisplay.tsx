import React from 'react';
import { ProcessedMatch } from '@/types/match';
import { Badge } from '@/components/ui/badge';
import { Brain, Target } from 'lucide-react';
import { generateAIRecommendation } from '@/lib/aiRecommendation';
import { generateConfidenceScore } from '@/lib/confidence';

interface AIRecommendationDisplayProps {
  match: ProcessedMatch;
  marketFilters?: string[];
  variant?: 'compact' | 'detailed' | 'card';
  showIcon?: boolean;
}

export function AIRecommendationDisplay({ 
  match, 
  marketFilters = [], 
  variant = 'compact',
  showIcon = true 
}: AIRecommendationDisplayProps) {
  const aiRec = generateAIRecommendation(match, marketFilters);
  
  if (!aiRec) {
    return (
      <div className="flex flex-col gap-1 items-center">
        <Badge variant="outline" className="text-xs">
          {showIcon && '🎯'} Aucune opportunité
        </Badge>
        <div className="text-xs text-muted-foreground">
          Pas d'occasion détectée
        </div>
      </div>
    );
  }

  const confidence = generateConfidenceScore(match.id, {
    type: aiRec.betType,
    prediction: aiRec.prediction,
    confidence: aiRec.confidence
  });

  const getConfidenceColor = (conf: string) => {
    switch (conf) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  if (variant === 'compact') {
    return (
      <div className="flex flex-col gap-1 items-center">
        <Badge 
          variant={getConfidenceColor(aiRec.confidence)}
          className="text-xs"
        >
          {showIcon && '🎯'} {aiRec.betType} {aiRec.prediction}
        </Badge>
        <div className="text-xs text-muted-foreground text-center">
          Cote: {aiRec.odds.toFixed(2)} | Confiance: {confidence}%
        </div>
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className="bg-green-100 p-3 rounded-lg border border-green-200 min-w-[200px]">
        <div className="flex items-center justify-center gap-2 mb-2">
          {showIcon && <Brain className="h-4 w-4 text-green-600" />}
          <span className="text-sm font-semibold text-green-800">
            Recommandation IA
          </span>
        </div>
        
        <div className="space-y-2 text-center">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="text-green-600 font-medium">Type de pari</div>
              <div className="text-green-800">{aiRec.betType}</div>
            </div>
            <div>
              <div className="text-green-600 font-medium">Prédiction</div>
              <div className="text-green-800">{aiRec.prediction}</div>
            </div>
            <div>
              <div className="text-green-600 font-medium">Cote</div>
              <div className="text-green-800 font-bold">{aiRec.odds.toFixed(2)}</div>
            </div>
          </div>
          
          <div className="pt-2 border-t border-green-300">
            <div className="text-green-600 text-xs font-medium">Confiance</div>
            <div className="text-green-800 font-bold">{confidence}%</div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          {showIcon && <Target className="h-5 w-5 text-green-600" />}
          <h3 className="text-lg font-semibold text-green-800">
            Recommandation IA
          </h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge 
              variant={getConfidenceColor(aiRec.confidence)}
              className="text-sm px-3 py-1"
            >
              {aiRec.betType} {aiRec.prediction}
            </Badge>
            <div className="text-xl font-bold text-green-700">
              {aiRec.odds.toFixed(2)}
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-green-600">Niveau de confiance:</span>
            <span className="font-semibold text-green-800">{confidence}%</span>
          </div>
          
          <div className="relative h-2 bg-green-200 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full"
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return null;
}