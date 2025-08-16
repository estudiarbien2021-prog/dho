import React from 'react';
import { ProcessedMatch } from '@/types/match';
import { Badge } from '@/components/ui/badge';
import { Brain, Target } from 'lucide-react';
import { detectOpportunities, convertOpportunityToAIRecommendation } from '@/lib/opportunityDetection';
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
  console.log('🟢 AIRecommendationDisplay APPELÉ pour:', match.home_team, 'vs', match.away_team);
  
  // Utiliser le système unifié de détection d'opportunités
  const opportunities = detectOpportunities(match);
  const aiRecs = opportunities.map(convertOpportunityToAIRecommendation);
  
  if (aiRecs.length === 0) {
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

  const getConfidenceColor = (conf: string) => {
    switch (conf) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const formatBetType = (betType: string) => {
    return betType === '1X2' ? 'chance double' : betType;
  };

  if (variant === 'compact') {
    return (
      <div className="flex flex-col gap-1 items-center">
        {aiRecs.map((aiRec, index) => {
          const confidence = generateConfidenceScore(match.id, {
            type: aiRec.betType,
            prediction: aiRec.prediction,
            confidence: aiRec.confidence
          });
          
          return (
            <div key={index} className="w-full text-center">
              <Badge 
                variant={getConfidenceColor(aiRec.confidence)}
                className="text-xs"
              >
                {showIcon && '🎯'} {formatBetType(aiRec.betType)} {aiRec.prediction}
                {aiRec.isInverted && <span className="ml-1 text-amber-600">(Opportunité détectée)</span>}
              </Badge>
              <div className="text-xs text-muted-foreground">
                Cote: {aiRec.odds.toFixed(2)} | Confiance: {confidence}%
                {aiRec.isInverted && <span className="text-amber-600 ml-1">- Vigorish élevé détecté</span>}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className="bg-green-100 p-3 rounded-lg border border-green-200 min-w-[200px]">
        <div className="flex items-center justify-center gap-2 mb-2">
          {showIcon && <Brain className="h-4 w-4 text-green-600" />}
          <span className="text-sm font-semibold text-green-800">
            Recommandation{aiRecs.length > 1 ? 's' : ''} IA
          </span>
        </div>
        
        <div className="space-y-3 text-center">
          {aiRecs.map((aiRec, index) => {
            const confidence = generateConfidenceScore(match.id, {
              type: aiRec.betType,
              prediction: aiRec.prediction,
              confidence: aiRec.confidence
            });
            
            return (
              <div key={index} className={`${index > 0 ? 'pt-3 border-t border-green-300' : ''}`}>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-green-600 font-medium">Type de pari</div>
                    <div className="text-green-800">{formatBetType(aiRec.betType)}</div>
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
                
                <div className="pt-2">
                  <div className="text-green-600 text-xs font-medium">Confiance</div>
                  <div className="text-green-800 font-bold">{confidence}%</div>
                </div>
              </div>
            );
          })}
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
            Recommandation{aiRecs.length > 1 ? 's' : ''} IA
          </h3>
        </div>
        
        <div className="space-y-4">
          {aiRecs.map((aiRec, index) => {
            const confidence = generateConfidenceScore(match.id, {
              type: aiRec.betType,
              prediction: aiRec.prediction,
              confidence: aiRec.confidence
            });
            
            return (
              <div key={index} className={`${index > 0 ? 'pt-4 border-t border-green-300' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <Badge 
                    variant={getConfidenceColor(aiRec.confidence)}
                    className="text-sm px-3 py-1"
                  >
                    {formatBetType(aiRec.betType)} {aiRec.prediction}
                  </Badge>
                  <div className="text-xl font-bold text-green-700">
                    {aiRec.odds.toFixed(2)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm mb-2">
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
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}

export default AIRecommendationDisplay;