import rawData from './generated/data.json';
import type { RegulationData } from '@/types';

export const data = rawData as unknown as RegulationData;

export const { jurisdictions, events, battlegrounds, stakeholders, platforms } = data;
export const { platformMatrix, classifications, circuitScorecard, deadlines } = data.derived;

// Quick lookup maps
export const jurisdictionByCode = new Map(jurisdictions.map(j => [j.code, j]));
export const battlegroundById = new Map(battlegrounds.map(b => [b.id, b]));

// Filtered subsets
export const usJurisdictions = jurisdictions.filter(j => j.code.startsWith('US-'));
export const intlJurisdictions = jurisdictions.filter(j => !j.code.startsWith('US-'));
export const usStates = usJurisdictions.filter(j => j.code !== 'US-FED' && j.code !== 'US-OTHER');
export const usFederal = jurisdictions.find(j => j.code === 'US-FED')!;
