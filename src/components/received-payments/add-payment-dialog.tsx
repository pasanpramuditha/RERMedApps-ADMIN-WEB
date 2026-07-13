
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
import { PlusCircle, CalendarIcon, Paperclip } from 'lucide-react';
import { addReceivedPayment, updateReceivedPayment } from '@/app/(dashboard)/received-payments/actions';
import { Spinner } from '../ui/spinner';
import type { ReceivedPayment } from '@/app/(dashboard)/received-payments/data';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useAuth } from '@/hooks/use-auth';


const receivedPaymentFormSchema = z.object({
  source: z.string().min(1, "Source is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  currency: z.enum(['USD', 'LKR']),
  date: z.date(),
  attachmentUrl: z.string().url().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof receivedPaymentFormSchema>;

interface AddPaymentDialogProps {
  isEditMode?: boolean;
  paymentToEdit?: ReceivedPayment;
  onSave?: () => void;
  children?: React.ReactNode;
}

export function AddPaymentDialog({ isEditMode = false, paymentToEdit, onSave, children }: AddPaymentDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const { toast } = useToast();
  const { getToken } = useAuth();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(receivedPaymentFormSchema),
    defaultValues: isEditMode && paymentToEdit ? {
      ...paymentToEdit,
      date: new Date(paymentToEdit.date),
    } : {
      source: '',
      description: '',
      amount: undefined,
      currency: 'USD',
      date: new Date(),
      attachmentUrl: '',
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      if (isEditMode && paymentToEdit) {
        form.reset({
          ...paymentToEdit,
          date: new Date(paymentToEdit.date),
        });
        if(paymentToEdit.attachmentUrl) {
          try {
            const url = new URL(paymentToEdit.attachmentUrl);
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
          source: '',
          description: '',
          amount: undefined,
          currency: 'USD',
          date: new Date(),
          attachmentUrl: '',
        });
        setFileName(null);
      }
    }
  }, [isOpen, isEditMode, paymentToEdit, form]);

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
    
    const result = isEditMode && paymentToEdit
      ? await updateReceivedPayment(paymentToEdit.id, data, idToken || undefined)
      : await addReceivedPayment(data, idToken || undefined);
      
    setIsSubmitting(false);

    if (result.error) {
      toast({
        title: `Error ${isEditMode ? 'Updating' : 'Adding'} Payment`,
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({
          title: `Payment ${isEditMode ? 'Updated' : 'Added'}`,
          description: `The payment record has been saved.`,
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
            Add Payment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Received Payment' : 'Add Received Payment'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the details for this payment record.' : 'Enter the details for a new payment record.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            
             <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Source</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Google, Apple, Upwork" {...field} disabled={isSubmitting} />
                  </FormControl>
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
                    <Textarea placeholder="e.g. AdMob Payment for July" {...field} disabled={isSubmitting} />
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
                      <Input type="number" step="0.01" placeholder="e.g. 1500.00" {...field} value={field.value || ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} disabled={isSubmitting} />
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

             <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date Received</FormLabel>
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

            <FormItem>
                <FormLabel>Attachment (Optional)</FormLabel>
                <FormControl>
                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline" className="flex-1" disabled={isUploading || isSubmitting}>
                            <label className="cursor-pointer">
                                <Paperclip className="mr-2 h-4 w-4" />
                                {fileName || "Upload Document"}
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
                {isSubmitting ? <Spinner size="small" /> : (isEditMode ? 'Save Changes' : 'Add Payment')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
