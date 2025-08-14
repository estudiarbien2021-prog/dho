import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, RefreshCw, Calendar, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface UploadHistory {
  id: string;
  upload_date: string;
  filename: string;
  total_matches: number;
  processed_matches: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error_message?: string;
  created_at: string;
}

export function Admin() {
  const [csvUrl, setCsvUrl] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [filename, setFilename] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [selectedUploads, setSelectedUploads] = useState<string[]>([]);
  const [isDeletingUploads, setIsDeletingUploads] = useState(false);
  const [clearDate, setClearDate] = useState(new Date().toISOString().split('T')[0]);

  // Load upload history
  useEffect(() => {
    loadUploadHistory();
  }, []);

  // Auto-generate filename based on match date
  useEffect(() => {
    if (matchDate && !filename) {
      const date = new Date(matchDate);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString().slice(-2);
      setFilename(`${day}${month}${year}.csv`);
    }
  }, [matchDate, filename]);

  const loadUploadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('match_uploads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setUploadHistory((data || []) as UploadHistory[]);
    } catch (error) {
      console.error('Error loading upload history:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'historique des uploads",
        variant: "destructive",
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleProcessCSV = async () => {
    if (!csvFile) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fichier CSV",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      console.log('🚀 Lecture du fichier CSV...');
      
      const fileContent = await csvFile.text();
      
      const { data, error } = await supabase.functions.invoke('process-matches-csv', {
        body: {
          csvContent: fileContent,
          matchDate,
          filename: filename.trim() || csvFile.name
        }
      });

      if (error) {
        throw error;
      }

      console.log('✅ Réponse Edge Function:', data);

      toast({
        title: "Succès !",
        description: `${data.processedMatches} matchs traités avec succès pour le ${data.uploadDate}`,
      });

      // Clear form
      setCsvFile(null);
      setFilename('');
      
      // Reload history
      await loadUploadHistory();
      
    } catch (error) {
      console.error('❌ Erreur traitement CSV:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors du traitement du CSV",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      error: 'destructive',
      processing: 'secondary',
      pending: 'outline'
    } as const;

    const labels = {
      completed: 'Terminé',
      error: 'Erreur',
      processing: 'En cours',
      pending: 'En attente'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const handleSelectUpload = (uploadId: string, checked: boolean) => {
    if (checked) {
      setSelectedUploads([...selectedUploads, uploadId]);
    } else {
      setSelectedUploads(selectedUploads.filter(id => id !== uploadId));
    }
  };

  const handleSelectAllUploads = (checked: boolean) => {
    if (checked) {
      setSelectedUploads(uploadHistory.map(upload => upload.id));
    } else {
      setSelectedUploads([]);
    }
  };

  const handleDeleteSelectedUploads = async () => {
    if (selectedUploads.length === 0) return;

    setIsDeletingUploads(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-uploads', {
        body: { uploadIds: selectedUploads }
      });

      if (error) throw error;

      toast({
        title: "Succès !",
        description: data.message,
      });

      setSelectedUploads([]);
      await loadUploadHistory();
      
    } catch (error) {
      console.error('❌ Erreur suppression uploads:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la suppression",
        variant: "destructive",
      });
    } finally {
      setIsDeletingUploads(false);
    }
  };

  const handleClearDashboard = async () => {
    const confirmed = window.confirm(`⚠️ ATTENTION: Cette action va supprimer TOUS les matchs du ${clearDate} du dashboard. Êtes-vous sûr ?`);
    if (!confirmed) return;

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('clear-matches', {
        body: { targetDate: clearDate }
      });

      if (error) throw error;

      toast({
        title: "Matchs supprimés !",
        description: data.message,
      });

      await loadUploadHistory();
      
    } catch (error) {
      console.error('❌ Erreur suppression matchs:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la suppression des matchs",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file => file.name.toLowerCase().endsWith('.csv'));
    
    if (csvFile) {
      setCsvFile(csvFile);
      if (!filename) {
        setFilename(csvFile.name);
      }
    } else {
      toast({
        title: "Erreur",
        description: "Veuillez déposer un fichier CSV",
        variant: "destructive",
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.csv')) {
      setCsvFile(file);
      if (!filename) {
        setFilename(file.name);
      }
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-brand to-brand-400 bg-clip-text text-transparent mb-2">
          Administration des Matchs
        </h1>
        <p className="text-text-weak">
          Gérez le téléchargement et le traitement automatique des fichiers CSV de matchs
        </p>
      </div>

      {/* CSV Upload Form */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Upload className="h-6 w-6 text-brand" />
          <h2 className="text-2xl font-semibold">Traiter un nouveau CSV</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="csvFile">Fichier CSV *</Label>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragOver 
                    ? 'border-brand bg-brand/5' 
                    : csvFile 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-300 hover:border-brand'
                }`}
              >
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="csvFileInput"
                  disabled={isProcessing}
                />
                {csvFile ? (
                  <div className="space-y-2">
                    <div className="text-green-600 font-medium">✓ Fichier sélectionné</div>
                    <div className="text-sm text-gray-600">{csvFile.name}</div>
                    <div className="text-xs text-gray-500">
                      {(csvFile.size / 1024).toFixed(1)} KB
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCsvFile(null)}
                      disabled={isProcessing}
                    >
                      Changer de fichier
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-gray-400" />
                    <div className="text-gray-600">
                      Glissez votre fichier CSV ici ou{' '}
                      <button
                        type="button"
                        onClick={() => document.getElementById('csvFileInput')?.click()}
                        className="text-brand hover:underline"
                        disabled={isProcessing}
                      >
                        cliquez pour parcourir
                      </button>
                    </div>
                    <div className="text-xs text-gray-500">
                      Formats acceptés: .csv (max 10MB)
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="matchDate">Date des matchs</Label>
              <Input
                id="matchDate"
                type="date"
                value={matchDate}
                onChange={(e) => {
                  setMatchDate(e.target.value);
                  // Auto-update filename when date changes
                  if (e.target.value) {
                    const date = new Date(e.target.value);
                    const day = date.getDate().toString().padStart(2, '0');
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const year = date.getFullYear().toString().slice(-2);
                    setFilename(`${day}${month}${year}.csv`);
                  }
                }}
                disabled={isProcessing}
              />
            </div>

            <div>
              <Label htmlFor="filename">Nom du fichier</Label>
              <Input
                id="filename"
                placeholder="DDMMYY.csv"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                disabled={isProcessing}
              />
              <p className="text-xs text-text-weak mt-1">
                Généré automatiquement basé sur la date des matchs
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-center space-y-4">
            <div className="p-4 bg-surface-soft rounded-lg">
              <h3 className="font-semibold mb-2">ℹ️ Instructions</h3>
              <ul className="text-sm text-text-weak space-y-1">
                <li>• Glissez-déposez votre fichier CSV dans la zone ci-dessus</li>
                <li>• Le fichier sera traité automatiquement</li>
                <li>• Les doublons sont automatiquement gérés</li>
                <li>• Ajoutez une colonne "country" pour des drapeaux précis</li>
              </ul>
            </div>

            <Button 
              onClick={handleProcessCSV}
              disabled={isProcessing || !csvFile}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Traitement en cours...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Traiter le CSV
                </>
              )}
            </Button>

            <div className="border-t pt-4 mt-4">
              <Label htmlFor="clearDate">Date à vider du dashboard</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="clearDate"
                  type="date"
                  value={clearDate}
                  onChange={(e) => setClearDate(e.target.value)}
                  disabled={isProcessing || isDeletingUploads}
                  className="flex-1"
                />
                <Button 
                  onClick={handleClearDashboard}
                  disabled={isProcessing || isDeletingUploads}
                  variant="destructive"
                  size="sm"
                >
                  {isProcessing ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Vider
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Upload History */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-brand" />
            <h2 className="text-2xl font-semibold">Historique des traitements</h2>
          </div>
          <div className="flex items-center gap-2">
            {selectedUploads.length > 0 && (
              <Button 
                variant="destructive" 
                onClick={handleDeleteSelectedUploads}
                disabled={isDeletingUploads}
                size="sm"
              >
                {isDeletingUploads ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Supprimer ({selectedUploads.length})
              </Button>
            )}
            <Button variant="outline" onClick={loadUploadHistory} disabled={isLoadingHistory}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingHistory ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>

        {isLoadingHistory ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-brand" />
            <p className="text-text-weak">Chargement de l'historique...</p>
          </div>
        ) : uploadHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedUploads.length === uploadHistory.length && uploadHistory.length > 0}
                      onCheckedChange={handleSelectAllUploads}
                      disabled={isDeletingUploads}
                    />
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Fichier</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Matchs</TableHead>
                  <TableHead>Traités</TableHead>
                  <TableHead>Créé le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploadHistory.map((upload) => (
                  <TableRow key={upload.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUploads.includes(upload.id)}
                        onCheckedChange={(checked) => handleSelectUpload(upload.id, checked as boolean)}
                        disabled={isDeletingUploads}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {format(new Date(upload.upload_date), 'dd/MM/yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-surface-soft px-2 py-1 rounded">
                        {upload.filename}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(upload.status)}
                        {getStatusBadge(upload.status)}
                      </div>
                      {upload.error_message && (
                        <p className="text-xs text-red-600 mt-1">
                          {upload.error_message}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{upload.total_matches}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={upload.processed_matches === upload.total_matches ? 'default' : 'secondary'}>
                        {upload.processed_matches}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-text-weak">
                      {format(new Date(upload.created_at), 'dd/MM HH:mm', { locale: fr })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-text-weak" />
            <p className="text-text-weak">Aucun traitement trouvé</p>
            <p className="text-sm text-text-weak mt-2">
              Commencez par traiter votre premier fichier CSV
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}