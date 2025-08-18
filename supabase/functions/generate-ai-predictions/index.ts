import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessedMatch {
  id: string;
  league: string;
  home_team: string;
  away_team: string;
  country?: string;
  kickoff_utc: string;
  kickoff_local: string;
  category: 'first_div' | 'second_div' | 'continental_cup' | 'national_cup';
  
  // Fair probabilities
  p_home_fair: number;
  p_draw_fair: number;
  p_away_fair: number;
  p_btts_yes_fair: number;
  p_btts_no_fair: number;
  p_over_2_5_fair: number;
  p_under_2_5_fair: number;
  
  // Vigorish
  vig_1x2: number;
  vig_btts: number;
  vig_ou_2_5: number;
  
  // Flags
  is_low_vig_1x2: boolean;
  watch_btts: boolean;
  watch_over25: boolean;
  
  // Original odds
  odds_home: number;
  odds_draw: number;
  odds_away: number;
  odds_btts_yes?: number;
  odds_btts_no?: number;
  odds_over_2_5?: number;
  odds_under_2_5?: number;
}

interface RuleEvaluationContext {
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
  odds_btts_yes: number | null;
  odds_btts_no: number | null;
  odds_over25: number | null;
  odds_under25: number | null;
}

interface ConditionalRule {
  id: string;
  name: string;
  market: string;
  conditions: Array<{
    type: string;
    operator: string;
    value: number;
    value2?: number;
  }>;
  logical_connectors: string[];
  action: string;
  priority: number;
  enabled: boolean;
}

interface RuleEvaluationResult {
  ruleName: string;
  market: string;
  action: string;
  priority: number;
  conditionsMet: boolean;
  evaluationDetails: string;
}

// Utilise UNIQUEMENT les règles conditionnelles configurées par l'utilisateur
async function generateAIRecommendationFromRules(match: ProcessedMatch): Promise<{ prediction: string; confidence: number } | null> {
  console.log('🎯 GÉNÉRATION IA AVEC RÈGLES STRICTES pour:', match.home_team, 'vs', match.away_team);
  
  try {
    // Appel au service de règles conditionnelles via API
    const context: RuleEvaluationContext = {
      vigorish_1x2: match.vig_1x2,
      vigorish_btts: match.vig_btts || 0,
      vigorish_ou25: match.vig_ou_2_5,
      probability_home: match.p_home_fair,
      probability_draw: match.p_draw_fair,
      probability_away: match.p_away_fair,
      probability_btts_yes: match.p_btts_yes_fair,
      probability_btts_no: match.p_btts_no_fair,
      probability_over25: match.p_over_2_5_fair,
      probability_under25: match.p_under_2_5_fair,
      odds_home: match.odds_home,
      odds_draw: match.odds_draw,
      odds_away: match.odds_away,
      odds_btts_yes: match.odds_btts_yes || null,
      odds_btts_no: match.odds_btts_no || null,
      odds_over25: match.odds_over_2_5 || null,
      odds_under25: match.odds_under_2_5 || null
    };

    // Récupérer et évaluer les règles conditionnelles
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: rules, error: rulesError } = await supabaseClient
      .from('conditional_rules')
      .select('*')
      .eq('enabled', true)
      .order('priority', { ascending: false });

    if (rulesError) {
      console.error('❌ Erreur récupération règles:', rulesError);
      return null;
    }

    if (!rules || rules.length === 0) {
      console.log('⚠️ AUCUNE RÈGLE CONFIGURÉE - Aucune recommandation');
      return null;
    }

    console.log('📋 RÈGLES DISPONIBLES:', rules.length);

    // Évaluer chaque règle
    const matchingRules: RuleEvaluationResult[] = [];

    for (const rule of rules) {
      const ruleResult = evaluateRule(rule, context);
      console.log(`📋 Règle "${rule.name}": ${ruleResult.conditionsMet ? '✅ MATCH' : '❌ NO MATCH'}`);
      
      if (ruleResult.conditionsMet) {
        matchingRules.push(ruleResult);
      }
    }

    // Filtrer les règles "no_recommendation" AVANT tout autre traitement
    const noRecommendationRules = matchingRules.filter(r => r.action === 'no_recommendation');
    if (noRecommendationRules.length > 0) {
      console.log('🚫 RÈGLE no_recommendation ACTIVE - Aucune recommandation:', noRecommendationRules[0].ruleName);
      return null;
    }

    // Garder seulement les vraies recommandations
    const validRules = matchingRules.filter(r => r.action !== 'no_recommendation');

    if (validRules.length === 0) {
      console.log('⚠️ AUCUNE RÈGLE NE CORRESPOND - Aucune recommandation');
      return null;
    }

    // Prendre la règle avec la plus haute priorité
    const bestRule = validRules.reduce((prev, current) => 
      current.priority > prev.priority ? current : prev
    );

    console.log('🎯 RÈGLE SÉLECTIONNÉE:', bestRule.ruleName, '- Action:', bestRule.action);

    // Convertir l'action en prédiction
    const prediction = convertActionToPrediction(bestRule, context);
    if (!prediction) {
      console.log('❌ Impossible de convertir l\'action en prédiction:', bestRule.action);
      return null;
    }

    // Calculer la confiance basée sur les probabilités
    const confidence = calculateConfidence(bestRule, context);

    console.log('✅ PRÉDICTION GÉNÉRÉE:', prediction, '- Confiance:', confidence);

    return {
      prediction,
      confidence
    };

  } catch (error) {
    console.error('❌ Erreur dans generateAIRecommendationFromRules:', error);
    return null;
  }
}

