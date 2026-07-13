
'use client';

import * as React from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, LayoutGrid, List, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getAdTemplates } from "../actions";
import { TemplateDataTable } from "@/components/in-app-ads/templates-data-table";
import { columns } from "@/components/in-app-ads/templates-columns";
import type { AdTemplate } from '../data';
import { TemplateCardView } from '@/components/in-app-ads/template-card-view';
import { Skeleton } from '@/components/ui/skeleton';

export default function InAppAdTemplatesPage() {
  const [view, setView] = React.useState<'table' | 'card'>('table');
  const [templates, setTemplates] = React.useState<AdTemplate[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    const fetchedTemplates = await getAdTemplates();
    setTemplates(fetchedTemplates);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ad Templates</h1>
          <p className="text-muted-foreground">
            Manage your reusable in-app ad templates.
          </p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant={view === 'card' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('card')}>
              <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant={view === 'table' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('table')}>
              <List className="h-4 w-4" />
          </Button>
           <Button asChild variant="outline">
              <Link href="/in-app-ads">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
          <Button asChild>
            <Link href="/in-app-ads/templates/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Template
            </Link>
          </Button>
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : view === 'table' ? (
        <TemplateDataTable columns={columns} data={templates} />
      ) : (
        <TemplateCardView templates={templates} onAction={fetchData} />
      )}
    </div>
  );
}
