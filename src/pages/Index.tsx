import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FiltersPanel, FilterState, SortState } from '@/components/FiltersPanel';
import { OddsTable, MatchOdds } from '@/components/OddsTable';
import { TrendingUp, AlertTriangle, Info, LogOut, User, Wifi, WifiOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { OddsService } from '@/services/oddsService';
import { CSVService } from '@/services/csvService';

const Index = () => {
  const { toast } = useToast();
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  // États des filtres
  const [filters, setFilters] = useState<FilterState>({
    competitions: ['Premier League', 'LaLiga', 'Champions League'],
    countries: [],
    timeWindow: 'all',
    bookmakers: [],
    markets: ['1x2', 'btts', 'ou'],
    oddsMin: 1.50,
    oddsMax: 5.00,
    enableHypePlus: false,
    customWhitelist: ''
  });

  const [sort, setSort] = useState<SortState>({
    field: 'time',
    direction: 'asc',
    thresholdPercent: 50
  });

  const [showSaoPauloTime, setShowSaoPauloTime] = useState(true);
  const [showParisTime, setShowParisTime] = useState(true);
  const [matches, setMatches] = useState<MatchOdds[]>([]);
  const [loading, setLoading] = useState(false);
  const [presets, setPresets] = useState<string[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [scrapingStatus, setScrapingStatus] = useState<'idle' | 'scraping' | 'success' | 'error'>('idle');

  // Rediriger vers /auth si pas connecté
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Charger les presets depuis localStorage
  useEffect(() => {
    const savedPresets = localStorage.getItem('hype-odds-presets');
    if (savedPresets) {
      setPresets(JSON.parse(savedPresets));
    }
  }, []);

  // Charger les données initiales automatiquement
  useEffect(() => {
    // Auto-refresh au premier chargement seulement si l'utilisateur est connecté
    if (user) {
      // Appeler la fonction handleRefresh indirectement pour éviter les problèmes de hoisting
      const loadInitialData = async () => {
        setLoading(true);
        setScrapingStatus('scraping');
        
        try {
          // Charger les données depuis le CSV
          const csvMatches = await CSVService.loadMatches();
          
          // Appliquer les filtres
          let filteredMatches = CSVService.filterMatches(csvMatches, {
            competitions: filters.competitions,
            countries: filters.countries,
            timeWindow: filters.timeWindow,
            minOdds: filters.oddsMin,
            maxOdds: filters.oddsMax
          });
          
          // Appliquer le tri
          filteredMatches = OddsService.sortMatches(filteredMatches, sort.field, sort.direction);

          setMatches(filteredMatches);
          setLastUpdate(new Date().toLocaleString('fr-FR'));
          setScrapingStatus('success');
          
          toast({
            title: "Données chargées depuis CSV",
            description: `${filteredMatches.length} matchs trouvés dans les données`,
          });
        } catch (error) {
          console.error('Error loading initial data:', error);
          setScrapingStatus('error');
          toast({
            title: "Erreur de scraping initial",
            description: error instanceof Error ? error.message : "Impossible de charger les données",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      };

      loadInitialData();
    }
  }, [user]); // Dépendance sur user pour s'assurer qu'on ne lance le scraping qu'une fois connecté

  // Afficher un loader pendant la vérification d'auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <TrendingUp className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Ne pas afficher le contenu si pas connecté
  if (!user) {
    return null;
  }

  const handleRefresh = async () => {
    setLoading(true);
    setScrapingStatus('scraping');
    
    try {
      // Charger les données depuis le CSV
      const csvMatches = await CSVService.loadMatches();
      
      // Appliquer les filtres
      let filteredMatches = CSVService.filterMatches(csvMatches, {
        competitions: filters.competitions,
        countries: filters.countries,
        timeWindow: filters.timeWindow,
        minOdds: filters.oddsMin,
        maxOdds: filters.oddsMax
      });
      
      // Appliquer le tri
      filteredMatches = OddsService.sortMatches(filteredMatches, sort.field, sort.direction);

      setMatches(filteredMatches);
      setLastUpdate(new Date().toLocaleString('fr-FR'));
      setScrapingStatus('success');
      
      toast({
        title: "Données mises à jour depuis CSV",
        description: `${filteredMatches.length} matchs trouvés dans les données`,
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      setScrapingStatus('error');
      toast({
        title: "Erreur de scraping",
        description: error instanceof Error ? error.message : "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const csv = OddsService.formatForCSV(matches);
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hype-odds-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export réussi",
      description: "Le fichier CSV a été téléchargé avec les données temps réel",
    });
  };

  const handleCopyTable = async () => {
    const tableData = matches.map(match => 
      `${match.homeTeam.name} vs ${match.awayTeam.name}\t${match.tournament.name}\t${match.bookmakers[0]?.oneX2?.home || '-'}\t${match.bookmakers[0]?.oneX2?.draw || '-'}\t${match.bookmakers[0]?.oneX2?.away || '-'}`
    ).join('\n');

    try {
      await navigator.clipboard.writeText(tableData);
      toast({
        title: "Copié",
        description: "Le tableau a été copié dans le presse-papier",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier dans le presse-papier",
        variant: "destructive",
      });
    }
  };

  const handleSavePreset = (name: string) => {
    const newPresets = [...presets, name];
    setPresets(newPresets);
    localStorage.setItem('hype-odds-presets', JSON.stringify(newPresets));
    localStorage.setItem(`hype-odds-preset-${name}`, JSON.stringify({ filters, sort }));
    
    toast({
      title: "Preset sauvegardé",
      description: `Le preset "${name}" a été créé`,
    });
  };

  const handleLoadPreset = (name: string) => {
    const presetData = localStorage.getItem(`hype-odds-preset-${name}`);
    if (presetData) {
      const { filters: savedFilters, sort: savedSort } = JSON.parse(presetData);
      setFilters(savedFilters);
      setSort(savedSort);
      
      toast({
        title: "Preset chargé",
        description: `Le preset "${name}" a été appliqué`,
      });
    }
  };

  const handleDeletePreset = (name: string) => {
    const newPresets = presets.filter(p => p !== name);
    setPresets(newPresets);
    localStorage.setItem('hype-odds-presets', JSON.stringify(newPresets));
    localStorage.removeItem(`hype-odds-preset-${name}`);
    
    toast({
      title: "Preset supprimé",
      description: `Le preset "${name}" a été supprimé`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header avec auth */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1" />
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Hype Odds
              </h1>
            </div>
            <div className="flex-1 flex justify-end">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={signOut}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </Button>
              </div>
            </div>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Vrais matchs du jour avec cotes réalistes calculées. 
            Données provenant d'APIs officielles pour les compétitions Tier-1.
          </p>
          
          {/* Badges de statut */}
          <div className="flex items-center justify-center gap-4">
            <Badge variant="outline" className="flex items-center gap-2">
              {scrapingStatus === 'scraping' ? (
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              ) : scrapingStatus === 'success' ? (
                <div className="w-2 h-2 bg-success rounded-full"></div>
              ) : scrapingStatus === 'error' ? (
                <div className="w-2 h-2 bg-destructive rounded-full"></div>
              ) : (
                <div className="w-2 h-2 bg-muted rounded-full"></div>
              )}
              {scrapingStatus === 'scraping' ? 'Scraping en cours...' : 
               scrapingStatus === 'success' ? 'Données temps réel' :
               scrapingStatus === 'error' ? 'Erreur de scraping' : 'Prêt à scraper'}
            </Badge>
            <Badge variant="outline">
              {matches.length} matchs disponibles
            </Badge>
            {lastUpdate && (
              <Badge variant="outline" className="text-xs">
                Mis à jour: {lastUpdate}
              </Badge>
            )}
          </div>
        </div>

        {/* Alertes */}
        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Matchs Réels:</strong> Les vrais matchs du jour sont récupérés depuis des APIs officielles. 
              Vous êtes connecté en tant que <strong>{user.email}</strong>.
            </AlertDescription>
          </Alert>
          
          {scrapingStatus === 'error' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Erreur de chargement:</strong> Aucun match trouvé pour aujourd'hui dans les ligues majeures. 
                Les APIs externes peuvent être temporairement indisponibles.
              </AlertDescription>
            </Alert>
          )}
          
          {filters.competitions.length > 10 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Limitation:</strong> Maximum 10 compétitions par requête pour des raisons de performance et respect des TOS.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Interface principale */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Panel des filtres */}
          <div className="lg:col-span-1">
            <FiltersPanel
              filters={filters}
              sort={sort}
              showSaoPauloTime={showSaoPauloTime}
              showParisTime={showParisTime}
              onFiltersChange={setFilters}
              onSortChange={setSort}
              onTimeDisplayChange={setShowSaoPauloTime}
              onRefresh={handleRefresh}
              onExportCSV={handleExportCSV}
              onCopyTable={handleCopyTable}
              onSavePreset={handleSavePreset}
              onLoadPreset={handleLoadPreset}
              onDeletePreset={handleDeletePreset}
              presets={presets}
              loading={loading}
            />
          </div>

          {/* Table des cotes */}
          <div className="lg:col-span-3">
            <OddsTable
              matches={matches}
              showSaoPauloTime={showSaoPauloTime}
              showParisTime={showParisTime}
              loading={loading}
            />
          </div>
        </div>

        {/* Footer */}
        <Card className="p-6 text-center text-muted-foreground">
          <p className="text-sm">
            <strong>Avertissement:</strong> Les paris sportifs présentent des risques. 
            Jouez de manière responsable. Données scrapées à titre informatif uniquement.
          </p>
          <p className="text-xs mt-2">
            APIs officielles • TheSportsDB • Football-Data.org • Cotes calculées selon la force des équipes
          </p>
          {lastUpdate && (
            <p className="text-xs mt-1 text-primary">
              Dernière mise à jour: {lastUpdate} • {matches.length} matchs analysés
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Index;