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
import AIRecommendationDisplay from '@/components/AIRecommendationDisplay';

interface MatchesTableProps {
  matches: ProcessedMatch[];
  onMatchClick: (match: ProcessedMatch) => void;
  marketFilters?: string[];
  matchRecommendations?: Map<string, any[]>;
  groupBy?: 'time' | 'competition';
}

export function MatchesTable({ matches, onMatchClick, marketFilters = [], matchRecommendations, groupBy = 'time' }: MatchesTableProps) {
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
                          <AIRecommendationDisplay
                            match={match}
                            marketFilters={marketFilters}
                            variant="table"
                            showIcon={false}
                            preCalculatedRecommendations={matchRecommendations?.get(match.id)}
                          />
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
                      <AIRecommendationDisplay
                        match={match}
                        marketFilters={marketFilters}
                        variant="card"
                        showIcon={true}
                        preCalculatedRecommendations={matchRecommendations?.get(match.id)}
                      />
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