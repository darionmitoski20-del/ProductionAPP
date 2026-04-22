import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { BarChart3 } from 'lucide-react';

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && user && !isAdmin) navigate('/auth');
  }, [loading, user, isAdmin, navigate]);

  if (loading || !user || !isAdmin) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reports and insights (coming soon)
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center">
        <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Analytics dashboard coming soon.</p>
      </div>
    </div>
  );
}
