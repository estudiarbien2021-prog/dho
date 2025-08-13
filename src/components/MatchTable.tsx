import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Star, FileText, Search, Filter, Download } from 'lucide-react';
import { ProcessedMatch } from '@/types/match';
import { Language, useTranslation } from '@/lib/i18n';
import { leagueToFlag } from '@/lib/leagueCountry';
import { FlagMini } from './Flag';

interface MatchTableProps {
  matches: ProcessedMatch[];
  currentLang: Language;
  showParisTime?: boolean;
}

export function MatchTable({ matches, currentLang, showParisTime = false }: MatchTableProps) {
  const t = useTranslation(currentLang);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [flagFilter, setFlagFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<keyof ProcessedMatch>('kickoff_local');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Favorites and notes (localStorage)
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});

  const filteredAndSortedMatches = useMemo(() => {
    let filtered = matches.filter(match => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (!match.league.toLowerCase().includes(searchLower) &&
            !match.home_team.toLowerCase().includes(searchLower) &&
            !match.away_team.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Category filter
      if (categoryFilter !== 'all' && match.category !== categoryFilter) {
        return false;
      }

      // Flag filter
      if (flagFilter === 'lowVig' && !match.is_low_vig_1x2) return false;
      if (flagFilter === 'bttsWatch' && !match.watch_btts) return false;
      if (flagFilter === 'over25Watch' && !match.watch_over25) return false;

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [matches, searchTerm, categoryFilter, flagFilter, sortField, sortDirection]);

  const handleSort = (field: keyof ProcessedMatch) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleFavorite = (matchId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(matchId)) {
      newFavorites.delete(matchId);
    } else {
      newFavorites.add(matchId);
    }
    setFavorites(newFavorites);
  };

  const formatTime = (date: Date) => {
    if (showParisTime) {
      return format(date, 'HH:mm');
    }
    return format(date, 'HH:mm');
  };

  const formatProbability = (prob: number) => {
    return (prob * 100).toFixed(1) + '%';
  };

  const formatVigorish = (vig: number) => {
    return (vig * 100).toFixed(1) + '%';
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-surface-soft rounded-xl border border-surface-strong">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-mute" />
            <input
              type="text"
              placeholder={t.search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface border border-surface-strong rounded-md text-text placeholder-text-mute focus:border-brand focus:outline-none"
            />
          </div>
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 bg-surface border border-surface-strong rounded-md text-text focus:border-brand focus:outline-none"
        >
          <option value="all">{t.all}</option>
          <option value="first_div">{t.first_div}</option>
          <option value="second_div">{t.second_div}</option>
          <option value="continental_cup">{t.continental_cup}</option>
          <option value="national_cup">{t.national_cup}</option>
        </select>

        <select
          value={flagFilter}
          onChange={(e) => setFlagFilter(e.target.value)}
          className="px-3 py-2 bg-surface border border-surface-strong rounded-md text-text focus:border-brand focus:outline-none"
        >
          <option value="all">{t.all}</option>
          <option value="lowVig">{t.lowVig}</option>
          <option value="bttsWatch">{t.bttsWatch}</option>
          <option value="over25Watch">{t.over25Watch}</option>
        </select>

        <button className="px-4 py-2 bg-brand text-brand-fg rounded-md hover:bg-brand-600 transition-colors flex items-center gap-2">
          <Download className="w-4 h-4" />
          {t.export}
        </button>
      </div>

      {/* Table */}
      <div className="bg-surface-soft rounded-xl border border-surface-strong overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-strong">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-weak uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('kickoff_local')}
                    className="flex items-center gap-1 hover:text-text"
                  >
                    {t.time}
                    {sortField === 'kickoff_local' && (
                      <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-weak uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('league')}
                    className="flex items-center gap-1 hover:text-text"
                  >
                    {t.league}
                    {sortField === 'league' && (
                      <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-weak uppercase tracking-wider">
                  {t.match}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-text-weak uppercase tracking-wider">
                  {t.homeWin}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-text-weak uppercase tracking-wider">
                  {t.draw}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-text-weak uppercase tracking-wider">
                  {t.awayWin}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-text-weak uppercase tracking-wider">
                  {t.btts}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-text-weak uppercase tracking-wider">
                  {t.over25}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-text-weak uppercase tracking-wider">
                  {t.vig}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-text-weak uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-strong">
              {filteredAndSortedMatches.map((match) => {
                const flagInfo = leagueToFlag(match.league);
                const isFavorite = favorites.has(match.id);

                return (
                  <tr key={match.id} className="hover:bg-surface transition-colors">
                    <td className="px-4 py-3 text-sm text-text">
                      {formatTime(match.kickoff_local)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text">
                      <div className="flex items-center gap-2">
                        <FlagMini code={flagInfo.code} confed={flagInfo.confed} />
                        <span className="truncate max-w-32">{match.league}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text">
                      <div className="space-y-1">
                        <div className="font-medium">{match.home_team}</div>
                        <div className="text-text-mute">{match.away_team}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      <div className="text-text">{formatProbability(match.p_home_fair)}</div>
                      <div className="text-xs text-text-mute">{match.odds_home.toFixed(2)}</div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      <div className="text-text">{formatProbability(match.p_draw_fair)}</div>
                      <div className="text-xs text-text-mute">{match.odds_draw.toFixed(2)}</div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      <div className="text-text">{formatProbability(match.p_away_fair)}</div>
                      <div className="text-xs text-text-mute">{match.odds_away.toFixed(2)}</div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      <div className="text-text">{formatProbability(match.p_btts_yes_fair)}</div>
                      {match.odds_btts_yes && (
                        <div className="text-xs text-text-mute">{match.odds_btts_yes.toFixed(2)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      <div className="text-text">{formatProbability(match.p_over_2_5_fair)}</div>
                      {match.odds_over_2_5 && (
                        <div className="text-xs text-text-mute">{match.odds_over_2_5.toFixed(2)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      <div className="space-y-1">
                        <div className={`text-xs px-1 py-0.5 rounded ${
                          match.is_low_vig_1x2 ? 'bg-brand-100 text-brand-700' : 'text-text-mute'
                        }`}>
                          {formatVigorish(match.vig_1x2)}
                        </div>
                        {match.watch_btts && (
                          <div className="text-xs px-1 py-0.5 rounded bg-brand-100 text-brand-700">
                            BTTS
                          </div>
                        )}
                        {match.watch_over25 && (
                          <div className="text-xs px-1 py-0.5 rounded bg-brand-100 text-brand-700">
                            O2.5
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => toggleFavorite(match.id)}
                          className={`p-1 rounded hover:bg-surface-strong transition-colors ${
                            isFavorite ? 'text-yellow-500' : 'text-text-mute'
                          }`}
                        >
                          <Star className="w-4 h-4" />
                        </button>
                        <button className="p-1 rounded hover:bg-surface-strong transition-colors text-text-mute">
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredAndSortedMatches.length === 0 && (
          <div className="p-12 text-center text-text-mute">
            {t.noData}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-text-mute">
        <div>
          {filteredAndSortedMatches.length} / {matches.length} matchs affichés
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-brand-100 rounded"></div>
            <span>Low-Vig / Watch</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" />
            <span>Favoris</span>
          </div>
        </div>
      </div>
    </div>
  );
}