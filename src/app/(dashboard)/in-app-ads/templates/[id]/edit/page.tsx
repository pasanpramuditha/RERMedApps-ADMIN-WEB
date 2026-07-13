
import { notFound } from 'next/navigation';
import { AdTemplateForm } from '@/components/in-app-ads/ad-template-form';
import { getTemplateById } from '../../../actions';

export const dynamic = 'force-dynamic';

interface EditTemplatePageProps {
  params: {
    id: string;
  };
}

export default async function EditTemplatePage({ params }: EditTemplatePageProps) {
  const template = await getTemplateById(params.id);

  if (!template) {
    notFound();
  }

  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Ad Template</h1>
        <p className="text-muted-foreground">
          Update the details for <span className="font-semibold">{template.name}</span>.
        </p>
      </div>
      <AdTemplateForm template={template} />
    </div>
  );
}
