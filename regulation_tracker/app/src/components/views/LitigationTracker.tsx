import { useState, useMemo } from 'react';
import { events, circuitScorecard, jurisdictions } from '@/data';
import type { RegEvent } from '@/types';
import { cn } from '@/lib/cn';
import { ImpactBadge } from '@/components/shared/ImpactBadge';
import { SourceLink } from '@/components/shared/SourceLink';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Check, X, ArrowRight, Clock } from 'lucide-react';

type Tab = 'cases' | 'bills' | 'rulings' | 'scorecard';

const preemptionIcon: Record<string, typeof Check> = {
  upheld: Check,
  rejected: X,
  reversed: ArrowRight,
  pending: Clock,
};

const preemptionColor: Record<string, string> = {
  upheld: 'text-green-600 bg-green-50',
  rejected: 'text-red-600 bg-red-50',
  reversed: 'text-amber-600 bg-amber-50',
  pending: 'text-slate-500 bg-slate-50',
};

export function LitigationTrackerView() {
  const [tab, setTab] = useState<Tab>('scorecard');

  const courtRulings = useMemo(
    () => events.filter(e => e.type === 'court_ruling'),
    []
  );
  const bills = useMemo(
    () => events.filter(e => e.type === 'legislation_introduced' || e.type === 'legislation_passed'),
    []
  );
  const enforcementActions = useMemo(
    () => events.filter(e => e.type === 'enforcement'),
    []
  );

  // Get active litigation from jurisdictions
  const activeLitigation = useMemo(() => {
    return jurisdictions
      .filter(j => j.active_litigation)
      .map(j => ({
        jurisdiction: j.code,
        name: j.name,
        status: j.status,
        litigation: j.active_litigation!,
        preemption: j.federal_preemption,
      }));
  }, []);

  // Group circuit scorecard by circuit
  const circuitGroups = useMemo(() => {
    const groups: Record<string, typeof circuitScorecard> = {};
    for (const c of circuitScorecard) {
      if (!groups[c.circuit]) groups[c.circuit] = [];
      groups[c.circuit].push(c);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, []);

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'scorecard', label: 'Circuit Scorecard', count: circuitScorecard.length },
    { id: 'cases', label: 'Active Litigation', count: activeLitigation.length },
    { id: 'bills', label: 'Pending Bills', count: bills.length },
    { id: 'rulings', label: 'Court Rulings', count: courtRulings.length },
  ];

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="font-display text-xl font-bold">Litigation & Legislation</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Court cases, pending bills, and the federal preemption scorecard
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              tab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
            <span className="ml-1.5 text-xs text-muted-foreground">({t.count})</span>
          </button>
        ))}
      </div>

      {/* Circuit Scorecard */}
      {tab === 'scorecard' && (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Federal preemption rulings by circuit. The split across circuits may force Supreme Court review.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {circuitGroups.map(([circuit, cases]) => (
              <div key={circuit} className="border border-border rounded-lg p-4 bg-card">
                <h3 className="font-semibold text-sm mb-3">{circuit}</h3>
                <div className="space-y-2">
                  {cases.map(c => {
                    const Icon = preemptionIcon[c.preemption_result];
                    return (
                      <div key={c.jurisdiction} className="flex items-start gap-2">
                        <span className={cn(
                          'inline-flex items-center justify-center w-6 h-6 rounded-full shrink-0',
                          preemptionColor[c.preemption_result],
                        )}>
                          <Icon size={12} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{c.jurisdiction}</span>
                            <span className={cn(
                              'text-[10px] font-semibold uppercase',
                              c.preemption_result === 'upheld' ? 'text-green-600' :
                              c.preemption_result === 'rejected' ? 'text-red-600' :
                              c.preemption_result === 'reversed' ? 'text-amber-600' : 'text-slate-500',
                            )}>
                              {c.preemption_result}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.detail}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Summary stats */}
          <div className="mt-6 flex gap-4">
            {(['upheld', 'rejected', 'reversed', 'pending'] as const).map(result => {
              const count = circuitScorecard.filter(c => c.preemption_result === result).length;
              const Icon = preemptionIcon[result];
              return (
                <div key={result} className={cn('flex items-center gap-2 px-3 py-2 rounded-lg', preemptionColor[result])}>
                  <Icon size={14} />
                  <span className="text-sm font-medium capitalize">{result}: {count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Litigation */}
      {tab === 'cases' && (
        <div className="space-y-3">
          {activeLitigation.map(item => (
            <div key={item.jurisdiction} className="border border-border rounded-lg p-4 bg-card">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-sm">{item.name}</span>
                <span className="text-xs text-muted-foreground">{item.jurisdiction}</span>
                <StatusBadge status={item.status} size="xs" />
              </div>
              <p className="text-sm text-muted-foreground">{item.litigation}</p>
              {item.preemption && (
                <p className="text-sm mt-2">
                  <span className="font-medium text-xs uppercase text-muted-foreground">Preemption: </span>
                  {item.preemption}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pending Bills */}
      {tab === 'bills' && (
        <div className="space-y-3">
          {bills.map((e, i) => (
            <EventCard key={i} event={e} />
          ))}
        </div>
      )}

      {/* Court Rulings */}
      {tab === 'rulings' && (
        <div className="space-y-3">
          {courtRulings.map((e, i) => (
            <EventCard key={i} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ event }: { event: RegEvent }) {
  return (
    <div className="border border-border rounded-lg p-4 bg-card">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h3 className="font-medium text-sm">{event.title}</h3>
        <ImpactBadge level={event.impact} />
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className="font-mono text-[11px] text-muted-foreground">{event.date}</span>
        <span className="text-[10px] text-muted-foreground uppercase">{event.jurisdiction}</span>
        <span className={cn(
          'text-[10px] px-1.5 py-0.5 rounded',
          event.status === 'pending' ? 'bg-amber-100 text-amber-700' :
          event.status === 'ongoing' ? 'bg-blue-100 text-blue-700' :
          'bg-green-100 text-green-700',
        )}>
          {event.status}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{event.description}</p>
      {event.source && (
        <div className="mt-2">
          <SourceLink citation={event.source} />
        </div>
      )}
    </div>
  );
}
