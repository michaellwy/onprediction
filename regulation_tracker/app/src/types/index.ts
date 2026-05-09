// ─── Enums ──────────────────────────────────────────────

export type RegStatus = 'Accessible' | 'Restricted' | 'Banned' | 'Uncertain' | 'Unregulated';
export type Direction = 'Liberalizing' | 'Tightening' | 'Stalled' | 'Fragmenting';
export type Momentum = 'Fast' | 'Slow' | 'None';
export type RiskLevel = 'Critical' | 'High' | 'Medium' | 'Low';
export type OpportunityLevel = 'High' | 'Medium' | 'Low' | 'None';
export type JurisdictionLevel = 'Federal' | 'State' | 'National' | 'Supranational' | 'Special Administrative Region';
export type EventType = 'court_ruling' | 'legislation_introduced' | 'legislation_passed' | 'enforcement' | 'regulatory_action' | 'platform_filing' | 'industry_event';
export type ImpactLevel = 'high' | 'medium' | 'low';
export type EventStatus = 'pending' | 'ongoing' | 'resolved';
export type ActorType = 'federal_regulator' | 'state_regulator' | 'legislator' | 'platform' | 'exchange' | 'lobby_pro' | 'lobby_anti' | 'judiciary' | 'academic';
export type Stance = 'pro_pm' | 'anti_pm' | 'mixed' | 'neutral';
export type InfluenceLevel = 'high' | 'medium' | 'low';
export type PlatformAccessStatus = 'Active' | 'Blocked' | 'Contested' | 'Pending' | 'Not Operating' | 'N/A';

// ─── Citation ───────────────────────────────────────────

export interface Citation {
  description: string;
  url: string | null;
  date: string | null;
}

// ─── Jurisdiction ───────────────────────────────────────

export interface PlatformAccess {
  status: string;
  parsedStatus: PlatformAccessStatus;
  source: Citation | null;
}

export interface Jurisdiction {
  code: string;
  name: string;
  iso_code: string;
  fips_code: string | null;
  level: JurisdictionLevel;
  status: RegStatus;
  statusSource: Citation | null;
  classification: string;
  regulatory_body: string;
  licensing_framework: string | null;
  key_legislation: string;
  pending_bills: string | null;
  active_litigation: string | null;
  federal_preemption: string | null;
  tax_treatment: string | null;
  insider_trading_rules: string | null;
  platforms: Record<string, PlatformAccess>;
  markets: {
    political: string | null;
    sports: string | null;
    economic: string | null;
    crypto: string | null;
    death_terrorism: string | null;
  };
  direction: Direction;
  momentum: Momentum;
  risk_level: RiskLevel;
  opportunity: OpportunityLevel;
  summary: string;
  allSources: Citation[];
}

// ─── Event ──────────────────────────────────────────────

export interface RegEvent {
  date: string;
  jurisdiction: string;
  type: EventType;
  title: string;
  description: string;
  actors: string;
  impact: ImpactLevel;
  battlegrounds: string[];
  contagion: string;
  status: EventStatus;
  source: Citation | null;
}

// ─── Battleground ───────────────────────────────────────

export interface Battleground {
  id: string;
  name: string;
  core_tension: string;
  side_a: string;
  side_b: string;
  key_cases: string;
  current_status: string;
  trajectory: string;
  industry_impact: string;
  resolution_scenarios: string;
}

// ─── Stakeholder ────────────────────────────────────────

export interface Stakeholder {
  actor: string;
  actor_type: ActorType;
  jurisdiction: string;
  position_summary: string;
  stance: Stance;
  key_actions: string;
  key_quote: string | null;
  quote_date: string | null;
  quote_source: Citation | null;
  motivation: string;
  influence: InfluenceLevel;
  related_battlegrounds: string[];
  source: Citation | null;
}

// ─── Platform ───────────────────────────────────────────

export interface Platform {
  name: string;
  type: string;
  headquarters: string | null;
  founded: string | null;
  volume: string | null;
  licenses: string;
  jurisdictions_active: string;
  jurisdictions_blocked: string;
  jurisdictions_contested: string;
  market_types: string;
  sports_share: string | null;
  integrity_measures: string | null;
  regulatory_posture: string;
  active_litigation: string | null;
  key_people: string | null;
  allSources: Citation[];
}

// ─── Derived Data ───────────────────────────────────────

export interface PlatformJurisdictionCell {
  status: PlatformAccessStatus;
  detail: string;
  source: Citation | null;
}

export interface PlatformMatrix {
  platforms: string[];
  jurisdictions: string[];
  cells: Record<string, Record<string, PlatformJurisdictionCell>>;
}

export interface ClassificationEntry {
  jurisdiction: string;
  code: string;
  classification: string;
}

export interface CircuitCase {
  jurisdiction: string;
  circuit: string;
  preemption_result: 'upheld' | 'rejected' | 'reversed' | 'pending';
  detail: string;
}

export interface Deadline {
  date: string;
  title: string;
  jurisdiction: string;
  type: 'comment_period' | 'legislation' | 'regulatory' | 'court';
  source: Citation | null;
}

export interface DerivedData {
  platformMatrix: PlatformMatrix;
  classifications: ClassificationEntry[];
  circuitScorecard: CircuitCase[];
  deadlines: Deadline[];
}

// ─── Full Dataset ───────────────────────────────────────

export interface RegulationData {
  jurisdictions: Jurisdiction[];
  events: RegEvent[];
  battlegrounds: Battleground[];
  stakeholders: Stakeholder[];
  platforms: Platform[];
  derived: DerivedData;
}
