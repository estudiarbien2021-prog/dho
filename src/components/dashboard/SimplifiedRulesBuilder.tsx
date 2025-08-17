import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, Save, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  ConditionalRule, 
  Condition, 
  Market, 
  ConditionType, 
  ActionType, 
  LogicalConnector,
  Operator,
  CONDITION_OPTIONS,
  ACTION_OPTIONS,
  CONDITION_LABELS,
  ACTION_LABELS,
  OPERATOR_LABELS,
  MARKET_LABELS
} from '@/types/conditionalRules';
import { conditionalRulesService } from '@/services/conditionalRulesService';

export default function SimplifiedRulesBuilder() {
  const [rules, setRules] = useState<ConditionalRule[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<Market>('1x2');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setIsLoading(true);
      const allRules = await conditionalRulesService.getRules();
      setRules(allRules);
    } catch (error) {
      console.error('Error loading rules:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les règles",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createNewRule = (): ConditionalRule => ({
    id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: `Nouvelle règle ${selectedMarket.toUpperCase()}`,
    market: selectedMarket,
    conditions: [{
      id: `cond-${Date.now()}`,
      type: CONDITION_OPTIONS[selectedMarket][0],
      operator: '>',
      value: 0
    }],
    logicalConnectors: [],
    action: ACTION_OPTIONS[selectedMarket][0],
    priority: Math.max(...rules.map(r => r.priority), 0) + 1,
    enabled: true
  });

  const addRule = () => {
    const newRule = createNewRule();
    setRules([...rules, newRule]);
  };

  const updateRule = (ruleId: string, updates: Partial<ConditionalRule>) => {
    setRules(rules.map(rule => 
      rule.id === ruleId ? { ...rule, ...updates } : rule
    ));
  };

  const deleteRule = async (ruleId: string) => {
    try {
      const success = await conditionalRulesService.deleteRule(ruleId);
      if (success) {
        setRules(rules.filter(rule => rule.id !== ruleId));
        toast({
          title: "Succès",
          description: "Règle supprimée",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la règle",
        variant: "destructive"
      });
    }
  };

  const addCondition = (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;

    const newCondition: Condition = {
      id: `cond-${Date.now()}`,
      type: CONDITION_OPTIONS[rule.market][0],
      operator: '>',
      value: 0
    };

    const updatedConditions = [...rule.conditions, newCondition];
    const updatedConnectors = [...rule.logicalConnectors, 'AND' as LogicalConnector];

    updateRule(ruleId, {
      conditions: updatedConditions,
      logicalConnectors: updatedConnectors
    });
  };

  const updateCondition = (ruleId: string, conditionId: string, updates: Partial<Condition>) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;

    const updatedConditions = rule.conditions.map(condition =>
      condition.id === conditionId ? { ...condition, ...updates } : condition
    );

    updateRule(ruleId, { conditions: updatedConditions });
  };

  const removeCondition = (ruleId: string, conditionId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule || rule.conditions.length <= 1) return;

    const conditionIndex = rule.conditions.findIndex(c => c.id === conditionId);
    const updatedConditions = rule.conditions.filter(c => c.id !== conditionId);
    
    // Adjust logical connectors
    let updatedConnectors = [...rule.logicalConnectors];
    if (conditionIndex === 0 && updatedConnectors.length > 0) {
      updatedConnectors = updatedConnectors.slice(1);
    } else if (conditionIndex < updatedConnectors.length) {
      updatedConnectors = updatedConnectors.filter((_, i) => i !== conditionIndex - 1);
    }

    updateRule(ruleId, {
      conditions: updatedConditions,
      logicalConnectors: updatedConnectors
    });
  };

  const updateLogicalConnector = (ruleId: string, index: number, connector: LogicalConnector) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;

    const updatedConnectors = [...rule.logicalConnectors];
    updatedConnectors[index] = connector;

    updateRule(ruleId, { logicalConnectors: updatedConnectors });
  };

  const saveAllRules = async () => {
    try {
      setIsSaving(true);
      let successCount = 0;

      for (const rule of rules.filter(r => r.market === selectedMarket)) {
        const success = await conditionalRulesService.saveRule(rule);
        if (success) successCount++;
      }

      toast({
        title: "Succès",
        description: `${successCount} règle(s) sauvegardée(s)`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la sauvegarde",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const marketRules = rules.filter(rule => rule.market === selectedMarket);

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Chargement des règles...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Règles IA Simplifiées</h2>
          <p className="text-muted-foreground">
            Configurez les règles conditionnelles "Si...Alors" pour chaque marché
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadRules} variant="outline" size="sm">
            <RotateCcw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button onClick={saveAllRules} disabled={isSaving} size="sm">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </div>

      {/* Market Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Sélection du marché</CardTitle>
          <CardDescription>
            Choisissez le marché pour lequel configurer les règles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedMarket} onValueChange={(value: Market) => setSelectedMarket(value)}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(MARKET_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Rules for Selected Market */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Règles pour {MARKET_LABELS[selectedMarket]} ({marketRules.length})
          </h3>
          <Button onClick={addRule} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une règle
          </Button>
        </div>

        {marketRules.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Aucune règle configurée pour ce marché. Cliquez sur "Ajouter une règle" pour commencer.
              </p>
            </CardContent>
          </Card>
        ) : (
          marketRules
            .sort((a, b) => a.priority - b.priority)
            .map((rule) => (
              <RuleEditor
                key={rule.id}
                rule={rule}
                onUpdate={(updates) => updateRule(rule.id, updates)}
                onDelete={() => deleteRule(rule.id)}
                onAddCondition={() => addCondition(rule.id)}
                onUpdateCondition={updateCondition}
                onRemoveCondition={removeCondition}
                onUpdateLogicalConnector={updateLogicalConnector}
              />
            ))
        )}
      </div>
    </div>
  );
}

interface RuleEditorProps {
  rule: ConditionalRule;
  onUpdate: (updates: Partial<ConditionalRule>) => void;
  onDelete: () => void;
  onAddCondition: () => void;
  onUpdateCondition: (ruleId: string, conditionId: string, updates: Partial<Condition>) => void;
  onRemoveCondition: (ruleId: string, conditionId: string) => void;
  onUpdateLogicalConnector: (ruleId: string, index: number, connector: LogicalConnector) => void;
}

function RuleEditor({
  rule,
  onUpdate,
  onDelete,
  onAddCondition,
  onUpdateCondition,
  onRemoveCondition,
  onUpdateLogicalConnector
}: RuleEditorProps) {
  return (
    <Card className={`border-l-4 ${rule.enabled ? 'border-l-green-500' : 'border-l-gray-300'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Input
              value={rule.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="font-semibold"
            />
            <div className="flex items-center gap-2">
              <Label htmlFor={`enabled-${rule.id}`}>Activée</Label>
              <Switch
                id={`enabled-${rule.id}`}
                checked={rule.enabled}
                onCheckedChange={(enabled) => onUpdate({ enabled })}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label>Priorité</Label>
            <Input
              type="number"
              value={rule.priority}
              onChange={(e) => onUpdate({ priority: parseInt(e.target.value) || 1 })}
              className="w-20"
              min="1"
            />
            <Button variant="destructive" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Conditions */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">SI</Label>
          {rule.conditions.map((condition, index) => (
            <div key={condition.id}>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Select
                  value={condition.type}
                  onValueChange={(value: ConditionType) => 
                    onUpdateCondition(rule.id, condition.id, { type: value })
                  }
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITION_OPTIONS[rule.market].map(conditionType => (
                      <SelectItem key={conditionType} value={conditionType}>
                        {CONDITION_LABELS[conditionType]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={condition.operator}
                  onValueChange={(value: Operator) => 
                    onUpdateCondition(rule.id, condition.id, { operator: value })
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(OPERATOR_LABELS).map(([op, label]) => (
                      <SelectItem key={op} value={op}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  value={condition.value}
                  onChange={(e) => 
                    onUpdateCondition(rule.id, condition.id, { value: parseFloat(e.target.value) || 0 })
                  }
                  className="w-24"
                  step="0.1"
                />

                {condition.operator === 'between' && (
                  <>
                    <span className="text-sm text-muted-foreground">et</span>
                    <Input
                      type="number"
                      value={condition.valueMax || 0}
                      onChange={(e) => 
                        onUpdateCondition(rule.id, condition.id, { valueMax: parseFloat(e.target.value) || 0 })
                      }
                      className="w-24"
                      step="0.1"
                    />
                  </>
                )}

                {rule.conditions.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveCondition(rule.id, condition.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Logical Connector */}
              {index < rule.conditions.length - 1 && (
                <div className="flex justify-center my-2">
                  <Select
                    value={rule.logicalConnectors[index]}
                    onValueChange={(value: LogicalConnector) => 
                      onUpdateLogicalConnector(rule.id, index, value)
                    }
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">ET</SelectItem>
                      <SelectItem value="OR">OU</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={onAddCondition}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une condition
          </Button>
        </div>

        {/* Action */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">ALORS</Label>
          <Select
            value={rule.action}
            onValueChange={(value: ActionType) => onUpdate({ action: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS[rule.market].map(action => (
                <SelectItem key={action} value={action}>
                  {ACTION_LABELS[action]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}