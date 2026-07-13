
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
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Spinner } from '../ui/spinner';
import { Switch } from '../ui/switch';
import { updateRegisteredUser } from '@/app/(dashboard)/registered-user/actions';
import type { RegisteredUser } from '@/app/(dashboard)/registered-user/data';
import { DialogClose } from '@radix-ui/react-dialog';
import { BellOff, Crown, MessageCircle, MonitorSmartphone, ShieldCheck, Smartphone, UserRoundCog } from 'lucide-react';

const editUserFormSchema = z.object({
  premium: z.boolean(),
  ads_free: z.boolean(),
  ss_enabled: z.boolean(),
  chat_enabled: z.boolean(),
});

type EditUserFormValues = z.infer<typeof editUserFormSchema>;

interface EditUserDialogProps {
  user: RegisteredUser;
  children: React.ReactNode;
  onSave?: () => void;
}

const parseFlag = (value: string | number | undefined): boolean => {
    return value === 1 || value === '1';
}

export function EditUserDialog({ user, children, onSave }: EditUserDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: {
      premium: parseFlag(user.premium),
      ads_free: parseFlag(user.ads_free),
      ss_enabled: parseFlag(user.ss_enabled),
      chat_enabled: parseFlag(user.chat_enabled),
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        premium: parseFlag(user.premium),
        ads_free: parseFlag(user.ads_free),
        ss_enabled: parseFlag(user.ss_enabled),
        chat_enabled: parseFlag(user.chat_enabled),
      });
    }
  }, [isOpen, user, form]);

  const onSubmit = async (data: EditUserFormValues) => {
    setIsSubmitting(true);
    
    const result = await updateRegisteredUser({
      appId: user.appId,
      email: user.email,
      ...data,
    });
      
    setIsSubmitting(false);

    if (result.error) {
      toast({
        title: 'Error Updating User',
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({
          title: 'User Updated',
          description: 'The user details have been saved.',
      });
      onSave?.();
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="overflow-hidden border-white/10 bg-[#0b0c11] p-0 text-white shadow-2xl shadow-black/60 sm:max-w-xl">
        <DialogHeader className="relative border-b border-white/10 px-6 py-5 text-left">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(59,130,246,0.20),transparent_36%),radial-gradient(circle_at_100%_0%,rgba(16,185,129,0.14),transparent_34%)]" />
          <div className="relative flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/15 text-blue-200">
              <UserRoundCog className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate text-xl font-semibold tracking-tight text-white">Edit User</DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-5 text-white/50">
                Update permissions for <span className="font-medium text-white/80">{user.email}</span>.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5 p-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">App Context</div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-white">{user.appName}</div>
                  <div className="mt-0.5 truncate text-sm text-white/45">{user.dbName}</div>
                </div>
                <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                  {user.os}
                </div>
              </div>
            </div>

             <div className="space-y-2 rounded-2xl border border-white/10 bg-black/25 p-3">
                <ToggleField control={form.control} name="premium" title="Premium Access" description="Force-enable premium features." icon={Crown} />
                <ToggleField control={form.control} name="ads_free" title="Ads-Free Experience" description="Remove in-app advertising." icon={BellOff} />
                <ToggleField control={form.control} name="ss_enabled" title="Screenshot Enabled" description="Allow screenshot-related tools." icon={ShieldCheck} />
                <ToggleField control={form.control} name="chat_enabled" title="Chat Enabled" description="Allow in-app chat access." icon={MessageCircle} />
            </div>
            
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <MetaItem icon={Smartphone} label="Device" value={user.device} />
                <MetaItem icon={MonitorSmartphone} label="Version" value={user.version} />
                <MetaItem label="Registered" value={user.registered_date} />
                <MetaItem label="Last Online" value={user.last_online} />
            </div>
            
            <DialogFooter className="gap-2 border-t border-white/10 pt-5 sm:justify-end">
              <DialogClose asChild>
                <Button variant="outline" type="button" disabled={isSubmitting} className="rounded-full border-white/10 bg-white/[0.04] px-5 text-white hover:bg-white/[0.08]">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting} className="rounded-full bg-blue-600 px-6 font-semibold text-white shadow-lg shadow-blue-950/30 hover:bg-blue-500">
                {isSubmitting ? <Spinner size="small" /> : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ToggleField({
  control,
  name,
  title,
  description,
  icon: Icon,
}: {
  control: any;
  name: keyof EditUserFormValues;
  title: string;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-white/55">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <FormLabel className="text-sm font-semibold text-white">{title}</FormLabel>
              <div className="mt-0.5 text-xs text-white/42">{description}</div>
            </div>
          </div>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

function MetaItem({ icon: Icon, label, value }: { icon?: React.ElementType; label: string; value?: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">
        {Icon ? <Icon className="h-3.5 w-3.5 text-blue-200/60" /> : null}
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-medium text-white/80">{value || '-'}</div>
    </div>
  );
}
