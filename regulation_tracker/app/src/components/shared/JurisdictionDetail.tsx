import { X } from 'lucide-react';
import type { Jurisdiction } from '@/types';
import { StatusBadge } from './StatusBadge';
import { DirectionArrow } from './DirectionArrow';
import { MomentumDot } from './MomentumDot';
import { RiskBadge } from './RiskBadge';
import { SourceLink } from './SourceLink';

export function JurisdictionDetail({ jurisdiction: j, onClose }: {
  jurisdiction: Jurisdiction;
  onClose: () => void;
}) {
  const platformEntries = Object.entries(j.platforms).filter(([, v]) => v.status && v.status !== '—');

  return (
    <div className="w-[380px] border-l border-border bg-card h-screen overflow-y-auto shrink-0">
      <div className="sticky top-0 bg-card z-10 px-4 py-3 border-b border-border flex items-start justify-between">
        <div>
          <h2 className="font-display text-lg font-bold leading-tight">{j.name}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{j.code} &middot; {j.level}</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-accent rounded">
          <X size={16} />
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Status row */}
        <div className="flex items-center gap-3 flex-wrap">
          <StatusBadge status={j.status} />
          <DirectionArrow direction={j.direction} showLabel />
          <MomentumDot momentum={j.momentum} />
          <RiskBadge level={j.risk_level} />
        </div>
        {j.statusSource && (
          <SourceLink citation={j.statusSource} />
        )}

        {/* Summary */}
        <p className="text-sm text-foreground leading-relaxed">{j.summary}</p>

        {/* Classification */}
        {j.classification && j.classification !== '—' && (
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Classification</h3>
            <p className="text-sm">{j.classification}</p>
          </div>
        )}

        {/* Key Legislation */}
        {j.key_legislation && j.key_legislation !== '—' && (
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Key Legislation</h3>
            <p className="text-sm">{j.key_legislation}</p>
          </div>
        )}

        {/* Pending Bills */}
        {j.pending_bills && (
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Pending Bills</h3>
            <p className="text-sm">{j.pending_bills}</p>
          </div>
        )}

        {/* Active Litigation */}
        {j.active_litigation && (
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Active Litigation</h3>
            <p className="text-sm">{j.active_litigation}</p>
          </div>
        )}

        {/* Federal Preemption */}
        {j.federal_preemption && (
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Federal Preemption</h3>
            <p className="text-sm">{j.federal_preemption}</p>
          </div>
        )}

        {/* Platform Access */}
        {platformEntries.length > 0 && (
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Platform Access</h3>
            <div className="space-y-1.5">
              {platformEntries.map(([name, access]) => (
                <div key={name} className="flex items-start gap-2 text-sm">
                  <span className="font-medium capitalize w-20 shrink-0">{name}</span>
                  <span className="text-muted-foreground flex-1">{access.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sources */}
        {j.allSources.length > 0 && (
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Sources ({j.allSources.length})</h3>
            <div className="space-y-1">
              {j.allSources.filter(s => s.url).slice(0, 10).map((s, i) => (
                <div key={i}>
                  <SourceLink citation={s} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
