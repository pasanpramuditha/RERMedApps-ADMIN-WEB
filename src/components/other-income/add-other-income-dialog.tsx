
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
import { BadgeDollarSign, CalendarIcon, Paperclip, PlusCircle } from 'lucide-react';
import { addOtherIncome, updateOtherIncome, listIncomeCategories, uploadFinanceAttachment } from '@/app/(dashboard)/other-income/actions';
import { Spinner } from '../ui/spinner';
import type { OtherIncome } from '@/app/(dashboard)/other-income/data';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Textarea } from '../ui/textarea';
import { CategoryCombobox } from './category-combobox';
import { CategoryManagerDialog } from './category-manager-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useAuth } from '@/hooks/use-auth';


const otherIncomeFormSchema = z.object({
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  currency: z.enum(['USD', 'LKR']),
  date: z.date(),
  attachmentUrl: z.string().url().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof otherIncomeFormSchema>;

interface AddOtherIncomeDialogProps {
  isEditMode?: boolean;
  incomeToEdit?: OtherIncome;
  onSave?: () => void;
  children?: React.ReactNode;
  categories: string[];
}

export function AddOtherIncomeDialog({ isEditMode = false, incomeToEdit, onSave, children, categories: initialCategories }: AddOtherIncomeDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const { toast } = useToast();
  const [categories, setCategories] = React.useState(initialCategories);
  const { getToken } = useAuth();

  const fetchCategories = React.useCallback(async () => {
    const fetchedCategories = await listIncomeCategories();
    setCategories(prev => Array.from(new Set([...prev, ...fetchedCategories])).sort((a, b) => a.localeCompare(b)));
  }, []);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(otherIncomeFormSchema),
    defaultValues: isEditMode && incomeToEdit ? {
      ...incomeToEdit,
      date: new Date(incomeToEdit.date),
    } : {
      category: '',
      description: '',
      amount: undefined,
      currency: 'USD',
      date: new Date(),
      attachmentUrl: '',
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      if (isEditMode && incomeToEdit) {
        form.reset({
          ...incomeToEdit,
          date: new Date(incomeToEdit.date),
        });
        if(incomeToEdit.attachmentUrl) {
          try {
            const url = new URL(incomeToEdit.attachmentUrl);
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
          description: '',
          amount: undefined,
          currency: 'USD',
          date: new Date(),
          attachmentUrl: '',
        });
        setFileName(null);
      }
      fetchCategories();
    }
  }, [isOpen, isEditMode, incomeToEdit, form, fetchCategories]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFileName(file.name);
    toast({ title: 'Uploading...', description: `Uploading ${file.name}...` });

    try {
        const uploadData = new FormData();
        uploadData.append('file', file);
        const result = await uploadFinanceAttachment(uploadData);
        if (!result.success || !result.url) {
            throw new Error(result.error || 'Could not upload the file.');
        }
        form.setValue('attachmentUrl', result.url, { shouldValidate: true });
        toast({ title: 'Upload Complete', description: `${file.name} has been uploaded.` });
    } catch (error: any) {
        console.error('Upload failed:', error);
        toast({ title: 'Upload Failed', description: error?.message || 'Could not upload the file. Please try again.', variant: 'destructive' });
        setFileName(null);
    } finally {
        setIsUploading(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    const idToken = await getToken();
    
    const result = isEditMode && incomeToEdit
      ? await updateOtherIncome(incomeToEdit.id, data, idToken)
      : await addOtherIncome(data, idToken);
      
    setIsSubmitting(false);

    if (result.error) {
      const debugText = result.debug ? `\n\n${JSON.stringify(result.debug).slice(0, 700)}` : '';
      toast({
        title: `Error ${isEditMode ? 'Updating' : 'Adding'} Income`,
        description: `${result.error}${debugText}`,
        variant: 'destructive',
      });
    } else {
      toast({
          title: `Income ${isEditMode ? 'Updated' : 'Added'}`,
          description: `The income record has been saved.`,
      });
      onSave?.();
      window.dispatchEvent(new Event('finance-hub:refresh'));
      setIsOpen(false);
    }
  };

  const handleCategoryUpdate = React.useCallback((newCategory?: string) => {
    if (newCategory) {
        setCategories(prev => prev.includes(newCategory) ? prev : [...prev, newCategory].sort((a, b) => a.localeCompare(b)));
        form.setValue('category', newCategory, { shouldValidate: true });
        return;
    }

    fetchCategories();
  }, [fetchCategories, form]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="gap-2">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Income
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b bg-muted/20 px-6 py-5">
          <div className="flex items-start gap-3 pr-8">
            <div className="rounded-lg border bg-background p-2">
              <BadgeDollarSign className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <DialogTitle>{isEditMode ? 'Edit Other Income' : 'Add Other Income'}</DialogTitle>
              <DialogDescription className="mt-1">
                {isEditMode ? 'Update the details for this income record.' : 'Enter the details for a new income record.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5 px-6 py-5">
            
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <FormLabel>Category</FormLabel>
                    <CategoryManagerDialog initialCategories={categories} onUpdate={handleCategoryUpdate} />
                  </div>
                   <CategoryCombobox
                    value={field.value}
                    onChange={field.onChange}
                    categories={categories}
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
                    <Textarea placeholder="e.g. YouTube Ad Revenue" {...field} disabled={isSubmitting} />
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
                      <Input className="h-11" type="number" step="0.01" placeholder="e.g. 150.00" {...field} value={field.value || ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} disabled={isSubmitting} />
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
                        <SelectTrigger className="h-11">
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
                          className={cn("h-11 w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
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

            <FormItem>
                <FormLabel>Attachment</FormLabel>
                <FormControl>
                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline" className="h-11 flex-1 justify-start gap-2 rounded-lg" disabled={isUploading || isSubmitting}>
                            <label className="cursor-pointer truncate">
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
            
            <DialogFooter className="-mx-6 -mb-5 border-t bg-background/95 px-6 py-4">
              <DialogClose asChild>
                <Button variant="outline" type="button" disabled={isSubmitting}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting || isUploading} className="gap-2">
                {isSubmitting ? <Spinner size="small" /> : null}
                {isEditMode ? 'Update Income' : 'Add Income'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
