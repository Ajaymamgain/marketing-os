import {
  AccountDemandUnit,
  OperationalTask,
  TelemetrySignal,
  DataConnector,
  AutomationPlaybook,
  ScoringWeights,
  FunnelStage,
  JevDecision,
  CustomPlaybook,
} from '../types';
import {
  MOCK_DEMAND_UNITS,
  MOCK_TASKS,
  MOCK_SIGNALS,
  MOCK_CONNECTORS,
  MOCK_PLAYBOOKS,
  INITIAL_SCORING_WEIGHTS,
} from '../data/mockData';

const API_BASE = '';
export const DEMO_DATA_ENABLED = import.meta.env.VITE_ENABLE_DEMO_DATA === 'true';

export interface HistoricalReplaySnapshot {
  schema_version: number;
  mode: 'historical_replay';
  dataset_kind?: 'synthetic';
  generated_at: string;
  limitations: string[];
  validation?: {
    synthetic: boolean;
    mapped_leads: number;
    ingested_records: number;
    units_evaluated: number;
    jev_decisions_applied: number;
    failed_units: number;
    model: string;
    provider: string;
    decisions: Array<{
      demand_unit_key: string;
      stage: string;
      priority_band: string;
      composite_score: number;
      provider: string;
      error?: string | null;
    }>;
  };
  marketo: {
    source: string;
    rows: number;
    date_start: string;
    date_end: string;
    campaigns: number;
    activity_types: Array<{ id: string; label: string; events: number; unique_leads: number }>;
    funnel: {
      sent_leads: number;
      delivered_after_send: number;
      opened_after_delivery: number;
      clicked_after_delivery: number;
      form_leads: number;
    };
    bot_flags: { present: number; true: number };
    timeline: Array<{ time: string; total: number; activities: Record<string, number> }>;
  };
  ads: {
    source: string;
    rows: number;
    date_start: string;
    date_end: string;
    campaigns: number;
    outcome_rows: number;
    outcome_rows_without_spend: number;
    platforms: Array<{ name: string; rows: number }>;
    timeline: Array<Record<string, number | string> & { date: string; platform: string }>;
  };
  population?: {
    accounts: number;
    segments: Array<{ id: string; name: string; need_key: string; accounts: number; leads: number }>;
  };
}

export async function fetchHistoricalReplay(dataset: 'actual' | 'synthetic' = 'actual'): Promise<HistoricalReplaySnapshot | null> {
  const endpoint = dataset === 'synthetic' ? 'synthetic' : 'snapshot';
  const response = await fetch(`${API_BASE}/v1/simulator/${endpoint}`, { credentials: 'include' });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Historical replay request failed (${response.status})`);
  return response.json();
}

export interface JevAutomationStatus {
  success: boolean;
  automation: {
    enabled: boolean;
    running: boolean;
    cadence_seconds: number;
    queue?: { pending: number; retrying: number; oldest_requested_at?: string | null };
    workers?: Record<string, { healthy: boolean; last_seen_at?: string | null }>;
    operations?: Record<string, { status: string; last_completed_at?: string | null; next_run_at?: string | null; last_error?: string | null; result?: Record<string, any> }>;
    last_started_at?: string | null;
    last_completed_at?: string | null;
    next_run_at?: string | null;
    cycles_completed: number;
    units_evaluated: number;
    decisions_applied: number;
    changes_applied: number;
    failed_units: number;
    last_error?: string | null;
    recent_decisions: Array<Record<string, any>>;
  };
  decision_engine: {
    configured: boolean;
    provider: string;
    model: string;
    architecture: string;
  };
  execution_policy: {
    score_formula: string;
    coverage_zero_block: boolean;
    tenant_scoped: boolean;
    strict_jev: boolean;
    integration_mode?: string;
  };
}

export interface ScoringPolicy {
  fit: number;
  intent: number;
  coverage: number;
  fit_percent: number;
  intent_percent: number;
  coverage_percent: number;
  formula: string;
  updated_at: string | null;
}

export interface ScoreSnapshot {
  id: string;
  scored_at: string;
  fit_score: number;
  intent_score: number;
  coverage_score: number;
  composite_score: number;
  formula: string;
  policy_updated_at: string | null;
  configuration_revision: string;
  evidence_hash: string;
  decision_provider: string | null;
  decision_model: string | null;
  decision_applied: boolean;
}

export async function fetchScoreHistory(demandUnitKey: string): Promise<ScoreSnapshot[]> {
  const res = await fetch(`${API_BASE}/v1/demand-units/${encodeURIComponent(demandUnitKey)}/score-history?limit=10`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Score history request failed (${res.status})`);
  const data = await res.json();
  return Array.isArray(data.history) ? data.history : [];
}

export async function fetchScoringPolicy(): Promise<ScoringPolicy> {
  return productGet('/v1/scoring-policy');
}

export async function saveScoringPolicy(weights: { fit: number; intent: number; coverage: number }): Promise<{
  success: boolean;
  policy?: ScoringPolicy;
  rescore?: 'queued' | 'queue_failed';
  error?: string;
}> {
  const me = await fetch(`${API_BASE}/v1/auth/me`, { credentials: 'include' });
  const session = me.ok ? await me.json() : {};
  const res = await fetch(`${API_BASE}/v1/scoring-policy`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(session.csrf_token ? { 'X-CSRF-Token': session.csrf_token } : {}),
    },
    body: JSON.stringify(weights),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, error: data.error || `HTTP ${res.status}` };
  return data;
}

export interface ActivityTypeScore {
  type: string;
  label: string;
  source: 'marketo' | 'ad_platform';
  points: number;
  impressions?: number;
  clicks?: number;
  applied_points?: number;
  builtin?: boolean;
}

export async function fetchActivityScores(): Promise<ActivityTypeScore[]> {
  const data=await productGet('/v1/activity-scores');
  if(!Array.isArray(data.types))throw new Error('Invalid activity score configuration');
  return data.types;
}

export async function saveActivityScores(scores: Record<string, number>): Promise<{
  success: boolean;
  types?: ActivityTypeScore[];
  rescore?: 'queued' | 'queue_failed';
  error?: string;
}> {
  const me = await fetch(`${API_BASE}/v1/auth/me`, { credentials: 'include' });
  const session = me.ok ? await me.json() : {};
  const res = await fetch(`${API_BASE}/v1/activity-scores`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(session.csrf_token ? { 'X-CSRF-Token': session.csrf_token } : {}),
    },
    body: JSON.stringify({ scores }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, error: data.error || `HTTP ${res.status}` };
  return data;
}

