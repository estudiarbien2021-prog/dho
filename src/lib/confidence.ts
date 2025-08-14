// Shared confidence score logic for consistent values across components
export function generateConfidenceScore(matchId: string, recommendation?: any): string {
  console.log('generateConfidenceScore called with:', { 
    matchId, 
    recommendation: recommendation ? {
      type: recommendation.type,
      prediction: recommendation.prediction,
      confidence: recommendation.confidence
    } : null
  });

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

  // Handle confidence score properly - always use deterministic scoring for consistency
  // This ensures each match has a unique confidence score based on its ID
  const confidence = (70 + seededRandom(matchSeed, 2) * 19.5).toFixed(1); // Seeded between 70-89.5

  console.log('generateConfidenceScore result:', confidence);
  return confidence;
}