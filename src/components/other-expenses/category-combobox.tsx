
'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface CategoryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  categories: string[];
  placeholder?: string;
  disabled?: boolean;
}

export function CategoryCombobox({ value, onChange, categories, placeholder, disabled=false }: CategoryComboboxProps) {
  const [open, setOpen] = React.useState(false);
  
  const handleSelect = (category: string) => {
    onChange(category);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {value || placeholder || "Select a category..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search categories..." />
          <CommandList>
            {categories.length === 0 && <CommandEmpty>No categories found.</CommandEmpty>}
            <CommandGroup>
              {categories.map(category => (
                <CommandItem
                  key={category}
                  value={category}
                  onSelect={() => handleSelect(category)}
                >
                    <Check className={cn('mr-2 h-4 w-4', value === category ? 'opacity-100' : 'opacity-0')} />
                    {category}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
