
'use client';

import * as React from 'react';
import { listCommonLinks } from './actions';
import type { CommonLink } from './data';
import { columns } from './columns';
import { AddLinkDialog } from '@/components/common-links/add-link-dialog';
import { CommonLinksDataTable } from '@/components/common-links/data-table';
import { ManagementHelpDialog } from '@/components/dashboard/management-help-dialog';
import { ExternalLink, Link2, PlusCircle } from 'lucide-react';

export default function CommonLinksPage() {
    const [links, setLinks] = React.useState<CommonLink[]>([]);
    const [loading, setLoading] = React.useState(true);
    const fetchRequestRef = React.useRef(0);
    const isMountedRef = React.useRef(false);

    const fetchData = React.useCallback(async () => {
        const requestId = fetchRequestRef.current + 1;
        fetchRequestRef.current = requestId;

        if (isMountedRef.current) {
            setLoading(true);
        }

        try {
            const fetchedLinks = await listCommonLinks();
            if (!isMountedRef.current || requestId !== fetchRequestRef.current) {
                return;
            }
            setLinks(fetchedLinks);
        } finally {
            if (isMountedRef.current && requestId === fetchRequestRef.current) {
                setLoading(false);
            }
        }
    }, []);

    React.useEffect(() => {
        isMountedRef.current = true;
        fetchData();
        return () => {
            isMountedRef.current = false;
            fetchRequestRef.current += 1;
        };
    }, [fetchData]);

    const tableColumns = React.useMemo(
        () => columns({ onAction: fetchData }),
        [fetchData]
    );
    
    return (
        <div className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-card/80 p-5 shadow-sm">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/[0.12] to-transparent" />
                <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-sky-400/25 bg-sky-500/[0.15] text-sky-100">
                            <Link2 className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                Quick Access
                            </div>
                            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Common Links</h1>
                            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                                Keep important consoles, dashboards, documents, and operational URLs in one searchable list.
                            </p>
                            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-muted-foreground">
                                <ExternalLink className="h-3.5 w-3.5" />
                                {links.length} saved link(s)
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                        <ManagementHelpDialog page="common-links" />
                        <AddLinkDialog onSave={fetchData}>
                            <button className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Link
                            </button>
                        </AddLinkDialog>
                    </div>
                </div>
            </div>
            
            <CommonLinksDataTable 
                columns={tableColumns}
                data={links}
                isLoading={loading}
            />
        </div>
    );
}
