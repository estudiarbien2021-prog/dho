import React from 'react';
import { Download, Calendar, FileText } from 'lucide-react';
import { Language, useTranslation } from '@/lib/i18n';

interface ArchivesProps {
  currentLang: Language;
}

export function Archives({ currentLang }: ArchivesProps) {
  const t = useTranslation(currentLang);

  // Mock data for demonstration
  const mockArchives = [
    {
      date: '2024-01-15',
      total_matches: 150,
      iffhs_matches: 89,
      shortlist_count: 23
    },
    {
      date: '2024-01-14',
      total_matches: 132,
      iffhs_matches: 76,
      shortlist_count: 18
    },
    {
      date: '2024-01-13',
      total_matches: 98,
      iffhs_matches: 54,
      shortlist_count: 12
    }
  ];

  const exportTypes = [
    { key: 'clean', label: 'Données nettoyées', desc: 'Toutes les données normalisées' },
    { key: 'iffhs', label: 'IFFHS + Coupes', desc: 'Scope compétitions appliqué' },
    { key: 'shortlist', label: 'Shortlist', desc: 'Low-vig + Watch signals' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">{t.archives}</h1>
        <div className="text-sm text-text-mute">
          Les exports sont archivés par date d'import
        </div>
      </div>

      {mockArchives.length === 0 ? (
        <div className="bg-surface-soft rounded-xl p-12 text-center border border-surface-strong">
          <FileText className="w-12 h-12 text-text-mute mx-auto mb-4" />
          <p className="text-lg text-text-mute">Aucun archive disponible</p>
          <p className="text-text-mute mt-2">Importez votre premier fichier CSV pour commencer</p>
        </div>
      ) : (
        <div className="space-y-4">
          {mockArchives.map((archive) => (
            <div key={archive.date} className="bg-surface-soft rounded-xl p-6 border border-surface-strong">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-brand" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text">
                      {new Date(archive.date).toLocaleDateString(currentLang === 'fr' ? 'fr-FR' : 'en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </h3>
                    <p className="text-sm text-text-mute">
                      {archive.total_matches} matchs • {archive.iffhs_matches} IFFHS • {archive.shortlist_count} shortlist
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {exportTypes.map((type) => (
                  <div key={type.key} className="bg-surface rounded-lg p-4 border border-surface-strong">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-text">{type.label}</h4>
                      <button className="p-1 rounded text-text-weak hover:text-brand hover:bg-brand-50 transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-text-mute">{type.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Panel */}
      <div className="bg-surface-soft rounded-xl p-6 border border-surface-strong">
        <h3 className="text-lg font-semibold text-text mb-4">À propos des exports</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <h4 className="font-medium text-text mb-2">Données nettoyées</h4>
            <ul className="space-y-1 text-text-weak">
              <li>• Normalisation des datetime</li>
              <li>• Calcul des probas fair</li>
              <li>• Calcul du vigorish</li>
              <li>• Flags low-vig et watch</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-text mb-2">IFFHS + Coupes</h4>
            <ul className="space-y-1 text-text-weak">
              <li>• 1ère div des 50 pays IFFHS</li>
              <li>• 2ème div des 10 premiers</li>
              <li>• Coupes continentales</li>
              <li>• Coupes nationales</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-text mb-2">Shortlist</h4>
            <ul className="space-y-1 text-text-weak">
              <li>• Low-vig 1X2 (≤ 12%)</li>
              <li>• Watch BTTS (≥60%, vig≤15%)</li>
              <li>• Watch Over 2.5 (≥60%, vig≤15%)</li>
              <li>• Seulement les signaux forts</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}