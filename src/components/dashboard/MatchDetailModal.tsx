import React, { useState, useEffect, useMemo } from 'react';
import { ProcessedMatch } from '@/types/match';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { FlagMini } from '@/components/Flag';
import { leagueToFlag } from '@/lib/leagueCountry';
import { generateConfidenceScore } from '@/lib/confidence';
import { detectOpportunities, convertOpportunityToAIRecommendation } from '@/lib/opportunityDetection';
import AIRecommendationDisplay from '@/components/AIRecommendationDisplay';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, TrendingDown, Target, Eye, Download, Loader2, Zap, Brain, TrendingUp } from 'lucide-react';
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
}

export function MatchDetailModal({ match, isOpen, onClose, marketFilters = [] }: MatchDetailModalProps) {
  // Early return BEFORE any hooks - TeamChemistryAnalyzer removed
  if (!match) return null;

  console.log('🔴 MODAL OUVERT POUR:', match.home_team, 'vs', match.away_team, '- ID:', match.id);
  console.log('🔍 JSX STRUCTURE DEBUG: Modal component started');

  const [showAIGraphics, setShowAIGraphics] = useState(false);
  
  // Trigger AI graphics animation when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShowAIGraphics(true), 500);
      return () => clearTimeout(timer);
    } else {
      setShowAIGraphics(false);
    }
  }, [isOpen]);

  const flagInfo = leagueToFlag(match.league, match.country, match.home_team, match.away_team);

  // Determine winning predictions with percentages display
  const get1x2Percentages = () => {
    const homePercent = (match.p_home_fair * 100).toFixed(1);
    const drawPercent = (match.p_draw_fair * 100).toFixed(1);
    const awayPercent = (match.p_away_fair * 100).toFixed(1);
    return `Domicile ${homePercent}% | Nul ${drawPercent}% | Extérieur ${awayPercent}%`;
  };

  const getBttsPercentages = () => {
    const yesPercent = (match.p_btts_yes_fair * 100).toFixed(1);
    const noPercent = (match.p_btts_no_fair * 100).toFixed(1);
    return `Oui ${yesPercent}% | Non ${noPercent}%`;
  };

  const getOver25Percentages = () => {
    const overPercent = (match.p_over_2_5_fair * 100).toFixed(1);
    const underPercent = (match.p_under_2_5_fair * 100).toFixed(1);
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

  // Generate ALL AI recommendations for the match
  const opportunities = detectOpportunities(match);
  const allAIRecommendations = opportunities.map(convertOpportunityToAIRecommendation);
  
  // Helper function to normalize recommendation object
  const normalizeRecommendation = (rec: any) => {
    if (!rec) return null;
    
    const normalized = {
      type: rec.betType || rec.type || 'Aucune',
      prediction: rec.prediction || 'Aucune',
      odds: rec.odds || 0,
      confidence: rec.confidence || 'low'
    };
    
    return normalized;
  };

  // Map all detected opportunities to the three recommendation slots
  const recommendation = allAIRecommendations.length > 0 ? {
    ...normalizeRecommendation(allAIRecommendations[0]),
    isInverted: opportunities[0]?.isInverted || false,
    reason: opportunities[0]?.reason || []
  } : null;
  
  const secondAIRecommendation = allAIRecommendations.length > 1 ? {
    ...normalizeRecommendation(allAIRecommendations[1]), 
    isInverted: opportunities[1]?.isInverted || false,
    reason: opportunities[1]?.reason || [],
    vigorish: opportunities[1]?.type === '1X2' ? match.vig_1x2 : 
              opportunities[1]?.type === 'BTTS' ? match.vig_btts : match.vig_ou_2_5,
    probability: opportunities[1]?.type === '1X2' ? Math.max(match.p_home_fair, match.p_draw_fair, match.p_away_fair) :
                 opportunities[1]?.type === 'BTTS' ? Math.max(match.p_btts_yes_fair, match.p_btts_no_fair) :
                 Math.max(match.p_over_2_5_fair, match.p_under_2_5_fair)
  } : null;
  
  const thirdAIRecommendation = allAIRecommendations.length > 2 ? {
    ...normalizeRecommendation(allAIRecommendations[2]),
    isInverted: opportunities[2]?.isInverted || false,
    reason: opportunities[2]?.reason || [],
    vigorish: opportunities[2]?.type === '1X2' ? match.vig_1x2 : 
              opportunities[2]?.type === 'BTTS' ? match.vig_btts : match.vig_ou_2_5,
    probability: opportunities[2]?.type === '1X2' ? Math.max(match.p_home_fair, match.p_draw_fair, match.p_away_fair) :
                 opportunities[2]?.type === 'BTTS' ? Math.max(match.p_btts_yes_fair, match.p_btts_no_fair) :
                 Math.max(match.p_over_2_5_fair, match.p_under_2_5_fair)
  } : null;

  const generateRecommendationExplanation = (rec: any) => {
    if (!rec || rec.type === 'Aucune') {
      return 'Aucune recommandation spécifique pour ce match.';
    }
    return `Recommandation basée sur l'analyse avancée du match ${match.home_team} vs ${match.away_team}.`;
  };

  const shouldShowAIRecommendation = () => {
    if (!recommendation) return false;
    return true;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden bg-gradient-to-br from-surface via-surface-soft to-surface border-border shadow-2xl rounded-3xl p-0 backdrop-blur-xl">
        {/* Modern Overlay Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand/5 via-transparent to-brand/5 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,hsl(var(--brand)/0.1),rgba(255,255,255,0))] pointer-events-none" />
        
        <DialogHeader className="relative z-10 p-8 pb-6 border-b border-border bg-gradient-to-r from-surface-soft to-surface backdrop-blur-sm">
          <DialogTitle className="flex items-center gap-6">
            <div className="relative group">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand via-brand-400 to-brand-500 flex items-center justify-center shadow-xl group-hover:shadow-brand/25 transition-all duration-300 group-hover:scale-105">
                <FlagMini code={flagInfo.code} confed={flagInfo.confed} />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent opacity-50" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-br from-brand/20 to-brand-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            
            <div className="flex-1">
              <div className="text-3xl font-bold bg-gradient-to-r from-text via-text-weak to-text bg-clip-text text-transparent leading-tight mb-2">
                {match.home_team} vs {match.away_team}
              </div>
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 bg-gradient-to-r from-brand/10 to-brand/20 rounded-full border border-brand/20">
                  <span className="text-sm font-semibold text-brand">{match.league}</span>
                </div>
                <div className="w-2 h-2 bg-brand rounded-full animate-pulse" />
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="relative z-10 p-8 space-y-8 overflow-y-auto max-h-[calc(90vh-140px)] scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {/* Enhanced Flags Section */}
          <div className="flex gap-3 flex-wrap justify-center">
            {match.watch_btts && (
              <Badge className="bg-gradient-to-r from-brand to-brand-400 text-brand-fg">
                Watch BTTS
              </Badge>
            )}
            {match.watch_over25 && (
              <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                Watch O/U 2.5
              </Badge>
            )}
          </div>

          <Separator className="bg-gradient-to-r from-transparent via-brand/30 to-transparent" />

          {/* Enhanced AI Graphics Section */}
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-brand via-brand-400 to-brand-500 bg-clip-text text-transparent mb-2">
                Intelligence Artificielle Avancée
              </h2>
              <p className="text-text-weak">
                Analyse prédictive complète avec 5 algorithmes d'IA différents
              </p>
            </div>
            
            {/* Two-column layout: AI Recommendations (left) + Market Efficiency (right) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: AI Recommendations */}
              <Card className="p-8 bg-gradient-to-br from-surface to-surface-soft border-border shadow-lg">
                <div className="flex items-center gap-3 mb-8">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-brand to-brand-400 rounded-xl shadow-lg">
                    <Target className="w-6 h-6 text-brand-fg" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-text">Recommandations de l'IA</h3>
                    <p className="text-sm text-text-weak">Analyse complète avec facteurs d'influence</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Primary AI Recommendation */}
                  {recommendation && shouldShowAIRecommendation() && (
                    <Card className="p-6 bg-white border border-surface-strong">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-brand rounded-lg flex items-center justify-center">
                              <Target className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-text">
                                {recommendation.type} {recommendation.prediction}
                              </h4>
                              <p className="text-sm text-text-weak">Recommandation principale</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-brand">
                              {recommendation.odds.toFixed(2)}
                            </div>
                          </div>
                        </div>

                        {/* Confidence Score */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-text">Niveau de confiance</span>
                            <span className="text-lg font-bold text-brand">
                              {generateConfidenceScore(match.id, recommendation)}%
                            </span>
                          </div>
                          <div className="w-full bg-surface-soft rounded-full h-3">
                            <div 
                              className="bg-brand h-3 rounded-full transition-all duration-1000"
                              style={{ width: `${showAIGraphics ? generateConfidenceScore(match.id, recommendation) : 0}%` }}
                            />
                          </div>
                        </div>

                        {/* Commentary */}
                        <div className="bg-surface-soft rounded-lg p-4">
                          <div className="text-sm text-text leading-6">
                            {generateRecommendationExplanation(recommendation)}
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}

                  {!recommendation && (
                    <div className="h-full flex items-center justify-center py-20">
                      <span className="text-text-weak text-lg">Aucune recommandation disponible</span>
                    </div>
                  )}
                </div>
              </Card>

              {/* Right Column: Market Efficiency */}
              <Card className="p-8 bg-gradient-to-br from-surface to-surface-soft border-border shadow-lg">
                <div className="flex items-center gap-3 mb-8">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl shadow-lg">
                    <TrendingDown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-text">Efficacité du Marché</h3>
                    <p className="text-sm text-text-weak">Analyse des inefficiences et opportunités</p>
                  </div>
                </div>
                
                <MarketEfficiencyGauge match={match} />
              </Card>
            </div>

            {/* Full Analysis Section - Below the two columns */}
            <Card className="p-8 bg-gradient-to-br from-surface to-surface-soft border-border shadow-lg">
              <div className="flex items-center gap-3 mb-8">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-lg">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-text">Analyse Complète</h3>
                  <p className="text-sm text-text-weak">Facteurs d'influence et analyse approfondie</p>
                </div>
              </div>
              
              <InfluenceFactors matchId={match.id} isActive={showAIGraphics} />
            </Card>
          </div>

          {/* Modern Actions Section */}
          <div className="flex justify-center pt-4 border-t border-border">
            <Button 
              className="relative group px-8 py-3 bg-gradient-to-r from-text to-text-weak hover:from-text-weak hover:to-text text-surface font-semibold rounded-2xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden"
              onClick={onClose}>
              <div className="absolute inset-0 bg-gradient-to-r from-brand/10 to-brand/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative z-10 flex items-center gap-2">
                <span>Fermer</span>
                <div className="w-2 h-2 bg-current rounded-full opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
              </span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
