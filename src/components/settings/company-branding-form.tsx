
'use client';

import * as React from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

interface CompanyBrandingFormProps {
  form: UseFormReturn<any>;
}

export function CompanyBrandingForm({ form }: CompanyBrandingFormProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = React.useState(false);

  const handleFileUpload = (file: File) => {
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      form.setValue('company_logo_url', dataUrl, { shouldValidate: true, shouldDirty: true });
      setIsUploading(false);
      toast({ title: "Logo Uploaded", description: "Click 'Save Settings' to apply the change." });
    };
    reader.onerror = () => {
        setIsUploading(false);
        toast({ title: "Error", description: "Failed to read file.", variant: "destructive" });
    }
    reader.readAsDataURL(file);
  };
  
  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (acceptedFiles) => {
        if (acceptedFiles.length > 0) {
            handleFileUpload(acceptedFiles[0]);
        }
    },
    accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/svg+xml': ['.svg'] },
    maxFiles: 1,
  });

  const logoUrl = form.watch('company_logo_url');

  return (
    <Card className="overflow-hidden border-white/10 bg-card/75 shadow-sm">
      <CardHeader className="border-b border-white/10 bg-muted/10">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-white/10 bg-background/70 p-2">
            <Upload className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <CardTitle>Company Branding</CardTitle>
            <CardDescription>
              Upload the logo shown on the login page and navigation bar.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
            <FormField
                control={form.control}
                name="company_logo_url"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Company Logo</FormLabel>
                        <div className="flex items-center gap-4">
                             <div {...getRootProps()} className="w-full">
                                <input {...getInputProps()} />
                                <Button type="button" variant="outline" className="w-full rounded-xl border-white/10 bg-background/60" disabled={isUploading}>
                                    <Upload className="mr-2 h-4 w-4" />
                                    {isUploading ? 'Uploading...' : 'Upload Logo'}
                                </Button>
                            </div>
                        </div>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <div className="flex min-h-32 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                {logoUrl ? (
                     <Image src={logoUrl} alt="Company Logo Preview" width={64} height={64} className="h-16 w-auto" />
                ) : (
                    <p className="text-sm text-muted-foreground">Logo preview</p>
                )}
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
