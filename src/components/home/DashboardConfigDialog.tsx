'use client'

import * as React from 'react'
import { CheckCircle2, Clock3, Eye, EyeOff, SlidersHorizontal } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface ConfigItem {
  key: string;
  label: string;
  description: string;
}

export type DashboardVisibilityConfig = Record<string, boolean>;

interface DashboardConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: Record<string, boolean>;
  items: ConfigItem[];
  onSave: (config: Record<string, boolean>, refreshIntervalSeconds?: number) => Promise<void>;
  title?: string;
  description?: string;
  showRefreshInterval?: boolean;
  refreshIntervalSeconds?: number;
}

const REFRESH_INTERVAL_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 15, label: '15 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 300, label: '5 minutes' },
]

export function DashboardConfigDialog({
  open,
  onOpenChange,
  config,
  items,
  onSave,
  title = "Screen Configuration",
  description = "Choose which items to display on your dashboard. Hidden items will not fetch data, improving performance.",
  showRefreshInterval = false,
  refreshIntervalSeconds = 0,
}: DashboardConfigDialogProps) {
  const [localConfig, setLocalConfig] = React.useState<Record<string, boolean>>(config)
  const [localRefreshInterval, setLocalRefreshInterval] = React.useState(refreshIntervalSeconds)
  const [saving, setSaving] = React.useState(false)
  const { toast } = useToast()
  const visibleCount = items.filter((item) => localConfig[item.key] ?? true).length

  React.useEffect(() => {
    setLocalConfig(config)
  }, [config])

  React.useEffect(() => {
    setLocalRefreshInterval(refreshIntervalSeconds)
  }, [refreshIntervalSeconds])

  const handleToggle = (key: string) => {
    setLocalConfig((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(localConfig, localRefreshInterval)
      toast({
        title: "Configuration Saved",
        description: "Dashboard layout has been updated.",
      })
      onOpenChange(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save configuration.'
      console.error(`Failed to save dashboard config: ${message}`)
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[86vh] flex-col overflow-hidden rounded-3xl border-white/10 bg-[#08090d] p-0 text-white shadow-2xl shadow-black/50 sm:max-w-xl [&>button]:right-5 [&>button]:top-5 [&>button]:rounded-full [&>button]:border [&>button]:border-white/10 [&>button]:bg-white/5 [&>button]:p-1.5 [&>button]:opacity-100 [&>button]:ring-0 [&>button]:ring-offset-0 [&>button]:transition-colors [&>button:hover]:bg-white/10">
        <DialogHeader className="relative overflow-hidden border-b border-white/10 px-6 pb-5 pt-6">
          <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,0.24),transparent_42%),radial-gradient(circle_at_82%_4%,rgba(16,185,129,0.16),transparent_36%)]" />
          <div className="relative flex items-start gap-4 pr-10">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-400/25 bg-blue-500/15 text-blue-200 shadow-lg shadow-blue-950/25">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <DialogTitle className="text-xl font-semibold tracking-tight text-white">
                  {title}
                </DialogTitle>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-200">
                  {visibleCount}/{items.length} visible
                </span>
              </div>
              <DialogDescription className="max-w-md text-sm leading-6 text-white/55">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {showRefreshInterval && (
            <div className="rounded-2xl border border-blue-400/15 bg-blue-500/[0.08] p-4 shadow-inner shadow-white/[0.02]">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/15 text-blue-200">
                    <Clock3 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <Label htmlFor="home-refresh-interval" className="text-sm font-semibold leading-none text-white">
                      Refresh Interval
                    </Label>
                    <p className="text-xs text-white/45">
                      Update visible values in the background.
                    </p>
                  </div>
                </div>
                <Select
                  value={String(localRefreshInterval)}
                  onValueChange={(value) => setLocalRefreshInterval(Number(value))}
                >
                  <SelectTrigger id="home-refresh-interval" className="h-11 w-[138px] rounded-full border-white/10 bg-black/25 px-4 text-sm text-white shadow-none hover:bg-white/[0.06]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#101116] text-white">
                    {REFRESH_INTERVAL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {items.map((item) => {
              const checked = localConfig[item.key] ?? true

              return (
                <div
                  key={item.key}
                  className={cn(
                    "group flex items-center justify-between gap-4 rounded-2xl border p-4 transition-all",
                    checked
                      ? "border-white/10 bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-blue-400/35 hover:bg-white/[0.07]"
                      : "border-white/[0.06] bg-white/[0.02] opacity-70 hover:opacity-90"
                  )}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className={cn(
                        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors",
                        checked
                          ? "border-blue-400/20 bg-blue-500/15 text-blue-200"
                          : "border-white/10 bg-white/[0.04] text-white/35"
                      )}
                    >
                      {checked ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <Label
                        htmlFor={item.key}
                        className="block cursor-pointer text-sm font-semibold leading-none text-white peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {item.label}
                      </Label>
                      <p className="line-clamp-2 text-xs leading-5 text-white/42">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id={item.key}
                    checked={checked}
                    onCheckedChange={() => handleToggle(item.key)}
                    className="shrink-0 data-[state=checked]:bg-blue-500"
                  />
                </div>
              )
            })}
          </div>
        </div>

        <DialogFooter className="border-t border-white/10 bg-[#0b0c11]/95 px-6 py-4 backdrop-blur">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-white/45">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              <span>{visibleCount} dashboard item{visibleCount === 1 ? '' : 's'} enabled</span>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-11 rounded-full border-white/10 bg-white/[0.03] px-5 text-white hover:bg-white/[0.08] hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="h-11 rounded-full bg-blue-600 px-6 font-semibold text-white shadow-lg shadow-blue-950/30 hover:bg-blue-500"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
