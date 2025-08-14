import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, RefreshCw, Calendar, CheckCircle, XCircle, Clock, Trash2, Users, Database, Shield, Eye, UserX, Crown, Trophy } from 'lucide-react';
import { MatchesManagement } from '@/components/dashboard/MatchesManagement';
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

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: string;
  last_login_at: string | null;
  created_at: string;
}

interface UserStats {
  totalUsers: number;
  newUsersThisMonth: number;
  activeUsersThisWeek: number;
  adminUsers: number;
}

export function Admin() {
  // Data Management States
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
  
  // User Management States
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    totalUsers: 0,
    newUsersThisMonth: 0,
    activeUsersThisWeek: 0,
    adminUsers: 0
  });
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  
  // Tab State
  const [activeTab, setActiveTab] = useState('users');

  // Load data on component mount
  useEffect(() => {
    loadUploadHistory();
    loadUsers();
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

  const loadUsers = async () => {
    console.log('🔍 Chargement des utilisateurs...');
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('📊 Réponse Supabase profiles:', { usersData, usersError });

      if (usersError) {
        console.error('❌ Erreur Supabase profiles:', usersError);
        throw usersError;
      }

      const users = usersData as UserProfile[];
      console.log('👥 Utilisateurs trouvés:', users.length);
      setUsers(users);

      // Si aucun utilisateur dans profiles, vérifions s'il y en a dans auth.users
      if (users.length === 0) {
        console.log('⚠️ Aucun utilisateur dans profiles, vérification de auth.users...');
        // Note: On ne peut pas directement query auth.users via le client, on va créer une migration
      }

      // Calculate stats
      const now = new Date();
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const stats: UserStats = {
        totalUsers: users.length,
        newUsersThisMonth: users.filter(u => new Date(u.created_at) >= oneMonthAgo).length,
        activeUsersThisWeek: users.filter(u => u.last_login_at && new Date(u.last_login_at) >= oneWeekAgo).length,
        adminUsers: users.filter(u => u.role === 'admin').length
      };

      console.log('📈 Statistiques calculées:', stats);
      setUserStats(stats);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des utilisateurs:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les utilisateurs",
        variant: "destructive",
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };

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

  const handleGenerateAIPredictions = async () => {
    setIsProcessing(true);
    try {
      console.log('🤖 Génération des prédictions IA...');
      
      const { data, error } = await supabase.functions.invoke('generate-ai-predictions', {
        body: {
          matchIds: [] // Traiter tous les matchs sans prédiction
        }
      });

      if (error) {
        throw error;
      }

      console.log('✅ Réponse génération IA:', data);

      toast({
        title: "Succès !",
        description: `${data.processed} prédictions IA générées avec succès`,
      });
      
    } catch (error) {
      console.error('❌ Erreur génération IA:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la génération des prédictions IA",
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

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', userId);
      
      if (error) throw error;
      
      toast({
        title: "Succès",
        description: `Rôle utilisateur mis à jour`,
      });
      
      await loadUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le rôle",
        variant: "destructive",
      });
    }
  };

  const updateLastLoginNow = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Dernière connexion mise à jour",
      });

      await loadUsers();
    } catch (error) {
      console.error('Error updating last login:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la dernière connexion",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-brand to-brand-400 bg-clip-text text-transparent mb-2">
          Dashboard Administrateur
        </h1>
        <p className="text-text-weak">
          Gérez les utilisateurs et les données de votre plateforme
        </p>
      </div>

      {/* Admin Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Utilisateurs
          </TabsTrigger>
          <TabsTrigger value="matches" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Matchs
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Données
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          {/* User Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-brand" />
                <div>
                  <p className="text-2xl font-bold">{userStats.totalUsers}</p>
                  <p className="text-xs text-text-weak">Total utilisateurs</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center space-x-2">
                <UserX className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{userStats.newUsersThisMonth}</p>
                  <p className="text-xs text-text-weak">Nouveaux ce mois</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{userStats.activeUsersThisWeek}</p>
                  <p className="text-xs text-text-weak">Actifs cette semaine</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center space-x-2">
                <Crown className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{userStats.adminUsers}</p>
                  <p className="text-xs text-text-weak">Administrateurs</p>
                </div>
              </div>
            </Card>
          </div>

          {/* User Management */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-brand" />
                <h2 className="text-2xl font-semibold">Gestion des utilisateurs</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={loadUsers} disabled={isLoadingUsers}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                  Actualiser
                </Button>
                <Button variant="outline" onClick={updateLastLoginNow} size="sm">
                  <Clock className="h-4 w-4 mr-2" />
                  Test Connexion
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="mb-4">
              <Input
                placeholder="Rechercher par email ou nom..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>

            {/* Users Table */}
            {isLoadingUsers ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-brand" />
                <p className="text-text-weak">Chargement des utilisateurs...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Dernière connexion</TableHead>
                    <TableHead>Inscription</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar_url || ''} />
                              <AvatarFallback>
                                {user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              {user.full_name || 'Nom non défini'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-text-weak">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role === 'admin' ? 'Admin' : 'Utilisateur'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-text-weak">
                          {user.last_login_at 
                            ? format(new Date(user.last_login_at), 'dd/MM/yyyy à HH:mm', { locale: fr })
                            : 'Jamais connecté'
                          }
                        </TableCell>
                        <TableCell className="text-text-weak">
                          {format(new Date(user.created_at), 'dd/MM/yyyy', { locale: fr })}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => updateUserRole(user.user_id, user.role === 'admin' ? 'user' : 'admin')}
                          >
                            {user.role === 'admin' ? 'Rétrograder' : 'Promouvoir'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Matches Management Tab */}
        <TabsContent value="matches" className="space-y-6">
          <MatchesManagement />
        </TabsContent>

        {/* Data Management Tab */}
        <TabsContent value="data" className="space-y-6">
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

                <Button 
                  onClick={handleGenerateAIPredictions}
                  disabled={isProcessing}
                  className="w-full"
                  size="lg"
                  variant="outline"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Génération en cours...
                    </>
                  ) : (
                    <>
                      <Trophy className="h-4 w-4 mr-2" />
                      Générer prédictions IA
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
        </TabsContent>
      </Tabs>
    </div>
  );
}