// Évalue une règle conditionnelle
function evaluateRule(rule: ConditionalRule, context: RuleEvaluationContext): RuleEvaluationResult {
  const conditions = rule.conditions || [];
  const connectors = rule.logical_connectors || [];
  
  if (conditions.length === 0) {
    return {
      ruleName: rule.name,
      market: rule.market,
      action: rule.action,
      priority: rule.priority,
      conditionsMet: false,
      evaluationDetails: 'Aucune condition définie'
    };
  }

  // Évaluer chaque condition
  const conditionResults = conditions.map(condition => {
    const value = getContextValue(condition.type, rule.market, context);
    return evaluateCondition(condition, value);
  });

  // Appliquer les connecteurs logiques
  let result = conditionResults[0];
  for (let i = 0; i < connectors.length && i + 1 < conditionResults.length; i++) {
    const connector = connectors[i];
    const nextResult = conditionResults[i + 1];
    
    if (connector === 'AND') {
      result = result && nextResult;
    } else if (connector === 'OR') {
      result = result || nextResult;
    }
  }

  return {
    ruleName: rule.name,
    market: rule.market,
    action: rule.action,
    priority: rule.priority,
    conditionsMet: result,
    evaluationDetails: `Conditions: ${conditionResults.map((r, i) => `${conditions[i].type}=${r}`).join(' ')}`
  };
}

// Évalue une condition individuelle
function evaluateCondition(condition: any, value: number): boolean {
  const { operator, value: conditionValue, value2 } = condition;
  
  switch (operator) {
    case '>':
      return value > conditionValue;
    case '<':
      return value < conditionValue;
    case '>=':
      return value >= conditionValue;
    case '<=':
      return value <= conditionValue;
    case '=':
      return Math.abs(value - conditionValue) < 0.001;
    case '!=':
      return Math.abs(value - conditionValue) >= 0.001;
    case 'between':
      return value >= conditionValue && value <= (value2 || conditionValue);
    case 'not_between':
      return !(value >= conditionValue && value <= (value2 || conditionValue));
    default:
      return false;
  }
}

