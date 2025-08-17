
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, GripVertical } from 'lucide-react';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ConditionalRule, Market, MARKET_LABELS } from '@/types/conditionalRules';

interface SortableRowProps {
  rule: ConditionalRule;
  selectedRules: string[];
  onSelectRule: (ruleId: string, checked: boolean) => void;
  onToggleEnabled: (rule: ConditionalRule) => void;
  onDeleteRule: (ruleId: string) => void;
  onGenerateRuleSummary: (rule: ConditionalRule) => string;
  getMarketBadgeColor: (market: Market) => string;
}

export function SortableRow({ 
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
  } = useSortable({ 
    id: rule.id,
    data: {
      type: 'rule',
      rule,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`flex items-center gap-4 p-4 border-b border-border hover:bg-muted/30 transition-colors ${
        isDragging ? 'bg-muted/50 shadow-lg z-10' : ''
      }`}
    >
      <div className="flex items-center gap-2 w-20">
        <div
          className="cursor-grab hover:bg-muted p-2 rounded touch-none select-none transition-colors bg-blue-100 flex-shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <Checkbox
          checked={selectedRules.includes(rule.id)}
          onCheckedChange={(checked) => onSelectRule(rule.id, checked as boolean)}
        />
      </div>
      
      <div className="w-20">
        <Badge className={getMarketBadgeColor(rule.market)}>
          {MARKET_LABELS[rule.market]}
        </Badge>
      </div>
      
      <div className="w-24">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleEnabled(rule)}
          className={rule.enabled ? 'text-green-600' : 'text-red-600'}
        >
          {rule.enabled ? 'Activée' : 'Désactivée'}
        </Button>
      </div>
      
      <div className="w-16 text-center">
        <span className="text-sm font-medium">{rule.priority}</span>
      </div>
      
      <div className="flex-1 min-w-0 max-w-2xl pr-4">
        <span className="text-sm text-muted-foreground break-words">
          {onGenerateRuleSummary(rule)}
        </span>
      </div>
      
      <div className="w-16 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDeleteRule(rule.id)}
          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
