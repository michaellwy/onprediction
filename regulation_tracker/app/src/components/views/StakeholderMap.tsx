import { useState } from 'react';
import { stakeholders } from '@/data';
import type { Stakeholder, Stance, InfluenceLevel } from '@/types';
import { cn } from '@/lib/cn';
import { SourceLink } from '@/components/shared/SourceLink';
import { Quote } from 'lucide-react';

const stanceColors: Record<Stance, { bg: string; text: string; border: string; dot: string }> = {
  pro_pm: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
  anti_pm: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  mixed: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  neutral: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' },
};

const stanceLabels: Record<Stance, string> = {
  pro_pm: 'Pro-PM',
  anti_pm: 'Anti-PM',
  mixed: 'Mixed',
  neutral: 'Neutral',
};

const influenceSize: Record<InfluenceLevel, string> = {
  high: 'ring-2 ring-primary/30',
  medium: '',
  low: 'opacity-80',
};

function StakeholderCard({ stakeholder: s, isSelected, onClick }: {
  stakeholder: Stakeholder;
  isSelected: boolean;
  onClick: () => void;
}) {
  const colors = stanceColors[s.stance];
  return (
    <div
      onClick={onClick}
      className={cn(
        'border rounded-lg p-4 cursor-pointer transition-all',
        colors.bg, colors.border,
        isSelected ? 'ring-2 ring-primary shadow-sm' : 'hover:shadow-sm',
        influenceSize[s.influence],
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-semibold text-sm">{s.actor}</h3>
        <span className={cn('text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded', colors.bg, colors.text)}>
          {stanceLabels[s.stance]}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-1">
        {s.actor_type.replace(/_/g, ' ')} &middot; {s.jurisdiction} &middot; Influence: {s.influence}
      </p>
      <p className="text-sm text-muted-foreground line-clamp-2">{s.position_summary}</p>
    </div>
  );
}

export function StakeholderMapView() {
  const [selected, setSelected] = useState<Stakeholder | null>(null);
  const [stanceFilter, setStanceFilter] = useState<Stance | 'all'>('all');

  const filtered = stanceFilter === 'all'
    ? stakeholders
    : stakeholders.filter(s => s.stance === stanceFilter);

  // Group by stance
  const grouped = {
    pro_pm: filtered.filter(s => s.stance === 'pro_pm'),
    anti_pm: filtered.filter(s => s.stance === 'anti_pm'),
    mixed: filtered.filter(s => s.stance === 'mixed'),
    neutral: filtered.filter(s => s.stance === 'neutral'),
  };

  return (
    <div className="flex h-screen">
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mb-6">
          <h2 className="font-display text-xl font-bold">Stakeholder Map</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stakeholders.length} actors shaping prediction market regulation
          </p>
        </div>

        {/* Stance filter */}
        <div className="flex items-center gap-2 mb-6">
          {(['all', 'pro_pm', 'anti_pm', 'mixed', 'neutral'] as const).map(stance => {
            const count = stance === 'all' ? stakeholders.length : stakeholders.filter(s => s.stance === stance).length;
            return (
              <button
                key={stance}
                onClick={() => setStanceFilter(stance)}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-full border transition-colors',
                  stanceFilter === stance
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {stance === 'all' ? 'All' : stanceLabels[stance]} ({count})
              </button>
            );
          })}
        </div>

        {/* Stakeholder grid */}
        <div className="grid gap-3 md:grid-cols-2">
          {filtered
            .sort((a, b) => {
              const inf: Record<InfluenceLevel, number> = { high: 0, medium: 1, low: 2 };
              return inf[a.influence] - inf[b.influence];
            })
            .map(s => (
              <StakeholderCard
                key={s.actor}
                stakeholder={s}
                isSelected={selected?.actor === s.actor}
                onClick={() => setSelected(selected?.actor === s.actor ? null : s)}
              />
            ))}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-[360px] border-l border-border bg-card h-screen overflow-y-auto shrink-0 p-4">
          <h2 className="font-display text-lg font-bold mb-1">{selected.actor}</h2>
          <p className="text-xs text-muted-foreground mb-4">
            {selected.actor_type.replace(/_/g, ' ')} &middot; {selected.jurisdiction}
          </p>

          <div className="space-y-4">
            <div>
              <h3 className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide mb-1">Position</h3>
              <p className="text-sm">{selected.position_summary}</p>
            </div>

            <div>
              <h3 className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide mb-1">Key Actions</h3>
              <p className="text-sm text-muted-foreground">{selected.key_actions}</p>
            </div>

            {selected.key_quote && (
              <div className="bg-accent rounded-lg p-3">
                <Quote size={14} className="text-muted-foreground mb-1" />
                <p className="text-sm italic">&ldquo;{selected.key_quote}&rdquo;</p>
                {selected.quote_date && (
                  <p className="text-xs text-muted-foreground mt-1">{selected.quote_date}</p>
                )}
                {selected.quote_source && <SourceLink citation={selected.quote_source} />}
              </div>
            )}

            <div>
              <h3 className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide mb-1">Motivation</h3>
              <p className="text-sm text-muted-foreground">{selected.motivation}</p>
            </div>

            {selected.related_battlegrounds.length > 0 && (
              <div>
                <h3 className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide mb-1.5">Battlegrounds</h3>
                <div className="flex gap-1.5 flex-wrap">
                  {selected.related_battlegrounds.map(bg => (
                    <span key={bg} className="text-xs bg-accent text-accent-foreground px-1.5 py-0.5 rounded">
                      {bg}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selected.source && (
              <div>
                <SourceLink citation={selected.source} />
              </div>
            )}
          </div>

          <button
            onClick={() => setSelected(null)}
            className="mt-6 text-sm text-muted-foreground hover:text-foreground"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
