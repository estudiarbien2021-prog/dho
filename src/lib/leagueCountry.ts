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

export function leagueToFlag(league:string): FlagInfo {
  const text = (league||"").toLowerCase();
  for (const r of leagueCountryRules){ if (r.re.test(text)) return { code:r.code, confed:r.confed }; }
  return { code:"" };
}