
'use client';

import * as React from 'react';
import Image from 'next/image';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';
import { updateAdSettings } from '@/app/(dashboard)/admob-ads/actions';
import type { AdSettings, PlatformAdSettings } from '@/app/(dashboard)/admob-ads/data';
import { platformAdSettingsSchema } from '@/app/(dashboard)/admob-ads/data';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  AppWindow,
  BadgeCheck,
  Image as ImageIcon,
  MonitorSmartphone,
  PanelTop,
  Save,
  Smartphone,
  Timer,
} from 'lucide-react';

interface EditAdSettingsDialogProps {
  appSettings: AdSettings;
  platform: 'android' | 'ios';
  children: React.ReactNode;
  onSuccess?: () => void;
}

type FormData = PlatformAdSettings;

const placementCopy: Record<keyof Pick<FormData, 'banner' | 'interstitial' | 'nativeAd' | 'appOpen'>, string> = {
  banner: 'Standard banner placement shown inside app screens.',
  interstitial: 'Full-screen ad shown between app actions.',
  nativeAd: 'Native ad placement blended into app content.',
  appOpen: 'Ad shown when users open or return to the app.',
};

const AdSettingSwitch = ({
  control,
  name,
  label,
  disabled,
  icon: Icon,
}: {
  control: any;
  name: keyof FormData;
  label: string;
  disabled: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) => (
    <div className="group flex items-center justify-between gap-4 rounded-lg border bg-background/70 p-4 transition-colors hover:bg-muted/30">
        <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground">
                <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
                <Label htmlFor={name} className="font-medium leading-none">{label}</Label>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                    {placementCopy[name as keyof typeof placementCopy] ?? 'Ad placement setting.'}
                </p>
            </div>
        </div>
        <Controller 
            name={name}
            control={control}
            render={({ field }) => {
                const isNotImplemented = field.value === undefined;
                return (
                    <div className="flex shrink-0 items-center gap-3">
                         <span
                           className={cn(
                             'min-w-9 rounded-full border px-2 py-1 text-center text-[11px] font-semibold uppercase leading-none',
                             isNotImplemented
                               ? 'border-amber-500/40 bg-amber-500/10 text-amber-500'
                               : field.value
                                 ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                                 : 'border-border bg-muted/50 text-muted-foreground'
                           )}
                         >
                           {isNotImplemented ? 'N/I' : field.value ? 'On' : 'Off'}
                         </span>
                         <Switch 
                            id={name} 
                            checked={!!field.value}
                            onCheckedChange={field.onChange} 
                            disabled={disabled || isNotImplemented}
                        />
                    </div>
                )
            }}
        />
    </div>
);


export function EditAdSettingsDialog({ appSettings, platform, children, onSuccess }: EditAdSettingsDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(platformAdSettingsSchema),
    defaultValues: appSettings.settings,
  });

  const { control, handleSubmit, reset } = form;
  const implementedSettings = React.useMemo(
    () => Object.values(appSettings.settings).filter((value) => typeof value === 'boolean'),
    [appSettings.settings]
  );
  const runningPlacements = implementedSettings.filter(Boolean).length;
  const PlatformIcon = platform === 'android' ? MonitorSmartphone : Smartphone;
  const platformLabel = platform === 'android' ? 'Android' : 'iOS';
  
  React.useEffect(() => {
    if (isOpen) {
        reset(appSettings.settings);
    }
  }, [isOpen, appSettings, reset])

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    
    const result = await updateAdSettings({
        appId: appSettings.id,
        platform: platform,
        settings: data,
    });
    
    setIsSubmitting(false);

    if ('error' in result && result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
        toast({ title: "Success", description: `${appSettings.name} ${platform} settings updated.` });
        setIsOpen(false);
        onSuccess?.();
    }
  };
  
  const FrequencyInput = ({ name, label, hint }: { name: 'nativeInterval' | 'rewardInterval', label: string, hint: string }) => (
     <div className="flex items-center justify-between gap-4 rounded-lg border bg-background/70 p-3">
        <div className="min-w-0">
            <Label htmlFor={name} className="text-sm font-medium">{label}</Label>
            <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>
        </div>
        <Controller 
            name={name}
            control={control} 
            render={({ field }) => (
                <Input 
                    id={name} 
                    type="number" 
                    value={typeof field.value === 'number' ? field.value : ''}
                    onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} 
                    disabled={isSubmitting || field.value === undefined}
                    className="h-9 w-24 text-right font-mono"
                />
            )}
        />
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="overflow-hidden p-0 sm:max-w-xl">
        <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader className="border-b bg-muted/20 px-6 py-5">
                <div className="flex items-start justify-between gap-4 pr-8">
                    <div className="flex min-w-0 items-center gap-4">
                        <Image src={appSettings.icon_url} alt={appSettings.name} width={56} height={56} className="size-14 rounded-xl border bg-muted" data-ai-hint="app icon" />
                        <div className="min-w-0">
                            <div className="min-w-0">
                                <DialogTitle className="truncate text-xl">{appSettings.name}</DialogTitle>
                                <Badge className="mt-2 gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-emerald-300 hover:bg-emerald-500/10">
                                    <PlatformIcon className="h-3.5 w-3.5" />
                                    {platformLabel}
                                </Badge>
                            </div>
                            <DialogDescription className="mt-1">
                                Manage {platformLabel} ad placements and delivery frequency.
                            </DialogDescription>
                        </div>
                    </div>
                    <div className="hidden shrink-0 items-center gap-2 rounded-md border bg-background/70 px-2.5 py-1.5 sm:flex">
                        <span className="text-sm font-semibold leading-none">{runningPlacements}</span>
                        <span className="text-[10px] font-medium uppercase text-muted-foreground">Running</span>
                    </div>
                </div>
            </DialogHeader>
            
            <div className="space-y-5 px-6 py-5">
                 <section className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-semibold">Ad placements</h3>
                            <p className="text-xs text-muted-foreground">
                                Toggle live placements for this {platformLabel} app.
                            </p>
                        </div>
                        <Badge variant="outline" className="gap-1 rounded-md">
                            <BadgeCheck className="h-3.5 w-3.5 text-emerald-400" />
                            {runningPlacements} active
                        </Badge>
                    </div>
                    <div className="grid gap-3">
                 {platform === 'android' ? (
                    <>
                        <AdSettingSwitch control={control} name="banner" label="Banner Ad" disabled={isSubmitting} icon={PanelTop} />
                        <AdSettingSwitch control={control} name="interstitial" label="Interstitial Ad" disabled={isSubmitting} icon={AppWindow} />
                        <AdSettingSwitch control={control} name="nativeAd" label="Native Ad" disabled={isSubmitting} icon={ImageIcon} />
                        <AdSettingSwitch control={control} name="appOpen" label="App Open Ad" disabled={isSubmitting} icon={Smartphone} />
                    </>
                 ) : ( // iOS
                    <>
                        <AdSettingSwitch control={control} name="banner" label="Banner Ad" disabled={isSubmitting} icon={PanelTop} />
                        <AdSettingSwitch control={control} name="interstitial" label="Interstitial Ad" disabled={isSubmitting} icon={AppWindow} />
                    </>
                 )}
                    </div>
                 </section>

                 {platform === 'android' && (
                    <section className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Timer className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <h3 className="text-sm font-semibold">Frequency</h3>
                                <p className="text-xs text-muted-foreground">Control repeat timing for supported Android ads.</p>
                            </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                           <FrequencyInput name="nativeInterval" label="Native Interval" hint="Views between native ads" />
                           <FrequencyInput name="rewardInterval" label="Reward Interval" hint="Hours between rewards" />
                        </div>
                    </section>
                 )}
            </div>
            
            <DialogFooter className="border-t bg-background/95 px-6 py-4">
                <DialogClose asChild>
                    <Button variant="outline" type="button" disabled={isSubmitting}>Close</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting} className="gap-2">
                    {isSubmitting ? <Spinner size="small" /> : <Save className="h-4 w-4" />}
                    Update Settings
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
