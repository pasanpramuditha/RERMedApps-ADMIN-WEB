'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getNavVisibilityKey, navSections } from './nav-sections';
import { getGlobalSettings } from '@/app/(dashboard)/settings/actions';
import { Skeleton } from '../ui/skeleton';
import { SheetClose } from '../ui/sheet';
import { useAuth } from '@/hooks/use-auth';
import { getUserNavVisibility } from '@/app/(dashboard)/user-control/actions';

const NavLink = ({ href, icon: Icon, label, isMobile }: { href: string; icon: React.ElementType; label: string, isMobile?: boolean }) => {
    const pathname = usePathname();
    const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`));

    const LinkContent = () => (
      <Link
        href={href}
        className={cn(
          'group relative flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-sidebar-foreground/75 outline-none transition-all duration-200 hover:bg-white/[0.055] hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-blue-500/70',
          isActive && 'bg-blue-500/15 text-white shadow-[inset_0_0_0_1px_rgba(59,130,246,0.28),0_8px_28px_rgba(37,99,235,0.14)]'
        )}
        aria-current={isActive ? 'page' : undefined}
      >
        <span
          className={cn(
            'absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-transparent transition-colors',
            isActive && 'bg-blue-400'
          )}
        />
        <span
          className={cn(
            'grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/5 bg-white/[0.035] text-sidebar-foreground/70 transition-all group-hover:border-white/10 group-hover:bg-white/[0.07] group-hover:text-sidebar-foreground',
            isActive && 'border-blue-300/20 bg-blue-500/20 text-blue-100'
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 leading-snug">{label}</span>
      </Link>
    );

    if (isMobile) {
        return <SheetClose asChild><LinkContent /></SheetClose>
    }

    return <LinkContent />;
}


export function SidebarNav({ isMobile = false }) {
  const { user } = useAuth();
  const [globalVisibilityConfig, setGlobalVisibilityConfig] = React.useState<Record<string, boolean>>({});
  const [userVisibilityConfig, setUserVisibilityConfig] = React.useState<Record<string, boolean>>({});
  const [loading, setLoading] = React.useState(true);


  React.useEffect(() => {
    async function fetchVisibilitySettings() {
      if (!user) {
        setGlobalVisibilityConfig({});
        setUserVisibilityConfig({});
        setLoading(false);
        return;
      }
      setLoading(true);

      try {
        const [globalSettings, userNavSettings] = await Promise.all([
          getGlobalSettings(),
          getUserNavVisibility(user.uid),
        ]);

        setGlobalVisibilityConfig(
          globalSettings.navigation_visibility_json && globalSettings.navigation_visibility_json !== '{}'
            ? JSON.parse(globalSettings.navigation_visibility_json)
            : {}
        );
        setUserVisibilityConfig(
          userNavSettings && userNavSettings !== '{}'
            ? JSON.parse(userNavSettings)
            : {}
        );
      } catch (e) {
        console.error("Failed to parse navigation visibility settings", e);
        setGlobalVisibilityConfig({});
        setUserVisibilityConfig({});
      }
      setLoading(false);
    }
    fetchVisibilitySettings();
  }, [user]);
  
  if (loading) {
    return (
        <div className="space-y-4 p-4">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    {[...Array(4)].map((_, j) => <Skeleton key={j} className="h-8 w-full" />)}
                </div>
            ))}
        </div>
    )
  }

  const visibleNavSections = navSections.map(section => {
    const visibleItems = section.items.filter(item => {
        const visibilityKey = getNavVisibilityKey(item);
        return globalVisibilityConfig[visibilityKey] !== false && userVisibilityConfig[visibilityKey] !== false;
    });
    return { ...section, items: visibleItems };
  }).filter(section => section.items.length > 0);


  return (
    <nav className="flex flex-col gap-5 px-3 py-4">
        {visibleNavSections.map((section) => (
            <div key={section.title} className="space-y-1.5">
                <h3 className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/40">
                    {section.title}
                </h3>
                {section.items.map((item) => (
                    <NavLink key={item.href} {...item} isMobile={isMobile} />
                ))}
            </div>
        ))}
    </nav>
  );
}
