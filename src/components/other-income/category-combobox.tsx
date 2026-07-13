'use client';

import * as React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CategoryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  categories: string[];
}

export function CategoryCombobox({ value, onChange, categories }: CategoryComboboxProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-11 rounded-lg bg-background">
        <SelectValue placeholder="Select a category..." />
      </SelectTrigger>
      <SelectContent>
        {categories.length === 0 ? (
          <SelectItem value="__empty__" disabled>
            No categories found
          </SelectItem>
        ) : (
          categories.map((category) => (
            <SelectItem key={category} value={category}>
              {category}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
