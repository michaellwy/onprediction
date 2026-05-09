import { cn } from '@/lib/cn';
import type { Momentum } from '@/types';

export function MomentumDot({ momentum }: { momentum: Momentum }) {
  return (
    <span className="inline-flex items-center gap-1.5" title={`Momentum: ${momentum}`}>
      <span className={cn(
        'inline-block w-2 h-2 rounded-full',
        momentum === 'Fast' && 'bg-red-500 animate-pulse-slow',
        momentum === 'Slow' && 'bg-amber-400',
        momentum === 'None' && 'bg-slate-300',
      )} />
      <span className="text-xs text-muted-foreground">{momentum}</span>
    </span>
  );
}
