import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Trash2, Edit, Save, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Match {
  id: string;
  match_date: string;
  league: string;
  home_team: string;
  away_team: string;
  country: string;
  kickoff_utc: string;
  odds_home: number;
  odds_draw: number;
  odds_away: number;
  odds_btts_yes: number;
  odds_btts_no: number;
  odds_over_2_5: number;
  odds_under_2_5: number;
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
  ai_prediction?: string;
  ai_confidence?: number;
}

interface CSVDataViewerProps {
  isOpen: boolean;
  onClose: () => void;
  uploadDate: string;
  filename: string;
}

export function CSVDataViewer({ isOpen, onClose, uploadDate, filename }: CSVDataViewerProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Match>>({});
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadMatches();
    }
  }, [isOpen, uploadDate]);

  const loadMatches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('match_date', uploadDate)
        .order('kickoff_utc');

      if (error) throw error;
      setMatches(data || []);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (match: Match) => {
    setEditingId(match.id);
    setEditData(match);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async () => {
    if (!editingId || !editData) return;
    
    try {
      const { error } = await supabase
        .from('matches')
        .update(editData)
        .eq('id', editingId);

      if (error) throw error;

      setMatches(matches.map(m => 
        m.id === editingId ? { ...m, ...editData } : m
      ));
      
      setEditingId(null);
      setEditData({});
      
      toast({
        title: "Succès",
        description: "Match modifié avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la modification",
        variant: "destructive",
      });
    }
  };

  const deleteMatch = async (id: string) => {
    setDeleting(id);
    try {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMatches(matches.filter(m => m.id !== id));
      
      toast({
        title: "Succès",
        description: "Match supprimé avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const updateEditData = (field: keyof Match, value: any) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const renderEditableCell = (match: Match, field: keyof Match, type: 'text' | 'number' = 'text') => {
    if (editingId === match.id) {
      return (
        <Input
          type={type}
          value={editData[field] || ''}
          onChange={(e) => updateEditData(field, type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
          className="h-8 text-sm"
        />
      );
    }
    
    let displayValue = match[field];
    if (field === 'kickoff_utc' && displayValue) {
      displayValue = format(new Date(displayValue as string), 'dd/MM HH:mm', { locale: fr });
    }
    
    return <span className="text-sm">{displayValue}</span>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Données CSV: {filename}
            <Badge variant="outline">{matches.length} matchs</Badge>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Chargement...</span>
          </div>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Actions</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Ligue</TableHead>
                  <TableHead>Domicile</TableHead>
                  <TableHead>Extérieur</TableHead>
                  <TableHead>Pays</TableHead>
                  <TableHead>Kickoff</TableHead>
                  <TableHead>Cotes 1X2</TableHead>
                  <TableHead>Cotes BTTS</TableHead>
                  <TableHead>Cotes O/U 2.5</TableHead>
                  <TableHead>Prob. Fair</TableHead>
                  <TableHead>Vigorish</TableHead>
                  <TableHead>IA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matches.map((match) => (
                  <TableRow key={match.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {editingId === match.id ? (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={saveEdit}
                              className="h-7 w-7 p-0"
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEdit}
                              className="h-7 w-7 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEdit(match)}
                              className="h-7 w-7 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteMatch(match.id)}
                              disabled={deleting === match.id}
                              className="h-7 w-7 p-0"
                            >
                              {deleting === match.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(match, 'match_date')}
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(match, 'league')}
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(match, 'home_team')}
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(match, 'away_team')}
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(match, 'country')}
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(match, 'kickoff_utc')}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-xs">
                        <div>1: {renderEditableCell(match, 'odds_home', 'number')}</div>
                        <div>X: {renderEditableCell(match, 'odds_draw', 'number')}</div>
                        <div>2: {renderEditableCell(match, 'odds_away', 'number')}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-xs">
                        <div>Oui: {renderEditableCell(match, 'odds_btts_yes', 'number')}</div>
                        <div>Non: {renderEditableCell(match, 'odds_btts_no', 'number')}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-xs">
                        <div>+2.5: {renderEditableCell(match, 'odds_over_2_5', 'number')}</div>
                        <div>-2.5: {renderEditableCell(match, 'odds_under_2_5', 'number')}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-xs">
                        <div>1: {(match.p_home_fair * 100).toFixed(1)}%</div>
                        <div>X: {(match.p_draw_fair * 100).toFixed(1)}%</div>
                        <div>2: {(match.p_away_fair * 100).toFixed(1)}%</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-xs">
                        <div>1X2: {(match.vig_1x2 * 100).toFixed(1)}%</div>
                        <div>BTTS: {(match.vig_btts * 100).toFixed(1)}%</div>
                        <div>O/U: {(match.vig_ou_2_5 * 100).toFixed(1)}%</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {match.ai_prediction && (
                        <div className="space-y-1 text-xs">
                          <Badge variant="secondary" className="text-xs">
                            {match.ai_prediction}
                          </Badge>
                          {match.ai_confidence && (
                            <div>{(match.ai_confidence * 100).toFixed(0)}%</div>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}