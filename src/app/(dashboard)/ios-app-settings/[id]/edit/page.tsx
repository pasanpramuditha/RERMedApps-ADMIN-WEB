
import { getAppById } from '@/app/(dashboard)/apps/actions';
import { getIosAppSettings } from '@/app/(dashboard)/ios-app-settings/actions';
import { IosSettingsForm } from '@/components/ios-app-settings/ios-settings-form';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface EditIosSettingsPageProps {
    params: Promise<{ id: string }>;
}

export default async function EditIosSettingsPage({ params }: EditIosSettingsPageProps) {
    const { id } = await params;
    const app = await getAppById(id);

    if (!app) {
        notFound();
    }

    // Fetch all settings for the app
    const { settings, error } = await getIosAppSettings(app.id);

    return (
        <IosSettingsForm app={app} initialSettings={settings} apiError={error} />
    );
}
