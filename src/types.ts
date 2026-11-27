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
  roleSource?: string;
  roleConfidence?: number;
  roleInference?: { status?: string; suggested_role?: string; evidence?: string; reason?: string; evaluated_at?: string; model?: string };
  coverageReason?: string;
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
  dataAvailability?: { revenue: boolean; telemetry: boolean; scoreTrend: boolean; confidence: boolean };
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
  scoreAudit?: {
    composite: number;
    fit: number;
    intent: number;
    coverage: number;
    grade: string;
    priorityBand: string;
    routingState: string;
    recommendedPlay: string;
    lastScoredAt: string | null;
    positiveSignals: string[];
    negativeSignals: string[];
    signalsCount: number;
  };
  jevDecision?: JevDecision;
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
  role?: string;
  restUrl?: string;
  lastSyncRecords?: number;
  lastSyncStatus?: string;
  mcpProbe?: { ok: boolean; tool_count?: number; checked_at?: string; skills?: Array<{name:string; description:string; uri:string}> };
  mcpServerUrl?: string;
  mcpConfigured?: boolean;
  mcpHeaderNames?: string[];
  mcpPublished?: boolean;
  mcpDocumentation?: string;
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
  archived?: boolean;
  recordStatus?: string;
  audit?: {
    source?: string; decision_kind?: string; play?: string; stage?: string; routing_state?: string;
    fit?: number; intent?: number; coverage?: number; composite?: number;
    marketo_action?: string; marketo_destination?: string; recorded_at?: string; scored_at?: string;
    decision_applied?: boolean; applied_count?: number; requested_count?: number; run_id?: string;
    operational_next_action?: { title?: string; code?: string; detail?: string };
  };
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
  | 'DECISION_OPS'
  | 'OPERATIONS_DESK'
  | 'SIGNALS'
  | 'SIMULATOR'
  | 'CONVERSIONS'
  | 'RULES'
  | 'INTELLIGENCE'
  | 'SEGMENTS'
  | 'CONNECTORS'
  | 'TASKS'
  | 'TERMINAL'
  | 'AUTOMATION';

export interface JevChoiceOption {
  selected: string;
  confidence: number;
  probabilities?: Record<string, number>;
}

export interface JevChoiceDecision {
  stage?: JevChoiceOption;
  priority?: JevChoiceOption;
  routing?: JevChoiceOption;
  play?: JevChoiceOption;
  audience_segment?: JevChoiceOption;
  channel?: JevChoiceOption;
  next_action?: JevChoiceOption;
}

export interface JevScoreDecision {
  name: string;
  score: number;
  levels: string[];
  probabilities: number[];
  confidence: number;
  legend: string[];
}

export interface JevNoulDecision {
  name: string;
  probability: number;
  threshold: number;
  is_approved: boolean;
  interpretation: string;
}

export interface JevDecision {
  provider: string;
  model?: string;
  applied: boolean;
  choice?: JevChoiceDecision;
  score?: JevScoreDecision;
  noul?: JevNoulDecision;
  stage_confidence?: number;
  play_confidence?: number;
  segment_confidence?: number;
  channel_confidence?: number;
  progress_probability?: number;
  readiness?: { score: number };
  next_action_confidence?: number;
}

export interface CustomPlaybook {
  id: string;
  name: string;
  description: string;
  action: string;
  lane: string;
  sla_hours: number;
  noul_question: string;
  noul_threshold: number;
  noul_operator: string;
  min_fit: number;
  min_intent: number;
  is_active: boolean;
  matched_units_count?: number;
  matched_units?: Array<{
    demand_unit_key: string;
    account_domain: string;
    need_key: string;
    stage: string;
    composite_score: number;
    noul_score: number;
    choice_stage: string;
    score_readiness: number;
    reason: string;
  }>;
  created_at?: string;
  updated_at?: string;
}

