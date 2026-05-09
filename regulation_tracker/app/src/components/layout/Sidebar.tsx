import {
  Globe, Flag, Scale, Layers, Clock, Swords, Users, Grid3X3,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type { ViewId } from '@/hooks/useViewNavigation';
import { VIEW_LABELS } from '@/hooks/useViewNavigation';

const viewIcons: Record<ViewId, typeof Globe> = {
  map: Globe,
  us: Flag,
  litigation: Scale,
  platforms: Layers,
  timeline: Clock,
  battlegrounds: Swords,
  stakeholders: Users,
  risk: Grid3X3,
};

const viewOrder: ViewId[] = [
  'map', 'us', 'litigation', 'platforms', 'timeline', 'battlegrounds', 'stakeholders', 'risk',
];

export function Sidebar({ activeView, onNavigate }: {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
}) {
  return (
    <nav className="w-56 shrink-0 border-r border-border bg-card h-screen sticky top-0 flex flex-col">
      <div className="px-4 py-4 border-b border-border">
        <h1 className="font-display text-lg font-bold text-foreground leading-tight">
          Regulation Tracker
        </h1>
        <p className="text-[11px] text-muted-foreground mt-0.5">Prediction Markets</p>
      </div>

      <div className="flex-1 py-2 overflow-y-auto">
        {viewOrder.map((id) => {
          const Icon = viewIcons[id];
          const isActive = activeView === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left',
                isActive
                  ? 'bg-primary/10 text-primary font-medium border-r-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent',
              )}
            >
              <Icon size={16} className={cn(isActive ? 'text-primary' : 'text-muted-foreground')} />
              {VIEW_LABELS[id]}
            </button>
          );
        })}
      </div>

      <div className="px-4 py-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground">
          38 jurisdictions &middot; 36 events &middot; 12 platforms
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Updated March 31, 2026
        </p>
      </div>
    </nav>
  );
}
