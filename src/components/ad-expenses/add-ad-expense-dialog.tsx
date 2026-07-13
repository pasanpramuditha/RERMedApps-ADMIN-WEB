'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PlusCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { addAdExpense, updateAdExpense } from '@/app/(dashboard)/ad-expenses/actions';
import { Spinner } from '../ui/spinner';
import type { AdExpense } from '@/app/(dashboard)/ad-expenses/data';

const adExpenseFormSchema = z.object({
  year: z.coerce.number(),
  month: z.coerce.number().min(1).max(12),
  amount: z.coerce.number().positive("Amount must be positive"),
  currency: z.enum(['USD', 'LKR']),
});

type FormValues = z.infer<typeof adExpenseFormSchema>;

interface AddAdExpenseDialogProps {
  isEditMode?: boolean;
  expense?: AdExpense;
  onSave?: () => void;
  children?: React.ReactNode;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

export function AddAdExpenseDialog({ isEditMode = false, expense, onSave, children }: AddAdExpenseDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(adExpenseFormSchema),
    defaultValues: isEditMode && expense ? expense : {
      year: currentYear,
      month: new Date().getMonth() + 1,
      amount: undefined,
      currency: 'USD',
    },
  });

  React.useEffect(() => {
    if (isOpen) {
        if (isEditMode && expense) {
            form.reset(expense);
        } else {
            form.reset({
                year: currentYear,
                month: new Date().getMonth() + 1,
                amount: undefined,
                currency: 'USD',
            });
        }
    }
  }, [isOpen, isEditMode, expense, form]);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    
    const result = isEditMode && expense
      ? await updateAdExpense(expense.id, data)
      : await addAdExpense(data);
      
    setIsSubmitting(false);

    if (result.error) {
      toast({
        title: `Error ${isEditMode ? 'Updating' : 'Adding'} Expense`,
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({
          title: `Expense ${isEditMode ? 'Updated' : 'Added'}`,
          description: `The ad expense has been saved.`,
      });
      onSave?.();
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {isEditMode ? children : (
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Ad Expense
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Ad Expense' : 'Add Ad Expense'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the details for this monthly ad expense.' : 'Enter the details for a new monthly ad expense.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                 <FormField control={form.control} name="year" render={({ field }) => ( <FormItem> <FormLabel>Year</FormLabel> <Select onValueChange={(v) => field.onChange(parseInt(v))} value={String(field.value)}> <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl> <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                 <FormField control={form.control} name="month" render={({ field }) => ( <FormItem> <FormLabel>Month</FormLabel> <Select onValueChange={(v) => field.onChange(parseInt(v))} value={String(field.value)}> <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl> <SelectContent>{months.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent> </Select> <FormMessage /> </FormItem> )}/>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="amount" render={({ field }) => ( <FormItem> <FormLabel>Amount</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="e.g. 500.00" {...field} value={field.value || ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} disabled={isSubmitting} /></FormControl> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="currency" render={({ field }) => ( <FormItem> <FormLabel>Currency</FormLabel> <Select onValueChange={field.onChange} value={field.value}> <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl> <SelectContent> <SelectItem value="USD">USD</SelectItem> <SelectItem value="LKR">LKR</SelectItem> </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
            </div>
            
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button variant="outline" type="button" disabled={isSubmitting}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Spinner size="small" /> : (isEditMode ? 'Save Changes' : 'Add Expense')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
