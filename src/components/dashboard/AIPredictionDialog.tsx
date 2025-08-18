import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { DatePickerFilter } from './DatePickerFilter';
import { Bot, Calendar, Globe, CalendarRange } from 'lucide-react';

interface AIPredictionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: {
    type: 'today' | 'all' | 'range';
    dateStart?: Date;
    dateEnd?: Date;
  }) => void;
  isLoading: boolean;
}

export function AIPredictionDialog({ 
  open, 
  onOpenChange, 
  onConfirm, 
  isLoading 
}: AIPredictionDialogProps) {
  const [selectedType, setSelectedType] = useState<'today' | 'all' | 'range'>('today');
  const [dateStart, setDateStart] = useState<Date | undefined>();
  const [dateEnd, setDateEnd] = useState<Date | undefined>();

  const handleConfirm = () => {
    if (selectedType === 'range') {
      if (!dateStart || !dateEnd) {
        return; // Ne pas confirmer si les dates ne sont pas sélectionnées
      }
      if (dateStart > dateEnd) {
        return; // Ne pas confirmer si la date de début est après la date de fin
      }
    }

    onConfirm({
      type: selectedType,
      dateStart: selectedType === 'range' ? dateStart : undefined,
      dateEnd: selectedType === 'range' ? dateEnd : undefined,
    });
  };

  const isValidRange = selectedType !== 'range' || (dateStart && dateEnd && dateStart <= dateEnd);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Régénération des prédictions IA
          </DialogTitle>
          <DialogDescription>
            Sélectionnez le périmètre de matchs pour lesquels vous souhaitez régénérer les prédictions IA.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <RadioGroup value={selectedType} onValueChange={(value) => setSelectedType(value as typeof selectedType)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="today" id="today" />
              <Label htmlFor="today" className="flex items-center gap-2 cursor-pointer">
                <Calendar className="h-4 w-4" />
                Matchs d'aujourd'hui seulement
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="all" />
              <Label htmlFor="all" className="flex items-center gap-2 cursor-pointer">
                <Globe className="h-4 w-4" />
                Tous les matchs sans prédiction
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="range" id="range" />
              <Label htmlFor="range" className="flex items-center gap-2 cursor-pointer">
                <CalendarRange className="h-4 w-4" />
                Plage de dates personnalisée
              </Label>
            </div>
          </RadioGroup>

          {selectedType === 'range' && (
            <div className="ml-6 space-y-3 mt-3 p-3 border rounded-lg bg-muted/30">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Date de début</Label>
                <DatePickerFilter
                  selectedDate={dateStart}
                  onDateChange={setDateStart}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Date de fin</Label>
                <DatePickerFilter
                  selectedDate={dateEnd}
                  onDateChange={setDateEnd}
                />
              </div>

              {dateStart && dateEnd && dateStart > dateEnd && (
                <p className="text-sm text-destructive">
                  La date de début doit être antérieure à la date de fin.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!isValidRange || isLoading}
          >
            {isLoading ? 'Génération...' : 'Confirmer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}