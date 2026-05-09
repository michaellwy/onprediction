import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  Citation, Jurisdiction, RegEvent, Battleground, Stakeholder, Platform,
  RegStatus, Direction, Momentum, RiskLevel, OpportunityLevel, JurisdictionLevel,
  EventType, ImpactLevel, EventStatus, ActorType, Stance, InfluenceLevel,
  PlatformAccessStatus, PlatformJurisdictionCell, PlatformMatrix,
  ClassificationEntry, CircuitCase, Deadline, DerivedData, RegulationData
} from '../src/types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const OUT_DIR = path.resolve(__dirname, '../src/data/generated');

// ─── Citation Parser ────────────────────────────────────

function parseCitations(text: string): Citation[] {
  const citations: Citation[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)\s*(?:\((\d{4}(?:-\d{2}(?:-\d{2})?)?)\))?/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    citations.push({
      description: match[1],
      url: match[2] || null,
      date: match[3] || null,
    });
  }
  return citations;
}

function parseFirstCitation(text: string): Citation | null {
  const citations = parseCitations(text);
  return citations.length > 0 ? citations[0] : null;
}

// ─── Markdown Table Parser ──────────────────────────────

function parseMarkdownTable(tableText: string): Record<string, string>[] {
  const lines = tableText.trim().split('\n').filter(l => l.trim().startsWith('|'));
  if (lines.length < 2) return [];

  const parseRow = (line: string): string[] => {
    return line.split('|').slice(1, -1).map(cell => cell.trim());
  };

  const headers = parseRow(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 2; i < lines.length; i++) {
    const cells = parseRow(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] || '';
    });
    rows.push(row);
  }
  return rows;
}

// For jurisdiction tables: Field | Value | Source format
function parseFieldValueTable(tableText: string): Record<string, { value: string; source: string }> {
  const lines = tableText.trim().split('\n').filter(l => l.trim().startsWith('|'));
  if (lines.length < 3) return {};

  const result: Record<string, { value: string; source: string }> = {};
  for (let i = 2; i < lines.length; i++) {
    const cells = lines[i].split('|').slice(1, -1).map(c => c.trim());
    const field = cells[0]?.trim();
    const value = cells[1]?.trim() || '';
    const source = cells[2]?.trim() || '';
    if (field) {
      result[field] = { value, source };
    }
  }
  return result;
}

// ─── Status/Enum Parsers ────────────────────────────────

function parseStatus(raw: string): RegStatus {
  const lower = raw.toLowerCase();
  if (lower.includes('accessible')) return 'Accessible';
  if (lower.includes('restricted')) return 'Restricted';
  if (lower.includes('banned')) return 'Banned';
  if (lower.includes('uncertain')) return 'Uncertain';
  if (lower.includes('unregulated')) return 'Unregulated';
  if (lower.includes('fragmenting')) return 'Uncertain'; // EU case
  return 'Uncertain';
}

function parseDirection(raw: string): Direction {
  const lower = raw.toLowerCase();
  if (lower.includes('liberalizing')) return 'Liberalizing';
  if (lower.includes('tightening')) return 'Tightening';
  if (lower.includes('fragmenting')) return 'Fragmenting';
  if (lower.includes('stalled')) return 'Stalled';
  return 'Stalled';
}

function parseMomentum(raw: string): Momentum {
  const lower = raw.toLowerCase();
  if (lower.includes('fast')) return 'Fast';
  if (lower.includes('slow')) return 'Slow';
  return 'None';
}

function parseRiskLevel(raw: string): RiskLevel {
  const lower = raw.toLowerCase();
  if (lower.includes('critical')) return 'Critical';
  if (lower.includes('high')) return 'High';
  if (lower.includes('medium')) return 'Medium';
  return 'Low';
}

function parseOpportunity(raw: string): OpportunityLevel {
  const lower = raw.toLowerCase();
  if (lower.includes('high')) return 'High';
  if (lower.includes('medium')) return 'Medium';
  if (lower.includes('low')) return 'Low';
  return 'None';
}

function parseLevel(raw: string): JurisdictionLevel {
  const lower = raw.toLowerCase();
  if (lower.includes('federal')) return 'Federal';
  if (lower.includes('state')) return 'State';
  if (lower.includes('supranational')) return 'Supranational';
  if (lower.includes('special')) return 'Special Administrative Region';
  return 'National';
}

