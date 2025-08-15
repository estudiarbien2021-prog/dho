// Poisson/Dixon-Coles model for football score prediction

export interface PoissonInputs {
  p_home_fair: number;
  p_draw_fair: number;
  p_away_fair: number;
  p_btts_yes_fair: number;
  p_over_2_5_fair: number;
}

export interface PoissonResult {
  lambda_home: number;
  lambda_away: number;
  rho: number;
  top_scores: Array<{ home: number; away: number; prob: number }>;
  prob_u3_5: number;
  prob_1x2: { home: number; draw: number; away: number };
  prob_btts: { yes: number; no: number };
  prob_ou: { over: number; under: number };
}

// Dixon-Coles correlation parameter estimation
function estimateRho(pHome: number, pDraw: number, pAway: number): number {
  // Simplified rho estimation based on draw probability
  // Higher draw probability suggests lower scoring games
  if (pDraw > 0.28) return 0.15; // High draw probability
  if (pDraw > 0.24) return 0.10; // Medium draw probability
  return 0.05; // Low draw probability
}

// Estimate lambda parameters from market probabilities with BTTS and O/U constraints
function estimateLambdas(pHome: number, pDraw: number, pAway: number, pBttsYes: number = 0.5, pOver25: number = 0.5): { lambdaHome: number; lambdaAway: number } {
  // Convert market probabilities to expected goals using empirical relationships
  // Enhanced with BTTS and O/U 2.5 constraints
  
  const totalProb = pHome + pDraw + pAway;
  const normalizedHome = pHome / totalProb;
  const normalizedDraw = pDraw / totalProb;
  const normalizedAway = pAway / totalProb;
  
  // Expected total goals based on O/U 2.5 probability
  // If pOver25 > 0.6, expect higher scoring game
  // If pOver25 < 0.4, expect lower scoring game
  let expectedTotal = 2.5; // neutral baseline
  if (pOver25 > 0.6) {
    expectedTotal = 2.5 + (pOver25 - 0.5) * 2; // Up to 3.5 goals for very high O/U prob
  } else if (pOver25 < 0.4) {
    expectedTotal = 2.5 - (0.5 - pOver25) * 2; // Down to 1.5 goals for very low O/U prob
  }
  
  // Adjust for BTTS probability
  // High BTTS means both teams likely to score, affects distribution
  const bttsAdjustment = pBttsYes > 0.6 ? 1.1 : (pBttsYes < 0.4 ? 0.9 : 1.0);
  
  // Home advantage factor (typically 1.3-1.4)
  const homeAdvantage = 1.35;
  
  // Calculate lambdas based on win probabilities and total expected goals
  const ratio = normalizedHome / normalizedAway;
  let lambdaAway = expectedTotal / (homeAdvantage * ratio + 1);
  let lambdaHome = lambdaAway * homeAdvantage * ratio;
  
  // Apply BTTS adjustment - if high BTTS, ensure both lambdas are reasonably high
  if (pBttsYes > 0.6) {
    lambdaHome = Math.max(lambdaHome, 1.0) * bttsAdjustment;
    lambdaAway = Math.max(lambdaAway, 1.0) * bttsAdjustment;
  }
  
  return {
    lambdaHome: Math.max(0.5, Math.min(4.0, lambdaHome)),
    lambdaAway: Math.max(0.5, Math.min(4.0, lambdaAway))
  };
}

// Poisson probability mass function
function poissonPmf(k: number, lambda: number): number {
  if (k < 0) return 0;
  if (lambda <= 0) return k === 0 ? 1 : 0;
  
  let result = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) {
    result *= lambda / i;
  }
  return result;
}

// Dixon-Coles adjustment factor
function dixonColesAdjustment(homeGoals: number, awayGoals: number, lambdaHome: number, lambdaAway: number, rho: number): number {
  if (homeGoals > 1 || awayGoals > 1) return 1;
  
  const tau = lambdaHome * lambdaAway;
  
  if (homeGoals === 0 && awayGoals === 0) {
    return 1 - rho * tau;
  } else if (homeGoals === 0 && awayGoals === 1) {
    return 1 + rho * lambdaHome;
  } else if (homeGoals === 1 && awayGoals === 0) {
    return 1 + rho * lambdaAway;
  } else if (homeGoals === 1 && awayGoals === 1) {
    return 1 - rho;
  }
  
  return 1;
}

// Calculate score probability with Dixon-Coles adjustment
function scoreProb(homeGoals: number, awayGoals: number, lambdaHome: number, lambdaAway: number, rho: number): number {
  const basicProb = poissonPmf(homeGoals, lambdaHome) * poissonPmf(awayGoals, lambdaAway);
  const adjustment = dixonColesAdjustment(homeGoals, awayGoals, lambdaHome, lambdaAway, rho);
  return basicProb * adjustment;
}

export function calculatePoisson(inputs: PoissonInputs): PoissonResult {
  const { p_home_fair, p_draw_fair, p_away_fair, p_btts_yes_fair, p_over_2_5_fair } = inputs;
  
  // Estimate model parameters with BTTS and O/U constraints
  const { lambdaHome, lambdaAway } = estimateLambdas(p_home_fair, p_draw_fair, p_away_fair, p_btts_yes_fair, p_over_2_5_fair);
  const rho = estimateRho(p_home_fair, p_draw_fair, p_away_fair);
  
  // Calculate all score probabilities up to 6-6
  const maxGoals = 6;
  const scoreProbs: Array<{ home: number; away: number; prob: number }> = [];
  
  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      const prob = scoreProb(h, a, lambdaHome, lambdaAway, rho);
      scoreProbs.push({ home: h, away: a, prob });
    }
  }
  
  // Sort by probability and get top 5
  const topScores = scoreProbs
    .sort((a, b) => b.prob - a.prob)
    .slice(0, 5);
  
  // Calculate market probabilities from model
  let probHome = 0, probDraw = 0, probAway = 0;
  let probBttsYes = 0, probOver25 = 0;
  let probU35 = 0;
  
  for (const score of scoreProbs) {
    const { home, away, prob } = score;
    
    // 1X2 probabilities
    if (home > away) probHome += prob;
    else if (home === away) probDraw += prob;
    else probAway += prob;
    
    // BTTS probabilities
    if (home > 0 && away > 0) probBttsYes += prob;
    
    // Over/Under 2.5 probabilities
    if (home + away > 2.5) probOver25 += prob;
    
    // Under 3.5 probability
    if (home + away < 3.5) probU35 += prob;
  }
  
  return {
    lambda_home: lambdaHome,
    lambda_away: lambdaAway,
    rho,
    top_scores: topScores,
    prob_u3_5: probU35,
    prob_1x2: {
      home: probHome,
      draw: probDraw,
      away: probAway
    },
    prob_btts: {
      yes: probBttsYes,
      no: 1 - probBttsYes
    },
    prob_ou: {
      over: probOver25,
      under: 1 - probOver25
    }
  };
}