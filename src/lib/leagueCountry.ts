export type FlagInfo = { code?: string; confed?: "UEFA"|"CONMEBOL" };
type Rule = { re: RegExp; code?: string; confed?: "UEFA"|"CONMEBOL" };

export const leagueCountryRules: Rule[] = [
  // Europe majeures (+ D2 top-10)
  { re:/\bpremier league\b/i, code:"GB" }, { re:/\bchampionship\b/i, code:"GB" },
  { re:/\bla\s?liga\b/i, code:"ES" }, { re:/\bhypermotion\b|\blaliga 2\b/i, code:"ES" },
  { re:/\bserie a\b/i, code:"IT" }, { re:/\bserie b\b/i, code:"IT" },
  { re:/\bbundesliga\b(?!\s*2)/i, code:"DE" }, { re:/\b2\.*\s?bundesliga\b/i, code:"DE" },
  { re:/\bligue 1\b/i, code:"FR" }, { re:/\bligue 2\b/i, code:"FR" },
  { re:/\bprimeira liga\b/i, code:"PT" }, { re:/\bliga portugal 2\b|\bligapro\b/i, code:"PT" },
  { re:/\beredivisie\b/i, code:"NL" }, { re:/\bkeuken kampioen divisie\b|\beerste divisie\b/i, code:"NL" },
  { re:/\bjupiler pro league\b|\bfirst division a\b/i, code:"BE" }, { re:/\bchallenger pro league\b|\bfirst division b\b/i, code:"BE" },
  { re:/\bsuper lig\b|\bturki/i, code:"TR" }, { re:/\bgreek\b|\bsuper league greece\b/i, code:"GR" },
  { re:/\bczech\b|\bfortuna liga\b/i, code:"CZ" }, { re:/\bscottish premiership\b/i, code:"GB" },
  { re:/\beliteserien\b/i, code:"NO" }, { re:/\ballsvenskan\b/i, code:"SE" },
  { re:/\bekstraklasa\b/i, code:"PL" }, { re:/\bukrainian premier league\b|\bupl\b/i, code:"UA" },
  { re:/\bparva liga\b/i, code:"BG" }, { re:/\baustrian bundesliga\b|\badmiral bundesliga\b/i, code:"AT" },
  { re:/\bromania liga i\b|\bliga i\b/i, code:"RO" }, { re:/\bcyprus first division\b/i, code:"CY" },
  { re:/\bisraeli premier league\b/i, code:"IL" }, { re:/\bserbian superliga\b/i, code:"RS" },
  { re:/\bazerbaijan premier league\b/i, code:"AZ" }, { re:/\bslovenian prvaliga\b/i, code:"SI" },
  { re:/\barmenian premier league\b/i, code:"AM" }, { re:/\botp bank liga\b|\bhungarian nb i\b/i, code:"HU" },
  { re:/\bvirsliga\b/i, code:"LV" }, { re:/\bnorthern ireland\b|\bnifl premiership\b/i, code:"GB" },
  { re:/\bswiss super league\b/i, code:"CH" }, { re:/\bsuperligaen\b|\bdenmark\b/i, code:"DK" },

  // Amériques & autres
  { re:/\bcampeonato brasileiro serie a\b|\bbrazil(?:ian)? serie a\b/i, code:"BR" },
  { re:/\bsérie b\b|\bserie\s?b\b/i, code:"BR" },
  { re:/\bargentina primera division\b|\bliga profesional\b/i, code:"AR" },
  { re:/\bprimera nacional\b|\bprimera b nacional\b/i, code:"AR" },
  { re:/\bcategoria primera a\b/i, code:"CO" }, { re:/\bdivision profesional.*paragu/i, code:"PY" },
  { re:/\buruguay primera division\b/i, code:"UY" }, { re:/\becuador serie a\b|\bliga pro\b/i, code:"EC" },
  { re:/\bchile primera division\b/i, code:"CL" }, { re:/\bbolivia primera division\b/i, code:"BO" },
  { re:/\bperu liga 1\b|\bliga1 peru\b/i, code:"PE" },
  { re:/\bmls\b|\bmajor league soccer\b/i, code:"US" }, { re:/\bliga mx\b/i, code:"MX" },
  { re:/\bcosta rica primera division\b/i, code:"CR" },

  // Afrique & Asie
  { re:/\begypt(?:ian)? premier league\b/i, code:"EG" },
  { re:/\bbotola\b/i, code:"MA" },
  { re:/\balgeria.*ligue 1\b/i, code:"DZ" },
  { re:/\bj1 league\b|\bj-league\b/i, code:"JP" },
  { re:/\bk league 1\b/i, code:"KR" },
  { re:/\bsaudi pro league\b/i, code:"SA" },
  { re:/\bbhutan premier league\b/i, code:"BT" },
  { re:/\btasmania\b/i, code:"AU" },
  { re:/\bffa cup\b/i, code:"AU" },
  { re:/\bemperor cup\b/i, code:"JP" },
  { re:/\brussian cup\b/i, code:"RU" },
  { re:/\bromania cup\b/i, code:"RO" },
  { re:/\bslovakia cup\b/i, code:"SK" },
  { re:/\bestonian cup\b/i, code:"EE" },
  { re:/\bczech cup\b/i, code:"CZ" },
  { re:/\bbulgarian cup\b/i, code:"BG" },
  { re:/\bafrican nations championship\b/i, code:"MA" },

  // Coupes continentales -> confédérations
  { re:/\buefa champions league\b|\bchampions league\b/i, confed:"UEFA" },
  { re:/\buefa europa league\b|\beuropa league\b/i, confed:"UEFA" },
  { re:/\buefa europa conference league\b|\beuropa conference league\b/i, confed:"UEFA" },
  { re:/\bcopa libertadores\b|\blibertadores\b/i, confed:"CONMEBOL" },
  { re:/\bcopa sudamericana\b|\bsudamericana\b/i, confed:"CONMEBOL" },
  { re:/\bafc cup\b/i, code:"AFC" },
  { re:/\bconcacaf\b/i, code:"MX" },
];

