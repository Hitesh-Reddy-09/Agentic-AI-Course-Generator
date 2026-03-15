import { cn } from '@/lib/utils';

type BadgeVariant = 'approved' | 'pending' | 'rejected' | 'default';

const variants: Record<BadgeVariant, string> = {
  approved: 'bg-success/10 text-success border-success/20',
  pending: 'bg-warning/10 text-warning border-warning/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
  default: 'bg-muted text-muted-foreground border-border',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant: BadgeVariant =
    status === 'approved' ? 'approved' :
    status === 'awaiting_human_approval' ? 'pending' :
    status === 'rejected' ? 'rejected' : 'default';

  const label =
    status === 'awaiting_human_approval' ? 'Awaiting Approval' :
    status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span className={cn(
      'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
      variants[variant],
      className
    )}>
      {label}
    </span>
  );
}
