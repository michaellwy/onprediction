import { useState, useMemo } from 'react';
import {
  Gavel, FileText, Shield, Building2, Landmark, Users, AlertTriangle, Calendar,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { events, deadlines, jurisdictionByCode } from '@/data';
import type { RegEvent, EventType, ImpactLevel } from '@/types';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ImpactBadge } from '@/components/shared/ImpactBadge';
import { SourceLink } from '@/components/shared/SourceLink';

const typeIcons: Record<EventType, typeof Gavel> = {
  court_ruling: Gavel,
  legislation_introduced: FileText,
  legislation_passed: Landmark,
  enforcement: Shield,
  regulatory_action: Building2,
  platform_filing: FileText,
  industry_event: Users,
};

const typeLabels: Record<EventType, string> = {
  court_ruling: 'Court Ruling',
  legislation_introduced: 'Bill Introduced',
  legislation_passed: 'Legislation Passed',
  enforcement: 'Enforcement',
  regulatory_action: 'Regulatory Action',
  platform_filing: 'Platform Filing',
  industry_event: 'Industry Event',
};

const typeColors: Record<EventType, string> = {
  court_ruling: 'border-purple-400 bg-purple-50',
  legislation_introduced: 'border-blue-400 bg-blue-50',
  legislation_passed: 'border-indigo-400 bg-indigo-50',
  enforcement: 'border-red-400 bg-red-50',
  regulatory_action: 'border-amber-400 bg-amber-50',
  platform_filing: 'border-green-400 bg-green-50',
  industry_event: 'border-slate-300 bg-slate-50',
};

type FilterKey = EventType | 'all';
type ImpactFilter = ImpactLevel | 'all';

export function TimelineView() {
  const [typeFilter, setTypeFilter] = useState<FilterKey>('all');
  const [impactFilter, setImpactFilter] = useState<ImpactFilter>('all');
  const [jurisdictionFilter, setJurisdictionFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    return events.filter(e => {
      if (typeFilter !== 'all' && e.type !== typeFilter) return false;
      if (impactFilter !== 'all' && e.impact !== impactFilter) return false;
      if (jurisdictionFilter !== 'all' && e.jurisdiction !== jurisdictionFilter) return false;
      return true;
    });
  }, [typeFilter, impactFilter, jurisdictionFilter]);

  const eventJurisdictions = useMemo(() => {
    const unique = [...new Set(events.map(e => e.jurisdiction))];
    return unique.sort();
  }, []);

  const upcomingDeadlines = useMemo(() => {
    return deadlines.filter(d => d.date >= '2026-03-31').slice(0, 5);
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-display text-xl font-bold">Regulatory Timeline</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {events.length} events tracking prediction market regulation (2020-2026)
        </p>
      </div>

      {/* Upcoming Deadlines */}
      {upcomingDeadlines.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800">Upcoming Deadlines</h3>
          </div>
          <div className="space-y-1.5">
            {upcomingDeadlines.map((d, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="font-mono text-xs text-amber-700 w-24 shrink-0">{d.date}</span>
                <span className="text-amber-900">{d.title}</span>
                <span className="text-[10px] text-amber-600 uppercase">{d.jurisdiction}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as FilterKey)}
          className="text-sm border border-border rounded-md px-2 py-1.5 bg-card"
        >
          <option value="all">All types</option>
          {Object.entries(typeLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <select
          value={impactFilter}
          onChange={(e) => setImpactFilter(e.target.value as ImpactFilter)}
          className="text-sm border border-border rounded-md px-2 py-1.5 bg-card"
        >
          <option value="all">All impact</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={jurisdictionFilter}
          onChange={(e) => setJurisdictionFilter(e.target.value)}
          className="text-sm border border-border rounded-md px-2 py-1.5 bg-card"
        >
          <option value="all">All jurisdictions</option>
          {eventJurisdictions.map(j => (
            <option key={j} value={j}>{j}</option>
          ))}
        </select>

        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} of {events.length} events
        </span>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

        <div className="space-y-4">
          {filtered.map((event, i) => {
            const Icon = typeIcons[event.type] || FileText;
            const j = jurisdictionByCode.get(event.jurisdiction);
            return (
              <div
                key={i}
                className={cn(
                  'relative pl-14 animate-fade-in',
                )}
                style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
              >
                {/* Dot on timeline */}
                <div className={cn(
                  'absolute left-4 top-3 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-card',
                  event.impact === 'high' ? 'border-red-400' : event.impact === 'medium' ? 'border-amber-400' : 'border-slate-300',
                )}>
                  <Icon size={10} className="text-muted-foreground" />
                </div>

                {/* Card */}
                <div className={cn(
                  'border-l-2 rounded-lg p-4 bg-card border border-border',
                  typeColors[event.type],
                )}>
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <h3 className="font-medium text-sm leading-snug">{event.title}</h3>
                    <ImpactBadge level={event.impact} />
                  </div>

                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-mono text-[11px] text-muted-foreground">{event.date}</span>
                    {j && <StatusBadge status={j.status} size="xs" />}
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{event.jurisdiction}</span>
                    <span className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded',
                      event.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      event.status === 'ongoing' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700',
                    )}>
                      {event.status}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                    {event.description}
                  </p>

                  {event.actors && (
                    <p className="text-xs text-muted-foreground mb-1">
                      <span className="font-medium">Actors:</span> {event.actors}
                    </p>
                  )}

                  {event.battlegrounds.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mb-1.5">
                      {event.battlegrounds.map((bg, bi) => (
                        <span key={bi} className="text-[10px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded">
                          {bg}
                        </span>
                      ))}
                    </div>
                  )}

                  {event.contagion && (
                    <p className="text-xs text-muted-foreground italic">
                      {event.contagion}
                    </p>
                  )}

                  {event.source && (
                    <div className="mt-2">
                      <SourceLink citation={event.source} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
