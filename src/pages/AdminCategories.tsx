import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  useCategoriesWithCounts,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategoryAtomic,
  syncProductsToCategoryId,
  type MenuCategoryWithCount,
} from '@/hooks/useCategories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminCategories() {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const { data: categories = [], isLoading } = useCategoriesWithCounts();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategoryAtomic = useDeleteCategoryAtomic();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategoryWithCount | null>(null);
  const [name, setName] = useState('');
  const [nameMk, setNameMk] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<MenuCategoryWithCount | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && user && !isAdmin) navigate('/auth');
  }, [loading, user, isAdmin, navigate]);

  const openCreate = () => {
    setEditingCategory(null);
    setName('');
    setNameMk('');
    setModalOpen(true);
  };

  const openEdit = (c: MenuCategoryWithCount) => {
    setEditingCategory(c);
    setName(c.name);
    setNameMk(c.name_mk ?? '');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingCategory(null);
    setName('');
    setNameMk('');
  };

  const isDuplicateName = (trimmed: string) =>
    categories.some(
      (c) =>
        c.name.trim().toLowerCase() === trimmed.toLowerCase() &&
        c.id !== editingCategory?.id
    );

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Category name is required');
      return;
    }
    if (isDuplicateName(trimmed)) {
      toast.error('A category with this name already exists');
      return;
    }

    if (editingCategory) {
      const oldSlug = editingCategory.slug;
      try {
        await updateCategory.mutateAsync({
          id: editingCategory.id,
          name: trimmed,
          name_mk: nameMk.trim() || null,
        });
        const updated = await syncProductsToCategoryId(editingCategory.id, oldSlug);
        if (updated > 0) {
          toast.success(`Category updated. ${updated} product(s) linked by name were updated.`);
        } else {
          toast.success('Category updated');
        }
        closeModal();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to update category');
      }
    } else {
      try {
        await createCategory.mutateAsync({
          name: trimmed,
          name_mk: nameMk.trim() || null,
        });
        toast.success('Category created');
        closeModal();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to create category');
      }
    }
  };

  const handleDeleteClick = (c: MenuCategoryWithCount) => {
    setDeleteTarget(c);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const result = await deleteCategoryAtomic.mutateAsync(deleteTarget.id);
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
      if (result.moved_count > 0) {
        toast.success(
          `Category deleted. ${result.moved_count} product(s) were moved to Uncategorized.`
        );
      } else {
        toast.success('Category deleted');
      }
    } catch (e) {
      console.error('[AdminCategories] delete failed', { categoryId: deleteTarget.id, error: e });
      toast.error(e instanceof Error ? e.message : 'Failed to delete category');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading || !user || !isAdmin) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage menu categories. Products are linked by category ID or category name.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button onClick={openCreate} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">No categories yet.</p>
          <Button className="mt-4" variant="outline" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((c) => (
            <div
              key={c.id}
              className="relative rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="absolute top-3 right-3 flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openEdit(c)}
                  title="Edit"
                  aria-label={`Edit ${c.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDeleteClick(c)}
                  title="Delete"
                  aria-label={`Delete ${c.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <h3 className="font-semibold text-foreground pr-16 flex flex-col gap-0.5">
                <span>{c.name}</span>
                {c.name_mk ? (
                  <span className="text-sm font-normal text-muted-foreground">{c.name_mk}</span>
                ) : null}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {c.productCount === 0
                  ? '0 products'
                  : `${c.productCount} product${c.productCount === 1 ? '' : 's'}`}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Name (English) *</Label>
              <Input
                id="category-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Pizzas, Drinks"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-name-mk">Name (Macedonian)</Label>
              <Input
                id="category-name-mk"
                value={nameMk}
                onChange={(e) => setNameMk(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                createCategory.isPending ||
                updateCategory.isPending ||
                !name.trim() ||
                isDuplicateName(name.trim())
              }
            >
              {(createCategory.isPending || updateCategory.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {editingCategory ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && deleteTarget.productCount > 0 ? (
                <>
                  This category has {deleteTarget.productCount} product
                  {deleteTarget.productCount === 1 ? '' : 's'}. Deleting will move them to
                  Uncategorized (category will be cleared). Do you want to continue?
                </>
              ) : (
                <>
                  Delete category &quot;{deleteTarget?.name}&quot;? This cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
