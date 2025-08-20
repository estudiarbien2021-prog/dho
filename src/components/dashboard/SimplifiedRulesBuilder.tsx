import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Save, RotateCcw, Check, X, Edit, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  ConditionalRule, 
  Condition, 
  ConditionGroup,
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
  MARKET_LABELS,
  isCondition,
  isConditionGroup
} from '@/types/conditionalRules';
import { conditionalRulesService } from '@/services/conditionalRulesService';
import { ConditionRenderer } from './ConditionRenderer';

export default function SimplifiedRulesBuilder() {
  const [rules, setRules] = useState<ConditionalRule[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<Market>('1x2');
  const [isLoading, setIsLoading] = useState(true);
  const [editingRules, setEditingRules] = useState<Set<string>>(new Set());
  const [originalRules, setOriginalRules] = useState<Map<string, ConditionalRule>>(new Map());
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
    id: crypto.randomUUID(),
    name: `Nouvelle règle ${selectedMarket.toUpperCase()}`,
    market: selectedMarket,
    conditions: [{
      id: crypto.randomUUID(),
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
    // New rules start in editing mode
    setEditingRules(prev => new Set([...prev, newRule.id]));
    setOriginalRules(prev => new Map([...prev, [newRule.id, { ...newRule }]]));
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
        setEditingRules(prev => {
          const newSet = new Set(prev);
          newSet.delete(ruleId);
          return newSet;
        });
        setOriginalRules(prev => {
          const newMap = new Map(prev);
          newMap.delete(ruleId);
          return newMap;
        });
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
      id: crypto.randomUUID(),
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

  const addConditionGroup = (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;

    const newGroup: ConditionGroup = {
      id: crypto.randomUUID(),
      type: 'group',
      conditions: [{
        id: crypto.randomUUID(),
        type: CONDITION_OPTIONS[rule.market][0],
        operator: '>',
        value: 0
      }],
      logicalConnectors: []
    };

    const updatedConditions = [...rule.conditions, newGroup];
    const updatedConnectors = [...rule.logicalConnectors, 'AND' as LogicalConnector];

    updateRule(ruleId, {
      conditions: updatedConditions,
      logicalConnectors: updatedConnectors
    });
  };

  const updateCondition = (ruleId: string, conditionId: string, updates: Partial<Condition>) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;

    const updatedConditions = updateConditionInList(rule.conditions, conditionId, updates);
    updateRule(ruleId, { conditions: updatedConditions });
  };

  const updateConditionInList = (
    conditions: (Condition | ConditionGroup)[], 
    conditionId: string, 
    updates: Partial<Condition>
  ): (Condition | ConditionGroup)[] => {
    return conditions.map(condition => {
      if (isCondition(condition) && condition.id === conditionId) {
        return { ...condition, ...updates };
      } else if (isConditionGroup(condition)) {
        return {
          ...condition,
          conditions: updateConditionInList(condition.conditions, conditionId, updates)
        };
      }
      return condition;
    });
  };

  const removeCondition = (ruleId: string, conditionId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule || getTotalConditionsCount(rule.conditions) <= 1) return;

    const { conditions: updatedConditions, connectors: updatedConnectors } = removeConditionFromList(
      rule.conditions, 
      rule.logicalConnectors, 
      conditionId
    );

    updateRule(ruleId, {
      conditions: updatedConditions,
      logicalConnectors: updatedConnectors
    });
  };

  const removeConditionFromList = (
    conditions: (Condition | ConditionGroup)[],
    connectors: LogicalConnector[],
    conditionId: string
  ): { conditions: (Condition | ConditionGroup)[], connectors: LogicalConnector[] } => {
    const conditionIndex = conditions.findIndex(c => 
      (isCondition(c) && c.id === conditionId) || 
      (isConditionGroup(c) && hasConditionInGroup(c, conditionId))
    );
    
    if (conditionIndex === -1) {
      // Try to remove from nested groups
      const updatedConditions = conditions.map(condition => {
        if (isConditionGroup(condition)) {
          const { conditions: nestedConditions, connectors: nestedConnectors } = removeConditionFromList(
            condition.conditions,
            condition.logicalConnectors,
            conditionId
          );
          return { ...condition, conditions: nestedConditions, logicalConnectors: nestedConnectors };
        }
        return condition;
      });
      return { conditions: updatedConditions, connectors };
    }

    const updatedConditions = conditions.filter((_, i) => i !== conditionIndex);
    
    // Adjust logical connectors
    let updatedConnectors = [...connectors];
    if (conditionIndex === 0 && updatedConnectors.length > 0) {
      updatedConnectors = updatedConnectors.slice(1);
    } else if (conditionIndex < updatedConnectors.length) {
      updatedConnectors = updatedConnectors.filter((_, i) => i !== conditionIndex - 1);
    }

    return { conditions: updatedConditions, connectors: updatedConnectors };
  };

  const hasConditionInGroup = (group: ConditionGroup, conditionId: string): boolean => {
    return group.conditions.some(c => 
      (isCondition(c) && c.id === conditionId) ||
      (isConditionGroup(c) && hasConditionInGroup(c, conditionId))
    );
  };

  const getTotalConditionsCount = (conditions: (Condition | ConditionGroup)[]): number => {
    return conditions.reduce((count, condition) => {
      if (isCondition(condition)) {
        return count + 1;
      } else {
        return count + getTotalConditionsCount(condition.conditions);
      }
    }, 0);
  };

  const updateLogicalConnector = (ruleId: string, index: number, connector: LogicalConnector) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;

    const updatedConnectors = [...rule.logicalConnectors];
    updatedConnectors[index] = connector;

    updateRule(ruleId, { logicalConnectors: updatedConnectors });
  };

  const validateRule = async (ruleId: string) => {
    try {
      const rule = rules.find(r => r.id === ruleId);
      if (!rule) return;

      const success = await conditionalRulesService.saveRule(rule);
      if (success) {
        // Reload rules from database to sync local state
        await loadRules();
        
        setEditingRules(prev => {
          const newSet = new Set(prev);
          newSet.delete(ruleId);
          return newSet;
        });
        setOriginalRules(prev => {
          const newMap = new Map(prev);
          newMap.delete(ruleId);
          return newMap;
        });
        toast({
          title: "Succès",
          description: "Règle validée et sauvegardée",
        });
      } else {
        toast({
          title: "Erreur",
          description: "Échec de la sauvegarde en base de données",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Validation error:', error);
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de la validation";
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const cancelRuleEdit = (ruleId: string) => {
    const originalRule = originalRules.get(ruleId);
    if (originalRule) {
      setRules(rules.map(rule => rule.id === ruleId ? { ...originalRule } : rule));
    }
    setEditingRules(prev => {
      const newSet = new Set(prev);
      newSet.delete(ruleId);
      return newSet;
    });
    setOriginalRules(prev => {
      const newMap = new Map(prev);
      newMap.delete(ruleId);
      return newMap;
    });
  };

  const startEditingRule = (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (rule) {
      setEditingRules(prev => new Set([...prev, ruleId]));
      setOriginalRules(prev => new Map([...prev, [ruleId, { ...rule }]]));
    }
  };

  const generateRuleSummary = (rule: ConditionalRule): string => {
    const conditionStrings = rule.conditions.map((cond, index) => {
      return getConditionSummary(cond, index, rule.conditions.length, rule.logicalConnectors);
    }).join('');

    return `Si ${conditionStrings} → ${ACTION_LABELS[rule.action]}`;
  };

  const getConditionSummary = (
    cond: Condition | ConditionGroup, 
    index: number, 
    totalConditions: number, 
    connectors: LogicalConnector[]
  ): string => {
    if (isCondition(cond)) {
      // Format values based on condition type
      const formatValue = (value: number, type: ConditionType): string => {
        // Vigorish and probability conditions are stored as decimals but displayed as percentages
        if (type === 'vigorish' || type.includes('probability')) {
          return `${(value * 100).toFixed(1)}%`;
        }
        // Odds conditions are displayed as-is (decimal format)
        return value.toString();
      };

      const formattedValue = formatValue(cond.value, cond.type);
      let conditionText = `${CONDITION_LABELS[cond.type]} ${OPERATOR_LABELS[cond.operator]} ${formattedValue}`;
      
      if (cond.operator === 'between' && cond.valueMax !== undefined) {
        const formattedValueMax = formatValue(cond.valueMax, cond.type);
        conditionText = `${CONDITION_LABELS[cond.type]} entre ${formattedValue} et ${formattedValueMax}`;
      }
      
      if (index < totalConditions - 1) {
        const connector = connectors[index] === 'AND' ? 'ET' : 'OU';
        conditionText += ` ${connector} `;
      }
      
      return conditionText;
    } else {
      // Handle group
      const groupConditions = cond.conditions.map((groupCond, groupIndex) => {
        return getConditionSummary(groupCond, groupIndex, cond.conditions.length, cond.logicalConnectors);
      }).join('');
      
      let groupText = `(${groupConditions})`;
      
      if (index < totalConditions - 1) {
        const connector = connectors[index] === 'AND' ? 'ET' : 'OU';
        groupText += ` ${connector} `;
      }
      
      return groupText;
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
            .map((rule) => 
              editingRules.has(rule.id) ? (
                <RuleEditor
                  key={rule.id}
                  rule={rule}
                  onUpdate={(updates) => updateRule(rule.id, updates)}
                  onDelete={() => deleteRule(rule.id)}
                  onAddCondition={() => addCondition(rule.id)}
                  onUpdateCondition={updateCondition}
                  onRemoveCondition={removeCondition}
                  onUpdateLogicalConnector={updateLogicalConnector}
                  onValidate={() => validateRule(rule.id)}
                  onCancel={() => cancelRuleEdit(rule.id)}
                />
              ) : (
                <CompactRuleDisplay
                  key={rule.id}
                  rule={rule}
                  summary={generateRuleSummary(rule)}
                  onEdit={() => startEditingRule(rule.id)}
                  onDelete={() => deleteRule(rule.id)}
                />
              )
            )
        )}
      </div>
    </div>
  );
}

interface CompactRuleDisplayProps {
  rule: ConditionalRule;
  summary: string;
  onEdit: () => void;
  onDelete: () => void;
}

function CompactRuleDisplay({ rule, summary, onEdit, onDelete }: CompactRuleDisplayProps) {
  return (
    <Card className={`border-l-4 ${rule.enabled ? 'border-l-primary' : 'border-l-muted-foreground'}`}>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">{rule.name}</h4>
              <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                {rule.enabled ? 'Activée' : 'Désactivée'}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Priorité {rule.priority}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {summary}
            </p>
          </div>
          <div className="flex items-center gap-1 ml-4">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
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
  onValidate: () => void;
  onCancel: () => void;
}

function RuleEditor({
  rule,
  onUpdate,
  onDelete,
  onAddCondition,
  onUpdateCondition,
  onRemoveCondition,
  onUpdateLogicalConnector,
  onValidate,
  onCancel
}: RuleEditorProps) {
  return (
    <Card className={`border-l-4 border-l-warning`}>
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
            <Button variant="outline" size="sm" onClick={onValidate}>
              <Check className="h-4 w-4 mr-1" />
              Valider
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" />
              Annuler
            </Button>
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
            <ConditionRenderer
              key={condition.id}
              condition={condition}
              conditionIndex={index}
              ruleId={rule.id}
              market={rule.market}
              totalConditions={rule.conditions.length}
              logicalConnectors={rule.logicalConnectors}
              onUpdateCondition={onUpdateCondition}
              onRemoveCondition={onRemoveCondition}
              onUpdateLogicalConnector={onUpdateLogicalConnector}
              onAddConditionToGroup={(groupId) => {
                // Add condition to specific group
                const currentRule = rule;
                if (!currentRule) return;
                
                const newCondition: Condition = {
                  id: crypto.randomUUID(),
                  type: CONDITION_OPTIONS[currentRule.market][0],
                  operator: '>',
                  value: 0
                };
                
                const addConditionToGroup = (
                  conditions: (Condition | ConditionGroup)[], 
                  targetGroupId: string
                ): (Condition | ConditionGroup)[] => {
                  return conditions.map(cond => {
                    if (isConditionGroup(cond) && cond.id === targetGroupId) {
                      return {
                        ...cond,
                        conditions: [...cond.conditions, newCondition],
                        logicalConnectors: [...cond.logicalConnectors, 'AND' as LogicalConnector]
                      };
                    } else if (isConditionGroup(cond)) {
                      return {
                        ...cond,
                        conditions: addConditionToGroup(cond.conditions, targetGroupId)
                      };
                    }
                    return cond;
                  });
                };
                
                const updatedConditions = addConditionToGroup(currentRule.conditions, groupId);
                onUpdate({ conditions: updatedConditions });
              }}
              onCreateGroup={() => {
                const newGroup: ConditionGroup = {
                  id: crypto.randomUUID(),
                  type: 'group',
                  conditions: [{
                    id: crypto.randomUUID(),
                    type: CONDITION_OPTIONS[rule.market][0],
                    operator: '>',
                    value: 0
                  }],
                  logicalConnectors: []
                };

                const updatedConditions = [...rule.conditions, newGroup];
                const updatedConnectors = [...rule.logicalConnectors, 'AND' as LogicalConnector];

                onUpdate({
                  conditions: updatedConditions,
                  logicalConnectors: updatedConnectors
                });
              }}
            />
          ))}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onAddCondition}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une condition
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              const newGroup: ConditionGroup = {
                id: crypto.randomUUID(),
                type: 'group',
                conditions: [{
                  id: crypto.randomUUID(),
                  type: CONDITION_OPTIONS[rule.market][0],
                  operator: '>',
                  value: 0
                }],
                logicalConnectors: []
              };

              const updatedConditions = [...rule.conditions, newGroup];
              const updatedConnectors = [...rule.logicalConnectors, 'AND' as LogicalConnector];

              onUpdate({
                conditions: updatedConditions,
                logicalConnectors: updatedConnectors
              });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un groupe
            </Button>
          </div>
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