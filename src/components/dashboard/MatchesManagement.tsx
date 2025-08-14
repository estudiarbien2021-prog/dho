import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Trash2, Edit, Search, Calendar, Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Match {
  id: string;
  league: string;
  home_team: string;
  away_team: string;
  country?: string | null;
  match_date: string;
  kickoff_utc: string;
  kickoff_local: string;
  category: string;
  odds_home: number;
  odds_draw: number;
  odds_away: number;
  odds_btts_yes?: number | null;
  odds_btts_no?: number | null;
  odds_over_2_5?: number | null;
  odds_under_2_5?: number | null;
  p_home_fair: number;
  p_draw_fair: number;
  p_away_fair: number;
  p_btts_yes_fair: number;
  p_btts_no_fair: number;
  p_over_2_5_fair: number;
  p_under_2_5_fair: number;
  vig_1x2: number;
  vig_btts: number;
  vig_ou_2_5: number;
  is_low_vig_1x2: boolean;
  watch_btts: boolean;
  watch_over25: boolean;
  ai_prediction?: string | null;
  ai_confidence?: number | null;
  created_at: string;
  updated_at: string;
}

export function MatchesManagement() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMatches, setSelectedMatches] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('matches')
        .select('*')
        .order('match_date', { ascending: false })
        .order('kickoff_utc', { ascending: false })
        .limit(100);

      if (dateFilter) {
        query = query.eq('match_date', dateFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMatches(data || []);
    } catch (error) {
      console.error('Error loading matches:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les matchs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSelectedMatches = async () => {
    if (selectedMatches.length === 0) return;

    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('matches')
        .delete()
        .in('id', selectedMatches);

      if (error) throw error;

      toast({
        title: "Succès",
        description: `${selectedMatches.length} match(s) supprimé(s)`,
      });

      setSelectedMatches([]);
      await loadMatches();
    } catch (error) {
      console.error('Error deleting matches:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer les matchs",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const updateMatch = async (matchData: Partial<Match>) => {
    if (!editingMatch) return;

    console.log('🔄 Début de la sauvegarde du match:', editingMatch.id);
    console.log('📝 Données à sauvegarder:', matchData);

    try {
      const { error } = await supabase
        .from('matches')
        .update(matchData)
        .eq('id', editingMatch.id);

      if (error) throw error;

      console.log('✅ Match sauvegardé avec succès');

      toast({
        title: "Succès",
        description: "Match mis à jour avec succès",
      });

      // Attendre un peu avant de fermer le dialogue pour que l'utilisateur voie le toast
      setTimeout(() => {
        setIsEditDialogOpen(false);
        setEditingMatch(null);
      }, 1000);
      
      await loadMatches();
      console.log('🔄 Liste des matchs rechargée');
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde du match:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le match",
        variant: "destructive",
      });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMatches(filteredMatches.map(match => match.id));
    } else {
      setSelectedMatches([]);
    }
  };

  const handleSelectMatch = (matchId: string, checked: boolean) => {
    if (checked) {
      setSelectedMatches([...selectedMatches, matchId]);
    } else {
      setSelectedMatches(selectedMatches.filter(id => id !== matchId));
    }
  };

  const filteredMatches = matches.filter(match => 
    match.home_team?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    match.away_team?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    match.league?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    match.country?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            <CardTitle>Gestion des Matchs</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadMatches} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            {selectedMatches.length > 0 && (
              <Button 
                variant="destructive" 
                onClick={deleteSelectedMatches}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer ({selectedMatches.length})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Rechercher par équipe, ligue ou pays..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-48"
            />
          </div>
          {dateFilter && (
            <Button variant="ghost" onClick={() => setDateFilter('')}>
              Tout afficher
            </Button>
          )}
        </div>

        {/* Matches Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedMatches.length === filteredMatches.length && filteredMatches.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Match</TableHead>
                <TableHead>Ligue</TableHead>
                <TableHead>Pays</TableHead>
                <TableHead>Cotes</TableHead>
                <TableHead>Proba. Fair</TableHead>
                <TableHead>BTTS/O2.5</TableHead>
                <TableHead>Vig</TableHead>
                <TableHead>IA Pred.</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead className="w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Chargement des matchs...
                  </TableCell>
                </TableRow>
              ) : filteredMatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                    Aucun match trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredMatches.map((match) => (
                  <TableRow key={match.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedMatches.includes(match.id)}
                        onCheckedChange={(checked) => handleSelectMatch(match.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm">
                          {format(new Date(match.match_date), 'dd/MM/yyyy', { locale: fr })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(match.kickoff_utc), 'HH:mm', { locale: fr })}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">
                        {match.home_team} vs {match.away_team}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {match.league}
                      </Badge>
                    </TableCell>
                    <TableCell>{match.country || '-'}</TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <div>1: {match.odds_home}</div>
                        <div>X: {match.odds_draw}</div>
                        <div>2: {match.odds_away}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <div>{(match.p_home_fair * 100).toFixed(1)}%</div>
                        <div>{(match.p_draw_fair * 100).toFixed(1)}%</div>
                        <div>{(match.p_away_fair * 100).toFixed(1)}%</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <div>BTTS: {match.p_btts_yes_fair ? (match.p_btts_yes_fair * 100).toFixed(1) + '%' : '-'}</div>
                        <div>O2.5: {match.p_over_2_5_fair ? (match.p_over_2_5_fair * 100).toFixed(1) + '%' : '-'}</div>
                        <div>U2.5: {match.p_under_2_5_fair ? (match.p_under_2_5_fair * 100).toFixed(1) + '%' : '-'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={match.vig_1x2 < 0.05 ? "default" : "secondary"} className="text-xs">
                          1X2: {(match.vig_1x2 * 100).toFixed(1)}%
                        </Badge>
                        {match.vig_btts > 0 && (
                          <Badge variant="outline" className="text-xs">
                            BTTS: {(match.vig_btts * 100).toFixed(1)}%
                          </Badge>
                        )}
                        {match.vig_ou_2_5 > 0 && (
                          <Badge variant="outline" className="text-xs">
                            O/U: {(match.vig_ou_2_5 * 100).toFixed(1)}%
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        {match.ai_prediction && (
                          <div className="mb-1">
                            <Badge variant="default" className="text-xs">
                              {match.ai_prediction}
                            </Badge>
                          </div>
                        )}
                        {match.ai_confidence && (
                          <div className="text-muted-foreground">
                            {(match.ai_confidence * 100).toFixed(0)}%
                          </div>
                        )}
                        {!match.ai_prediction && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {match.is_low_vig_1x2 && (
                          <Badge variant="default" className="text-xs">Low Vig</Badge>
                        )}
                        {match.watch_btts && (
                          <Badge variant="secondary" className="text-xs">BTTS</Badge>
                        )}
                        {match.watch_over25 && (
                          <Badge variant="secondary" className="text-xs">O2.5</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Dialog open={isEditDialogOpen && editingMatch?.id === match.id} onOpenChange={setIsEditDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingMatch(match)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Modifier le match</DialogTitle>
                          </DialogHeader>
                          {editingMatch && (
                            <EditMatchForm
                              match={editingMatch}
                              onSave={updateMatch}
                              onCancel={() => {
                                setIsEditDialogOpen(false);
                                setEditingMatch(null);
                              }}
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Statistics */}
        <div className="mt-4 text-sm text-muted-foreground">
          Total: {filteredMatches.length} match(s) | Sélectionnés: {selectedMatches.length}
        </div>
      </CardContent>
    </Card>
  );
}

interface EditMatchFormProps {
  match: Match;
  onSave: (data: Partial<Match>) => void;
  onCancel: () => void;
}

function EditMatchForm({ match, onSave, onCancel }: EditMatchFormProps) {
  const [formData, setFormData] = useState({
    p_home_fair: match.p_home_fair,
    p_draw_fair: match.p_draw_fair,
    p_away_fair: match.p_away_fair,
    p_btts_yes_fair: match.p_btts_yes_fair,
    p_btts_no_fair: match.p_btts_no_fair,
    p_over_2_5_fair: match.p_over_2_5_fair,
    p_under_2_5_fair: match.p_under_2_5_fair,
    vig_1x2: match.vig_1x2,
    vig_btts: match.vig_btts,
    vig_ou_2_5: match.vig_ou_2_5,
    is_low_vig_1x2: match.is_low_vig_1x2,
    watch_btts: match.watch_btts,
    watch_over25: match.watch_over25,
    ai_prediction: match.ai_prediction || '',
    ai_confidence: match.ai_confidence || 0,
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📤 Soumission du formulaire avec:', formData);
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1X2 Probabilities */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Probabilités 1X2</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Domicile</Label>
            <Input
              type="number"
              step="0.001"
              min="0"
              max="1"
              value={formData.p_home_fair}
              onChange={(e) => setFormData({...formData, p_home_fair: parseFloat(e.target.value)})}
            />
          </div>
          <div className="space-y-2">
            <Label>Match Nul</Label>
            <Input
              type="number"
              step="0.001"
              min="0"
              max="1"
              value={formData.p_draw_fair}
              onChange={(e) => setFormData({...formData, p_draw_fair: parseFloat(e.target.value)})}
            />
          </div>
          <div className="space-y-2">
            <Label>Extérieur</Label>
            <Input
              type="number"
              step="0.001"
              min="0"
              max="1"
              value={formData.p_away_fair}
              onChange={(e) => setFormData({...formData, p_away_fair: parseFloat(e.target.value)})}
            />
          </div>
        </div>
      </div>

      {/* BTTS Probabilities */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Probabilités BTTS</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>BTTS Oui</Label>
            <Input
              type="number"
              step="0.001"
              min="0"
              max="1"
              value={formData.p_btts_yes_fair}
              onChange={(e) => setFormData({...formData, p_btts_yes_fair: parseFloat(e.target.value)})}
            />
          </div>
          <div className="space-y-2">
            <Label>BTTS Non</Label>
            <Input
              type="number"
              step="0.001"
              min="0"
              max="1"
              value={formData.p_btts_no_fair}
              onChange={(e) => setFormData({...formData, p_btts_no_fair: parseFloat(e.target.value)})}
            />
          </div>
        </div>
      </div>

      {/* Over/Under Probabilities */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Probabilités Over/Under 2.5</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Over 2.5</Label>
            <Input
              type="number"
              step="0.001"
              min="0"
              max="1"
              value={formData.p_over_2_5_fair}
              onChange={(e) => setFormData({...formData, p_over_2_5_fair: parseFloat(e.target.value)})}
            />
          </div>
          <div className="space-y-2">
            <Label>Under 2.5</Label>
            <Input
              type="number"
              step="0.001"
              min="0"
              max="1"
              value={formData.p_under_2_5_fair}
              onChange={(e) => setFormData({...formData, p_under_2_5_fair: parseFloat(e.target.value)})}
            />
          </div>
        </div>
      </div>

      {/* Vigorish */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Vigorish</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Vigorish 1X2</Label>
            <Input
              type="number"
              step="0.001"
              min="0"
              max="1"
              value={formData.vig_1x2}
              onChange={(e) => setFormData({...formData, vig_1x2: parseFloat(e.target.value)})}
            />
          </div>
          <div className="space-y-2">
            <Label>Vigorish BTTS</Label>
            <Input
              type="number"
              step="0.001"
              min="0"
              max="1"
              value={formData.vig_btts}
              onChange={(e) => setFormData({...formData, vig_btts: parseFloat(e.target.value)})}
            />
          </div>
          <div className="space-y-2">
            <Label>Vigorish O/U 2.5</Label>
            <Input
              type="number"
              step="0.001"
              min="0"
              max="1"
              value={formData.vig_ou_2_5}
              onChange={(e) => setFormData({...formData, vig_ou_2_5: parseFloat(e.target.value)})}
            />
          </div>
        </div>
      </div>

      {/* AI Prediction */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Prédiction IA</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Prédiction recommandée</Label>
            <Input
              type="text"
              placeholder="ex: 1X, Over 2.5, BTTS Yes"
              value={formData.ai_prediction}
              onChange={(e) => setFormData({...formData, ai_prediction: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label>Confiance (%)</Label>
            <Input
              type="number"
              step="1"
              min="0"
              max="100"
              value={formData.ai_confidence * 100}
              onChange={(e) => setFormData({...formData, ai_confidence: parseFloat(e.target.value) / 100})}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_low_vig_1x2"
            checked={formData.is_low_vig_1x2}
            onCheckedChange={(checked) => setFormData({...formData, is_low_vig_1x2: checked as boolean})}
          />
          <Label htmlFor="is_low_vig_1x2">Low Vig 1X2</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="watch_btts"
            checked={formData.watch_btts}
            onCheckedChange={(checked) => setFormData({...formData, watch_btts: checked as boolean})}
          />
          <Label htmlFor="watch_btts">Watch BTTS</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="watch_over25"
            checked={formData.watch_over25}
            onCheckedChange={(checked) => setFormData({...formData, watch_over25: checked as boolean})}
          />
          <Label htmlFor="watch_over25">Watch Over 2.5</Label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          Annuler
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Sauvegarde...
            </>
          ) : (
            'Enregistrer'
          )}
        </Button>
      </div>
    </form>
  );
}