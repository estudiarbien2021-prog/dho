import React, { useState } from 'react';
import { ProcessedMatch } from '@/types/match';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, Brain, ExternalLink } from 'lucide-react';
import { FlagMini } from '@/components/Flag';
import { leagueToFlag } from '@/lib/leagueCountry';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AIRecommendation {
  betType: string;
  prediction: string;
  odds: number;
  confidence: 'high' | 'medium' | 'low';
}

function generateAIRecommendation(match: ProcessedMatch): AIRecommendation | null {
  const recommendations: Array<{
    betType: string;
    prediction: string;
    odds: number;
    value: number;
    confidence: 'high' | 'medium' | 'low';
  }> = [];

  // Console log pour déboguer
  console.log('Analyzing match:', match.home_team, 'vs', match.away_team);
  console.log('Match data:', {
    is_low_vig_1x2: match.is_low_vig_1x2,
    watch_btts: match.watch_btts,
    watch_over25: match.watch_over25,
    odds_home: match.odds_home,
    odds_away: match.odds_away,
    odds_btts_yes: match.odds_btts_yes,
    odds_over_2_5: match.odds_over_2_5,
    p_home_fair: match.p_home_fair,
    p_away_fair: match.p_away_fair,
    p_btts_yes_fair: match.p_btts_yes_fair,
    p_over_2_5_fair: match.p_over_2_5_fair
  });

  // Analyse du marché 1X2 - conditions plus permissives
  const maxProb1x2 = Math.max(match.p_home_fair, match.p_draw_fair, match.p_away_fair);
  
  if (match.p_home_fair === maxProb1x2 && match.p_home_fair > 0.35) {
    const impliedProb = 1 / match.odds_home;
    const value = (match.p_home_fair - impliedProb) / impliedProb;
    console.log('Home value:', value);
    if (value > 0.02) { // Condition moins stricte
      recommendations.push({
        betType: '1X2',
        prediction: `Victoire ${match.home_team}`,
        odds: match.odds_home,
        value,
        confidence: value > 0.10 ? 'high' : value > 0.05 ? 'medium' : 'low'
      });
    }
  }

  if (match.p_away_fair === maxProb1x2 && match.p_away_fair > 0.35) {
    const impliedProb = 1 / match.odds_away;
    const value = (match.p_away_fair - impliedProb) / impliedProb;
    console.log('Away value:', value);
    if (value > 0.02) { // Condition moins stricte
      recommendations.push({
        betType: '1X2',
        prediction: `Victoire ${match.away_team}`,
        odds: match.odds_away,
        value,
        confidence: value > 0.10 ? 'high' : value > 0.05 ? 'medium' : 'low'
      });
    }
  }

  // Analyse BTTS - conditions plus permissives
  if (match.odds_btts_yes && match.p_btts_yes_fair > 0.4) {
    const impliedProb = 1 / match.odds_btts_yes;
    const value = (match.p_btts_yes_fair - impliedProb) / impliedProb;
    console.log('BTTS value:', value);
    if (value > 0.01) { // Condition moins stricte
      recommendations.push({
        betType: 'BTTS',
        prediction: 'Les deux équipes marquent',
        odds: match.odds_btts_yes,
        value,
        confidence: value > 0.08 ? 'high' : value > 0.04 ? 'medium' : 'low'
      });
    }
  }

  // Analyse Over/Under 2.5
  if (match.odds_over_2_5 && match.p_over_2_5_fair > 0.45) {
    const impliedProb = 1 / match.odds_over_2_5;
    const value = (match.p_over_2_5_fair - impliedProb) / impliedProb;
    console.log('Over 2.5 value:', value);
    if (value > 0.01) { // Condition moins stricte
      recommendations.push({
        betType: 'O/U 2.5',
        prediction: '+2,5 buts',
        odds: match.odds_over_2_5,
        value,
        confidence: value > 0.08 ? 'high' : value > 0.04 ? 'medium' : 'low'
      });
    }
  }

  if (match.odds_under_2_5 && match.p_under_2_5_fair > 0.45) {
    const impliedProb = 1 / match.odds_under_2_5;
    const value = (match.p_under_2_5_fair - impliedProb) / impliedProb;
    console.log('Under 2.5 value:', value);
    if (value > 0.01) { // Condition moins stricte
      recommendations.push({
        betType: 'O/U 2.5',
        prediction: '-2,5 buts',
        odds: match.odds_under_2_5,
        value,
        confidence: value > 0.08 ? 'high' : value > 0.04 ? 'medium' : 'low'
      });
    }
  }

  console.log('Total recommendations found:', recommendations.length);

  // Si aucune recommandation basée sur la valeur, créer une recommandation basique
  if (recommendations.length === 0) {
    // Recommandation basée sur la probabilité la plus élevée
    if (match.p_home_fair > match.p_draw_fair && match.p_home_fair > match.p_away_fair && match.p_home_fair > 0.4) {
      return {
        betType: '1X2',
        prediction: `Victoire ${match.home_team}`,
        odds: match.odds_home,
        confidence: match.p_home_fair > 0.55 ? 'medium' : 'low'
      };
    } else if (match.p_away_fair > match.p_draw_fair && match.p_away_fair > match.p_home_fair && match.p_away_fair > 0.4) {
      return {
        betType: '1X2',
        prediction: `Victoire ${match.away_team}`,
        odds: match.odds_away,
        confidence: match.p_away_fair > 0.55 ? 'medium' : 'low'
      };
    }
    return null;
  }

  // Retourner la recommandation avec la valeur la plus élevée
  const bestRec = recommendations.reduce((prev, current) => 
    current.value > prev.value ? current : prev
  );

  console.log('Best recommendation:', bestRec);

  return {
    betType: bestRec.betType,
    prediction: bestRec.prediction,
    odds: bestRec.odds,
    confidence: bestRec.confidence
  };
}

