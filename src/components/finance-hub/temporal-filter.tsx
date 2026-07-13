'use client';

import * as React from 'react';
import { DateRange } from 'react-day-picker';
import { TimeHorizonPicker } from '@/components/home/TimeHorizonPicker';

interface TemporalFilterProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onCommit: (range?: DateRange) => void;
}

export function TemporalFilter({ dateRange, onDateRangeChange, onCommit }: TemporalFilterProps) {
  const setDate: React.Dispatch<React.SetStateAction<DateRange | undefined>> = (value) => {
    const nextRange = typeof value === 'function' ? value(dateRange) : value;
    onDateRangeChange(nextRange);
    onCommit(nextRange);
  };

  return <TimeHorizonPicker date={dateRange} setDate={setDate} />;
}
