import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Zap, Globe, Filter } from 'lucide-react';
import SimplifiedRulesBuilder from './SimplifiedRulesBuilder';
import { GlobalRulesView } from './GlobalRulesView';

export function RulesManagement() {
  const [activeTab, setActiveTab] = useState('by-market');

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

      {/* Rules Management Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="by-market" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Règles par Marché
          </TabsTrigger>
          <TabsTrigger value="global-view" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Vue Globale
          </TabsTrigger>
        </TabsList>

        {/* Rules by Market Tab */}
        <TabsContent value="by-market" className="space-y-6">
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
        </TabsContent>

        {/* Global View Tab */}
        <TabsContent value="global-view" className="space-y-6">
          <GlobalRulesView />
        </TabsContent>
      </Tabs>
    </div>
  );
}