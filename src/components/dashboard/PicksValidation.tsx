import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, RefreshCw, Target, Eye, Edit, Calendar, Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { ProcessedMatch } from '@/types/match';
import { detectOpportunities, prioritizeOpportunitiesByRealProbability, convertOpportunityToAIRecommendation } from '@/lib/opportunityDetection';
import { FlagMini } from '@/components/Flag';
import { leagueToFlag } from '@/lib/leagueCountry';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DatePickerFilter } from './DatePickerFilter';
import { TopPicks } from './TopPicks';
import { MatchDetailModal } from './MatchDetailModal';
import { useDatabaseMatches } from '@/hooks/useDatabaseMatches';

interface PotentialPick {
  match: ProcessedMatch;
  betType: string;
  prediction: string;
  odds: number;
  probability: number;
  vigorish: number;
  id: string;
}

interface ValidatedPick {
  id: string;
  match_id: string;
  league: string;
  home_team: string;
  away_team: string;
  country?: string;
  kickoff_utc: string;
  bet_type: string;
  prediction: string;
  odds: number;
  probability: number;
  vigorish: number;
  is_validated: boolean;
  validated_at?: string;
  created_at: string;
}

export function PicksValidation() {
  const [potentialPicks, setPotentialPicks] = useState<PotentialPick[]>([]);
  const [validatedPicks, setValidatedPicks] = useState<ValidatedPick[]>([]);
  const [selectedPicks, setSelectedPicks] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date()); // Date du jour par défaut
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPick, setEditingPick] = useState<ValidatedPick | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<ProcessedMatch | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // États pour le tri
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Utiliser le hook useDatabaseMatches avec la date sélectionnée
  const formatDateForHook = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };
  
  const { 
    matches, 
    isLoading, 
    error 
  } = useDatabaseMatches(selectedDate ? formatDateForHook(selectedDate) : undefined);

  // Handler pour les clics sur les matchs
  const handleMatchClick = (match: ProcessedMatch) => {
    setSelectedMatch(match);
    setIsModalOpen(true);
  };

  // Fonction pour lancer une recherche sur Oddspedia via DuckDuckGo
  const handleOddspediaSearch = (homeTeam: string, awayTeam: string) => {
    const query = `${homeTeam} vs ${awayTeam} site:oddspedia.com`;
    const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
    window.open(searchUrl, '_blank', 'noopener,noreferrer');
  };

  // Fonction de tri
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Fonction pour obtenir la valeur de tri d'un pick
  const getSortValue = (pick: PotentialPick, column: string) => {
    switch (column) {
      case 'match':
        return `${pick.match.home_team} vs ${pick.match.away_team}`;
      case 'prediction':
        return `${pick.betType} ${pick.prediction}`;
      case 'odds':
        return pick.odds;
      case 'probability':
        return pick.probability;
      case 'vigorish':
        return pick.vigorish;
      case 'date':
        return pick.match.match_date;
      case 'kickoff':
        return pick.match.kickoff_utc.getTime();
      default:
        return '';
    }
  };

  // Filtrer et trier les picks potentiels (avec recherche)
  const filteredAndSortedPotentialPicks = useMemo(() => {
    // D'abord filtrer par terme de recherche
    const filtered = potentialPicks.filter(pick => 
      pick.match.home_team?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pick.match.away_team?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pick.match.league?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pick.match.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pick.prediction?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pick.betType?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Puis trier si nécessaire
    if (!sortColumn) return filtered;

    return [...filtered].sort((a, b) => {
      const aValue = getSortValue(a, sortColumn);
      const bValue = getSortValue(b, sortColumn);

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        const comparison = aValue - bValue;
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      return 0;
    });
  }, [potentialPicks, sortColumn, sortDirection, searchTerm]);

  // Composant pour les en-têtes triables
  const SortableHeader: React.FC<{ column: string; children: React.ReactNode; className?: string }> = ({ 
    column, 
    children, 
    className 
  }) => (
    <TableHead 
      className={`cursor-pointer hover:bg-surface-soft transition-colors ${className || ''}`}
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortColumn === column ? (
          sortDirection === 'asc' ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        ) : (
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        )}
      </div>
    </TableHead>
  );

  // Fonction utilitaire pour convertir Date en string YYYY-MM-DD (locale)
  const formatDateForFilter = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Debug: log tous les matchs affichés pour identifier le mélange
  useEffect(() => {
    if (potentialPicks.length > 0) {
      console.log('🚨 PICKS POTENTIELS AFFICHÉS - AUDIT COMPLET:');
      console.log(`📊 Total: ${potentialPicks.length} picks`);
      
      const datesUniques = new Set();
      potentialPicks.forEach((pick, index) => {
        datesUniques.add(pick.match.match_date);
        console.log(`  ${index + 1}. ${pick.match.home_team} vs ${pick.match.away_team} - ${pick.match.match_date}`);
      });
      
      console.log(`🗓️ Dates trouvées dans les picks:`, Array.from(datesUniques));
      console.log(`📅 Date sélectionnée dans le filtre: ${selectedDate ? formatDateForHook(selectedDate!) : 'aucune'}`);
      
      if (datesUniques.size > 1) {
        console.error('🚨 PROBLÈME DÉTECTÉ: Plus d\'une date dans les picks potentiels!');
        console.error('🚨 DATES MÉLANGÉES:', Array.from(datesUniques));
      }
    }
  }, [potentialPicks, selectedDate]);
  
  useEffect(() => {
    // Charger les picks validés et les picks potentiels quand les matchs changent
    loadValidatedPicks();
    if (matches.length > 0) {
      loadPotentialPicks(matches);
    } else {
      setPotentialPicks([]);
    }
  }, [selectedDate, matches]); // Recharger quand la date ou les matchs changent


  const loadValidatedPicks = async () => {
    try {
      let query = supabase
        .from('validated_picks')
        .select('*')
        .order('created_at', { ascending: false });

      // Filtrer par date si spécifié (utilisation simple sans timezone)
      if (selectedDate) {
        const targetDate = formatDateForHook(selectedDate);
        // Approximation : filtrer par jour sur kickoff_utc
        const startDate = new Date(targetDate + 'T00:00:00.000Z');
        const endDate = new Date(targetDate + 'T23:59:59.999Z');
        
        query = query
          .gte('kickoff_utc', startDate.toISOString())
          .lt('kickoff_utc', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setValidatedPicks(data || []);
    } catch (error) {
      console.error('Error loading validated picks:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les picks validés",
        variant: "destructive",
      });
    }
  };

  const loadPotentialPicks = async (matchData: ProcessedMatch[]) => {
    console.log('🚨 DÉBUT loadPotentialPicks - FONCTION APPELÉE !');
    console.log(`📊 Analysing ${matchData.length} matchs fournis`);
    
    if (matchData.length === 0) {
      console.log('🚨 AUCUN MATCH - SORTIE ANTICIPÉE');
      setPotentialPicks([]);
      return;
    }

    try {
      // Debug: vérifier les dates des matchs
      const dates = [...new Set(matchData.map(m => m.match_date))];
      console.log('📅 Dates des matchs à analyser:', dates);
      
      // UNIFICATION: Utiliser TOUS les matchs comme dans le dashboard principal
      // Supprimer le filtre de catégorie restrictif pour avoir le même ensemble de base
      const filteredMatches = matchData; // Pas de filtrage par catégorie pour unifier avec le dashboard

      console.log(`📊 Matchs filtrés par critères: ${filteredMatches.length}/${matchData.length}`);

      const validBets: PotentialPick[] = [];
      
      // UNIFICATION: Utiliser le même système que le popup détail des matchs
      for (let matchIndex = 0; matchIndex < filteredMatches.length; matchIndex++) {
        const match = filteredMatches[matchIndex];
        
        console.log(`🔄 TRAITEMENT MATCH ${matchIndex + 1}/${filteredMatches.length}: ${match.home_team} vs ${match.away_team}`);
        
        try {
          // ÉTAPE 1: Détecter les opportunités (même logique que le popup)
          const opportunities = await detectOpportunities(match);
          console.log(`  📋 Opportunités détectées: ${opportunities.length}`);
          
          if (opportunities.length === 0) {
            console.log(`  🚫 Aucune opportunité détectée pour ce match`);
            continue;
          }
          
          // ÉTAPE 2: Prioriser les opportunités (même logique que le popup)
          const prioritizedOpportunities = prioritizeOpportunitiesByRealProbability(opportunities, match);
          console.log(`  ⭐ Opportunités prioritaires: ${prioritizedOpportunities.length}`);
          
          if (prioritizedOpportunities.length === 0) {
            console.log(`  🚫 Aucune opportunité après priorisation`);
            continue;
          }
          
          // ÉTAPE 3: Convertir les opportunités (même logique que le popup)
          prioritizedOpportunities.forEach((opportunity, oppIndex) => {
            const aiRecommendation = convertOpportunityToAIRecommendation(opportunity);
            
            // ÉTAPE 4: Calculer la probabilité pour les critères de filtrage
            let probability = 0;
            
            // Extraire la probabilité selon le type de marché et la prédiction
            if (aiRecommendation.betType === 'BTTS') {
              probability = aiRecommendation.prediction === 'Oui' ? match.p_btts_yes_fair : match.p_btts_no_fair;
            } else if (aiRecommendation.betType === 'O/U 2.5') {
              probability = aiRecommendation.prediction === '+2,5 buts' ? match.p_over_2_5_fair : match.p_under_2_5_fair;
            } else if (aiRecommendation.betType === '1X2') {
              if (aiRecommendation.prediction.includes('domicile')) {
                probability = match.p_home_fair;
              } else if (aiRecommendation.prediction.includes('extérieur')) {
                probability = match.p_away_fair;
              } else if (aiRecommendation.prediction.includes('nul')) {
                probability = match.p_draw_fair;
              }
            } else if (aiRecommendation.betType === 'Double Chance') {
              // Pour double chance, calculer la probabilité combinée
              if (aiRecommendation.prediction === '1X') {
                probability = match.p_home_fair + match.p_draw_fair;
              } else if (aiRecommendation.prediction === 'X2') {
                probability = match.p_draw_fair + match.p_away_fair;
              } else if (aiRecommendation.prediction === '12') {
                probability = match.p_home_fair + match.p_away_fair;
              }
            }
            
            // ÉTAPE 5: Calculer le vigorish selon le type de marché
            let vigorish = 0;
            if (aiRecommendation.betType === 'BTTS') {
              vigorish = match.vig_btts || 0;
            } else if (aiRecommendation.betType === 'O/U 2.5') {
              vigorish = match.vig_ou_2_5 || 0;
            } else {
              vigorish = match.vig_1x2 || 0;
            }
            
            console.log(`    💡 Recommandation ${oppIndex + 1}: ${aiRecommendation.betType} ${aiRecommendation.prediction} (odds: ${aiRecommendation.odds}, prob: ${(probability * 100).toFixed(1)}%)`);
            
            // ÉTAPE 6: Critères unifiés - accepter toutes les recommandations valides du système d'opportunités
            // Les opportunités ont déjà été filtrées par detectOpportunities() et prioritizeOpportunitiesByRealProbability()
            if (probability > 0 && aiRecommendation.odds > 0) {
              validBets.push({
                match,
                betType: aiRecommendation.betType,
                prediction: aiRecommendation.prediction,
                odds: aiRecommendation.odds,
                probability,
                vigorish,
                id: `${match.id}-${oppIndex}-${aiRecommendation.prediction.replace(/\s+/g, '-')}`
              });
              console.log(`    ✅ Recommandation ajoutée aux picks potentiels`);
            } else {
              console.log(`    ❌ Recommandation filtrée (prob: ${(probability * 100).toFixed(1)}%, odds: ${aiRecommendation.odds})`);
            }
          });
        } catch (error) {
          console.error(`❌ Erreur lors du traitement du match ${match.home_team} vs ${match.away_team}:`, error);
        }
      }

      // Trier par vigorish décroissant puis par probabilité décroissante
      validBets.sort((a, b) => {
        const vigorishDiff = b.vigorish - a.vigorish;
        if (vigorishDiff !== 0) return vigorishDiff;
        return b.probability - a.probability;
      });

      console.log(`🎯 Picks potentiels trouvés: ${validBets.length}`);
      setPotentialPicks(validBets);
      
    } catch (error) {
      console.error('Error loading potential picks:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des picks potentiels",
        variant: "destructive",
      });
    }
  };

  const handleValidatePicks = async () => {
    if (selectedPicks.length === 0) {
      toast({
        title: "Attention",
        description: "Veuillez sélectionner au moins un pick à valider",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      const picksToInsert = selectedPicks.map(pickId => {
        const pick = potentialPicks.find(p => p.id === pickId);
        if (!pick) return null;

        // Utiliser match_date au lieu de kickoff_utc pour éviter les problèmes de timezone
        const matchDate = new Date(pick.match.match_date + 'T12:00:00.000Z');
        
        return {
          match_id: pick.match.id,
          league: pick.match.league,
          home_team: pick.match.home_team,
          away_team: pick.match.away_team,
          country: pick.match.country,
          kickoff_utc: matchDate.toISOString(), // Utiliser la date du match normalisée
          bet_type: pick.betType,
          prediction: pick.prediction,
          odds: pick.odds,
          probability: pick.probability,
          vigorish: pick.vigorish,
          is_validated: true,
          validated_by: user.id,
          validated_at: new Date().toISOString()
        };
      }).filter(Boolean);

      const { error } = await supabase
        .from('validated_picks')
        .insert(picksToInsert);

      if (error) throw error;

      toast({
        title: "Succès !",
        description: `${selectedPicks.length} pick(s) validé(s) avec succès`,
      });

      setSelectedPicks([]);
      await loadValidatedPicks();

    } catch (error) {
      console.error('Error validating picks:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la validation des picks",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleValidation = async (pickId: string) => {
    try {
      const pick = validatedPicks.find(p => p.id === pickId);
      if (!pick) return;

      const { error } = await supabase
        .from('validated_picks')
        .update({ 
          is_validated: !pick.is_validated,
          validated_at: !pick.is_validated ? new Date().toISOString() : null
        })
        .eq('id', pickId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: `Pick ${!pick.is_validated ? 'validé' : 'invalidé'}`,
      });

      await loadValidatedPicks();

    } catch (error) {
      console.error('Error toggling validation:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la modification",
        variant: "destructive",
      });
    }
  };

  const handleSelectPick = (pickId: string, checked: boolean) => {
    if (checked) {
      setSelectedPicks([...selectedPicks, pickId]);
    } else {
      setSelectedPicks(selectedPicks.filter(id => id !== pickId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPicks(filteredAndSortedPotentialPicks.map(pick => pick.id));
    } else {
      setSelectedPicks([]);
    }
  };

  const updateValidatedPick = async (pickData: Partial<ValidatedPick>) => {
    if (!editingPick) return;

    try {
      const { error } = await supabase
        .from('validated_picks')
        .update(pickData)
        .eq('id', editingPick.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Pick mis à jour avec succès",
      });

      setIsEditDialogOpen(false);
      setEditingPick(null);
      await loadValidatedPicks();

    } catch (error) {
      console.error('Error updating pick:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le pick",
        variant: "destructive",
      });
    }
  };

  // Filtrer les picks validés par recherche
  const filteredValidatedPicks = validatedPicks.filter(pick => 
    pick.home_team?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pick.away_team?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pick.league?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pick.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pick.prediction?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-brand" />
        <p className="text-text-weak">Chargement des picks potentiels...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="h-6 w-6 text-brand" />
          <div>
            <h2 className="text-2xl font-semibold">Validation des Picks IA</h2>
            <p className="text-text-weak text-sm">
              Critères: Probabilité ≥ 51%, Odds ≥ 1.6, Plus gros vigorish BTTS/O-U
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => {
            loadPotentialPicks(matches);
          }} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button 
            onClick={handleValidatePicks} 
            disabled={selectedPicks.length === 0 || isProcessing}
            className="bg-brand hover:bg-brand-300"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Valider ({selectedPicks.length})
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-weak h-4 w-4" />
            <Input
              placeholder="Rechercher par équipe, ligue, pays ou prédiction..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div>
          <DatePickerFilter
            selectedDate={selectedDate}
            onDateChange={(date) => setSelectedDate(date)}
          />
        </div>
      </div>

      {/* Potential Picks */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            Picks Potentiels ({filteredAndSortedPotentialPicks.length}{searchTerm ? ` sur ${potentialPicks.length}` : ''})
          </h3>
          <Checkbox
            checked={selectedPicks.length === filteredAndSortedPotentialPicks.length && filteredAndSortedPotentialPicks.length > 0}
            onCheckedChange={handleSelectAll}
            className="mr-2"
          />
        </div>
        
        {potentialPicks.length === 0 ? (
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-brand/50 mx-auto mb-4" />
            <p className="text-text-weak">Aucun pick ne répond aux critères actuellement</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
               <TableHeader>
                 <TableRow>
                    <TableHead className="w-12">Sélection</TableHead>
                    <SortableHeader column="match">Match</SortableHeader>
                    <SortableHeader column="prediction">Prédiction</SortableHeader>
                    <SortableHeader column="odds">Odds</SortableHeader>
                    <SortableHeader column="probability">Probabilité</SortableHeader>
                    <SortableHeader column="vigorish">Vigorish</SortableHeader>
                    <SortableHeader column="date">Date</SortableHeader>
                    <SortableHeader column="kickoff">Kickoff</SortableHeader>
                    <TableHead>Actions</TableHead>
                 </TableRow>
               </TableHeader>
              <TableBody>
                {filteredAndSortedPotentialPicks.map((pick) => {
                  const flagInfo = leagueToFlag(pick.match.league, pick.match.country, pick.match.home_team, pick.match.away_team);
                  
                  return (
                    <TableRow 
                      key={pick.id}
                      className="cursor-pointer hover:bg-surface-soft/50"
                      onClick={(e) => {
                        // Ne pas ouvrir le modal si on clique sur la checkbox
                        if ((e.target as HTMLElement).closest('[role="checkbox"]')) return;
                        handleMatchClick(pick.match);
                      }}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedPicks.includes(pick.id)}
                          onCheckedChange={(checked) => handleSelectPick(pick.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <FlagMini code={flagInfo.code} confed={flagInfo.confed} />
                            <span className="text-xs text-text-weak">{pick.match.league}</span>
                          </div>
                          <div className="font-medium text-sm">
                            {pick.match.home_team} vs {pick.match.away_team}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {pick.betType} {pick.prediction}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{pick.odds.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{(pick.probability * 100).toFixed(1)}%</span>
                          <div className="w-16 bg-surface-strong rounded-full h-2">
                            <div 
                              className="bg-brand h-2 rounded-full" 
                              style={{ width: `${pick.probability * 100}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                       <TableCell className="font-mono text-sm">
                         {(pick.vigorish * 100).toFixed(2)}%
                       </TableCell>
                       <TableCell className="text-xs">
                         {format(new Date(pick.match.match_date + 'T00:00:00Z'), 'dd/MM/yyyy', { locale: fr })}
                       </TableCell>
                        <TableCell className="text-xs">
                          {format(pick.match.kickoff_utc, 'HH:mm', { locale: fr })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOddspediaSearch(pick.match.home_team, pick.match.away_team);
                            }}
                            className="hover:bg-surface-soft"
                            title="Rechercher sur Oddspedia"
                          >
                            <Search className="h-4 w-4" />
                          </Button>
                        </TableCell>
                     </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Top 3 Picks IA */}
      {selectedDate && matches.length > 0 && (
        <TopPicks
          matches={matches}
          onMatchClick={handleMatchClick}
          selectedDate={selectedDate}
        />
      )}

      {/* Validated Picks */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Picks Validés ({filteredValidatedPicks.filter(p => p.is_validated).length})</h3>
          <Eye className="h-5 w-5 text-brand" />
        </div>
        
        {filteredValidatedPicks.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-brand/50 mx-auto mb-4" />
            <p className="text-text-weak">Aucun pick validé pour cette période</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Match</TableHead>
                  <TableHead>Prédiction</TableHead>
                  <TableHead>Odds</TableHead>
                  <TableHead>Probabilité</TableHead>
                  <TableHead>Vigorish</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredValidatedPicks.map((pick) => (
                  <TableRow key={pick.id}>
                    <TableCell>
                      <div className="text-xs">
                        {format(new Date(pick.kickoff_utc), 'dd/MM', { locale: fr })}
                        <br />
                        {format(new Date(pick.kickoff_utc), 'HH:mm', { locale: fr })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-xs text-text-weak">{pick.league}</div>
                        <div className="font-medium text-sm">
                          {pick.home_team} vs {pick.away_team}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {pick.bet_type} {pick.prediction}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">{pick.odds.toFixed(2)}</TableCell>
                    <TableCell className="font-mono">{(pick.probability * 100).toFixed(1)}%</TableCell>
                    <TableCell className="font-mono text-sm">
                      {(pick.vigorish * 100).toFixed(2)}%
                    </TableCell>
                    <TableCell>
                      <Badge variant={pick.is_validated ? 'default' : 'secondary'}>
                        {pick.is_validated ? 'Validé' : 'En attente'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOddspediaSearch(pick.home_team, pick.away_team)}
                          className="hover:bg-surface-soft"
                          title="Rechercher sur Oddspedia"
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                        <Dialog open={isEditDialogOpen && editingPick?.id === pick.id} onOpenChange={setIsEditDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingPick(pick)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Modifier le pick</DialogTitle>
                            </DialogHeader>
                            {editingPick && (
                              <EditPickForm
                                pick={editingPick}
                                onSave={updateValidatedPick}
                                onCancel={() => {
                                  setIsEditDialogOpen(false);
                                  setEditingPick(null);
                                }}
                              />
                            )}
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleValidation(pick.id)}
                        >
                          {pick.is_validated ? 'Invalider' : 'Valider'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Statistics */}
        <div className="mt-4 text-sm text-text-weak">
          Total: {filteredValidatedPicks.length} pick(s) | 
          Validés: {filteredValidatedPicks.filter(p => p.is_validated).length} | 
          En attente: {filteredValidatedPicks.filter(p => !p.is_validated).length}
        </div>
      </Card>

      {/* Match Detail Modal */}
      <MatchDetailModal
        match={selectedMatch}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedMatch(null);
        }}
      />
    </div>
  );
}

interface EditPickFormProps {
  pick: ValidatedPick;
  onSave: (data: Partial<ValidatedPick>) => void;
  onCancel: () => void;
}

function EditPickForm({ pick, onSave, onCancel }: EditPickFormProps) {
  const [formData, setFormData] = useState({
    odds: pick.odds,
    probability: pick.probability,
    vigorish: pick.vigorish,
    prediction: pick.prediction,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="prediction">Prédiction</Label>
        <Input
          id="prediction"
          value={formData.prediction}
          onChange={(e) => setFormData({ ...formData, prediction: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="odds">Odds</Label>
        <Input
          id="odds"
          type="number"
          step="0.01"
          min="1"
          value={formData.odds}
          onChange={(e) => setFormData({ ...formData, odds: parseFloat(e.target.value) || 0 })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="probability">Probabilité (%)</Label>
        <Input
          id="probability"
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={(formData.probability * 100).toFixed(2)}
          onChange={(e) => setFormData({ ...formData, probability: parseFloat(e.target.value) / 100 || 0 })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="vigorish">Vigorish (%)</Label>
        <Input
          id="vigorish"
          type="number"
          step="0.01"
          min="0"
          value={(formData.vigorish * 100).toFixed(2)}
          onChange={(e) => setFormData({ ...formData, vigorish: parseFloat(e.target.value) / 100 || 0 })}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" className="bg-brand hover:bg-brand-300">
          Sauvegarder
        </Button>
      </div>
    </form>
  );
}