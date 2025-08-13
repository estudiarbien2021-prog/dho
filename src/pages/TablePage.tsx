import React from 'react';
import { ProcessedMatch } from '@/types/match';
import { Language } from '@/lib/i18n';
import { MatchTable } from '@/components/MatchTable';

interface TablePageProps {
  matches: ProcessedMatch[];
  currentLang: Language;
}

export function TablePage({ matches, currentLang }: TablePageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">Tableau des matchs</h1>
      </div>

      <MatchTable matches={matches} currentLang={currentLang} />
    </div>
  );
}