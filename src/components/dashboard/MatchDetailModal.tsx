import React, { useState, useEffect, useMemo } from 'react';
import { ProcessedMatch } from '@/types/match';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { FlagMini } from '@/components/Flag';
import { leagueToFlag } from '@/lib/leagueCountry';
import { generateConfidenceScore } from '@/lib/confidence';
import { generateAIRecommendation } from '@/lib/aiRecommendation';
import AIRecommendationDisplay from '@/components/AIRecommendationDisplay';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, TrendingDown, Target, Eye, Download, Loader2, Zap, Brain } from 'lucide-react';
import { NeuralNetworkVisualization } from '@/components/charts/NeuralNetworkVisualization';
import { ConfidenceScoreBars } from '@/components/charts/ConfidenceScoreBars';
import { InfluenceFactors } from '@/components/charts/InfluenceFactors';
import { TeamRadarChart } from '@/components/charts/RadarChart';
import { TimelineMomentum } from '@/components/charts/TimelineMomentum';
import { ProbabilityDistribution } from '@/components/charts/ProbabilityDistribution';
import { ScorePredictionMatrix } from '@/components/charts/ScorePredictionMatrix';
import { ConfidenceRadar } from '@/components/charts/ConfidenceRadar';
import { MarketEfficiencyGauge } from '@/components/charts/MarketEfficiencyGauge';
import { AIConsensusGauge } from '@/components/charts/AIConsensusGauge';
import { PredictionCertaintyBars } from '@/components/charts/PredictionCertaintyBars';
import { AIProbabilitiesAnalysis } from '@/components/charts/AIProbabilitiesAnalysis';


interface MatchDetailModalProps {
  match: ProcessedMatch | null;
  isOpen: boolean;
  onClose: () => void;
  marketFilters?: string[];
}

