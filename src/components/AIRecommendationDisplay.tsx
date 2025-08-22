
import React, { useState, useEffect } from 'react';
import { ProcessedMatch } from '@/types/match';
import { detectOpportunities, prioritizeOpportunitiesByRealProbability, convertOpportunityToAIRecommendation } from '@/lib/opportunityDetection';
import { generateConfidenceScore } from '@/lib/confidence';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Target, AlertTriangle } from 'lucide-react';

interface AIRecommendationDisplayProps {
  match: ProcessedMatch;
  marketFilters?: string[];
  variant?: 'compact' | 'detailed' | 'card' | 'table';
  showIcon?: boolean;
  preCalculatedRecommendations?: any[];
}

export function AIRecommendationDisplay({ match, marketFilters, variant = 'compact', showIcon = true, preCalculatedRecommendations }: AIRecommendationDisplayProps) {
  // Use pre-calculated recommendations if available, otherwise fallback to empty array
  const aiRecs = preCalculatedRecommendations || [];

  if (aiRecs.length === 0) {
    if (variant === 'table') {
      return <span className="text-xs text-muted-foreground">Aucune règle respectée</span>;
    }
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <AlertTriangle className="h-3 w-3" />
        <span>Aucune règle respectée</span>
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
    switch (betType) {
      case '1X2': return '1X2';
      case 'O/U 2.5': return 'O/U 2.5';
      case 'OU25': return 'O/U 2.5';
      case 'BTTS': return 'BTTS';
      case 'Double Chance': return 'Double Chance';
      default: return betType;
    }
  };

  if (variant === 'compact') {
    return (
      <div className="flex flex-col gap-1 items-center">
        {aiRecs.map((aiRec, index) => {
          const confidence = aiRec.confidenceScore || 75;
          // Identifier la recommandation avec le plus de détections (consensus ≥3)
          const maxDetectionCount = Math.max(...aiRecs.map(r => r.detectionCount || 0));
          const isMainRecommendation = (aiRec.detectionCount || 0) >= 3 && aiRec.detectionCount === maxDetectionCount;
          const isConsensus = aiRec.detectionCount && aiRec.detectionCount >= 3;
          
          return (
            <div key={index} className="w-full text-center">
              <Badge 
                variant={getConfidenceColor(aiRec.confidence)}
                className={`text-xs ${isMainRecommendation ? 'ring-2 ring-yellow-400' : ''}`}
              >
                {isMainRecommendation ? `⭐ CONSENSUS (${aiRec.detectionCount} détections)` : 
                 `${showIcon ? '🎯' : ''} ${formatBetType(aiRec.betType)} ${aiRec.prediction}`}
                {!isMainRecommendation && isConsensus && ` (${aiRec.detectionCount})`}
              </Badge>
              <div className="text-xs text-muted-foreground">
                Cote: {aiRec.odds.toFixed(2)} | Confiance: {confidence}%
              </div>
              {aiRec.reason && aiRec.reason.length > 0 && (
                <div className="text-xs text-blue-600 mt-1">
                  {aiRec.reason[0]}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (variant === 'table') {
    if (aiRecs.length === 0) {
      return (
        <div className="text-xs text-muted-foreground text-center">
          Aucune opportunité
        </div>
      );
    }

    const aiRec = aiRecs[0];
    const confidence = aiRec.confidenceScore || 75;
    const isConsensus = aiRec.detectionCount && aiRec.detectionCount >= 3;

    return (
      <div className="text-xs text-center space-y-1">
        <div className="font-medium text-green-700 flex items-center justify-center gap-1">
          {isConsensus ? (
            <span className="bg-gradient-to-r from-yellow-100 to-green-100 px-2 py-1 rounded-full border border-yellow-300">
              ⭐ CONSENSUS ({aiRec.detectionCount})
            </span>
          ) : (
            <div className="bg-gradient-to-r from-green-50 to-green-100 px-2 py-1 rounded-full border border-green-200">
              <span>⭐ {formatBetType(aiRec.betType)} {aiRec.prediction}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground font-medium">Cote:</span>
            <span className="font-bold text-green-700">{aiRec.odds.toFixed(2)}</span>
          </div>
          <div className="h-3 w-px bg-muted-foreground/30"></div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground font-medium">Confiance:</span>
            <span className="font-bold text-blue-600">{confidence}%</span>
          </div>
        </div>
        
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className="bg-green-100 p-3 rounded-lg border border-green-200 min-w-[200px]">
        <div className="flex items-center justify-center gap-2 mb-2">
          {showIcon && <Target className="h-4 w-4 text-green-600" />}
          <span className="text-sm font-semibold text-green-800">
            Recommandation{aiRecs.length > 1 ? 's' : ''} IA
          </span>
        </div>
        
        <div className="space-y-3 text-center">
          {aiRecs.map((aiRec, index) => {
            const confidence = aiRec.confidenceScore || 75;
            // Identifier la recommandation avec le plus de détections (consensus ≥3)
            const maxDetectionCount = Math.max(...aiRecs.map(r => r.detectionCount || 0));
            const isMainRecommendation = (aiRec.detectionCount || 0) >= 3 && aiRec.detectionCount === maxDetectionCount;
            const isConsensus = aiRec.detectionCount && aiRec.detectionCount >= 3;
            
            return (
              <div key={index} className={`${index > 0 ? 'pt-3 border-t border-green-300' : ''} ${isMainRecommendation ? 'bg-yellow-50 p-2 rounded border border-yellow-200' : ''}`}>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-green-600 font-medium">Type</div>
                    <div className="text-green-800 flex items-center gap-1">
                      {isMainRecommendation ? (
                        <span>⭐ CONSENSUS ({aiRec.detectionCount})</span>
                      ) : (
                        <span>{formatBetType(aiRec.betType)}</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-green-600 font-medium">Prédiction</div>
                    <div className="text-green-800 flex items-center gap-1">
                      <span>{aiRec.prediction}</span>
                      {isConsensus && <span className="text-yellow-600 text-xs">({aiRec.detectionCount})</span>}
                    </div>
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
                
                {aiRec.reason && aiRec.reason.length > 0 && (
                  <div className="pt-2 text-xs text-blue-700 border-t border-green-300 mt-2">
                    <div className="font-medium">Justification:</div>
                    {aiRec.reason.map((r, i) => (
                      <div key={i} className="text-blue-600">{r}</div>
                    ))}
                  </div>
                )}
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
            const confidence = aiRec.confidenceScore || 75;
            // Identifier la recommandation avec le plus de détections (consensus ≥3)
            const maxDetectionCount = Math.max(...aiRecs.map(r => r.detectionCount || 0));
            const isMainRecommendation = (aiRec.detectionCount || 0) >= 3 && aiRec.detectionCount === maxDetectionCount;
            const isConsensus = aiRec.detectionCount && aiRec.detectionCount >= 3;
            
            return (
              <div key={index} className={`${index > 0 ? 'pt-4 border-t border-green-300' : ''} ${isMainRecommendation ? 'bg-gradient-to-r from-yellow-50 to-green-50 p-3 rounded-lg border border-yellow-300' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <Badge 
                    variant={getConfidenceColor(aiRec.confidence)}
                    className={`text-sm px-3 py-1 ${isMainRecommendation ? 'ring-2 ring-yellow-400' : ''}`}
                  >
                    {isMainRecommendation ? `⭐ CONSENSUS (${aiRec.detectionCount} détections)` : 
                     `${formatBetType(aiRec.betType)} ${aiRec.prediction}`}
                    {!isMainRecommendation && isConsensus && ` (${aiRec.detectionCount})`}
                  </Badge>
                  <div className="text-xl font-bold text-green-700">
                    {aiRec.odds.toFixed(2)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-green-600">Confiance:</span>
                  <span className="font-semibold text-green-800">{confidence}%</span>
                </div>
                
                <div className="relative h-2 bg-green-200 rounded-full overflow-hidden">
                  <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full"
                    style={{ width: `${confidence}%` }}
                  />
                </div>
                
                {aiRec.reason && aiRec.reason.length > 0 && (
                  <div className="mt-3 p-2 bg-blue-50 rounded border-l-4 border-blue-400">
                    <div className="text-xs font-medium text-blue-800 mb-1">Justification:</div>
                    {aiRec.reason.map((r, i) => (
                      <div key={i} className="text-xs text-blue-700">{r}</div>
                    ))}
                  </div>
                )}
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
