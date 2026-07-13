
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { updateUser } from '@/app/(dashboard)/user-control/actions';
import { Spinner } from '../ui/spinner';
import type { User } from '@/app/(dashboard)/user-control/data';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Upload, UserRoundCog } from 'lucide-react';
import { Label } from '../ui/label';
import { useAuth } from '@/hooks/use-auth';

const editUserSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  email: z.string().email({ message: "Please enter a valid email" }),
  mobile: z.string().optional(),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }).optional().or(z.literal('')),
  photoURL: z.string().url().optional().or(z.literal('')),
});

type EditUserFormValues = z.infer<typeof editUserSchema>;

interface EditUserDialogProps {
  user: User;
  children: React.ReactNode;
  isMyProfile?: boolean;
}

export function EditUserDialog({ user, children, isMyProfile = false }: EditUserDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const { toast } = useToast();
  const { getToken } = useAuth();

  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      mobile: user.mobile,
      password: '',
      photoURL: user.avatarUrl,
    },
  });

  const photoUrl = form.watch('photoURL');
  
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsUploading(false);
    toast({ title: 'Upload Disabled', description: 'Firebase Storage uploads have been removed. Paste an existing image URL instead.', variant: 'destructive' });
  };


  const onSubmit = async (data: EditUserFormValues) => {
    setIsSubmitting(true);
    const idToken = await getToken();
    const result = await updateUser({
      uid: user.id,
      ...data,
      password: data.password || undefined,
    }, idToken || undefined);
    setIsSubmitting(false);

    if (result.error) {
       toast({
        title: 'Error Updating User',
        description: result.error,
        variant: 'destructive',
      });
    } else {
       toast({
        title: 'User Updated',
        description: `Details for ${data.email} have been updated.`,
      });
      setIsOpen(false);
    }
  };
  
  React.useEffect(() => {
    if(isOpen) {
      form.reset({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        mobile: user.mobile,
        password: '',
        photoURL: user.avatarUrl,
      })
    }
  }, [isOpen, user, form])


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="overflow-hidden border-white/10 bg-card p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-white/10 bg-gradient-to-br from-blue-500/[0.12] to-transparent px-6 py-5 text-left">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-blue-400/25 bg-blue-500/[0.15] text-blue-100">
              <UserRoundCog className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>{isMyProfile ? 'My Profile' : 'Edit User'}</DialogTitle>
              <DialogDescription className="mt-1">
                {isMyProfile
                  ? 'Update your personal details. Leave the password field blank to keep it unchanged.'
                  : "Update the user's details. Leave the password field blank to keep it unchanged."
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5 px-6 py-5">
             <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <Avatar className="h-20 w-20 border border-white/10">
                    <AvatarImage src={photoUrl} />
                    <AvatarFallback className="bg-blue-500/[0.12] text-2xl text-blue-100">
                        {(form.getValues('firstName')?.[0] || '') + (form.getValues('lastName')?.[0] || '')}
                    </AvatarFallback>
                </Avatar>
                <div className="w-full">
                    <Label htmlFor="picture" className="text-sm font-medium">Profile image</Label>
                    <Button asChild variant="outline" className="mt-2 w-full rounded-xl border-white/10 bg-background/60" disabled={isUploading}>
                        <label>
                             {isUploading ? <Spinner size="small" className="mr-2" /> : <Upload className="mr-2 h-4 w-4" />}
                             {isUploading ? 'Uploading...' : 'Upload Image'}
                            <input type="file" className="sr-only" accept="image/*" disabled={isUploading} onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                        </label>
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input className="rounded-xl border-white/10 bg-background/60" placeholder="John" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input className="rounded-xl border-white/10 bg-background/60" placeholder="Doe" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="mobile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile</FormLabel>
                  <FormControl>
                    <Input className="rounded-xl border-white/10 bg-background/60" placeholder="+1234567890" {...field} disabled={isSubmitting}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input className="rounded-xl border-white/10 bg-background/60" placeholder="john.doe@example.com" {...field} disabled={isSubmitting || isMyProfile} readOnly={isMyProfile}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input className="rounded-xl border-white/10 bg-background/60" type="password" placeholder="Leave blank to keep current password" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="border-t border-white/10 pt-4">
              <DialogClose asChild>
                <Button variant="outline" type="button" className="rounded-xl" disabled={isSubmitting || isUploading}>Cancel</Button>
              </DialogClose>
              <Button type="submit" className="rounded-xl" disabled={isSubmitting || isUploading}>
                {isSubmitting ? <Spinner size="small" /> : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
