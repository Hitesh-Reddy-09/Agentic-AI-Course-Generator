import { cn } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function KpiCard({ title, value, subtitle, icon, className }: KpiCardProps) {
  return (
    <div className={cn(
      "rounded-lg border border-border bg-card p-6 flex items-start gap-4 animate-slide-up-fade",
      className
    )}>
      {icon && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl font-bold font-display text-card-foreground animate-count-up">{value}</p>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}
