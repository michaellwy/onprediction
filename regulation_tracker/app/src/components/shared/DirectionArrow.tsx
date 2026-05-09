import { TrendingUp, TrendingDown, Minus, GitBranch } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Direction } from '@/types';

const dirConfig: Record<Direction, { icon: typeof TrendingUp; color: string; label: string }> = {
  Liberalizing: { icon: TrendingUp, color: 'text-green-600', label: 'Liberalizing' },
  Tightening: { icon: TrendingDown, color: 'text-red-600', label: 'Tightening' },
  Stalled: { icon: Minus, color: 'text-slate-400', label: 'Stalled' },
  Fragmenting: { icon: GitBranch, color: 'text-orange-500', label: 'Fragmenting' },
};

export function DirectionArrow({ direction, showLabel = false, size = 14 }: {
  direction: Direction;
  showLabel?: boolean;
  size?: number;
}) {
  const { icon: Icon, color, label } = dirConfig[direction];
  return (
    <span className={cn('inline-flex items-center gap-1', color)} title={label}>
      <Icon size={size} />
      {showLabel && <span className="text-xs font-medium">{label}</span>}
    </span>
  );
}
