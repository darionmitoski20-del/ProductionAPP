import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/hooks/useAuth';
import {
  useAdminProducts,
  useUpsertProduct,
  useDeleteProduct,
  useProductAddons,
  useProductSizes,
  useUpsertAddon,
  useUpsertSize,
  useDeleteAddon,
  useDeleteSize,
  type AdminProductRow,
  type ProductAddonRow,
  type ProductSizeRow,
  type ProductUpsertPayload,
  type AddonUpsertPayload,
  type SizeUpsertPayload,
} from '@/hooks/useAdminMenu';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  type MenuCategory,
} from '@/hooks/useCategories';
import { CATEGORY_LABELS, type ProductCategory } from '@/types';
import { formatPrice } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LogOut,
  ChefHat,
  Home,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  UtensilsCrossed,
  Search,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdminLayout } from '@/contexts/AdminLayoutContext';
import { getProductImageUrl } from '@/lib/productImages';
import {
  uploadProductImage,
  deleteProductImageIfOurs,
  validateProductImageFile,
} from '@/lib/uploadProductImage';
import type { Product } from '@/types';

const CATEGORIES: ProductCategory[] = [
  'pizzas',
  'burgers',
  'wraps',
  'toasts',
  'fries',
  'salads',
  'drinks',
];

const AdminMenu = () => {
  const navigate = useNavigate();
  const { user, loading, isStaff, isDemo, signOut } = useAuth();
  const { data: products, isLoading, isError, error, refetch } = useAdminProducts();
  const { data: categories = [] } = useCategories();
  const upsertProduct = useUpsertProduct();
  const deleteProduct = useDeleteProduct();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProductRow | null>(null);
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Auth error from products query: redirect to login
  useEffect(() => {
    if (isError && error instanceof Error && error.message === 'AUTH_REQUIRED') {
      navigate('/auth', { replace: true });
    }
  }, [isError, error, navigate]);

  const { inLayout } = useAdminLayout();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const filteredProducts =
    products?.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        [p.name, p.name_en, p.name_mk, p.description, p.description_en, p.description_mk].some((s) =>
          (s ?? '').toLowerCase().includes(q)
        );
      const selectedCat = categories.find((c) => c.id === categoryFilter);
      const matchCategory =
        categoryFilter === 'all' ||
        p.category_id === categoryFilter ||
        (!p.category_id && selectedCat && p.category === selectedCat.slug);
      const matchAvailable = showUnavailable || p.available;
      return matchSearch && matchCategory && matchAvailable;
    }) ?? [];

  const getCategoryName = (p: AdminProductRow) => {
    if (p.category_id) {
      const c = categories.find((x) => x.id === p.category_id);
      if (c) return c.name;
    }
    if (p.category) return CATEGORY_LABELS[p.category];
    return 'Uncategorized';
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const handleEditProduct = (row: AdminProductRow) => {
    setEditingProduct(row);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingProduct(null);
  };

  const handleDemoBlockedAction = () => {
    toast.error('This is a demo account. Changes are disabled.');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6">You don't have permission to access this page.</p>
        <Button asChild>
          <Link to="/">
            <Home className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={inLayout ? '' : 'min-h-screen bg-background'}>
      {!inLayout && (
        <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur">
          <div className="container flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo />
              <span className="text-sm font-medium text-muted-foreground">Admin Panel</span>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/kitchen">
                  <ChefHat className="mr-2 h-4 w-4" />
                  Kitchen
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/admin">Orders</Link>
              </Button>
              <Button asChild variant="default" size="sm">
                <Link to="/admin/menu">
                  <UtensilsCrossed className="mr-2 h-4 w-4" />
                  Menu
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/">
                  <Home className="mr-2 h-4 w-4" />
                  Customer Menu
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </header>
      )}

      <main className={inLayout ? 'p-4 sm:p-6 lg:p-8' : 'container py-6'}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{inLayout ? 'Products' : 'Menu Management'}</h1>
            {inLayout && <p className="mt-1 text-sm text-muted-foreground">Manage menu products and categories</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={isDemo ? handleDemoBlockedAction : handleAddProduct}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </div>
        </div>

        {isDemo && (
          <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Demo account: changes are disabled. You can browse data, but you cannot save or delete anything.
          </div>
        )}

        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch
              id="show-unavailable"
              checked={showUnavailable}
              onCheckedChange={setShowUnavailable}
            />
            <Label htmlFor="show-unavailable" className="text-sm cursor-pointer">
              Show unavailable
            </Label>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          error instanceof Error && error.message === 'AUTH_REQUIRED' ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Redirecting to login…
            </div>
          ) : (
            <div className="rounded-md border border-destructive/50 bg-destructive/5 p-6 flex flex-col items-center justify-center gap-4 py-12">
              <p className="text-destructive font-medium">Failed to load products.</p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : 'Unknown error'}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => refetch()}>
                  Retry
                </Button>
                <Button variant="default" onClick={() => navigate('/auth')}>
                  Sign in again
                </Button>
              </div>
            </div>
          )
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="md:hidden space-y-3">
              {filteredProducts.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">No products found.</p>
              ) : (
                filteredProducts.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center gap-4"
                  >
                    <ProductThumbnail product={p} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{getCategoryName(p)}</p>
                      <p className="text-sm font-medium text-foreground mt-0.5">{formatPrice(p.price)}</p>
                      <p className="text-xs text-muted-foreground">{p.available ? 'Available' : 'Unavailable'}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={isDemo ? handleDemoBlockedAction : () => handleEditProduct(p)}
                        aria-label={`Edit ${p.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={async () => {
                          if (isDemo) {
                            handleDemoBlockedAction();
                            return;
                          }
                          if (!confirm(`Delete "${p.name}"?`)) return;
                          try {
                            await deleteProduct.mutateAsync(p.id);
                            toast.success('Product deleted');
                            if (editingProduct?.id === p.id) handleCloseModal();
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : 'Failed to delete');
                          }
                        }}
                        aria-label={`Delete ${p.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {/* Desktop: table with horizontal scroll on small screens */}
            <div className="hidden md:block rounded-md border overflow-x-auto">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead className="text-right w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No products found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <ProductThumbnail product={p} />
                        </TableCell>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{getCategoryName(p)}</TableCell>
                        <TableCell>{formatPrice(p.price)}</TableCell>
                        <TableCell>{p.available ? 'Yes' : 'No'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={isDemo ? handleDemoBlockedAction : () => handleEditProduct(p)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={async () => {
                                if (isDemo) {
                                  handleDemoBlockedAction();
                                  return;
                                }
                                if (!confirm(`Delete "${p.name}"?`)) return;
                                try {
                                  await deleteProduct.mutateAsync(p.id);
                                  toast.success('Product deleted');
                                  if (editingProduct?.id === p.id) handleCloseModal();
                                } catch (e) {
                                  toast.error(e instanceof Error ? e.message : 'Failed to delete');
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </main>

      <ProductModal
        open={modalOpen}
        onClose={handleCloseModal}
        editingProduct={editingProduct}
        upsertProduct={upsertProduct}
        categories={categories}
        isDemo={isDemo}
      />

      <NewCategoryModal
        open={newCategoryOpen}
        onClose={() => setNewCategoryOpen(false)}
        categoryFilter={categoryFilter}
        onFilterChange={setCategoryFilter}
        isDemo={isDemo}
        onSuccess={(newId) => {
          setCategoryFilter(newId);
        }}
      />
    </div>
  );
};

function NewCategoryModal({
  open,
  onClose,
  onSuccess,
  categoryFilter,
  onFilterChange,
  isDemo,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (newCategoryId: string) => void;
  categoryFilter: string;
  onFilterChange: (value: string) => void;
  isDemo: boolean;
}) {
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [name, setName] = useState('');
  const [nameMk, setNameMk] = useState('');
  const [sortOrder, setSortOrder] = useState<string>('0');
  const [active, setActive] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNameMk, setEditNameMk] = useState('');
  const [editSortOrder, setEditSortOrder] = useState('');
  const [editActive, setEditActive] = useState(true);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleCreate = async () => {
    if (isDemo) {
      toast.error('This is a demo account. Changes are disabled.');
      return;
    }
    if (!name.trim()) {
      toast.error('Category name is required');
      return;
    }
    const sort = parseInt(sortOrder, 10) || 0;
    try {
      const result = await createCategory.mutateAsync({
        name: name.trim(),
        name_mk: nameMk.trim() || null,
        sort_order: sort,
        is_active: active,
      });
      toast.success('Category created');
      setName('');
      setNameMk('');
      setSortOrder('0');
      setActive(true);
      onClose();
      if (result?.id) onSuccess(result.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create category');
    }
  };

  const startEdit = (c: MenuCategory) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditNameMk(c.name_mk ?? '');
    setEditSortOrder(String(c.sort_order));
    setEditActive(c.is_active);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleUpdate = async () => {
    if (isDemo) {
      toast.error('This is a demo account. Changes are disabled.');
      return;
    }
    if (!editingId) return;
    if (!editName.trim()) {
      toast.error('Category name is required');
      return;
    }
    const sort = parseInt(editSortOrder, 10) || 0;
    try {
      await updateCategory.mutateAsync({
        id: editingId,
        name: editName.trim(),
        name_mk: editNameMk.trim() || null,
        sort_order: sort,
        is_active: editActive,
      });
      toast.success('Category updated');
      setEditingId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update category');
    }
  };

  const handleDeleteConfirm = async () => {
    if (isDemo) {
      toast.error('This is a demo account. Changes are disabled.');
      return;
    }
    if (!deleteTarget) return;
    try {
      await deleteCategory.mutateAsync(deleteTarget.id);
      toast.success('Category deleted');
      if (categoryFilter === deleteTarget.id) {
        onFilterChange('all');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete category');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Categories</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Add category</h4>
              <div className="flex flex-wrap gap-3 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Name (EN) *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Pastramajlija, Combo paketi"
                    className="w-[180px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Name (MK)</Label>
                  <Input
                    value={nameMk}
                    onChange={(e) => setNameMk(e.target.value)}
                    placeholder="Optional"
                    className="w-[180px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Sort order</Label>
                  <Input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-20"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="cat-active" checked={active} onCheckedChange={setActive} />
                  <Label htmlFor="cat-active" className="text-xs cursor-pointer">Active</Label>
                </div>
                <Button size="sm" onClick={handleCreate} disabled={createCategory.isPending || isDemo}>
                  {createCategory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Create
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">All categories</h4>
              {categoriesLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </div>
              ) : categories.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No categories yet. Add one above.</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="w-20">Order</TableHead>
                        <TableHead className="w-16">Active</TableHead>
                        <TableHead className="w-24 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((c) => (
                        <TableRow key={c.id}>
                          {editingId === c.id ? (
                            <>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <Input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="h-8"
                                    placeholder="EN"
                                  />
                                  <Input
                                    value={editNameMk}
                                    onChange={(e) => setEditNameMk(e.target.value)}
                                    className="h-8"
                                    placeholder="MK"
                                  />
                                </div>
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={editSortOrder}
                                  onChange={(e) => setEditSortOrder(e.target.value)}
                                  className="h-8 w-16"
                                />
                              </TableCell>
                              <TableCell>
                                <Switch checked={editActive} onCheckedChange={setEditActive} />
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={cancelEdit}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={handleUpdate}
                                  disabled={updateCategory.isPending}
                                >
                                  {updateCategory.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                </Button>
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="font-medium">
                                <div>{c.name}</div>
                                {c.name_mk ? (
                                  <div className="text-xs text-muted-foreground font-normal">{c.name_mk}</div>
                                ) : null}
                              </TableCell>
                              <TableCell>{c.sort_order}</TableCell>
                              <TableCell>{c.is_active ? 'Yes' : 'No'}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => startEdit(c)}
                                  disabled={isDemo}
                                  title="Edit"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteTarget({ id: c.id, name: c.name })}
                                  disabled={isDemo}
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={onClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category</AlertDialogTitle>
            <AlertDialogDescription>
              Delete category &quot;{deleteTarget?.name}&quot;? Products in this category will be moved to
              &quot;Uncategorized&quot; (or cleared).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ProductThumbnail({ product }: { product: AdminProductRow }) {
  const productForImage: Product = {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    category: product.category,
    image_url: product.image_url,
    available: product.available,
  };
  const src = getProductImageUrl(productForImage);
  return (
    <div className="relative h-12 w-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover"
      />
    </div>
  );
}

interface ProductModalProps {
  open: boolean;
  onClose: () => void;
  editingProduct: AdminProductRow | null;
  upsertProduct: ReturnType<typeof useUpsertProduct>;
  categories: MenuCategory[];
  isDemo: boolean;
}

function ProductModal({
  open,
  onClose,
  editingProduct,
  upsertProduct,
  categories,
  isDemo,
}: ProductModalProps) {
  const [name, setName] = useState('');
  const [nameMk, setNameMk] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionMk, setDescriptionMk] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [available, setAvailable] = useState(true);
  const [productId, setProductId] = useState<string | null>(editingProduct?.id ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const { data: addons = [], isLoading: addonsLoading } = useProductAddons(productId);
  const { data: sizes = [], isLoading: sizesLoading } = useProductSizes(productId);
  const upsertAddonMutation = useUpsertAddon();
  const upsertSizeMutation = useUpsertSize();
  const deleteAddonMutation = useDeleteAddon();
  const deleteSizeMutation = useDeleteSize();

  const defaultCategoryId = categories[0]?.id ?? '';

  useEffect(() => {
    if (!open) return;
    if (editingProduct) {
      setName(editingProduct.name);
      setNameMk(editingProduct.name_mk ?? '');
      setDescription(editingProduct.description ?? '');
      setDescriptionMk(editingProduct.description_mk ?? '');
      setCategoryId(
        editingProduct.category_id ??
          categories.find((c) => c.slug === editingProduct.category)?.id ??
          defaultCategoryId
      );
      setPrice(String(editingProduct.price));
      setImageUrl(editingProduct.image_url ?? '');
      setImageFile(null);
      setImagePreviewUrl(null);
      setAvailable(editingProduct.available);
      setProductId(editingProduct.id);
    } else {
      setName('');
      setNameMk('');
      setDescription('');
      setDescriptionMk('');
      setCategoryId(defaultCategoryId);
      setPrice('');
      setImageUrl('');
      setImageFile(null);
      setImagePreviewUrl(null);
      setAvailable(true);
      setProductId(null);
    }
  }, [open, editingProduct, categories, defaultCategoryId]);

  const handleSaveProduct = async () => {
    if (isDemo) {
      toast.error('This is a demo account. Changes are disabled.');
      return;
    }
    const priceNum = parseFloat(price);
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (Number.isNaN(priceNum) || priceNum < 0) {
      toast.error('Enter a valid price');
      return;
    }
    if (imageFile) {
      const validation = validateProductImageFile(imageFile);
      if (validation.ok === false) {
        toast.error(validation.error);
        return;
      }
    }

    const selectedCategory = categories.find((c) => c.id === categoryId);
    const slug = selectedCategory?.slug;
    const categoryForEnum =
      slug && CATEGORIES.includes(slug as ProductCategory) ? (slug as ProductCategory) : null;

    try {
      let finalImageUrl: string | null = imageUrl.trim() || null;
      let idForPayload: string | undefined = editingProduct?.id ?? productId ?? undefined;

      if (imageFile) {
        setUploading(true);
        try {
          let productIdToUse = editingProduct?.id ?? productId ?? null;
          if (!productIdToUse) {
            const createPayload: ProductUpsertPayload = {
              name: name.trim(),
              name_en: name.trim(),
              name_mk: nameMk.trim() || null,
              description: description.trim() || null,
              description_en: description.trim() || null,
              description_mk: descriptionMk.trim() || null,
              price: priceNum,
              category: categoryForEnum,
              category_id: categoryId || null,
              image_url: null,
              available,
            };
            const result = await upsertProduct.mutateAsync(createPayload);
            productIdToUse = result?.id ?? null;
            if (productIdToUse) {
              setProductId(productIdToUse);
              idForPayload = productIdToUse;
            }
          }
          if (!productIdToUse) {
            toast.error('Could not create or resolve product for image upload');
            return;
          }
          if (editingProduct?.image_url) {
            await deleteProductImageIfOurs(editingProduct.image_url);
          }
          finalImageUrl = await uploadProductImage(imageFile, productIdToUse);
        } finally {
          setUploading(false);
        }
      }

      const payload: ProductUpsertPayload = {
        ...(idForPayload && { id: idForPayload }),
        name: name.trim(),
        name_en: name.trim(),
        name_mk: nameMk.trim() || null,
        description: description.trim() || null,
        description_en: description.trim() || null,
        description_mk: descriptionMk.trim() || null,
        price: priceNum,
        category: categoryForEnum,
        category_id: categoryId || null,
        image_url: finalImageUrl,
        available,
      };
      const result = await upsertProduct.mutateAsync(payload);
      const id = result?.id ?? editingProduct?.id;
      if (id && !editingProduct) setProductId(id);
      setImageFile(null);
      setImagePreviewUrl(null);
      if (imageFile) setImageUrl(finalImageUrl ?? '');
      toast.success(editingProduct ? 'Product updated' : 'Product created');
      if (editingProduct) onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save product');
    }
  };

  const productIdForAddons = productId ?? editingProduct?.id ?? null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name (English) *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Product name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name-mk">Name (Macedonian)</Label>
            <Input
              id="name-mk"
              value={nameMk}
              onChange={(e) => setNameMk(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (English)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description-mk">Description (Macedonian)</Label>
            <Input
              id="description-mk"
              value={descriptionMk}
              onChange={(e) => setDescriptionMk(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select modal={false} value={categoryId || undefined} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              type="number"
              min={0}
              step={0.01}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label>Product image</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const validation = validateProductImageFile(file);
                if (validation.ok === false) {
                  toast.error(validation.error);
                  e.target.value = '';
                  return;
                }
                if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
                setImageFile(file);
                setImagePreviewUrl(URL.createObjectURL(file));
                e.target.value = '';
              }}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                Choose image
              </Button>
              {(imageFile || imageUrl) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    if (imagePreviewUrl) {
                      URL.revokeObjectURL(imagePreviewUrl);
                      setImagePreviewUrl(null);
                    }
                    setImageFile(null);
                    setImageUrl('');
                  }}
                  disabled={uploading}
                >
                  Remove
                </Button>
              )}
            </div>
            {(imagePreviewUrl || imageUrl) && (
              <div className="relative h-24 w-24 rounded-md overflow-hidden bg-muted border border-border">
                <img
                  src={imagePreviewUrl || imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              PNG, JPG, JPEG or WebP. Max 5MB.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="available" checked={available} onCheckedChange={setAvailable} />
            <Label htmlFor="available" className="cursor-pointer">Available</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSaveProduct} disabled={upsertProduct.isPending || uploading || isDemo}>
            {(upsertProduct.isPending || uploading) ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {editingProduct ? 'Update Product' : 'Save Product'}
          </Button>
        </DialogFooter>

        {productIdForAddons && (
          <>
            <SizesSection
              productId={productIdForAddons}
              sizes={sizes}
              sizesLoading={sizesLoading}
              upsertSize={upsertSizeMutation}
              deleteSize={deleteSizeMutation}
              isDemo={isDemo}
            />
            <AddonsSection
              productId={productIdForAddons}
            addons={addons}
            addonsLoading={addonsLoading}
            upsertAddon={upsertAddonMutation}
            deleteAddon={deleteAddonMutation}
            isDemo={isDemo}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface SizesSectionProps {
  productId: string;
  sizes: ProductSizeRow[];
  sizesLoading: boolean;
  upsertSize: ReturnType<typeof useUpsertSize>;
  deleteSize: ReturnType<typeof useDeleteSize>;
  isDemo: boolean;
}

function SizesSection({ productId, sizes, sizesLoading, upsertSize, deleteSize, isDemo }: SizesSectionProps) {
  const [newName, setNewName] = useState('');
  const [newNameMk, setNewNameMk] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newSortOrder, setNewSortOrder] = useState('0');
  const [newAvailable, setNewAvailable] = useState(true);
  const [editingSizeId, setEditingSizeId] = useState<string | null>(null);

  const handleSaveSize = async () => {
    if (isDemo) {
      toast.error('This is a demo account. Changes are disabled.');
      return;
    }
    const priceNum = parseFloat(newPrice);
    const sortOrderNum = parseInt(newSortOrder, 10) || 0;
    if (!newName.trim()) {
      toast.error('Size name is required');
      return;
    }
    if (Number.isNaN(priceNum) || priceNum < 0) {
      toast.error('Enter a valid size price');
      return;
    }
    const en = newName.trim();
    const payload: SizeUpsertPayload = {
      ...(editingSizeId && { id: editingSizeId }),
      product_id: productId,
      name: en,
      name_en: en,
      name_mk: newNameMk.trim() || null,
      price: priceNum,
      sort_order: sortOrderNum,
      available: newAvailable,
    };
    try {
      await upsertSize.mutateAsync(payload);
      toast.success(editingSizeId ? 'Size updated' : 'Size added');
      setNewName('');
      setNewNameMk('');
      setNewPrice('');
      setNewSortOrder('0');
      setNewAvailable(true);
      setEditingSizeId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save size');
    }
  };

  const handleEditSize = (s: ProductSizeRow) => {
    setEditingSizeId(s.id);
    setNewName(s.name);
    setNewNameMk(s.name_mk ?? '');
    setNewPrice(String(s.price));
    setNewSortOrder(String(s.sort_order ?? 0));
    setNewAvailable(Boolean(s.available));
  };

  const handleCancelEdit = () => {
    setEditingSizeId(null);
    setNewName('');
    setNewNameMk('');
    setNewPrice('');
    setNewSortOrder('0');
    setNewAvailable(true);
  };

  return (
    <div className="border-t pt-4 mt-4 space-y-4">
      <h4 className="font-medium">Sizes</h4>
      {sizesLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading sizes...
        </div>
      ) : (
        <>
          {sizes.length > 0 && (
            <ul className="space-y-2">
              {sizes.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground">{formatPrice(s.price)}</span>
                  <span className="text-muted-foreground">#{s.sort_order ?? 0}</span>
                  <span className="text-muted-foreground">{s.available ? 'Yes' : 'No'}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEditSize(s)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={async () => {
                        if (isDemo) {
                          toast.error('This is a demo account. Changes are disabled.');
                          return;
                        }
                        if (!confirm(`Delete size "${s.name}"?`)) return;
                        try {
                          await deleteSize.mutateAsync({ sizeId: s.id, productId });
                          toast.success('Size deleted');
                          if (editingSizeId === s.id) handleCancelEdit();
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : 'Failed to delete size');
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2 items-end">
            <Input
              placeholder="Size (EN)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-[120px]"
            />
            <Input
              placeholder="Size (MK)"
              value={newNameMk}
              onChange={(e) => setNewNameMk(e.target.value)}
              className="w-[120px]"
            />
            <Input
              type="number"
              min={0}
              step={0.01}
              placeholder="Price"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              className="w-[80px]"
            />
            <Input
              type="number"
              step={1}
              placeholder="Order"
              value={newSortOrder}
              onChange={(e) => setNewSortOrder(e.target.value)}
              className="w-[72px]"
            />
            <div className="flex items-center gap-2">
              <Switch
                id="new-size-available"
                checked={newAvailable}
                onCheckedChange={setNewAvailable}
              />
              <Label htmlFor="new-size-available" className="text-xs cursor-pointer">Available</Label>
            </div>
            {editingSizeId ? (
              <>
                <Button size="sm" onClick={handleSaveSize} disabled={upsertSize.isPending || isDemo}>
                  Update size
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={handleSaveSize} disabled={upsertSize.isPending || isDemo}>
                Add size
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

interface AddonsSectionProps {
  productId: string;
  addons: ProductAddonRow[];
  addonsLoading: boolean;
  upsertAddon: ReturnType<typeof useUpsertAddon>;
  deleteAddon: ReturnType<typeof useDeleteAddon>;
  isDemo: boolean;
}

function AddonsSection({ productId, addons, addonsLoading, upsertAddon, deleteAddon, isDemo }: AddonsSectionProps) {
  const [newName, setNewName] = useState('');
  const [newNameMk, setNewNameMk] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newAvailable, setNewAvailable] = useState(true);
  const [editingAddonId, setEditingAddonId] = useState<string | null>(null);

  const handleSaveAddon = async () => {
    if (isDemo) {
      toast.error('This is a demo account. Changes are disabled.');
      return;
    }
    const priceNum = parseFloat(newPrice);
    if (!newName.trim()) {
      toast.error('Add-on name is required');
      return;
    }
    if (Number.isNaN(priceNum) || priceNum < 0) {
      toast.error('Enter a valid price');
      return;
    }
    const en = newName.trim();
    const payload: AddonUpsertPayload = {
      ...(editingAddonId && { id: editingAddonId }),
      product_id: productId,
      name: en,
      name_en: en,
      name_mk: newNameMk.trim() || null,
      price: priceNum,
      available: newAvailable,
    };
    try {
      await upsertAddon.mutateAsync(payload);
      toast.success(editingAddonId ? 'Add-on updated' : 'Add-on added');
      setNewName('');
      setNewNameMk('');
      setNewPrice('');
      setNewAvailable(true);
      setEditingAddonId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save add-on');
    }
  };

  const handleEditAddon = (a: ProductAddonRow) => {
    setEditingAddonId(a.id);
    setNewName(a.name);
    setNewNameMk(a.name_mk ?? '');
    setNewPrice(String(a.price));
    setNewAvailable(Boolean(a.available));
  };

  const handleCancelEdit = () => {
    setEditingAddonId(null);
    setNewName('');
    setNewNameMk('');
    setNewPrice('');
    setNewAvailable(true);
  };

  return (
    <div className="border-t pt-4 mt-4 space-y-4">
      <h4 className="font-medium">Add-ons</h4>
      {addonsLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading add-ons...
        </div>
      ) : (
        <>
          {addons.length > 0 && (
            <ul className="space-y-2">
              {addons.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <span className="font-medium">{a.name}</span>
                  <span className="text-muted-foreground">{formatPrice(a.price)}</span>
                  <span className="text-muted-foreground">{a.available ? 'Yes' : 'No'}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEditAddon(a)}
                      disabled={isDemo}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={async () => {
                        if (isDemo) {
                          toast.error('This is a demo account. Changes are disabled.');
                          return;
                        }
                        if (!confirm(`Delete add-on "${a.name}"?`)) return;
                        try {
                          await deleteAddon.mutateAsync({ addonId: a.id, productId });
                          toast.success('Add-on deleted');
                          if (editingAddonId === a.id) handleCancelEdit();
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : 'Failed to delete');
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2 items-end">
            <Input
              placeholder="Add-on (EN)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-[130px]"
            />
            <Input
              placeholder="Add-on (MK)"
              value={newNameMk}
              onChange={(e) => setNewNameMk(e.target.value)}
              className="w-[130px]"
            />
            <Input
              type="number"
              min={0}
              step={0.01}
              placeholder="Price"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              className="w-[80px]"
            />
            <div className="flex items-center gap-2">
              <Switch
                id="new-addon-available"
                checked={newAvailable}
                onCheckedChange={setNewAvailable}
              />
              <Label htmlFor="new-addon-available" className="text-xs cursor-pointer">Available</Label>
            </div>
            {editingAddonId ? (
              <>
                <Button size="sm" onClick={handleSaveAddon} disabled={upsertAddon.isPending || isDemo}>
                  Update add-on
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={handleSaveAddon} disabled={upsertAddon.isPending || isDemo}>
                Add add-on
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default AdminMenu;
