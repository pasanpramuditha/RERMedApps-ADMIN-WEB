
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { updateInAppAd } from '@/app/(dashboard)/in-app-ads/actions';
import { Spinner } from '../ui/spinner';
import type { InAppAd } from '@/app/(dashboard)/in-app-ads/data';
import { inAppAdFormSchema, type InAppAdForm } from '@/app/(dashboard)/in-app-ads/data';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { useAuth } from '@/hooks/use-auth';
import { DialogClose } from '@radix-ui/react-dialog';

interface EditActiveAdDialogProps {
  ad: InAppAd;
  children: React.ReactNode;
  onSave?: () => void;
}

const languages = [
    { code: 'all', name: 'All Languages' },
    { code: 'en', name: '🇺🇸 English' },
    { code: 'de', name: '🇩🇪 German' },
    { code: 'es', name: '🇪🇸 Spanish' },
    { code: 'fr', name: '🇫🇷 French' },
    { code: 'pt', name: '🇵🇹 Portuguese' },
    { code: 'ru', name: '🇷🇺 Russian' },
    { code: 'zh', name: '🇨🇳 Chinese' },
    { code: 'ja', name: '🇯🇵 Japanese' },
    { code: 'ko', name: '🇰🇷 Korean' },
    { code: 'it', name: '🇮🇹 Italian' },
    { code: 'id', name: '🇮🇩 Indonesian' },
    { code: 'vi', name: '🇻🇳 Vietnamese' },
    { code: 'tr', name: '🇹🇷 Turkish' },
    { code: 'th', name: '🇹🇭 Thai' },
];

const targetGroups = [
    { value: 'ALL', label: 'All Users' },
    { value: 'PREMIUM', label: 'Premium Users' },
    { value: 'PREMIUM_ACTIVE', label: 'Premium Active Users' },
    { value: 'NONPREMIUM', label: 'Non-Premium Users' },
    { value: 'NONPREMIUM_ACTIVE', label: 'Non-Premium Active Users' },
];

export function EditActiveAdDialog({ ad, children, onSave }: EditActiveAdDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();
  const { getToken } = useAuth();
  
  const form = useForm<InAppAdForm>({
    resolver: zodResolver(inAppAdFormSchema),
    defaultValues: {
        targetApps: [ad.appId],
        templateId: ad.templateId,
        templateName: ad.templateName,
        startDate: ad.startDate,
        endDate: ad.endDate,
        oneTime: ad.oneTime,
        targetGroup: ad.targetGroup as InAppAdForm['targetGroup'],
        language: ad.language as InAppAdForm['language'],
        android: ad.android,
        ios: ad.ios,
    }
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        targetApps: [ad.appId],
        templateId: ad.templateId,
        templateName: ad.templateName,
        startDate: ad.startDate,
        endDate: ad.endDate,
        oneTime: ad.oneTime,
        targetGroup: ad.targetGroup as InAppAdForm['targetGroup'],
        language: ad.language as InAppAdForm['language'],
        android: ad.android,
        ios: ad.ios,
      });
    }
  }, [isOpen, ad, form]);

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    const idToken = await getToken();
    const result = await updateInAppAd(ad.id, data, idToken);
    
    setIsSubmitting(false);

    if (result.error) {
      toast({
        title: 'Error Updating Ad',
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({
          title: 'Ad Updated',
          description: `The active ad campaign has been updated.`,
      });
      onSave?.();
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Quick Edit Active Ad</DialogTitle>
          <DialogDescription>
            Modify details for the live campaign: &quot;{ad.templateName}&quot; on {ad.appName}. HTML content cannot be changed.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              className={cn(
                                'w-full justify-start text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(new Date(field.value), 'PPP') : <span>Pick a date</span>}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={new Date(field.value)}
                            onSelect={(date) => field.onChange(date?.toISOString().split('T')[0])}
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
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              className={cn(
                                'w-full justify-start text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(new Date(field.value), 'PPP') : <span>Pick a date</span>}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={new Date(field.value)}
                            onSelect={(date) => field.onChange(date?.toISOString().split('T')[0])}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="targetGroup" render={({ field }) => ( <FormItem> <FormLabel>Target Group</FormLabel> <Select onValueChange={field.onChange} value={field.value}> <FormControl><SelectTrigger><SelectValue placeholder="Select target group..." /></SelectTrigger></FormControl> <SelectContent> {targetGroups.map(group => (<SelectItem key={group.value} value={group.value}>{group.label}</SelectItem>))} </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="language" render={({ field }) => ( <FormItem> <FormLabel>Language</FormLabel> <Select onValueChange={field.onChange} value={field.value}> <FormControl><SelectTrigger><SelectValue placeholder="Select language..." /></SelectTrigger></FormControl> <SelectContent> {languages.map(lang => (<SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>))} </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
            </div>
             <FormField
                control={form.control}
                name="oneTime"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-md border p-4">
                    <FormLabel className="font-normal">Show as a one-time ad</FormLabel>
                    <FormControl>
                        <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                        />
                    </FormControl>
                    </FormItem>
                )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button variant="outline" type="button" disabled={isSubmitting}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Spinner size="small" /> : 'Deploy Changes to Live'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