// Récupère la valeur du contexte pour une condition
function getContextValue(conditionType: string, market: string, context: RuleEvaluationContext): number {
  // Convertir les vigorish en pourcentage si nécessaire
  const vigMultiplier = conditionType.includes('vigorish') ? 100 : 1;
  // Convertir les probabilités en pourcentage si nécessaire  
  const probMultiplier = conditionType.includes('probability') ? 100 : 1;

  switch (conditionType) {
    case 'vigorish':
      if (market === '1x2') return context.vigorish_1x2 * vigMultiplier;
      if (market === 'btts') return context.vigorish_btts * vigMultiplier;
      if (market === 'ou25') return context.vigorish_ou25 * vigMultiplier;
      return 0;
    
    case 'probability_home':
      return context.probability_home * probMultiplier;
    case 'probability_draw':
      return context.probability_draw * probMultiplier;
    case 'probability_away':
      return context.probability_away * probMultiplier;
    case 'probability_btts_yes':
      return context.probability_btts_yes * probMultiplier;
    case 'probability_btts_no':
      return context.probability_btts_no * probMultiplier;
    case 'probability_over25':
      return context.probability_over25 * probMultiplier;
    case 'probability_under25':
      return context.probability_under25 * probMultiplier;
    
    case 'odds_home':
      return context.odds_home;
    case 'odds_draw':
      return context.odds_draw;
    case 'odds_away':
      return context.odds_away;
    case 'odds_btts_yes':
      return context.odds_btts_yes || 0;
    case 'odds_btts_no':
      return context.odds_btts_no || 0;
    case 'odds_over25':
      return context.odds_over25 || 0;
    case 'odds_under25':
      return context.odds_under25 || 0;
    
    default:
      return 0;
  }
}

// Convertit une action de règle en prédiction lisible
function convertActionToPrediction(rule: RuleEvaluationResult, context: RuleEvaluationContext): string | null {
  const { action, market } = rule;

  switch (action) {
    case 'recommend_home':
      return '1X2 Victoire domicile';
    case 'recommend_draw':
      return '1X2 Match nul';
    case 'recommend_away':
      return '1X2 Victoire extérieur';
    case 'recommend_yes':
      return 'BTTS Oui';
    case 'recommend_no':
      return 'BTTS Non';
    case 'recommend_over':
      return 'OU 2.5 +2,5 buts';
    case 'recommend_under':
      return 'OU 2.5 -2,5 buts';
    case 'recommend_most_probable':
      return getMostProbablePrediction(market, context);
    case 'recommend_least_probable':
      return getLeastProbablePrediction(market, context);
    case 'recommend_double_chance_least_probable':
      return getDoubleChanceLeastProbable(context);
    case 'recommend_refund_if_draw':
      const mostProbableTeam = getMostProbableTeamExcludingDraw(context);
      return mostProbableTeam === 'home' ? '1X2 Victoire domicile (Remboursé si nul)' : '1X2 Victoire extérieur (Remboursé si nul)';
    default:
      return null;
  }
}

// Fonctions helper identiques à celles d'opportunityDetection.ts
function getMostProbablePrediction(market: string, context: RuleEvaluationContext): string {
  if (market === '1x2') {
    const highest = Math.max(context.probability_home, context.probability_draw, context.probability_away);
    if (highest === context.probability_home) return '1X2 Victoire domicile';
    if (highest === context.probability_away) return '1X2 Victoire extérieur';
    return '1X2 Match nul';
  }
  
  if (market === 'btts') {
    const probYes = context.probability_btts_yes || 0;
    const probNo = context.probability_btts_no || 0;
    return probYes > probNo ? 'BTTS Oui' : 'BTTS Non';
  }
  
  if (market === 'ou25') {
    const probOver = context.probability_over25 || 0;
    const probUnder = context.probability_under25 || 0;
    return probOver > probUnder ? 'OU 2.5 +2,5 buts' : 'OU 2.5 -2,5 buts';
  }
  
  return 'Unknown';
}

