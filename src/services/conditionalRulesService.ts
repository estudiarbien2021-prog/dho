import { supabase } from '@/integrations/supabase/client';
import { 
  ConditionalRule, 
  RuleEvaluationContext, 
  RuleEvaluationResult,
  Condition,
  LogicalConnector,
  Market
} from '@/types/conditionalRules';

class ConditionalRulesService {
  private rules: ConditionalRule[] = [];
  private lastFetch: number = 0;
  private cacheDuration = 5 * 60 * 1000; // 5 minutes cache

  async getRules(): Promise<ConditionalRule[]> {
    const now = Date.now();
    
    // Return cached rules if still fresh
    if (this.rules.length > 0 && now - this.lastFetch < this.cacheDuration) {
      return this.rules;
    }

    try {
      const { data, error } = await supabase
        .from('conditional_rules' as any)
        .select('*')
        .order('priority', { ascending: true });

      if (error) {
        console.error('Error fetching conditional rules:', error);
        return this.getDefaultRules();
      }

      this.rules = (data as any[])?.map(row => ({
        id: row.id,
        name: row.name,
        market: row.market,
        conditions: row.conditions,
        logicalConnectors: row.logical_connectors,
        action: row.action,
        priority: row.priority,
        enabled: row.enabled,
        created_at: row.created_at,
        updated_at: row.updated_at
      })) || [];
      this.lastFetch = now;
      return this.rules;
    } catch (error) {
      console.error('Failed to fetch conditional rules:', error);
      return this.getDefaultRules();
    }
  }

  async getRulesByMarket(market: Market): Promise<ConditionalRule[]> {
    const allRules = await this.getRules();
    return allRules.filter(rule => rule.market === market && rule.enabled);
  }

