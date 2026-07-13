
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { PlusCircle, CalendarIcon, Paperclip } from 'lucide-react';
import { listExpenseCategories, listExpenseSubCategories } from '@/app/(dashboard)/other-expenses/actions';
import { saveFinanceExpense } from '@/app/(dashboard)/finance-hub/actions';
import { Spinner } from '../ui/spinner';
import type { OtherExpense } from '@/app/(dashboard)/other-expenses/data';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Textarea } from '../ui/textarea';
import { CategoryCombobox } from './category-combobox';
import { CategoryManagerDialog } from './category-manager-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { useAuth } from '@/hooks/use-auth';


const otherExpenseFormSchema = z.object({
  category: z.string().min(1, "Category is required"),
  subCategory: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  currency: z.enum(['USD', 'LKR']),
  date: z.date(),
  recurrence: z.enum(['One-Time', 'Monthly', 'Annually']),
  attachmentUrl: z.string().url().optional().or(z.literal('')),
  generateRecurring: z.boolean().optional(),
});

type FormValues = z.infer<typeof otherExpenseFormSchema>;

interface AddOtherExpenseDialogProps {
  isEditMode?: boolean;
  expenseToEdit?: OtherExpense;
  onSave?: () => void;
  children?: React.ReactNode;
  categories: string[];
}

