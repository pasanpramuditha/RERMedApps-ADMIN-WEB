
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { DevicePreview } from './device-preview';
import { AppTargetSelector } from './app-target-selector';
import { sendNotification } from '@/app/(dashboard)/push-notifications/actions';
import type { App } from '@/app/(dashboard)/apps/data';
import { BellRing } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';


const notificationSchema = z.object({
  title: z.string().min(1, "Title is required").max(65, "Title should be 65 characters or less"),
  message: z.string().min(1, "Message is required").max(178, "Message should be 178 characters or less"),
  imageUrl: z.string().url("Please enter a valid URL").optional().or(z.literal('')),
  platformTarget: z.enum(['all', 'ios', 'android']).default('all'),
  targetApps: z.array(z.string()).min(1, "Please select at least one app to target"),
  sendOption: z.enum(['now', 'schedule']).default('now'),
  scheduledTime: z.date().optional(),
}).refine(data => {
    if (data.sendOption === 'schedule' && !data.scheduledTime) {
        return false;
    }
    return true;
}, {
    message: "Scheduled date and time are required",
    path: ['scheduledTime'],
});

type NotificationFormValues = z.infer<typeof notificationSchema>;

interface NotificationComposerProps {
  apps: App[];
}

export function NotificationComposer({ apps }: NotificationComposerProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      title: '',
      message: '',
      imageUrl: '',
      platformTarget: 'all',
      targetApps: [],
      sendOption: 'now',
      scheduledTime: undefined,
    },
  });

  const watchAllFields = form.watch();

  const filteredApps = React.useMemo(() => {
    const { platformTarget } = watchAllFields;
    if (platformTarget === 'all') return apps;
    if (platformTarget === 'ios') return apps.filter(app => app.os === 'iOS');
    if (platformTarget === 'android') return apps.filter(app => app.os === 'Android');
    return [];
  }, [apps, watchAllFields.platformTarget]);

  React.useEffect(() => {
    // When the platform filter changes, we need to clear the selected apps 
    // to avoid sending notifications to apps that are no longer visible.
    form.setValue('targetApps', []);
  }, [watchAllFields.platformTarget, form]);


  const onSubmit = async (data: NotificationFormValues) => {
    setIsSubmitting(true);
    // We only need to pass the final values to the action
    const finalData = { ...data };
    delete (finalData as any).platformTarget; 
    
    const result = await sendNotification(finalData);
    setIsSubmitting(false);

    if (result.error) {
      console.error('SEND_ADMIN_PUSH_NOTIFICATION failed:', result);
      toast({
        title: "Error sending notification",
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: "Notification Sent!",
        description: result.summary || 'Your notification has been sent successfully.',
      });
      form.reset();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Notification Content</CardTitle>
                        <CardDescription>Compose the title, message, and image for your notification.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Title</FormLabel>
                                <FormControl><Input placeholder="New Feature Alert!" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="message"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Message</FormLabel>
                                <FormControl><Textarea placeholder="Check out our latest AI-powered analysis tool." {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="imageUrl"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Image URL (Optional)</FormLabel>
                                <FormControl><Input type="url" placeholder="https://placehold.co/600x400.png" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Targeting</CardTitle>
                        <CardDescription>Select which platforms and apps will receive this notification.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="platformTarget"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Platform</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select target platforms" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="all">All Platforms</SelectItem>
                                        <SelectItem value="ios">iOS Only</SelectItem>
                                        <SelectItem value="android">Android Only</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="targetApps"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Apps</FormLabel>
                                    <AppTargetSelector apps={filteredApps} value={field.value} onChange={field.onChange} />
                                    <FormMessage className="pt-2" />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Preview</CardTitle>
                        <CardDescription>This is how your notification will appear on devices.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DevicePreview 
                            title={watchAllFields.title}
                            message={watchAllFields.message}
                            imageUrl={watchAllFields.imageUrl}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
        <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => form.reset()}>Reset</Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner size="small" className="mr-2"/>}
                <BellRing className="mr-2 h-4 w-4"/>
                {watchAllFields.sendOption === 'schedule' ? 'Schedule Notification' : 'Send Notification'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
