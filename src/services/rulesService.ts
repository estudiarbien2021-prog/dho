import { supabase } from '@/integrations/supabase/client';

interface Rule {
  rule_name: string;
  value: number;
  type: 'threshold' | 'boolean' | 'percentage';
  category: string;
}

class RulesService {
  private rules: Map<string, number> = new Map();
  private lastFetch: number = 0;
  private cacheDuration = 5 * 60 * 1000; // 5 minutes cache

  async getRules(): Promise<Map<string, number>> {
    const now = Date.now();
    
    // Return cached rules if still fresh
    if (this.rules.size > 0 && now - this.lastFetch < this.cacheDuration) {
      return this.rules;
    }

    try {
      const { data, error } = await supabase
        .from('recommendation_rules')
        .select('rule_name, value, type');

      if (error) {
        console.error('Error fetching rules:', error);
        // Return default rules if fetch fails
        return this.getDefaultRules();
      }

      // Clear and update cache
      this.rules.clear();
      data?.forEach((rule: Rule) => {
        this.rules.set(rule.rule_name, rule.value);
      });

      this.lastFetch = now;
      return this.rules;
    } catch (error) {
      console.error('Failed to fetch rules:', error);
      return this.getDefaultRules();
    }
  }

  async getRule(ruleName: string): Promise<number> {
    const rules = await this.getRules();
    return rules.get(ruleName) ?? this.getDefaultValue(ruleName);
  }

  private getDefaultRules(): Map<string, number> {
    const defaultRules = new Map([
      ['min_odds', 1.5],
      ['min_probability', 45],
      ['high_vigorish_threshold', 8.1],
      ['low_vigorish_threshold', 6],
      ['high_probability_threshold', 58],
      ['double_chance_vigorish_threshold', 10],
      ['double_chance_enabled', 1],
      ['double_chance_max_probability', 65],
      ['inverted_opportunities_enabled', 1],
      ['direct_recommendations_enabled', 1],
      ['high_probability_exception_enabled', 1],
      ['equality_tolerance', 1],
      ['exclude_incomplete_data', 1],
      ['max_recommendations', 2]
    ]);

    this.rules = defaultRules;
    return defaultRules;
  }

  private getDefaultValue(ruleName: string): number {
    const defaults: Record<string, number> = {
      'min_odds': 1.5,
      'min_probability': 45,
      'high_vigorish_threshold': 8.1,
      'low_vigorish_threshold': 6,
      'high_probability_threshold': 58,
      'double_chance_vigorish_threshold': 10,
      'double_chance_enabled': 1,
      'double_chance_max_probability': 65,
      'inverted_opportunities_enabled': 1,
      'direct_recommendations_enabled': 1,
      'high_probability_exception_enabled': 1,
      'equality_tolerance': 1,
      'exclude_incomplete_data': 1,
      'max_recommendations': 2
    };

    return defaults[ruleName] ?? 0;
  }

  // Clear cache to force refresh
  clearCache(): void {
    this.rules.clear();
    this.lastFetch = 0;
  }

  // Helper methods for boolean rules
  async isRuleEnabled(ruleName: string): Promise<boolean> {
    const value = await this.getRule(ruleName);
    return value === 1;
  }
}

export const rulesService = new RulesService();