export function leagueToFlag(league: string, country?: string, homeTeam?: string, awayTeam?: string): FlagInfo {
  // 1. Priorité à la colonne country du CSV si elle existe
  if (country) {
    // Convertir les noms de pays complets en codes ISO
    const countryCode = getCountryCodeFromName(country);
    if (countryCode) {
      return { code: countryCode };
    }
    
    // Si c'est déjà un code ISO de 2 lettres
    if (country.length === 2) {
      return { code: country.toUpperCase() };
    }
  }
  
  // 2. Recherche par nom de ligue (logique existante)
  const text = (league || "").toLowerCase();
  for (const r of leagueCountryRules) { 
    if (r.re.test(text)) return { code: r.code, confed: r.confed }; 
  }
  
  // 3. Fallback : analyse des noms d'équipes si pas de match par ligue
  if (homeTeam || awayTeam) {
    const teamCountry = detectCountryFromTeams(homeTeam || '', awayTeam || '');
    if (teamCountry) {
      return { code: teamCountry };
    }
  }
  
  return { code: "" };
}

// Fonction pour convertir les noms de pays en codes ISO
function getCountryCodeFromName(countryName: string): string | null {
  const name = countryName.toLowerCase().trim();
  
  const countryMap: { [key: string]: string } = {
    // Pays principaux
    'brazil': 'BR',
    'brasil': 'BR',
    'argentina': 'AR',
    'uruguay': 'UY',
    'chile': 'CL',
    'colombia': 'CO',
    'peru': 'PE',
    'ecuador': 'EC',
    'paraguay': 'PY',
    'bolivia': 'BO',
    'venezuela': 'VE',
    'mexico': 'MX',
    'united states': 'US',
    'usa': 'US',
    'canada': 'CA',
    'costa rica': 'CR',
    
    // Europe
    'spain': 'ES',
    'italy': 'IT',
    'england': 'GB',
    'united kingdom': 'GB',
    'uk': 'GB',
    'germany': 'DE',
    'france': 'FR',
    'portugal': 'PT',
    'netherlands': 'NL',
    'belgium': 'BE',
    'turkey': 'TR',
    'greece': 'GR',
    'czech republic': 'CZ',
    'scotland': 'GB',
    'norway': 'NO',
    'sweden': 'SE',
    'poland': 'PL',
    'ukraine': 'UA',
    'bulgaria': 'BG',
    'austria': 'AT',
    'romania': 'RO',
    'cyprus': 'CY',
    'israel': 'IL',
    'serbia': 'RS',
    'azerbaijan': 'AZ',
    'slovenia': 'SI',
    'armenia': 'AM',
    'hungary': 'HU',
    'latvia': 'LV',
    'switzerland': 'CH',
    'denmark': 'DK',
    
    // Afrique & Asie
    'egypt': 'EG',
    'morocco': 'MA',
    'algeria': 'DZ',
    'japan': 'JP',
    'south korea': 'KR',
    'saudi arabia': 'SA',
    'bhutan': 'BT',
    'australia': 'AU',
    'russia': 'RU',
    'slovakia': 'SK',
    'estonia': 'EE',
    
    // Cas spéciaux
    'esports': '', // Pas de drapeau pour les esports
    'south america': '', // Confédération, pas un pays
    'europe': '', // Confédération, pas un pays
    'north america': '', // Confédération, pas un pays
    'africa': '', // Confédération, pas un pays
    'asia': '', // Confédération, pas un pays
    'oceania': '', // Confédération, pas un pays
    'international': '', // Compétitions internationales
    'world': '', // Coupe du monde, etc.
    'continental': '', // Compétitions continentales
    
    // Cas alternatifs
    'dominican republic': 'DO',
    'rep dominicana': 'DO',
    'rep. dominicana': 'DO'
  };
  
  return countryMap[name] || null;
}

