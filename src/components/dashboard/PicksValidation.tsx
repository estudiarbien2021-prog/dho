import React, { useState, useEffect } from 'react';
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
import { CheckCircle, RefreshCw, Target, Eye, Edit, Calendar, Search } from 'lucide-react';
import { ProcessedMatch } from '@/types/match';
import { generateAIRecommendation } from '@/lib/aiRecommendation';
import { FlagMini } from '@/components/Flag';
import { leagueToFlag } from '@/lib/leagueCountry';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMatchesData } from '@/hooks/useMatchesData';

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
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPick, setEditingPick] = useState<ValidatedPick | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const { matches = [] } = useMatchesData();

  useEffect(() => {
    if (matches.length > 0) {
      loadPotentialPicks();
    }
    loadValidatedPicks();
  }, [matches, dateFilter]);

  const loadValidatedPicks = async () => {
    try {
      let query = supabase
        .from('validated_picks')
        .select('*')
        .order('created_at', { ascending: false });

      // Filtrer par date si spécifié
      if (dateFilter) {
        const startDate = new Date(dateFilter);
        const endDate = new Date(dateFilter);
        endDate.setDate(endDate.getDate() + 1);
        
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

  const loadPotentialPicks = () => {
    if (matches.length === 0) {
      setIsLoading(false);
      return;
    }

    try {
      console.log('🔍 Analyse des matchs pour les picks potentiels...');
      console.log(`📅 Filtrage par date: ${dateFilter}`);
      console.log(`📊 Total matchs disponibles: ${matches.length}`);
      
      // Debug: afficher quelques dates de matchs pour vérifier
      const sampleDates = matches.slice(0, 5).map(m => ({
        team: `${m.home_team} vs ${m.away_team}`,
        date: new Date(m.kickoff_utc).toDateString(),
        kickoff: m.kickoff_utc
      }));
      console.log('📅 Échantillon des dates de matchs:', sampleDates);
      
      // Filtrer d'abord par date si spécifiée
      let matchesToAnalyze = matches;
      if (dateFilter) {
        const targetDate = new Date(dateFilter);
        console.log(`🎯 Date cible recherchée: ${targetDate.toDateString()}`);
        
        matchesToAnalyze = matches.filter(match => {
          const matchDate = new Date(match.kickoff_utc);
          const matchDateStr = matchDate.toDateString();
          const targetDateStr = targetDate.toDateString();
          const isMatch = matchDateStr === targetDateStr;
          
          if (isMatch) {
            console.log(`✅ Match trouvé pour la date: ${match.home_team} vs ${match.away_team} - ${matchDateStr}`);
          }
          
          return isMatch;
        });
        console.log(`📊 Matchs filtrés par date: ${matchesToAnalyze.length}/${matches.length}`);
        
        if (matchesToAnalyze.length === 0) {
          console.log('❌ Aucun match trouvé pour cette date. Vérifiez les données CSV.');
        }
      }
      
      // Filtrer par catégorie comme dans TopPicks mais avec les nouveaux critères
      const filteredMatches = matchesToAnalyze.filter(match => {
        const isValidCategory = match.category === 'first_div' || match.category === 'continental_cup';
        
        // Exclure l'Asie complètement
        const asianCountries = ['Japan', 'South Korea', 'China', 'Thailand', 'Singapore', 'Malaysia', 'Indonesia', 'Vietnam', 'Philippines', 'India', 'Saudi Arabia', 'UAE', 'Qatar', 'Iran', 'Iraq', 'Jordan', 'Lebanon', 'Syria', 'Uzbekistan', 'Kazakhstan', 'Kyrgyzstan', 'Tajikistan', 'Turkmenistan', 'Afghanistan', 'Pakistan', 'Bangladesh', 'Sri Lanka', 'Myanmar', 'Cambodia', 'Laos', 'Nepal', 'Bhutan', 'Mongolia', 'North Korea'];
        
        const asianCompetitions = ['AFC Champions League', 'AFC Cup', 'AFC Asian Cup', 'J1 League', 'K League 1', 'Chinese Super League', 'Thai League 1', 'Malaysian Super League', 'Indonesian Liga 1', 'V.League 1', 'Philippine Football League', 'Indian Super League', 'Saudi Pro League', 'UAE Pro League', 'Qatar Stars League', 'Iran Pro League', 'Iraq Stars League'];
        
        // Exclure l'Amérique latine (sauf Brésil) pour les championnats domestiques
        const latinAmericanCountries = ['Argentina', 'Chile', 'Colombia', 'Peru', 'Uruguay', 'Paraguay', 'Bolivia', 'Ecuador', 'Venezuela', 'Mexico', 'Guatemala', 'Honduras', 'El Salvador', 'Nicaragua', 'Costa Rica', 'Panama'];
        
        // Exclure l'Afrique pour les championnats domestiques
        const africanCountries = ['South Africa', 'Nigeria', 'Ghana', 'Morocco', 'Egypt', 'Tunisia', 'Algeria', 'Kenya', 'Ethiopia', 'Tanzania', 'Uganda', 'Zimbabwe', 'Zambia', 'Botswana', 'Cameroon', 'Ivory Coast', 'Senegal', 'Mali', 'Burkina Faso', 'Guinea', 'Sierra Leone', 'Liberia', 'Gambia', 'Cape Verde', 'Mauritania', 'Chad', 'Central African Republic', 'Democratic Republic of Congo', 'Republic of Congo', 'Gabon', 'Equatorial Guinea', 'Angola', 'Namibia', 'Lesotho', 'Swaziland', 'Madagascar', 'Mauritius', 'Comoros', 'Seychelles'];
        
        const isNotAsianCountry = !asianCountries.includes(match.country || '');
        const isNotAsianCompetition = !asianCompetitions.some(comp => (match.league || '').toLowerCase().includes(comp.toLowerCase()));
        
        // Pour les championnats domestiques, exclure Amérique latine sauf Brésil et Afrique
        if (match.category === 'first_div') {
          const isNotLatinAmerican = !latinAmericanCountries.includes(match.country || '');
          const isBrazil = match.country === 'Brazil';
          const isNotAfrican = !africanCountries.includes(match.country || '');
          
          return isValidCategory && isNotAsianCountry && isNotAsianCompetition && (isNotLatinAmerican || isBrazil) && isNotAfrican;
        }
        
        // Pour les compétitions continentales, garder toutes sauf asiatiques
        return isValidCategory && isNotAsianCountry && isNotAsianCompetition;
      });

      console.log(`📊 Matchs filtrés par critères: ${filteredMatches.length}/${matchesToAnalyze.length}`);

      const validBets: PotentialPick[] = [];
      
      filteredMatches.forEach(match => {
        const aiRec = generateAIRecommendation(match, []);
        
        if (aiRec) {
          const probability = aiRec.betType === 'BTTS' 
            ? (aiRec.prediction === 'Oui' ? match.p_btts_yes_fair : match.p_btts_no_fair)
            : (aiRec.prediction === '+2,5 buts' ? match.p_over_2_5_fair : match.p_under_2_5_fair);
          
          // Appliquer les nouveaux critères : probabilité >= 51% ET odds >= 1.6
          if (probability >= 0.51 && aiRec.odds >= 1.6) {
            validBets.push({
              match,
              betType: aiRec.betType,
              prediction: aiRec.prediction,
              odds: aiRec.odds,
              probability,
              vigorish: aiRec.betType === 'BTTS' ? match.vig_btts : match.vig_ou_2_5,
              id: `${match.id}-${aiRec.betType}-${aiRec.prediction}`
            });
          }
        }
      });

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
    } finally {
      setIsLoading(false);
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

        return {
          match_id: pick.match.id,
          league: pick.match.league,
          home_team: pick.match.home_team,
          away_team: pick.match.away_team,
          country: pick.match.country,
          kickoff_utc: pick.match.kickoff_utc.toISOString(),
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
      setSelectedPicks(potentialPicks.map(pick => pick.id));
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
          <Button variant="outline" onClick={loadPotentialPicks} disabled={isLoading}>
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
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-text-weak" />
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-48"
            />
          </div>
        </div>
        {dateFilter && (
          <Button variant="ghost" onClick={() => setDateFilter('')}>
            Tout afficher
          </Button>
        )}
      </div>

      {/* Potential Picks */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Picks Potentiels ({potentialPicks.length})</h3>
          <Checkbox
            checked={selectedPicks.length === potentialPicks.length && potentialPicks.length > 0}
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
                  <TableHead>Match</TableHead>
                  <TableHead>Prédiction</TableHead>
                  <TableHead>Odds</TableHead>
                  <TableHead>Probabilité</TableHead>
                  <TableHead>Vigorish</TableHead>
                  <TableHead>Kickoff</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {potentialPicks.map((pick) => {
                  const flagInfo = leagueToFlag(pick.match.league, pick.match.country, pick.match.home_team, pick.match.away_team);
                  
                  return (
                    <TableRow key={pick.id}>
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
                        {format(pick.match.kickoff_utc, 'HH:mm', { locale: fr })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

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