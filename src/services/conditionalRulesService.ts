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
    console.log('  🎯 FOCUS RÈGLES BTTS:', enabledRules.filter(r => r.market === 'btts').length, 'règles BTTS configurées');
    console.log('  📊 Contexte d\'évaluation:', {
      vig_1x2: (context.vigorish_1x2 * 100).toFixed(2) + '%',
      vig_btts: (context.vigorish_btts * 100).toFixed(2) + '%',
      vig_ou25: (context.vigorish_ou25 * 100).toFixed(2) + '%',
      prob_home: (context.probability_home * 100).toFixed(1) + '%',
      prob_draw: (context.probability_draw * 100).toFixed(1) + '%',
      prob_away: (context.probability_away * 100).toFixed(1) + '%',
      prob_btts_yes: (context.probability_btts_yes * 100).toFixed(1) + '%',
      prob_btts_no: (context.probability_btts_no * 100).toFixed(1) + '%'
    });
    
    // ÉTAPE DE VÉRIFICATION CRITIQUE: Examiner spécifiquement les règles BTTS
    const bttsRules = enabledRules.filter(r => r.market === 'btts');
    console.log('📋 ANALYSE DÉTAILLÉE RÈGLES BTTS:');
    bttsRules.forEach(rule => {
      console.log(`  🔍 Règle BTTS: "${rule.name}"`);
      console.log(`    Conditions: ${JSON.stringify(rule.conditions)}`);
      console.log(`    Action: ${rule.action}`);
      console.log(`    Priorité: ${rule.priority}`);
    });
    
    const results: RuleEvaluationResult[] = [];
    const noRecommendationMarkets = new Set<string>();

    // ÉTAPE 1: Évaluer toutes les règles et identifier les no_recommendation prioritaires
    for (const rule of enabledRules) {
      const conditionsMet = this.evaluateConditions(rule.conditions, rule.logicalConnectors, context, rule.market);
      
      // DEBUG SPÉCIAL POUR LA RÈGLE 17 (priorité 17) - ZORYA vs HIRNYK
      if (rule.priority === 17) {
        console.log('🚨 DEBUG RÈGLE 17 - ÉVALUATION DÉTAILLÉE:');
        console.log('  📋 Règle 17 trouvée:', rule.name);
        console.log('  🎯 Marché:', rule.market);
        console.log('  ⚙️ Action:', rule.action);
        console.log('  📊 Conditions de la règle:');
        rule.conditions.forEach((cond, index) => {
          const contextValue = this.getContextValue(cond.type, context, rule.market);
          console.log(`    Condition ${index + 1}:`, {
            type: cond.type,
            operator: cond.operator,
            expectedValue: cond.value,
            contextValue,
            contextValuePercent: contextValue ? (contextValue * 100).toFixed(1) + '%' : 'N/A',
            conditionMet: contextValue !== null ? this.evaluateCondition(cond, context, rule.market) : false
          });
        });
        console.log('  🔗 Connecteurs logiques:', rule.logicalConnectors);
        console.log('  🎯 Résultat final:', conditionsMet ? '✅ TOUTES CONDITIONS RESPECTÉES' : '❌ AU MOINS UNE CONDITION NON RESPECTÉE');
      }
      
      console.log(`  🔍 RÈGLE "${rule.name}" (marché: ${rule.market}):`, conditionsMet ? '✅ CORRESPONDANCE' : '❌ PAS DE CORRESPONDANCE');
      
      // ANALYSE SPÉCIFIQUE POUR BTTS
      if (rule.market === 'btts') {
        console.log(`    🎯 DÉTAIL BTTS - Règle "${rule.name}":`);
        console.log(`      Vigorish actuel: ${(context.vigorish_btts * 100).toFixed(1)}%`);
        console.log(`      Prob BTTS Oui: ${(context.probability_btts_yes * 100).toFixed(1)}%`);
        console.log(`      Prob BTTS Non: ${(context.probability_btts_no * 100).toFixed(1)}%`);
        console.log(`      Conditions respectées: ${conditionsMet ? 'OUI' : 'NON'}`);
        if (!conditionsMet) {
          console.log(`      ⚠️ Cette règle BTTS NE GÉNÈRERA PAS de recommandation`);
        }
      }
      
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        market: rule.market,
        action: rule.action,
        priority: rule.priority,
        conditionsMet,
        evaluationDetails: this.getEvaluationDetails(rule, context, conditionsMet)
      });

      // Si c'est une règle no_recommendation qui correspond, marquer le marché
      if (conditionsMet && rule.action === 'no_recommendation') {
        noRecommendationMarkets.add(rule.market);
        console.log(`🚫 NO_RECOMMENDATION ACTIVÉ pour marché: ${rule.market}`);
      }
    }

    // ÉTAPE 2: Filtrer les résultats - garder seulement les no_recommendation ou les autres marchés
    let filteredResults = results.filter(result => {
      if (result.action === 'no_recommendation') {
        return result.conditionsMet; // Garder toutes les no_recommendation qui correspondent
      }
      
      // Pour les autres actions, ne garder que celles des marchés sans no_recommendation
      if (noRecommendationMarkets.has(result.market)) {
        if (result.conditionsMet) {
          console.log(`🚫 IGNORÉ: ${result.ruleName} (marché ${result.market} a une règle no_recommendation active)`);
        }
        return false;
      }
      
      return result.conditionsMet;
    });

    console.log('🎯 RÉSULTAT FINAL:', filteredResults.length, 'règle(s) correspondent après filtrage:', 
      filteredResults.map(r => `${r.ruleName} (${r.action})`));

    // Sort by priority
    return filteredResults.sort((a, b) => a.priority - b.priority);
  }

  private evaluateConditions(
    conditions: Condition[], 
    connectors: LogicalConnector[], 
    context: RuleEvaluationContext,
    ruleMarket: Market
  ): boolean {
    if (conditions.length === 0) return false;
    if (conditions.length === 1) return this.evaluateCondition(conditions[0], context, ruleMarket);

    // VALIDATION: Vérifier que le nombre de connecteurs est correct
    const expectedConnectors = conditions.length - 1;
    if (connectors.length !== expectedConnectors) {
      console.log(`⚠️ ERREUR CONNECTEURS: ${connectors.length} connecteurs pour ${conditions.length} conditions (attendu: ${expectedConnectors})`);
      // Fallback sécurisé : utiliser AND par défaut pour les connecteurs manquants
      const safeConnectors = [...connectors];
      while (safeConnectors.length < expectedConnectors) {
        safeConnectors.push('AND');
      }
      connectors = safeConnectors.slice(0, expectedConnectors);
    }

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
    
    console.log(`    🔍 Condition: ${condition.type} ${condition.operator} ${condition.value}`, {
      contextValue,
      conditionType: condition.type,
      operator: condition.operator,
      expectedValue: condition.value,
      ruleMarket
    });
    
    if (contextValue === null || contextValue === undefined) {
      console.log(`    ❌ Valeur du contexte nulle/undefined pour ${condition.type}`);
      return false;
    }

    let result = false;
    switch (condition.operator) {
      case '>':
        result = contextValue > condition.value;
        break;
      case '<':
        result = contextValue < condition.value;
        break;
      case '=':
        result = Math.abs(contextValue - condition.value) < 0.01; // Float comparison
        break;
      case '!=':
        result = Math.abs(contextValue - condition.value) >= 0.01; // Float comparison for "not equal"
        break;
      case '>=':
        result = contextValue >= condition.value;
        break;
      case '<=':
        result = contextValue <= condition.value;
        break;
      case 'between':
        result = condition.valueMax !== undefined && 
               contextValue >= condition.value && 
               contextValue <= condition.valueMax;
        break;
      default:
        result = false;
    }
    
    console.log(`    ${result ? '✅' : '❌'} ${contextValue} ${condition.operator} ${condition.value} = ${result}`);
    return result;
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
      
      // Format plus lisible pour l'affichage utilisateur
      let conditionLabel = condition.type as string;
      if (condition.type === 'vigorish') {
        conditionLabel = `Vigorish ${rule.market.toUpperCase()}`;
      } else if (condition.type.startsWith('probability_')) {
        conditionLabel = condition.type.replace('probability_', 'Prob. ').replace('_', ' ');
      }
      
      // Formatage plus lisible des valeurs
      const displayValue = contextValue ? 
        (condition.type === 'vigorish' || condition.type.startsWith('probability_') ? 
          `${(contextValue * 100).toFixed(1)}%` : 
          contextValue.toFixed(2)) : 'N/A';
      
      const expectedValue = condition.type === 'vigorish' || condition.type.startsWith('probability_') ? 
        `${(condition.value * 100).toFixed(1)}%` : 
        condition.value.toString();
      
      details.push(
        `${conditionLabel}: ${displayValue} ${condition.operator} ${expectedValue} ${conditionMet ? '✓' : '✗'}`
      );
      
      if (i < rule.logicalConnectors.length) {
        details.push(rule.logicalConnectors[i]);
      }
    }
    
    return `${details.join(' ')} → ${conditionsMet ? 'RESPECTÉE' : 'NON RESPECTÉE'}`;
  }

  private getDefaultRules(): ConditionalRule[] {
    return [
      // PRIORITÉ 1: Règle anti-50/50 pour BTTS (empêche toute recommandation sur les marchés équilibrés)
      {
        id: 'anti-btts-5050',
        name: 'Anti-BTTS 50/50',
        market: 'btts',
        conditions: [{
          id: 'cond-1',
          type: 'probability_btts_yes',
          operator: 'between',
          value: 0.48,
          valueMax: 0.52 // Entre 48% et 52% = quasi 50/50
        }],
        logicalConnectors: [],
        action: 'no_recommendation',
        priority: 1,
        enabled: true
      },
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
        priority: 2,
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
        priority: 3,
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
        priority: 4,
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

// Export method to manually clear cache
export const clearRulesCache = () => {
  conditionalRulesService.clearCache();
  console.log('🗑️ Cache des règles manuellement vidé - règles mises à jour disponibles');
};