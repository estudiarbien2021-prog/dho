import React, { useState, useEffect, useMemo } from 'react';
import { ProcessedMatch } from '@/types/match';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { FlagMini } from '@/components/Flag';
import { leagueToFlag } from '@/lib/leagueCountry';
import { generateConfidenceScore } from '@/lib/confidence';
import { detectOpportunities, convertOpportunityToAIRecommendation, prioritizeOpportunitiesByRealProbability } from '@/lib/opportunityDetection';
import { conditionalRulesService } from '@/services/conditionalRulesService';
import { CONDITION_LABELS, ACTION_LABELS, OPERATOR_LABELS, MARKET_LABELS } from '@/types/conditionalRules';
import AIRecommendationDisplay from '@/components/AIRecommendationDisplay';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, TrendingDown, Target, Eye, Download, Loader2, Zap, Brain, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import { NeuralNetworkVisualization } from '@/components/charts/NeuralNetworkVisualization';
import { ConfidenceScoreBars } from '@/components/charts/ConfidenceScoreBars';
import { InfluenceFactors } from '@/components/charts/InfluenceFactors';
import { TeamRadarChart } from '@/components/charts/RadarChart';
import { TimelineMomentum } from '@/components/charts/TimelineMomentum';
import { ProbabilityDistribution } from '@/components/charts/ProbabilityDistribution';
import { ScorePredictionMatrix } from '@/components/charts/ScorePredictionMatrix';
import { ConfidenceRadar } from '@/components/charts/ConfidenceRadar';
import { MarketEfficiencyGauge } from '@/components/charts/MarketEfficiencyGauge';
import { AIConsensusGauge } from '@/components/charts/AIConsensusGauge';
import { PredictionCertaintyBars } from '@/components/charts/PredictionCertaintyBars';
import { AIProbabilitiesAnalysis } from '@/components/charts/AIProbabilitiesAnalysis';

interface MatchDetailModalProps {
  match: ProcessedMatch | null;
  isOpen: boolean;
  onClose: () => void;
  marketFilters?: string[];
  preCalculatedRecommendations?: any[];
}

