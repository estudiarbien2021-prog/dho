import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus } from 'lucide-react';
import { 
  Condition, 
  ConditionGroup,
  ConditionType, 
  LogicalConnector,
  Operator,
  CONDITION_OPTIONS,
  CONDITION_LABELS,
  OPERATOR_LABELS,
  isCondition,
  isConditionGroup
} from '@/types/conditionalRules';

interface ConditionRendererProps {
  condition: Condition | ConditionGroup;
  conditionIndex: number;
  ruleId: string;
  market: string;
  totalConditions: number;
  logicalConnectors: LogicalConnector[];
  onUpdateCondition: (ruleId: string, conditionId: string, updates: Partial<Condition>) => void;
  onRemoveCondition: (ruleId: string, conditionId: string) => void;
  onUpdateLogicalConnector: (ruleId: string, index: number, connector: LogicalConnector) => void;
  onAddConditionToGroup?: (groupId: string) => void;
  onCreateGroup?: (ruleId: string) => void;
  depth?: number;
}

export function ConditionRenderer({
  condition,
  conditionIndex,
  ruleId,
  market,
  totalConditions,
  logicalConnectors,
  onUpdateCondition,
  onRemoveCondition,
  onUpdateLogicalConnector,
  onAddConditionToGroup,
  onCreateGroup,
  depth = 0
}: ConditionRendererProps) {
  if (isCondition(condition)) {
    return (
      <div className={`${depth > 0 ? 'ml-4 border-l-2 border-muted pl-4' : ''}`}>
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <Select
            value={condition.type}
            onValueChange={(value: ConditionType) => 
              onUpdateCondition(ruleId, condition.id, { type: value })
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONDITION_OPTIONS[market as keyof typeof CONDITION_OPTIONS].map(conditionType => (
                <SelectItem key={conditionType} value={conditionType}>
                  {CONDITION_LABELS[conditionType]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={condition.operator}
            onValueChange={(value: Operator) => 
              onUpdateCondition(ruleId, condition.id, { operator: value })
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
            value={
              condition.type === 'vigorish' || condition.type.includes('probability')
                ? (condition.value * 100).toFixed(1)
                : condition.value
            }
            onChange={(e) => {
              const inputValue = parseFloat(e.target.value) || 0;
              const actualValue = condition.type === 'vigorish' || condition.type.includes('probability')
                ? inputValue / 100  // Convert percentage to decimal for storage
                : inputValue;
              onUpdateCondition(ruleId, condition.id, { value: actualValue });
            }}
            className="w-24"
            step={condition.type === 'vigorish' || condition.type.includes('probability') ? "0.1" : "0.01"}
            placeholder={condition.type === 'vigorish' || condition.type.includes('probability') ? "%" : ""}
          />

          {condition.operator === 'between' && (
            <>
              <span className="text-sm text-muted-foreground">et</span>
              <Input
                type="number"
                value={
                  condition.type === 'vigorish' || condition.type.includes('probability')
                    ? ((condition.valueMax || 0) * 100).toFixed(1)
                    : (condition.valueMax || 0)
                }
                onChange={(e) => {
                  const inputValue = parseFloat(e.target.value) || 0;
                  const actualValue = condition.type === 'vigorish' || condition.type.includes('probability')
                    ? inputValue / 100  // Convert percentage to decimal for storage
                    : inputValue;
                  onUpdateCondition(ruleId, condition.id, { valueMax: actualValue });
                }}
                className="w-24"
                step={condition.type === 'vigorish' || condition.type.includes('probability') ? "0.1" : "0.01"}
                placeholder={condition.type === 'vigorish' || condition.type.includes('probability') ? "%" : ""}
              />
            </>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemoveCondition(ruleId, condition.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Logical Connector */}
        {conditionIndex < totalConditions - 1 && (
          <div className="flex justify-center my-2">
            <Select
              value={logicalConnectors[conditionIndex]}
              onValueChange={(value: LogicalConnector) => 
                onUpdateLogicalConnector(ruleId, conditionIndex, value)
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
    );
  } else {
    // Handle ConditionGroup
    return (
      <div className={`${depth > 0 ? 'ml-4' : ''} border-2 border-primary/20 rounded-lg p-3 bg-primary/5`}>
        <div className="flex items-center justify-between mb-3">
          <Badge variant="outline" className="text-xs">
            Groupe ({condition.conditions.length} condition{condition.conditions.length > 1 ? 's' : ''})
          </Badge>
          <div className="flex gap-1">
            {onAddConditionToGroup && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAddConditionToGroup(condition.id)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemoveCondition(ruleId, condition.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="space-y-2">
          {condition.conditions.map((nestedCondition, nestedIndex) => (
            <ConditionRenderer
              key={nestedCondition.id}
              condition={nestedCondition}
              conditionIndex={nestedIndex}
              ruleId={ruleId}
              market={market}
              totalConditions={condition.conditions.length}
              logicalConnectors={condition.logicalConnectors}
              onUpdateCondition={onUpdateCondition}
              onRemoveCondition={onRemoveCondition}
              onUpdateLogicalConnector={onUpdateLogicalConnector}
              onAddConditionToGroup={onAddConditionToGroup}
              onCreateGroup={onCreateGroup}
              depth={depth + 1}
            />
          ))}
        </div>

        {/* Logical Connector for the group */}
        {conditionIndex < totalConditions - 1 && (
          <div className="flex justify-center my-2">
            <Select
              value={logicalConnectors[conditionIndex]}
              onValueChange={(value: LogicalConnector) => 
                onUpdateLogicalConnector(ruleId, conditionIndex, value)
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
    );
  }
}