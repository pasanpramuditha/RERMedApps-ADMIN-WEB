
'use client';

import * as React from 'react';
import { MonthYearPicker } from './month-year-picker';

interface PageHeaderProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  children?: React.ReactNode;
}

export function PageHeader({ selectedDate, onDateChange, children }: PageHeaderProps) {
  
  return (
    <div className="mb-6">
       <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
            Here&apos;s a summary of your app&apos;s performance.
            </p>
        </div>
        <div className="flex items-center gap-2 mt-4 md:mt-0">
            {children}
            <MonthYearPicker
              value={selectedDate}
              onChange={onDateChange}
            />
        </div>
       </div>
    </div>
  );
}
