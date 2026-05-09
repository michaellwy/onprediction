import { useState, useMemo } from 'react';
import { jurisdictions, jurisdictionByCode } from '@/data';
import type { Jurisdiction, RegStatus, RiskLevel, OpportunityLevel } from '@/types';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DirectionArrow } from '@/components/shared/DirectionArrow';
import { JurisdictionDetail } from '@/components/shared/JurisdictionDetail';
import { cn } from '@/lib/cn';

const statusColors: Record<RegStatus, string> = {
  Accessible: '#22c55e',
  Restricted: '#f59e0b',
  Banned: '#ef4444',
  Uncertain: '#94a3b8',
  Unregulated: '#cbd5e1',
};

const riskToX: Record<RiskLevel, number> = { Low: 0.15, Medium: 0.4, High: 0.7, Critical: 0.9 };
const oppToY: Record<OpportunityLevel, number> = { None: 0.9, Low: 0.7, Medium: 0.4, High: 0.15 };

export function RiskOpportunityView() {
  const [selected, setSelected] = useState<Jurisdiction | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const plotWidth = 700;
  const plotHeight = 500;
  const pad = { top: 40, right: 30, bottom: 50, left: 50 };
  const innerW = plotWidth - pad.left - pad.right;
  const innerH = plotHeight - pad.top - pad.bottom;

  const points = useMemo(() => {
    return jurisdictions.map(j => ({
      j,
      x: pad.left + riskToX[j.risk_level] * innerW + (Math.random() * 20 - 10),
      y: pad.top + oppToY[j.opportunity] * innerH + (Math.random() * 20 - 10),
    }));
  }, []);

  return (
    <div className="flex h-screen">
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mb-6">
          <h2 className="font-display text-xl font-bold">Risk & Opportunity Matrix</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {jurisdictions.length} jurisdictions mapped by regulatory risk and market opportunity
          </p>
        </div>

        {/* Scatter plot */}
        <div className="bg-card border border-border rounded-lg p-4 inline-block">
          <svg width={plotWidth} height={plotHeight} className="select-none">
            {/* Quadrant backgrounds */}
            <rect x={pad.left} y={pad.top} width={innerW/2} height={innerH/2}
              fill="#f0fdf4" opacity={0.5} />
            <rect x={pad.left + innerW/2} y={pad.top} width={innerW/2} height={innerH/2}
              fill="#fef3c7" opacity={0.4} />
            <rect x={pad.left} y={pad.top + innerH/2} width={innerW/2} height={innerH/2}
              fill="#f1f5f9" opacity={0.5} />
            <rect x={pad.left + innerW/2} y={pad.top + innerH/2} width={innerW/2} height={innerH/2}
              fill="#fef2f2" opacity={0.4} />

            {/* Quadrant labels */}
            <text x={pad.left + innerW * 0.25} y={pad.top + 20} textAnchor="middle"
              className="fill-green-600 text-[11px] font-medium">Safe Harbor</text>
            <text x={pad.left + innerW * 0.75} y={pad.top + 20} textAnchor="middle"
              className="fill-amber-600 text-[11px] font-medium">Frontier</text>
            <text x={pad.left + innerW * 0.25} y={pad.top + innerH - 8} textAnchor="middle"
              className="fill-slate-400 text-[11px] font-medium">Sleeper</text>
            <text x={pad.left + innerW * 0.75} y={pad.top + innerH - 8} textAnchor="middle"
              className="fill-red-400 text-[11px] font-medium">Dead Zone</text>

            {/* Axes */}
            <line x1={pad.left} y1={pad.top + innerH} x2={pad.left + innerW} y2={pad.top + innerH}
              stroke="#e2e8f0" strokeWidth={1} />
            <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + innerH}
              stroke="#e2e8f0" strokeWidth={1} />

            {/* Axis labels */}
            <text x={pad.left + innerW / 2} y={plotHeight - 8} textAnchor="middle"
              className="fill-muted-foreground text-xs">Risk Level &rarr;</text>
            <text x={14} y={pad.top + innerH / 2} textAnchor="middle"
              className="fill-muted-foreground text-xs" transform={`rotate(-90 14 ${pad.top + innerH / 2})`}>
              &larr; Opportunity
            </text>

            {/* Risk tick labels */}
            {(['Low', 'Medium', 'High', 'Critical'] as RiskLevel[]).map(level => (
              <text key={level} x={pad.left + riskToX[level] * innerW} y={pad.top + innerH + 16}
                textAnchor="middle" className="fill-muted-foreground text-[10px]">{level}</text>
            ))}

            {/* Opportunity tick labels */}
            {(['None', 'Low', 'Medium', 'High'] as OpportunityLevel[]).map(level => (
              <text key={level} x={pad.left - 8} y={pad.top + oppToY[level] * innerH + 3}
                textAnchor="end" className="fill-muted-foreground text-[10px]">{level}</text>
            ))}

            {/* Data points */}
            {points.map(({ j, x, y }) => (
              <g key={j.code}
                onClick={() => setSelected(j)}
                onMouseEnter={() => setHovered(j.code)}
                onMouseLeave={() => setHovered(null)}
                className="cursor-pointer"
              >
                <circle
                  cx={x} cy={y} r={hovered === j.code ? 8 : 6}
                  fill={statusColors[j.status]}
                  stroke="#fff" strokeWidth={1.5}
                  opacity={hovered && hovered !== j.code ? 0.4 : 0.85}
                  style={{ transition: 'all 0.15s ease' }}
                />
                {(hovered === j.code) && (
                  <text x={x} y={y - 12} textAnchor="middle"
                    className="fill-foreground text-[11px] font-medium pointer-events-none">
                    {j.code}
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>

        {/* Status legend */}
        <div className="flex items-center gap-4 mt-4 flex-wrap">
          {(Object.entries(statusColors) as [RegStatus, string][]).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs text-muted-foreground">{status}</span>
            </div>
          ))}
        </div>

        {/* Table view */}
        <div className="mt-8">
          <h3 className="text-sm font-semibold mb-3">All Jurisdictions</h3>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-left">
                  <th className="px-3 py-2 font-medium text-xs">Jurisdiction</th>
                  <th className="px-3 py-2 font-medium text-xs">Status</th>
                  <th className="px-3 py-2 font-medium text-xs">Direction</th>
                  <th className="px-3 py-2 font-medium text-xs">Risk</th>
                  <th className="px-3 py-2 font-medium text-xs">Opportunity</th>
                </tr>
              </thead>
              <tbody>
                {jurisdictions
                  .sort((a, b) => {
                    const riskOrder: Record<RiskLevel, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
                    return riskOrder[a.risk_level] - riskOrder[b.risk_level];
                  })
                  .map(j => (
                  <tr key={j.code}
                    onClick={() => setSelected(j)}
                    className={cn(
                      'border-t border-border hover:bg-accent cursor-pointer transition-colors',
                      selected?.code === j.code && 'bg-primary/5',
                    )}
                  >
                    <td className="px-3 py-2">
                      <span className="font-medium">{j.name}</span>
                      <span className="text-muted-foreground ml-1.5 text-xs">{j.code}</span>
                    </td>
                    <td className="px-3 py-2"><StatusBadge status={j.status} size="xs" /></td>
                    <td className="px-3 py-2"><DirectionArrow direction={j.direction} showLabel size={12} /></td>
                    <td className="px-3 py-2">
                      <span className={cn(
                        'text-xs font-medium',
                        j.risk_level === 'Critical' ? 'text-red-600' :
                        j.risk_level === 'High' ? 'text-orange-600' :
                        j.risk_level === 'Medium' ? 'text-amber-600' : 'text-green-600'
                      )}>{j.risk_level}</span>
                    </td>
                    <td className="px-3 py-2 text-xs">{j.opportunity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selected && (
        <JurisdictionDetail jurisdiction={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
