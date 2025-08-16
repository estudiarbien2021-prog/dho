import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Save, RotateCcw } from 'lucide-react';

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
  global_thresholds: Rule[];
  priority_rules: Rule[];
  exclusions: Rule[];
  fallbacks: Rule[];
}

export function RulesManagement() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [originalRules, setOriginalRules] = useState<Rule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadRules();
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

  const resetRules = () => {
    setRules([...originalRules]);
    setHasChanges(false);
  };

  const groupedRules: RulesByCategory = {
    global_thresholds: rules.filter(r => r.category === 'global_thresholds'),
    priority_rules: rules.filter(r => r.category === 'priority_rules'),
    exclusions: rules.filter(r => r.category === 'exclusions'),
    fallbacks: rules.filter(r => r.category === 'fallbacks'),
  };

  const renderRuleControl = (rule: Rule) => {
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
        <div className="w-48 space-y-1">
          <div className="flex items-center space-x-3">
            <Slider
              value={[rule.value]}
              onValueChange={([value]) => updateRuleValue(rule.id, value)}
              max={100}
              min={0}
              step={0.1}
              className="flex-1"
            />
            <div className="text-sm font-medium text-primary w-12 text-right">
              {rule.value}%
            </div>
          </div>
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
        className="w-32 text-center"
      />
    );
  };

  const categoryTitles = {
    global_thresholds: "Seuils Globaux",
    priority_rules: "Règles de Priorité",
    exclusions: "Exclusions",
    fallbacks: "Paramètres de Fallback"
  };

  const categoryDescriptions = {
    global_thresholds: "Seuils numériques utilisés dans toutes les règles de recommandation",
    priority_rules: "Activation/désactivation des règles prioritaires et leurs paramètres",
    exclusions: "Paramètres d'exclusion pour filtrer les recommandations",
    fallbacks: "Comportements par défaut quand aucune règle prioritaire ne s'applique"
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
      {Object.entries(groupedRules).map(([category, categoryRules]) => (
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