import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, RefreshCw, Calendar, CheckCircle, XCircle, Clock, TestTube, Download } from 'lucide-react';

export function Test() {
  const [csvUrl, setCsvUrl] = useState('');
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  // URL de test par défaut (utilise le CSV public existant)
  const defaultTestUrl = '/matchss.csv';

  const handleTestSystem = async () => {
    const testUrl = csvUrl.trim() || defaultTestUrl;
    
    setIsProcessing(true);
    setTestResults(null);
    
    try {
      console.log('🧪 Test du système avec:', testUrl);
      
      const { data, error } = await supabase.functions.invoke('process-matches-csv', {
        body: {
          csvUrl: testUrl,
          matchDate,
          filename: `test-${Date.now()}.csv`
        }
      });

      if (error) {
        throw error;
      }

      console.log('✅ Test réussi:', data);
      setTestResults(data);

      toast({
        title: "Test réussi !",
        description: `${data.processedMatches} matchs traités avec succès`,
      });
      
    } catch (error) {
      console.error('❌ Erreur test:', error);
      setTestResults({ error: error.message });
      
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors du test",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTestDatabase = async () => {
    try {
      console.log('🔍 Test de lecture base de données...');
      
      const { data, error } = await supabase
        .from('matches')
        .select('*', { count: 'exact' })
        .limit(5);

      if (error) throw error;

      toast({
        title: "Base de données OK !",
        description: `Connexion réussie. Exemples de matchs récupérés.`,
      });

      console.log('✅ Échantillon de matchs:', data);
      
    } catch (error) {
      console.error('❌ Erreur base de données:', error);
      toast({
        title: "Erreur base de données",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const downloadSampleCSV = () => {
    const sampleCSV = `league,home_team,away_team,country,kickoff_utc,kickoff_sao_paulo,p_home_fair,p_draw_fair,p_away_fair,p_btts_yes_fair,p_btts_no_fair,p_over_2_5_fair,p_under_2_5_fair,vig_1x2,vig_btts,vig_ou_2_5,is_low_vig_1x2,watch_btts,watch_over25,odds_1x2_home,odds_1x2_draw,odds_1x2_away,odds_btts_yes,odds_btts_no,odds_over_2_5,odds_under_2_5
Copa Libertadores,Palmeiras,Boca Juniors,BR,2024-08-14T22:00:00Z,2024-08-14T19:00:00-03:00,0.45,0.28,0.27,0.52,0.48,0.55,0.45,0.08,0.04,0.06,True,False,False,2.20,3.60,3.70,1.92,1.88,1.82,1.98
Premier League,Arsenal,Chelsea,GB,2024-08-14T16:30:00Z,2024-08-14T17:30:00+01:00,0.48,0.26,0.26,0.58,0.42,0.62,0.38,0.07,0.05,0.05,True,True,True,2.08,3.85,3.85,1.72,2.10,1.61,2.40`;

    const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample-matches.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-brand to-brand-400 bg-clip-text text-transparent mb-2">
          🧪 Test du Système
        </h1>
        <p className="text-text-weak">
          Testez le traitement automatique des CSV et la base de données
        </p>
      </div>

      {/* Navigation rapide */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 justify-center">
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            🏠 Accueil
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/admin'}>
            ⚙️ Admin
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
            📊 Dashboard
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/archives'}>
            📁 Archives
          </Button>
        </div>
      </Card>

      {/* Tests système */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test traitement CSV */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <TestTube className="h-6 w-6 text-brand" />
            <h2 className="text-2xl font-semibold">Test Traitement CSV</h2>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="testCsvUrl">URL du CSV (optionnel)</Label>
              <Input
                id="testCsvUrl"
                type="url"
                placeholder="Laissez vide pour utiliser le CSV de test"
                value={csvUrl}
                onChange={(e) => setCsvUrl(e.target.value)}
                disabled={isProcessing}
              />
              <p className="text-xs text-text-weak mt-1">
                Laissez vide pour utiliser le fichier de test local
              </p>
            </div>

            <div>
              <Label htmlFor="testMatchDate">Date des matchs</Label>
              <Input
                id="testMatchDate"
                type="date"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                disabled={isProcessing}
              />
            </div>

            <Button 
              onClick={handleTestSystem}
              disabled={isProcessing}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Test en cours...
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4 mr-2" />
                  Tester le Traitement CSV
                </>
              )}
            </Button>

            {testResults && (
              <div className="mt-4 p-4 bg-surface-soft rounded-lg border">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  {testResults.error ? (
                    <XCircle className="h-4 w-4 text-red-600" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                  Résultats du test
                </h3>
                
                {testResults.error ? (
                  <div className="text-red-600 text-sm">
                    <strong>Erreur:</strong> {testResults.error}
                  </div>
                ) : (
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span>Lignes totales:</span>
                      <Badge variant="outline">{testResults.totalRows}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Matchs traités:</span>
                      <Badge variant="default">{testResults.processedMatches}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Erreurs:</span>
                      <Badge variant={testResults.errors > 0 ? "destructive" : "outline"}>
                        {testResults.errors || 0}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Date:</span>
                      <span className="text-text-weak">{testResults.uploadDate}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Test base de données */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="h-6 w-6 text-brand" />
            <h2 className="text-2xl font-semibold">Test Base de Données</h2>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-surface-soft rounded-lg">
              <h3 className="font-semibold mb-2">ℹ️ Tests disponibles</h3>
              <ul className="text-sm text-text-weak space-y-1">
                <li>• Connexion à Supabase</li>
                <li>• Lecture des matchs</li>
                <li>• Structure des tables</li>
                <li>• Permissions RLS</li>
              </ul>
            </div>

            <Button 
              onClick={handleTestDatabase}
              className="w-full"
              size="lg"
              variant="outline"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Tester la Base de Données
            </Button>

            <Button 
              onClick={downloadSampleCSV}
              className="w-full"
              size="lg"
              variant="secondary"
            >
              <Download className="h-4 w-4 mr-2" />
              Télécharger CSV d'exemple
            </Button>
          </div>
        </Card>
      </div>

      {/* Informations système */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">🔧 Informations Système</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <h4 className="font-medium mb-2">Edge Functions</h4>
            <ul className="space-y-1 text-text-weak">
              <li>• process-matches-csv</li>
              <li>• daily-csv-processor</li>
              <li>• scrape-odds</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Tables Supabase</h4>
            <ul className="space-y-1 text-text-weak">
              <li>• matches (matchs principaux)</li>
              <li>• match_uploads (historique)</li>
              <li>• RLS activé</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Format CSV requis</h4>
            <ul className="space-y-1 text-text-weak">
              <li>• home_team, away_team, league</li>
              <li>• odds_1x2_home/draw/away</li>
              <li>• probabilities, vigorish</li>
              <li>• country (optionnel)</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}