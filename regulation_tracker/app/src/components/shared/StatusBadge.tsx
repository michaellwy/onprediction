import { cn } from '@/lib/cn';
import type { RegStatus } from '@/types';

const statusStyles: Record<RegStatus, string> = {
  Accessible: 'bg-status-accessible/15 text-green-700 border-status-accessible/30',
  Restricted: 'bg-status-restricted/15 text-amber-700 border-status-restricted/30',
  Banned: 'bg-status-banned/15 text-red-700 border-status-banned/30',
  Uncertain: 'bg-status-uncertain/15 text-slate-600 border-status-uncertain/30',
  Unregulated: 'bg-slate-100 text-slate-500 border-slate-200',
};

export function StatusBadge({ status, size = 'sm' }: { status: RegStatus; size?: 'xs' | 'sm' }) {
  return (
    <span className={cn(
      'inline-flex items-center border font-medium rounded-full',
      size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
      statusStyles[status],
    )}>
      {status}
    </span>
  );
}
