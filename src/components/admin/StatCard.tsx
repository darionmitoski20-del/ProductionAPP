import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  className?: string;
}

export function StatCard({ title, value, icon: Icon, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
        </div>
        <div className="rounded-lg bg-muted/80 p-2.5">
          <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
        </div>
      </div>
    </div>
  );
}
