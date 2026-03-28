import { ReactNode } from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

const variantStyles = {
  default: 'bg-muted/50',
  primary: 'gradient-primary',
  success: 'gradient-success',
  warning: 'gradient-warning',
  danger: 'gradient-danger',
};

export function KPICard({ title, value, change, changeLabel, icon: Icon, variant = 'default' }: KPICardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <div className="kpi-card group">
      <div className="flex items-start justify-between mb-4">
        <div className={cn('p-2.5 rounded-xl', variant === 'default' ? 'bg-muted' : variantStyles[variant])}>
          <Icon className={cn('w-5 h-5', variant === 'default' ? 'text-foreground' : 'text-primary-foreground')} />
        </div>
        {change !== undefined && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
            isPositive && 'bg-success/10 text-success',
            isNegative && 'bg-destructive/10 text-destructive',
            !isPositive && !isNegative && 'bg-muted text-muted-foreground'
          )}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : isNegative ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{title}</p>
      {changeLabel && <p className="text-xs text-muted-foreground mt-0.5">{changeLabel}</p>}
    </div>
  );
}
