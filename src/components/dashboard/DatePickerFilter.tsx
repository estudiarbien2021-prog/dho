import React, { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DatePickerFilterProps {
  selectedDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
}

export function DatePickerFilter({ selectedDate, onDateChange }: DatePickerFilterProps) {
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      // Utiliser UTC pour éviter les problèmes de fuseau horaire
      onDateChange(new Date(value + 'T00:00:00.000Z'));
    } else {
      onDateChange(undefined);
    }
  };

  const formatDateForInput = (date: Date | undefined): string => {
    if (!date) return '';
    // Utiliser les méthodes locales pour éviter les décalages UTC
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Input
          type="date"
          value={formatDateForInput(selectedDate)}
          onChange={handleDateChange}
          className="w-[180px] pl-10"
        />
        <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>
      
      {selectedDate && (
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => onDateChange(undefined)}
          className="text-xs p-2"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}