import React from 'react';
import { Language, useTranslation } from '@/lib/i18n';

interface DashboardProps {
  currentLang: Language;
}

export function Dashboard({ currentLang }: DashboardProps) {
  const t = useTranslation(currentLang);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">{t.dashboard}</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-surface-soft rounded-xl p-6 border border-surface-strong">
          <h3 className="text-sm font-medium text-text-weak mb-2">{t.totalMatches}</h3>
          <p className="text-2xl font-bold text-text">-</p>
        </div>
        
        <div className="bg-surface-soft rounded-xl p-6 border border-surface-strong">
          <h3 className="text-sm font-medium text-text-weak mb-2">{t.lowVigMatches}</h3>
          <p className="text-2xl font-bold text-brand">-</p>
        </div>
        
        <div className="bg-surface-soft rounded-xl p-6 border border-surface-strong">
          <h3 className="text-sm font-medium text-text-weak mb-2">{t.watchBtts}</h3>
          <p className="text-2xl font-bold text-brand">-</p>
        </div>
        
        <div className="bg-surface-soft rounded-xl p-6 border border-surface-strong">
          <h3 className="text-sm font-medium text-text-weak mb-2">{t.watchOver25}</h3>
          <p className="text-2xl font-bold text-brand">-</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-soft rounded-xl p-6 border border-surface-strong">
          <h3 className="text-lg font-semibold text-text mb-4">{t.matchesByCategory}</h3>
          <div className="h-64 flex items-center justify-center text-text-mute">
            {t.noData}
          </div>
        </div>

        <div className="bg-surface-soft rounded-xl p-6 border border-surface-strong">
          <h3 className="text-lg font-semibold text-text mb-4">{t.vigorishDistribution}</h3>
          <div className="h-64 flex items-center justify-center text-text-mute">
            {t.noData}
          </div>
        </div>

        <div className="bg-surface-soft rounded-xl p-6 border border-surface-strong">
          <h3 className="text-lg font-semibold text-text mb-4">{t.hourlyHeatmap}</h3>
          <div className="h-64 flex items-center justify-center text-text-mute">
            {t.noData}
          </div>
        </div>

        <div className="bg-surface-soft rounded-xl p-6 border border-surface-strong">
          <h3 className="text-lg font-semibold text-text mb-4">{t.topLeagues}</h3>
          <div className="h-64 flex items-center justify-center text-text-mute">
            {t.noData}
          </div>
        </div>
      </div>
    </div>
  );
}