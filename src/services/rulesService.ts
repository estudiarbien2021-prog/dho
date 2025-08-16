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
      // Règles générales
      ['min_odds', 1.5],
      ['min_probability', 45],
      ['high_vigorish_threshold', 8.1],
      ['low_vigorish_threshold', 6],
      ['high_probability_threshold', 58],
      ['equality_tolerance', 1],
      ['exclude_incomplete_data', 1],
      ['max_recommendations', 2],
      
      // Over/Under 2.5 Goals
      ['ou_min_odds', 1.5],
      ['ou_min_probability', 45],
      ['ou_high_vigorish_threshold', 8.1],
      ['ou_low_vigorish_threshold', 6],
      ['ou_high_probability_threshold', 58],
      ['ou_inverted_opportunities_enabled', 1],
      ['ou_direct_recommendations_enabled', 1],
      ['ou_high_probability_exception_enabled', 1],
      
      // Both Teams To Score (BTTS)
      ['btts_min_odds', 1.5],
      ['btts_min_probability', 45],
      ['btts_high_vigorish_threshold', 8.1],
      ['btts_low_vigorish_threshold', 6],
      ['btts_high_probability_threshold', 58],
      ['btts_inverted_opportunities_enabled', 1],
      ['btts_direct_recommendations_enabled', 1],
      ['btts_high_probability_exception_enabled', 1],
      
      // 1X2 Market
      ['1x2_min_odds', 1.5],
      ['1x2_min_probability', 45],
      ['1x2_high_vigorish_threshold', 8.1],
      ['1x2_low_vigorish_threshold', 6],
      ['1x2_high_probability_threshold', 58],
      ['1x2_inverted_opportunities_enabled', 1],
      ['1x2_direct_recommendations_enabled', 1],
      ['1x2_high_probability_exception_enabled', 1],
      
      // Double Chance specific rules
      ['double_chance_enabled', 1],
      ['double_chance_vigorish_threshold', 10],
      ['double_chance_max_probability', 65]
    ]);

    this.rules = defaultRules;
    return defaultRules;
  }

  private getDefaultValue(ruleName: string): number {
    const defaults: Record<string, number> = {
      // Règles générales
      'min_odds': 1.5,
      'min_probability': 45,
      'high_vigorish_threshold': 8.1,
      'low_vigorish_threshold': 6,
      'high_probability_threshold': 58,
      'equality_tolerance': 1,
      'exclude_incomplete_data': 1,
      'max_recommendations': 2,
      
      // Over/Under 2.5 Goals
      'ou_min_odds': 1.5,
      'ou_min_probability': 45,
      'ou_high_vigorish_threshold': 8.1,
      'ou_low_vigorish_threshold': 6,
      'ou_high_probability_threshold': 58,
      'ou_inverted_opportunities_enabled': 1,
      'ou_direct_recommendations_enabled': 1,
      'ou_high_probability_exception_enabled': 1,
      
      // Both Teams To Score (BTTS)
      'btts_min_odds': 1.5,
      'btts_min_probability': 45,
      'btts_high_vigorish_threshold': 8.1,
      'btts_low_vigorish_threshold': 6,
      'btts_high_probability_threshold': 58,
      'btts_inverted_opportunities_enabled': 1,
      'btts_direct_recommendations_enabled': 1,
      'btts_high_probability_exception_enabled': 1,
      
      // 1X2 Market
      '1x2_min_odds': 1.5,
      '1x2_min_probability': 45,
      '1x2_high_vigorish_threshold': 8.1,
      '1x2_low_vigorish_threshold': 6,
      '1x2_high_probability_threshold': 58,
      '1x2_inverted_opportunities_enabled': 1,
      '1x2_direct_recommendations_enabled': 1,
      '1x2_high_probability_exception_enabled': 1,
      
      // Double Chance specific rules
      'double_chance_enabled': 1,
      'double_chance_vigorish_threshold': 10,
      'double_chance_max_probability': 65
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

  // Get market-specific rules
  async getMarketRules(market: 'ou' | 'btts' | '1x2'): Promise<{
    minOdds: number;
    minProbability: number;
    highVigorishThreshold: number;
    lowVigorishThreshold: number;
    highProbabilityThreshold: number;
    invertedOpportunitiesEnabled: boolean;
    directRecommendationsEnabled: boolean;
    highProbabilityExceptionEnabled: boolean;
  }> {
    const rules = await this.getRules();
    
    return {
      minOdds: rules.get(`${market}_min_odds`) ?? this.getDefaultValue(`${market}_min_odds`),
      minProbability: rules.get(`${market}_min_probability`) ?? this.getDefaultValue(`${market}_min_probability`),
      highVigorishThreshold: rules.get(`${market}_high_vigorish_threshold`) ?? this.getDefaultValue(`${market}_high_vigorish_threshold`),
      lowVigorishThreshold: rules.get(`${market}_low_vigorish_threshold`) ?? this.getDefaultValue(`${market}_low_vigorish_threshold`),
      highProbabilityThreshold: rules.get(`${market}_high_probability_threshold`) ?? this.getDefaultValue(`${market}_high_probability_threshold`),
      invertedOpportunitiesEnabled: (rules.get(`${market}_inverted_opportunities_enabled`) ?? this.getDefaultValue(`${market}_inverted_opportunities_enabled`)) === 1,
      directRecommendationsEnabled: (rules.get(`${market}_direct_recommendations_enabled`) ?? this.getDefaultValue(`${market}_direct_recommendations_enabled`)) === 1,
      highProbabilityExceptionEnabled: (rules.get(`${market}_high_probability_exception_enabled`) ?? this.getDefaultValue(`${market}_high_probability_exception_enabled`)) === 1
    };
  }
}

export const rulesService = new RulesService();