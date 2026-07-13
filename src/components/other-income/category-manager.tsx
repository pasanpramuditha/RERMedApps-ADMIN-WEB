
'use client';

import * as React from 'react';
import { Pencil, Trash2, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useToast } from '@/hooks/use-toast';
import { renameIncomeCategory, deleteIncomeCategory } from '@/app/(dashboard)/other-income/actions';
import { Spinner } from '../ui/spinner';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';

interface CategoryManagerProps {
  categories: string[];
  selectedCategory: string;
  onUpdate: (newCategory?: string) => void;
}

export function CategoryManager({ categories, selectedCategory, onUpdate }: CategoryManagerProps) {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [newCategoryName, setNewCategoryName] = React.useState('');
  const [renameTarget, setRenameTarget] = React.useState('');
  const { toast } = useToast();

  const handleCreate = () => {
    if (!newCategoryName) {
        toast({ title: "Error", description: "New category name cannot be empty.", variant: "destructive" });
        return;
    }
    onUpdate(newCategoryName);
    setNewCategoryName('');
    toast({ title: "Category Created", description: `"${newCategoryName}" is now available in the list. Save the income record to persist it.` });
  };

  const handleRename = async () => {
    if (!renameTarget || !newCategoryName) {
        toast({ title: "Error", description: "Please select a category to rename and provide a new name.", variant: "destructive" });
        return;
    }
    setIsProcessing(true);
    const result = await renameIncomeCategory(renameTarget, newCategoryName);
    if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
        toast({ title: "Success", description: "Category renamed." });
        onUpdate(renameTarget === selectedCategory ? newCategoryName : undefined);
    }
    setIsProcessing(false);
    setNewCategoryName('');
    setRenameTarget('');
  };

  const handleDelete = async (categoryToDelete: string) => {
    if (!categoryToDelete) return;
    setIsProcessing(true);
    const result = await deleteIncomeCategory(categoryToDelete);
    if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
        toast({ title: "Success", description: `Category "${categoryToDelete}" deleted.` });
        onUpdate(categoryToDelete === selectedCategory ? '' : undefined);
    }
    setIsProcessing(false);
  };
  
  return (
    <div className="flex items-center gap-1">
      {/* Create Dialog */}
      <Dialog onOpenChange={(open) => !open && setNewCategoryName('')}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7"><PlusCircle className="h-4 w-4" /></Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Create New Category</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="new-cat-name">New Category Name</Label>
            <Input id="new-cat-name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <DialogClose asChild><Button onClick={handleCreate}>Create</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Dialog */}
      <Dialog onOpenChange={(open) => !open && (setNewCategoryName(''), setRenameTarget(''))}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={categories.length === 0}><Pencil className="h-4 w-4" /></Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Rename Category</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
                <Label>Category to rename</Label>
                <Select value={renameTarget} onValueChange={setRenameTarget}>
                    <SelectTrigger><SelectValue placeholder="Select a category..." /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="rename-cat-name">New Name</Label>
                <Input id="rename-cat-name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <DialogClose asChild>
                <Button onClick={handleRename} disabled={isProcessing}>
                    {isProcessing ? <Spinner size="small" /> : 'Rename'}
                </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Dialog */}
       <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" disabled={!selectedCategory}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will attempt to delete the category &quot;{selectedCategory}&quot;. This action cannot be undone and will fail if the category is in use.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(selectedCategory)} disabled={isProcessing}>
              {isProcessing ? <Spinner size="small" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