export async function addActivityType(body: { label: string; source: 'marketo' | 'ad_platform'; points: number }): Promise<{
  success: boolean;
  types?: ActivityTypeScore[];
  rescore?: 'queued' | 'queue_failed';
  error?: string;
}> {
  const me = await fetch(`${API_BASE}/v1/auth/me`, { credentials: 'include' });
  const session = me.ok ? await me.json() : {};
  const res = await fetch(`${API_BASE}/v1/activity-types`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(session.csrf_token ? { 'X-CSRF-Token': session.csrf_token } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, error: data.error || `HTTP ${res.status}` };
  return data;
}

export async function fetchJevAutomationStatus(): Promise<JevAutomationStatus | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/automation/status`, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[API] Could not fetch Jev automation status:', err);
    return null;
  }
}

/**
 * Maps Dual Motion backend stage strings to frontend FunnelStage enum.
 */
function mapBackendStage(stage: string): FunnelStage {
  const normalized = (stage || '').toLowerCase();
  if (normalized.includes('target')) return 'target';
  if (normalized.includes('engaged')) return 'engaged';
  if (normalized.includes('prioritized')) return 'prioritized_du';
  if (normalized.includes('qualified')) return 'qualified_du';
  if (normalized.includes('pipeline') || normalized.includes('opportunity')) return 'pipeline_deal';
  if (normalized.includes('won')) return 'closed_won';
  return 'target';
}

/**
 * Transforms a backend demand unit dossier into the typed AccountDemandUnit expected by the UI.
 */
function transformDossier(dossier: any, index: number): AccountDemandUnit {
  const du = dossier.demand_unit || {};
  const acct = dossier.account || {};
  const members = dossier.members || [];
  const signals = du.top_positive_signals || [];

  // Determine stage and composite score
  const compositeScore = Number(du.composite_score ?? 0);
  const stage = mapBackendStage(du.stage || 'Target');

  // Committee members mapping
  const mappedMembers = members.map((m: any, mIdx: number) => ({
    id: m.email || `PM-${index}-${mIdx}`,
    name: m.name || 'Key Stakeholder',
    title: m.title || 'Title not provided',
    role: (m.role || 'unknown').toLowerCase().replace(/\s+/g, '_'),
    email: m.email || '',
    roleSource: m.human_assigned_role ? 'human' : m.role_provenance || 'pending',
    roleConfidence: Number(m.role_confidence || 0),
    roleInference: m.human_assigned_role || m.role_provenance === 'verified' ? undefined : m.role_evidence || {},
    coverageReason: dossier.coverage_breakdown?.member_statuses?.find((entry: any) => entry.email === m.email)?.reason || 'Awaiting role evaluation',
    status: dossier.coverage_breakdown?.active_members?.some((active: any) => active.email === m.email) ? 'active' as const : 'unmapped' as const,
    engagementScore: 0,
    lastSeen: m.role_provenance?.startsWith('jev') ? m.role_evidence?.last_eligible_engagement_at || '' : m.last_engaged_at || '',
    sentiment: 'unknown' as const,
    influenceLevel: (m.seniority === 'VP' || m.seniority === 'C-Level' ? 'high' : 'medium') as 'high' | 'medium',
    keyNotes: `${m.human_assigned_role ? 'Owner verified' : m.role_provenance === 'verified' ? 'Source verified' : m.role_evidence?.evidence || 'Automatic role inference pending'} · Consent: ${m.consent_status === 'allowed' ? 'Allowed' : 'Unknown or blocked'}`,
  }));

  const missingRoles: string[] = [];
  if (!dossier.has_champion) missingRoles.push('champion');
  if (!dossier.has_buyer) missingRoles.push('economic_buyer');
  if (!dossier.has_evaluator) missingRoles.push('technical_evaluator');

  return {
    id: du.demand_unit_key || `DU-${index + 1000}`,
    accountName: acct.name || du.account_domain || 'Enterprise Account',
    domain: du.account_domain || 'domain.com',
    industry: acct.industry || 'Not provided',
    employeeCount: acct.headcount || 0,
    tier: acct.tier || (du.grade === 'A1' ? 'Tier 1 Strategic' : 'Tier 2 Enterprise'),
    solutionTarget: (du.need_key || 'Enterprise Demand Unit').replace(/_/g, ' '),
    primaryMotion: du.source_motion === 'PLG' ? 'PLG' : du.source_motion === 'SLG' ? 'SLG' : 'DUAL',
    stage,
    compositeScore,
    scoreDelta7d: 0,
    confidenceLevel: 0,
    estDealValue: Number(du.opportunity_value ?? 0),
    dataAvailability: { revenue: du.opportunity_value != null, telemetry: false, scoreTrend: false, confidence: false },
    scores: {
      productTelemetry: Math.round(du.fit_score ?? 0),
      behavioralEngagement: Math.round(du.intent_score ?? 0),
      committeeMaturity: Math.round(du.coverage_score ?? 0),
      firmographicFit: Math.round(du.fit_score ?? 0),
      intentSurge: Math.round(du.intent_score ?? 0),
    },
    committee: {
      coverageScore: Math.round(du.coverage_score ?? 0),
      totalIdentified: mappedMembers.length,
      totalRequired: 3,
      championIdentified: !!dossier.has_champion,
      economicBuyerEngaged: !!dossier.has_buyer,
      securitySignedOff: false,
      members: mappedMembers,
      missingRoles,
    },
    telemetry: {
      activeUsers7d: 0, seatSaturationPct: 0, apiCallsMonthly: 0,
      featureFlagBreaches: 0, exportDownloads: 0, complianceDocViews: 0,
      weeklyGrowthRatePct: 0, primaryWorkspaceId: '',
    },
    recentSignals: signals.length > 0 ? signals : [
      `Fit Scored: ${Math.round(du.fit_score ?? 0)} via ICP attributes`,
      `Intent Scored: ${Math.round(du.intent_score ?? 0)} via decay engine`,
      `Coverage: ${Math.round(du.coverage_score ?? 0)}% across buying committee`,
    ],
    recommendedPlaybookId: du.recommended_play,
    cadCoordinates: {
      grid: `G${(index % 8) + 1}`,
      sector: `SEC-0${(index % 4) + 1}`,
      revTag: 'SYS.01',
    },
    assignedSdr: du.assigned_sdr || 'Unassigned',
    assignedAe: du.assigned_ae || 'Unassigned',
    lastTelemetryPing: dossier.sla_remaining ? `4h SLA: ${dossier.sla_remaining}` : du.last_scored_at || 'Not scored',
    scoreAudit: {
      composite: Number(du.composite_score ?? 0),
      fit: Number(du.fit_score ?? 0),
      intent: Number(du.intent_score ?? 0),
      coverage: Number(du.coverage_score ?? 0),
      grade: String(du.grade || '—'),
      priorityBand: String(du.priority_band || 'MONITOR'),
      routingState: String(du.routing_state || 'HOLD'),
      recommendedPlay: String(du.recommended_play || ''),
      lastScoredAt: du.last_scored_at || null,
      positiveSignals: Array.isArray(du.top_positive_signals) ? du.top_positive_signals : [],
      negativeSignals: Array.isArray(du.top_negative_signals) ? du.top_negative_signals : [],
      signalsCount: Number(dossier.signals_count ?? 0),
    },
    jevDecision: dossier.jev_decision || du.jev_decision || undefined,
  };
}

/**
 * Transforms backend task objects into OperationalTask format.
 */
function transformTask(task: any, index: number): OperationalTask {
  const isUrgent = task.priority === 'P0' || task.priority === 'urgent' || (task.metadata && task.metadata.sla_hours === 4);
  const isHigh = task.priority === 'P1' || task.priority === 'high';
  return {
    id: task.task_id || task.id || `TASK-${index + 1000}`,
    accountId: task.demand_unit_key || task.account_domain || '',
    accountName: task.account_domain ? `${task.account_domain} (${task.demand_unit_key || ''})` : 'Enterprise Target',
    title: task.title || task.name || 'Recorded system activity',
    priority: isUrgent ? 'URGENT' : isHigh ? 'HIGH' : task.priority === 'low' ? 'LOW' : 'MEDIUM',
    motion: 'DUAL',
    assignedTo: task.assigned_to || task.assignee || 'Unassigned',
    dueDate: task.due_date || task.sla_due_at || '',
    completed: task.status === 'completed' || task.status === 'done',
    archived: task.status === 'superseded',
    impactScore: undefined,
    sourceSignal: task.title || task.name || 'Dual Motion Composite Threshold Exceeded',
    createdAt: task.created_at || '',
    recordStatus: task.status || 'unknown',
    audit: task.metadata || {},
  };
}

// ----------------------------------------------------------------------
// Exported API Methods
// ----------------------------------------------------------------------

async function productGet(path: string): Promise<any> {
  const response = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error('Your workspace session is unavailable. Sign in to load your data.');
    throw new Error(`Workspace data request failed (${response.status}). Retry or check the service.`);
  }
  return response.json();
}

export async function fetchDemandUnits(): Promise<AccountDemandUnit[]> {
  const data = await productGet('/v1/demand-units');
  if (!Array.isArray(data)) throw new Error('Invalid demand unit response');
  return data.map(transformDossier);
}

export async function fetchTasks(): Promise<OperationalTask[]> {
  const data = await productGet('/v1/tasks');
  if (!Array.isArray(data.tasks)) throw new Error('Invalid task response');
  return data.tasks.map(transformTask);
}

export async function completeTask(taskId: string): Promise<boolean> {
  await connectorPost(`/v1/tasks/${encodeURIComponent(taskId)}/complete`, {});
  return true;
}

export async function setTaskCompleted(taskId: string, completed: boolean): Promise<void> {
  await connectorPost('/v1/operator/action', { action: 'update_task', body: { task_id: taskId, status: completed ? 'done' : 'todo' } });
}

export async function createTask(task: Omit<OperationalTask, 'id' | 'createdAt'>): Promise<OperationalTask> {
  const data = await connectorPost('/v1/operator/action', {
    action: 'create_task', demand_unit_key: task.accountId,
    body: { name: task.title, priority: task.priority.toLowerCase(), assignee: task.assignedTo,
      due_date: task.dueDate ? new Date(task.dueDate).toISOString() : null,
      metadata: { motion: task.motion }, task_type: 'manual_action' },
  });
  return transformTask(data.task, 0);
}

export async function getConnectorInventory(): Promise<DataConnector[]> {
    const res = await fetch(`${API_BASE}/v1/connectors`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data && Array.isArray(data.connectors)) {
      return data.connectors.map((c: any) => ({
        id: c.id,
        name: c.name || 'Data Connector',
        category: c.kind || 'INTEGRATION',
        type: c.transport || undefined,
        status: c.status,
        latencyMs: 0,
        lastSync: c.last_sync?.completed_at || '',
        lastSyncRecords: c.last_sync?.ingested_records,
        lastSyncStatus: c.last_sync?.status,
        mcpProbe: c.mcp?.probe || undefined,
        role: c.role,
        restUrl: c.rest_url || undefined,
        mcpServerUrl: c.mcp?.server_url || undefined,
        mcpConfigured: Boolean(c.mcp?.configured),
        mcpHeaderNames: c.mcp?.header_names || [],
        mcpPublished: Boolean(c.mcp?.published),
        mcpDocumentation: c.mcp?.documentation || undefined,
      }));
    }
    throw new Error('Invalid connector response');
}

export async function fetchConnectors(): Promise<DataConnector[]> {
  return getConnectorInventory();
}

async function connectorPost(path: string, body: Record<string, unknown>): Promise<any> {
  const me = await fetch(`${API_BASE}/v1/auth/me`, { credentials: 'include' });
  if (!me.ok) throw new Error('Sign in again to manage this connection');
  const session = await me.json();
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(session.csrf_token ? { 'X-CSRF-Token': session.csrf_token } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

export function configureMarketo(config: { rest_url: string; identity_url: string; client_id: string; client_secret: string }): Promise<any> {
  return connectorPost('/v1/connectors/marketo/config', config);
}

export function disconnectMarketo(): Promise<any> {
  return connectorPost('/v1/connectors/marketo/config', { action: 'disconnect' });
}

export function saveMcpConnector(connectorId: string, serverUrl: string, headerName: string, headerValue: string): Promise<any> {
  const headers = headerName.trim() && headerValue ? [{ name: headerName.trim(), value: headerValue }] : [];
  return connectorPost('/v1/connectors/mcp', { connector_id: connectorId, server_url: serverUrl, headers });
}

export function connectMcpConnector(connectorId: string, documentationUrl: string): Promise<any> {
  return connectorPost('/v1/connectors/mcp', { action: 'connect', connector_id: connectorId, documentation_url: documentationUrl });
}

export function disconnectMcpConnector(connectorId: string): Promise<any> {
  return connectorPost('/v1/connectors/mcp', { action: 'disconnect', connector_id: connectorId });
}

export function syncMarketo(): Promise<any> {
  return connectorPost('/v1/marketo/sync', { since_days: 7, max_pages: 3 });
}

export interface AudiencePlaybookPreview {
  delivery_transport?: "mcp" | "legacy" | null;
  delivery_connection_ready?: boolean;
  jev_decision?: JevDecision;
  playbook_library?: Array<{code: string; name: string; detail: string; selected: boolean; mapping: AudiencePlaybookConfig}>;
  data_trace?: {
    signal_count: number;
    sources: Array<{name: string; count: number}>;
    sample_account: boolean;
    last_scored_at: string | null;
    recent_signals: Array<{type: string; source: string; at: string}>;
    recent_jobs: Array<{id: string; destination: string; action: string; status: string; at: string | null}>;
  };
  demand_unit_key: string;
  account_domain: string;
  need_key: string;
  stage: string;
  routing_state: string;
  action: 'add' | 'remove';
  reason: string;
  candidate_contacts: number;
  eligible_contacts: number;
  excluded_for_consent: number;
  excluded_for_segment: number;
  marketo_list_id: number | null;
  mode: string;
  can_apply: boolean;
  blockers: string[];
  evidence: string[];
  recommendation: {
    campaign: { code: string; name: string; detail: string };
    segment: { code: string; name: string; detail: string };
    channel: { code: string; name: string };
    score: { fit: number; intent: number; coverage: number; composite: number };
    provider: string;
    model: string | null;
    jev_applied: boolean;
    decision_current?: boolean;
    confidence: number;
    decided_at: string | null;
    operational_next_action?: {
      code: string;
      title: string;
      detail: string;
      owner: string;
      source: string;
      executed: boolean;
    };
    next_action?: {
      action: 'add' | 'hold';
      destination_kind: 'program' | 'smart_campaign' | 'smart_list' | 'static_list' | 'none';
      destination_id: string | null;
      destination_name: string;
      source: 'simulator' | 'marketo' | 'none';
      reason: string;
      jev_applied: boolean;
      catalog_counts?: { programs: number; smart_campaigns: number; smart_lists: number; eligible: number };
    } | null;
  };
  providers: Array<{ id: string; name: string; action: string; status: 'ready' | 'blocked' | 'planned'; detail: string; suggested_audience: string; suggested_campaign: string }>;
}

export interface AudiencePlaybookConfig {
  play_code?: string;
  need_key: string;
  marketo_list_id: number | null;
  enabled: boolean;
  updated_at: string | null;
}

export async function fetchAudiencePlaybookConfig(demandUnitKey: string, playCode = "*"): Promise<AudiencePlaybookConfig> {
  const query = new URLSearchParams({ demand_unit_key: demandUnitKey, play_code: playCode });
  const response = await fetch(`${API_BASE}/v1/audience-playbook/config?${query}`, { credentials: 'include' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Could not load playbook settings (${response.status})`);
  return data;
}

