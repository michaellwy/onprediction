import { useState } from 'react';
import { platforms, platformMatrix, jurisdictions } from '@/data';
import type { PlatformAccessStatus, Platform as PlatformType } from '@/types';
import { cn } from '@/lib/cn';
import { SourceLink } from '@/components/shared/SourceLink';
import { ExternalLink } from 'lucide-react';

const accessColors: Record<PlatformAccessStatus, string> = {
  Active: 'bg-green-500',
  Blocked: 'bg-red-500',
  Contested: 'bg-amber-500',
  Pending: 'bg-blue-400',
  'Not Operating': 'bg-slate-300',
  'N/A': 'bg-slate-200',
};

const accessLabels: Record<PlatformAccessStatus, string> = {
  Active: 'Active',
  Blocked: 'Blocked',
  Contested: 'Contested',
  Pending: 'Pending',
  'Not Operating': 'Not Operating',
  'N/A': '—',
};

function PlatformCard({ platform }: { platform: PlatformType }) {
  return (
    <div className="border border-border rounded-lg bg-card p-4">
      <h3 className="font-semibold text-base mb-1">{platform.name}</h3>
      <p className="text-xs text-muted-foreground mb-3">{platform.type}</p>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {platform.headquarters && (
          <div>
            <span className="text-[10px] uppercase text-muted-foreground font-medium block">HQ</span>
            <span>{platform.headquarters}</span>
          </div>
        )}
        {platform.volume && (
          <div>
            <span className="text-[10px] uppercase text-muted-foreground font-medium block">Volume</span>
            <span>{platform.volume}</span>
          </div>
        )}
        {platform.sports_share && (
          <div>
            <span className="text-[10px] uppercase text-muted-foreground font-medium block">Sports Share</span>
            <span>{platform.sports_share}</span>
          </div>
        )}
        {platform.key_people && (
          <div>
            <span className="text-[10px] uppercase text-muted-foreground font-medium block">Key People</span>
            <span>{platform.key_people}</span>
          </div>
        )}
      </div>

      {platform.regulatory_posture && (
        <div className="mt-3">
          <span className="text-[10px] uppercase text-muted-foreground font-medium block mb-0.5">Regulatory Posture</span>
          <p className="text-sm text-muted-foreground">{platform.regulatory_posture}</p>
        </div>
      )}

      {platform.integrity_measures && (
        <div className="mt-2">
          <span className="text-[10px] uppercase text-muted-foreground font-medium block mb-0.5">Integrity</span>
          <p className="text-sm text-muted-foreground">{platform.integrity_measures}</p>
        </div>
      )}

      {platform.allSources.length > 0 && (
        <div className="mt-3 flex gap-2 flex-wrap">
          {platform.allSources.filter(s => s.url).slice(0, 3).map((s, i) => (
            <SourceLink key={i} citation={s} />
          ))}
        </div>
      )}
    </div>
  );
}

export function PlatformComparisonView() {
  const [hoveredCell, setHoveredCell] = useState<{ platform: string; jurisdiction: string } | null>(null);

  const matrixPlatforms = platformMatrix.platforms;
  // Only show jurisdictions that have at least one non-N/A entry
  const matrixJurisdictions = platformMatrix.jurisdictions.filter(jCode => {
    return matrixPlatforms.some(p => {
      const cell = platformMatrix.cells[p]?.[jCode];
      return cell && cell.status !== 'N/A';
    });
  });

  return (
    <div className="px-6 py-6 overflow-x-auto">
      <div className="mb-6">
        <h2 className="font-display text-xl font-bold">Platform Comparison</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {platforms.length} platforms across {matrixJurisdictions.length} jurisdictions with regulatory activity
        </p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        {(Object.entries(accessColors) as [PlatformAccessStatus, string][])
          .filter(([status]) => status !== 'N/A')
          .map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={cn('w-3 h-3 rounded-sm', color)} />
            <span className="text-xs text-muted-foreground">{status}</span>
          </div>
        ))}
      </div>

      {/* Matrix */}
      <div className="border border-border rounded-lg overflow-x-auto bg-card">
        <table className="text-sm w-full">
          <thead>
            <tr className="bg-muted">
              <th className="px-3 py-2 text-left text-xs font-medium sticky left-0 bg-muted z-10 min-w-[100px]">
                Platform
              </th>
              {matrixJurisdictions.map(jCode => (
                <th key={jCode} className="px-2 py-2 text-center text-[10px] font-medium min-w-[60px]">
                  {jCode}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrixPlatforms.map(pName => (
              <tr key={pName} className="border-t border-border">
                <td className="px-3 py-2 font-medium capitalize sticky left-0 bg-card z-10">
                  {pName}
                </td>
                {matrixJurisdictions.map(jCode => {
                  const cell = platformMatrix.cells[pName]?.[jCode];
                  const status = cell?.status || 'N/A';
                  const isHovered = hoveredCell?.platform === pName && hoveredCell?.jurisdiction === jCode;
                  return (
                    <td
                      key={jCode}
                      className="px-2 py-2 text-center relative"
                      onMouseEnter={() => setHoveredCell({ platform: pName, jurisdiction: jCode })}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      <span
                        className={cn(
                          'inline-block w-4 h-4 rounded-sm cursor-help',
                          accessColors[status],
                        )}
                        title={`${pName} in ${jCode}: ${cell?.detail || status}`}
                      />
                      {isHovered && cell && cell.status !== 'N/A' && (
                        <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-1 bg-card border border-border rounded shadow-lg p-2 min-w-[200px] text-left">
                          <p className="text-xs font-medium mb-1">{pName} in {jCode}</p>
                          <p className="text-[11px] text-muted-foreground">{cell.detail}</p>
                          {cell.source && (
                            <div className="mt-1">
                              <SourceLink citation={cell.source} />
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Platform Cards */}
      <h3 className="text-sm font-semibold mt-8 mb-4">Platform Profiles</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {platforms.map(p => (
          <PlatformCard key={p.name} platform={p} />
        ))}
      </div>
    </div>
  );
}
