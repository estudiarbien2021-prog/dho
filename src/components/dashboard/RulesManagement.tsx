import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Save, RotateCcw, History, Download, Upload } from 'lucide-react';

interface Rule {
  id: string;
  rule_name: string;
  value: number;
  type: string;
  description: string;
  category: string;
  updated_at: string;
}

interface RulesByCategory {
  market_ou: Rule[];
  market_btts: Rule[];
  market_1x2: Rule[];
  market_general: Rule[];
  priority_rules: Rule[];
  exclusions: Rule[];
}

interface RuleConfiguration {
  id: string;
  name: string;
  description: string | null;
  configuration: any; // JSON type from Supabase
  created_at: string;
  created_by: string | null;
  is_active: boolean;
}

export function RulesManagement() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [originalRules, setOriginalRules] = useState<Rule[]>([]);
  const [configurations, setConfigurations] = useState<RuleConfiguration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [configName, setConfigName] = useState('');
  const [configDescription, setConfigDescription] = useState('');
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');

  useEffect(() => {
    loadRules();
    loadConfigurations();
  }, []);

  useEffect(() => {
    const hasRuleChanges = rules.some((rule, index) => {
      const original = originalRules[index];
      return original && rule.value !== original.value;
    });
    setHasChanges(hasRuleChanges);
  }, [rules, originalRules]);

  const loadRules = async () => {
    try {
      const { data, error } = await supabase
        .from('recommendation_rules')
        .select('*')
        .order('category', { ascending: true })
        .order('rule_name', { ascending: true });

      if (error) throw error;

      setRules(data || []);
      setOriginalRules(data || []);
    } catch (error) {
      console.error('Error loading rules:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les règles",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateRuleValue = (ruleId: string, newValue: number) => {
    setRules(rules.map(rule => 
      rule.id === ruleId ? { ...rule, value: newValue } : rule
    ));
  };

  const saveRules = async () => {
    setIsSaving(true);
    try {
      const changedRules = rules.filter((rule, index) => {
        const original = originalRules[index];
        return original && rule.value !== original.value;
      });

      if (changedRules.length === 0) {
        toast({
          title: "Information",
          description: "Aucune modification à sauvegarder",
        });
        return;
      }

      for (const rule of changedRules) {
        const { error } = await supabase
          .from('recommendation_rules')
          .update({ value: rule.value })
          .eq('id', rule.id);

        if (error) throw error;
      }

      toast({
        title: "Succès !",
        description: `${changedRules.length} règle(s) mise(s) à jour`,
      });

      setOriginalRules([...rules]);
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving rules:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les règles",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const loadConfigurations = async () => {
    try {
      const { data, error } = await supabase
        .from('rule_configurations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConfigurations(data || []);
    } catch (error) {
      console.error('Error loading configurations:', error);
    }
  };

  const saveConfiguration = async () => {
    if (!configName.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un nom pour la configuration",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      
      // Create configuration object from current rules
      const configuration = rules.reduce((acc, rule) => {
        acc[rule.rule_name] = rule.value;
        return acc;
      }, {} as Record<string, number>);

      const { error } = await supabase
        .from('rule_configurations')
        .insert({
          name: configName,
          description: configDescription || null,
          configuration,
        });

      if (error) throw error;

      toast({
        title: "Succès !",
        description: "Configuration sauvegardée avec succès",
      });

      setShowSaveDialog(false);
      setConfigName('');
      setConfigDescription('');
      loadConfigurations();
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la configuration",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const loadConfiguration = async (configId: string) => {
    try {
      const config = configurations.find(c => c.id === configId);
      if (!config) return;

      // Update rules with configuration values
      const updatedRules = rules.map(rule => ({
        ...rule,
        value: config.configuration[rule.rule_name] ?? rule.value
      }));

      setRules(updatedRules);
      setSelectedConfigId('');
      
      toast({
        title: "Configuration chargée",
        description: `Configuration "${config.name}" appliquée avec succès`,
      });
    } catch (error) {
      console.error('Error loading configuration:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la configuration",
        variant: "destructive",
      });
    }
  };

  const resetRules = () => {
    setRules([...originalRules]);
    setHasChanges(false);
  };

  const generateConfigName = () => {
    const now = new Date();
    const date = now.toLocaleDateString('fr-FR');
    const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `Configuration ${date} ${time}`;
  };

  const groupedRules: RulesByCategory = {
    market_ou: rules.filter(r => 
      (r.category === 'global_thresholds' || r.category === 'fallbacks_ou') && r.rule_name.startsWith('ou_')
    ),
    market_btts: rules.filter(r => 
      (r.category === 'global_thresholds' || r.category === 'fallbacks_btts') && r.rule_name.startsWith('btts_')
    ),
    market_1x2: rules.filter(r => 
      (r.category === 'global_thresholds' || r.category === 'fallbacks_1x2') && r.rule_name.startsWith('1x2_')
    ),
    market_general: rules.filter(r => 
      (r.category === 'global_thresholds' && !r.rule_name.startsWith('ou_') && !r.rule_name.startsWith('btts_') && !r.rule_name.startsWith('1x2_')) ||
      r.category === 'fallbacks_general' || 
      r.category === 'fallbacks'
    ),
    priority_rules: rules.filter(r => r.category === 'priority_rules'),
    exclusions: rules.filter(r => r.category === 'exclusions'),
  };

  const renderRuleControl = (rule: Rule) => {
    // Règles de priorité : switch + input numérique de 1 à 5
    if (rule.category === 'priority_rules') {
      // Pour les règles de priorité, on utilise un système où la valeur indique l'état :
      // 0 = désactivé, 1-5 = activé avec priorité
      const isEnabled = rule.value > 0;
      const priorityValue = rule.value > 0 ? rule.value : 1;
      
      return (
        <div className="flex items-center gap-3">
          <Switch
            checked={isEnabled}
            onCheckedChange={(checked) => {
              if (checked) {
                updateRuleValue(rule.id, priorityValue);
              } else {
                updateRuleValue(rule.id, 0);
              }
            }}
          />
          {isEnabled && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={priorityValue}
                onChange={(e) => updateRuleValue(rule.id, Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
                min={1}
                max={5}
                className="w-16 text-center"
              />
              <span className="text-sm text-text-weak">priorité</span>
            </div>
          )}
        </div>
      );
    }

    if (rule.type === 'boolean') {
      return (
        <div className="flex items-center justify-center">
          <Switch
            checked={rule.value === 1}
            onCheckedChange={(checked) => updateRuleValue(rule.id, checked ? 1 : 0)}
          />
        </div>
      );
    }

    if (rule.type === 'percentage') {
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={rule.value}
            onChange={(e) => updateRuleValue(rule.id, parseFloat(e.target.value) || 0)}
            step={0.1}
            min={0}
            max={100}
            className="w-20 text-center"
          />
          <span className="text-sm text-text-weak">%</span>
        </div>
      );
    }

    return (
      <Input
        type="number"
        value={rule.value}
        onChange={(e) => updateRuleValue(rule.id, parseFloat(e.target.value) || 0)}
        step={rule.rule_name.includes('odds') ? 0.1 : 1}
        min={0}
        className="w-24 text-center"
      />
    );
  };

  const categoryTitles = {
    market_ou: "Marché Over/Under 2.5",
    market_btts: "Marché BTTS (Both Teams To Score)",
    market_1x2: "Marché 1X2 (Résultat du Match)",
    market_general: "Paramètres Généraux",
    priority_rules: "Règles de Priorité",
    exclusions: "Exclusions"
  };

  const categoryDescriptions = {
    market_ou: "Seuils et comportements spécifiques au marché Over/Under 2.5 buts",
    market_btts: "Seuils et comportements spécifiques au marché Both Teams To Score",
    market_1x2: "Seuils et comportements spécifiques au marché 1X2 (résultat du match)",
    market_general: "Seuils généraux et comportements par défaut pour tous les marchés",
    priority_rules: "Activation/désactivation des règles prioritaires et leurs paramètres",
    exclusions: "Paramètres d'exclusion pour filtrer les recommandations"
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-xl font-bold">Configuration des Règles IA</h2>
            <p className="text-sm text-text-weak">
              Gérez les paramètres des algorithmes de recommandation
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={selectedConfigId} onValueChange={setSelectedConfigId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Charger une configuration..." />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50">
              {configurations.map((config) => (
                <SelectItem key={config.id} value={config.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{config.name}</span>
                    <span className="text-xs text-text-weak">
                      {new Date(config.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedConfigId && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => loadConfiguration(selectedConfigId)}
            >
              <Download className="h-4 w-4 mr-2" />
              Charger
            </Button>
          )}

          <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => setConfigName(generateConfigName())}>
                <History className="h-4 w-4 mr-2" />
                Sauvegarder
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-background border shadow-lg">
              <DialogHeader>
                <DialogTitle>Sauvegarder la configuration</DialogTitle>
                <DialogDescription>
                  Donnez un nom à cette configuration pour pouvoir la réutiliser plus tard.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="config-name">Nom de la configuration</Label>
                  <Input
                    id="config-name"
                    value={configName}
                    onChange={(e) => setConfigName(e.target.value)}
                    placeholder="Configuration du 16/08/2025 14:30"
                  />
                </div>
                <div>
                  <Label htmlFor="config-description">Description (optionnel)</Label>
                  <Textarea
                    id="config-description"
                    value={configDescription}
                    onChange={(e) => setConfigDescription(e.target.value)}
                    placeholder="Description des modifications apportées..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                  Annuler
                </Button>
                <Button onClick={saveConfiguration} disabled={isSaving}>
                  <Upload className="h-4 w-4 mr-2" />
                  {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {hasChanges && (
            <Button variant="outline" size="sm" onClick={resetRules}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Annuler
            </Button>
          )}
          <Button 
            onClick={saveRules} 
            disabled={!hasChanges || isSaving}
            size="sm"
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </div>

      {hasChanges && (
        <div className="bg-warning/10 border border-warning rounded-lg p-3">
          <p className="text-sm text-warning-foreground">
            ⚠️ Vous avez des modifications non sauvegardées. N'oubliez pas de cliquer sur "Sauvegarder".
          </p>
        </div>
      )}

      {/* Rules Categories */}
      {Object.entries(groupedRules)
        .filter(([_, categoryRules]) => categoryRules.length > 0)
        .map(([category, categoryRules]) => (
        <Card key={category}>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              {categoryTitles[category as keyof typeof categoryTitles]}
              <Badge variant="outline" className="text-xs">{categoryRules.length}</Badge>
            </CardTitle>
            <CardDescription className="text-sm">
              {categoryDescriptions[category as keyof typeof categoryDescriptions]}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {categoryRules.map((rule, index) => (
                <div key={rule.id}>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex-1 pr-4">
                      <Label className="text-sm font-medium leading-tight">{rule.description}</Label>
                      <p className="text-xs text-text-weak mt-0.5">
                        {rule.rule_name}
                      </p>
                    </div>
                    <div className="flex items-center">
                      {renderRuleControl(rule)}
                    </div>
                  </div>
                  {index < categoryRules.length - 1 && <Separator className="my-1" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}