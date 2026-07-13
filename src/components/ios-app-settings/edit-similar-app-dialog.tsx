
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Spinner } from '../ui/spinner';
import type { SimilarApp } from '@/app/(dashboard)/ios-app-settings/data';
import { addSimilarApp, updateSimilarApp } from '@/app/(dashboard)/ios-app-settings/actions';
import { ScrollArea } from '../ui/scroll-area';

const formSchema = z.object({
  app_name: z.string().min(1, 'App Name is required'),
  app_name_en: z.string(),
  app_name_de: z.string(),
  app_name_es: z.string(),
  app_name_fr: z.string(),
  app_name_pt: z.string(),
  app_name_ru: z.string(),
  app_name_zh: z.string(),
  app_name_ja: z.string(),
  app_name_ko: z.string(),
  app_name_it: z.string(),
  app_name_id: z.string(),
  app_name_vi: z.string(),
  app_name_tr: z.string(),
  app_icon_url: z.string().url('Must be a valid URL'),
  apple_id: z.string().min(1, 'Apple ID is required'),
});

type FormValues = z.infer<typeof formSchema>;

interface EditSimilarAppDialogProps {
  isEditMode?: boolean;
  appToEdit?: SimilarApp;
  onSave?: () => void;
  children: React.ReactNode;
  appDbName: string;
}

const languageFields: (keyof FormValues)[] = [
  'app_name_en', 'app_name_de', 'app_name_es', 'app_name_fr', 'app_name_pt', 'app_name_ru', 'app_name_zh', 'app_name_ja', 'app_name_ko', 'app_name_it', 'app_name_id', 'app_name_vi', 'app_name_tr'
];

export function EditSimilarAppDialog({ isEditMode = false, appToEdit, onSave, children, appDbName }: EditSimilarAppDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode && appToEdit ? appToEdit : {
      app_name: '',
      app_name_en: '',
      app_name_de: '',
      app_name_es: '',
      app_name_fr: '',
      app_name_pt: '',
      app_name_ru: '',
      app_name_zh: '',
      app_name_ja: '',
      app_name_ko: '',
      app_name_it: '',
      app_name_id: '',
      app_name_vi: '',
      app_name_tr: '',
      app_icon_url: '',
      apple_id: '',
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset(isEditMode && appToEdit ? appToEdit : {
        app_name: '', app_name_en: '', app_name_de: '', app_name_es: '', app_name_fr: '', app_name_pt: '', app_name_ru: '', app_name_zh: '', app_name_ja: '', app_name_ko: '', app_name_it: '', app_name_id: '', app_name_vi: '', app_name_tr: '', app_icon_url: '', apple_id: '',
      });
    }
  }, [isOpen, isEditMode, appToEdit, form]);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    
    const result = isEditMode && appToEdit
      ? await updateSimilarApp(appDbName, appToEdit.id, data)
      : await addSimilarApp(appDbName, data);
      
    setIsSubmitting(false);

    if (result.error) {
      toast({ title: `Error`, description: result.error, variant: 'destructive' });
    } else {
      toast({ title: `Success!`, description: `Similar app ${isEditMode ? 'updated' : 'added'}.` });
      onSave?.();
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Similar App' : 'Add Similar App'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the details for this app.' : 'Add a new app to the similar apps list.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="h-96 w-full p-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4">
                <FormField control={form.control} name="app_name" render={({ field }) => ( <FormItem> <FormLabel>App Name (Primary)</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="apple_id" render={({ field }) => ( <FormItem> <FormLabel>Apple ID</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="app_icon_url" render={({ field }) => ( <FormItem className="md:col-span-2"> <FormLabel>App Icon URL</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                
                {languageFields.map((langKey) => (
                  <FormField key={langKey} control={form.control} name={langKey} render={({ field }) => (
                    <FormItem>
                      <FormLabel>App Name ({langKey.split('_')[2].toUpperCase()})</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                ))}
              </div>
            </ScrollArea>
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button variant="outline" type="button" disabled={isSubmitting}>Cancel</Button></DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Spinner size="small" /> : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
