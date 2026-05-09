import { cn } from '@/lib/cn';
import type { ImpactLevel } from '@/types';

const impactStyles: Record<ImpactLevel, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
};

export function ImpactBadge({ level }: { level: ImpactLevel }) {
  return (
    <span className={cn('text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded', impactStyles[level])}>
      {level}
    </span>
  );
}
