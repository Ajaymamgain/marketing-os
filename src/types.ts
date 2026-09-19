export type MotionType = 'PLG' | 'SLG' | 'DUAL';

export type CommitteeRole =
  | 'economic_buyer'
  | 'champion'
  | 'technical_evaluator'
  | 'security_compliance'
  | 'procurement_legal'
  | 'end_user';

export type BuyingRole =
  | CommitteeRole
  | 'technical_champion'
  | 'security_infosec'
  | 'day_to_day_evaluator'
  | 'procurement'
  | 'executive_sponsor';

export type FunnelStage =
  | 'target'
  | 'engaged'
  | 'prioritized_du'
  | 'qualified_du'
  | 'pipeline_deal'
  | 'closed_won'
  | 'expansion';

export interface ScoreComponents {
  productTelemetry: number; // PLG usage, seat velocity, API volume (0-100)
  behavioralEngagement: number; // Docs, events, webinars, web traffic (0-100)
  committeeMaturity: number; // Persona completeness, stakeholder buy-in (0-100)
  firmographicFit: number; // ICP alignment, employee size, tech stack (0-100)
  intentSurge: number; // 3P intent signals (G2, Bombora, 6sense) (0-100)
}

export interface PersonaMember {
  id: string;
  name: string;
  title: string;
  role: CommitteeRole | string;
  email: string;
  avatarUrl?: string;
  status?: 'active' | 'engaged' | 'unmapped' | 'risk';
  engagementScore: number; // 0-100
  lastSeen: string;
  sentiment: 'positive' | 'neutral' | 'skeptical' | 'unknown' | 'CHAMPION' | 'SUPPORTIVE';
  influenceLevel: 'high' | 'medium' | 'low' | 'HIGH' | 'MEDIUM' | 'LOW';
  keyNotes: string;
}

export type CommitteeMember = PersonaMember;

export interface BuyingCommittee {
  coverageScore: number; // 0-100
  totalIdentified: number;
  totalRequired: number;
  championIdentified: boolean;
  economicBuyerEngaged: boolean;
  securitySignedOff: boolean;
  members: PersonaMember[];
  missingRoles: (CommitteeRole | string)[];
}

export interface TelemetryMetrics {
  activeUsers7d: number;
  seatSaturationPct: number;
  apiCallsMonthly: number;
  featureFlagBreaches: number;
  exportDownloads: number;
  complianceDocViews: number;
  weeklyGrowthRatePct: number;
  primaryWorkspaceId: string;
}

export interface AccountDemandUnit {
  id: string;
  accountName: string;
  domain: string;
  industry: string;
  employeeCount: number;
  tier: string;
  solutionTarget: string; // e.g. "Cloud Data Infrastructure Unit"
  primaryMotion: MotionType;
  stage: FunnelStage;
  compositeScore: number; // 0-100
  scoreDelta7d: number; // e.g. +14
  confidenceLevel: number; // 0-100 %
  estDealValue: number; // USD
  scores: ScoreComponents;
  committee: BuyingCommittee;
  telemetry: TelemetryMetrics;
  recentSignals: string[];
  recommendedPlaybookId?: string;
  cadCoordinates: {
    grid: string;
    sector: string;
    revTag: string;
  };
  assignedSdr: string;
  assignedAe: string;
  lastTelemetryPing: string;
}

export interface TelemetrySignal {
  id: string;
  accountId: string;
  accountName: string;
  timestamp: string;
  category: 'PRODUCT' | 'COMMITTEE' | 'INTENT' | 'COMPLIANCE' | 'RISK' | string;
  title: string;
  detail: string;
  severity: 'CRITICAL' | 'SURGE' | 'INFO' | 'WARNING' | 'ELEVATED' | 'NOMINAL';
  scoreImpact: number;
  motion: MotionType;
  resolved: boolean;
  sourceFeed?: string;
}

export interface AutomationPlaybook {
  id: string;
  code?: string;
  title: string;
  description: string;
  triggerCondition?: string;
  trigger?: string;
  targetMotion: MotionType | string;
  actionSummary?: string;
  actions?: string[];
  status?: 'ACTIVE' | 'PAUSED' | 'SIMULATION';
  enabled?: boolean;
  executionCount?: number;
  executionsCount?: number;
  successRate?: number;
  successRatePct?: number;
  lastExecuted?: string;
}

export interface ScoringWeights {
  telemetryWeight?: number;
  behavioralWeight?: number;
  committeeWeight?: number;
  firmographicWeight?: number;
  intentWeight?: number;
  decayHalfLifeDays?: number;
  pqlThreshold?: number;
  sqlThreshold?: number;
  enterpriseMultiplier?: number;
  [key: string]: any;
}

export type ScoringRule = ScoringWeights;

export interface DataConnector {
  id: string;
  name: string;
  category: 'DATA_WAREHOUSE' | 'CRM' | 'PRODUCT_ANALYTICS' | 'INTENT_STREAM' | 'EVENT_BUS' | string;
  type?: string;
  status: 'SYNCHRONIZED' | 'STREAMING' | 'DEGRADED' | 'STANDBY' | 'SYNCED' | string;
  latencyMs: number;
  eventsPerSec?: number;
  eventsPerMin?: number;
  lastSync: string;
  schemaValid?: boolean;
  version?: string;
}

export interface OperationalTask {
  id: string;
  accountId: string;
  accountName: string;
  title: string;
  priority: 'URGENT_SURGE' | 'HIGH' | 'STANDARD' | 'URGENT' | 'MEDIUM' | 'LOW';
  motion: MotionType;
  assignedTo: string;
  dueDate: string;
  completed: boolean;
  impactScore?: number;
  sourceSignal?: string;
  createdAt?: string;
}

export type ActiveNavTab =
  | 'LANDING'
  | 'OVERVIEW'
  | 'DEMAND_UNITS'
  | 'FUNNEL'
  | 'JOURNEY'
  | 'ACCOUNTS'
  | 'COMMITTEES'
  | 'COVERAGE'
  | 'PI_OPS'
  | 'SIGNALS'
  | 'RULES'
  | 'CONNECTORS'
  | 'TASKS'
  | 'TERMINAL'
  | 'CHATBOT';

export type GeminiModelTier =
  | 'gemini-3.5-flash'
  | 'gemini-3.1-flash-lite'
  | 'gemini-3.1-pro-preview';

export type ChatbotRole =
  | 'default'
  | 'telemetry_analyst'
  | 'committee_strategist'
  | 'pipeline_commander';

export interface ChatFunctionExecution {
  id?: string;
  name: string;
  args: Record<string, any>;
  result: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: string;
  modelUsed?: string;
  isSimulated?: boolean;
  functionCalls?: ChatFunctionExecution[];
}

