
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
import { PlusCircle, CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '../ui/calendar';
import { addFixedDeposit, updateFixedDeposit } from '@/app/(dashboard)/wealth-tracker/actions';
import { Spinner } from '../ui/spinner';
import type { FixedDeposit } from '@/app/(dashboard)/wealth-tracker/data';

const formSchema = z.object({
  bankName: z.string().min(1, "Bank name is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  startDate: z.date({ required_error: "Start date is required." }),
  endDate: z.date({ required_error: "End date is required." }),
  interestRate: z.coerce.number().min(0, "Interest rate cannot be negative").max(100, "Interest rate seems too high"),
}).refine(data => data.endDate > data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
});


type FormValues = z.infer<typeof formSchema>;

interface AddFixedDepositDialogProps {
  isEditMode?: boolean;
  deposit?: FixedDeposit;
  onSave?: () => void;
  children?: React.ReactNode;
}

export function AddFixedDepositDialog({ isEditMode = false, deposit, onSave, children }: AddFixedDepositDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();

  const defaultValues = {
      bankName: '',
      amount: undefined,
      startDate: new Date(),
      endDate: new Date(),
      interestRate: undefined
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode && deposit ? {
        ...deposit,
        startDate: new Date(deposit.startDate),
        endDate: new Date(deposit.endDate),
    } : defaultValues,
  });

  React.useEffect(() => {
    if (isOpen) {
        if (isEditMode && deposit) {
            form.reset({
                ...deposit,
                startDate: new Date(deposit.startDate),
                endDate: new Date(deposit.endDate),
            });
        } else {
            form.reset(defaultValues);
        }
    }
  }, [isOpen, isEditMode, deposit, form]);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    
    const result = isEditMode && deposit
      ? await updateFixedDeposit(deposit.id, data)
      : await addFixedDeposit(data);
      
    setIsSubmitting(false);

    if (result.error) {
      toast({
        title: `Error ${isEditMode ? 'Updating' : 'Adding'} Deposit`,
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({
          title: `Deposit ${isEditMode ? 'Updated' : 'Added'}`,
          description: `The fixed deposit at ${data.bankName} has been saved.`,
      });
      onSave?.();
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {isEditMode ? children : (
            <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Deposit
            </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Fixed Deposit' : 'Add Fixed Deposit'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the details for this fixed deposit.' : 'Enter the details for a new fixed deposit.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField control={form.control} name="bankName" render={({ field }) => ( <FormItem> <FormLabel>Bank Name</FormLabel> <FormControl><Input placeholder="e.g. Commercial Bank" {...field} disabled={isSubmitting} /></FormControl> <FormMessage /> </FormItem> )}/>
            <FormField control={form.control} name="amount" render={({ field }) => ( <FormItem> <FormLabel>Amount (LKR)</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="e.g. 500000.00" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} disabled={isSubmitting} /></FormControl> <FormMessage /> </FormItem> )}/>
            
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Start Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={isSubmitting}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
             <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>End Date</FormLabel>
                   <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                            variant={"outline"}
                            className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                            )}
                            disabled={isSubmitting}
                            >
                            {field.value ? (
                                format(field.value, "PPP")
                            ) : (
                                <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField control={form.control} name="interestRate" render={({ field }) => ( <FormItem> <FormLabel>Interest Rate (%)</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="e.g. 12.5" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} disabled={isSubmitting} /></FormControl> <FormMessage /> </FormItem> )}/>
            
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button" disabled={isSubmitting}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Spinner size="small" /> : (isEditMode ? 'Save Changes' : 'Add Deposit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
