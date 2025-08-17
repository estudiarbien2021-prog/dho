import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Zap } from 'lucide-react';
import SimplifiedRulesBuilder from './SimplifiedRulesBuilder';

export function RulesManagement() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-xl font-bold">Configuration des Règles IA</h2>
            <p className="text-sm text-text-weak">
              Créez et gérez vos règles de recommandation avec une logique conditionnelle
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Règles Conditionnelles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SimplifiedRulesBuilder />
        </CardContent>
      </Card>
    </div>
  );
}