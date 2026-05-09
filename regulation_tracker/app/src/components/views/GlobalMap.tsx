import { useState, useMemo } from 'react';
import {
  ComposableMap, Geographies, Geography, ZoomableGroup,
} from 'react-simple-maps';
import { jurisdictions, jurisdictionByCode, usStates } from '@/data';
import type { Jurisdiction, RegStatus } from '@/types';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DirectionArrow } from '@/components/shared/DirectionArrow';
import { MomentumDot } from '@/components/shared/MomentumDot';
import { JurisdictionDetail } from '@/components/shared/JurisdictionDetail';

const WORLD_GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
const US_GEO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

const statusColors: Record<RegStatus, string> = {
  Accessible: '#22c55e',
  Restricted: '#f59e0b',
  Banned: '#ef4444',
  Uncertain: '#94a3b8',
  Unregulated: '#cbd5e1',
};

// Map ISO alpha-2 codes to ISO numeric-3 codes used by Natural Earth topojson
const isoToNumeric: Record<string, string> = {
  US: '840', GB: '826', DE: '276', FR: '250', ES: '724', NL: '528', IE: '372',
  PL: '616', SG: '702', AU: '036', JP: '392', KR: '410', CN: '156', UA: '804',
  HK: '344', CA: '124', BR: '076', IN: '356', AE: '784', AR: '032', TW: '158',
  NG: '566',
};

// FIPS code to state name for tooltip (US map)
const fipsToJurisdiction: Record<string, string> = {
  '25': 'US-MA', '24': 'US-MD', '53': 'US-WA', '32': 'US-NV', '34': 'US-NJ',
  '21': 'US-KY', '15': 'US-HI', '36': 'US-NY', '06': 'US-CA', '09': 'US-CT',
  '47': 'US-TN', '39': 'US-OH', '17': 'US-IL', '19': 'US-IA',
};

function getWorldJurisdictionForGeo(geoId: string): Jurisdiction | undefined {
  // World topojson uses numeric ISO codes
  for (const [iso, numeric] of Object.entries(isoToNumeric)) {
    if (geoId === numeric) {
      // Special cases
      if (iso === 'CA') return jurisdictionByCode.get('CA-FED');
      return jurisdictionByCode.get(iso);
    }
  }
  // US as a whole at world level
  if (geoId === '840') return jurisdictionByCode.get('US-FED');
  return undefined;
}

function getUSJurisdictionForGeo(fipsId: string): Jurisdiction | undefined {
  const code = fipsToJurisdiction[fipsId];
  if (code) return jurisdictionByCode.get(code);
  return jurisdictionByCode.get('US-OTHER');
}

interface MapTooltipData {
  x: number;
  y: number;
  jurisdiction: Jurisdiction;
}

export function GlobalMapView() {
  const [showUS, setShowUS] = useState(false);
  const [selected, setSelected] = useState<Jurisdiction | null>(null);
  const [tooltip, setTooltip] = useState<MapTooltipData | null>(null);

  const stats = useMemo(() => {
    const counts: Record<RegStatus, number> = { Accessible: 0, Restricted: 0, Banned: 0, Uncertain: 0, Unregulated: 0 };
    jurisdictions.forEach(j => { counts[j.status]++; });
    return counts;
  }, []);

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-bold">
                {showUS ? 'United States — State-by-State' : 'Global Regulatory Map'}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {showUS
                  ? `${usStates.length} states tracked — click a state for details`
                  : 'Click a country for details. Click the US to see state-level data.'
                }
              </p>
            </div>
            {showUS && (
              <button
                onClick={() => setShowUS(false)}
                className="text-sm text-secondary hover:text-primary transition-colors"
              >
                &larr; Back to World
              </button>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {(Object.entries(statusColors) as [RegStatus, string][]).map(([status, color]) => (
              <div key={status} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                <span className="text-xs text-muted-foreground">{status} ({stats[status]})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative bg-slate-50">
          {!showUS ? (
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ scale: 130, center: [10, 20] }}
              style={{ width: '100%', height: '100%' }}
            >
              <ZoomableGroup>
                <Geographies geography={WORLD_GEO_URL}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const j = getWorldJurisdictionForGeo(geo.id);
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
                            hover: { outline: 'none', fill: j ? `${fill}cc` : '#d1d5db', cursor: j ? 'pointer' : 'default' },
                            pressed: { outline: 'none' },
                          }}
                          onClick={() => {
                            if (geo.id === '840') {
                              setShowUS(true);
                            } else if (j) {
                              setSelected(j);
                            }
                          }}
                          onMouseEnter={(evt) => {
                            if (j) {
                              setTooltip({ x: evt.clientX, y: evt.clientY, jurisdiction: j });
                            }
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        />
                      );
                    })
                  }
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>
          ) : (
            <ComposableMap
              projection="geoAlbersUsa"
              projectionConfig={{ scale: 900 }}
              style={{ width: '100%', height: '100%' }}
            >
              <Geographies geography={US_GEO_URL}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const fips = geo.id;
                    const j = getUSJurisdictionForGeo(fips);
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
                          hover: { outline: 'none', fill: `${fill}cc`, cursor: 'pointer' },
                          pressed: { outline: 'none' },
                        }}
                        onClick={() => j && setSelected(j)}
                        onMouseEnter={(evt) => {
                          if (j) {
                            setTooltip({ x: evt.clientX, y: evt.clientY, jurisdiction: j });
                          }
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    );
                  })
                }
              </Geographies>
            </ComposableMap>
          )}

          {/* Floating tooltip */}
          {tooltip && (
            <div
              className="fixed z-50 pointer-events-none bg-card border border-border rounded-lg shadow-lg px-3 py-2.5 max-w-[280px]"
              style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{tooltip.jurisdiction.name}</span>
                <StatusBadge status={tooltip.jurisdiction.status} size="xs" />
              </div>
              <div className="flex items-center gap-3 mb-1.5">
                <DirectionArrow direction={tooltip.jurisdiction.direction} showLabel size={12} />
                <MomentumDot momentum={tooltip.jurisdiction.momentum} />
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{tooltip.jurisdiction.summary}</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <JurisdictionDetail
          jurisdiction={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
