
'use client';

import type { ReactNode } from 'react';
import { AppSidebar } from '@/components/dashboard/app-sidebar';
import { AppHeader } from '@/components/dashboard/app-header';
import { ProtectedRoute } from '@/hooks/use-auth';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

function DashboardMainContent({ children }: { children: ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <div className={cn("flex flex-1 flex-col transition-all duration-300 ease-in-out", isCollapsed ? "md:ml-0" : "md:ml-64")}>
      <AppHeader />
      <main className="flex-1 bg-background p-4 md:p-6 lg:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}

export default function DashboardLayout({ children, logoUrl }: { children: ReactNode, logoUrl?: string }) {
  return (
    <ProtectedRoute>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <DashboardMainContent>
            {children}
          </DashboardMainContent>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
