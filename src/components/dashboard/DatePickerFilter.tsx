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
      onDateChange(new Date(value + 'T00:00:00'));
    } else {
      onDateChange(undefined);
    }
  };

  const formatDateForInput = (date: Date | undefined): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
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