
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Trash2, Edit, Save, X, Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CSVRow {
  [key: string]: string | number;
}

interface CSVDataViewerProps {
  isOpen: boolean;
  onClose: () => void;
  uploadDate: string;
  filename: string;
}

export function CSVDataViewer({ isOpen, onClose, uploadDate, filename }: CSVDataViewerProps) {
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editData, setEditData] = useState<CSVRow>({});
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadRawCSVData();
    }
  }, [isOpen, uploadDate]);

  const loadRawCSVData = async () => {
    setLoading(true);
    try {
      // Récupérer toutes les données brutes du CSV pour cette date
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('match_date', uploadDate)
        .order('kickoff_utc');

      if (error) throw error;

      if (data && data.length > 0) {
        // Convertir les données de la base vers un format CSV brut
        const rawData: CSVRow[] = data.map((match, index) => ({
          id: match.id,
          league: match.league || '',
          home_team: match.home_team || '',
          away_team: match.away_team || '',
          match_date: match.match_date || '',
          country: match.country || '',
          kickoff_utc: match.kickoff_utc || '',
          odds_home: match.odds_home || '',
          odds_draw: match.odds_draw || '',
          odds_away: match.odds_away || '',
          odds_btts_yes: match.odds_btts_yes || '',
          odds_btts_no: match.odds_btts_no || '',
          odds_over_2_5: match.odds_over_2_5 || '',
          odds_under_2_5: match.odds_under_2_5 || '',
          p_home_fair: match.p_home_fair || '',
          p_draw_fair: match.p_draw_fair || '',
          p_away_fair: match.p_away_fair || '',
          p_btts_yes_fair: match.p_btts_yes_fair || '',
          p_btts_no_fair: match.p_btts_no_fair || '',
          p_over_2_5_fair: match.p_over_2_5_fair || '',
          p_under_2_5_fair: match.p_under_2_5_fair || '',
          vig_1x2: match.vig_1x2 || '',
          vig_btts: match.vig_btts || '',
          vig_ou_2_5: match.vig_ou_2_5 || '',
          ai_prediction: match.ai_prediction || '',
          ai_confidence: match.ai_confidence || ''
        }));

        setCsvData(rawData);
        
        // Extraire les headers depuis les clés du premier objet
        if (rawData.length > 0) {
          const csvHeaders = Object.keys(rawData[0]);
          setHeaders(csvHeaders);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du CSV",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (rowIndex: number) => {
    setEditingRowIndex(rowIndex);
    setEditData({ ...csvData[rowIndex] });
  };

  const cancelEdit = () => {
    setEditingRowIndex(null);
    setEditData({});
  };

  const saveEdit = async () => {
    if (editingRowIndex === null) return;
    
    try {
      const rowId = csvData[editingRowIndex].id;
      
      // Mettre à jour dans Supabase
      const { error } = await supabase
        .from('matches')
        .update({
          league: editData.league,
          home_team: editData.home_team,
          away_team: editData.away_team,
          country: editData.country,
          odds_home: parseFloat(editData.odds_home as string) || null,
          odds_draw: parseFloat(editData.odds_draw as string) || null,
          odds_away: parseFloat(editData.odds_away as string) || null,
          odds_btts_yes: parseFloat(editData.odds_btts_yes as string) || null,
          odds_btts_no: parseFloat(editData.odds_btts_no as string) || null,
          odds_over_2_5: parseFloat(editData.odds_over_2_5 as string) || null,
          odds_under_2_5: parseFloat(editData.odds_under_2_5 as string) || null,
        })
        .eq('id', rowId);

      if (error) throw error;

      // Mettre à jour localement
      const newData = [...csvData];
      newData[editingRowIndex] = editData;
      setCsvData(newData);
      
      setEditingRowIndex(null);
      setEditData({});
      
      toast({
        title: "Succès",
        description: "Ligne modifiée avec succès",
      });
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la modification",
        variant: "destructive",
      });
    }
  };

  const deleteRow = async (rowIndex: number) => {
    setDeleting(rowIndex);
    try {
      const rowId = csvData[rowIndex].id;
      
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', rowId);

      if (error) throw error;

      const newData = csvData.filter((_, index) => index !== rowIndex);
      setCsvData(newData);
      
      toast({
        title: "Succès",
        description: "Ligne supprimée avec succès",
      });
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const downloadCSV = () => {
    if (!csvData.length) return;
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => 
        headers.map(header => {
          const value = row[header];
          // Échapper les valeurs qui contiennent des virgules
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_modified.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const updateEditData = (field: string, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const renderCell = (row: CSVRow, header: string, rowIndex: number) => {
    if (editingRowIndex === rowIndex) {
      return (
        <Input
          value={editData[header] || ''}
          onChange={(e) => updateEditData(header, e.target.value)}
          className="h-8 text-xs min-w-[100px]"
        />
      );
    }
    
    const value = row[header];
    return (
      <span className="text-xs whitespace-nowrap">
        {value?.toString() || ''}
      </span>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-4 justify-between">
            <div className="flex items-center gap-2">
              <span>Données CSV: {filename}</span>
              <Badge variant="outline">{csvData.length} lignes</Badge>
            </div>
            <Button
              onClick={downloadCSV}
              size="sm"
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Télécharger CSV
            </Button>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Chargement des données...</span>
          </div>
        ) : (
          <ScrollArea className="flex-1 w-full">
            <div className="min-w-full">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="sticky left-0 bg-gray-50 z-10 min-w-[120px] border-r">
                      Actions
                    </TableHead>
                    {headers.map((header) => (
                      <TableHead 
                        key={header} 
                        className="text-xs font-medium min-w-[120px] whitespace-nowrap border-r"
                      >
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvData.map((row, rowIndex) => (
                    <TableRow key={rowIndex} className="border-b">
                      <TableCell className="sticky left-0 bg-white z-10 border-r">
                        <div className="flex items-center gap-1">
                          {editingRowIndex === rowIndex ? (
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
                                onClick={() => startEdit(rowIndex)}
                                className="h-7 w-7 p-0"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteRow(rowIndex)}
                                disabled={deleting === rowIndex}
                                className="h-7 w-7 p-0"
                              >
                                {deleting === rowIndex ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                      {headers.map((header) => (
                        <TableCell 
                          key={`${rowIndex}-${header}`} 
                          className="text-xs border-r min-w-[120px]"
                        >
                          {renderCell(row, header, rowIndex)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
