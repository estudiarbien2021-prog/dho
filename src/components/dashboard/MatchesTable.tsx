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
  // Analyser uniquement les marchés BTTS et Over/Under
  const markets = [];

  // Marché BTTS - évaluer les deux options et garder la meilleure
  const bttsSuggestions = [];
  
  console.log('BTTS Debug for table:', {
    odds_btts_yes: match.odds_btts_yes,
    odds_btts_no: match.odds_btts_no,
    p_btts_yes_fair: match.p_btts_yes_fair,
    p_btts_no_fair: match.p_btts_no_fair,
    vig_btts: match.vig_btts
  });
  
  if (match.odds_btts_yes && match.odds_btts_yes >= 1.3 && match.p_btts_yes_fair > 0.45) {
    const score = match.p_btts_yes_fair * match.odds_btts_yes * (1 + match.vig_btts);
    console.log('BTTS Yes score table:', score);
    bttsSuggestions.push({
      betType: 'BTTS',
      prediction: 'Oui',
      odds: match.odds_btts_yes,
      probability: match.p_btts_yes_fair,
      vigorish: match.vig_btts,
      score,
      confidence: match.p_btts_yes_fair > 0.65 && match.vig_btts > 0.08 ? 'high' : 'medium'
    });
  }
  
  if (match.odds_btts_no && match.odds_btts_no >= 1.3 && match.p_btts_no_fair > 0.45) {
    const score = match.p_btts_no_fair * match.odds_btts_no * (1 + match.vig_btts);
    console.log('BTTS No score table:', score);
    bttsSuggestions.push({
      betType: 'BTTS',
      prediction: 'Non',
      odds: match.odds_btts_no,
      probability: match.p_btts_no_fair,
      vigorish: match.vig_btts,
      score,
      confidence: match.p_btts_no_fair > 0.65 && match.vig_btts > 0.08 ? 'high' : 'medium'
    });
  }

  // Garder seulement la meilleure option BTTS
  if (bttsSuggestions.length > 0) {
    const bestBtts = bttsSuggestions.reduce((prev, current) => {
      console.log('Comparing BTTS table:', prev.prediction, prev.score, 'vs', current.prediction, current.score);
      return current.score > prev.score ? current : prev;
    });
    console.log('Best BTTS option table:', bestBtts.prediction, bestBtts.score);
    markets.push(bestBtts);
  }

  // Marché Over/Under 2.5 - évaluer les deux options et garder la meilleure
  const ouSuggestions = [];
  if (match.odds_over_2_5 && match.odds_over_2_5 >= 1.3 && match.p_over_2_5_fair > 0.45) {
    const score = match.p_over_2_5_fair * match.odds_over_2_5 * (1 + match.vig_ou_2_5);
    ouSuggestions.push({
      betType: 'O/U 2.5',
      prediction: '+2,5 buts',
      odds: match.odds_over_2_5,
      probability: match.p_over_2_5_fair,
      vigorish: match.vig_ou_2_5,
      score,
      confidence: match.p_over_2_5_fair > 0.65 && match.vig_ou_2_5 > 0.08 ? 'high' : 'medium'
    });
  }
  
  if (match.odds_under_2_5 && match.odds_under_2_5 >= 1.3 && match.p_under_2_5_fair > 0.45) {
    const score = match.p_under_2_5_fair * match.odds_under_2_5 * (1 + match.vig_ou_2_5);
    ouSuggestions.push({
      betType: 'O/U 2.5',
      prediction: '-2,5 buts',
      odds: match.odds_under_2_5,
      probability: match.p_under_2_5_fair,
      vigorish: match.vig_ou_2_5,
      score,
      confidence: match.p_under_2_5_fair > 0.65 && match.vig_ou_2_5 > 0.08 ? 'high' : 'medium'
    });
  }

  // Garder seulement la meilleure option Over/Under
  if (ouSuggestions.length > 0) {
    const bestOU = ouSuggestions.reduce((prev, current) => 
      current.score > prev.score ? current : prev
    );
    markets.push(bestOU);
  }

  // Retourner le marché avec le meilleur score global (priorisant vigorish élevé)
  if (markets.length === 0) return null;
  
  const bestMarket = markets.reduce((prev, current) => 
    current.score > prev.score ? current : prev
  );

  console.log('Final best market table:', bestMarket);
  
  return {
    betType: bestMarket.betType,
    prediction: bestMarket.prediction,
    odds: bestMarket.odds,
    confidence: bestMarket.confidence
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
                Confiance
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
                    <span className={`font-bold ${match.vig_1x2 <= 0.12 ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {match.vig_1x2 <= 0.12 ? "Haute" : "Moyenne"}
                    </span>
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

                      return (
                        <div className="bg-green-100 p-2 rounded-lg border border-green-200 min-w-[180px]">
                          <div className="flex items-center gap-2 mb-2">
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
  );
}