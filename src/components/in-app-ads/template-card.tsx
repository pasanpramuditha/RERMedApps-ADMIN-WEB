
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { Button } from '@/components/ui/button';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { AdTemplate } from '@/app/(dashboard)/in-app-ads/data';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { deleteAdTemplate } from '@/app/(dashboard)/in-app-ads/actions';
import { useAuth } from '@/hooks/use-auth';
import { Spinner } from '../ui/spinner';
import { Badge } from '../ui/badge';

interface TemplateCardProps {
  template: AdTemplate;
  onAction: () => void;
}

const AndroidIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><line x1="12" x2="12" y1="18" y2="18"/></svg>
);

const AppleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"/><path d="M12 2a3 3 0 0 0-3 3c0 1.66 1.34 3 3 3s3-1.34 3-3c0-1.66-1.34-3-3-3Z"/></svg>
);


export function TemplateCard({ template, onAction }: TemplateCardProps) {
  const { toast } = useToast();
  const { getToken } = useAuth();
  const [isDeleting, startDeleteTransition] = React.useTransition();
  const htmlContent = template.android?.htmlContent || template.ios?.htmlContent || '';

  const handleDelete = () => {
    startDeleteTransition(async () => {
      if (!template.id) return;
      const idToken = await getToken();
      const result = await deleteAdTemplate(template.id, idToken);
      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Template deleted." });
        onAction();
      }
    });
  };

  const getButtonInfo = () => {
    if (template.platform === 'android' && template.android) {
      return template.android.buttonType;
    }
    if (template.platform === 'ios' && template.ios) {
      return template.ios.buttonText?.en || 'Default';
    }
    return 'N/A';
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>{template.name}</CardTitle>
          <CardDescription className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1">
                {template.platform === 'android' ? <AndroidIcon className="w-4 h-4" /> : <AppleIcon className="w-4 h-4" />}
                <span>{template.platform}</span>
            </div>
            <Badge variant="outline">Button: {getButtonInfo()}</Badge>
          </CardDescription>
        </div>
        <AlertDialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isDeleting}>
                {isDeleting ? <Spinner size="small" /> : <MoreHorizontal className="h-4 w-4" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                    <Link href={`/in-app-ads/templates/${template.id}/edit`}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                    </Link>
                </DropdownMenuItem>
                 <DropdownMenuSeparator />
                 <AlertDialogTrigger asChild>
                    <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                </AlertDialogTrigger>
            </DropdownMenuContent>
          </DropdownMenu>
           <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the template "{template.name}". This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                  {isDeleting ? <Spinner size="small" /> : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="w-full h-80 rounded-md border bg-muted overflow-hidden">
          <iframe
            srcDoc={htmlContent}
            className="w-full h-full"
            style={{ border: 'none', transform: 'scale(0.8)', transformOrigin: 'top left', width: '125%', height: '125%' }}
            sandbox="allow-scripts allow-same-origin"
            title={`Preview of ${template.name}`}
            scrolling="no"
          />
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">Last updated by {template.lastUpdatedBy}</p>
      </CardFooter>
    </Card>
  );
}
