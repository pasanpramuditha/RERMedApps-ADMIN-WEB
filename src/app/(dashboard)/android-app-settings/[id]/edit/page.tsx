
import { getAppById } from '@/app/(dashboard)/apps/actions';
import { getAndroidAppSettings } from '@/app/(dashboard)/android-app-settings/actions';
import { AndroidSettingsForm } from '@/components/android-app-settings/android-settings-form';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface EditAndroidSettingsPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAndroidSettingsPage({ params }: EditAndroidSettingsPageProps) {
  const { id } = await params;
  const app = await getAppById(id);

  if (!app) {
    notFound();
  }

  const { settings, error } = await getAndroidAppSettings(app.id);

  return (
    <AndroidSettingsForm app={app} initialSettings={settings} apiError={error} />
  );
}
