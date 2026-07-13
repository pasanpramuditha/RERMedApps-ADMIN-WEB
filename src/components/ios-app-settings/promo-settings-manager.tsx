'use client';

import * as React from 'react';
import { AlertCircle, CalendarClock, Hash, Save, Type, Zap } from 'lucide-react';
import { getPromoSettings, savePromoSettings } from '@/app/(dashboard)/ios-app-settings/actions';
import type { PromoSetting } from '@/app/(dashboard)/ios-app-settings/data';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

interface PromoSettingsManagerProps {
  appDbName: string;
}

function formatLabel(value: string) {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function toInputDateTime(value: string | null) {
  if (!value) {
    return '';
  }

  return value.replace(' ', 'T').slice(0, 16);
}

function toMysqlDateTime(value: string) {
  return value ? `${value.replace('T', ' ')}:00` : null;
}

function isToggleSetting(setting: PromoSetting) {
  return (setting.int_value === 0 || setting.int_value === 1) && setting.string_value === null && setting.date_value === null;
}

export function PromoSettingsManager({ appDbName }: PromoSettingsManagerProps) {
  const [promos, setPromos] = React.useState<PromoSetting[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const { promos: fetchedPromos, error: fetchError } = await getPromoSettings(appDbName);
      if (fetchError) {
        setError(fetchError);
      } else {
        setPromos(fetchedPromos);
      }
      setLoading(false);
    };

    fetchData();
  }, [appDbName]);

  const updatePromo = (param: string, patch: Partial<PromoSetting>) => {
    setPromos((current) => current.map((promo) => (promo.param === param ? { ...promo, ...patch } : promo)));
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await savePromoSettings({ dbName: appDbName, promos });
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Promo settings have been saved.' });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Promotion Settings</CardTitle>
          <CardDescription>Manage app promotion flags, values, and dates.</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Failed to Load Promotion Settings</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="overflow-hidden border-white/10 bg-card/80">
      <CardHeader className="flex flex-row items-start justify-between border-b border-white/10">
        <div>
          <CardTitle>Promotion Settings</CardTitle>
          <CardDescription>Manage app promotion flags, discount text, timing, and trial offer values.</CardDescription>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Spinner size="small" className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
          Save Promo
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="hidden grid-cols-[minmax(240px,1fr)_220px_minmax(240px,0.9fr)] border-b border-white/10 bg-white/[0.045] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:grid">
          <div>Promotion</div>
          <div>Value</div>
          <div>Comment</div>
        </div>
        {promos.map((promo) => {
          const toggle = isToggleSetting(promo);
          const hasDate = promo.date_value !== null;
          const hasString = promo.string_value !== null;
          const hasInt = promo.int_value !== null;
          const Icon = hasDate ? CalendarClock : toggle ? Zap : hasInt ? Hash : Type;

          return (
            <div key={promo.param} className="grid gap-3 border-b border-white/10 px-4 py-3.5 last:border-b-0 md:grid-cols-[minmax(240px,1fr)_220px_minmax(240px,0.9fr)] md:items-center">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">{formatLabel(promo.param)}</h3>
                </div>
                <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{promo.param}</p>
              </div>
              <div>
                {toggle ? (
                  <div className="flex h-9 items-center justify-between rounded-lg border border-white/10 bg-background/80 px-3">
                    <span className="text-xs font-semibold text-muted-foreground">{promo.int_value === 1 ? 'On' : 'Off'}</span>
                    <Switch checked={promo.int_value === 1} onCheckedChange={(checked) => updatePromo(promo.param, { int_value: checked ? 1 : 0 })} />
                  </div>
                ) : hasDate ? (
                  <Input
                    type="datetime-local"
                    value={toInputDateTime(promo.date_value)}
                    onChange={(event) => updatePromo(promo.param, { date_value: toMysqlDateTime(event.target.value) })}
                    className="h-9"
                  />
                ) : hasInt ? (
                  <Input
                    type="number"
                    value={promo.int_value ?? ''}
                    onChange={(event) => updatePromo(promo.param, { int_value: event.target.value === '' ? null : event.target.valueAsNumber })}
                    className="h-9"
                  />
                ) : hasString ? (
                  <Input
                    value={promo.string_value ?? ''}
                    onChange={(event) => updatePromo(promo.param, { string_value: event.target.value })}
                    className="h-9"
                  />
                ) : (
                  <div className="flex h-9 items-center rounded-lg border border-dashed border-white/10 px-3 text-xs text-muted-foreground">No editable value</div>
                )}
              </div>
              <p className="text-xs leading-5 text-muted-foreground">{promo.comment || 'No comment'}</p>
            </div>
          );
        })}
        {promos.length === 0 && (
          <div className="p-10 text-center text-sm text-muted-foreground">No promotion settings found for this app.</div>
        )}
      </CardContent>
    </Card>
  );
}