// Nouvelle fonction pour détecter le pays par les noms d'équipes
function detectCountryFromTeams(homeTeam: string, awayTeam: string): string | null {
  const teams = `${homeTeam} ${awayTeam}`.toLowerCase();
  
  // Équipes brésiliennes caractéristiques
  if (teams.match(/\b(flameng|corinthians|palmeiras|santos|são paulo|fluminense|grêmio|internacional|atlético mineiro|cruzeiro|vasco|botafogo|bahia|sport|ceará|fortaleza|goiás|coritiba|atlético paranaense|chapecoense|avaí|figueirense|ponte preta|guarani|américa mineiro)\b/i)) {
    return 'BR';
  }
  
  // Équipes argentines
  if (teams.match(/\b(boca juniors|river plate|racing|independiente|san lorenzo|estudiantes|newells|rosario central|lanús|banfield|defensa y justicia|arsenal|colón|talleres|gimnasia|huracán|vélez|godoy cruz)\b/i)) {
    return 'AR';
  }
  
  // Équipes uruguayennes
  if (teams.match(/\b(peñarol|nacional|montevideo wanderers|defensor sporting|danubio|cerro|liverpool|plaza colonia|montevideo city)\b/i)) {
    return 'UY';
  }
  
  // Équipes chiliennes
  if (teams.match(/\b(colo colo|universidad de chile|universidad católica|la serena|everton|palestino|unión española|audax italiano|huachipato|cobresal)\b/i)) {
    return 'CL';
  }
  
  // Équipes colombiennes
  if (teams.match(/\b(millonarios|américa de cali|atlético nacional|junior|once caldas|deportivo cali|santa fe|deportivo pasto|envigado|medellín)\b/i)) {
    return 'CO';
  }
  
  // Équipes péruviennes
  if (teams.match(/\b(alianza lima|universitario|sporting cristal|melgar|cienciano|cusco|ayacucho|césar vallejo)\b/i)) {
    return 'PE';
  }
  
  // Équipes équatoriennes
  if (teams.match(/\b(barcelona|emelec|liga de quito|el nacional|independiente del valle|delfín|macará|técnico universitario)\b/i)) {
    return 'EC';
  }
  
  // Équipes paraguayennes
  if (teams.match(/\b(olimpia|cerro porteño|libertad|nacional|guaraní|sol de américa|sportivo luqueño)\b/i)) {
    return 'PY';
  }
  
  // Équipes boliviennes
  if (teams.match(/\b(the strongest|bolívar|oriente petrolero|blooming|wilstermann|san josé|nacional potosí)\b/i)) {
    return 'BO';
  }
  
  // Équipes vénézuéliennes
  if (teams.match(/\b(caracas|deportivo táchira|estudiantes de mérida|zamora|carabobo|zulia|metropolitanos)\b/i)) {
    return 'VE';
  }
  
  // Équipes espagnoles
  if (teams.match(/\b(real madrid|barcelona|atlético madrid|sevilla|valencia|villarreal|athletic bilbao|real sociedad|betis|getafe|osasuna|cádiz|elche|espanyol|mallorca|celta|levante|granada|alavés|valladolid|eibar|huesca|leganés|girona|rayo vallecano)\b/i)) {
    return 'ES';
  }
  
  // Équipes italiennes
  if (teams.match(/\b(juventus|milan|inter|napoli|roma|lazio|atalanta|fiorentina|torino|sassuolo|udinese|sampdoria|bologna|hellas verona|spezia|cagliari|genoa|venezia|salernitana|empoli|lecce|monza|cremonese)\b/i)) {
    return 'IT';
  }
  
  // Équipes anglaises
  if (teams.match(/\b(manchester united|manchester city|liverpool|chelsea|arsenal|tottenham|leicester|west ham|everton|aston villa|newcastle|brighton|crystal palace|burnley|southampton|watford|norwich|leeds|wolverhampton|sheffield|fulham|brentford)\b/i)) {
    return 'GB';
  }
  
  // Équipes allemandes
  if (teams.match(/\b(bayern münchen|borussia dortmund|rb leipzig|bayer leverkusen|borussia mönchengladbach|vfl wolfsburg|eintracht frankfurt|union berlin|sc freiburg|hoffenheim|mainz|köln|augsburg|hertha berlin|stuttgart|werder bremen|schalke|hannover|nürnberg)\b/i)) {
    return 'DE';
  }
  
  // Équipes françaises
  if (teams.match(/\b(psg|paris saint.germain|marseille|lyon|monaco|lille|nice|rennes|strasbourg|montpellier|nantes|lens|reims|brest|clermont|troyes|lorient|metz|bordeaux|saint.étienne|angers|dijon)\b/i)) {
    return 'FR';
  }
  
  return null;
}