'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/login-form';
import { HeartPulse } from 'lucide-react';
import { getPublicGlobalSettings } from './(dashboard)/settings/actions';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { Spinner } from '@/components/ui/spinner';

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(() => resolve(fallback), timeoutMs);
    promise
      .then(resolve)
      .catch(() => resolve(fallback))
      .finally(() => window.clearTimeout(timeoutId));
  });
}

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const [loadingSettings, setLoadingSettings] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;

    async function fetchSettings() {
      setLoadingSettings(true);
      try {
        const settings = await withTimeout(getPublicGlobalSettings(), 8000, {
          initial_screen: '/dashboard',
          company_logo_url: '',
        } as Awaited<ReturnType<typeof getPublicGlobalSettings>>);

        if (!mounted) return;
        setLogoUrl(settings.company_logo_url || null);

        if (!loading && user) {
          router.push(settings.initial_screen || '/dashboard');
        }
      } finally {
        if (mounted) {
          setLoadingSettings(false);
        }
      }
    }
    fetchSettings();

    return () => {
      mounted = false;
    };
  }, [user, loading, router]);

  if (loading || user || loadingSettings) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Spinner size="large" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="mb-4 h-16 w-16 flex items-center justify-center">
             {loadingSettings ? (
                <Spinner />
             ) : logoUrl ? (
              <Image src={logoUrl} alt="Company Logo" width={64} height={64} />
            ) : (
              <HeartPulse size={48} className="text-primary" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-foreground">RER MedApps</h1>
          <p className="text-muted-foreground uppercase tracking-widest">CONSOLE</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
