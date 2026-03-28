import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, LeadStatus } from '@/types/crm';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: LeadStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full font-medium',
      LEAD_STATUS_COLORS[status],
      size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
    )}>
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}