interface MatchesTableProps {
  matches: ProcessedMatch[];
  onMatchClick: (match: ProcessedMatch) => void;
}

export function MatchesTable({ matches, onMatchClick }: MatchesTableProps) {
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
    return format(date, 'HH:mm', { locale: fr });
  };

  const formatDate = (date: Date) => {
    return format(date, 'dd/MM', { locale: fr });
  };

  if (matches.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Aucun match trouvé avec les filtres actuels.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
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
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('vig_1x2')}
              >
                Évaluation
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  <Brain className="h-4 w-4" />
                  Recommandation IA
                </div>
              </TableHead>
              <TableHead>Probas</TableHead>
              <TableHead className="w-[100px]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMatches.map((match) => {
              const flagInfo = leagueToFlag(match.league);
              
              return (
                <TableRow 
                  key={match.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => onMatchClick(match)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <FlagMini code={flagInfo.code} confed={flagInfo.confed} />
                      <div>
                        <p className="font-medium text-sm">{match.league}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {match.category.replace('_', ' ')}
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
                      <p className="font-medium">{formatTime(match.kickoff_utc)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(match.kickoff_utc)}</p>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge 
                      variant={match.vig_1x2 <= 0.12 ? "default" : "destructive"}
                      className="font-medium"
                    >
                      {match.vig_1x2 <= 0.12 ? "Idéal" : "À éviter"}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    {(() => {
                      const aiRec = generateAIRecommendation(match);
                      
                      if (!aiRec) {
                        return (
                          <div className="text-xs text-muted-foreground">
                            Aucune opportunité détectée
                          </div>
                        );
                      }

                      const confidenceColors = {
                        high: 'bg-green-50 border-green-200 text-green-800',
                        medium: 'bg-yellow-50 border-yellow-200 text-yellow-800', 
                        low: 'bg-gray-50 border-gray-200 text-gray-600'
                      };

                      return (
                        <div className={`p-2 rounded-lg border ${confidenceColors[aiRec.confidence]} min-w-[180px]`}>
                          <div className="flex items-center gap-1 mb-1">
                            <Brain className="h-3 w-3" />
                            <span className="text-xs font-semibold">Recommandation IA</span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs">Type de pari</span>
                              <Badge variant="outline" className="text-xs px-1 py-0">
                                {aiRec.betType}
                              </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs">Prédiction</span>
                              <span className="text-xs font-medium">{aiRec.prediction}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs">Cote</span>
                              <span className="text-xs font-bold">{aiRec.odds.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span>H:</span>
                        <span className="font-mono">{(match.p_home_fair * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>D:</span>
                        <span className="font-mono">{(match.p_draw_fair * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>A:</span>
                        <span className="font-mono">{(match.p_away_fair * 100).toFixed(0)}%</span>
                      </div>
                    </div>
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
  );
}