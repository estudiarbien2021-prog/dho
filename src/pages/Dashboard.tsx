import React from 'react';
import { ProcessedMatch } from '@/types/match';
import { Language } from '@/lib/i18n';

interface DashboardProps {
  currentLang: Language;
  matches: ProcessedMatch[];
}

export function Dashboard({ currentLang, matches }: DashboardProps) {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-text mb-6">Dashboard</h1>
      <p className="text-text-mute">Ready to build from scratch...</p>
    </div>
  );
}