export function AddOtherExpenseDialog({ isEditMode = false, expenseToEdit, onSave, children, categories: initialCategories }: AddOtherExpenseDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const { toast } = useToast();
  const [categories, setCategories] = React.useState(initialCategories);
  const [subCategories, setSubCategories] = React.useState<string[]>([]);
  const { getToken } = useAuth();

  const fetchCategories = React.useCallback(async () => {
    const fetchedCategories = await listExpenseCategories();
    setCategories(fetchedCategories);
  }, []);

  const fetchSubCategories = React.useCallback(async (parentCategory?: string) => {
    const fetchedSubCategories = await listExpenseSubCategories(parentCategory);
    setSubCategories(fetchedSubCategories);
  }, []);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(otherExpenseFormSchema),
    defaultValues: isEditMode && expenseToEdit ? {
      ...expenseToEdit,
      date: new Date(expenseToEdit.date),
      generateRecurring: !expenseToEdit.isGenerated,
    } : {
      category: '',
      subCategory: '',
      description: '',
      amount: undefined,
      currency: 'USD',
      date: new Date(),
      recurrence: 'One-Time',
      attachmentUrl: '',
      generateRecurring: true,
    },
  });

  const selectedCategory = form.watch('category');

  React.useEffect(() => {
    if (selectedCategory) {
      fetchSubCategories(selectedCategory);
    } else {
      setSubCategories([]);
    }
  }, [selectedCategory, fetchSubCategories]);

  React.useEffect(() => {
    if (isOpen) {
      if (isEditMode && expenseToEdit) {
        form.reset({
          ...expenseToEdit,
          date: new Date(expenseToEdit.date),
          generateRecurring: !expenseToEdit.isGenerated,
        });
        if(expenseToEdit.attachmentUrl) {
          try {
            const url = new URL(expenseToEdit.attachmentUrl);
            const decodedPathname = decodeURIComponent(url.pathname);
            const name = decodedPathname.split('/').pop()?.split('?')[0].split('%2F').pop() || "Existing attachment";
            setFileName(name);
          } catch {
            setFileName("Existing attachment");
          }
        } else {
          setFileName(null);
        }
      } else {
        form.reset({
          category: '',
          subCategory: '',
          description: '',
          amount: undefined,
          currency: 'USD',
          date: new Date(),
          recurrence: 'One-Time',
          attachmentUrl: '',
          generateRecurring: true,
        });
        setFileName(null);
      }
      fetchCategories();
    }
  }, [isOpen, isEditMode, expenseToEdit, form, fetchCategories]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFileName(file.name);
    toast({ title: 'Upload Disabled', description: 'Firebase Storage uploads have been removed. Paste an existing attachment URL instead.', variant: 'destructive' });
    setIsUploading(false);
  };

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    const idToken = await getToken();
    
    const result = await saveFinanceExpense({
      ...(isEditMode && expenseToEdit ? { id: expenseToEdit.id } : {}),
      category: data.category,
      subCategory: data.subCategory || '',
      description: data.description,
      amount: data.amount,
      currency: data.currency,
      date: format(data.date, 'yyyy-MM-dd'),
      recurrence: data.recurrence,
      attachmentUrl: data.attachmentUrl || '',
    }, idToken);
      
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
          description: `The expense record has been saved.`,
      });
      onSave?.();
      window.dispatchEvent(new Event('finance-hub:refresh'));
      setIsOpen(false);
    }
  };

  const handleCategoryUpdate = React.useCallback((newCategory?: string) => {
    fetchCategories();
    if (newCategory) {
        form.setValue('category', newCategory, { shouldValidate: true });
    }
  }, [fetchCategories, form]);
  
  const handleSubCategoryUpdate = React.useCallback((newSubCategory?: string) => {
    fetchSubCategories(selectedCategory);
    if(newSubCategory) {
        form.setValue('subCategory', newSubCategory, { shouldValidate: true });
    }
  }, [fetchSubCategories, form, selectedCategory]);

  const recurrenceValue = form.watch('recurrence');

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Other Expense' : 'Add Other Expense'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the details for this expense record.' : 'Enter the details for a new expense record.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            
             <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <FormLabel>Category</FormLabel>
                    <CategoryManagerDialog
                        initialCategories={categories}
                        onUpdate={handleCategoryUpdate}
                        type="main"
                    />
                  </div>
                   <CategoryCombobox
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(value);
                      form.setValue('subCategory', ''); // Reset subcategory when main category changes
                    }}
                    categories={categories}
                    placeholder="Select a category..."
                   />
                  <FormMessage />
                </FormItem>
              )}
            />

             <FormField
              control={form.control}
              name="subCategory"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <FormLabel>Sub Category (Optional)</FormLabel>
                    <CategoryManagerDialog
                        initialCategories={subCategories}
                        onUpdate={handleSubCategoryUpdate}
                        type="sub"
                        parentCategory={selectedCategory}
                        disabled={!selectedCategory}
                    />
                  </div>
                   <CategoryCombobox
                    value={field.value || ''}
                    onChange={field.onChange}
                    categories={subCategories}
                    placeholder="Select a sub category..."
                    disabled={!selectedCategory}
                   />
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g. Monthly Figma Subscription" {...field} disabled={isSubmitting} />
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
                      <Input type="number" step="0.01" placeholder="e.g. 15.00" {...field} value={field.value || ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} disabled={isSubmitting} />
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
                          <SelectValue />
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

            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="recurrence"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Recurrence</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting || (isEditMode && expenseToEdit?.isGenerated)}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="One-Time">One-Time</SelectItem>
                                <SelectItem value="Monthly">Monthly</SelectItem>
                                <SelectItem value="Annually">Annually</SelectItem>
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
                    <FormLabel>Date</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={"outline"}
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            disabled={isSubmitting}
                            >
                            {field.value ? (format(field.value, "PPP")) : (<span>Pick a date</span>)}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            {recurrenceValue !== 'One-Time' && (
                <FormField
                    control={form.control}
                    name="generateRecurring"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">Generate 5-Year Plan</FormLabel>
                                <FormDescription>Automatically create records for the next 5 years.</FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={isSubmitting || (isEditMode && expenseToEdit?.isGenerated)}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
            )}

            <FormItem>
                <FormLabel>Attachment</FormLabel>
                <FormControl>
                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline" className="flex-1" disabled={isUploading || isSubmitting}>
                            <label className="cursor-pointer">
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
            
            <DialogFooter className="pt-4">
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