  async saveRule(rule: ConditionalRule): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('conditional_rules' as any)
        .upsert({
          id: rule.id,
          name: rule.name,
          market: rule.market,
          conditions: rule.conditions,
          logical_connectors: rule.logicalConnectors,
          action: rule.action,
          priority: rule.priority,
          enabled: rule.enabled,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving conditional rule:', error);
        return false;
      }

      // Update cache
      this.clearCache();
      return true;
    } catch (error) {
      console.error('Failed to save conditional rule:', error);
      return false;
    }
  }

  async deleteRule(ruleId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('conditional_rules' as any)
        .delete()
        .eq('id', ruleId);

      if (error) {
        console.error('Error deleting conditional rule:', error);
        return false;
      }

      // Update cache
      this.clearCache();
      return true;
    } catch (error) {
      console.error('Failed to delete conditional rule:', error);
      return false;
    }
  }

  // Evaluate rules for a match
  async evaluateRules(context: RuleEvaluationContext): Promise<RuleEvaluationResult[]> {
    const allRules = await this.getRules();
    const enabledRules = allRules.filter(rule => rule.enabled);
    
    console.log('🔍 RÈGLES CONDITIONNELLES - ÉVALUATION DÉMARRÉE:');
    console.log('  📋 Total des règles:', allRules.length);
    console.log('  ✅ Règles activées:', enabledRules.length);
    console.log('  📊 Contexte d\'évaluation:', {
      vig_1x2: context.vigorish_1x2.toFixed(2) + '%',
      vig_btts: context.vigorish_btts.toFixed(2) + '%',
      vig_ou25: context.vigorish_ou25.toFixed(2) + '%',
      prob_home: context.probability_home.toFixed(1) + '%',
      prob_draw: context.probability_draw.toFixed(1) + '%',
      prob_away: context.probability_away.toFixed(1) + '%'
    });
    
    const results: RuleEvaluationResult[] = [];

    for (const rule of enabledRules) {
      const conditionsMet = this.evaluateConditions(rule.conditions, rule.logicalConnectors, context);
      
      console.log(`  🔍 RÈGLE "${rule.name}" (marché: ${rule.market}):`, conditionsMet ? '✅ CORRESPONDANCE' : '❌ PAS DE CORRESPONDANCE');
      
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        market: rule.market,
        action: rule.action,
        priority: rule.priority,
        conditionsMet,
        evaluationDetails: this.getEvaluationDetails(rule, context, conditionsMet)
      });
    }

    const matchedResults = results.filter(r => r.conditionsMet);
    console.log('🎯 RÉSULTAT FINAL:', matchedResults.length, 'règle(s) correspondent aux conditions:', 
      matchedResults.map(r => `${r.ruleName} (${r.action})`));

    // Sort by priority
    return results.sort((a, b) => a.priority - b.priority);
  }

  private evaluateConditions(
    conditions: Condition[], 
    connectors: LogicalConnector[], 
    context: RuleEvaluationContext
  ): boolean {
    if (conditions.length === 0) return false;
    if (conditions.length === 1) return this.evaluateCondition(conditions[0], context);

    let result = this.evaluateCondition(conditions[0], context);

    for (let i = 1; i < conditions.length; i++) {
      const conditionResult = this.evaluateCondition(conditions[i], context);
      const connector = connectors[i - 1];

      if (connector === 'AND') {
        result = result && conditionResult;
      } else if (connector === 'OR') {
        result = result || conditionResult;
      }
    }

    return result;
  }

  private evaluateCondition(condition: Condition, context: RuleEvaluationContext): boolean {
    const contextValue = this.getContextValue(condition.type, context);
    if (contextValue === null || contextValue === undefined) return false;

    switch (condition.operator) {
      case '>':
        return contextValue > condition.value;
      case '<':
        return contextValue < condition.value;
      case '=':
        return Math.abs(contextValue - condition.value) < 0.01; // Float comparison
      case '>=':
        return contextValue >= condition.value;
      case '<=':
        return contextValue <= condition.value;
      case 'between':
        return condition.valueMax !== undefined && 
               contextValue >= condition.value && 
               contextValue <= condition.valueMax;
      default:
        return false;
    }
  }

  private getContextValue(conditionType: string, context: RuleEvaluationContext): number | null {
    switch (conditionType) {
      case 'vigorish':
        // This is context-dependent based on the rule's market
        // For now, we'll use 1x2 vigorish as default
        return context.vigorish_1x2;
      case 'probability_home':
        return context.probability_home * 100; // Convert to percentage
      case 'probability_draw':
        return context.probability_draw * 100;
      case 'probability_away':
        return context.probability_away * 100;
      case 'probability_btts_yes':
        return context.probability_btts_yes * 100;
      case 'probability_btts_no':
        return context.probability_btts_no * 100;
      case 'probability_over25':
        return context.probability_over25 * 100;
      case 'probability_under25':
        return context.probability_under25 * 100;
      case 'odds_home':
        return context.odds_home;
      case 'odds_draw':
        return context.odds_draw;
      case 'odds_away':
        return context.odds_away;
      case 'odds_btts_yes':
        return context.odds_btts_yes || null;
      case 'odds_btts_no':
        return context.odds_btts_no || null;
      case 'odds_over25':
        return context.odds_over25 || null;
      case 'odds_under25':
        return context.odds_under25 || null;
      default:
        return null;
    }
  }

  private getEvaluationDetails(rule: ConditionalRule, context: RuleEvaluationContext, conditionsMet: boolean): string {
    const details: string[] = [];
    
    for (let i = 0; i < rule.conditions.length; i++) {
      const condition = rule.conditions[i];
      const contextValue = this.getContextValue(condition.type, context);
      const conditionMet = contextValue !== null ? this.evaluateCondition(condition, context) : false;
      
      details.push(
        `${condition.type}: ${contextValue?.toFixed(2)} ${condition.operator} ${condition.value} = ${conditionMet ? '✓' : '✗'}`
      );
      
      if (i < rule.logicalConnectors.length) {
        details.push(rule.logicalConnectors[i]);
      }
    }
    
    return `${details.join(' ')} → ${conditionsMet ? 'MATCHED' : 'NOT MATCHED'}`;
  }

  private getDefaultRules(): ConditionalRule[] {
    return [
      {
        id: 'default-1x2-negative-vig',
        name: 'Vigorish négatif 1X2',
        market: '1x2',
        conditions: [{
          id: 'cond-1',
          type: 'vigorish',
          operator: '<',
          value: 0
        }],
        logicalConnectors: [],
        action: 'recommend_most_probable',
        priority: 1,
        enabled: true
      },
      {
        id: 'default-btts-high-prob',
        name: 'BTTS haute probabilité',
        market: 'btts',
        conditions: [
          {
            id: 'cond-1',
            type: 'probability_btts_yes',
            operator: '>',
            value: 55
          },
          {
            id: 'cond-2',
            type: 'odds_btts_yes',
            operator: '>',
            value: 1.8
          }
        ],
        logicalConnectors: ['AND'],
        action: 'recommend_btts_yes',
        priority: 2,
        enabled: true
      },
      {
        id: 'default-ou25-over',
        name: 'Over 2.5 haute probabilité',
        market: 'ou25',
        conditions: [
          {
            id: 'cond-1',
            type: 'probability_over25',
            operator: '>',
            value: 60
          },
          {
            id: 'cond-2',
            type: 'odds_over25',
            operator: '>',
            value: 1.7
          }
        ],
        logicalConnectors: ['AND'],
        action: 'recommend_over25',
        priority: 3,
        enabled: true
      }
    ];
  }

  clearCache(): void {
    this.rules = [];
    this.lastFetch = 0;
  }
}

export const conditionalRulesService = new ConditionalRulesService();