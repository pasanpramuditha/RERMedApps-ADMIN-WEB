'use client';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import React from 'react';
import {
  TimePickerType,
  getArrowByType,
  getDateByType,
  setDateByType,
} from './time-picker-utils';

interface TimePickerInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  picker: TimePickerType;
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  onRightFocus?: () => void;
  onLeftFocus?: () => void;
}

export const TimePickerInput = React.forwardRef<
  HTMLInputElement,
  TimePickerInputProps
>(
  (
    {
      className,
      type = 'number',
      picker,
      date,
      setDate,
      onRightFocus,
      onLeftFocus,
      ...props
    },
    ref
  ) => {
    const [flag, setFlag] = React.useState<boolean>(false);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowRight') onRightFocus?.();
      if (e.key === 'ArrowLeft') onLeftFocus?.();
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.select();
      setFlag(true);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setFlag(false);
    };

    return (
      <Input
        ref={ref}
        id={picker}
        name={picker}
        className={cn(
          'w-[48px] text-center font-mono text-base tabular-nums caret-transparent [appearance:textfield] focus:bg-accent focus:text-accent-foreground [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
          className,
          flag && 'bg-accent text-accent-foreground'
        )}
        value={getDateByType(date, picker)}
        onChange={(e) => {
          setDate(setDateByType(date, e.target.value, picker));
        }}
        type={type}
        inputMode="decimal"
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
    );
  }
);

TimePickerInput.displayName = 'TimePickerInput';
