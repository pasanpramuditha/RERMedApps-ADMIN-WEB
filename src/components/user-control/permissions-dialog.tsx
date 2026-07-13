
'use client';

import * as React from 'react';
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
import { Spinner } from '../ui/spinner';
import { getNavVisibilityKey, navSections } from '@/components/dashboard/nav-sections';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import type { User } from '@/app/(dashboard)/user-control/data';
import { saveUserNavVisibility } from '@/app/(dashboard)/user-control/actions';
import { useAuth } from '@/hooks/use-auth';
import { DialogClose } from '@radix-ui/react-dialog';
import { ShieldCheck } from 'lucide-react';


interface PermissionsDialogProps {
  user: User;
  children: React.ReactNode;
}

export function PermissionsDialog({ user, children }: PermissionsDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();
  const { getToken } = useAuth();
  
  const [visibility, setVisibility] = React.useState<Record<string, boolean>>(() => {
    try {
        return user.navigation_visibility_json ? JSON.parse(user.navigation_visibility_json) : {};
    } catch {
        return {};
    }
  });

  const handleToggle = (label: string, isVisible: boolean) => {
    setVisibility(prev => ({ ...prev, [label]: isVisible }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const idToken = await getToken();
    const result = await saveUserNavVisibility(user.id, JSON.stringify(visibility), idToken || undefined);
    
    if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
        toast({ title: 'Success', description: `Permissions for ${user.email} have been updated.` });
        setIsOpen(false);
    }
    setIsSaving(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col overflow-hidden border-white/10 bg-card p-0">
        <DialogHeader className="border-b border-white/10 bg-gradient-to-br from-emerald-500/[0.12] to-transparent px-6 py-5 text-left">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.15] text-emerald-100">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle>Navigation Permissions</DialogTitle>
              <DialogDescription className="mt-1">
                Control visible sidebar items for <span className="font-medium text-foreground">{user.email}</span>.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto px-6 py-5">
            {navSections.map((section, index) => (
                <React.Fragment key={section.title}>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                        <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">{section.title}</h4>
                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {section.items.map(item => (
                                <div key={getNavVisibilityKey(item)} className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-white/10 bg-background/50 px-3 py-2">
                                    <Label htmlFor={`nav-toggle-${getNavVisibilityKey(item)}`} className="text-sm leading-snug">{item.label}</Label>
                                    <Switch
                                        id={`nav-toggle-${getNavVisibilityKey(item)}`}
                                        checked={visibility[getNavVisibilityKey(item)] !== false}
                                        onCheckedChange={(checked) => handleToggle(getNavVisibilityKey(item), checked)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    {index < navSections.length - 1 && <Separator />}
                </React.Fragment>
            ))}
        </div>
        <DialogFooter className="border-t border-white/10 px-6 py-4">
          <DialogClose asChild>
            <Button variant="outline" className="rounded-xl">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={isSaving} className="rounded-xl">
            {isSaving && <Spinner size="small" className="mr-2" />}
            Save Permissions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
