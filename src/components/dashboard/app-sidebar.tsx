
'use client';

import * as React from 'react';
import Link from 'next/link';
import { HeartPulse } from 'lucide-react';
import { SidebarNav } from './sidebar-nav';
import { getGlobalSettings } from '@/app/(dashboard)/settings/actions';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useSidebar } from '../ui/sidebar';

export function AppSidebar() {
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const { isCollapsed } = useSidebar();

  React.useEffect(() => {
    async function fetchLogo() {
      const settings = await getGlobalSettings();
      setLogoUrl(settings.company_logo_url || null);
    }
    fetchLogo();
  }, []);

  return (
    <aside className={cn(
        "hidden flex-col border-r border-white/10 bg-[#050506] text-sidebar-foreground shadow-[18px_0_45px_rgba(0,0,0,0.28)] transition-all duration-300 ease-in-out md:fixed md:inset-y-0 md:left-0 md:z-40 md:flex",
        isCollapsed ? "w-0 overflow-hidden" : "w-64"
    )}>
      <div className="flex h-16 items-center border-b border-white/10 px-4">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-3 rounded-xl px-2 py-2 font-semibold transition-colors hover:bg-white/[0.04]">
           {logoUrl ? (
              <Image src={logoUrl} alt="Company Logo" width={28} height={28} className="h-7 w-7 rounded-lg object-contain" />
          ) : (
              <span className="grid h-8 w-8 place-items-center rounded-xl border border-blue-400/20 bg-blue-500/15 text-blue-100">
                <HeartPulse className="h-4 w-4" />
              </span>
          )}
          <span className={cn("truncate whitespace-nowrap text-[15px] tracking-normal text-white transition-opacity duration-200", isCollapsed ? "opacity-0" : "opacity-100")}>RER MedApps</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden [scrollbar-color:rgba(255,255,255,0.25)_transparent] [scrollbar-width:thin]">
        <SidebarNav />
      </div>
    </aside>
  );
}
