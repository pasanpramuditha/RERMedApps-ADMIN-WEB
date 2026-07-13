

'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChromePicker, ColorResult } from 'react-color';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { adTemplateSchema, type AdTemplate } from '@/app/(dashboard)/in-app-ads/data';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { createAdTemplate, updateAdTemplate, uploadInAppAdImage } from '@/app/(dashboard)/in-app-ads/actions';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';
import { ImagePlus, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

const languages = [
    { code: 'en', name: 'English' },
    { code: 'de', name: 'German' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'zh', name: 'Chinese' },
];

interface AdTemplateFormProps {
    template?: AdTemplate;
}

export function AdTemplateForm({ template }: AdTemplateFormProps) {
    const { toast } = useToast();
    const router = useRouter();
    const { getToken } = useAuth();
    const isEditMode = !!template;

    const form = useForm<AdTemplate>({
        resolver: zodResolver(adTemplateSchema),
        defaultValues: isEditMode && template ? template : {
            name: '',
            platform: 'android',
            android: {
                htmlContent: '<h1>Welcome!</h1><p>Check out our new features.</p>',
                buttonType: 'ok',
                navigationUrl: '',
            },
        }
    });

    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [uploadingField, setUploadingField] = React.useState<string | null>(null);
    const selectedPlatform = form.watch('platform');
    
    const onSubmit = async (data: AdTemplate) => {
        setIsSubmitting(true);
        const idToken = await getToken();
        const normalizedData: AdTemplate = {
            ...data,
            android: data.platform === 'android' ? data.android : undefined,
            ios: data.platform === 'ios' ? data.ios : undefined,
        };

        if (isEditMode && !template.id) {
            setIsSubmitting(false);
            toast({
                title: 'Error Updating Template',
                description: 'Template id is missing. Please reopen the edit page and try again.',
                variant: 'destructive',
            });
            return;
        }

        const result = isEditMode
            ? await updateAdTemplate(template.id!, normalizedData, idToken)
            : await createAdTemplate(normalizedData, idToken);
            
        setIsSubmitting(false);

        if (result.error) {
            const debugText = result.debug ? `\n\n${JSON.stringify(result.debug).slice(0, 700)}` : '';
            toast({
                title: 'Error Saving Template',
                description: `${result.error}${debugText}`,
                variant: 'destructive',
            });
        } else {
            toast({ title: 'Success!', description: `Ad template ${isEditMode ? 'updated' : 'created'}.` });
            router.push('/in-app-ads/templates');
            router.refresh();
        }
    };

    const onInvalid = (errors: unknown) => {
        console.error('Template validation failed:', errors);
        const firstError = Object.entries(errors as Record<string, any>)[0];
        const errorMessage = firstError
            ? `${firstError[0]}: ${firstError[1]?.message || JSON.stringify(firstError[1]).slice(0, 160)}`
            : 'Please check the highlighted fields before updating the template.';
        toast({
            title: 'Template Validation Error',
            description: errorMessage,
            variant: 'destructive',
        });
    };
    
    const handlePlatformChange = (platform: 'android' | 'ios') => {
        form.setValue('platform', platform);
        if (platform === 'android') {
            form.setValue('ios', undefined);
            form.setValue('android', {
                htmlContent: '<h1>Welcome!</h1><p>Check out our new features.</p>',
                buttonType: 'ok',
                navigationUrl: '',
            });
        } else {
            form.setValue('android', undefined);
            form.setValue('ios', {
                htmlContent: '<h1>Welcome!</h1><p>Check out our new features.</p>',
                buttonText: { en: 'GET MY OFFER' },
                closeButtonEnabled: true,
                buttonColor: '#007AFF',
            });
        }
    }

    const handleImageUpload = async (file: File, fieldName: 'android.imageUrl' | 'ios.imageUrl') => {
        setUploadingField(fieldName);
        const uploadData = new FormData();
        uploadData.append('image', file);
        const result = await uploadInAppAdImage(uploadData);
        setUploadingField(null);

        if (!result.success || !result.url) {
            toast({ title: 'Upload Failed', description: result.error || 'Could not upload image.', variant: 'destructive' });
            return;
        }

        form.setValue(fieldName as any, result.url, { shouldDirty: true, shouldValidate: true });
        toast({ title: 'Image Uploaded', description: 'Template image URL has been updated.' });
    };

    const ImageUploadField = ({ fieldName }: { fieldName: 'android.imageUrl' | 'ios.imageUrl' }) => (
        <FormField
            control={form.control}
            name={fieldName as any}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Template Image</FormLabel>
                    <div className="flex gap-2">
                        <FormControl>
                            <Input placeholder="https://admin.rermedapps.com/web/uploads/in-app-ads/image.png" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <Button type="button" variant="outline" className="shrink-0 gap-2" disabled={uploadingField === fieldName} asChild>
                            <label>
                                {uploadingField === fieldName ? <Spinner size="small" /> : <ImagePlus className="h-4 w-4" />}
                                Upload
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="sr-only"
                                    disabled={uploadingField === fieldName}
                                    onChange={(event) => {
                                        const file = event.target.files?.[0];
                                        event.target.value = '';
                                        if (file) void handleImageUpload(file, fieldName);
                                    }}
                                />
                            </label>
                        </Button>
                    </div>
                    <FormMessage />
                </FormItem>
            )}
        />
    );

    const DeviceScreen = ({ platform }: { platform: 'ios' | 'android' }) => {
        const config = platform === 'ios' ? form.watch('ios') : form.watch('android');
        const htmlContent = config?.htmlContent || '';
        const buttonText = selectedPlatform === 'ios' 
            ? (config as any)?.buttonText?.en?.toUpperCase() || 'GET MY OFFER' 
            : (config as any)?.buttonType?.toUpperCase() || 'OK';
        const buttonColor = selectedPlatform === 'ios' ? (config as any)?.buttonColor : '#3ddc84';
        const safeButtonText = String(buttonText).replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
        }[char] || char));
    
        const isFullHtmlDocument = /<!doctype\s+html|<html[\s>]/i.test(htmlContent);
        const userHead = htmlContent.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] || '';
        const userBody = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || htmlContent;
        const previewButtonStyle = `
            <style id="rermed-preview-action-style">
                #rermed-preview-action-button {
                    position: fixed;
                    left: 12px;
                    right: 12px;
                    bottom: 16px;
                    z-index: 2147483647;
                    height: 44px;
                    border: 0;
                    border-radius: 8px;
                    background: ${buttonColor};
                    color: #fff;
                    font: 700 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    text-transform: uppercase;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.25);
                }
            </style>
        `;
        const previewButtonMarkup = `<button id="rermed-preview-action-button" type="button">${safeButtonText}</button>`;
        const fullHtmlPreview = isFullHtmlDocument
            ? htmlContent
                .replace(/<\/head>/i, `${previewButtonStyle}</head>`)
                .replace(/<\/body>/i, `${previewButtonMarkup}</body>`)
            : '';

        const srcDoc = isFullHtmlDocument ? fullHtmlPreview : `
            <html>
                <head>
                    <style>
                        html, body { 
                            margin: 0; 
                            padding: 0; 
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                            display: flex; 
                            flex-direction: column; 
                            background-color: #0a0a0a; 
                            color: white; 
                            height: 100%; 
                            overflow-y: auto;
                            overflow-x: hidden;
                        }
                        #content-wrapper { 
                            flex-grow: 1; 
                            overflow-y: auto; 
                            -ms-overflow-style: none; 
                            scrollbar-width: none; 
                            padding: 12px;
                            box-sizing: border-box;
                        }
                        #content-wrapper::-webkit-scrollbar { display: none; }
                        #footer-wrapper { 
                            padding: 12px 12px 40px 12px; 
                            width: 100%; 
                            box-sizing: border-box; 
                        }
                        #action-button { 
                            width: 100%; 
                            height: 44px; 
                            font-size: 14px; 
                            font-weight: bold; 
                            color: white; 
                            border: none; 
                            border-radius: 8px; 
                            text-transform: uppercase; 
                            display: flex; 
                            align-items: center; 
                            justify-content: center;
                        }
                    </style>
                    ${userHead}
                </head>
                <body>
                    <div id="content-wrapper">${userBody}</div>
                    <div id="footer-wrapper">
                        <button id="action-button" style="background-color: ${buttonColor};">${buttonText}</button>
                    </div>
                </body>
            </html>
        `;
        
        return (
             <div className="w-full h-full bg-background rounded-lg border flex flex-col items-center p-2 relative overflow-hidden shadow-inner">
                 <iframe
                    srcDoc={srcDoc}
                    className="w-full h-full bg-white"
                    style={{ border: 'none' }}
                    sandbox="allow-scripts allow-same-origin"
                    title="Live Ad Preview"
                />
            </div>
        )
    };
    
    const androidButtonType = form.watch('android.buttonType');
    const showNavUrl = ['explore', 'visit', 'download', 'invite', 'premium'].includes(androidButtonType || '');

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
                 <div className="flex items-center justify-between">
                    <div></div>
                    <div className="flex gap-2">
                        <Button variant="outline" asChild><Link href="/in-app-ads/templates">Cancel</Link></Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Spinner size="small" className="mr-2" /> : null}
                            {isEditMode ? 'Update Changes' : 'Save Template'}
                        </Button>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] lg:items-start">
                    <div className="min-w-0 space-y-6">
                         <Card>
                            <CardHeader>
                                <CardTitle>Template Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="template-name">Template Name</FormLabel>
                                            <FormControl>
                                                <Input id="template-name" placeholder="e.g., 'Summer Sale 2024'" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="platform"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Platform</FormLabel>
                                            <Select onValueChange={(value: 'android' | 'ios') => handlePlatformChange(value)} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="android">Android</SelectItem>
                                                    <SelectItem value="ios">iOS</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>

                        {selectedPlatform === 'android' && (
                            <Card>
                                <CardHeader><CardTitle>Android Configuration</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField control={form.control} name="android.htmlContent" render={({ field }) => ( <FormItem> <FormLabel>HTML Content</FormLabel> <FormControl><Textarea {...field} rows={10} placeholder="Paste your HTML here..." /></FormControl> <FormMessage /> </FormItem> )}/>
                                    <ImageUploadField fieldName="android.imageUrl" />
                                    <FormField control={form.control} name="android.buttonType" render={({ field }) => ( <FormItem> <FormLabel>Button Type</FormLabel> <Select onValueChange={field.onChange} value={field.value}> <FormControl><SelectTrigger><SelectValue placeholder="Select button type..." /></SelectTrigger></FormControl> <SelectContent> <SelectItem value="ok">OK</SelectItem> <SelectItem value="cancel">Cancel</SelectItem> <SelectItem value="explore">Explore</SelectItem> <SelectItem value="premium">Premium</SelectItem> <SelectItem value="visit">Visit</SelectItem> <SelectItem value="download">Download</SelectItem> <SelectItem value="invite">Invite</SelectItem> </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                                    {showNavUrl && (
                                        <FormField control={form.control} name="android.navigationUrl" render={({ field }) => ( <FormItem> <FormLabel>Navigation URL</FormLabel> <FormControl><Input placeholder="https://example.com/premium" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {selectedPlatform === 'ios' && (
                            <Card>
                                <CardHeader><CardTitle>iOS Configuration</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField control={form.control} name="ios.htmlContent" render={({ field }) => ( <FormItem> <FormLabel>HTML Content</FormLabel> <FormControl><Textarea {...field} rows={8} placeholder="Paste your HTML here..." /></FormControl> <FormMessage /> </FormItem> )}/>
                                    <ImageUploadField fieldName="ios.imageUrl" />
                                    <div className="space-y-2"> <Label>Button Text (Multi-language)</Label> <div className="grid grid-cols-2 gap-2">{languages.map(lang => ( <FormField key={lang.code} control={form.control} name={`ios.buttonText.${lang.code}` as any} render={({ field }) => ( <FormItem> <FormLabel htmlFor={`btn-${lang.code}`} className="text-xs font-normal text-muted-foreground">{lang.name}</FormLabel> <FormControl><Input id={`btn-${lang.code}`} placeholder={`${lang.name} text...`} {...field} /></FormControl> </FormItem> )}/> ))}</div> </div>
                                    <FormField control={form.control} name="ios.navigationUrl" render={({ field }) => ( <FormItem> <FormLabel>Navigation URL</FormLabel> <FormControl><Input placeholder="https://example.com/premium" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                                    <FormField control={form.control} name="ios.buttonColor" render={({ field }) => ( <FormItem className="flex items-center justify-between"> <FormLabel>Button Color</FormLabel> <Popover> <PopoverTrigger asChild><Button variant="outline" size="sm" style={{backgroundColor: field.value}} /></PopoverTrigger> <PopoverContent className="w-auto p-0 border-0"><ChromePicker color={field.value} onChange={(color: ColorResult) => field.onChange(color.hex)} /></PopoverContent> </Popover> </FormItem> )}/>
                                    <FormField control={form.control} name="ios.closeButtonEnabled" render={({ field }) => ( <FormItem className="flex items-center space-x-2"> <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl> <Label>Close button at bottom</Label> </FormItem> )}/>
                                    <FormField control={form.control} name="ios.closeButtonTopPosition" render={({ field }) => ( <FormItem className="flex items-center space-x-2"> <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl> <Label>Close button at top</Label> </FormItem> )}/>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    <Card className="min-w-0 lg:sticky lg:top-6">
                        <CardHeader>
                            <CardTitle>Live Preview</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[680px] p-2">
                            <DeviceScreen platform={selectedPlatform} />
                        </CardContent>
                    </Card>
                </div>
            </form>
        </Form>
    );
}
