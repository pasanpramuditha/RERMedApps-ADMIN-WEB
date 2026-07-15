
'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  HeartPulse,
  Menu,
  LogOut,
  User as UserIcon,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SidebarNav } from './sidebar-nav';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuth } from '@/hooks/use-auth';
import { getGlobalSettings } from '@/app/(dashboard)/settings/actions';
import Image from 'next/image';
import { SidebarTrigger } from '../ui/sidebar';
import { EditUserDialog } from '../user-control/edit-user-dialog';

export function AppHeader() {
  const { user, logout } = useAuth();
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [canFullscreen, setCanFullscreen] = React.useState(false);
  
  const userInitial = user?.displayName?.split(' ').map(n => n[0]).join('') || user?.email?.[0]?.toUpperCase() || 'A';


  React.useEffect(() => {
    async function fetchLogo() {
      const settings = await getGlobalSettings();
      setLogoUrl(settings.company_logo_url || null);
    }
    fetchLogo();
  }, []);

  React.useEffect(() => {
    setCanFullscreen(Boolean(document.fullscreenEnabled));
    const syncFullscreenState = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    syncFullscreenState();
    document.addEventListener('fullscreenchange', syncFullscreenState);
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
  }, []);

  const toggleFullscreen = React.useCallback(async () => {
    if (!document.fullscreenEnabled) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen toggle failed:', error);
    }
  }, []);
  
  const profileData = user ? {
      id: user.uid,
      firstName: user.displayName?.split(' ')[0] || '',
      lastName: user.displayName?.split(' ')[1] || '',
      email: user.email || '',
      avatarUrl: user.photoURL || '',
      createdDate: '',
      lastLogin: '',
      status: 'Active' as const,
  } : null;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
       <SidebarTrigger className="hidden md:flex" />
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs bg-sidebar text-sidebar-foreground p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
          </SheetHeader>
          <div className="flex h-16 items-center border-b border-sidebar-border px-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-black italic tracking-tighter text-xl">
               {logoUrl ? (
                  <Image src={logoUrl} alt="Company Logo" width={24} height={24} className="h-6 w-6" />
              ) : (
                  <div className="p-1 bg-blue-500 rounded-md">
                    <HeartPulse className="h-4 w-4 text-white" />
                  </div>
              )}
              <span className="flex items-center gap-1">
                <span className="text-white">RER</span>
                <span className="text-blue-500 uppercase">MedApps</span>
              </span>
            </Link>
          </div>
          <SidebarNav isMobile={true} />
        </SheetContent>
      </Sheet>
      
      <div className="relative ml-auto flex-1 md:grow-0">
         <Link href="/dashboard" className="hidden sm:flex items-center gap-2 font-black italic tracking-tighter text-xl">
            <span className="flex items-center gap-1">
                <span className="text-foreground">RER</span>
                <span className="text-blue-500">MEDAPPS</span>
            </span>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {canFullscreen && (
          <Button
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-[1.1rem] w-[1.1rem]" /> : <Maximize2 className="h-[1.1rem] w-[1.1rem]" />}
          </Button>
        )}
        <ThemeToggle />

        <DropdownMenu>
            <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="overflow-hidden rounded-full ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                <Avatar>
                <AvatarImage src={user?.photoURL || ''} alt={user?.displayName ?? "Admin"} data-ai-hint="user avatar" />
                <AvatarFallback>{userInitial}</AvatarFallback>
                </Avatar>
            </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user?.email ?? 'Admin Account'}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {profileData && (
                <EditUserDialog user={profileData} isMyProfile={true}>
                    <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full">
                        <UserIcon className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                    </button>
                </EditUserDialog>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
            </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
