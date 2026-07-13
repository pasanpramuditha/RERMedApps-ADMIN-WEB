
import { InAppAdForm } from '@/components/in-app-ads/in-app-ad-form';
import { getApps } from '../../apps/actions';
import { getAdTemplates } from '../actions';

export const dynamic = 'force-dynamic';


export default async function CreateInAppAdPage() {
    const [apps, templates] = await Promise.all([getApps(), getAdTemplates()]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Create In-App Ad</h1>
                <p className="text-muted-foreground">
                    Configure and deploy a new in-app ad from a template.
                </p>
            </div>
            <InAppAdForm apps={apps} templates={templates} />
        </div>
    );
}
