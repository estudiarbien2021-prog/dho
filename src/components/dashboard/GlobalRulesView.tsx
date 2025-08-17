import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Globe, Search, Filter, Trash2, RefreshCw, ArrowUpDown, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ConditionalRule, Market, MARKET_LABELS, ACTION_LABELS, CONDITION_LABELS } from '@/types/conditionalRules';
import { conditionalRulesService } from '@/services/conditionalRulesService';

interface GlobalRulesViewProps {}

interface SortableRowProps {
  rule: ConditionalRule;
  selectedRules: string[];
  onSelectRule: (ruleId: string, checked: boolean) => void;
  onToggleEnabled: (rule: ConditionalRule) => void;
  onDeleteRule: (ruleId: string) => void;
  onGenerateRuleSummary: (rule: ConditionalRule) => string;
  getMarketBadgeColor: (market: Market) => string;
}

function SortableRow({ 
  rule, 
  selectedRules, 
  onSelectRule, 
  onToggleEnabled, 
  onDeleteRule, 
  onGenerateRuleSummary,
  getMarketBadgeColor 
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rule.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow 
      ref={setNodeRef} 
      style={style} 
      className={isDragging ? 'bg-muted/50' : ''}
    >
      <TableCell>
        <div className="flex items-center gap-2">
          <button
            className="cursor-grab hover:bg-muted p-1 rounded"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <Checkbox
            checked={selectedRules.includes(rule.id)}
            onCheckedChange={(checked) => onSelectRule(rule.id, checked as boolean)}
          />
        </div>
      </TableCell>
      <TableCell className="font-medium">{rule.name}</TableCell>
      <TableCell>
        <Badge className={getMarketBadgeColor(rule.market)}>
          {MARKET_LABELS[rule.market]}
        </Badge>
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleEnabled(rule)}
          className={rule.enabled ? 'text-green-600' : 'text-red-600'}
        >
          {rule.enabled ? 'Activée' : 'Désactivée'}
        </Button>
      </TableCell>
      <TableCell>
        <span className="text-sm font-medium">{rule.priority}</span>
      </TableCell>
      <TableCell className="max-w-md">
        <span className="text-sm text-text-weak truncate block">
          {onGenerateRuleSummary(rule)}
        </span>
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDeleteRule(rule.id)}
          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function GlobalRulesView({}: GlobalRulesViewProps) {
  const [rules, setRules] = useState<ConditionalRule[]>([]);
  const [filteredRules, setFilteredRules] = useState<ConditionalRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMarket, setSelectedMarket] = useState<Market | 'all'>('all');
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadRules();
  }, []);

  useEffect(() => {
    filterRules();
  }, [rules, searchTerm, selectedMarket]);

  const loadRules = async () => {
    setLoading(true);
    try {
      const allRules = await conditionalRulesService.getRules();
      setRules(allRules);
    } catch (error) {
      console.error('Error loading rules:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les règles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterRules = () => {
    let filtered = rules;

    // Filter by market
    if (selectedMarket !== 'all') {
      filtered = filtered.filter(rule => rule.market === selectedMarket);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(rule =>
        rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        generateRuleSummary(rule).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort by priority
    filtered.sort((a, b) => a.priority - b.priority);

    setFilteredRules(filtered);
  };

  const generateRuleSummary = (rule: ConditionalRule): string => {
    const conditions = rule.conditions.map((condition, index) => {
      // Format values based on condition type
      const formatValue = (value: number, type: string): string => {
        // Vigorish and probability conditions are stored as decimals but displayed as percentages
        if (type === 'vigorish' || type.includes('probability')) {
          return `${(value * 100).toFixed(1)}%`;
        }
        // Odds conditions are displayed as-is (decimal format)
        return value.toString();
      };

      const label = CONDITION_LABELS[condition.type] || condition.type;
      const formattedValue = formatValue(condition.value, condition.type);
      const connector = index < rule.logicalConnectors.length ? 
        ` ${rule.logicalConnectors[index] === 'AND' ? 'ET' : 'OU'} ` : '';
      
      return `${label} ${condition.operator} ${formattedValue}${connector}`;
    }).join('');

    const action = ACTION_LABELS[rule.action] || rule.action;
    
    return `Si ${conditions} → ${action}`;
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setSaving(true);
    
    const oldIndex = filteredRules.findIndex(rule => rule.id === active.id);
    const newIndex = filteredRules.findIndex(rule => rule.id === over.id);

    const reorderedRules = arrayMove(filteredRules, oldIndex, newIndex);
    
    // Update local state immediately for better UX
    const newFilteredRules = reorderedRules.map((rule, index) => ({
      ...rule,
      priority: index + 1
    }));
    
    setFilteredRules(newFilteredRules);

    try {
      // Update priorities in batch
      const updatePromises = newFilteredRules.map(rule => 
        conditionalRulesService.saveRule(rule)
      );

      await Promise.all(updatePromises);
      
      // Reload rules to ensure consistency
      await loadRules();
      
      toast({
        title: "Succès",
        description: "Ordre des priorités mis à jour",
      });
    } catch (error) {
      console.error('Error updating priorities:', error);
      // Revert changes on error
      await loadRules();
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'ordre des priorités",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette règle ?')) return;

    try {
      const success = await conditionalRulesService.deleteRule(ruleId);
      if (success) {
        await loadRules();
        toast({
          title: "Succès",
          description: "Règle supprimée",
        });
      }
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la règle",
        variant: "destructive",
      });
    }
  };

  const toggleRuleEnabled = async (rule: ConditionalRule) => {
    try {
      const updatedRule = { ...rule, enabled: !rule.enabled };
      const success = await conditionalRulesService.saveRule(updatedRule);
      
      if (success) {
        await loadRules();
        toast({
          title: "Succès",
          description: `Règle ${updatedRule.enabled ? 'activée' : 'désactivée'}`,
        });
      }
    } catch (error) {
      console.error('Error toggling rule:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut de la règle",
        variant: "destructive",
      });
    }
  };

  const handleSelectRule = (ruleId: string, checked: boolean) => {
    if (checked) {
      setSelectedRules([...selectedRules, ruleId]);
    } else {
      setSelectedRules(selectedRules.filter(id => id !== ruleId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRules(filteredRules.map(rule => rule.id));
    } else {
      setSelectedRules([]);
    }
  };

  const bulkToggleEnabled = async (enabled: boolean) => {
    if (selectedRules.length === 0) return;

    try {
      const promises = selectedRules.map(async (ruleId) => {
        const rule = rules.find(r => r.id === ruleId);
        if (!rule) return;
        const updatedRule = { ...rule, enabled };
        return conditionalRulesService.saveRule(updatedRule);
      });

      await Promise.all(promises);
      await loadRules();
      setSelectedRules([]);
      
      toast({
        title: "Succès",
        description: `${selectedRules.length} règles ${enabled ? 'activées' : 'désactivées'}`,
      });
    } catch (error) {
      console.error('Error bulk toggling rules:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier les règles en lot",
        variant: "destructive",
      });
    }
  };

  const bulkDelete = async () => {
    if (selectedRules.length === 0) return;
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedRules.length} règles ?`)) return;

    try {
      const promises = selectedRules.map(ruleId => 
        conditionalRulesService.deleteRule(ruleId)
      );

      await Promise.all(promises);
      await loadRules();
      setSelectedRules([]);
      
      toast({
        title: "Succès",
        description: `${selectedRules.length} règles supprimées`,
      });
    } catch (error) {
      console.error('Error bulk deleting rules:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer les règles en lot",
        variant: "destructive",
      });
    }
  };

  const getMarketBadgeColor = (market: Market) => {
    const colors = {
      '1X2': 'bg-blue-100 text-blue-800 border-blue-200',
      'BTTS': 'bg-green-100 text-green-800 border-green-200',
      'OU25': 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colors[market] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Chargement des règles...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Globe className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-lg font-semibold">Vue Globale des Règles</h3>
            <p className="text-sm text-text-weak">
              Glissez-déposez pour réorganiser les priorités des règles
            </p>
          </div>
        </div>
        <Button onClick={loadRules} variant="outline" size="sm" disabled={saving}>
          <RefreshCw className={`h-4 w-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
          {saving ? 'Sauvegarde...' : 'Actualiser'}
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-weak" />
                <Input
                  placeholder="Rechercher une règle..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={selectedMarket} onValueChange={(value) => setSelectedMarket(value as Market | 'all')}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les marchés</SelectItem>
                  <SelectItem value="1X2">1X2</SelectItem>
                  <SelectItem value="BTTS">BTTS</SelectItem>
                  <SelectItem value="OU25">OU25</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedRules.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-weak">
                {selectedRules.length} règle(s) sélectionnée(s)
              </span>
              <Button onClick={() => bulkToggleEnabled(true)} size="sm" variant="outline">
                Activer
              </Button>
              <Button onClick={() => bulkToggleEnabled(false)} size="sm" variant="outline">
                Désactiver
              </Button>
              <Button onClick={bulkDelete} size="sm" variant="destructive">
                Supprimer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rules Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5" />
            Règles ({filteredRules.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRules.length === 0 ? (
            <div className="text-center py-8 text-text-weak">
              {searchTerm || selectedMarket !== 'all' 
                ? 'Aucune règle ne correspond aux filtres' 
                : 'Aucune règle configurée'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <Checkbox
                            checked={selectedRules.length === filteredRules.length && filteredRules.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </div>
                      </TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Marché</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Priorité</TableHead>
                      <TableHead>Logique</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext 
                      items={filteredRules.map(rule => rule.id)} 
                      strategy={verticalListSortingStrategy}
                    >
                      {filteredRules.map((rule) => (
                        <SortableRow
                          key={rule.id}
                          rule={rule}
                          selectedRules={selectedRules}
                          onSelectRule={handleSelectRule}
                          onToggleEnabled={toggleRuleEnabled}
                          onDeleteRule={deleteRule}
                          onGenerateRuleSummary={generateRuleSummary}
                          getMarketBadgeColor={getMarketBadgeColor}
                        />
                      ))}
                    </SortableContext>
                  </TableBody>
                </Table>
              </DndContext>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}