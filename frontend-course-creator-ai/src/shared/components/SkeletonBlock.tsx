import { cn } from '@/lib/utils';

interface SkeletonBlockProps {
  lines?: number;
  className?: string;
}

export function SkeletonBlock({ lines = 3, className }: SkeletonBlockProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="shimmer h-4"
          style={{ width: `${100 - i * 15}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border border-border bg-card p-6 space-y-4', className)}>
      <div className="shimmer h-5 w-1/3" />
      <div className="shimmer h-8 w-1/2" />
      <div className="shimmer h-3 w-2/3" />
    </div>
  );
}
