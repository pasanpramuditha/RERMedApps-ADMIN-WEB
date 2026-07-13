
import { getApps } from '../../../apps/actions';
import { getAdTemplates } from '../../actions';
import { getInAppAdById } from '../../actions';
import { InAppAdForm } from '@/components/in-app-ads/in-app-ad-form';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface EditInAppAdPageProps {
  params: {
    id: string;
  };
}

export default async function EditInAppAdPage({ params }: EditInAppAdPageProps) {
  const [ad, apps, templates] = await Promise.all([
    getInAppAdById(params.id),
    getApps(),
    getAdTemplates()
  ]);

  if (!ad) {
    notFound();
  }

  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit In-App Ad</h1>
        <p className="text-muted-foreground">
          Update the details for the ad campaign for <span className="font-semibold">{ad.appName}</span>.
        </p>
      </div>
      <InAppAdForm
        isEditMode={true}
        ad={ad}
        apps={apps}
        templates={templates}
      />
    </div>
  );
}
