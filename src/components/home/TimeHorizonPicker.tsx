'use client';

import * as React from "react"
import { format, startOfMonth, endOfMonth, startOfYear, subMonths, subDays, isSameDay, startOfDay, endOfDay } from "date-fns"
import { Calendar as CalendarIcon, Check } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface TimeHorizonPickerProps extends React.HTMLAttributes<HTMLDivElement> {
    date: DateRange | undefined;
    setDate: React.Dispatch<React.SetStateAction<DateRange | undefined>>;
}

const PRESETS = [
  {
    id: "today",
    label: "Today",
    getValue: () => ({
      from: startOfDay(new Date()),
      to: endOfDay(new Date()),
    }),
  },
  {
    id: "yesterday",
    label: "Yesterday",
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 1)),
      to: endOfDay(subDays(new Date(), 1)),
    }),
  },
  {
    id: "last-7-days",
    label: "Last 7 Days",
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 6)),
      to: endOfDay(new Date()),
    }),
  },
  {
    id: "this-month",
    label: "This Month",
    getValue: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  {
    id: "this-year",
    label: "This Year",
    getValue: () => ({
      from: startOfYear(new Date()),
      to: endOfDay(new Date()),
    }),
  },
  {
    id: "last-month",
    label: "Last Month",
    getValue: () => ({
      from: startOfMonth(subMonths(new Date(), 1)),
      to: endOfMonth(subMonths(new Date(), 1)),
    }),
  },
  {
    id: "last-30-days",
    label: "Last 30 Days",
    getValue: () => ({
      from: subDays(new Date(), 29),
      to: new Date(),
    }),
  },
  {
    id: "custom",
    label: "Custom Range",
    getValue: (currentDate?: DateRange) => currentDate,
  },
];

export function TimeHorizonPicker({ className, date, setDate }: TimeHorizonPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [activePreset, setActivePreset] = React.useState<string>("custom");

  const getPresetForDate = (currentDate: DateRange | undefined) => {
    if (!currentDate || !currentDate.from || !currentDate.to) return "custom";

    // check "Today"
    const todayRange = {
      from: startOfDay(new Date()),
      to: endOfDay(new Date()),
    };
    if (isSameDay(currentDate.from, todayRange.from) && isSameDay(currentDate.to, todayRange.to)) {
      return "today";
    }

    const yesterdayRange = {
      from: startOfDay(subDays(new Date(), 1)),
      to: endOfDay(subDays(new Date(), 1)),
    };
    if (isSameDay(currentDate.from, yesterdayRange.from) && isSameDay(currentDate.to, yesterdayRange.to)) {
      return "yesterday";
    }

    const last7Days = {
      from: startOfDay(subDays(new Date(), 6)),
      to: endOfDay(new Date()),
    };
    if (isSameDay(currentDate.from, last7Days.from) && isSameDay(currentDate.to, last7Days.to)) {
      return "last-7-days";
    }

    // check "This Month"
    const thisMonth = {
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    };
    if (isSameDay(currentDate.from, thisMonth.from) && isSameDay(currentDate.to, thisMonth.to)) {
      return "this-month";
    }

    // check "This Year"
    const thisYear = {
      from: startOfYear(new Date()),
      to: endOfDay(new Date()),
    };
    if (isSameDay(currentDate.from, thisYear.from) && isSameDay(currentDate.to, thisYear.to)) {
      return "this-year";
    }

    // check "Last Month"
    const lastMonth = {
      from: startOfMonth(subMonths(new Date(), 1)),
      to: endOfMonth(subMonths(new Date(), 1)),
    };
    if (isSameDay(currentDate.from, lastMonth.from) && isSameDay(currentDate.to, lastMonth.to)) {
      return "last-month";
    }

    // check "Last 30 Days"
    const last30Days = {
      from: subDays(new Date(), 29),
      to: new Date(),
    };
    if (isSameDay(currentDate.from, last30Days.from) && isSameDay(currentDate.to, last30Days.to)) {
      return "last-30-days";
    }

    return "custom";
  };

  React.useEffect(() => {
    setActivePreset(getPresetForDate(date));
  }, [date]);

  const handlePresetClick = (presetId: string) => {
    setActivePreset(presetId);
    if (presetId !== "custom") {
      const preset = PRESETS.find(p => p.id === presetId);
      if (preset) {
        setDate(preset.getValue());
        setOpen(false);
      }
    }
  };

  const handleCalendarSelect = (newRange: DateRange | undefined) => {
    setDate(newRange);
    setActivePreset("custom");
    if (newRange?.from && newRange?.to) {
      setTimeout(() => setOpen(false), 200);
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[260px] justify-center text-center font-normal border-white/10 bg-white/5 hover:bg-white/10 text-white gap-2.5 transition-all flex items-center",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="h-4 w-4 text-white/60 shrink-0" />
            <span className="truncate flex items-center gap-2">
              {date?.from ? (
                date.to && !isSameDay(date.from, date.to) ? (
                  <>
                    {format(date.from, "LLL dd, y")} -{" "}
                    {format(date.to, "LLL dd, y")}
                  </>
                ) : (
                  <span className="flex items-center gap-2">
                    {format(date.from, "LLL dd, y")}
                    {activePreset === "today" && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    )}
                  </span>
                )
              ) : (
                <span>Pick a date</span>
              )}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-0 flex flex-col md:flex-row border border-white/10 bg-[#0c0c0e]/95 backdrop-blur-xl shadow-2xl rounded-xl overflow-hidden" 
          align="end"
        >
          {/* Preset sidebar */}
          <div className="flex flex-col gap-1 p-3 border-b md:border-b-0 md:border-r border-white/10 min-w-[150px] bg-white/[0.01]">
            <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] px-2.5 mb-2">Date Presets</p>
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetClick(preset.id)}
                className={cn(
                  "flex items-center justify-between text-left px-3 py-2 text-xs rounded-lg transition-all font-medium",
                  activePreset === preset.id
                    ? "bg-white/10 text-white font-semibold shadow-sm border border-white/10"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                )}
              >
                <span>{preset.label}</span>
                {activePreset === preset.id && <Check className="w-3.5 h-3.5 text-white/80" />}
              </button>
            ))}
          </div>
          {/* Calendar */}
          <div className="p-1.5">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={handleCalendarSelect}
              numberOfMonths={2}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
