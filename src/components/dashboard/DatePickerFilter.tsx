import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerFilterProps {
  selectedDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
}

export function DatePickerFilter({ selectedDate, onDateChange }: DatePickerFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[200px] justify-start text-left font-normal",
              !selectedDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? (
              format(selectedDate, "dd/MM/yyyy", { locale: fr })
            ) : (
              <span>Sélectionner une date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              onDateChange(date);
              setIsOpen(false);
            }}
            initialFocus
            className="p-3 pointer-events-auto"
            locale={fr}
          />
        </PopoverContent>
      </Popover>
      
      {selectedDate && (
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => onDateChange(undefined)}
          className="text-xs"
        >
          Tout afficher
        </Button>
      )}
    </div>
  );
}