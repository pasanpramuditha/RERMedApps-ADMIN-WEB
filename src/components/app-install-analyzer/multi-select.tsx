
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Apple, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { AndroidPlatformIcon } from '@/components/home/platform-icons';

type Option = {
  value: string;
  label: string;
  iconUrl?: string;
  platform?: 'Android' | 'iOS';
};

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: React.Dispatch<React.SetStateAction<string[]>>;
  className?: string;
  placeholder?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  className,
  placeholder = 'Select apps...',
}: MultiSelectProps) {
  const allOptionValues = React.useMemo(() => options.map((option) => option.value), [options]);
  const allSelected = options.length > 0 && allOptionValues.every((value) => selected.includes(value));
  const someSelected = selected.length > 0;

  const handleSelect = (value: string) => {
    const isSelected = selected.includes(value);
    if (isSelected) {
      onChange(selected.filter((s) => s !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleSelectAll = () => {
    onChange(allSelected ? [] : allOptionValues);
  };

  const getDisplayValue = () => {
    if (selected.length === 0) {
      return placeholder;
    }
    if (allSelected) {
      return 'All Apps';
    }
    if (selected.length === 1) {
      return options.find(opt => opt.value === selected[0])?.label;
    }
    return `${selected.length} apps selected`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={cn("w-full justify-between sm:w-auto", className)}>
          <span>{getDisplayValue()}</span>
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-96 w-64 overflow-y-auto rounded-2xl border-white/10 bg-[#101116] p-2 text-white shadow-2xl shadow-black/40">
        <DropdownMenuLabel className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Available Apps</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuCheckboxItem
          checked={allSelected}
          onCheckedChange={handleSelectAll}
          onSelect={(e) => e.preventDefault()}
          className="flex items-center gap-2 rounded-xl text-sm font-semibold text-white/90 focus:bg-white/[0.06] focus:text-white"
        >
          <span>All Apps</span>
          {someSelected && !allSelected && (
            <span className="ml-auto text-xs font-medium text-white/40">{selected.length}/{options.length}</span>
          )}
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator className="bg-white/10" />
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selected.includes(option.value)}
            onCheckedChange={() => handleSelect(option.value)}
            onSelect={(e) => e.preventDefault()} // Prevent closing on item click
            className="flex items-center gap-2 rounded-xl text-sm text-white/80 focus:bg-white/[0.06] focus:text-white"
          >
            {option.platform === 'iOS' && (
              <Apple className="h-4 w-4 shrink-0 text-sky-300" aria-label="iOS" />
            )}
            {option.platform === 'Android' && (
              <AndroidPlatformIcon className="h-4 w-4 shrink-0 text-emerald-300" />
            )}
            {option.iconUrl && <Image src={option.iconUrl} alt={option.label} width={20} height={20} className="rounded-sm" data-ai-hint="app icon" />}
            <span>{option.label}</span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
