// Core connection data types

export interface Connection {
  id: string;
  name: string;
  title: string;
  company: string;
  industry: string;
  email?: string;
  phone?: string;
  linkedIn?: string;
  lastContactDate: Date;
  notes?: string;
  avatar?: string;
  // Connection degree: 1 = direct, 2 = friend of friend, 3 = third degree
  degree: 1 | 2 | 3;
  // ID of the 1st-degree connection this person is connected through (for 2nd/3rd degree)
  connectedThrough?: string;
}

export type HeatStatus = 'hot' | 'warm' | 'cold';

export interface ConnectionNode extends Connection {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  heatStatus: HeatStatus;
}

export interface ConnectionLink {
  source: string;
  target: string;
}

export interface FilterState {
  industries: string[];
  heatStatuses: HeatStatus[];
  searchQuery: string;
  maxDegree: 1 | 2 | 3 | null; // null = show all, 1/2/3 = show up to that degree
}

// Graph simulation types for D3
export interface SimulationNode {
  id: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

// Industry options for filtering
export const INDUSTRIES = [
  'Technology',
  'Finance',
  'Healthcare',
  'Marketing',
  'Sales',
  'Engineering',
  'Design',
  'Consulting',
  'Real Estate',
  'Legal',
  'Education',
  'Other'
] as const;

export type Industry = typeof INDUSTRIES[number];
