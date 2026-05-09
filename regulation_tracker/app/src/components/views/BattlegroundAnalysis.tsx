import { useState } from 'react';
import { battlegrounds, events, stakeholders } from '@/data';
import type { Battleground } from '@/types';
import { cn } from '@/lib/cn';
import { Swords, TrendingUp, Users, Scale, AlertTriangle } from 'lucide-react';

function BattlegroundCard({ bg, isExpanded, onToggle }: {
  bg: Battleground;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  // Count related events and stakeholders
  const relatedEvents = events.filter(e =>
    e.battlegrounds.some(b => b.toLowerCase().includes(bg.name.toLowerCase().split(' ')[0]))
  );
  const relatedStakeholders = stakeholders.filter(s =>
    s.related_battlegrounds.some(b => b === bg.id)
  );

  return (
    <div className={cn(
      'border rounded-lg bg-card transition-all',
      isExpanded ? 'border-primary/30 shadow-sm' : 'border-border',
    )}>
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 text-left flex items-start gap-3"
      >
        <span className="text-xs font-mono text-muted-foreground mt-0.5 shrink-0">{bg.id}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">{bg.name}</h3>
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{bg.core_tension}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
          <span>{relatedEvents.length} events</span>
          <span>&middot;</span>
          <span>{relatedStakeholders.length} actors</span>
        </div>
      </button>

      {isExpanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
          {/* Side A vs Side B */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-green-50/50 border border-green-200/50 rounded-lg p-3">
              <h4 className="text-[10px] uppercase font-semibold text-green-700 tracking-wide mb-1.5 flex items-center gap-1.5">
                <TrendingUp size={12} />
                Side A
              </h4>
              <p className="text-sm text-green-900/80">{bg.side_a}</p>
            </div>
            <div className="bg-red-50/50 border border-red-200/50 rounded-lg p-3">
              <h4 className="text-[10px] uppercase font-semibold text-red-700 tracking-wide mb-1.5 flex items-center gap-1.5">
                <AlertTriangle size={12} />
                Side B
              </h4>
              <p className="text-sm text-red-900/80">{bg.side_b}</p>
            </div>
          </div>

          {/* Key Cases */}
          {bg.key_cases && (
            <div>
              <h4 className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide mb-1 flex items-center gap-1.5">
                <Scale size={12} />
                Key Cases
              </h4>
              <p className="text-sm text-muted-foreground">{bg.key_cases}</p>
            </div>
          )}

          {/* Current Status */}
          <div>
            <h4 className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide mb-1">Current Status</h4>
            <p className="text-sm">{bg.current_status}</p>
          </div>

          {/* Trajectory */}
          <div>
            <h4 className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide mb-1">Trajectory</h4>
            <p className="text-sm text-muted-foreground">{bg.trajectory}</p>
          </div>

          {/* Industry Impact */}
          {bg.industry_impact && (
            <div>
              <h4 className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide mb-1">Industry Impact</h4>
              <p className="text-sm text-muted-foreground">{bg.industry_impact}</p>
            </div>
          )}

          {/* Resolution Scenarios */}
          {bg.resolution_scenarios && (
            <div>
              <h4 className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide mb-1">Resolution Scenarios</h4>
              <p className="text-sm text-muted-foreground">{bg.resolution_scenarios}</p>
            </div>
          )}

          {/* Related Stakeholders */}
          {relatedStakeholders.length > 0 && (
            <div>
              <h4 className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide mb-1.5 flex items-center gap-1.5">
                <Users size={12} />
                Related Actors ({relatedStakeholders.length})
              </h4>
              <div className="flex gap-2 flex-wrap">
                {relatedStakeholders.map(s => (
                  <span key={s.actor} className={cn(
                    'text-xs px-2 py-0.5 rounded-full border',
                    s.stance === 'pro_pm' ? 'bg-green-50 text-green-700 border-green-200' :
                    s.stance === 'anti_pm' ? 'bg-red-50 text-red-700 border-red-200' :
                    s.stance === 'mixed' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-slate-50 text-slate-600 border-slate-200',
                  )}>
                    {s.actor}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function BattlegroundAnalysisView() {
  const [expandedId, setExpandedId] = useState<string | null>(battlegrounds[0]?.id || null);

  return (
    <div className="px-6 py-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="font-display text-xl font-bold">Battleground Analysis</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {battlegrounds.length} regulatory fault lines shaping prediction market law
        </p>
      </div>

      <div className="space-y-3">
        {battlegrounds.map(bg => (
          <BattlegroundCard
            key={bg.id}
            bg={bg}
            isExpanded={expandedId === bg.id}
            onToggle={() => setExpandedId(expandedId === bg.id ? null : bg.id)}
          />
        ))}
      </div>
    </div>
  );
}
