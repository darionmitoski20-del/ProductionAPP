import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { AdminOrderCard } from '@/components/AdminOrderCard';
import { useAuth } from '@/hooks/useAuth';
import { useOrders } from '@/hooks/useOrders';
import { OrderStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LogOut,
  ChefHat,
  Home,
  Loader2,
  UtensilsCrossed,
  Users,
  KeyRound,
  ShieldCheck,
  UserPlus,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// ── Types ──────────────────────────────────────────────────────
interface UserProfile {
  id: string;
  email: string;
  role: 'ADMIN' | 'STAFF';
  created_at: string;
  full_name?: string;
}

// ── Helpers ────────────────────────────────────────────────────
async function invokeEdge<T = any>(
  fnName: string,
  body?: Record<string, unknown>,
): Promise<{ data: T | null; error: string | null }> {
  // getUser() validates the token server-side and triggers a refresh if expired
  const { error: userError } = await supabase.auth.getUser();
  if (userError) {
    return { data: null, error: 'Session expired. Please sign in again.' };
  }

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { data: null, error: 'Not signed in' };

  const url =
    import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') +
    `/functions/v1/${fnName}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body ?? {}),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Supabase gateway uses "msg", our functions use "error"
    return { data: null, error: json.error ?? json.msg ?? json.message ?? `Request failed (${res.status})` };
  }
  return { data: json as T, error: null };
}

// ── Component ──────────────────────────────────────────────────
const Admin = () => {
  const navigate = useNavigate();
  const { user, loading, isAdmin, isDemo, role, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('accepted');
  const { data: orders, isLoading } = useOrders();

  // Staff users state
  const [staffUsers, setStaffUsers] = useState<UserProfile[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);

  // Create user form
  const [createEmail, setCreateEmail] = useState('');
  const [createFullName, setCreateFullName] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<'STAFF' | 'ADMIN'>('STAFF');
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Set password dialog
  const [pwdDialogOpen, setPwdDialogOpen] = useState(false);
  const [pwdTarget, setPwdTarget] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [pwdSubmitting, setPwdSubmitting] = useState(false);

  // ── Effects ────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const fetchStaffUsers = useCallback(async () => {
    setStaffLoading(true);
    const { data, error } = await invokeEdge<{ users: UserProfile[] }>('admin-list-users');
    if (error) {
      toast.error(error);
    } else if (data?.users) {
      setStaffUsers(data.users);
    }
    setStaffLoading(false);
  }, []);

  // Fetch staff users when the staff tab is activated
  useEffect(() => {
    if (activeTab === 'staff' && isAdmin) {
      fetchStaffUsers();
    }
  }, [activeTab, isAdmin, fetchStaffUsers]);

  // ── Handlers ───────────────────────────────────────────────
  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFullName.trim()) {
      toast.error('Enter a full name');
      return;
    }
    if (!createEmail.trim()) {
      toast.error('Enter an email address');
      return;
    }
    if (!createPassword || createPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setCreateSubmitting(true);
    const { data, error } = await invokeEdge('admin-create-user', {
      email: createEmail.trim(),
      password: createPassword,
      role: createRole,
      full_name: createFullName.trim(),
    });
    setCreateSubmitting(false);

    if (error) {
      toast.error(error);
    } else {
      toast.success(`User created: ${data?.email ?? createEmail}`);
      setCreateEmail('');
      setCreateFullName('');
      setCreatePassword('');
      setCreateRole('STAFF');
      fetchStaffUsers();
    }
  };

  const handleSetPassword = async () => {
    if (isDemo) {
      toast.error('Demo account: you cannot set passwords.');
      return;
    }
    if (!pwdTarget) return;
    if (!newPassword || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setPwdSubmitting(true);
    const { error } = await invokeEdge('admin-set-password', {
      user_id: pwdTarget.id,
      new_password: newPassword,
    });
    setPwdSubmitting(false);

    if (error) {
      toast.error(error);
    } else {
      toast.success(`Password updated for ${pwdTarget.email}`);
      setPwdDialogOpen(false);
      setNewPassword('');
      setPwdTarget(null);
    }
  };

  const handleChangeRole = async (targetUser: UserProfile, newRole: 'ADMIN' | 'STAFF') => {
    if (isDemo) {
      toast.error('Demo account: you cannot change roles or set passwords.');
      return;
    }
    if (newRole === targetUser.role) return;
    const { error } = await invokeEdge('admin-set-role', {
      user_id: targetUser.id,
      role: newRole,
    });
    if (error) {
      toast.error(error);
    } else {
      toast.success(`${targetUser.email} is now ${newRole}`);
      setStaffUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u)),
      );
    }
  };

  const openPwdDialog = (u: UserProfile) => {
    setPwdTarget(u);
    setNewPassword('');
    setPwdDialogOpen(true);
  };

  // ── Derived data ───────────────────────────────────────────
  const filterOrders = (statuses: OrderStatus[]) => {
    return orders?.filter((o) => statuses.includes(o.status)) || [];
  };

  const acceptedOrders = filterOrders(['PENDING', 'ACCEPTED']);
  const preparingOrders = filterOrders(['PREPARING']);
  const readyOrders = filterOrders(['READY']);
  const canceledOrders = filterOrders(['CANCELED']);

  // ── Loading / access denied ────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
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

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="text-sm font-medium text-muted-foreground">Admin Panel</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {user?.email} ({role ?? '—'})
            </span>
            <Button asChild variant="outline" size="sm">
              <Link to="/kitchen">
                <ChefHat className="mr-2 h-4 w-4" />
                Kitchen
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
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

      {/* Content */}
      <main className="container py-6">
        <h1 className="text-3xl font-display font-bold mb-6">Orders</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="accepted" className="relative">
              Accepted
              {acceptedOrders.length > 0 && (
                <span className="ml-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                  {acceptedOrders.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="preparing">
              Preparing
              {preparingOrders.length > 0 && (
                <span className="ml-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                  {preparingOrders.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="ready">
              Ready
              {readyOrders.length > 0 && (
                <span className="ml-2 bg-success text-success-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                  {readyOrders.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="canceled">Canceled</TabsTrigger>
            <TabsTrigger value="staff">
              <Users className="mr-2 h-4 w-4" />
              Staff Users
            </TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-64 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              <TabsContent value="accepted">
                {acceptedOrders.length === 0 ? (
                  <EmptyState message="No accepted orders" />
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {acceptedOrders.map((order) => (
                      <AdminOrderCard key={order.id} order={order} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="preparing">
                {preparingOrders.length === 0 ? (
                  <EmptyState message="No orders in preparation" />
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {preparingOrders.map((order) => (
                      <AdminOrderCard key={order.id} order={order} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="ready">
                {readyOrders.length === 0 ? (
                  <EmptyState message="No orders ready for pickup" />
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {readyOrders.map((order) => (
                      <AdminOrderCard key={order.id} order={order} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="canceled">
                {canceledOrders.length === 0 ? (
                  <EmptyState message="No canceled orders" />
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {canceledOrders.map((order) => (
                      <AdminOrderCard key={order.id} order={order} />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ── STAFF USERS TAB ──────────────────────────── */}
              <TabsContent value="staff" className="space-y-8">
                {/* Create user form */}
                <div className="rounded-lg border bg-card p-6 max-w-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <UserPlus className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold">Create Staff User</h2>
                  </div>
                  {isDemo && (
                    <p className="text-sm text-amber-800 dark:text-amber-200 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 px-3 py-2 mb-4">
                      Demo account: you can create users. Changing roles and setting passwords are disabled.
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mb-4">
                    Create a new account. The user can sign in immediately with the email and
                    password you set here.
                  </p>
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div>
                      <Label htmlFor="full_name">Full name</Label>
                      <Input
                        id="full_name"
                        name="full_name"
                        placeholder="e.g. John Doe"
                        value={createFullName}
                        onChange={(e) => setCreateFullName(e.target.value)}
                        className="mt-1"
                        autoComplete="name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="create-email">Email</Label>
                      <Input
                        id="create-email"
                        type="email"
                        placeholder="staff@example.com"
                        value={createEmail}
                        onChange={(e) => setCreateEmail(e.target.value)}
                        className="mt-1"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="create-password">Password</Label>
                      <Input
                        id="create-password"
                        type="password"
                        placeholder="Min 8 characters"
                        value={createPassword}
                        onChange={(e) => setCreatePassword(e.target.value)}
                        className="mt-1"
                        minLength={8}
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Must be at least 8 characters. No invite email will be sent.
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="create-role">Role</Label>
                      <Select
                        value={createRole}
                        onValueChange={(v) => setCreateRole(v as 'ADMIN' | 'STAFF')}
                      >
                        <SelectTrigger id="create-role" className="mt-1">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="STAFF">STAFF</SelectItem>
                          <SelectItem value="ADMIN">ADMIN</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" disabled={createSubmitting}>
                      {createSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <UserPlus className="h-4 w-4 mr-2" />
                      )}
                      Create User
                    </Button>
                  </form>
                </div>

                {/* Users table */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">All Users</h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchStaffUsers}
                      disabled={staffLoading}
                    >
                      <RefreshCw
                        className={`h-4 w-4 mr-2 ${staffLoading ? 'animate-spin' : ''}`}
                      />
                      Refresh
                    </Button>
                  </div>

                  {staffLoading && staffUsers.length === 0 ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full rounded" />
                      ))}
                    </div>
                  ) : staffUsers.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No users found.
                    </p>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Created At</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {staffUsers.map((u) => (
                            <TableRow key={u.id}>
                              <TableCell className="font-medium">{u.email}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={u.role === 'ADMIN' ? 'default' : 'secondary'}
                                >
                                  {u.role === 'ADMIN' ? (
                                    <ShieldCheck className="h-3 w-3 mr-1" />
                                  ) : null}
                                  {u.role}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {new Date(u.created_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openPwdDialog(u)}
                                    disabled={isDemo}
                                  >
                                    <KeyRound className="h-3.5 w-3.5 mr-1" />
                                    Password
                                  </Button>
                                  <Select
                                    value={u.role}
                                    onValueChange={(v) =>
                                      handleChangeRole(u, v as 'ADMIN' | 'STAFF')
                                    }
                                    disabled={isDemo}
                                  >
                                    <SelectTrigger className="w-[110px] h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="STAFF">STAFF</SelectItem>
                                      <SelectItem value="ADMIN">ADMIN</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>

      {/* Set Password Dialog */}
      <Dialog open={pwdDialogOpen} onOpenChange={setPwdDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set New Password</DialogTitle>
            <DialogDescription>
              Set a new password for <strong>{pwdTarget?.email}</strong>. The user will need
              to use this new password on their next login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="new-pwd">New Password</Label>
              <Input
                id="new-pwd"
                type="password"
                placeholder="Min 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1"
                minLength={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwdDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSetPassword} disabled={pwdSubmitting || isDemo}>
              {pwdSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <KeyRound className="h-4 w-4 mr-2" />
              )}
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="text-center py-12 text-muted-foreground">
    <p className="text-lg">{message}</p>
  </div>
);

export default Admin;