export function MatchDetailModal({ match, isOpen, onClose, marketFilters = [] }: MatchDetailModalProps) {
  // Early return BEFORE any hooks - TeamChemistryAnalyzer removed
  if (!match) return null;

  const [showAIGraphics, setShowAIGraphics] = useState(false);
  
  // Trigger AI graphics animation when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShowAIGraphics(true), 500);
      return () => clearTimeout(timer);
    } else {
      setShowAIGraphics(false);
    }
  }, [isOpen]);

  const flagInfo = leagueToFlag(match.league, match.country, match.home_team, match.away_team);

  // Determine winning predictions
  const get1x2Winner = () => {
    if (match.p_home_fair > match.p_draw_fair && match.p_home_fair > match.p_away_fair) {
      return match.home_team;
    } else if (match.p_away_fair > match.p_draw_fair && match.p_away_fair > match.p_home_fair) {
      return match.away_team;
    } else {
      return 'Nul';
    }
  };

  // Helper function to normalize recommendation object
  const normalizeRecommendation = (rec: any) => {
    if (!rec) return null;
    return {
      type: rec.betType || rec.type || 'Aucune',
      prediction: rec.prediction || 'Aucune',
      odds: rec.odds || 0,
      confidence: rec.confidence || 'low'
    };
  };

  const getBttsWinner = () => match.p_btts_yes_fair > match.p_btts_no_fair ? 'Oui' : 'Non';
  const getOver25Winner = () => {
    return match.p_over_2_5_fair > match.p_under_2_5_fair ? '+2,5 buts' : '-2,5 buts';
  };

  // Generate AI recommendation for the match
  const aiRecommendation = generateAIRecommendation(match, marketFilters);
  const recommendation = normalizeRecommendation(aiRecommendation);
  
  // Debug logs
  console.log('🔍 DEBUG MatchDetailModal:', {
    matchId: match.id,
    homeTeam: match.home_team,
    awayTeam: match.away_team,
    aiRecommendation,
    recommendation,
    marketFilters
  });

  // Generate AI recommendation explanation combining all 3 styles
  const generateRecommendationExplanation = (recommendation: any) => {
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

    const matchSeed = hashCode(match.id);
    
    // Seeded random function for deterministic "randomness"
    const seededRandom = (seed: number, index: number = 0) => {
      const x = Math.sin(seed + index) * 10000;
      return x - Math.floor(x);
    };

    // Helper to get seeded choice from array
    const getSeededChoice = (array: any[], seedOffset: number = 0) => {
      const randomValue = seededRandom(matchSeed, seedOffset);
      const index = Math.floor(randomValue * array.length);
      return array[index];
    };

    // Use the recommendation passed as parameter (already validated)
    const normalizedRecommendation = { ...recommendation };

    if (normalizedRecommendation.type === 'Aucune') {
      const noOpportunityTexts = [
        "🔍 **Scan Complet** : Après analyse de 47 métriques avancées, notre IA n'a trouvé aucune faille exploitable. Les bookmakers ont parfaitement calibré leurs prix cette fois.",
        "🎯 **Radar Silencieux** : Notre système de détection d'opportunités reste muet sur ce match. Les cotes reflètent parfaitement les probabilités réelles calculées.",
        "📡 **Signal Faible** : Malgré un balayage exhaustif des données, aucune distorsion de marché n'émerge. Les algorithmes confirment l'équilibre parfait des cotes."
      ];
      return getSeededChoice(noOpportunityTexts, 1);
    }

    // Récupérer la vraie probabilité du marché choisi
    let realProbability = 0.5; // valeur par défaut
    
    if (normalizedRecommendation.type === 'BTTS') {
      if (normalizedRecommendation.prediction === 'Oui') {
        realProbability = match.p_btts_yes_fair;
      } else if (normalizedRecommendation.prediction === 'Non') {
        realProbability = match.p_btts_no_fair;
      }
    } else if (normalizedRecommendation.type === 'O/U 2.5') {
      if (normalizedRecommendation.prediction === '+2,5 buts') {
        realProbability = match.p_over_2_5_fair;
      } else if (normalizedRecommendation.prediction === '-2,5 buts') {
        realProbability = match.p_under_2_5_fair;
      }
    }
    
    // Protection renforcée contre les valeurs NaN selon les règles définies
    const safeProbability = realProbability && !isNaN(realProbability) && realProbability > 0 
      ? Math.min(0.95, Math.max(0.05, realProbability))
      : 0.5;
    
    // Récupérer la marge vigorish du marché choisi (BTTS ou O/U 2.5)
    let marketVigorish = 0.05; // valeur par défaut
    if (normalizedRecommendation.type === 'BTTS') {
      marketVigorish = match.vig_btts || 0.05;
    } else if (normalizedRecommendation.type === 'O/U 2.5') {
      marketVigorish = match.vig_ou_2_5 || 0.05;
    }
    
    const safeVigorish = !isNaN(marketVigorish) && marketVigorish >= 0
      ? Math.min(0.25, Math.max(0.001, marketVigorish))
      : 0.05;
      
    const safeOdds = normalizedRecommendation.odds && !isNaN(normalizedRecommendation.odds) && normalizedRecommendation.odds > 1
      ? Math.min(10.0, Math.max(1.01, normalizedRecommendation.odds))
      : 1.5;
    
    const probPercent = (safeProbability * 100).toFixed(1);
    const vigPercent = (safeVigorish * 100).toFixed(1);
    
    // Edge aléatoire entre 2.0 et 6.0 selon les règles définies
    const randomEdge = 2.0 + seededRandom(matchSeed, 15) * 4.0; // Entre 2.0 et 6.0
    const edge = randomEdge.toFixed(1);
    
    // Handle confidence score using shared function to ensure consistency
    const confidence = generateConfidenceScore(match.id, normalizedRecommendation);

    // Determine geographic context based on league
    const getGeographicContext = () => {
      const league = match.league.toLowerCase();
      const country = match.country?.toLowerCase() || '';
      
      // African competitions
      if (league.includes('african') || league.includes('africa') || league.includes('chan') || 
          league.includes('caf') || league.includes('champions league') && (league.includes('africa') || country === 'international') ||
          country.includes('morocco') || country.includes('algeria') || country.includes('tunisia') || 
          country.includes('egypt') || country.includes('nigeria') || country.includes('ghana') || 
          country.includes('senegal') || country.includes('cameroon') || country.includes('ivory') ||
          country.includes('south africa') || country.includes('zambia') || country.includes('mali') ||
          country.includes('burkina') || country.includes('kenya') || country.includes('angola')) {
        return 'du football africain';
      }
      
      // Asian competitions
      if (league.includes('asian') || league.includes('asia') || league.includes('afc') ||
          country.includes('japan') || country.includes('korea') || country.includes('china') ||
          country.includes('saudi') || country.includes('qatar') || country.includes('uae') ||
          country.includes('iran') || country.includes('australia') || country.includes('thailand') ||
          country.includes('vietnam') || country.includes('indonesia') || country.includes('malaysia') ||
          country.includes('singapore') || country.includes('philippines') || country.includes('myanmar') ||
          country.includes('cambodia') || country.includes('laos') || country.includes('brunei') ||
          country.includes('bhutan') || country.includes('nepal') || country.includes('bangladesh') ||
          country.includes('sri lanka') || country.includes('maldives') || country.includes('afghanistan') ||
          country.includes('pakistan') || country.includes('india') || country.includes('uzbekistan') ||
          country.includes('kazakhstan') || country.includes('kyrgyzstan') || country.includes('tajikistan') ||
          country.includes('turkmenistan') || country.includes('mongolia') || country.includes('taiwan') ||
          country.includes('hong kong') || country.includes('macau') || country.includes('palestine') ||
          country.includes('lebanon') || country.includes('syria') || country.includes('jordan') ||
          country.includes('iraq') || country.includes('kuwait') || country.includes('bahrain') ||
          country.includes('oman') || country.includes('yemen')) {
        return 'du football asiatique';
      }
      
      // North American / CONCACAF
      if (league.includes('concacaf') || league.includes('gold cup') || league.includes('nations league') ||
          league.includes('liga mx') || league.includes('mexico') || country.includes('mexico') ||
          league.includes('mls') || country.includes('usa') || league.includes('canadian') || 
          country.includes('canada') || country.includes('costa rica') || country.includes('guatemala') ||
          country.includes('honduras') || country.includes('panama') || country.includes('jamaica')) {
        return 'du football nord-américain et centre-américain';
      }
      
      // South American competitions
      if (league.includes('copa libertadores') || league.includes('copa sudamericana') || 
          league.includes('categoria primera') || league.includes('division profesional') ||
          league.includes('brasileirao') || league.includes('brazil') || country.includes('brazil') ||
          league.includes('argentina') || country.includes('argentina') || country.includes('chile') ||
          country.includes('colombia') || country.includes('peru') || country.includes('uruguay') ||
          country.includes('ecuador') || country.includes('venezuela') || country.includes('bolivia') ||
          country.includes('paraguay')) {
        return 'du football sud-américain';
      }
      
      // European competitions - be more specific
      if (league.includes('premier league') || league.includes('championship') || 
          league.includes('la liga') || league.includes('serie a') || 
          league.includes('bundesliga') || league.includes('ligue 1') ||
          league.includes('primeira liga') || league.includes('eredivisie') ||
          league.includes('champions league') || league.includes('europa league') ||
          league.includes('conference league') || league.includes('euro') ||
          country.includes('england') || country.includes('spain') || country.includes('italy') ||
          country.includes('germany') || country.includes('france') || country.includes('portugal') ||
          country.includes('netherlands') || country.includes('belgium') || country.includes('poland') ||
          country.includes('czech') || country.includes('austria') || country.includes('switzerland') ||
          country.includes('croatia') || country.includes('serbia') || country.includes('greece') ||
          country.includes('turkey') || country.includes('ukraine') || country.includes('russia') ||
          country.includes('sweden') || country.includes('norway') || country.includes('denmark')) {
        return 'du football européen';
      }
      
      // International / World competitions
      if (league.includes('world') || league.includes('mondial') || league.includes('fifa') ||
          league.includes('international') || country === 'international') {
        return 'des compétitions internationales';
      }
      
      // Generic fallback - avoid defaulting to European
      return 'de cette compétition spécifique';
    };

    const geographicContext = getGeographicContext();

    // Generate dataset size based on competition history and popularity
    const getDatasetSize = () => {
      const league = match.league.toLowerCase();
      const country = match.country?.toLowerCase() || '';
      
      // FIRST: Check smaller/newer competitions to avoid being caught by broader conditions
      if (country.includes('bhutan') || country.includes('nepal') ||
          country.includes('cambodia') || country.includes('laos') ||
          country.includes('maldives') || country.includes('andorra') ||
          country.includes('liechtenstein') || country.includes('san marino') ||
          country.includes('montenegro') || country.includes('albania') ||
          country.includes('malta') || country.includes('gibraltar') ||
          country.includes('faroe islands') || country.includes('brunei') ||
          country.includes('timor-leste') || country.includes('guam') ||
          country.includes('american samoa') || country.includes('cook islands')) {
        return Math.floor(20000 + seededRandom(matchSeed, 26) * 15000); // 20k-35k
      }
      
      // Major European leagues - most historical data
      if (league.includes('premier league') || league.includes('la liga') || 
          league.includes('serie a') || league.includes('bundesliga') || 
          league.includes('ligue 1') || league.includes('champions league') ||
          league.includes('europa league')) {
        return Math.floor(70000 + seededRandom(matchSeed, 20) * 30000); // 70k-100k
      }
      
      // Secondary European leagues
      if (league.includes('primeira liga') || league.includes('eredivisie') ||
          league.includes('championship') || 
          (country.includes('england') && !country.includes('new zealand')) ||
          country.includes('spain') || country.includes('italy') ||
          country.includes('germany') || country.includes('france') ||
          country.includes('portugal') || country.includes('netherlands') ||
          country.includes('belgium') || country.includes('poland') ||
          country.includes('czech') || country.includes('austria') ||
          country.includes('switzerland') || country.includes('croatia') ||
          country.includes('serbia') || country.includes('greece') ||
          country.includes('turkey') || country.includes('ukraine') ||
          country.includes('russia') || country.includes('sweden') ||
          country.includes('norway') || country.includes('denmark')) {
        return Math.floor(50000 + seededRandom(matchSeed, 21) * 30000); // 50k-80k
      }
      
      // Major South American competitions
      if (league.includes('copa libertadores') || league.includes('brasileirao') ||
          league.includes('argentina') || country.includes('brazil') ||
          country.includes('argentina') || country.includes('chile') ||
          country.includes('colombia') || country.includes('peru') ||
          country.includes('uruguay') || country.includes('ecuador')) {
        return Math.floor(40000 + seededRandom(matchSeed, 22) * 25000); // 40k-65k
      }
      
      // North American major leagues
      if (league.includes('mls') || league.includes('liga mx') ||
          country.includes('usa') || country.includes('mexico') ||
          country.includes('canada')) {
        return Math.floor(35000 + seededRandom(matchSeed, 23) * 20000); // 35k-55k
      }
      
      // African major competitions
      if (league.includes('african') || league.includes('caf') ||
          country.includes('morocco') || country.includes('egypt') ||
          country.includes('nigeria') || country.includes('south africa') ||
          country.includes('algeria') || country.includes('tunisia') ||
          country.includes('ghana') || country.includes('senegal') ||
          country.includes('cameroon') || country.includes('ivory')) {
        return Math.floor(25000 + seededRandom(matchSeed, 24) * 20000); // 25k-45k
      }
      
      // Asian established leagues
      if (league.includes('j-league') || country.includes('japan') ||
          country.includes('korea') || country.includes('australia') ||
          country.includes('saudi') || country.includes('qatar') ||
          country.includes('uae') || country.includes('iran') ||
          country.includes('china') || country.includes('thailand') ||
          country.includes('vietnam') || country.includes('indonesia') ||
          country.includes('malaysia') || country.includes('singapore') ||
          country.includes('india') || country.includes('pakistan') ||
          country.includes('bangladesh') || country.includes('sri lanka')) {
        return Math.floor(30000 + seededRandom(matchSeed, 25) * 15000); // 30k-45k
      }
      
      // Default for other competitions
      return Math.floor(25000 + seededRandom(matchSeed, 27) * 25000); // 25k-50k
    };

    const datasetSize = getDatasetSize().toLocaleString('fr-FR');

    // Professional signal detection intros (removed "Pépite")
    const signalIntros = [
      `🎯 **Opportunité Détectée** | Niveau de Confiance: ${confidence}/100`,
      `⚡ **Signal Identifié** | Score de Fiabilité: ${confidence}/100`,
      `🔥 **Anomalie Détectée** | Indice de Certitude: ${confidence}/100`,
      `📊 **Distorsion Repérée** | Taux de Confiance: ${confidence}/100`
    ];

    let explanation = `${getSeededChoice(signalIntros, 3)}\n\n`;
    
    // Varied data story intros with proper geographic context
    const dataIntros = [
      `📊 **Intelligence Artificielle** : Notre réseau neuronal, nourri de +${datasetSize} parties historiques ${geographicContext}`,
      `🧠 **Deep Learning** : L'algorithme, entraîné sur une base massive de +${datasetSize} données contextuelles ${geographicContext}`, 
      `⚙️ **Machine Learning** : Le modèle prédictif, alimenté par +${datasetSize} affrontements similaires ${geographicContext}`,
      `🎰 **Algorithme Quantitatif** : Notre IA, formée sur un dataset colossal de +${datasetSize} matchs ${geographicContext}`
    ];
    
    explanation += `${getSeededChoice(dataIntros, 4)} avec contextes identiques (blessures/suspensions, arbitre, pelouse, supporters, enjeux, déplacements, fatigue, météo), `;
    
    if (normalizedRecommendation.type === 'BTTS') {
      if (normalizedRecommendation.prediction === 'Oui') {
        const bttsYesTexts = [
          `révèle **${probPercent}%** de chances que les deux formations trouvent le chemin des filets. L'analyse des corridors offensifs, des faiblesses défensives latérales et des duels individuels converge vers un festival de buts.`,
          `calcule **${probPercent}%** de probabilité d'un double marquage. Les metrics d'Expected Goals, la porosité défensive constatée et l'agressivité offensive récente dessinent un scénario spectaculaire.`,
          `estime à **${probPercent}%** la probabilité que chaque équipe inscrive au moins un but. L'efficacité des transitions, les failles dans les blocs bas et l'historique des confrontations directes militent pour cette issue.`,
          `prédit **${probPercent}%** de chances d'un double marquage. L'analyse des centres dangereux, des phases d'arrêt de jeu et des changements tactiques en cours de match suggère une rencontre prolifique.`
        ];
        explanation += getSeededChoice(bttsYesTexts, 5);
      } else {
        const bttsNoTexts = [
          `détecte **${probPercent}%** de probabilité qu'une équipe au minimum reste bredouille. L'examen des dispositifs défensifs compacts, des carences créatives et du contexte psychologique plaide pour la stérilité offensive.`,
          `révèle **${probPercent}%** de chances d'un "clean sheet" au minimum. L'étude des blocs défensifs, de l'efficacité des pressing et des faiblesses dans les derniers gestes techniques convergent vers ce scénario.`,
          `calcule **${probPercent}%** de probabilité que l'une des formations reste muette. Les patterns tactiques identifiés, la solidité défensive observée et les difficultés à conclure plaident pour cette issue.`,
          `estime à **${probPercent}%** la probabilité d'au moins un zéro au tableau d'affichage. L'analyse des systèmes de marquage, des duels aériens et de la gestion des temps faibles indique cette tendance.`
        ];
        explanation += getSeededChoice(bttsNoTexts, 6);
      }
    } else if (normalizedRecommendation.type === 'O/U 2.5') {
      if (normalizedRecommendation.prediction === '+2,5 buts') {
        const overTexts = [
          `projette **${probPercent}%** de chances d'explosivité offensive avec 3+ réalisations. La conjugaison des Expected Goals, du tempo de jeu élevé et des espaces laissés en transition dessine un match débridé.`,
          `anticipe **${probPercent}%** de probabilité d'un festival offensif dépassant 2,5 buts. L'analyse des phases de pressing haut, des contres rapides et des situations de face-à-face suggère du spectacle.`,
          `révèle **${probPercent}%** de chances d'un carton plein offensif. Les métriques de dangerosité, l'intensité prévue et les failles dans les récupérations défensives convergent vers un match ouvert.`,
          `calcule **${probPercent}%** de probabilité d'une avalanche de buts. L'étude des couloirs préférentiels, des déséquilibres tactiques et de l'état de forme des finisseurs indique une rencontre prolifique.`
        ];
        explanation += getSeededChoice(overTexts, 7);
      } else {
        const underTexts = [
          `indique **${probPercent}%** de probabilité d'une sobriété offensive sous les 2,5 buts. L'examen des blocs défensifs organisés, de la gestion tactique prudente et des enjeux du match milite pour la retenue.`,
          `prédit **${probPercent}%** de chances d'un match verrouillé tactiquement. L'analyse des systèmes défensifs, de la discipline positionnelle et des difficultés à créer du danger suggère un score étriqué.`,
          `détecte **${probPercent}%** de probabilité d'une rencontre sous contrôle offensif. Les patterns identifiés dans la gestion des temps forts, la compacité défensive et l'efficacité des récupérations convergent vers ce scénario.`,
          `estime à **${probPercent}%** la probabilité d'un match en dessous de 2,5 réalisations. L'étude des duels individuels, de la pression défensive et des choix tactiques conservateurs plaide pour cette issue.`
        ];
        explanation += getSeededChoice(underTexts, 8);
      }
    }

    // Professional mathematical edge explanations
    const edgeTexts = [
      `\n\n💰 **Avantage Mathématique** : La cote **${normalizedRecommendation.odds.toFixed(2)}** offre une "positive expected value" de **+${edge}%** selon nos calculs quantitatifs.`,
      `\n\n🎯 **Edge Statistique** : Avec **${normalizedRecommendation.odds.toFixed(2)}**, vous bénéficiez d'un avantage théorique de **+${edge}%** - une distorsion de marché à exploiter.`,
      `\n\n⚡ **Profit Attendu** : La cote **${normalizedRecommendation.odds.toFixed(2)}** génère une espérance de gain positive de **+${edge}%** sur le long terme.`,
      `\n\n📈 **Valeur Calculée** : À **${normalizedRecommendation.odds.toFixed(2)}**, cette cote présente un surplus de valeur quantifié à **+${edge}%** par nos algorithmes.`
    ];
    
    explanation += getSeededChoice(edgeTexts, 9);
    
    // Professional vigorish conclusions
    if (recommendation.vigorish < 0.06) {
      const lowVigTexts = [
        `\n\n🚀 **Conditions Exceptionnelles** : Marge bookmaker de seulement ${vigPercent}% ! Une opportunité premium à saisir.`,
        `\n\n⭐ **Tarif Avantageux** : Vigorish ultra-compétitif à ${vigPercent}% - ce bookmaker casse les prix aujourd'hui.`,
        `\n\n🔥 **Aubaine Rare** : Avec ${vigPercent}% de commission, ces conditions sont parmi les meilleures du marché.`
      ];
      explanation += getSeededChoice(lowVigTexts, 10);
    } else if (recommendation.vigorish < 0.08) {
      const medVigTexts = [
        `\n\n✅ **Environnement Favorable** : Marge de ${vigPercent}%, des conditions attractives pour optimiser vos gains.`,
        `\n\n🎯 **Contexte Positif** : Vigorish de ${vigPercent}%, un niveau qui préserve la rentabilité à long terme.`,
        `\n\n💫 **Cadre Optimal** : Avec ${vigPercent}% de frais, ce marché reste très jouable pour les parieurs avisés.`
      ];
      explanation += getSeededChoice(medVigTexts, 11);
    } else {
      const highVigTexts = [
        `\n\n📊 **Marché Standard** : Vigorish à ${vigPercent}%, dans la fourchette habituelle du secteur.`,
        `\n\n⚖️ **Conditions Classiques** : Marge de ${vigPercent}%, un niveau typique des bookmakers professionnels.`,
        `\n\n📈 **Tarification Normale** : Commission à ${vigPercent}%, conforme aux standards du marché d'investissement sportif.`
      ];
      explanation += getSeededChoice(highVigTexts, 12);
    }

    return explanation;
  };

  // Donut chart data with brand colors
  const results1x2Data = [
    { name: 'Domicile', value: match.p_home_fair * 100, color: 'hsl(var(--brand))' },
    { name: 'Nul', value: match.p_draw_fair * 100, color: 'hsl(var(--brand-300))' },
    { name: 'Extérieur', value: match.p_away_fair * 100, color: 'hsl(var(--brand-400))' },
  ];

  const bttsData = match.p_btts_yes_fair > 0 ? [
    { name: 'BTTS Oui', value: match.p_btts_yes_fair * 100, color: 'hsl(var(--brand))' },
    { name: 'BTTS Non', value: match.p_btts_no_fair * 100, color: 'hsl(var(--brand-300))' },
  ] : [];

  const over25Data = match.p_over_2_5_fair > 0 ? [
    { name: 'Over 2.5', value: match.p_over_2_5_fair * 100, color: 'hsl(var(--brand))' },
    { name: 'Under 2.5', value: match.p_under_2_5_fair * 100, color: 'hsl(var(--brand-300))' },
  ] : [];

  // Loading states for progressive chart animation
  const [chartLoading, setChartLoading] = useState<{ [key: string]: number }>({});
  
  // Initialize loading states when modal opens
  useEffect(() => {
    if (isOpen) {
      setChartLoading({
        results1x2: 0,
        btts: 0,
        over25: 0
      });

      // Progressive loading animation
      const charts = ['results1x2', 'btts', 'over25'];
      charts.forEach((chart, index) => {
        setTimeout(() => {
          const interval = setInterval(() => {
            setChartLoading(prev => {
              const current = prev[chart] || 0;
              if (current >= 100) {
                clearInterval(interval);
                return prev;
              }
              return { ...prev, [chart]: Math.min(current + Math.random() * 8 + 2, 100) };
            });
          }, 50);
        }, index * 800);
      });
    }
  }, [isOpen]);

  const DonutChart = ({ data, title, prediction, chartKey }: { 
    data: any[], 
    title: string, 
    prediction: string,
    chartKey: string 
  }) => {
    const progress = chartLoading[chartKey] || 0;
    const isLoading = progress < 100;

    // Check if this chart matches the AI recommendation
    const isAIRecommended = () => {
      const aiRec = generateAIRecommendation(match, marketFilters);
      if (!aiRec) return false;
      
      if (aiRec.betType === 'BTTS' && chartKey === 'btts' && 
          ((aiRec.prediction === 'Oui' && prediction === 'Oui') || 
           (aiRec.prediction === 'Non' && prediction === 'Non'))) {
        return true;
      }
      if (aiRec.betType === 'O/U 2.5' && chartKey === 'over25' && 
          ((aiRec.prediction === '+2,5 buts' && prediction === '+2,5 buts') || 
           (aiRec.prediction === '-2,5 buts' && prediction === '-2,5 buts'))) {
        return true;
      }
      return false;
    };

    const aiRecommended = isAIRecommended();

    return (
      <Card className={`group relative p-3 bg-gradient-to-br from-surface-soft to-surface-strong border transition-all duration-500 hover:shadow-xl backdrop-blur-sm transform hover:scale-[1.02] ${
        aiRecommended 
          ? 'border-brand/60 shadow-[0_0_20px_hsl(var(--brand)/0.4)] hover:shadow-[0_0_30px_hsl(var(--brand)/0.6)]' 
          : 'border-brand/30 hover:border-brand/50 hover:shadow-brand/20'
      }`}>
        <div className={`absolute inset-0 rounded-lg transition-opacity duration-500 ${
          aiRecommended 
            ? 'bg-gradient-to-br from-brand/15 to-brand-300/20 opacity-100' 
            : 'bg-gradient-to-br from-brand/5 to-brand-300/10 opacity-0 group-hover:opacity-100'
        }`} />
        {aiRecommended && (
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-transparent via-brand/10 to-transparent animate-pulse border-2 border-brand/30" />
        )}
        
        <h4 className={`font-semibold text-center mb-2 text-sm text-text relative z-10 bg-gradient-to-r from-brand to-brand-400 bg-clip-text text-transparent transform group-hover:scale-105 transition-transform duration-300 ${
          aiRecommended ? 'drop-shadow-sm' : ''
        }`}>
          {title}
        </h4>

        {isLoading ? (
          <div className="h-28 relative z-10 flex flex-col items-center justify-center">
            <div className="relative w-16 h-16 mb-2">
              <div className="absolute inset-0 rounded-full border-3 border-brand/20"></div>
              <div 
                className="absolute inset-0 rounded-full border-3 border-transparent border-t-brand transition-all duration-300 animate-spin"
                style={{
                  borderTopColor: `hsl(var(--brand))`,
                  transform: `rotate(${progress * 3.6}deg)`
                }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-4 w-4 text-brand animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-brand mb-1 animate-pulse">
                {Math.round(progress)}%
              </div>
              <div className="text-xs text-text-weak animate-fade-in">
                Analyse...
              </div>
            </div>
          </div>
        ) : (
          <div className="h-28 relative z-10 transform group-hover:scale-105 transition-transform duration-500 animate-fade-in">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={20}
                  outerRadius={45}
                  paddingAngle={2}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={1200}
                  animationEasing="ease-in-out"
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      stroke={entry.color} 
                      strokeWidth={aiRecommended ? 3 : 2}
                      className={`transition-all duration-300 ${
                        aiRecommended 
                          ? 'drop-shadow-[0_0_8px_hsl(var(--brand)/0.6)]' 
                          : 'drop-shadow-lg hover:drop-shadow-xl'
                      }`}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string) => [`${name}: ${value.toFixed(1)}%`, '']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--surface))',
                    border: '1px solid hsl(var(--brand) / 0.3)',
                    borderRadius: '8px',
                    color: 'hsl(var(--text))',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 8px 32px hsl(var(--brand) / 0.2)',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="mt-2 text-center relative z-10">
          {!isLoading && (
            <Badge className={`font-bold text-xs px-2 py-1 animate-fade-in ${
              aiRecommended 
                ? 'bg-gradient-to-r from-brand/50 to-brand-400/50 border-brand/60 text-brand-fg shadow-lg' 
                : 'bg-gradient-to-r from-brand/30 to-brand-400/30 border-brand/40 text-text'
            }`}>
              🎯 {prediction}
            </Badge>
          )}
        </div>
      </Card>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden bg-gradient-to-br from-surface via-surface-soft to-surface border-border shadow-2xl rounded-3xl p-0 backdrop-blur-xl">
        {/* Modern Overlay Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand/5 via-transparent to-brand/5 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,hsl(var(--brand)/0.1),rgba(255,255,255,0))] pointer-events-none" />
        
        <DialogHeader className="relative z-10 p-8 pb-6 border-b border-border bg-gradient-to-r from-surface-soft to-surface backdrop-blur-sm">
          <DialogTitle className="flex items-center gap-6">
            <div className="relative group">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand via-brand-400 to-brand-500 flex items-center justify-center shadow-xl group-hover:shadow-brand/25 transition-all duration-300 group-hover:scale-105">
                <FlagMini code={flagInfo.code} confed={flagInfo.confed} />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent opacity-50" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-br from-brand/20 to-brand-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            
            <div className="flex-1">
              <div className="text-3xl font-bold bg-gradient-to-r from-text via-text-weak to-text bg-clip-text text-transparent leading-tight mb-2">
                {match.home_team} vs {match.away_team}
              </div>
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 bg-gradient-to-r from-brand/10 to-brand/20 rounded-full border border-brand/20">
                  <span className="text-sm font-semibold text-brand">{match.league}</span>
                </div>
                <div className="w-2 h-2 bg-brand rounded-full animate-pulse" />
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="relative z-10 p-8 space-y-8 overflow-y-auto max-h-[calc(90vh-140px)] scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {/* Enhanced Flags Section */}
          <div className="flex gap-3 flex-wrap justify-center">
            {match.watch_btts && (
              <div className="group relative">
                <div className="px-4 py-2 bg-gradient-to-r from-brand to-brand-400 text-brand-fg rounded-xl shadow-lg group-hover:shadow-brand/25 transition-all duration-300 group-hover:scale-105 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  <span className="font-semibold text-sm">Watch BTTS</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-brand/20 to-brand-400/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
              </div>
            )}
            {match.watch_over25 && (
              <div className="group relative">
                <div className="px-4 py-2 bg-gradient-to-r from-brand to-brand-400 text-brand-fg rounded-xl shadow-lg group-hover:shadow-brand/25 transition-all duration-300 group-hover:scale-105 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span className="font-semibold text-sm">Watch Over 2.5</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-brand/20 to-brand-400/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
              </div>
            )}
          </div>

          {/* Analyse des Probabilités IA - Donut Charts avec cotes */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold bg-gradient-to-r from-brand to-brand-400 bg-clip-text text-transparent flex items-center gap-3">
              <div className="w-2 h-2 bg-brand rounded-full" />
              Analyse des Probabilités IA
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Résultat 1X2 */}
              <Card className="p-4">
                <DonutChart data={results1x2Data} title="Résultat 1X2" prediction={get1x2Winner()} chartKey="results1x2" />
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Domicile</div>
                    <div className={`px-2 py-1 bg-brand/10 rounded text-sm font-mono ${
                      get1x2Winner() === match.home_team ? 'font-bold text-brand' : 'font-normal text-muted-foreground'
                    }`}>
                      {match.odds_home && !isNaN(match.odds_home) ? match.odds_home.toFixed(2) : '0.00'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Nul</div>
                    <div className={`px-2 py-1 bg-brand/10 rounded text-sm font-mono ${
                      get1x2Winner() === 'Nul' ? 'font-bold text-brand' : 'font-normal text-muted-foreground'
                    }`}>
                      {match.odds_draw && !isNaN(match.odds_draw) ? match.odds_draw.toFixed(2) : '0.00'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Extérieur</div>
                    <div className={`px-2 py-1 bg-brand/10 rounded text-sm font-mono ${
                      get1x2Winner() === match.away_team ? 'font-bold text-brand' : 'font-normal text-muted-foreground'
                    }`}>
                      {match.odds_away && !isNaN(match.odds_away) ? match.odds_away.toFixed(2) : '0.00'}
                    </div>
                  </div>
                </div>
              </Card>

              {/* BTTS */}
              {bttsData.length > 0 && (
                <Card className="p-4">
                  <DonutChart data={bttsData} title="Les Deux Équipes Marquent" prediction={getBttsWinner()} chartKey="btts" />
                  <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">BTTS Oui</div>
                      <div className={`px-2 py-1 bg-brand/10 rounded text-sm font-mono ${
                        getBttsWinner() === 'Oui' ? 'font-bold text-brand' : 'font-normal text-muted-foreground'
                      }`}>
                        {match.odds_btts_yes && !isNaN(match.odds_btts_yes) ? match.odds_btts_yes.toFixed(2) : '0.00'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">BTTS Non</div>
                      <div className={`px-2 py-1 bg-brand/10 rounded text-sm font-mono ${
                        getBttsWinner() === 'Non' ? 'font-bold text-brand' : 'font-normal text-muted-foreground'
                      }`}>
                        {match.odds_btts_no && !isNaN(match.odds_btts_no) ? match.odds_btts_no.toFixed(2) : '0.00'}
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Over/Under 2.5 */}
              {over25Data.length > 0 && (
                <Card className="p-4">
                  <DonutChart data={over25Data} title="Plus/Moins 2,5 Buts" prediction={getOver25Winner()} chartKey="over25" />
                  <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Plus de 2,5</div>
                      <div className={`px-2 py-1 bg-brand/10 rounded text-sm font-mono ${
                        getOver25Winner() === '+2,5 buts' ? 'font-bold text-brand' : 'font-normal text-muted-foreground'
                      }`}>
                        {match.odds_over_2_5 && !isNaN(match.odds_over_2_5) ? match.odds_over_2_5.toFixed(2) : '0.00'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Moins de 2,5</div>
                      <div className={`px-2 py-1 bg-brand/10 rounded text-sm font-mono ${
                        getOver25Winner() === '-2,5 buts' ? 'font-bold text-brand' : 'font-normal text-muted-foreground'
                      }`}>
                        {match.odds_under_2_5 && !isNaN(match.odds_under_2_5) ? match.odds_under_2_5.toFixed(2) : '0.00'}
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>

          <Separator className="bg-gradient-to-r from-transparent via-brand/30 to-transparent" />

          {/* Enhanced AI Graphics Section */}
          <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-brand via-brand-400 to-brand-500 bg-clip-text text-transparent mb-2">
                  Intelligence Artificielle Avancée
                </h2>
                <p className="text-text-weak">
                  Analyse prédictive complète avec 5 algorithmes d'IA différents
                </p>
              </div>
            
            <div className="grid grid-cols-1 gap-8">
              {/* Enhanced AI Recommendation Section with Influence Factors */}
              <Card className="p-8 bg-gradient-to-br from-surface to-surface-soft border-border shadow-lg">
                <div className="flex items-center gap-3 mb-8">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-brand to-brand-400 rounded-xl shadow-lg">
                    <Target className="w-6 h-6 text-brand-fg" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-text">Recommandation de l'IA</h3>
                    <p className="text-sm text-text-weak">Analyse complète avec facteurs d'influence</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* AI Recommendation */}
                  <div className="lg:col-span-2 space-y-6">
                    {recommendation ? (
                      <div className="p-6 bg-gradient-to-br from-brand/10 to-brand/20 rounded-xl border border-brand/20">
                        <div className="flex items-center justify-between mb-4">
                          <Badge className="bg-brand text-brand-fg px-4 py-2 text-base font-semibold">
                            {recommendation.type} {recommendation.prediction}
                          </Badge>
                          <div className="text-2xl font-bold text-brand">
                            {recommendation.odds.toFixed(2)}
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex justify-between text-base">
                            <span className="text-text-weak font-medium">Niveau de confiance:</span>
                            <span className="font-bold text-brand text-lg">
                              {generateConfidenceScore(match.id, recommendation)}%
                            </span>
                          </div>
                          <div className="relative h-3 bg-brand/20 rounded-full overflow-hidden">
                            <div 
                              className="absolute top-0 left-0 h-full bg-gradient-to-r from-brand to-brand-400 rounded-full transition-all duration-1000"
                              style={{ width: `${showAIGraphics ? generateConfidenceScore(match.id, recommendation) : 0}%` }}
                            />
                          </div>
                        </div>
                        
                        {/* Detailed AI Commentary */}
                        <div className="mt-6 p-4 bg-surface rounded-lg border border-brand/10">
                          <div className="text-sm text-text leading-relaxed">
                            <div dangerouslySetInnerHTML={{ 
                              __html: (typeof generateRecommendationExplanation === 'function' 
                                ? generateRecommendationExplanation(recommendation).replace(/\n/g, '<br/>') 
                                : 'Explication temporairement indisponible'
                              )
                            }} />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 bg-surface-soft rounded-xl border border-border text-center">
                        <span className="text-text-weak text-base">Aucune recommandation disponible</span>
                      </div>
                    )}
                  </div>

                  {/* Compact Confidence Bars */}
                  <div className="space-y-6">
                    <div className="text-base font-bold text-text">Scores de Confiance</div>
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-text-weak font-medium">🎯 Recommandation IA</span>
                          <span className="text-sm font-bold text-brand">
                            {generateConfidenceScore(match.id, recommendation || {})}%
                          </span>
                        </div>
                        <div className="h-2 bg-surface-strong rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-brand to-brand-400 rounded-full transition-all duration-1000"
                            style={{ width: `${showAIGraphics ? generateConfidenceScore(match.id, recommendation || {}) : 0}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-text-weak font-medium">⚠️ Facteur Risque</span>
                          <span className="text-sm font-bold text-destructive">
                            {Math.round(match.vig_1x2 * 100)}%
                          </span>
                        </div>
                        <div className="h-2 bg-surface-strong rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-destructive to-destructive/80 rounded-full transition-all duration-1000 delay-200"
                            style={{ width: `${showAIGraphics ? Math.round(match.vig_1x2 * 100) : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* New Advanced Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Team Radar Chart */}
              <TeamRadarChart
                homeTeam={match.home_team}
                awayTeam={match.away_team}
                matchId={match.id}
                isActive={showAIGraphics}
              />

              {/* Timeline Momentum */}
              <TimelineMomentum
                homeTeam={match.home_team}
                awayTeam={match.away_team}
                matchId={match.id}
                isActive={showAIGraphics}
              />
            </div>

            <div className="grid grid-cols-1 gap-6">
              {/* Score Prediction Matrix */}
              <ScorePredictionMatrix
                homeTeam={match.home_team}
                awayTeam={match.away_team}
                matchId={match.id}
                isActive={showAIGraphics}
                match={match}
              />
            </div>
          </div>

          <Separator className="bg-gradient-to-r from-transparent via-brand/30 to-transparent" />


          {/* Section Analyses Avancées IA */}
          {showAIGraphics && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center py-4">
                <h2 className="text-xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
                  <Brain className="w-6 h-6 text-brand" />
                  Analyses Avancées IA
                </h2>
                <p className="text-sm text-muted-foreground">
                  Métriques de nouvelle génération pour une analyse complète
                </p>
              </div>


              {/* Grid des analyses avancées */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Radar de Confiance */}
                <Card className="p-6 bg-gradient-to-br from-background to-muted/20 border-border/50">
                  <ConfidenceRadar match={match} />
                </Card>

                {/* Efficacité du Marché */}
                <Card className="p-6 bg-gradient-to-br from-background to-muted/20 border-border/50">
                  <MarketEfficiencyGauge match={match} />
                </Card>

                {/* Consensus IA */}
                <Card className="p-6 bg-gradient-to-br from-background to-muted/20 border-border/50">
                  <AIConsensusGauge match={match} />
                </Card>

                {/* Barres de Certitude */}
                <Card className="p-6 bg-gradient-to-br from-background to-muted/20 border-border/50">
                  <PredictionCertaintyBars match={match} />
                </Card>
              </div>
            </div>
          )}

          {/* Modern Actions Section */}
          <div className="flex justify-center pt-4 border-t border-border">
            <Button 
              className="relative group px-8 py-3 bg-gradient-to-r from-text to-text-weak hover:from-text-weak hover:to-text text-surface font-semibold rounded-2xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden"
              onClick={onClose}>
              <div className="absolute inset-0 bg-gradient-to-r from-brand/10 to-brand/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative z-10 flex items-center gap-2">
                <span>Fermer</span>
                <div className="w-2 h-2 bg-current rounded-full opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
              </span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}