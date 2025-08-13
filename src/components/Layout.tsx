import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, Upload, Archive, Table2, Settings, Moon, Sun } from 'lucide-react';
import { Language, useTranslation } from '@/lib/i18n';

interface LayoutProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
}

export function Layout({ currentLang, onLanguageChange }: LayoutProps) {
  const [isDark, setIsDark] = useState(false);
  const t = useTranslation(currentLang);

  const toggleDark = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const navItems = [
    { path: '/dashboard', icon: BarChart3, label: t.dashboard },
    { path: '/table', icon: Table2, label: 'Tableau' },
    { path: '/upload', icon: Upload, label: t.upload },
    { path: '/archives', icon: Archive, label: t.archives },
  ];

  const languages: { code: Language; label: string }[] = [
    { code: 'fr', label: 'FR' },
    { code: 'en', label: 'EN' },
    { code: 'pt', label: 'PT' },
    { code: 'es', label: 'ES' },
  ];

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-surface-strong border-b border-surface-strong">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-brand-600">Football Analytics Pro</h1>
              
              <nav className="flex space-x-6">
                {navItems.map(({ path, icon: Icon, label }) => (
                  <NavLink
                    key={path}
                    to={path}
                    className={({ isActive }) =>
                      `flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive 
                          ? 'bg-brand-100 text-brand-700 border border-brand-200' 
                          : 'text-text-weak hover:text-text hover:bg-surface-soft'
                      }`
                    }
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              {/* Language Selector */}
              <div className="flex space-x-1 bg-surface-soft rounded-md p-1 border border-surface-strong">
                {languages.map(({ code, label }) => (
                  <button
                    key={code}
                    onClick={() => onLanguageChange(code)}
                    className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                      currentLang === code
                        ? 'bg-brand text-brand-fg'
                        : 'text-text-weak hover:text-text hover:bg-surface'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDark}
                className="p-2 rounded-md text-text-weak hover:text-text hover:bg-surface-soft transition-colors"
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}