export function saveAudiencePlaybookConfig(demandUnitKey: string, marketoListId: string, enabled: boolean, playCode = "*"): Promise<AudiencePlaybookConfig> {
  return connectorPost('/v1/audience-playbook/config', {
    demand_unit_key: demandUnitKey, marketo_list_id: marketoListId, enabled, play_code: playCode,
  });
}

export async function previewAudiencePlaybook(demandUnitKey: string, marketoListId: string, playCode = "*"): Promise<AudiencePlaybookPreview> {
  const query = new URLSearchParams({ demand_unit_key: demandUnitKey, play_code: playCode });
  if (marketoListId.trim()) query.set('marketo_list_id', marketoListId.trim());
  const response = await fetch(`${API_BASE}/v1/audience-playbook/preview?${query}`, { credentials: 'include' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Preview failed (${response.status})`);
  return data;
}

export function applyAudiencePlaybook(demandUnitKey: string, marketoListId: string, playCode = "*"): Promise<any> {
  return connectorPost('/v1/audience-playbook/apply', { demand_unit_key: demandUnitKey, marketo_list_id: marketoListId, play_code: playCode });
}

export function autoProvisionPlaybooks(autoEnable = true): Promise<{
  success: boolean;
  provisioned: Array<{ need_key: string; play_code: string; list_id: number; list_name: string; enabled: boolean }>;
  count: number;
}> {
  return connectorPost('/v1/audience-playbook/auto-provision', { auto_enable: autoEnable });
}

export interface MarketoPlaybookAsset {
  id: number;
  name: string;
  status?: string;
  type?: string;
  channel?: string;
  folder?: string;
  is_active?: boolean;
  smart_list_id?: number;
}

export interface MarketoPlaybookAssets {
  programs: MarketoPlaybookAsset[];
  smart_campaigns: MarketoPlaybookAsset[];
  smart_lists: MarketoPlaybookAsset[];
  counts: { programs: number; smart_campaigns: number; smart_lists: number };
}

export async function fetchMarketoPlaybookAssets(): Promise<MarketoPlaybookAssets> {
  const response = await fetch(`${API_BASE}/v1/marketo/playbook-assets`, { credentials: 'include' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Could not load Marketo playbook assets (${response.status})`);
  return data;
}

export async function fetchMarketoStaticLists(): Promise<Array<{ id: number; name: string }>> {
  const response = await fetch(`${API_BASE}/v1/marketo/static-lists`, { credentials: 'include' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Could not load Marketo lists (${response.status})`);
  return Array.isArray(data.lists) ? data.lists.filter((item: any) => Number.isInteger(item.id) && item.name) : [];
}

export async function fetchFunnelMetrics(): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/v1/funnel-metrics`, {
      credentials: 'include',
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[API] Could not fetch /v1/funnel-metrics:', err);
  }
  return null;
}

export async function fetchSignals(): Promise<TelemetrySignal[]> {
  try {
    const res = await fetch(`${API_BASE}/v1/signals?limit=50`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Workspace signals request failed (${res.status})`);
    {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((s: any, idx: number) => ({
          id: s.event_id || `SIG-${idx}`,
          accountId: s.account_domain || 'account',
          accountName: s.account_domain || 'Target Account',
          timestamp: s.timestamp || 'Just now',
          category: s.event_type || 'INTENT',
          title: `${s.event_type || 'Signal'}: ${s.account_domain || ''}`,
          detail: `Weight: ${s.weight ?? 1.0} | Need: ${s.need_key || 'General'}`,
          severity: (s.weight && s.weight > 2.0) ? 'SURGE' : 'INFO',
          scoreImpact: 0,
          motion: 'DUAL',
          resolved: false,
          sourceFeed: s.source || 'Marketo MAPI',
        }));
      }
    }
  } catch (err) {
    throw err;
  }
  throw new Error('Invalid workspace response');
}

export async function fetchPlaybooks(): Promise<AutomationPlaybook[]> {
  try {
    const res = await fetch(`${API_BASE}/v1/playbooks`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Workspace playbooks request failed (${res.status})`);
    {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((p: any, idx: number) => ({
          id: p.id || `PB-0${idx + 1}`,
          code: p.id || `PB-0${idx + 1}`,
          title: p.title || p.name || 'Automated Revenue Playbook',
          description: p.description || 'Deterministic policy rule trigger.',
          targetMotion: 'DUAL',
          status: p.is_active ? 'ACTIVE' : 'SIMULATION',
          enabled: Boolean(p.is_active),
          executionCount: p.executions_count ?? 0,
        }));
      }
    }
  } catch (err) {
    throw err;
  }
  throw new Error('Invalid workspace response');
}

export async function fetchRules(): Promise<ScoringWeights> {
  try {
    const res = await fetch(`${API_BASE}/v1/rules`, {
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      return {
        ...INITIAL_SCORING_WEIGHTS,
        ...(Array.isArray(data) ? {} : data),
      };
    }
  } catch (err) {
    console.warn('[API] Could not fetch /v1/rules:', err);
  }
  return INITIAL_SCORING_WEIGHTS;
}

export interface EvidenceSettings {
  intent_window_days: number; default_half_life_days: number; repeat_multiplier: number;
  daily_event_cap: number; activity_points_cap: number; normalization_scale: number; exclude_bots: boolean;
  half_lives: Record<string, number>;
  activity_rules:ActivityRule[];
  fit: {target_industries: string[]; target_technologies: string[]; headcount_min:number; headcount_max:number; revenue_min:number; revenue_max:number;
    component_weights: Record<'headcount'|'industry'|'revenue'|'technology',number>; minimum_known_weight:number; tier_multipliers:Record<'tier_1'|'tier_2'|'tier_3',number>};
  coverage: {recency_window_days:number; role_points:Record<string,number>; two_role_bonus:number; three_role_bonus:number};
}
export interface EvidencePreview {
  current_composite:number; projected_composite:number; fit:number; coverage:number; activation_blocked:boolean; note:string;
  contributions:Record<'fit'|'intent'|'coverage',number>;
  fit_evidence:{fit_confidence:number; insufficient_data:boolean; components:Record<string,number|null>};
  intent:{normalized_intent_score:number; excluded_events:Record<string,number>; activities:Array<{activity:string;label:string;count:number;points:number}>};
  coverage_evidence:{active_role_count:number; active_roles:string[]; missing_roles:string[]; base_points:number; consensus_bonus:number};
}
export interface EvidenceConfiguration {settings: EvidenceSettings; revision:number; updated_at:string|null; fixed_gates:string[]; can_edit?:boolean;
  sample_profile?: {available:boolean; marketo_rows:number; ads_rows:number; recommendation:string; activity_types:Array<{id:string;label:string;events:number}>}; rescore?:string; }
export async function fetchEvidenceConfiguration(): Promise<EvidenceConfiguration> {
  const response = await fetch(`${API_BASE}/v1/scoring-configuration`, {credentials:'include'});
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not load evidence settings');
  return data;
}
export function saveEvidenceConfiguration(settings: EvidenceSettings, revision:number): Promise<EvidenceConfiguration> {
  return connectorPost('/v1/scoring-configuration', {settings, revision});
}
export function previewEvidenceConfiguration(settings: EvidenceSettings, demandUnitKey:string, compositeWeights?:Record<'fit'|'intent'|'coverage',number>, activityPoints?:Record<string,number>): Promise<EvidencePreview> {
  return connectorPost('/v1/scoring-configuration/preview', {settings, demand_unit_key:demandUnitKey, composite_weights:compositeWeights, activity_points:activityPoints});
}

export async function fetchJevDecision(demandUnitKey: string): Promise<JevDecision | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/demand-units/${encodeURIComponent(demandUnitKey)}/jev-decision`, {
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.jev_decision || data;
  } catch (err) {
    console.warn('[API] Could not fetch jev decision:', err);
    return null;
  }
}

export async function fetchCustomPlaybooks(): Promise<CustomPlaybook[]> {
  const response = await fetch(`${API_BASE}/v1/custom-playbooks`, {credentials: 'include'});
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Could not load custom rules');
  return data;
}

export function previewCustomPlaybook(playbook: Partial<CustomPlaybook>): Promise<{matched_units_count: number; matched_units: NonNullable<CustomPlaybook['matched_units']>}> {
  return connectorPost('/v1/custom-playbooks/preview', playbook);
}

export async function createCustomPlaybook(playbook: Partial<CustomPlaybook>): Promise<CustomPlaybook> {
  const data = await connectorPost('/v1/custom-playbooks', playbook);
  return data.playbook || data;
}
export async function toggleCustomPlaybook(id: string): Promise<{ id: string; is_active: boolean }> {
  return connectorPost(`/v1/custom-playbooks/${encodeURIComponent(id)}/toggle`, {});
}
export async function deleteCustomPlaybook(id: string): Promise<{ id: string; deleted: boolean }> {
  return connectorPost(`/v1/custom-playbooks/${encodeURIComponent(id)}/delete`, {});
}

export async function fetchCustomPlaybookMatches(id: string): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/v1/custom-playbooks/${encodeURIComponent(id)}/matches`, {
      credentials: 'include',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.matched_units || [];
  } catch (err) {
    console.warn('[API] Could not fetch custom playbook matches:', err);
    return [];
  }
}


export interface DemandUnitInspection {
  success: boolean;
  signals: Array<{ id?: string; event_type: string; event_source?: string; timestamp: string; signal_weight?: number }>;
  jobs: Array<{ id: string; destination: string; action: string; status: string; created_at: string; completed_at?: string; result?: { mode?: string; message?: string; executor?: string } }>;
  blockers: Array<{ code: string; message: string; next_action?: string }>;
  enrichment?: EnrichmentSnapshot;
}
export interface EnrichmentField {
  value: string | null; status: 'accepted' | 'uncertain'; kind: 'inferred'; confidence: number;
  observed_at?: string | null;
  source?: { ref: string; text: string; source: string; observed_at?: string | null } | null;
}
export interface EnrichmentProfile {
  entity_key: string; status: 'complete' | 'no_data' | 'unavailable' | 'stale' | 'pending';
  evaluated_at?: string; model?: string; fields: Record<string, EnrichmentField>;
}
export interface CompanyResearchFact {value:string|null;source_urls:string[];as_of:string|null}
export interface CompanyResearchProfile {
  run_id:string;retrieved_at:string;review_status:string;score_inputs_applied:false;
  profile:{company_domain:string;company_name:string;fields:Record<string,CompanyResearchFact>;news:Array<{title:string;published_at:string;event_date:string|null;summary:string;url:string;publisher:string;relevance:string}>;gaps:string[];identity_notes:string};
}
export interface EnrichmentSnapshot {
  external_research?: { detailed_task?:{status:string;updated_at:string}; detailed_profile?:CompanyResearchProfile; provider:string; quote:string; source_url:string; status:string; observed_at?:string; fields_verified:false; score_inputs_applied:false; ranking:{position:number;source_url:string;as_of:string;method:string} } | null;
  account: EnrichmentProfile | null; people: EnrichmentProfile[]; demand_unit: EnrichmentProfile | null;
  external_provider_connected: boolean; automatic: boolean;
}
export async function inspectDemandUnit(id: string): Promise<DemandUnitInspection> {
  return productGet(`/v1/demand-units/${encodeURIComponent(id)}`);
}
export async function verifyMemberRole(demandUnitKey: string, email: string, role: string): Promise<void> {
  await connectorPost('/v1/members/verify-role', { demand_unit_key: demandUnitKey, email, role });
}
export interface WorkspaceAccess { role:string; email:string; tenant_id:string; local_workspace:boolean; }
export async function fetchWorkspaceAccess(): Promise<WorkspaceAccess> {
  const session = await productGet('/v1/auth/me');
  return { role:session.role, email:session.email, tenant_id:session.tenant_id, local_workspace:session.local_workspace };
}
export interface DecisionRecommendation {
  demand_unit_key: string; account_domain: string; need_key: string;
  composite_score: number; coverage_score: number; open_tasks: number; overdue_tasks: number;
  blockers: Array<{ code: string; message: string }>; recommended_action: string;
}
export async function fetchDecisionRecommendations(): Promise<DecisionRecommendation[]> {
  const data = await productGet('/v1/operator/recommendations?limit=200');
  return data.recommendations;
}

export interface ActivityRule {
  id:string; name:string; event_type:string; field:'any'|'url'|'asset_name'|'campaign_id';
  operator:'contains'|'equals'; value:string; points:number; half_life_days:number; enabled:boolean;
}
export interface ScoringModelDocument {settings:EvidenceSettings; weights:Record<'fit'|'intent'|'coverage',number>; activity_points:Record<string,number>}
export interface ScoringModel {model_id:string; name:string; description:string; revision:number; published_revision:number|null; updated_at:string; document:ScoringModelDocument}
export interface ScoringModelCatalog {observed_events?:Array<{event_type:string;label:string;events:number}>; models:ScoringModel[]; active_model_id:string|null; workspace:{document:ScoringModelDocument; token:string; revision:number}; can_edit?:boolean; sample_profile?:EvidenceConfiguration['sample_profile']; saved_model_id?:string; rescore?:string}
export function fetchScoringModels():Promise<ScoringModelCatalog> {return productGet('/v1/scoring-models');}
export function saveScoringModel(body:{model_id?:string; revision:number; name:string; description:string; document:ScoringModelDocument}):Promise<ScoringModelCatalog> {return connectorPost('/v1/scoring-models',body);}
export function publishScoringModel(modelId:string,revision:number,workspaceToken:string):Promise<ScoringModelCatalog> {return connectorPost('/v1/scoring-models/publish',{model_id:modelId,revision,workspace_token:workspaceToken});}

export interface HistoricalImport {
  id: string; source: string; filename: string; status: 'preview'|'queued'|'running'|'completed'|'failed';
  created_at: string; completed_at: string|null; last_error: string|null; attempts: number;
  processed_rows: number; held_units: number; outcomes: Record<string,number>;
  scoring: {units:number; jev_evaluated:number; pending:number};
  summary: {total_rows:number; accepted_rows:number; quarantined_rows:number; excluded_activity_rows:number;
    duplicate_file_rows:number; reporting_rows:number; affected_units:number; date_start:string|null; date_end:string|null;
    issues:Array<{row:number;reason:string}>};
}
export async function fetchHistoricalImports(): Promise<HistoricalImport[]> {
  const response=await fetch(`${API_BASE}/v1/imports`,{credentials:'include'});
  const data=await response.json().catch(()=>({}));
  if (!response.ok) throw new Error(data.error || 'Could not read import history');
  return data.imports;
}
export async function previewHistoricalImport(body:{source:string; filename:string; csv:string; leads_csv?:string; mappings_csv?:string}): Promise<HistoricalImport> {
  return (await connectorPost('/v1/imports/preview',body)).import;
}
export async function updateHistoricalImport(id:string,action:'commit'|'release'): Promise<HistoricalImport> {
  return (await connectorPost(`/v1/imports/${encodeURIComponent(id)}/${action}`,{})).import;
}

export interface SegmentDefinition {id:string;name:string;basis:'description'|'activity'|'both';description:string;enabled:boolean}
export interface SegmentConfiguration {revision:number;can_edit?:boolean;updated_at?:string;settings:{minimum_probability:number;activity_window_days:number;definitions:SegmentDefinition[]}}
export interface SegmentEvidence {ref:string;kind:string;text:string;source:string;observed_at?:string;event_type?:string;need_key?:string;demand_unit_key?:string}
export interface SegmentJudgment {id:string;name:string;basis:string;status:string;probability:number;reason:string;evidence:SegmentEvidence[]}
export interface AccountSegmentRow {domain:string;name:string;industry?:string;headcount?:number;need_count:number;highest_score:number;bucket:string;segment_status:string;segments:Array<{segment_id:string;probability:number}>}
export interface SegmentPortfolio {accounts:AccountSegmentRow[];total:number;next_after_key:string|null;buckets:Array<{bucket:string;accounts:number}>;segments:Array<{segment_id:string;accounts:number}>;definitions:SegmentDefinition[];bucket_labels:Record<string,string>}
export interface SegmentAccountDetail {account:AccountSegmentRow;profile:{status:string;evaluated_at?:string;judgments:SegmentJudgment[]};needs:Array<{demand_unit_key:string;need_key:string;stage:string;composite_score:number;fit_score:number;intent_score:number;coverage_score:number;routing_state:string;recommended_play:string}>}
export interface CampaignSegmentAsset {cursor:string;platform:string;asset_type:string;external_id:string;name:string;description:string;observed_at:string;status:string;classification:{labels:Array<{id:string;name:string;probability:number}>;evidence?:{name:string;description:string;source:string;observed_at:string};evaluated_at?:string}}
export interface CampaignSegmentCatalog {assets:CampaignSegmentAsset[];total:number;next_after_key:string|null;labels:Record<string,string>}
async function segmentGet<T>(path:string,signal?:AbortSignal):Promise<T> {
  const response=await fetch(`${API_BASE}${path}`,{credentials:'include',signal});
  const data=await response.json();
  if (!response.ok || data.success===false) throw new Error(data.error || 'Segments could not load');
  return data;
}
export const fetchSegmentConfiguration=()=>segmentGet<SegmentConfiguration>('/v1/segments/configuration');
export const saveSegmentConfiguration=(configuration:SegmentConfiguration)=>connectorPost('/v1/segments/configuration',{settings:configuration.settings,revision:configuration.revision}) as Promise<SegmentConfiguration>;
export const fetchAccountSegments=(params:Record<string,string>,signal?:AbortSignal)=>segmentGet<SegmentPortfolio>(`/v1/segments?${new URLSearchParams(params)}`,signal);
export const fetchSegmentAccount=(domain:string)=>segmentGet<SegmentAccountDetail>(`/v1/segments/accounts/${encodeURIComponent(domain)}`);
export const fetchCampaignSegments=(params:Record<string,string>,signal?:AbortSignal)=>segmentGet<CampaignSegmentCatalog>(`/v1/segments/assets?${new URLSearchParams(params)}`,signal);
export interface SegmentSources {
  api_enabled:boolean;
  marketo:{mcp_verified:boolean;native_adapter_configured:boolean;last_activity_sync:{completed_at?:string;fetched_records?:number;ingested_records?:number}|null;catalog:{status:string;stored_assets:number;last_attempt_at?:string;last_success_at?:string;errors?:Record<string,string>}};
}
export const fetchSegmentSources=()=>segmentGet<SegmentSources>('/v1/segments/sources');
export interface ApiDecisionControl {enabled:boolean;revision:number;can_edit?:boolean;updated_at?:string;note:string}
export const fetchApiDecisionControl=()=>segmentGet<ApiDecisionControl>('/v1/automation/api-decisions');
export const saveApiDecisionControl=(enabled:boolean,revision:number)=>connectorPost('/v1/automation/api-decisions',{enabled,revision}) as Promise<ApiDecisionControl>;
export interface McpToolDefinition {name:string;description:string;inputSchema:Record<string,unknown>;read_candidate:boolean;approved:boolean}
export const fetchMcpTools=(id:string)=>connectorPost('/v1/connectors/mcp',{action:'tools',connector_id:id}) as Promise<{tools:McpToolDefinition[]}>;
export const approveMcpReadTools=(id:string,tools:string[])=>connectorPost('/v1/connectors/mcp',{action:'approve_reads',connector_id:id,tools});
export const saveMcpServer=(id:string,server_url:string,headers:Array<{name:string;value:string}>,name?:string)=>connectorPost('/v1/connectors/mcp',{connector_id:id,server_url,headers,...(name?{name}:{})});
export const validateMcpJson=(configuration:string)=>connectorPost('/v1/connectors/mcp',{action:'validate_json',configuration}) as Promise<{valid:boolean;name?:string;tool_count:number;server_url:string;header_names:string[];saved:boolean}>;
export const saveMcpJson=(id:string,configuration:string,name?:string)=>connectorPost('/v1/connectors/mcp',{connector_id:id,configuration,...(name?{name}:{})});

export interface ResearchAccountScore {weights?:{fit:number;intent:number;coverage:number};fit:number;intent:number;coverage:number;composite:number;formula:string;fit_evidence_fraction:number;basis:string;inputs:{industry:CompanyResearchFact;headcount:{value:number|null;source_urls:string[]}}}
export interface LookalikePeer {domain:string;name:string;similarity:number;method:string;matched_on:Array<{field:string;terms:string[]}>;cohort_size:number}
export interface IntelligenceCompany {score?:ResearchAccountScore;name:string;domain:string;rank:number;status:string;industry:string|null;headquarters:string|null;overview:string|null;known_fields:number;total_fields:number;news_count:number;retrieved_at:string|null}
export interface IntelligencePortfolio {companies:IntelligenceCompany[];total:number;summary:{accounts:number;complete:number;pending:number;news:number};research_only:boolean}
export interface IntelligenceDetail {score?:ResearchAccountScore;lookalikes?:LookalikePeer[];similarity_policy?:string;domain:string;quote:string;source_url:string;observed_at:string;ranking:{position:number;source_url:string;as_of:string;method:string};detailed_profile?:CompanyResearchProfile;detailed_task?:{status:string;updated_at:string}}
export interface IntelligenceArticle {company_name:string;company_domain:string;title:string;published_at:string;event_date:string|null;summary:string;url:string;publisher:string;relevance:string}
export interface IntelligenceNews {articles:IntelligenceArticle[];total:number;offset:number;limit:number;days:number;next_offset:number|null}
export const fetchIntelligence=()=>productGet('/v1/company-intelligence') as Promise<IntelligencePortfolio>;
export const fetchIntelligenceDetail=(domain:string)=>productGet(`/v1/company-intelligence/accounts/${encodeURIComponent(domain)}`) as Promise<IntelligenceDetail>;
export const fetchIntelligenceNews=(params:Record<string,string>)=>productGet(`/v1/company-intelligence/news?${new URLSearchParams(params)}`) as Promise<IntelligenceNews>;

export type AdPlatform = 'linkedin' | 'meta';
export interface AdCreativeVariant {kind:string;headline:string;body:string;cta:string;advertiser:string;poster:string|null;video:string|null}
export type AdImpressions={kind:'exact';value:number}|{kind:'range';lower:number|null;upper:number|null};
export interface AdRecordMetrics {ad_id:string;first_impression_at?:string|null;latest_impression_at?:string|null;impressions?:AdImpressions|null;first_seen:string;last_seen:string}
export interface PublicAdEvidence {
  account_domain?:string;account_name?:string;
  impressions?:AdImpressions|null;group_size?:number;group_kind?:'shared_copy'|'repeated_creative';related_ads?:AdRecordMetrics[];
  creative?:{variants:AdCreativeVariant[];preview_count:number}|null;
  ad_id:string; platform:AdPlatform; advertiser:string; advertiser_id:string|null;
  body:string; headline:string; format:string|null; started_at:string|null; ended_at:string|null;
  status:string; publisher_platforms:string[]; source_url?:string|null; identity_status:string;
  first_impression_at?:string|null; latest_impression_at?:string|null;
  first_seen:string; last_seen:string;
}
export interface AdIntelligence {
  domain:string; ads:PublicAdEvidence[]; total:number; matching_records?:number; counts:Record<AdPlatform,number>;
  summary?:{collected:number;previews:number;formats:{name:string;count:number}[];timeline:{month:string;count:number}[];first_reported:string|null;latest_reported:string|null};
  creative_research?:{configured:boolean;manual_only:boolean;batch_limit:number};
  changes:{platform:AdPlatform;ad_id:string;kind:string;recorded_at:string}[];
  collections:{platform:AdPlatform;origin:string;recorded_at:string;records:number;context:{query?:string;countries?:string[];has_more?:boolean;start?:number}}[];
  connections:Record<AdPlatform,{token_saved:boolean;live_api_verified:boolean;last_verified_at:string|null;error:string|null;direct_refresh:boolean}>;
  coverage:Record<AdPlatform,string>; can_edit:boolean; next_offset:number|null;
}
export function fetchAdIntelligence(domain:string,platform:string,q:string,offset:number):Promise<AdIntelligence> {
  return productGet('/v1/ad-intelligence?'+new URLSearchParams({domain,platform,q,offset:String(offset),grouped:'1',visuals_only:'1'}));
}
export function importAdEvidence(domain:string,platform:AdPlatform,payload:unknown):Promise<{received:number;first_observed:number;changed:number}> {
  return connectorPost('/v1/ad-intelligence/import',{domain,platform,payload});
}
export function saveAdLibraryToken(platform:AdPlatform,token:string,disconnect=false):Promise<{saved:boolean}> {
  return connectorPost('/v1/ad-intelligence/connection',{platform,token,disconnect});
}
export function collectAdLibraryPage(options:{domain:string;platform:AdPlatform;query:string;country?:string;page_id?:string;after?:string;start?:number}):Promise<{received:number;next_cursor?:string|null;next_start?:number|null}> {
  return connectorPost('/v1/ad-intelligence/refresh',options);
}

export function refreshAdCreatives(domain:string):Promise<{complete:number;previews:number;requested:number;review_required:number}> {return connectorPost('/v1/ad-intelligence/creatives/refresh',{domain,limit:6})}
export function saveCreativeResearchToken(token:string):Promise<{saved:boolean}> {return connectorPost('/v1/ad-intelligence/creative-connection',{token})}

export interface CreativeOverview {
 brands:{domain:string;name:string;collected:number;images:number}[];
 ads:PublicAdEvidence[];total:number;matching_records:number;matching_brands:number;next_offset:number|null;
 summary:{researched_accounts:number;brands_with_images:number;collected_ads:number;ads_with_images:number;visual_groups:number};
}
export function fetchCreativeOverview(params:Record<string,string>):Promise<CreativeOverview>{return productGet('/v1/ad-intelligence/overview?'+new URLSearchParams(params))}

export interface ConversionDestination {
  id: string;
  platform: 'google' | 'meta' | 'linkedin';
  kind: 'conversion' | 'audience';
  name: string;
  target: string;
  outcome: string | null;
}
export interface ConversionReceipt {
  line: number;
  state: string;
  message: string;
  outcome?: string | null;
  consent: string;
  matched_by: string;
  occurred_at?: string | null;
  value: number | null;
  currency: string | null;
  reference?: string;
  check_after?: string;
  updated_at?: string;
  lag_days?: number | null;
}
export type ConversionMatching = 'automatic' | 'gclid' | 'email';
export interface ConversionBatch {
  id: string;
  created: string;
  operation: 'conversion' | 'add' | 'remove';
  mode: 'review' | 'live';
  assigned: boolean;
  review_policy?: {outcome?: string | null; matching?: ConversionMatching; max_click_age?: number | null};
  destination: ConversionDestination;
  counts: Record<string, number>;
}
export interface ConversionWorkspace {
  can_manage: boolean;
  live_enabled: boolean;
  destinations: ConversionDestination[];
  batches: ConversionBatch[];
  templates: Record<ConversionBatch['operation'], string>;
  receipt_summary: {since: string; operations: Record<ConversionBatch['operation'], Record<string, number>>} | null;
}
export type ConversionBatchDetail = ConversionBatch & {rows: ConversionReceipt[]};
export type ConversionSimulation = {
  platform: ConversionDestination['platform'];
  operation: ConversionBatch['operation'];
  as_of: string;
  rows: ConversionReceipt[];
  counts: Record<string, number>;
};
export function getConversionWorkspace(): Promise<ConversionWorkspace> {
  return productGet('/v1/conversions');
}
export function getConversionBatch(id: string): Promise<ConversionBatchDetail> {
  return productGet('/v1/conversions?' + new URLSearchParams({batch: id}));
}
export function runConversionAction<T>(input: Record<string, unknown>): Promise<T> {
  return connectorPost('/v1/conversions', input);
}

export async function reviewConversionFile(file: File, options: {
  target?: string;
  platform: ConversionDestination['platform'];
  operation: ConversionBatch['operation'];
  expected_outcome?: string;
  matching?: ConversionMatching;
  max_click_age?: number | null;
}): Promise<ConversionBatchDetail> {
  if (file.size > 500_000) throw new Error('Choose a CSV file under 500 KB.');
  return runConversionAction({action: 'review', ...options, csv: await file.text()});
}

export function conversionBatchLink(id: string, view: 'trace' | 'history'): string {
  const params = new URLSearchParams(view === 'trace'
    ? {conversion_trace: id} : {conversion_view: 'history', batch: id});
  return `/?${params}#conversions`;
}

export interface PlaybookSkill {
  uri: string;
  frontmatter: {name: string; description: string};
  resources: Array<{uri: string; digest: string; size: number}>;
}
export interface MarketoPlaybookBinding {
  skill: string;
  skill_uri: string;
  skill_digest: string;
  ready: boolean;
  bound: boolean;
  missing: string[];
  tools: Record<string, string>;
  tool_digest: string;
}
export interface PlaybookRun {
  run_id: string;
  demand_unit_key: string;
  marketo_list_id: number;
  action: string;
  requested_count: number;
  applied_count: number;
  skipped_count: number;
  added_count?: number;
  removed_count?: number;
  status?: string;
  transport?: 'mcp' | 'legacy';
  skill_digest?: string;
  completed_at: string;
}
export const fetchPlaybookSkills = () => productGet('/v1/playbook-skills') as Promise<{
  skills: PlaybookSkill[]; marketo: MarketoPlaybookBinding; procedure: string; can_approve: boolean;
}>;
export const approvePlaybookSkill = (skill_digest: string, tool_digest: string) =>
  connectorPost('/v1/playbook-skills/approve', {skill_digest, tool_digest}) as Promise<MarketoPlaybookBinding>;
export const fetchPlaybookRuns = (demandUnitKey: string) => productGet('/v1/audience-playbook/runs?' + new URLSearchParams({
  demand_unit_key: demandUnitKey,
})) as Promise<{runs: PlaybookRun[]}>;