function getLeastProbablePrediction(market: string, context: RuleEvaluationContext): string {
  if (market === '1x2') {
    const lowest = Math.min(context.probability_home, context.probability_draw, context.probability_away);
    if (lowest === context.probability_home) return '1X2 Victoire domicile';
    if (lowest === context.probability_away) return '1X2 Victoire extérieur';
    return '1X2 Match nul';
  }
  
  if (market === 'btts') {
    const probYes = context.probability_btts_yes || 0;
    const probNo = context.probability_btts_no || 0;
    return probYes < probNo ? 'BTTS Oui' : 'BTTS Non';
  }
  
  if (market === 'ou25') {
    const probOver = context.probability_over25 || 0;
    const probUnder = context.probability_under25 || 0;
    return probOver < probUnder ? 'OU 2.5 +2,5 buts' : 'OU 2.5 -2,5 buts';
  }
  
  return 'Unknown';
}

function getDoubleChanceLeastProbable(context: RuleEvaluationContext): string {
  const outcomes = [
    { name: 'home', probability: context.probability_home },
    { name: 'draw', probability: context.probability_draw },
    { name: 'away', probability: context.probability_away }
  ];
  
  outcomes.sort((a, b) => a.probability - b.probability);
  
  const leastProbable1 = outcomes[0].name;
  const leastProbable2 = outcomes[1].name;
  const combination = `${leastProbable1}_${leastProbable2}`;
  
  switch (combination) {
    case 'home_draw':
    case 'draw_home':
      return '1X2 1X';
    case 'home_away':
    case 'away_home':
      return '1X2 12';
    case 'draw_away':
    case 'away_draw':
      return '1X2 X2';
    default:
      return '1X2 1X';
  }
}

function getMostProbableTeamExcludingDraw(context: RuleEvaluationContext): 'home' | 'away' {
  return context.probability_home > context.probability_away ? 'home' : 'away';
}

