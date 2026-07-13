
'use client';

import * as React from 'react';
import { Settings2, PlusCircle, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
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
} from '@/components/ui/alert-dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useToast } from '@/hooks/use-toast';
import { renameExpenseCategory, deleteExpenseCategory, listExpenseCategories, listExpenseSubCategories } from '@/app/(dashboard)/other-expenses/actions';
import { Spinner } from '../ui/spinner';
import { Separator } from '../ui/separator';
import { useAuth } from '@/hooks/use-auth';

interface CategoryManagerDialogProps {
  initialCategories: string[];
  onUpdate: (newCategory?: string) => void;
  type: 'main' | 'sub';
  parentCategory?: string;
  disabled?: boolean;
}

export function CategoryManagerDialog({ initialCategories, onUpdate, type, parentCategory, disabled=false }: CategoryManagerDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [categories, setCategories] = React.useState(initialCategories);
  const [newCategoryName, setNewCategoryName] = React.useState('');
  const [editingCategory, setEditingCategory] = React.useState<{ oldName: string, newName: string } | null>(null);
  const [deletingCategory, setDeletingCategory] = React.useState<string | null>(null);
  const { toast } = useToast();
  const { getToken } = useAuth();

  const refreshCategories = React.useCallback(async () => {
    setIsProcessing(true);
    const fetchedCategories = type === 'main' 
        ? await listExpenseCategories() 
        : await listExpenseSubCategories(parentCategory);
    setCategories(fetchedCategories);
    setIsProcessing(false);
  }, [type, parentCategory]);
  
  React.useEffect(() => {
    if(isOpen) {
        refreshCategories();
    }
  }, [isOpen, refreshCategories]);

  const handleCreate = () => {
    if (!newCategoryName) {
        toast({ title: "Error", description: "New category name cannot be empty.", variant: "destructive" });
        return;
    }
    setCategories(prev => [...prev, newCategoryName]);
    onUpdate(newCategoryName);
    setNewCategoryName('');
    toast({ title: "Category Added", description: `"${newCategoryName}" is now available. Note: a category is only permanently saved when it's used in an expense record.` });
  };

  const handleRename = async () => {
    if (!editingCategory || !editingCategory.newName) {
        toast({ title: "Error", description: "New name cannot be empty.", variant: "destructive" });
        return;
    }
    setIsProcessing(true);
    const idToken = await getToken();
    const result = await renameExpenseCategory(editingCategory.oldName, editingCategory.newName, idToken || undefined);
    if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
        toast({ title: "Success", description: "Category renamed." });
        onUpdate();
        await refreshCategories();
    }
    setIsProcessing(false);
    setEditingCategory(null);
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    setIsProcessing(true);
    const idToken = await getToken();
    const result = await deleteExpenseCategory(deletingCategory, idToken || undefined);
    if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
        toast({ title: "Success", description: `Category "${deletingCategory}" deleted.` });
        onUpdate(''); // Clear selection if it was deleted
        await refreshCategories();
    }
    setIsProcessing(false);
    setDeletingCategory(null);
  };
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={disabled}>
            <Settings2 className="mr-2 h-4 w-4" />
            Manage
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage {type === 'main' ? 'Expense Categories' : 'Sub Categories'}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div className="space-y-2">
                <Label>Add New {type === 'main' ? 'Category' : 'Sub Category'}</Label>
                <div className="flex gap-2">
                    <Input placeholder={type === 'main' ? 'e.g., Software Subscriptions' : 'e.g. Figma'} value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                    <Button onClick={handleCreate}><PlusCircle className="h-4 w-4" /></Button>
                </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
                <Label>Existing Categories</Label>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                    {isProcessing && categories.length === 0 ? <div className="text-center p-4"><Spinner/></div> : null}
                    {!isProcessing && categories.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No categories created yet.</p> : null}

                    {categories.map(category => (
                        <div key={category} className="flex items-center justify-between gap-2 p-2 rounded-md border">
                            {editingCategory?.oldName === category ? (
                                 <Input 
                                    defaultValue={category}
                                    onChange={(e) => setEditingCategory({ ...editingCategory, newName: e.target.value })}
                                    autoFocus
                                    onBlur={handleRename}
                                    onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                                 />
                            ) : (
                                <span className="text-sm font-medium">{category}</span>
                            )}
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingCategory({ oldName: category, newName: category })}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeletingCategory(category)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </div>
          <DialogClose asChild><Button>Done</Button></DialogClose>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingCategory} onOpenChange={(open) => !open && setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertCircle className="text-destructive" />Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the category &quot;{deletingCategory}&quot;. This action cannot be undone and will fail if the category is currently used by any expense records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {isProcessing ? <Spinner size="small" /> : 'Delete Category'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
