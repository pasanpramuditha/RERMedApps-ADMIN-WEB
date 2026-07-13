
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
import { Link2, PlusCircle } from 'lucide-react';
import { addCommonLink, updateCommonLink } from '@/app/(dashboard)/common-links/actions';
import { Spinner } from '../ui/spinner';
import type { CommonLink } from '@/app/(dashboard)/common-links/data';
import { useAuth } from '@/hooks/use-auth';

const linkFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  link: z.string().url("Please enter a valid URL"),
});

type FormValues = z.infer<typeof linkFormSchema>;

interface AddLinkDialogProps {
  isEditMode?: boolean;
  linkToEdit?: CommonLink;
  onSave?: () => void;
  children?: React.ReactNode;
}

export function AddLinkDialog({ isEditMode = false, linkToEdit, onSave, children }: AddLinkDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();
  const { getToken } = useAuth();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(linkFormSchema),
    defaultValues: isEditMode && linkToEdit ? linkToEdit : {
      name: '',
      link: '',
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      if (isEditMode && linkToEdit) {
        form.reset(linkToEdit);
      } else {
        form.reset({ name: '', link: '' });
      }
    }
  }, [isOpen, isEditMode, linkToEdit, form]);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    const idToken = await getToken();
    
    const result = isEditMode && linkToEdit
      ? await updateCommonLink(linkToEdit.id, data, idToken)
      : await addCommonLink(data, idToken);
      
    setIsSubmitting(false);

    if (result.error) {
      toast({
        title: `Error ${isEditMode ? 'Updating' : 'Adding'} Link`,
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({
          title: `Link ${isEditMode ? 'Updated' : 'Added'}`,
          description: `The link "${data.name}" has been saved.`,
      });
      onSave?.();
      setIsOpen(false);
    }
  };

  return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Link
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="overflow-hidden border-white/10 bg-card p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-white/10 bg-gradient-to-br from-sky-500/[0.12] to-transparent px-6 py-5 text-left">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-sky-400/25 bg-sky-500/[0.15] text-sky-100">
              <Link2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>{isEditMode ? 'Edit Link' : 'Add New Link'}</DialogTitle>
              <DialogDescription className="mt-1">
                {isEditMode ? 'Update this shortcut name or URL.' : 'Create a reusable shortcut for an important page.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5 px-6 py-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input className="rounded-xl border-white/10 bg-background/60" placeholder="e.g. Google Play Console" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link (URL)</FormLabel>
                  <FormControl>
                    <Input className="rounded-xl border-white/10 bg-background/60" type="url" placeholder="https://..." {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="border-t border-white/10 pt-4">
              <DialogClose asChild>
                <Button variant="outline" type="button" className="rounded-xl" disabled={isSubmitting}>Cancel</Button>
              </DialogClose>
              <Button type="submit" className="rounded-xl" disabled={isSubmitting}>
                {isSubmitting ? <Spinner size="small" /> : (isEditMode ? 'Save Changes' : 'Add Link')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
