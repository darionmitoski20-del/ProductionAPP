import { useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

function canAccessAdmin(role: 'admin' | 'staff' | null): boolean {
  return role === 'admin';
}

export function RequireAdminRoute({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { user, loading, role } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }
    if (canAccessAdmin(role)) return;
    if (role === 'staff') {
      navigate('/kitchen', { replace: true });
      return;
    }
    navigate('/', { replace: true });
  }, [user, loading, role, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user || !canAccessAdmin(role)) {
    return null;
  }
  return <>{children}</>;
}
