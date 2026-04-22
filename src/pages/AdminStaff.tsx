import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { invokeEdge } from '@/lib/adminEdge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  UserPlus,
  Loader2,
  KeyRound,
  Mail,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  email: string;
  role: 'ADMIN' | 'STAFF';
  created_at: string;
  full_name?: string;
}

function getInitials(u: UserProfile): string {
  const name = (u.full_name || '').trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase();
    return parts[0][0].toUpperCase();
  }
  const email = (u.email || '').trim();
  if (email) {
    const local = email.split('@')[0] || '';
    if (local.length >= 2) return local.slice(0, 2).toUpperCase();
    return local[0]?.toUpperCase() || '?';
  }
  return '?';
}

function StaffCard({
  user,
  onSetPassword,
  onChangeRole,
  onDelete,
  canDelete,
}: {
  user: UserProfile;
  onSetPassword: (u: UserProfile) => void;
  onChangeRole: (u: UserProfile, role: 'ADMIN' | 'STAFF') => void;
  onDelete: (u: UserProfile) => void;
  canDelete: boolean;
}) {
  const [showActions, setShowActions] = useState(false);
  const displayName = (user.full_name || '').trim() || (user.email || '').trim() || 'Member';
  const email = (user.email || '').trim();

  return (
    <div className="relative rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="absolute top-3 right-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setShowActions(!showActions)}
          aria-label="Actions"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
        {showActions && (
          <div className="absolute right-0 top-full z-10 mt-1 flex flex-col gap-1 rounded-md border border-border bg-popover p-1 shadow-md">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 justify-start text-sm"
              onClick={() => {
                setShowActions(false);
                onSetPassword(user);
              }}
            >
              <KeyRound className="h-3.5 w-3.5 mr-2" />
              Set password
            </Button>
            <div className="flex items-center gap-2 px-2 py-1">
              <span className="text-xs text-muted-foreground">Role:</span>
              <Select
                value={user.role}
                onValueChange={(v) => {
                  onChangeRole(user, v as 'ADMIN' | 'STAFF');
                  setShowActions(false);
                }}
              >
                <SelectTrigger className="h-7 w-[90px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STAFF">STAFF</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 justify-start text-sm text-destructive hover:text-destructive hover:bg-destructive/10"
              disabled={!canDelete}
              onClick={() => {
                setShowActions(false);
                onDelete(user);
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Remove staff
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-start gap-4 pr-10">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {getInitials(user)}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-semibold text-foreground truncate">{displayName}</p>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {user.role}
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{email || '—'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminStaff() {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const [staffUsers, setStaffUsers] = useState<UserProfile[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [createFullName, setCreateFullName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<'STAFF' | 'ADMIN'>('STAFF');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [pwdDialogOpen, setPwdDialogOpen] = useState(false);
  const [pwdTarget, setPwdTarget] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [pwdSubmitting, setPwdSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && user && !isAdmin) navigate('/auth');
  }, [loading, user, isAdmin, navigate]);

  const fetchStaffUsers = useCallback(async () => {
    setStaffLoading(true);
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, email, role, created_at, full_name')
        .order('created_at', { ascending: true });

      if (profilesError) {
        toast.error(profilesError.message);
        setStaffUsers([]);
        return;
      }

      const mapped = (profilesData ?? []).map((profile) => ({
        id: String(profile.id),
        email: String(profile.email ?? ''),
        role: String(profile.role ?? '').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'STAFF',
        created_at: String(profile.created_at ?? ''),
        full_name: profile.full_name?.trim() || undefined,
      })) as UserProfile[];
      setStaffUsers(mapped);
    } finally {
      setStaffLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchStaffUsers();
  }, [isAdmin, fetchStaffUsers]);

  const openAddModal = () => {
    setCreateFullName('');
    setCreateEmail('');
    setCreatePassword('');
    setCreateRole('STAFF');
    setAddModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFullName.trim()) {
      toast.error('Full name is required');
      return;
    }
    if (!createEmail.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!createPassword || createPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setCreateSubmitting(true);
    const payload: Record<string, unknown> = {
      email: createEmail.trim(),
      password: createPassword,
      role: createRole,
      full_name: createFullName.trim(),
    };
    const { data, error, errorCode } = await invokeEdge<{ id?: string; user_id?: string; email?: string }>(
      'admin-create-user',
      payload
    );
    if (error) {
      setCreateSubmitting(false);
      if (errorCode === 'email_exists' || error.includes('email_exists') || error.includes('already been registered')) {
        toast.error('This email is already registered. Use a different email or ask them to sign in.');
      } else {
        toast.error(error);
      }
      return;
    }
    const newUserId = data?.id ?? data?.user_id;
    if (!newUserId) {
      setCreateSubmitting(false);
      toast.error(
        'User may have been created but the server did not return a user id. Staff will not appear until the backend returns id or user_id.'
      );
      return;
    }
    setCreateSubmitting(false);
    toast.success(`Staff created: ${data?.email ?? createEmail}`);
    setAddModalOpen(false);
    setCreateFullName('');
    setCreateEmail('');
    setCreatePassword('');
    setCreateRole('STAFF');
    fetchStaffUsers();
  };

  const handleSetPassword = async () => {
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
    if (error) toast.error(error);
    else {
      toast.success(`Password updated for ${pwdTarget.email}`);
      setPwdDialogOpen(false);
      setNewPassword('');
      setPwdTarget(null);
    }
  };

  const handleChangeRole = async (targetUser: UserProfile, newRole: 'ADMIN' | 'STAFF') => {
    if (newRole === targetUser.role) return;
    const { error } = await supabase
      .from('user_profiles')
      .update({ role: newRole })
      .eq('id', targetUser.id);
    if (error) toast.error(error.message ?? 'Failed to change role.');
    else {
      toast.success(`${targetUser.email} is now ${newRole}`);
      setStaffUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
      );
    }
  };

  const adminCount = staffUsers.filter((u) => u.role === 'ADMIN').length;

  const handleDeleteRequest = (targetUser: UserProfile) => {
    if (targetUser.role === 'ADMIN' && adminCount <= 1) {
      toast.error('Cannot remove the last admin. Add another admin first.');
      return;
    }
    setDeleteTarget(targetUser);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;

    setDeleteSubmitting(true);
    const profileDelete = await supabase.from('user_profiles').delete().eq('id', target.id);
    const error: { message?: string } | null = profileDelete.error;
    if (!error) {
      await supabase.from('user_roles').delete().eq('user_id', target.id);
    }

    setDeleteSubmitting(false);
    setDeleteConfirmOpen(false);
    setDeleteTarget(null);

    if (error) {
      toast.error(error.message ?? 'Failed to remove staff member.');
      return;
    }

    toast.success(`${target.email ?? 'Staff member'} removed successfully.`);
    fetchStaffUsers();
  };

  if (loading || !user || !isAdmin) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Staff</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage staff accounts and roles
        </p>
      </div>

      {/* Staff Members section */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Staff Members</h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button onClick={openAddModal} className="w-full sm:w-auto">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Staff
            </Button>
          </div>
        </div>

        {staffLoading && staffUsers.length === 0 ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-[140px] rounded-xl" />
            ))}
          </div>
        ) : staffUsers.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">No staff members yet.</p>
            <Button className="mt-4" variant="outline" onClick={openAddModal}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Staff
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {staffUsers.map((u) => (
              <StaffCard
                key={u.id}
                user={u}
                onSetPassword={(target) => {
                  setPwdTarget(target);
                  setNewPassword('');
                  setPwdDialogOpen(true);
                }}
                onChangeRole={handleChangeRole}
                onDelete={handleDeleteRequest}
                canDelete={u.role !== 'ADMIN' || adminCount > 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Staff modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Staff</DialogTitle>
            <DialogDescription>
              Create a new staff or admin account. They can sign in with the email and password you set.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4 py-2">
            <div>
              <Label htmlFor="full_name">Full name *</Label>
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
              <Label htmlFor="add-email">Email *</Label>
              <Input
                id="add-email"
                type="email"
                placeholder="staff@example.com"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="add-password">Password *</Label>
              <Input
                id="add-password"
                type="password"
                placeholder="Min 8 characters"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                className="mt-1"
                minLength={8}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">At least 8 characters. No invite email will be sent.</p>
            </div>
            <div>
              <Label htmlFor="add-role">Role *</Label>
              <Select
                value={createRole}
                onValueChange={(v) => setCreateRole(v as 'ADMIN' | 'STAFF')}
              >
                <SelectTrigger id="add-role" className="mt-1">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STAFF">STAFF</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createSubmitting}>
                {createSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this staff member?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  This removes <strong>{deleteTarget.full_name?.trim() || deleteTarget.email}</strong> from
                  staff. Their auth account may still exist until you delete the user in your auth provider.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteConfirm();
              }}
              disabled={deleteSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Set password dialog */}
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
            <Button onClick={handleSetPassword} disabled={pwdSubmitting}>
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
}

export default AdminStaff;
