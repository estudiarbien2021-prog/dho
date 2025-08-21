import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProcessedMatch } from '@/types/match';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, Save, Trash2, Trophy, Target, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ScoreEditorProps {
  matches: ProcessedMatch[];
  onMatchUpdate: () => void;
}

interface MatchWithEditing extends ProcessedMatch {
  isEditing?: boolean;
  editingScore?: string;
}

interface AIAccuracy {
  total_predictions: number;
  correct_predictions: number;
  accuracy_rate: number;
  by_market: {
    '1x2': { total: number; correct: number; rate: number };
    btts: { total: number; correct: number; rate: number };
    ou25: { total: number; correct: number; rate: number };
  };
}

export function ScoreEditor({ matches, onMatchUpdate }: ScoreEditorProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filteredMatches, setFilteredMatches] = useState<MatchWithEditing[]>([]);
  const [aiAccuracy, setAiAccuracy] = useState<AIAccuracy | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Filter matches by selected date and other filters
  useEffect(() => {
    // Use UTC to match the date format stored in database
    const dateStr = selectedDate.toISOString().split('T')[0];
    let filtered = matches.filter(match => match.match_date === dateStr);
    
    if (selectedLeague !== 'all') {
      filtered = filtered.filter(match => match.league === selectedLeague);
    }
    
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(match => match.match_status === selectedStatus);
    }
    
    setFilteredMatches(filtered.map(match => ({ ...match })));
  }, [matches, selectedDate, selectedLeague, selectedStatus]);

  // Calculate AI accuracy
  useEffect(() => {
    calculateAIAccuracy();
  }, [matches]);

  const calculateAIAccuracy = async () => {
    const finishedMatches = matches.filter(m => 
      m.match_status === 'finished' && 
      m.home_score !== null && 
      m.away_score !== null &&
      m.ai_prediction
    );

    if (finishedMatches.length === 0) {
      setAiAccuracy(null);
      return;
    }

    let total = 0;
    let correct = 0;
    const byMarket = {
      '1x2': { total: 0, correct: 0, rate: 0 },
      btts: { total: 0, correct: 0, rate: 0 },
      ou25: { total: 0, correct: 0, rate: 0 }
    };

    finishedMatches.forEach(match => {
      if (!match.ai_prediction || match.home_score === null || match.away_score === null) return;

      const prediction = match.ai_prediction.toLowerCase();
      const homeScore = match.home_score!;
      const awayScore = match.away_score!;
      
      // 1X2 predictions
      if (prediction.includes('home') || prediction.includes('domicile')) {
        byMarket['1x2'].total++;
        total++;
        if (homeScore > awayScore) {
          byMarket['1x2'].correct++;
          correct++;
        }
      } else if (prediction.includes('draw') || prediction.includes('nul')) {
        byMarket['1x2'].total++;
        total++;
        if (homeScore === awayScore) {
          byMarket['1x2'].correct++;
          correct++;
        }
      } else if (prediction.includes('away') || prediction.includes('extérieur')) {
        byMarket['1x2'].total++;
        total++;
        if (awayScore > homeScore) {
          byMarket['1x2'].correct++;
          correct++;
        }
      }

      // BTTS predictions
      if (prediction.includes('btts') || prediction.includes('but')) {
        byMarket.btts.total++;
        total++;
        const bothTeamsScored = homeScore > 0 && awayScore > 0;
        if (prediction.includes('yes') || prediction.includes('oui')) {
          if (bothTeamsScored) {
            byMarket.btts.correct++;
            correct++;
          }
        } else if (prediction.includes('no') || prediction.includes('non')) {
          if (!bothTeamsScored) {
            byMarket.btts.correct++;
            correct++;
          }
        }
      }

      // Over/Under 2.5 predictions
      if (prediction.includes('over') || prediction.includes('under') || prediction.includes('plus') || prediction.includes('moins')) {
        byMarket.ou25.total++;
        total++;
        const totalGoals = homeScore + awayScore;
        if (prediction.includes('over') || prediction.includes('plus')) {
          if (totalGoals > 2.5) {
            byMarket.ou25.correct++;
            correct++;
          }
        } else if (prediction.includes('under') || prediction.includes('moins')) {
          if (totalGoals < 2.5) {
            byMarket.ou25.correct++;
            correct++;
          }
        }
      }
    });

    // Calculate rates
    Object.keys(byMarket).forEach(market => {
      const m = byMarket[market as keyof typeof byMarket];
      m.rate = m.total > 0 ? (m.correct / m.total) * 100 : 0;
    });

    setAiAccuracy({
      total_predictions: total,
      correct_predictions: correct,
      accuracy_rate: total > 0 ? (correct / total) * 100 : 0,
      by_market: byMarket
    });
  };

  const handleScoreEdit = (matchId: string, score: string) => {
    setFilteredMatches(prev => prev.map(match => 
      match.id === matchId 
        ? { ...match, isEditing: true, editingScore: score }
        : match
    ));
  };

  const handleScoreSave = async (matchId: string) => {
    const match = filteredMatches.find(m => m.id === matchId);
    if (!match || !match.editingScore) return;

    // Parse score format "2-1"
    const scoreParts = match.editingScore.trim().split('-');
    if (scoreParts.length !== 2) {
      toast({
        title: "Format de score invalide",
        description: "Utilisez le format '2-1' (domicile-extérieur)",
        variant: "destructive"
      });
      return;
    }

    const homeScore = parseInt(scoreParts[0]);
    const awayScore = parseInt(scoreParts[1]);

    if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
      toast({
        title: "Score invalide",
        description: "Les scores doivent être des nombres positifs",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('matches')
        .update({
          home_score: homeScore,
          away_score: awayScore,
          match_status: 'finished',
          updated_at: new Date().toISOString()
        })
        .eq('id', matchId);

      if (error) throw error;

      // Update local state
      setFilteredMatches(prev => prev.map(m => 
        m.id === matchId 
          ? { 
              ...m, 
              home_score: homeScore, 
              away_score: awayScore, 
              match_status: 'finished' as const,
              isEditing: false,
              editingScore: undefined
            }
          : m
      ));

      toast({
        title: "Score mis à jour",
        description: `${match.home_team} ${homeScore}-${awayScore} ${match.away_team}`,
      });

      onMatchUpdate();
      calculateAIAccuracy();
    } catch (error) {
      console.error('Error updating score:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le score",
        variant: "destructive"
      });
    }
  };

  const handleStatusChange = async (matchId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('matches')
        .update({
          match_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', matchId);

      if (error) throw error;

      setFilteredMatches(prev => prev.map(m => 
        m.id === matchId 
          ? { ...m, match_status: newStatus as ProcessedMatch['match_status'] }
          : m
      ));

      toast({
        title: "Statut mis à jour",
        description: `Match marqué comme ${newStatus}`,
      });

      onMatchUpdate();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      scheduled: { color: 'bg-blue-100 text-blue-800', icon: CalendarIcon, text: 'Programmé' },
      live: { color: 'bg-red-100 text-red-800', icon: Trophy, text: 'En cours' },
      finished: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Terminé' },
      cancelled: { color: 'bg-gray-100 text-gray-800', icon: XCircle, text: 'Annulé' },
      postponed: { color: 'bg-yellow-100 text-yellow-800', icon: CalendarIcon, text: 'Reporté' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;
    const Icon = config.icon;
    
    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  const uniqueLeagues = [...new Set(matches.map(m => m.league))];

  return (
    <div className="space-y-6">
      {/* AI Analytics Header */}
      {aiAccuracy && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-brand" />
                <div>
                  <p className="text-2xl font-bold">{aiAccuracy.accuracy_rate.toFixed(1)}%</p>
                  <p className="text-xs text-text-weak">Précision globale</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{aiAccuracy.by_market['1x2'].rate.toFixed(1)}%</p>
                  <p className="text-xs text-text-weak">1X2 ({aiAccuracy.by_market['1x2'].total})</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{aiAccuracy.by_market.btts.rate.toFixed(1)}%</p>
                  <p className="text-xs text-text-weak">BTTS ({aiAccuracy.by_market.btts.total})</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{aiAccuracy.by_market.ou25.rate.toFixed(1)}%</p>
                  <p className="text-xs text-text-weak">O/U 2.5 ({aiAccuracy.by_market.ou25.total})</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Gestion des Résultats
          </CardTitle>
          <CardDescription>
            Interface type Excel pour la saisie manuelle des scores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            {/* Date Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP", { locale: fr }) : "Sélectionner une date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {/* League Filter */}
            <Select value={selectedLeague} onValueChange={setSelectedLeague}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Toutes les ligues" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les ligues</SelectItem>
                {uniqueLeagues.map(league => (
                  <SelectItem key={league} value={league}>{league}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="scheduled">Programmés</SelectItem>
                <SelectItem value="live">En cours</SelectItem>
                <SelectItem value="finished">Terminés</SelectItem>
                <SelectItem value="cancelled">Annulés</SelectItem>
                <SelectItem value="postponed">Reportés</SelectItem>
              </SelectContent>
            </Select>

            <div className="ml-auto text-sm text-text-weak">
              {filteredMatches.length} match{filteredMatches.length !== 1 ? 's' : ''}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Matches Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-weak uppercase tracking-wider">
                    Heure
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-weak uppercase tracking-wider">
                    Ligue
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-weak uppercase tracking-wider">
                    Match
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-weak uppercase tracking-wider">
                    Score Final
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-weak uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-weak uppercase tracking-wider">
                    IA
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-weak uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredMatches.map((match) => (
                  <tr key={match.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {format(new Date(match.kickoff_local), 'HH:mm')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <Badge variant="outline" className="text-xs">
                        {match.league}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium">
                        {match.home_team} vs {match.away_team}
                      </div>
                      {match.country && (
                        <div className="text-xs text-text-weak">{match.country}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {match.isEditing ? (
                        <div className="flex gap-2">
                          <Input
                            value={match.editingScore || ''}
                            onChange={(e) => handleScoreEdit(match.id, e.target.value)}
                            placeholder="2-1"
                            className="w-16 text-center"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleScoreSave(match.id)}
                            className="px-2"
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : match.home_score !== null && match.away_score !== null ? (
                        <div 
                          className="cursor-pointer hover:bg-muted/50 px-2 py-1 rounded font-mono text-center"
                          onClick={() => handleScoreEdit(match.id, `${match.home_score}-${match.away_score}`)}
                        >
                          {match.home_score}-{match.away_score}
                        </div>
                      ) : (
                        <div 
                          className="cursor-pointer hover:bg-muted/50 px-2 py-1 rounded text-center text-text-weak"
                          onClick={() => handleScoreEdit(match.id, '')}
                        >
                          ___
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Select value={match.match_status} onValueChange={(value) => handleStatusChange(match.id, value)}>
                        <SelectTrigger className="w-auto border-none p-0 h-auto">
                          <SelectValue>
                            {getStatusBadge(match.match_status)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scheduled">Programmé</SelectItem>
                          <SelectItem value="live">En cours</SelectItem>
                          <SelectItem value="finished">Terminé</SelectItem>
                          <SelectItem value="cancelled">Annulé</SelectItem>
                          <SelectItem value="postponed">Reporté</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {match.ai_prediction ? (
                        <div className="flex flex-col gap-1">
                          <Badge variant="secondary" className="text-xs">
                            {match.ai_prediction}
                          </Badge>
                          {match.match_status === 'finished' && match.home_score !== null && match.away_score !== null && (
                            <div className="text-xs">
                              {/* Simple accuracy check - could be expanded */}
                              {match.ai_prediction.toLowerCase().includes('home') && match.home_score! > match.away_score! ? (
                                <CheckCircle className="h-3 w-3 text-green-500 inline" />
                              ) : match.ai_prediction.toLowerCase().includes('away') && match.away_score! > match.home_score! ? (
                                <CheckCircle className="h-3 w-3 text-green-500 inline" />
                              ) : match.ai_prediction.toLowerCase().includes('draw') && match.home_score === match.away_score ? (
                                <CheckCircle className="h-3 w-3 text-green-500 inline" />
                              ) : match.match_status === 'finished' ? (
                                <XCircle className="h-3 w-3 text-red-500 inline" />
                              ) : null}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-text-weak text-xs">Pas de prédiction</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleScoreEdit(match.id, match.home_score !== null ? `${match.home_score}-${match.away_score}` : '')}
                          className="px-2"
                        >
                          <Trophy className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredMatches.length === 0 && (
            <div className="text-center py-8 text-text-weak">
              Aucun match trouvé pour cette date
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}