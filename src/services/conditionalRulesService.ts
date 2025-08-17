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
      vig_1x2: (context.vigorish_1x2 * 100).toFixed(2) + '%',
      vig_btts: (context.vigorish_btts * 100).toFixed(2) + '%',
      vig_ou25: (context.vigorish_ou25 * 100).toFixed(2) + '%',
      prob_home: (context.probability_home * 100).toFixed(1) + '%',
      prob_draw: (context.probability_draw * 100).toFixed(1) + '%',
      prob_away: (context.probability_away * 100).toFixed(1) + '%'
    });
    
    const results: RuleEvaluationResult[] = [];

    for (const rule of enabledRules) {
      const conditionsMet = this.evaluateConditions(rule.conditions, rule.logicalConnectors, context, rule.market);
      
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
    context: RuleEvaluationContext,
    ruleMarket: Market
  ): boolean {
    if (conditions.length === 0) return false;
    if (conditions.length === 1) return this.evaluateCondition(conditions[0], context, ruleMarket);

    let result = this.evaluateCondition(conditions[0], context, ruleMarket);

    for (let i = 1; i < conditions.length; i++) {
      const conditionResult = this.evaluateCondition(conditions[i], context, ruleMarket);
      const connector = connectors[i - 1];

      if (connector === 'AND') {
        result = result && conditionResult;
      } else if (connector === 'OR') {
        result = result || conditionResult;
      }
    }

    return result;
  }

  private evaluateCondition(condition: Condition, context: RuleEvaluationContext, ruleMarket?: Market): boolean {
    const contextValue = this.getContextValue(condition.type, context, ruleMarket);
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

  private getContextValue(conditionType: string, context: RuleEvaluationContext, ruleMarket?: Market): number | null {
    switch (conditionType) {
      case 'vigorish':
        // Return appropriate vigorish based on the rule's market
        if (ruleMarket === 'btts') return context.vigorish_btts;
        if (ruleMarket === 'ou25') return context.vigorish_ou25;
        return context.vigorish_1x2; // Default to 1x2
      case 'probability_home':
        return context.probability_home; // Keep as decimal
      case 'probability_draw':
        return context.probability_draw;
      case 'probability_away':
        return context.probability_away;
      case 'probability_btts_yes':
        return context.probability_btts_yes;
      case 'probability_btts_no':
        return context.probability_btts_no;
      case 'probability_over25':
        return context.probability_over25;
      case 'probability_under25':
        return context.probability_under25;
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
      const contextValue = this.getContextValue(condition.type, context, rule.market);
      const conditionMet = contextValue !== null ? this.evaluateCondition(condition, context, rule.market) : false;
      
      details.push(
        `${condition.type}: ${contextValue?.toFixed(4)} ${condition.operator} ${condition.value} = ${conditionMet ? '✓' : '✗'}`
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
        id: 'default-1x2-low-vig',
        name: 'Vigorish faible 1X2',
        market: '1x2',
        conditions: [{
          id: 'cond-1',
          type: 'vigorish',
          operator: '<',
          value: 0.06 // 6% as decimal
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
            value: 0.55 // 55% as decimal
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
            value: 0.60 // 60% as decimal
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
    console.log('🔄 Cache des règles conditionnelles vidé');
  }
}

export const conditionalRulesService = new ConditionalRulesService();

// Force cache refresh on page load to pick up new rules
conditionalRulesService.clearCache();