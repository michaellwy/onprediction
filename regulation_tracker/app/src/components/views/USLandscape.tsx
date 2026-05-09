import { useState, useMemo } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { usFederal, usStates, circuitScorecard, events, jurisdictionByCode } from '@/data';
import type { Jurisdiction, RegStatus } from '@/types';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DirectionArrow } from '@/components/shared/DirectionArrow';
import { MomentumDot } from '@/components/shared/MomentumDot';
import { RiskBadge } from '@/components/shared/RiskBadge';
import { SourceLink } from '@/components/shared/SourceLink';
import { JurisdictionDetail } from '@/components/shared/JurisdictionDetail';
import { cn } from '@/lib/cn';
import { Check, X, ArrowRight, Clock } from 'lucide-react';

const US_GEO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

const statusColors: Record<RegStatus, string> = {
  Accessible: '#22c55e',
  Restricted: '#f59e0b',
  Banned: '#ef4444',
  Uncertain: '#94a3b8',
  Unregulated: '#cbd5e1',
};

const fipsToJurisdiction: Record<string, string> = {
  '25': 'US-MA', '24': 'US-MD', '53': 'US-WA', '32': 'US-NV', '34': 'US-NJ',
  '21': 'US-KY', '15': 'US-HI', '36': 'US-NY', '06': 'US-CA', '09': 'US-CT',
  '47': 'US-TN', '39': 'US-OH', '17': 'US-IL', '19': 'US-IA',
};

const preemptionColor: Record<string, string> = {
  upheld: 'text-green-600',
  rejected: 'text-red-600',
  reversed: 'text-amber-600',
  pending: 'text-slate-500',
};

export function USLandscapeView() {
  const [selected, setSelected] = useState<Jurisdiction | null>(null);

  const usEvents = useMemo(
    () => events.filter(e => e.jurisdiction.startsWith('US-')).slice(0, 10),
    []
  );

  return (
    <div className="flex h-screen">
      <div className="flex-1 overflow-y-auto">
        {/* Federal banner */}
        <div className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-display text-xl font-bold">US Regulatory Landscape</h2>
            <StatusBadge status={usFederal.status} />
            <DirectionArrow direction={usFederal.direction} showLabel />
            <MomentumDot momentum={usFederal.momentum} />
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            {usFederal.summary}
          </p>
          <div className="flex items-center gap-4 mt-2">
            {usFederal.statusSource && <SourceLink citation={usFederal.statusSource} />}
          </div>
        </div>

        <div className="px-6 py-6">
          {/* Map + Circuit Scorecard side by side */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* State Map */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b border-border bg-muted">
                <h3 className="text-sm font-semibold">State-by-State Status</h3>
              </div>
              <div className="p-2">
                <ComposableMap
                  projection="geoAlbersUsa"
                  projectionConfig={{ scale: 800 }}
                  style={{ width: '100%', height: '300px' }}
                >
                  <Geographies geography={US_GEO_URL}>
                    {({ geographies }) =>
                      geographies.map((geo) => {
                        const code = fipsToJurisdiction[geo.id];
                        const j = code ? jurisdictionByCode.get(code) : jurisdictionByCode.get('US-OTHER');
                        const fill = j ? statusColors[j.status] : '#e2e8f0';
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={fill}
                            stroke="#fff"
                            strokeWidth={0.5}
                            style={{
                              default: { outline: 'none' },
                              hover: { outline: 'none', fill: `${fill}cc`, cursor: j ? 'pointer' : 'default' },
                              pressed: { outline: 'none' },
                            }}
                            onClick={() => j && j.code !== 'US-OTHER' && setSelected(j)}
                          />
                        );
                      })
                    }
                  </Geographies>
                </ComposableMap>
              </div>
              {/* Legend */}
              <div className="px-4 py-2 border-t border-border flex gap-3 flex-wrap">
                {(Object.entries(statusColors) as [RegStatus, string][]).map(([status, color]) => (
                  <div key={status} className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                    <span className="text-[10px] text-muted-foreground">{status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Circuit Scorecard */}
            <div className="bg-card border border-border rounded-lg">
              <div className="px-4 py-2 border-b border-border bg-muted">
                <h3 className="text-sm font-semibold">Federal Preemption — Circuit Split</h3>
              </div>
              <div className="p-4 space-y-3">
                {circuitScorecard.map(c => {
                  const Icon = c.preemption_result === 'upheld' ? Check :
                    c.preemption_result === 'rejected' ? X :
                    c.preemption_result === 'reversed' ? ArrowRight : Clock;
                  return (
                    <div key={c.jurisdiction} className="flex items-center gap-3">
                      <Icon size={14} className={preemptionColor[c.preemption_result]} />
                      <span className="font-medium text-sm w-20">{c.jurisdiction}</span>
                      <span className="text-xs text-muted-foreground">{c.circuit}</span>
                      <span className={cn(
                        'text-[10px] font-semibold uppercase ml-auto',
                        preemptionColor[c.preemption_result],
                      )}>
                        {c.preemption_result}
                      </span>
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                  Split across circuits may force Supreme Court review within 12-24 months.
                </p>
              </div>
            </div>
          </div>

          {/* State cards */}
          <h3 className="text-sm font-semibold mb-3">States with Active Regulation ({usStates.length})</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
            {usStates.map(j => (
              <div
                key={j.code}
                onClick={() => setSelected(j)}
                className={cn(
                  'border rounded-lg p-3 bg-card cursor-pointer hover:shadow-sm transition-all',
                  selected?.code === j.code ? 'ring-2 ring-primary border-primary/30' : 'border-border',
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">{j.name}</span>
                  <StatusBadge status={j.status} size="xs" />
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <DirectionArrow direction={j.direction} size={12} />
                  <MomentumDot momentum={j.momentum} />
                  <RiskBadge level={j.risk_level} />
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{j.summary}</p>
              </div>
            ))}
          </div>

          {/* Recent US Events */}
          <h3 className="text-sm font-semibold mb-3">Recent US Events</h3>
          <div className="space-y-2">
            {usEvents.map((e, i) => (
              <div key={i} className="flex items-start gap-3 text-sm border-b border-border pb-2">
                <span className="font-mono text-[11px] text-muted-foreground w-24 shrink-0">{e.date}</span>
                <span className="text-[10px] uppercase text-muted-foreground w-16 shrink-0">{e.jurisdiction}</span>
                <span className="flex-1">{e.title}</span>
                {e.source && <SourceLink citation={e.source} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {selected && (
        <JurisdictionDetail jurisdiction={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
