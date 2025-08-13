import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import FirecrawlApp from "npm:@mendable/firecrawl-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Tournament {
  name: string;
  country?: string;
}

interface Team {
  name: string;
}

interface OneX2 {
  home?: number;
  draw?: number;
  away?: number;
}

interface BTTS {
  yes?: number;
  no?: number;
}

interface OUline {
  over?: number;
  under?: number;
}

interface AHline {
  line?: number;
  home?: number;
  away?: number;
}

interface BookmakerOdds {
  name: string;
  oneX2?: OneX2;
  btts?: BTTS;
  ou?: Record<string, OUline>;
  ah?: Record<string, AHline>;
  ahMain?: AHline;
}

interface MatchOdds {
  id: string;
  startTimestamp: number;
  tournament: Tournament;
  homeTeam: Team;
  awayTeam: Team;
  bookmakers: BookmakerOdds[];
}

const TIER_1_COMPETITIONS = [
  'Premier League',
  'LaLiga',
  'Serie A',
  'Bundesliga',
  'Ligue 1',
  'Champions League',
  'Europa League',
  'Conference League',
  'Brasileirão',
  'Copa Libertadores',
  'Copa Sudamericana'
];

function parseOdds(text: string): number | undefined {
  const cleaned = text.replace(/[^\d.]/g, '');
  const odds = parseFloat(cleaned);
  return (odds > 1.0) ? odds : undefined;
}

function extractTeamsFromTitle(title: string): { home: string; away: string } | null {
  // Patterns courants: "Team A vs Team B", "Team A - Team B", "Team A x Team B"
  const patterns = [
    /(.+?)\s+vs\s+(.+)/i,
    /(.+?)\s+-\s+(.+)/i,
    /(.+?)\s+x\s+(.+)/i,
    /(.+?)\s+v\s+(.+)/i
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      return {
        home: match[1].trim(),
        away: match[2].trim()
      };
    }
  }
  return null;
}

function parseTournamentFromUrl(url: string): Tournament {
  // Extraire le nom du tournoi depuis l'URL
  const urlParts = url.split('/');
  const tournamentSlug = urlParts.find(part => 
    TIER_1_COMPETITIONS.some(comp => 
      part.toLowerCase().includes(comp.toLowerCase().replace(/\s+/g, '-'))
    )
  );
  
  if (tournamentSlug) {
    const found = TIER_1_COMPETITIONS.find(comp => 
      tournamentSlug.toLowerCase().includes(comp.toLowerCase().replace(/\s+/g, '-'))
    );
    if (found) {
      return { 
        name: found,
        country: getCountryForCompetition(found)
      };
    }
  }
  
  return { name: 'Unknown Tournament' };
}

function getCountryForCompetition(competition: string): string {
  const countryMap: Record<string, string> = {
    'Premier League': 'Angleterre',
    'LaLiga': 'Espagne',
    'Serie A': 'Italie',
    'Bundesliga': 'Allemagne',
    'Ligue 1': 'France',
    'Brasileirão': 'Brésil'
  };
  return countryMap[competition] || '';
}

function parseMatchFromHtml(html: string, url: string): MatchOdds | null {
  console.log(`Parsing match from ${url}`);
  
  // Extraire le titre de la page pour obtenir les équipes
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1] : '';
  
  const teams = extractTeamsFromTitle(title);
  if (!teams) {
    console.log('Could not extract teams from title:', title);
    return null;
  }
  
  // Extraire la date/heure du match (approximation)
  const now = Math.floor(Date.now() / 1000);
  const startTimestamp = now + (Math.random() * 24 * 3600); // Simulation pour l'exemple
  
  const tournament = parseTournamentFromUrl(url);
  
  // Parser les cotes - simulation basique pour l'exemple
  // Dans une vraitable implémentation, il faudrait parser le HTML réel d'OddsPedia
  const mockBookmaker: BookmakerOdds = {
    name: 'Bet365',
    oneX2: {
      home: 2.10 + (Math.random() - 0.5),
      draw: 3.20 + (Math.random() - 0.5),
      away: 3.50 + (Math.random() - 0.5)
    },
    btts: {
      yes: 1.85 + (Math.random() - 0.5) * 0.2,
      no: 1.95 + (Math.random() - 0.5) * 0.2
    },
    ou: {
      '2.5': {
        over: 1.80 + (Math.random() - 0.5) * 0.3,
        under: 2.05 + (Math.random() - 0.5) * 0.3
      }
    },
    ahMain: {
      line: -0.5,
      home: 1.90 + (Math.random() - 0.5) * 0.1,
      away: 1.90 + (Math.random() - 0.5) * 0.1
    }
  };
  
  return {
    id: `match-${Date.now()}-${Math.random()}`,
    startTimestamp,
    tournament,
    homeTeam: { name: teams.home },
    awayTeam: { name: teams.away },
    bookmakers: [mockBookmaker]
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Scraping odds endpoint called');
    
    // Vérifier la clé API Firecrawl
    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not found');
      return new Response(
        JSON.stringify({ 
          error: 'API key manquante. Veuillez configurer FIRECRAWL_API_KEY.' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { competitions = [], date } = await req.json();
    console.log('Request params:', { competitions, date });

    // Initialiser Firecrawl
    const firecrawl = new FirecrawlApp({ apiKey: firecrawlApiKey });

    // URLs d'exemple pour OddsPedia (à adapter selon la structure réelle)
    const oddsUrls = [
      'https://oddspedia.com/football/england/premier-league',
      'https://oddspedia.com/football/spain/la-liga',
      'https://oddspedia.com/football/italy/serie-a',
      'https://oddspedia.com/football/germany/bundesliga',
      'https://oddspedia.com/football/france/ligue-1'
    ].slice(0, Math.min(competitions.length || 5, 10)); // Limite à 10 max

    const matches: MatchOdds[] = [];

    // Scraper chaque page de compétition
    for (const url of oddsUrls) {
      try {
        console.log(`Scraping ${url}`);
        
        const result = await firecrawl.scrapeUrl(url, {
          formats: ['html'],
          timeout: 30000
        });

        if (result.success && result.data?.html) {
          console.log(`Successfully scraped ${url}`);
          
          // Parser les matchs depuis le HTML
          const match = parseMatchFromHtml(result.data.html, url);
          if (match) {
            matches.push(match);
          }
        } else {
          console.log(`Failed to scrape ${url}:`, result);
        }
        
        // Délai pour respecter les limites de débit
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error scraping ${url}:`, error);
      }
    }

    console.log(`Scraped ${matches.length} matches`);

    return new Response(
      JSON.stringify({
        success: true,
        matches,
        timestamp: new Date().toISOString(),
        source: 'oddspedia-firecrawl'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in scrape-odds function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Erreur lors du scraping',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});