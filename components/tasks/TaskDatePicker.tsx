'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

interface TaskDatePickerProps {
  _date?: Date;
  onChange: (_date: Date | undefined) => void;
}

export default function TaskDatePicker({ _date, onChange }: TaskDatePickerProps) {
  const [open, setOpen] = useState(false);

  const handleChange = (d: Date | undefined) => {
    onChange(d);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <Button variant="outline" className="w-full justify-start text-left font-normal" type="button">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {_date ? format(_date, 'PPP') : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={_date}
          onSelect={handleChange}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}