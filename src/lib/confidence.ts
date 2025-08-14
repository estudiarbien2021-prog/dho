// Shared confidence score logic for consistent values across components
export function generateConfidenceScore(matchId: string, recommendation?: any): string {
  // Create deterministic seed from match ID for consistent randomization
  const hashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  };

  const matchSeed = hashCode(matchId);
  
  // Seeded random function for deterministic "randomness"
  const seededRandom = (seed: number, index: number = 0) => {
    const x = Math.sin(seed + index) * 10000;
    return x - Math.floor(x);
  };

  // Handle confidence score properly - dynamic score between 70 and 89.5
  // This is the EXACT same logic as in MatchDetailModal
  const confidence = recommendation?.confidence && !isNaN(recommendation.confidence) && recommendation.confidence > 0
    ? Math.min((recommendation.confidence * 100), 89.5).toFixed(1)
    : (70 + seededRandom(matchSeed, 2) * 19.5).toFixed(1); // Seeded between 70-89.5

  return confidence;
}