
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, setMonth, setYear, addYears, subYears, getYear, getMonth, startOfYear } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MonthYearPickerProps {
  value: Date;
  onChange: (date: Date) => void;
}

const months = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ];
const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);


export function MonthYearPicker({ value, onChange }: MonthYearPickerProps) {
    const [open, setOpen] = React.useState(false);
    const [displayYear, setDisplayYear] = React.useState(getYear(value));

    const selectedMonth = getMonth(value);
    const selectedYear = getYear(value);

    // Update displayYear whenever the selected value changes from the parent
    React.useEffect(() => {
        setDisplayYear(getYear(value));
    }, [value]);

    const handleMonthSelect = (monthIndex: number) => {
        const newDate = setMonth(setYear(value, displayYear), monthIndex);
        onChange(newDate);
        setOpen(false);
    };

    const handleYearSelect = (yearValue: number) => {
        // Set the date to the beginning of the selected year to signal a full-year fetch
        const newDate = startOfYear(setYear(new Date(), yearValue));
        onChange(newDate);
        setOpen(false);
    };

    const endOfMonth = format(new Date(displayYear, selectedMonth + 1, 0), 'MM/dd/yyyy');
    
    // Determine the display format. If it's a full year (Jan 1st), just show the year.
    const displayFormat = getMonth(value) === 0 && value.getDate() === 1 ? 'yyyy' : 'MMM yyyy';


    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        'w-[180px] justify-start text-left font-normal',
                        !value && 'text-muted-foreground'
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(value, displayFormat)}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Tabs defaultValue="month" className="w-[280px]">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="month">Month</TabsTrigger>
                        <TabsTrigger value="year">Year</TabsTrigger>
                    </TabsList>
                    <div className="p-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Report Ending On:</label>
                            <span className="text-sm font-mono p-1.5 rounded-md bg-muted">{endOfMonth}</span>
                        </div>
                    </div>
                    <TabsContent value="month">
                        <div className="px-3 pb-3">
                            <div className="flex items-center justify-between mb-2">
                                <Button variant="ghost" size="icon" onClick={() => setDisplayYear(displayYear - 1)}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="font-semibold">{displayYear}</span>
                                <Button variant="ghost" size="icon" onClick={() => setDisplayYear(displayYear + 1)}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {months.map((month, index) => (
                                    <Button
                                        key={month}
                                        variant={selectedMonth === index && selectedYear === displayYear ? 'default' : 'ghost'}
                                        onClick={() => handleMonthSelect(index)}
                                        className="h-8"
                                    >
                                        {month}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </TabsContent>
                    <TabsContent value="year">
                         <div className="px-3 pb-3">
                            <div className="grid grid-cols-3 gap-2">
                                {years.map((year) => (
                                    <Button
                                        key={year}
                                        variant={selectedYear === year ? 'default' : 'ghost'}
                                        onClick={() => handleYearSelect(year)}
                                        className="h-8"
                                    >
                                        {year}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </PopoverContent>
        </Popover>
    );
}
