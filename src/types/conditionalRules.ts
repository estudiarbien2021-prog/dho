// Types for the simplified conditional rules system

export type Market = '1x2' | 'btts' | 'ou25';

export type ConditionType = 
  | 'vigorish'
  | 'probability_home'
  | 'probability_draw' 
  | 'probability_away'
  | 'probability_btts_yes'
  | 'probability_btts_no'
  | 'probability_over25'
  | 'probability_under25'
  | 'odds_home'
  | 'odds_draw'
  | 'odds_away'
  | 'odds_btts_yes'
  | 'odds_btts_no'
  | 'odds_over25'
  | 'odds_under25';

export type Operator = '>' | '<' | '=' | '>=' | '<=' | '!=' | 'between';

export type LogicalConnector = 'AND' | 'OR';

export type ActionType = 
  | 'recommend_home'
  | 'recommend_draw'
  | 'recommend_away'
  | 'recommend_double_chance_1x'
  | 'recommend_double_chance_12'
  | 'recommend_double_chance_x2'
  | 'recommend_double_chance_least_probable'
  | 'recommend_double_chance_most_probable'
  | 'recommend_refund_if_draw'
  | 'recommend_btts_yes'
  | 'recommend_btts_no'
  | 'recommend_over25'
  | 'recommend_under25'
  | 'recommend_most_probable'
  | 'recommend_least_probable'
  | 'invert_recommendation'
  | 'no_recommendation';

export interface Condition {
  id: string;
  type: ConditionType;
  operator: Operator;
  value: number;
  valueMax?: number; // For 'between' operator
}

export interface ConditionGroup {
  id: string;
  type: 'group';
  conditions: (Condition | ConditionGroup)[];
  logicalConnectors: LogicalConnector[]; // n-1 connectors for n conditions
}

export interface ConditionalRule {
  id: string;
  name: string;
  market: Market;
  conditions: (Condition | ConditionGroup)[];
  logicalConnectors: LogicalConnector[]; // n-1 connectors for n conditions/groups
  action: ActionType;
  priority: number;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

// Helper type guards
export const isCondition = (item: Condition | ConditionGroup): item is Condition => {
  return 'type' in item && item.type !== 'group';
};

export const isConditionGroup = (item: Condition | ConditionGroup): item is ConditionGroup => {
  return 'type' in item && item.type === 'group';
};

export interface RuleEvaluationContext {
  // Match data needed for evaluation
  vigorish_1x2: number;
  vigorish_btts: number;
  vigorish_ou25: number;
  
  probability_home: number;
  probability_draw: number;
  probability_away: number;
  probability_btts_yes: number;
  probability_btts_no: number;
  probability_over25: number;
  probability_under25: number;
  
  odds_home: number;
  odds_draw: number;
  odds_away: number;
  odds_btts_yes?: number;
  odds_btts_no?: number;
  odds_over25?: number;
  odds_under25?: number;
}

export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  market: Market;
  action: ActionType;
  priority: number;
  conditionsMet: boolean;
  evaluationDetails: string;
}

// Predefined condition options for UI
export const CONDITION_OPTIONS: Record<Market, ConditionType[]> = {
  '1x2': [
    'vigorish',
    'probability_home',
    'probability_draw',
    'probability_away',
    'odds_home',
    'odds_draw',
    'odds_away'
  ],
  'btts': [
    'vigorish',
    'probability_btts_yes',
    'probability_btts_no',
    'odds_btts_yes',
    'odds_btts_no'
  ],
  'ou25': [
    'vigorish',
    'probability_over25',
    'probability_under25',
    'odds_over25',
    'odds_under25'
  ]
};

// Predefined action options for UI
export const ACTION_OPTIONS: Record<Market, ActionType[]> = {
  '1x2': [
    'recommend_home',
    'recommend_draw',
    'recommend_away',
    'recommend_double_chance_1x',
    'recommend_double_chance_12',
    'recommend_double_chance_x2',
    'recommend_double_chance_least_probable',
    'recommend_double_chance_most_probable',
    'recommend_refund_if_draw',
    'recommend_most_probable',
    'invert_recommendation',
    'no_recommendation'
  ],
  'btts': [
    'recommend_btts_yes',
    'recommend_btts_no',
    'recommend_most_probable',
    'recommend_least_probable',
    'invert_recommendation',
    'no_recommendation'
  ],
  'ou25': [
    'recommend_over25',
    'recommend_under25',
    'recommend_most_probable',
    'recommend_least_probable',
    'invert_recommendation',
    'no_recommendation'
  ]
};

// Human-readable labels
export const CONDITION_LABELS: Record<ConditionType, string> = {
  vigorish: 'Vigorish (%)',
  probability_home: 'Probabilité Domicile (%)',
  probability_draw: 'Probabilité Nul (%)',
  probability_away: 'Probabilité Extérieur (%)',
  probability_btts_yes: 'Probabilité BTTS Oui (%)',
  probability_btts_no: 'Probabilité BTTS Non (%)',
  probability_over25: 'Probabilité Over 2.5 (%)',
  probability_under25: 'Probabilité Under 2.5 (%)',
  odds_home: 'Cote Domicile',
  odds_draw: 'Cote Nul',
  odds_away: 'Cote Extérieur',
  odds_btts_yes: 'Cote BTTS Oui',
  odds_btts_no: 'Cote BTTS Non',
  odds_over25: 'Cote Over 2.5',
  odds_under25: 'Cote Under 2.5'
};

export const ACTION_LABELS: Record<ActionType, string> = {
  recommend_home: 'Recommander Domicile',
  recommend_draw: 'Recommander Nul',
  recommend_away: 'Recommander Extérieur',
  recommend_double_chance_1x: 'Recommander Double Chance 1X',
  recommend_double_chance_12: 'Recommander Double Chance 12',
  recommend_double_chance_x2: 'Recommander Double Chance X2',
  recommend_double_chance_least_probable: 'Recommander Double Chance (2 moins probables)',
  recommend_double_chance_most_probable: 'Recommander Double Chance (2 plus probables)',
  recommend_refund_if_draw: 'Recommander Remboursé si match nul',
  recommend_btts_yes: 'Recommander BTTS Oui',
  recommend_btts_no: 'Recommander BTTS Non',
  recommend_over25: 'Recommander Over 2.5',
  recommend_under25: 'Recommander Under 2.5',
  recommend_most_probable: 'Recommander le plus probable',
  recommend_least_probable: 'Recommander le moins probable',
  invert_recommendation: 'Inverser la recommandation',
  no_recommendation: 'Aucune recommandation'
};

export const OPERATOR_LABELS: Record<Operator, string> = {
  '>': 'supérieur à',
  '<': 'inférieur à',
  '=': 'égal à',
  '>=': 'supérieur ou égal à',
  '<=': 'inférieur ou égal à',
  '!=': 'différent de',
  'between': 'entre'
};

export const MARKET_LABELS: Record<Market, string> = {
  '1x2': '1X2',
  'btts': 'BTTS',
  'ou25': '2,5 buts'
};