function calculateConfidence(rule: RuleEvaluationResult, context: RuleEvaluationContext): number {
  // Confiance basée sur la probabilité la plus élevée du marché
  let maxProbability = 0;
  
  if (rule.market === '1x2') {
    maxProbability = Math.max(context.probability_home, context.probability_draw, context.probability_away);
  } else if (rule.market === 'btts') {
    maxProbability = Math.max(context.probability_btts_yes, context.probability_btts_no);
  } else if (rule.market === 'ou25') {
    maxProbability = Math.max(context.probability_over25, context.probability_under25);
  }
  
  // Ajuster la confiance selon la priorité de la règle
  const priorityBonus = Math.min(rule.priority / 10, 0.2); // Max 20% bonus
  
  return Math.min(maxProbability + priorityBonus, 1.0);
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { matchIds, dateStart, dateEnd, filterType } = await req.json();
    
    console.log('🤖 Génération des prédictions IA pour', filterType || 'défaut', 'filtrage');

    // Récupérer les matchs à traiter
    let query = supabaseClient
      .from('matches')
      .select('*');
    
    // Appliquer le filtrage selon le type
    if (matchIds && matchIds.length > 0) {
      query = query.in('id', matchIds);
    } else {
      // Si pas d'IDs spécifiés, traiter les matchs selon le type de filtre
      query = query.is('ai_prediction', null);
      
      // Appliquer les filtres de date selon le type
      if (filterType === 'today') {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        
        query = query
          .gte('kickoff_utc', startOfDay.toISOString())
          .lt('kickoff_utc', endOfDay.toISOString());
        
        console.log('📅 Filtrage pour aujourd\'hui:', startOfDay.toISOString(), 'à', endOfDay.toISOString());
      } else if (filterType === 'range' && dateStart && dateEnd) {
        const startDate = new Date(dateStart);
        const endDate = new Date(dateEnd);
        
        // Ajuster les heures pour inclure toute la journée
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        
        query = query
          .gte('kickoff_utc', startDate.toISOString())
          .lte('kickoff_utc', endDate.toISOString());
        
        console.log('📅 Filtrage par plage:', startDate.toISOString(), 'à', endDate.toISOString());
      }
      // Pour 'all', pas de filtre de date supplémentaire
    }

    const { data: matches, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ Erreur lors de la récupération des matchs:', fetchError);
      throw fetchError;
    }

    console.log('📊 Matchs récupérés:', matches?.length || 0);

    if (!matches || matches.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Aucun match à traiter',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Générer les prédictions pour chaque match
    const updates = [];
    let processed = 0;

    for (const match of matches) {
      try {
        // Convertir le match en format ProcessedMatch
        const processedMatch: ProcessedMatch = {
          id: match.id,
          league: match.league,
          home_team: match.home_team,
          away_team: match.away_team,
          country: match.country,
          kickoff_utc: match.kickoff_utc,
          kickoff_local: match.kickoff_local,
          category: match.category,
          p_home_fair: Number(match.p_home_fair),
          p_draw_fair: Number(match.p_draw_fair),
          p_away_fair: Number(match.p_away_fair),
          p_btts_yes_fair: Number(match.p_btts_yes_fair),
          p_btts_no_fair: Number(match.p_btts_no_fair),
          p_over_2_5_fair: Number(match.p_over_2_5_fair),
          p_under_2_5_fair: Number(match.p_under_2_5_fair),
          vig_1x2: Number(match.vig_1x2),
          vig_btts: Number(match.vig_btts),
          vig_ou_2_5: Number(match.vig_ou_2_5),
          is_low_vig_1x2: match.is_low_vig_1x2,
          watch_btts: match.watch_btts,
          watch_over25: match.watch_over25,
          odds_home: Number(match.odds_home),
          odds_draw: Number(match.odds_draw),
          odds_away: Number(match.odds_away),
          odds_btts_yes: match.odds_btts_yes ? Number(match.odds_btts_yes) : undefined,
          odds_btts_no: match.odds_btts_no ? Number(match.odds_btts_no) : undefined,
          odds_over_2_5: match.odds_over_2_5 ? Number(match.odds_over_2_5) : undefined,
          odds_under_2_5: match.odds_under_2_5 ? Number(match.odds_under_2_5) : undefined,
        };

        // Générer la prédiction IA UNIQUEMENT via les règles configurées
        const aiRecommendation = await generateAIRecommendationFromRules(processedMatch);
        
        if (aiRecommendation) {
          updates.push({
            id: match.id,
            ai_prediction: aiRecommendation.prediction,
            ai_confidence: aiRecommendation.confidence
          });
          processed++;
          console.log(`✅ Prédiction générée pour ${match.home_team} vs ${match.away_team}: ${aiRecommendation.prediction} (${(aiRecommendation.confidence * 100).toFixed(0)}%)`);
        } else {
          console.log(`⚠️ Aucune prédiction générée pour ${match.home_team} vs ${match.away_team}`);
        }
      } catch (error) {
        console.error(`❌ Erreur lors de la génération pour ${match.home_team} vs ${match.away_team}:`, error);
      }
    }

    // Mettre à jour les matchs avec les prédictions IA
    if (updates.length > 0) {
      console.log('💾 Sauvegarde des prédictions IA pour', updates.length, 'matchs');
      
      for (const update of updates) {
        const { error: updateError } = await supabaseClient
          .from('matches')
          .update({
            ai_prediction: update.ai_prediction,
            ai_confidence: update.ai_confidence
          })
          .eq('id', update.id);

        if (updateError) {
          console.error('❌ Erreur lors de la mise à jour du match:', update.id, updateError);
        }
      }
    }

    console.log('🎉 Génération des prédictions IA terminée:', processed, 'prédictions générées');

    return new Response(JSON.stringify({ 
      success: true, 
      processed,
      total: matches.length,
      message: `${processed} prédictions IA générées avec succès`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Erreur dans generate-ai-predictions:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});