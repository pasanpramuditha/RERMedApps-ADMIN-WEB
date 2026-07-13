
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
import { PlusCircle, Banknote } from 'lucide-react';
import { addCashAccount, updateCashAccount } from '@/app/(dashboard)/wealth-tracker/actions';
import { Spinner } from '../ui/spinner';
import type { CashAccount } from '@/app/(dashboard)/wealth-tracker/data';

const cashAccountFormSchema = z.object({
  bankName: z.string().min(1, { message: "Bank name is required" }),
  balance: z.coerce.number().min(0, { message: "Balance cannot be negative" }),
});

type FormValues = z.infer<typeof cashAccountFormSchema>;

interface AddCashAccountDialogProps {
  isEditMode?: boolean;
  account?: CashAccount;
  onSave?: () => void;
  children?: React.ReactNode;
}

export function AddCashAccountDialog({ isEditMode = false, account, onSave, children }: AddCashAccountDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(cashAccountFormSchema),
    defaultValues: isEditMode && account ? account : {
      bankName: '',
      balance: undefined,
    },
  });

  React.useEffect(() => {
    if (isOpen) {
        if (isEditMode && account) {
            form.reset(account);
        } else {
            form.reset({ bankName: '', balance: undefined });
        }
    }
  }, [isOpen, isEditMode, account, form]);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    
    const result = isEditMode && account
      ? await updateCashAccount(account.id, data)
      : await addCashAccount(data);
      
    setIsSubmitting(false);

    if (result.error) {
      toast({
        title: `Error ${isEditMode ? 'Updating' : 'Adding'} Account`,
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({
          title: `Account ${isEditMode ? 'Updated' : 'Added'}`,
          description: `The account for ${data.bankName} has been saved.`,
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
            Add Account
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Cash Account' : 'Add Cash Account'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the details for this cash account.' : 'Enter the details for a new on-hand cash account.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Bank of Ceylon" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
                control={form.control}
                name="balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Balance (LKR)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="e.g. 1,000,000.00" {...field} disabled={isSubmitting} value={field.value || ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button" disabled={isSubmitting}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Spinner size="small" /> : (isEditMode ? 'Save Changes' : 'Add Account')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
