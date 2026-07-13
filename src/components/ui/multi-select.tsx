
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
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type Option = {
  value: string;
  label: string;
  icon?: React.ReactNode;
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
  placeholder = 'Select options...',
}: MultiSelectProps) {
  const handleSelect = (value: string) => {
    const isSelected = selected.includes(value);
    if (isSelected) {
      onChange(selected.filter((s) => s !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const getDisplayValue = () => {
    if (selected.length === 0) {
      return placeholder;
    }
    if (selected.length === 1) {
      return options.find(opt => opt.value === selected[0])?.label;
    }
    return `${selected.length} items selected`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={cn("w-full justify-between", className)}>
          <span className="truncate">{getDisplayValue()}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] max-h-96 overflow-y-auto">
        <DropdownMenuLabel>Available Apps</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selected.includes(option.value)}
            onCheckedChange={() => handleSelect(option.value)}
            onSelect={(e) => e.preventDefault()} // Prevent closing on item click
          >
             <div className="flex items-center gap-2">
                {option.icon}
                <span>{option.label}</span>
            </div>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
