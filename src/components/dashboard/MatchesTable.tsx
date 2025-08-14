import React, { useState, useMemo } from 'react';
import { ProcessedMatch } from '@/types/match';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, Brain, ExternalLink, Eye, Globe } from 'lucide-react';
import { FlagMini } from '@/components/Flag';
import { leagueToFlag } from '@/lib/leagueCountry';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { generateConfidenceScore } from '@/lib/confidence';

import { generateAIRecommendation, AIRecommendation } from '@/lib/aiRecommendation';

interface MatchesTableProps {
  matches: ProcessedMatch[];
  onMatchClick: (match: ProcessedMatch) => void;
  marketFilters?: string[];
  groupBy?: 'time' | 'competition';
}

export function MatchesTable({ matches, onMatchClick, marketFilters = [], groupBy = 'time' }: MatchesTableProps) {
  const [sortField, setSortField] = useState<keyof ProcessedMatch>('kickoff_utc');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const sortedMatches = [...matches].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    if (aVal instanceof Date && bVal instanceof Date) {
      return sortDirection === 'asc' ? aVal.getTime() - bVal.getTime() : bVal.getTime() - aVal.getTime();
    }
    
    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();
    return sortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
  });

  const handleSort = (field: keyof ProcessedMatch) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatTime = (date: Date) => {
    // Use date-fns directly - it handles timezone conversion automatically
    return format(date, 'HH:mm', { locale: fr });
  };

  const formatDate = (date: Date) => {
    // Use date-fns directly - it handles timezone conversion automatically
    return format(date, 'dd/MM', { locale: fr });
  };

  const formatTimeWithTimeZone = (date: Date) => {
    // Use native JavaScript Intl API for proper timezone formatting
    const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
    
    return timeFormatter.format(date);
  };

  // Check if match starts within 60 minutes
  const isMatchStartingSoon = (kickoffTime: Date) => {
    const now = new Date();
    const timeDiff = kickoffTime.getTime() - now.getTime();
    const minutesUntil = timeDiff / (1000 * 60);
    
    // Return true if match starts within next 60 minutes and hasn't started yet
    return minutesUntil > 0 && minutesUntil <= 60;
  };

  // Check if competition is international or continental
  const isInternationalCompetition = (country: string | null, league: string) => {
    // Check country field
    if (country?.toLowerCase() === 'international') {
      return true;
    }
    
    // Check for continental competitions in league name
    const leagueLower = league.toLowerCase();
    const continentalKeywords = [
      'champions league', 'europa league', 'conference league', 'europa conference league',
      'libertadores', 'sudamericana', 'concacaf', 'afc cup', 'caf champions league',
      'continental', 'intercontinental', 'world cup', 'euro', 'copa america',
      'african nations', 'asian cup', 'confederation cup', 'nations league',
      'international', 'qualifying', 'friendly'
    ];
    
    return continentalKeywords.some(keyword => leagueLower.includes(keyword));
  };

  // Render flag or globe icon
  const renderCompetitionIcon = (match: ProcessedMatch) => {
    if (isInternationalCompetition(match.country, match.league)) {
      return <Globe className="h-4 w-4 text-blue-500" />;
    }
    
    const flagInfo = leagueToFlag(match.league, match.country, match.home_team, match.away_team);
    return <FlagMini code={flagInfo.code} confed={flagInfo.confed} />;
  };

  // Group matches by competition if needed
  const groupedMatches = useMemo(() => {
    if (groupBy !== 'competition') {
      return [{ league: null, matches: sortedMatches }];
    }
    
    // Group matches by league first
    const matchesByLeague = new Map<string, ProcessedMatch[]>();
    
    for (const match of matches) { // Use original matches, not sortedMatches
      if (!matchesByLeague.has(match.league)) {
        matchesByLeague.set(match.league, []);
      }
      matchesByLeague.get(match.league)!.push(match);
    }
    
    // Convert to array and sort each group internally
    const groups = Array.from(matchesByLeague.entries()).map(([league, leagueMatches]) => ({
      league,
      matches: [...leagueMatches].sort((a, b) => {
        if (sortField === 'kickoff_utc' || sortField === 'kickoff_local') {
          const aVal = a[sortField];
          const bVal = b[sortField];
          if (aVal instanceof Date && bVal instanceof Date) {
            return sortDirection === 'asc' ? aVal.getTime() - bVal.getTime() : bVal.getTime() - aVal.getTime();
          }
        }
        
        if (typeof a[sortField] === 'number' && typeof b[sortField] === 'number') {
          return sortDirection === 'asc' ? a[sortField] - b[sortField] : b[sortField] - a[sortField];
        }
        
        const aStr = String(a[sortField]).toLowerCase();
        const bStr = String(b[sortField]).toLowerCase();
        return sortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
      })
    }));
    
    // Sort groups by league name
    groups.sort((a, b) => a.league.localeCompare(b.league));
    
    return groups;
  }, [matches, groupBy, sortField, sortDirection]);

  if (matches.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Aucun match trouvé avec les filtres actuels.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {groupedMatches.map((group, groupIndex) => (
        <div key={group.league || 'default'}>
          {/* Competition Header */}
          {group.league && groupBy === 'competition' && (
            <div className="mb-4">
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-brand/10 to-brand-400/10 rounded-lg border border-brand/20">
                <div className="flex items-center gap-2">
                  {renderCompetitionIcon(group.matches[0])}
                  <h3 className="text-lg font-semibold text-brand">
                    {group.league}
                  </h3>
                </div>
                <div className="text-sm text-muted-foreground bg-white/50 px-3 py-1 rounded-full">
                  {group.matches.length} match{group.matches.length > 1 ? 's' : ''}
                </div>
              </div>
            </div>
          )}
          
          {/* Desktop Table */}
          <Card className="overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <Table>
                {/* Show header only for first group or when not grouped */}
                {(groupIndex === 0 || groupBy !== 'competition') && (
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 min-w-[200px]"
                        onClick={() => handleSort('league')}
                      >
                        Compétition
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 min-w-[250px]"
                        onClick={() => handleSort('home_team')}
                      >
                        Match
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('kickoff_utc')}
                      >
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Heure
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 hidden lg:table-cell"
                        onClick={() => handleSort('vig_1x2')}
                      >
                        Confiance
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-1">
                          <Brain className="h-4 w-4" />
                          <span className="hidden lg:inline">Recommandation IA</span>
                          <span className="lg:hidden">IA</span>
                        </div>
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">Probas</TableHead>
                      <TableHead className="w-[100px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                )}
                
                <TableBody>
                  {group.matches.map((match) => {
                    const flagInfo = leagueToFlag(match.league, match.country, match.home_team, match.away_team);
                    
                    return (
                      <TableRow 
                        key={match.id} 
                        className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                          isMatchStartingSoon(match.kickoff_utc) 
                            ? 'animate-pulse bg-slate-800 dark:bg-slate-900 text-white hover:bg-slate-700' 
                            : ''
                        }`}
                        onClick={() => onMatchClick(match)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {groupBy !== 'competition' && renderCompetitionIcon(match)}
                            <div>
                              <p className="font-medium text-sm">
                                {match.league}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{match.home_team}</p>
                            <p className="text-muted-foreground">vs {match.away_team}</p>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="text-center">
                            <p className="font-medium">{formatTimeWithTimeZone(match.kickoff_utc)}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(match.kickoff_utc)}</p>
                          </div>
                        </TableCell>
                        
                        <TableCell className="hidden lg:table-cell">
                          <span className={`font-bold ${match.vig_1x2 <= 0.12 ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {match.vig_1x2 <= 0.12 ? "Haute" : "Moyenne"}
                          </span>
                        </TableCell>
                        
                        <TableCell>
                          {(() => {
                            // Afficher d'abord les recommandations sauvegardées par l'admin
                            if (match.ai_prediction) {
                              // Validation de cohérence : vérifier si la prédiction admin est cohérente avec les probabilités IA
                              const validateAdminPrediction = (adminPred: string) => {
                                console.log('🔍 VALIDATION ADMIN PREDICTION:', {
                                  adminPred,
                                  p_over_2_5_fair: match.p_over_2_5_fair,
                                  p_under_2_5_fair: match.p_under_2_5_fair,
                                  p_btts_yes_fair: match.p_btts_yes_fair,
                                  p_btts_no_fair: match.p_btts_no_fair,
                                  home_team: match.home_team,
                                  away_team: match.away_team
                                });
                                
                                if (adminPred === '+2,5 buts') {
                                  const isValid = match.p_over_2_5_fair > match.p_under_2_5_fair;
                                  console.log('✅ +2,5 buts validation:', isValid);
                                  return isValid;
                                }
                                if (adminPred === '-2,5 buts') {
                                  const isValid = match.p_under_2_5_fair > match.p_over_2_5_fair;
                                  console.log('✅ -2,5 buts validation:', isValid);
                                  return isValid;
                                }
                                if (adminPred === 'BTTS Oui') {
                                  const isValid = match.p_btts_yes_fair > match.p_btts_no_fair;
                                  console.log('✅ BTTS Oui validation:', isValid);
                                  return isValid;
                                }
                                if (adminPred === 'BTTS Non') {
                                  const isValid = match.p_btts_no_fair > match.p_btts_yes_fair;
                                  console.log('✅ BTTS Non validation:', isValid);
                                  return isValid;
                                }
                                console.log('✅ Other prediction type accepted:', adminPred);
                                return true; // Pour les autres types (1X2), on accepte
                              };

                              // Si la prédiction admin n'est pas cohérente, on passe à la recommandation automatique
                              const isAdminPredictionValid = validateAdminPrediction(match.ai_prediction);
                              console.log('🎯 FINAL VALIDATION RESULT:', isAdminPredictionValid);
                              
                              if (isAdminPredictionValid) {
                                const predictions = {
                                  '1': match.home_team,
                                  'X': 'Nul', 
                                  '2': match.away_team,
                                  'BTTS Oui': 'BTTS Oui',
                                  'BTTS Non': 'BTTS Non',
                                  '+2,5 buts': '+2,5 buts',
                                  '-2,5 buts': '-2,5 buts'
                                };
                                const predictionText = predictions[match.ai_prediction as keyof typeof predictions] || match.ai_prediction;
                                const confidenceLevel = match.ai_confidence && match.ai_confidence > 0.8 ? 'high' : 
                                  match.ai_confidence && match.ai_confidence > 0.6 ? 'medium' : 'low';
                                
                                return (
                                  <div className="flex flex-col gap-1 items-center">
                                    <Badge 
                                      variant={confidenceLevel === 'high' ? 'default' : confidenceLevel === 'medium' ? 'secondary' : 'outline'}
                                      className="text-xs"
                                    >
                                      🎯 {predictionText}
                                    </Badge>
                                    <div className="text-xs text-muted-foreground text-center">
                                      Confiance: {generateConfidenceScore(match.id, {
                                        type: match.ai_prediction?.includes('BTTS') ? 'BTTS' : 
                                              match.ai_prediction?.includes('buts') ? 'O/U 2.5' : '1X2',
                                        prediction: match.ai_prediction,
                                        confidence: match.ai_confidence
                                      })}%
                                    </div>
                                  </div>
                                );
                              } else {
                                console.log('❌ ADMIN PREDICTION REJECTED - Using automatic recommendation instead');
                                // Si pas cohérent, on continue vers la recommandation automatique  
                              }
                            }
                            
                            const aiRec = generateAIRecommendation(match, marketFilters);
                            
                            if (!aiRec) {
                              return (
                                <div className="text-xs text-muted-foreground">
                                  Aucune opportunité détectée
                                </div>
                              );
                            }

                            return (
                              <div className="bg-green-100 p-2 rounded-lg border border-green-200 min-w-[180px] text-center">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                  <Brain className="h-3 w-3 text-green-600" />
                                  <span className="text-xs font-semibold text-green-700">Recommandation IA</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  <div>
                                    <span className="text-green-600">Type de pari</span>
                                    <div className="bg-green-200 text-green-800 px-2 py-1 rounded mt-1 font-medium">
                                      {aiRec.betType}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-green-600">Prédiction</span>
                                    <div className="text-green-800 font-medium mt-1">
                                      {aiRec.prediction}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-green-600">Cote</span>
                                    <div className="bg-green-200 text-green-800 px-2 py-1 rounded mt-1 font-bold">
                                      {aiRec.odds.toFixed(2)}
                                    </div>
                                  </div>
                                 </div>
                                 <div className="text-xs text-muted-foreground mt-1 text-center">
                                   Confiance: {generateConfidenceScore(match.id, aiRec)}%
                                 </div>
                               </div>
                             );
                           })()}
                        </TableCell>
                        
                        <TableCell>
                          {(() => {
                            const homeProb = match.p_home_fair * 100;
                            const drawProb = match.p_draw_fair * 100;
                            const awayProb = match.p_away_fair * 100;
                            const maxProb = Math.max(homeProb, drawProb, awayProb);
                            
                            return (
                              <div className="text-xs space-y-1">
                                <div className="flex justify-between">
                                  <span>H:</span>
                                  <span className={`font-mono ${homeProb === maxProb ? 'font-bold' : ''}`}>
                                    {homeProb.toFixed(0)}%
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>D:</span>
                                  <span className={`font-mono ${drawProb === maxProb ? 'font-bold' : ''}`}>
                                    {drawProb.toFixed(0)}%
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>A:</span>
                                  <span className={`font-mono ${awayProb === maxProb ? 'font-bold' : ''}`}>
                                    {awayProb.toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </TableCell>
                        
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMatchClick(match);
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {group.matches.map((match) => {
              const flagInfo = leagueToFlag(match.league, match.country, match.home_team, match.away_team);
              const aiRec = generateAIRecommendation(match, marketFilters);
              
              return (
                <Card 
                  key={match.id} 
                  className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                    isMatchStartingSoon(match.kickoff_utc) 
                      ? 'animate-pulse bg-slate-800 dark:bg-slate-900 text-white border-slate-600' 
                      : ''
                  }`} 
                  onClick={() => onMatchClick(match)}
                >
                  <div className="space-y-3">
                    {/* League & Time */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {renderCompetitionIcon(match)}
                        <span className="text-sm font-medium">{match.league}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatTime(match.kickoff_utc)}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(match.kickoff_utc)}</p>
                      </div>
                    </div>
                    
                    {/* Match */}
                    <div className="text-center py-2 border-y border-muted">
                      <p className="font-medium">{match.home_team}</p>
                      <p className="text-xs text-muted-foreground">vs</p>
                      <p className="font-medium">{match.away_team}</p>
                    </div>
                    
                    {/* AI Recommendation */}
                    <div className="space-y-2">
                      {aiRec ? (
                        <div className="bg-green-100 p-3 rounded-lg border border-green-200 text-center">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <Brain className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-800">
                              Recommandation IA
                            </span>
                          </div>
                          <div className="text-sm">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{aiRec.betType} - {aiRec.prediction}</span>
                              <span className="text-green-600 font-bold">
                                @{aiRec.odds.toFixed(2)}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground text-center">
                              Confiance: {generateConfidenceScore(match.id, aiRec)}%
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground text-center py-2">
                          Aucune opportunité détectée
                        </div>
                      )}
                    </div>
                    
                    {/* Action Button */}
                    <Button size="sm" className="w-full">
                      <Eye className="h-4 w-4 mr-2" />
                      Voir détails
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}