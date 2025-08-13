import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FiltersPanel, FilterState, SortState } from '@/components/FiltersPanel';
import { OddsTable, MatchOdds } from '@/components/OddsTable';
import { TrendingUp, AlertTriangle, Info, LogOut, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

// Mock data pour la démonstration
const MOCK_MATCHES: MatchOdds[] = [
  {
    id: "match-1",
    startTimestamp: Math.floor(Date.now() / 1000) + 3600, // Dans 1h
    tournament: { name: "Premier League", country: "Angleterre" },
    homeTeam: { name: "Manchester City" },
    awayTeam: { name: "Liverpool" },
    bookmakers: [
      {
        name: "Bet365",
        oneX2: { home: 2.10, draw: 3.40, away: 3.20 },
        btts: { yes: 1.85, no: 1.95 },
        ou: {
          "1.5": { over: 1.25, under: 3.80 },
          "2.5": { over: 1.80, under: 2.05 },
          "3.5": { over: 2.90, under: 1.42 }
        },
        ahMain: { line: -0.5, home: 1.85, away: 1.95 }
      }
    ]
  },
  {
    id: "match-2",
    startTimestamp: Math.floor(Date.now() / 1000) + 7200, // Dans 2h
    tournament: { name: "LaLiga", country: "Espagne" },
    homeTeam: { name: "Real Madrid" },
    awayTeam: { name: "Barcelona" },
    bookmakers: [
      {
        name: "Unibet",
        oneX2: { home: 2.25, draw: 3.10, away: 3.50 },
        btts: { yes: 1.90, no: 1.90 },
        ou: {
          "2.5": { over: 1.95, under: 1.85 },
          "3.5": { over: 3.20, under: 1.35 }
        },
        ahMain: { line: -0.25, home: 1.90, away: 1.90 }
      }
    ]
  },
  {
    id: "match-3",
    startTimestamp: Math.floor(Date.now() / 1000) + 10800, // Dans 3h
    tournament: { name: "Brasileirão Série A", country: "Brésil" },
    homeTeam: { name: "Flamengo" },
    awayTeam: { name: "Palmeiras" },
    bookmakers: [
      {
        name: "Betfair",
        oneX2: { home: 2.80, draw: 3.00, away: 2.60 },
        btts: { yes: 2.10, no: 1.75 },
        ou: {
          "2.5": { over: 2.25, under: 1.65 }
        },
        ahMain: { line: 0, home: 1.95, away: 1.85 }
      }
    ]
  }
];

const Index = () => {
  const { toast } = useToast();
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  // Rediriger vers /auth si pas connecté
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

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

  // Charger les presets depuis localStorage
  useEffect(() => {
    const savedPresets = localStorage.getItem('hype-odds-presets');
    if (savedPresets) {
      setPresets(JSON.parse(savedPresets));
    }
  }, []);

  // Appliquer les filtres
  const applyFilters = (rawMatches: MatchOdds[]) => {
    return rawMatches.filter(match => {
      // Filtre par compétition
      if (filters.competitions.length > 0) {
        const matchCompetition = filters.competitions.some(comp => 
          match.tournament.name.toLowerCase().includes(comp.toLowerCase())
        );
        if (!matchCompetition) return false;
      }

      // Filtre par fenêtre horaire
      if (filters.timeWindow !== 'all') {
        const now = Math.floor(Date.now() / 1000);
        const hoursLimit = filters.timeWindow === '6h' ? 6 : 12;
        const timeLimit = now + (hoursLimit * 3600);
        if (match.startTimestamp > timeLimit) return false;
      }

      return true;
    });
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      // Simulation d'appel API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const filteredMatches = applyFilters(MOCK_MATCHES);
      setMatches(filteredMatches);
      
      toast({
        title: "Données mises à jour",
        description: `${filteredMatches.length} matchs chargés`,
      });
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

  const handleExportCSV = () => {
    const csvData = matches.map(match => ({
      Heure_SP: new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit'
      }).format(new Date(match.startTimestamp * 1000)),
      Heure_Paris: new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'Europe/Paris',
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit'
      }).format(new Date(match.startTimestamp * 1000)),
      Competition: match.tournament.name,
      Match: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
      Home: match.bookmakers[0]?.oneX2?.home || '',
      Draw: match.bookmakers[0]?.oneX2?.draw || '',
      Away: match.bookmakers[0]?.oneX2?.away || '',
      BTTS_Yes: match.bookmakers[0]?.btts?.yes || '',
      BTTS_No: match.bookmakers[0]?.btts?.no || '',
    }));

    const csv = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hype-odds-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export réussi",
      description: "Le fichier CSV a été téléchargé",
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

  // Charger les données initiales
  useEffect(() => {
    handleRefresh();
  }, []);

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
            Analysez les cotes des matchs les plus médiatisés en temps réel. 
            Données scrapées depuis OddsPedia pour les compétitions Tier-1.
          </p>
          
          {/* Badges de statut */}
          <div className="flex items-center justify-center gap-4">
            <Badge variant="outline" className="flex items-center gap-2">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
              Données en temps réel
            </Badge>
            <Badge variant="outline">
              {matches.length} matchs disponibles
            </Badge>
          </div>
        </div>

        {/* Alertes */}
        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Mode Démonstration:</strong> Cette version utilise des données factices. 
              Le scraping OddsPedia sera implémenté dans la version finale avec respect des TOS.
              Vous êtes connecté en tant que <strong>{user.email}</strong>.
            </AlertDescription>
          </Alert>
          
          {filters.competitions.length > 10 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Limitation:</strong> Maximum 10 compétitions par requête pour des raisons de performance.
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
            Jouez de manière responsable. Données à titre informatif uniquement.
          </p>
          <p className="text-xs mt-2">
            Respect des TOS OddsPedia • Throttling automatique • Données mises à jour manuellement
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Index;