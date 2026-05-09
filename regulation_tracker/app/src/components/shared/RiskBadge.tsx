import { cn } from '@/lib/cn';
import type { RiskLevel } from '@/types';

const riskStyles: Record<RiskLevel, string> = {
  Critical: 'text-red-700 bg-red-50',
  High: 'text-orange-700 bg-orange-50',
  Medium: 'text-amber-700 bg-amber-50',
  Low: 'text-green-700 bg-green-50',
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={cn('text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded', riskStyles[level])}>
      {level}
    </span>
  );
}
