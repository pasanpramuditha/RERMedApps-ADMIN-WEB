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
import { PlusCircle, CalendarIcon, Paperclip, Upload } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '../ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { addExpense, editExpense } from '@/app/(dashboard)/expenses-tracker/actions';
import { Spinner } from '../ui/spinner';
import type { Expense } from '@/app/(dashboard)/expenses-tracker/data';

const addExpenseSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { message: "Expense name is required" }),
  amount: z.coerce.number().min(0.01, { message: "Amount must be greater than 0" }),
  date: z.date({ required_error: "A date is required." }),
  category: z.enum(['One-Time', 'Recurring']),
  currency: z.enum(['USD', 'LKR']),
  attachmentUrl: z.string().url().optional(),
});

type AddExpenseFormValues = z.infer<typeof addExpenseSchema>;

interface AddExpenseDialogProps {
  isEditMode?: boolean;
  expenseToEdit?: Expense;
  children?: React.ReactNode;
}

export function AddExpenseDialog({ isEditMode = false, expenseToEdit, children }: AddExpenseDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<AddExpenseFormValues>({
    resolver: zodResolver(addExpenseSchema),
    defaultValues: isEditMode && expenseToEdit ? {
        ...expenseToEdit,
        date: new Date(expenseToEdit.date),
    } : {
        name: '',
        amount: undefined, 
        category: 'One-Time',
        date: new Date(),
        currency: 'USD',
        attachmentUrl: undefined,
    },
  });

  React.useEffect(() => {
    if (isEditMode && expenseToEdit) {
      form.reset({
        ...expenseToEdit,
        date: new Date(expenseToEdit.date),
      });
      if(expenseToEdit.attachmentUrl) {
        setFileName("Existing attachment");
      } else {
        setFileName(null);
      }
    } else {
       form.reset({
        name: '',
        amount: undefined,
        category: 'One-Time',
        date: new Date(),
        currency: 'USD',
        attachmentUrl: undefined,
      });
      setFileName(null);
    }
  }, [isOpen, isEditMode, expenseToEdit, form]);

  // NOTE: This is a placeholder for actual file upload logic.
  // In a real app, you would upload the file to a service like Firebase Storage
  // and get back a URL.
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFileName(file.name);

    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // In a real app, this would be the URL from your storage service
    const mockUrl = `https://example.com/uploads/${file.name}`;
    form.setValue('attachmentUrl', mockUrl);
    
    setIsUploading(false);
    toast({ title: 'Upload Complete', description: `${file.name} has been uploaded.` });
  };


  const onSubmit = async (data: AddExpenseFormValues) => {
    setIsSubmitting(true);
    
    const result = isEditMode 
      ? await editExpense({ ...data, id: expenseToEdit!.id })
      : await addExpense(data);
      
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
          description: `${data.name} has been successfully ${isEditMode ? 'updated' : 'added'}.`,
      });
      form.reset();
      setFileName(null);
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {isEditMode ? children : (
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the details for this expense.' : 'Enter the details for a new expense.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expense Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. MacBook Pro" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="e.g. 2499.00" {...field} disabled={isSubmitting} value={field.value || ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="LKR">LKR</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="One-Time">One-Time</SelectItem>
                      <SelectItem value="Recurring">Recurring</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Expense Date</FormLabel>
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
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormItem>
                <FormLabel>Attachment</FormLabel>
                <FormControl>
                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline" className="flex-1" disabled={isUploading || isSubmitting}>
                            <label>
                                <Paperclip className="mr-2 h-4 w-4" />
                                {fileName || "Upload Bill/Receipt"}
                                <input type="file" className="sr-only" onChange={handleFileUpload} accept="image/*,application/pdf" />
                            </label>
                        </Button>
                        {isUploading && <Spinner size="small" />}
                    </div>
                </FormControl>
                <FormMessage />
            </FormItem>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button" disabled={isSubmitting}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting || isUploading}>
                {isSubmitting ? <Spinner size="small" /> : (isEditMode ? 'Save Changes' : 'Add Expense')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