function parsePlatformAccess(raw: string): PlatformAccessStatus {
  const lower = raw.toLowerCase();
  if (lower.includes('active') || lower.includes('accessible') || lower.includes('operating')) return 'Active';
  if (lower.includes('blocked') || lower.includes('banned') || lower.includes('enjoined')) return 'Blocked';
  if (lower.includes('contested') || lower.includes('challenged') || lower.includes('scrutiny')) return 'Contested';
  if (lower.includes('pending')) return 'Pending';
  if (!raw || raw === '—' || raw === '-') return 'N/A';
  if (lower.includes('not operating') || lower.includes('not explicitly')) return 'Not Operating';
  if (lower.includes('restricted')) return 'Blocked';
  return 'N/A';
}

// ─── Parse Jurisdictions ────────────────────────────────

function parseJurisdictions(content: string): Jurisdiction[] {
  const blocks = content.split(/\n---\n/).filter(b => b.includes('## '));
  const jurisdictions: Jurisdiction[] = [];

  for (const block of blocks) {
    const headerMatch = block.match(/## ([A-Z]{2}(?:-[A-Z]{2,5})?|US-OTHER|CA-FED)\s*\|\s*(.+)/);
    if (!headerMatch) continue;

    const code = headerMatch[1];
    const name = headerMatch[2].trim();
    const fields = parseFieldValueTable(block);

    const get = (key: string) => fields[key]?.value || '';
    const getSrc = (key: string) => fields[key]?.source || '';

    const platformKeys = ['kalshi', 'polymarket', 'robinhood', 'cme', 'cboe', 'nasdaq', 'local_platforms'];
    const platforms: Record<string, { status: string; parsedStatus: PlatformAccessStatus; source: Citation | null }> = {};
    for (const pk of platformKeys) {
      const val = get(pk);
      platforms[pk] = {
        status: val,
        parsedStatus: parsePlatformAccess(val),
        source: parseFirstCitation(getSrc(pk)),
      };
    }

    const allSources: Citation[] = [];
    for (const key in fields) {
      allSources.push(...parseCitations(fields[key].source));
    }

    jurisdictions.push({
      code,
      name,
      iso_code: get('iso_code'),
      fips_code: get('fips_code') === '—' ? null : get('fips_code') || null,
      level: parseLevel(get('level')),
      status: parseStatus(get('status')),
      statusSource: parseFirstCitation(getSrc('status')),
      classification: get('classification'),
      regulatory_body: get('regulatory_body'),
      licensing_framework: get('licensing_framework') || null,
      key_legislation: get('key_legislation'),
      pending_bills: get('pending_bills') || null,
      active_litigation: get('active_litigation') || null,
      federal_preemption: get('federal_preemption') || null,
      tax_treatment: get('tax_treatment') || null,
      insider_trading_rules: get('insider_trading_rules') || null,
      platforms,
      markets: {
        political: get('political_markets') || null,
        sports: get('sports_markets') || null,
        economic: get('economic_markets') || null,
        crypto: get('crypto_markets') || null,
        death_terrorism: get('death_terrorism_markets') || null,
      },
      direction: parseDirection(get('direction')),
      momentum: parseMomentum(get('momentum')),
      risk_level: parseRiskLevel(get('risk_level')),
      opportunity: parseOpportunity(get('opportunity')),
      summary: get('summary'),
      allSources,
    });
  }

  return jurisdictions;
}

// ─── Parse Events ───────────────────────────────────────

function parseEvents(content: string): RegEvent[] {
  const rows = parseMarkdownTable(content);
  return rows.filter(r => r.date && r.title).map(r => ({
    date: r.date,
    jurisdiction: r.jurisdiction,
    type: r.type as EventType,
    title: r.title,
    description: r.description,
    actors: r.actors,
    impact: (r.impact || 'medium') as ImpactLevel,
    battlegrounds: (r.battleground || '').split(';').map(b => b.trim()).filter(Boolean),
    contagion: r.contagion || '',
    status: (r.status || 'resolved') as EventStatus,
    source: parseFirstCitation(r.source || ''),
  }));
}

// ─── Parse Battlegrounds ────────────────────────────────

function parseBattlegrounds(content: string): Battleground[] {
  const blocks = content.split(/\n---\n/).filter(b => b.includes('## BG-'));
  return blocks.map(block => {
    const headerMatch = block.match(/## (BG-\d+)\s*\|\s*(.+)/);
    if (!headerMatch) return null;

    const rows = parseMarkdownTable(block);
    const fields: Record<string, string> = {};
    for (const row of rows) {
      if (row.Field && row.Value) {
        fields[row.Field] = row.Value;
      }
    }

    return {
      id: headerMatch[1],
      name: headerMatch[2].trim(),
      core_tension: fields.core_tension || '',
      side_a: fields.side_a || '',
      side_b: fields.side_b || '',
      key_cases: fields.key_cases || '',
      current_status: fields.current_status || '',
      trajectory: fields.trajectory || '',
      industry_impact: fields.industry_impact || '',
      resolution_scenarios: fields.resolution_scenarios || '',
    };
  }).filter(Boolean) as Battleground[];
}

// ─── Parse Stakeholders ─────────────────────────────────

function parseStakeholders(content: string): Stakeholder[] {
  const rows = parseMarkdownTable(content);
  return rows.filter(r => r.actor).map(r => ({
    actor: r.actor,
    actor_type: (r.actor_type || 'platform') as ActorType,
    jurisdiction: r.jurisdiction || '',
    position_summary: r.position_summary || '',
    stance: (r.stance || 'neutral') as Stance,
    key_actions: r.key_actions || '',
    key_quote: r.key_quote || null,
    quote_date: r.quote_date || null,
    quote_source: parseFirstCitation(r.quote_source || ''),
    motivation: r.motivation || '',
    influence: (r.influence || 'medium') as InfluenceLevel,
    related_battlegrounds: (r.related_battlegrounds || '').split(',').map(b => b.trim()).filter(Boolean),
    source: parseFirstCitation(r.source || ''),
  }));
}

// ─── Parse Platforms ────────────────────────────────────

function parsePlatforms(content: string): Platform[] {
  const blocks = content.split(/\n---\n/).filter(b => b.match(/## \w/));
  return blocks.map(block => {
    const headerMatch = block.match(/## (.+)/);
    if (!headerMatch) return null;

    const fields = parseFieldValueTable(block);
    const get = (key: string) => fields[key]?.value || '';
    const getSrc = (key: string) => fields[key]?.source || '';

    const allSources: Citation[] = [];
    for (const key in fields) {
      allSources.push(...parseCitations(fields[key].source));
    }

    return {
      name: headerMatch[1].trim(),
      type: get('type'),
      headquarters: get('headquarters') || null,
      founded: get('founded') || null,
      volume: get('volume') || null,
      licenses: get('licenses'),
      jurisdictions_active: get('jurisdictions_active'),
      jurisdictions_blocked: get('jurisdictions_blocked'),
      jurisdictions_contested: get('jurisdictions_contested'),
      market_types: get('market_types'),
      sports_share: get('sports_share') || null,
      integrity_measures: get('integrity_measures') || null,
      regulatory_posture: get('regulatory_posture'),
      active_litigation: get('active_litigation') || null,
      key_people: get('key_people') || null,
      allSources,
    };
  }).filter(Boolean) as Platform[];
}

// ─── Derived Data Computations ──────────────────────────

function computePlatformMatrix(jurisdictions: Jurisdiction[]): PlatformMatrix {
  const platformNames = ['kalshi', 'polymarket', 'robinhood', 'cme', 'cboe', 'nasdaq'];
  const cells: Record<string, Record<string, PlatformJurisdictionCell>> = {};

  for (const pName of platformNames) {
    cells[pName] = {};
    for (const j of jurisdictions) {
      const access = j.platforms[pName];
      if (access) {
        cells[pName][j.code] = {
          status: access.parsedStatus,
          detail: access.status,
          source: access.source,
        };
      }
    }
  }

  return {
    platforms: platformNames,
    jurisdictions: jurisdictions.map(j => j.code),
    cells,
  };
}

function computeClassifications(jurisdictions: Jurisdiction[]): ClassificationEntry[] {
  return jurisdictions
    .filter(j => j.classification && j.classification !== '—')
    .map(j => ({
      jurisdiction: j.name,
      code: j.code,
      classification: j.classification,
    }));
}

function computeCircuitScorecard(jurisdictions: Jurisdiction[]): CircuitCase[] {
  const cases: CircuitCase[] = [];
  const stateToCircuit: Record<string, string> = {
    'US-MA': '1st Circuit',
    'US-NJ': '3rd Circuit',
    'US-MD': '4th Circuit',
    'US-OH': '6th Circuit',
    'US-NV': '9th Circuit',
    'US-WA': '9th Circuit',
    'US-CA': '9th Circuit',
    'US-CT': '2nd Circuit',
    'US-NY': '2nd Circuit',
    'US-IL': '7th Circuit',
    'US-TN': '6th Circuit',
    'US-KY': '6th Circuit',
    'US-FED': 'D.C. Circuit',
  };

  for (const j of jurisdictions) {
    if (!j.federal_preemption || j.federal_preemption === '—' || !j.code.startsWith('US-')) continue;
    const circuit = stateToCircuit[j.code] || 'Unknown';
    const lower = j.federal_preemption.toLowerCase();
    let result: 'upheld' | 'rejected' | 'reversed' | 'pending' = 'pending';
    if (lower.includes('upheld') || lower.includes('sided with kalshi')) result = 'upheld';
    else if (lower.includes('rejected') || lower.includes('denied')) result = 'rejected';
    else if (lower.includes('reversed') || lower.includes('dissolved')) result = 'reversed';

    cases.push({
      jurisdiction: j.code,
      circuit,
      preemption_result: result,
      detail: j.federal_preemption,
    });
  }

  return cases;
}

function computeDeadlines(events: RegEvent[], jurisdictions: Jurisdiction[]): Deadline[] {
  const deadlines: Deadline[] = [];

  // Known hardcoded deadlines from the data
  deadlines.push({
    date: '2026-04-30',
    title: 'CFTC ANPRM comment period closes',
    jurisdiction: 'US-FED',
    type: 'comment_period',
    source: { description: 'CFTC ANPRM', url: 'https://www.cftc.gov/PressRoom/PressReleases/9194-26', date: '2026-03-12' },
  });
  deadlines.push({
    date: '2026-07-01',
    title: 'MiCA CASP grandfathering period ends',
    jurisdiction: 'EU',
    type: 'regulatory',
    source: { description: 'MiCA Regulation', url: 'https://www.esma.europa.eu/esmas-activities/digital-finance-and-innovation/markets-crypto-assets-regulation-mica', date: null },
  });
  deadlines.push({
    date: '2026-07-01',
    title: 'Hawaii HB 2198 — PM ban effective date (if enacted)',
    jurisdiction: 'US-HI',
    type: 'legislation',
    source: { description: 'HI HB 2198', url: 'https://www.capitol.hawaii.gov/session/measure_indiv.aspx?billtype=HB&billnumber=2198&year=2026', date: '2026-03-10' },
  });

  // Pending events as deadlines
  for (const e of events) {
    if (e.status === 'pending') {
      deadlines.push({
        date: e.date,
        title: e.title,
        jurisdiction: e.jurisdiction,
        type: e.type.includes('legislation') ? 'legislation' : e.type.includes('court') ? 'court' : 'regulatory',
        source: e.source,
      });
    }
  }

  return deadlines.sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Main ───────────────────────────────────────────────

function main() {
  console.log('Parsing regulation tracker data...');

  const readFile = (name: string) => fs.readFileSync(path.join(DATA_DIR, name), 'utf-8');

  const jurisdictions = parseJurisdictions(readFile('01-jurisdictions.md'));
  console.log(`  Jurisdictions: ${jurisdictions.length}`);

  const events = parseEvents(readFile('02-events.md'));
  console.log(`  Events: ${events.length}`);

  const battlegrounds = parseBattlegrounds(readFile('03-battlegrounds.md'));
  console.log(`  Battlegrounds: ${battlegrounds.length}`);

  const stakeholders = parseStakeholders(readFile('04-stakeholders.md'));
  console.log(`  Stakeholders: ${stakeholders.length}`);

  const platforms = parsePlatforms(readFile('05-platforms.md'));
  console.log(`  Platforms: ${platforms.length}`);

  // Derived data
  const derived: DerivedData = {
    platformMatrix: computePlatformMatrix(jurisdictions),
    classifications: computeClassifications(jurisdictions),
    circuitScorecard: computeCircuitScorecard(jurisdictions),
    deadlines: computeDeadlines(events, jurisdictions),
  };
  console.log(`  Circuit cases: ${derived.circuitScorecard.length}`);
  console.log(`  Deadlines: ${derived.deadlines.length}`);

  const data: RegulationData = { jurisdictions, events, battlegrounds, stakeholders, platforms, derived };

  // Write output
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'data.json'), JSON.stringify(data, null, 2));
  console.log(`\nWrote ${path.join(OUT_DIR, 'data.json')}`);
}

main();