export function MatchDetailModal({ match, isOpen, onClose, marketFilters = [], preCalculatedRecommendations }: MatchDetailModalProps) {
  const [showAIGraphics, setShowAIGraphics] = useState(true);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState<{ [key: string]: number }>({});
  const [allRuleEvaluations, setAllRuleEvaluations] = useState<any[]>([]);

  // Reset AI graphics when modal closes
  useEffect(() => {
    if (isOpen) {
      setShowAIGraphics(true);
    } else {
      setShowAIGraphics(false);
    }
  }, [isOpen]);

  // Initialize loading states when modal opens
  useEffect(() => {
    if (isOpen) {
      setChartLoading({
        results1x2: 0,
        btts: 0,
        over25: 0
      });

      const charts = ['results1x2', 'btts', 'over25'];
      charts.forEach((chart, index) => {
        setTimeout(() => {
          setChartLoading(prev => ({ ...prev, [chart]: 100 }));
        }, (index + 1) * 800);
      });
    }
  }, [isOpen]);

  // Load opportunities when modal opens
  useEffect(() => {
    const loadOpportunities = async () => {
      if (!match) return;
      
      try {
        setLoading(true);
        
        // Evaluate rules for debug section
        const ruleContext = {
          vigorish_1x2: match.vig_1x2,
          vigorish_btts: match.vig_btts || 0,
          vigorish_ou25: match.vig_ou_2_5,
          probability_home: match.p_home_fair,
          probability_draw: match.p_draw_fair,
          probability_away: match.p_away_fair,
          probability_btts_yes: match.p_btts_yes_fair,
          probability_btts_no: match.p_btts_no_fair,
          probability_over25: match.p_over_2_5_fair,
          probability_under25: match.p_under_2_5_fair,
          odds_home: match.odds_home,
          odds_draw: match.odds_draw,
          odds_away: match.odds_away,
          odds_btts_yes: match.odds_btts_yes || 0,
          odds_btts_no: match.odds_btts_no || 0,
          odds_over_25: match.odds_over_2_5 || 0,
          odds_under_25: match.odds_under_2_5 || 0
        };
        
        const ruleResults = await conditionalRulesService.evaluateRules(ruleContext);
        setAllRuleEvaluations(ruleResults);
        
        // Use pre-calculated recommendations if available
        if (preCalculatedRecommendations) {
          setLoading(false);
          return;
        }
        
        const opps = await detectOpportunities(match);
        setOpportunities(opps);
        console.log('🔴 MODAL OPPORTUNITIES - RAW (FALLBACK):', opps.length, opps.map(o => `${o.type}:${o.prediction}(inverted:${o.isInverted})`));
      } catch (error) {
        console.error('Error loading opportunities:', error);
        setOpportunities([]);
        setAllRuleEvaluations([]);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && match) {
      loadOpportunities();
    }
  }, [match, isOpen, preCalculatedRecommendations]);

  if (!match) return null;

  console.log('🔴 MODAL OUVERT POUR:', match.home_team, 'vs', match.away_team, '- ID:', match.id);
  console.log('🔍 DEBUG PROBABILITÉS BRUTES:', {
    p_home_fair: match.p_home_fair,
    p_draw_fair: match.p_draw_fair,
    p_away_fair: match.p_away_fair,
    p_btts_yes_fair: match.p_btts_yes_fair,
    p_btts_no_fair: match.p_btts_no_fair,
    p_over_2_5_fair: match.p_over_2_5_fair,
    p_under_2_5_fair: match.p_under_2_5_fair
  });

  const flagInfo = leagueToFlag(match.league, match.country, match.home_team, match.away_team);

  const get1x2Percentages = () => {
    // Vérifier si les valeurs sont déjà en pourcentage (> 1) ou en décimal (< 1)
    const homeValue = match.p_home_fair > 1 ? match.p_home_fair : match.p_home_fair * 100;
    const drawValue = match.p_draw_fair > 1 ? match.p_draw_fair : match.p_draw_fair * 100;
    const awayValue = match.p_away_fair > 1 ? match.p_away_fair : match.p_away_fair * 100;
    
    const homePercent = homeValue.toFixed(1);
    const drawPercent = drawValue.toFixed(1);
    const awayPercent = awayValue.toFixed(1);
    
    console.log('🔍 1X2 PERCENTAGES CALCULÉS:', { homePercent, drawPercent, awayPercent });
    
    return `Domicile ${homePercent}% | Nul ${drawPercent}% | Extérieur ${awayPercent}%`;
  };

  const getBttsPercentages = () => {
    const yesValue = match.p_btts_yes_fair > 1 ? match.p_btts_yes_fair : match.p_btts_yes_fair * 100;
    const noValue = match.p_btts_no_fair > 1 ? match.p_btts_no_fair : match.p_btts_no_fair * 100;
    
    const yesPercent = yesValue.toFixed(1);
    const noPercent = noValue.toFixed(1);
    
    console.log('🔍 BTTS PERCENTAGES CALCULÉS:', { yesPercent, noPercent });
    
    return `Oui ${yesPercent}% | Non ${noPercent}%`;
  };

  const getOver25Percentages = () => {
    const overValue = match.p_over_2_5_fair > 1 ? match.p_over_2_5_fair : match.p_over_2_5_fair * 100;
    const underValue = match.p_under_2_5_fair > 1 ? match.p_under_2_5_fair : match.p_under_2_5_fair * 100;
    
    const overPercent = overValue.toFixed(1);
    const underPercent = underValue.toFixed(1);
    
    console.log('🔍 O/U 2.5 PERCENTAGES CALCULÉS:', { overPercent, underPercent });
    
    return `+2,5 buts ${overPercent}% | -2,5 buts ${underPercent}%`;
  };

  const get1x2Winner = () => {
    if (match.p_home_fair > match.p_draw_fair && match.p_home_fair > match.p_away_fair) {
      return match.home_team;
    } else if (match.p_away_fair > match.p_draw_fair && match.p_away_fair > match.p_home_fair) {
      return match.away_team;
    } else {
      return 'Nul';
    }
  };

  const normalizeRecommendation = (rec: any) => {
    console.log('🔍 NORMALIZE INPUT:', rec);
    
    if (!rec) return null;
    
    const normalized = {
      type: rec.betType || rec.type || 'Aucune',
      prediction: rec.prediction || 'Aucune',
      odds: rec.odds || 0,
      confidence: rec.confidence || 'low'
    };
    
    console.log('🔍 NORMALIZE OUTPUT:', normalized);
    
    return normalized;
  };

  const getBttsWinner = () => match.p_btts_yes_fair > match.p_btts_no_fair ? 'Oui' : 'Non';
  const getOver25Winner = () => {
    return match.p_over_2_5_fair > match.p_under_2_5_fair ? '+2,5 buts' : '-2,5 buts';
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chargement...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  // Use pre-calculated recommendations if available, otherwise calculate them
  const allRecommendations = preCalculatedRecommendations || (() => {
    console.log('🔴 MODAL - OPPORTUNITIES BRUTES AVANT PRIORISATION (FALLBACK):', opportunities.length, opportunities.map(o => `${o.type}:${o.prediction}(inv:${o.isInverted})`));
    
    const prioritizedOpportunities = prioritizeOpportunitiesByRealProbability(opportunities, match);
    console.log('🔴 MODAL - AFTER PRIORITIZATION (FALLBACK):', prioritizedOpportunities.length, prioritizedOpportunities.map(o => `${o.type}:${o.prediction}(inv:${o.isInverted})`));
    
    const allDetectedRecommendations = prioritizedOpportunities.map(convertOpportunityToAIRecommendation);
    console.log('🔴 MODAL - APRÈS CONVERSION (FALLBACK):', allDetectedRecommendations.length, allDetectedRecommendations.map(r => `${r.betType}:${r.prediction}`));
    
    return allDetectedRecommendations;
  })();
  
  console.log('🔴 MODAL - SOURCE RECOMMANDATIONS:', preCalculatedRecommendations ? 'PRE-CALCULÉES' : 'CALCULÉES À LA VOLÉE');
  
  console.log('🔴 MODAL - RECOMMANDATIONS FINALES AFFICHÉES:', allRecommendations.length, allRecommendations.map(r => `${r.betType}:${r.prediction}`));

  console.log('🚨 DEBUG MatchDetailModal:', {
    matchName: `${match.home_team} vs ${match.away_team}`,
    totalOpportunities: opportunities.length,
    allRecommendations: allRecommendations.length,
    firstRecommendation: allRecommendations[0] ? {
      betType: allRecommendations[0].betType,
      prediction: allRecommendations[0].prediction,
      odds: allRecommendations[0].odds
    } : null
  });

  const getOddsFromRecommendation = (opp: any) => {
    if (!opp || !opp.odds) return 0;
    return opp.odds;
  };

  const saveMainPrediction = async (mainPrediction: string, confidence: number) => {
    try {
      const { error } = await supabase
        .from('matches')
        .update({ 
          ai_prediction: mainPrediction,
          ai_confidence: confidence 
        })
        .eq('id', match.id);
      
      if (error) {
        console.error('Error saving AI prediction:', error);
      } else {
        console.log('AI prediction saved successfully:', mainPrediction);
      }
    } catch (error) {
      console.error('Error saving AI prediction:', error);
    }
  };

  const mainRecommendation = allRecommendations.length > 0 ? {
    ...normalizeRecommendation(allRecommendations[0]),
    isInverted: opportunities[0]?.isInverted || false,
    reason: opportunities[0]?.reason || []
  } : null;
  
  console.log('🚨 DEBUG MatchDetailModal - Final recommendation after normalize:', mainRecommendation);
  
  const secondAIRecommendation = allRecommendations.length > 1 ? {
    ...normalizeRecommendation(allRecommendations[1]),
    isInverted: opportunities[1]?.isInverted || false,
    reason: opportunities[1]?.reason || [],
    vigorish: opportunities[1]?.type === '1X2' ? match.vig_1x2 : 
              opportunities[1]?.type === 'BTTS' ? match.vig_btts : match.vig_ou_2_5,
    probability: opportunities[1]?.type === '1X2' ? Math.max(match.p_home_fair, match.p_draw_fair, match.p_away_fair) :
                 opportunities[1]?.type === 'BTTS' ? Math.max(match.p_btts_yes_fair, match.p_btts_no_fair) :
                 Math.max(match.p_over_2_5_fair, match.p_under_2_5_fair)
  } : null;
  
  console.log('🚨 VRAIES PROBABILITÉS O/U 2.5:', {
    'p_over_2_5_fair': match.p_over_2_5_fair,
    'p_under_2_5_fair': match.p_under_2_5_fair,
    'over_plus_probable': match.p_over_2_5_fair > match.p_under_2_5_fair,
    'under_plus_probable': match.p_under_2_5_fair > match.p_over_2_5_fair,
    'vigorish_ou_2_5': match.vig_ou_2_5,
    'odds_over_2_5': match.odds_over_2_5,
    'odds_under_2_5': match.odds_under_2_5
  });

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Helper function to format validated rule descriptions from RuleEvaluationResult
  const formatValidatedRuleDescription = (ruleEvaluation: any) => {
    if (!ruleEvaluation) return 'Règle inconnue';
    
    const marketLabel = MARKET_LABELS[ruleEvaluation.market] || ruleEvaluation.market;
    const actionLabel = ACTION_LABELS[ruleEvaluation.action] || ruleEvaluation.action;
    
    // Use evaluation details if available, otherwise construct basic description
    if (ruleEvaluation.evaluationDetails) {
      return `Si ${ruleEvaluation.evaluationDetails} → ${actionLabel}`;
    } else {
      return `Marché ${marketLabel} → ${actionLabel}`;
    }
  };

  const getMarketBadgeColor = (market: string) => {
    switch (market) {
      case '1x2': return 'bg-blue-100 text-blue-700';
      case 'btts': return 'bg-green-100 text-green-700';
      case 'ou25': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <FlagMini 
                  code={flagInfo.code}
                  confed={flagInfo.confed}
                />
                <span className="text-lg font-semibold">
                  {match.home_team} vs {match.away_team}
                </span>
              </div>
              <Badge variant="outline" className="text-xs">
                {match.league}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-text-weak">
              <Clock className="h-4 w-4" />
              {format(new Date(match.kickoff_utc), 'dd/MM/yyyy HH:mm', { locale: fr })}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6">
          {/* AI Recommendations Section */}
          {allRecommendations.length > 0 && (
            <Card className="p-6 bg-gradient-to-r from-primary/5 to-accent/5">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Analyse IA Complète</h3>
                <Badge variant="secondary" className="bg-primary/20 text-primary">
                  {allRecommendations.length} recommandation{allRecommendations.length > 1 ? 's' : ''} détectée{allRecommendations.length > 1 ? 's' : ''}
                </Badge>
              </div>
              
              <div className="space-y-4">
                {/* All Recommendations Grid */}
                <div className="grid gap-3">
                  <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Toutes les opportunités détectées:
                  </h4>
   {allRecommendations.map((rec, index) => {
                     // For pre-calculated recommendations, we don't have prioritizedOpportunities
                     const opportunity = preCalculatedRecommendations ? null : (() => {
                       const prioritizedOpportunities = prioritizeOpportunitiesByRealProbability(opportunities, match);
                       return prioritizedOpportunities[index];
                     })();
                     const isMainConsensus = rec.detectionCount >= 3;
                     return (
                       <div key={index} className={`p-4 rounded-lg border-l-4 ${
                         isMainConsensus ? 'bg-yellow-50 border-yellow-500' :
                         index === 0 ? 'bg-primary/15 border-primary' :
                         index === 1 ? 'bg-secondary/15 border-secondary' :
                         index === 2 ? 'bg-accent/15 border-accent' :
                         'bg-muted/15 border-muted'
                       }`}>
                         <div className="flex items-center justify-between">
                           <div className="flex-1">
                             <div className="flex items-center gap-2 mb-1">
                               {isMainConsensus && (
                                 <span className="text-xl">⭐</span>
                               )}
                               <Badge variant={isMainConsensus ? "default" : index === 0 ? "default" : "outline"} 
                                      className={`text-xs ${isMainConsensus ? 'bg-yellow-500 text-white' : ''}`}>
                                  {isMainConsensus ? 'RECOMMANDATION PRINCIPALE' : 
                                   `${index === 0 ? 'principale' : index === 1 ? 'secondaire' : `PRIORITÉ ${opportunity?.priority || 'N/A'}`}`}
                               </Badge>
                               <span className="font-semibold text-sm">{rec.betType === 'O/U 2.5' ? '+/- 2.5' : rec.betType}</span>
                               {rec.detectionCount > 1 && (
                                 <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                                   {rec.detectionCount} détections
                                 </Badge>
                               )}
                             </div>
                             <p className="text-base font-medium text-foreground">
                               → {rec.prediction}
                             </p>
                             <div className="flex items-center gap-3 mt-2">
                               <Badge variant="outline" className="font-mono">
                                 Cote: {rec.odds.toFixed(2)}
                               </Badge>
                               <Badge className={`${getConfidenceColor(rec.confidence)} text-white text-xs`}>
                                 Confiance: {rec.confidence.toUpperCase()}
                               </Badge>
                               {rec.isInverted && (
                                 <Badge variant="destructive" className="text-xs">STRATÉGIE INVERSÉE</Badge>
                               )}
                             </div>
                           </div>
                         </div>
                         
                         {/* Reasoning for this recommendation */}
                         {rec.reason && rec.reason.length > 0 && (
                           <div className="mt-3 p-2 bg-white/50 rounded text-xs text-muted-foreground">
                             <strong>Justification:</strong> {rec.reason.join(' • ')}
                           </div>
                         )}
                       </div>
                     );
                   })}
                </div>

                {/* Summary Stats */}
                <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                  <div className="text-sm text-muted-foreground">
                    <strong>Résumé:</strong> {allRecommendations.length} recommandation{allRecommendations.length > 1 ? 's' : ''} détectée{allRecommendations.length > 1 ? 's' : ''} et affichée{allRecommendations.length > 1 ? 's' : ''} • {opportunities.length} opportunité{opportunities.length > 1 ? 's' : ''} brute{opportunities.length > 1 ? 's' : ''} analysée{opportunities.length > 1 ? 's' : ''}
                    {allRecommendations.some(r => r.isInverted) && (
                      <span className="ml-2 text-orange-600">• Inclut des stratégies contrariennes</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Debug Information - Règles validées et recommandations générées */}
          <Card className="p-4 bg-green-50">
            <h3 className="font-semibold mb-4 text-green-800 flex items-center gap-2">
              🔍 Debug - Règles validées et recommandations générées
            </h3>
            
            {/* Statistiques simplifiées */}
            <div className="mb-6 p-3 bg-white/50 rounded-lg">
              <h4 className="font-semibold mb-2 text-green-700">📊 Statistiques d'évaluation</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-800">{allRuleEvaluations.length}</div>
                  <div className="text-blue-600">Règles évaluées</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{allRuleEvaluations.filter(r => r && r.conditionsMet).length}</div>
                  <div className="text-green-600">Règles validées ✅</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-600">{allRecommendations.length}</div>
                  <div className="text-purple-600">Recommandations finales</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-green-700">
                <strong>Source:</strong> {preCalculatedRecommendations ? 'Pré-calculées' : 'Calculées à la volée'}
              </div>
            </div>

            {/* Liste des règles validées uniquement */}
            {allRuleEvaluations.filter(r => r && r.conditionsMet).length > 0 ? (
              <div className="mb-4">
                <h4 className="font-semibold mb-2 text-green-700 flex items-center gap-2 text-sm">
                  <CheckCircle className="h-3 w-3" />
                  Règles validées ({allRuleEvaluations.filter(r => r && r.conditionsMet).length})
                </h4>
                <div className="p-3 bg-green-50 border border-green-200 rounded text-xs leading-relaxed">
                  {allRuleEvaluations
                    .filter(r => r && r.conditionsMet)
                    .sort((a, b) => (a.priority || 0) - (b.priority || 0))
                    .map((ruleEvaluation, index) => {
                      const marketLabel = MARKET_LABELS[ruleEvaluation.market] || ruleEvaluation.market;
                      return (
                        <span key={`validated-${index}`} className="mr-2">
                          <span className="inline-flex items-center gap-1">
                            <span className="text-green-600">✅</span>
                            <span className="font-medium text-green-800">{marketLabel}</span>
                            <span className="text-gray-600">(P{ruleEvaluation.priority || 0})</span>
                            <span className="text-green-700">{formatValidatedRuleDescription(ruleEvaluation)}</span>
                          </span>
                          {index < allRuleEvaluations.filter(r => r && r.conditionsMet).length - 1 && <span className="text-gray-400"> • </span>}
                        </span>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="font-semibold mb-2 text-gray-600 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Aucune règle validée
                </h4>
                <p className="text-sm text-gray-500 italic">
                  Aucune règle n'a été validée pour ce match. Toutes les règles évaluées ont échoué aux conditions définies.
                </p>
              </div>
            )}

            {/* Détails techniques (seulement si calculé à la volée) */}
            {!preCalculatedRecommendations && opportunities.length > 0 && (
              <div className="mt-4 p-3 bg-white/30 rounded-lg">
                <h5 className="font-semibold mb-2 text-green-700 text-xs">🔧 Détails techniques du pipeline</h5>
                <div className="space-y-1 text-xs text-green-600">
                  <div><strong>Opportunités brutes détectées:</strong> {opportunities.length}</div>
                  <div><strong>Après priorisation:</strong> {(() => {
                    const prioritizedOpportunities = prioritizeOpportunitiesByRealProbability(opportunities, match);
                    return prioritizedOpportunities.length;
                  })()}</div>
                  <div><strong>Recommandations affichées:</strong> {allRecommendations.length}</div>
                </div>
              </div>
            )}
          </Card>

          {/* Match Statistics */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Résultat 1X2
              </h3>
              <div className="space-y-2">
                <div className="text-sm text-text-weak">{get1x2Percentages()}</div>
                <div className="text-sm">
                  <strong>Plus probable:</strong> {get1x2Winner()}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={match.vig_1x2 < 0.06 ? "default" : "destructive"}>
                    Vigorish: {(match.vig_1x2 * 100).toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                BTTS
              </h3>
              <div className="space-y-2">
                <div className="text-sm text-text-weak">{getBttsPercentages()}</div>
                <div className="text-sm">
                  <strong>Plus probable:</strong> {getBttsWinner()}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={(match.vig_btts || 0) < 0.06 ? "default" : "destructive"}>
                    Vigorish: {((match.vig_btts || 0) * 100).toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Over/Under 2.5
              </h3>
              <div className="space-y-2">
                <div className="text-sm text-text-weak">{getOver25Percentages()}</div>
                <div className="text-sm">
                  <strong>Plus probable:</strong> {getOver25Winner()}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={match.vig_ou_2_5 < 0.06 ? "default" : "destructive"}>
                    Vigorish: {(match.vig_ou_2_5 * 100).toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </Card>
          </div>

          {/* Odds Display */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Cotes</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-medium mb-2">1X2</h4>
                <div className="space-y-1 text-sm">
                  <div>Domicile: {match.odds_home.toFixed(2)}</div>
                  <div>Nul: {match.odds_draw.toFixed(2)}</div>
                  <div>Extérieur: {match.odds_away.toFixed(2)}</div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">BTTS</h4>
                <div className="space-y-1 text-sm">
                  <div>Oui: {match.odds_btts_yes?.toFixed(2) || 'N/A'}</div>
                  <div>Non: {match.odds_btts_no?.toFixed(2) || 'N/A'}</div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Over/Under 2.5</h4>
                <div className="space-y-1 text-sm">
                  <div>Over: {match.odds_over_2_5?.toFixed(2) || 'N/A'}</div>
                  <div>Under: {match.odds_under_2_5?.toFixed(2) || 'N/A'}</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
