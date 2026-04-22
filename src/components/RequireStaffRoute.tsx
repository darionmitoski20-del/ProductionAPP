import { useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export function RequireStaffRoute({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { user, loading, isStaff } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }
    if (!isStaff) {
      navigate('/', { replace: true });
    }
  }, [user, loading, isStaff, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user || !isStaff) {
    return null;
  }
  return <>{children}</>;
}
