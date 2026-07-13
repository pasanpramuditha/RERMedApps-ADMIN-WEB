
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
import { PlusCircle, Upload, UserPlus } from 'lucide-react';
import { createUser } from '@/app/(dashboard)/user-control/actions';
import { Spinner } from '../ui/spinner';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Label } from '../ui/label';
import { useAuth } from '@/hooks/use-auth';

const addUserSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  email: z.string().email({ message: "Please enter a valid email" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long." }),
  photoURL: z.string().url().optional().or(z.literal('')),
});

type AddUserFormValues = z.infer<typeof addUserSchema>;

export function AddUserDialog() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const { toast } = useToast();
  const { getToken } = useAuth();

  const form = useForm<AddUserFormValues>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      photoURL: '',
    },
  });

  const photoUrl = form.watch('photoURL');
  
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsUploading(false);
    toast({ title: 'Upload Disabled', description: 'Firebase Storage uploads have been removed. Paste an existing image URL instead.', variant: 'destructive' });
  };


  const onSubmit = async (data: AddUserFormValues) => {
    setIsSubmitting(true);
    const idToken = await getToken();
    const result = await createUser(data, idToken || undefined);
    setIsSubmitting(false);

    if (result.error) {
       toast({
        title: 'Error Creating User',
        description: result.error,
        variant: 'destructive',
      });
    } else {
       toast({
        title: 'User Created',
        description: `An invitation has been sent to ${data.email}.`,
      });
      form.reset();
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent className="overflow-hidden border-white/10 bg-card p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-white/10 bg-gradient-to-br from-violet-500/[0.12] to-transparent px-6 py-5 text-left">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-violet-400/25 bg-violet-500/[0.15] text-violet-100">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription className="mt-1">
                Create a dashboard account and assign profile details.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5 px-6 py-5">
             <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <Avatar className="h-20 w-20 border border-white/10">
                    <AvatarImage src={photoUrl} />
                    <AvatarFallback className="bg-violet-500/[0.12] text-2xl text-violet-100">
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input className="rounded-xl border-white/10 bg-background/60" placeholder="john.doe@example.com" {...field} disabled={isSubmitting}/>
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
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input className="rounded-xl border-white/10 bg-background/60" type="password" placeholder="••••••••" {...field} disabled={isSubmitting} />
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
                {isSubmitting ? <Spinner size="small" /> : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
