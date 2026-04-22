import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/types';
import { useTranslation } from 'react-i18next';

const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: 'bg-orange-100 text-orange-900 border-orange-200',
  ACCEPTED: 'bg-amber-100 text-amber-800 border-amber-200',
  PREPARING: 'bg-blue-100 text-blue-800 border-blue-200',
  READY: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  CANCELED: 'bg-red-100 text-red-800 border-red-200',
};

interface StatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground',
        className
      )}
    >
      {t(`admin.status.${status}`)}
    </span>
  );
}
