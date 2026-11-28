import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  KeyRound,
  ListChecks,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { ActiveNavTab } from '../types';
import { OperationsInstructions, type InstructionProfile } from './OperationsInstructions';
import {
  OperationsAgentBoard,
  extractRecordedSubagents,
  type RecordedSubagent,
  type WorkflowSkillScope,
  type WorkspaceSkill,
} from './OperationsAgentBoard';

type Fact = {
  field: string;
  value: string;
  source_url: string;
  quote: string;
  evidence_sequence: number;
};

type Report = {
  facts?: Fact[];
  summary: string;
  proposal: string;
  outcome: string;
  evidence_sequences: number[];
  subagents?: RecordedSubagent[];
};

type Job = {
  id: string;
  workflow: string;
  target: string;
  status: string;
  created_at?: string | null;
  updated_at: string;
  completed_at?: string | null;
  last_error?: string;
  skill_id?: string | null;
  skill_name?: string | null;
  skill_revision?: number | null;
  result?: {
    report?: Report;
    usage?: { model_calls?: number; total_tokens?: number };
    provider_receipt?: { status?: string; confirmed_at?: string | null; summary?: string } | null;
    subagents?: RecordedSubagent[];
  };
};

type Step = {
  sequence: number;
  tool: string;
  status: string;
  created_at?: string | null;
  completed_at?: string | null;
  updated_at?: string | null;
  timestamp?: string | null;
  result: Record<string, unknown>;
};

type OperationsState = {
  api_enabled?: boolean;
  instructions: Record<string, InstructionProfile>;
  research_configured: boolean;
  enabled: boolean;
  configured: boolean;
  installed: boolean;
  worker_healthy: boolean;
  state: string;
  workflows: string[];
  automatic_workflows: string[];
  workflow_skills?: Record<string, WorkflowSkillScope>;
  targets: Record<string, Array<{ id: string; label: string }>>;
  jobs: Job[];
  policy: { enabled: boolean; workflows: string[]; revision: number };
};

type DeskTab = 'inbox' | 'board' | 'triggers' | 'instructions';
type StatusFilter = 'all' | 'draft' | 'active' | 'paused' | 'completed' | 'review' | 'failed';

const WORKFLOW_NAMES: Record<string, string> = {
  'connector-review': 'MCP connection review',
  'sync-investigation': 'Investigate a failed delivery',
  'customer-onboarding': 'Review imported data',
  'company-enrichment': 'Research company evidence',
  'configuration-analysis': 'Analyze scoring configuration',
  'people-enrichment': 'Research public professional roles',
};

const STEP_NAMES: Record<string, string> = {
  dm_operation_context: 'Job evidence',
  dm_connector_inspect: 'Connection inspection',
  dm_analyze_data: 'Registered analysis',
  dm_extract_sources: 'Source extraction',
  dm_research_people: 'Professional role evidence',
  dm_research_company: 'Company source evidence',
  dm_configuration_preview: 'Configuration preview',
  dm_operation_submit: 'Validated report',
};

const SKILLS = [
  {
    id: 'sync-investigation',
    title: 'Delivery investigation',
    text: 'Find delivery blockers and prepare a repair proposal.',
    icon: Wrench,
    steps: ['Read context', 'Inspect evidence', 'Analyze issues', 'Report findings'],
  },
  {
    id: 'connector-review',
    title: 'MCP connection review',
    text: 'Inspect approved read tools and investigate connected data.',
    icon: Wrench,
    steps: ['Read context', 'Inspect tools', 'Review evidence', 'Report findings'],
  },
  {
    id: 'customer-onboarding',
    title: 'Data onboarding',
    text: 'Check imported data quality and scoring readiness.',
    icon: FileCheck2,
    steps: ['Read context', 'Inspect imports', 'Check readiness', 'Report findings'],
  },
  {
    id: 'company-enrichment',
    title: 'Company research',
    text: 'Search, extract, and cite public company evidence.',
    icon: Search,
    steps: ['Read context', 'Search sources', 'Extract evidence', 'Propose facts'],
  },
  {
    id: 'configuration-analysis',
    title: 'Scoring analysis',
    text: 'Analyze score distribution and preview configuration changes.',
    icon: SlidersHorizontal,
    steps: ['Read context', 'Analyze scores', 'Preview draft', 'Report findings'],
  },
  {
    id: 'people-enrichment',
    title: 'Professional roles',
    text: 'Research public names and job titles for review.',
    icon: Users,
    steps: ['Read context', 'Search sources', 'Extract evidence', 'Propose facts'],
  },
] as const;

async function read<T>(path: string): Promise<T> {
  const response = await fetch(path, { credentials: 'include' });
  if (!response.ok) throw new Error('Operations Desk status could not load.');
  return response.json();
}

async function mutate<T = Record<string, unknown>>(path: string, body: unknown): Promise<T> {
  const session = await read<{ csrf_token: string }>('/v1/auth/me');
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': session.csrf_token },
    body: JSON.stringify(body),
  });
  let value: Record<string, unknown> = {};
  try {
    value = await response.json();
  } catch {
    value = {};
  }
  if (!response.ok) {
    const message =
      typeof value.error === 'string' && value.error
        ? value.error
        : 'Operations Desk request was rejected.';
    throw new Error(message);
  }
  return value as T;
}

function formatStamp(value?: string | null): string {
  if (!value) return 'Not recorded';
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return 'Not recorded';
  return new Date(parsed).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatStatusLabel(status?: string | null): string {
  if (!status) return 'Unknown';
  const normalized = status.toLowerCase();
  if (normalized === 'draft') return 'Draft';
  if (normalized === 'paused') return 'Paused';
  if (normalized === 'awaiting_review') return 'Awaiting review';
  if (normalized === 'succeeded' || normalized === 'completed') return 'Completed';
  if (normalized === 'failed') return 'Failed';
  if (normalized === 'blocked') return 'Held / blocked';
  if (normalized === 'cancelled' || normalized === 'canceled') return 'Cancelled';
  if (normalized === 'queued') return 'Queued';
  if (normalized === 'running') return 'Running';
  return status.replaceAll('_', ' ');
}

function statusTextTone(status?: string | null): string {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'failed') return 'text-[#b91c1c]';
  if (normalized === 'paused' || normalized === 'blocked' || normalized === 'awaiting_review')
    return 'text-[#b45309]';
  if (normalized === 'succeeded' || normalized === 'completed') return 'text-[#15803d]';
  if (normalized === 'running' || normalized === 'queued') return 'text-[#1d4ed8]';
  return 'text-[#475569]';
}

function hasPendingProposal(job?: Job | null): boolean {
  if (!job) return false;
  const report = job.result?.report;
  return Boolean(
    job.status === 'awaiting_review' ||
      (report?.proposal && report.proposal.trim().length > 0) ||
      (report?.facts && report.facts.length > 0)
  );
}

function workflowNextTab(workflow?: string): { tab: ActiveNavTab; label: string } {
  if (workflow === 'connector-review') return { tab: 'CONNECTORS', label: 'Review Connections' };
  if (workflow === 'configuration-analysis') return { tab: 'RULES', label: 'Open Scoring Studio' };
  if (workflow === 'sync-investigation') return { tab: 'SIGNALS', label: 'Open Playbooks' };
  return { tab: 'DECISION_OPS', label: 'Open Decision Inbox' };
}

export function OperationsJobsPanel({
  light,
  onNavigateTab,
}: {
  light: boolean;
  onNavigateTab?: (tab: ActiveNavTab) => void;
}) {
  const [state, setState] = useState<OperationsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [owner, setOwner] = useState(false);
  const [workflow, setWorkflow] = useState('sync-investigation');
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [target, setTarget] = useState('');
  const [targetSearch, setTargetSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [skills, setSkills] = useState<WorkspaceSkill[]>([]);
  const [skillsCanEdit, setSkillsCanEdit] = useState(false);
  const [skillsLoaded, setSkillsLoaded] = useState(false);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [skillsUnavailable, setSkillsUnavailable] = useState(false);
  const [skillsError, setSkillsError] = useState('');

  const [tab, setTab] = useState<DeskTab>('inbox');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [workflowFilter, setWorkflowFilter] = useState<string>('all');
  const [runSearch, setRunSearch] = useState('');
  const [showAllRuns, setShowAllRuns] = useState(false);

  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [detail, setDetail] = useState<{ job: Job; steps: Step[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [draftDirty, setDraftDirty] = useState(false);

  const inspectorRef = useRef<HTMLDivElement | null>(null);
  const newCaseRef = useRef<HTMLElement | null>(null);
  const workflowSelectRef = useRef<HTMLSelectElement | null>(null);
  const targetSelectRef = useRef<HTMLSelectElement | null>(null);

  async function refresh() {
    const next = await read<OperationsState>('/v1/operations/status');
    setState(next);
    setUnavailable(false);
    return next;
  }

  const loadSkills = async (showSpinner = true) => {
    if (showSpinner) setSkillsLoading(true);
    try {
      const response = await fetch('/v1/operations/skills', { credentials: 'include' });
      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? 'Workspace skills endpoint (/v1/operations/skills) is not available on this server.'
            : 'Workspace skills could not load.'
        );
      }
      const data = (await response.json()) as {
        skills?: WorkspaceSkill[];
        can_edit?: boolean;
      };
      setSkills(Array.isArray(data?.skills) ? data.skills : []);
      setSkillsCanEdit(Boolean(data?.can_edit));
      setSkillsLoaded(true);
      setSkillsUnavailable(false);
      setSkillsError('');
    } catch (cause) {
      setSkillsUnavailable(true);
      setSkillsError(
        cause instanceof Error ? cause.message : 'Workspace skills API is unavailable.'
      );
    } finally {
      if (showSpinner) setSkillsLoading(false);
    }
  };

  const reloadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [next, me] = await Promise.all([
        read<OperationsState>('/v1/operations/status'),
        read<{ role: string }>('/v1/auth/me'),
      ]);
      setState(next);
      setOwner(me.role === 'owner');
      setUnavailable(false);
    } catch {
      setUnavailable(true);
      setError('Operations Desk status is currently unavailable. Retry or check workspace session.');
    } finally {
      setLoading(false);
    }
    void loadSkills(true);
  };

  useEffect(() => {
    let active = true;
    const load = async (initial = false) => {
      if (initial) setLoading(true);
      try {
        const [next, me] = await Promise.all([
          read<OperationsState>('/v1/operations/status'),
          read<{ role: string }>('/v1/auth/me'),
        ]);
        if (!active) return;
        setState(next);
        setOwner(me.role === 'owner');
        setUnavailable(false);
      } catch {
        if (!active) return;
        setUnavailable(true);
        if (initial) {
          setError('Operations Desk is currently unavailable.');
        }
      } finally {
        if (active && initial) setLoading(false);
      }
    };
    void load(true);
    void loadSkills(true);
    const timer = window.setInterval(() => void load(false), 8000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const policySignature = JSON.stringify(state?.policy.workflows || []);
  useEffect(() => {
    if (!draftDirty) setSelectedTriggers(JSON.parse(policySignature));
  }, [policySignature, draftDirty]);

  const jobs = state?.jobs || [];

  // Default to latest job if none selected yet
  useEffect(() => {
    if (!jobs.length) {
      setSelectedJobId('');
      setDetail(null);
      return;
    }
    if (!selectedJobId || !jobs.some((j) => j.id === selectedJobId)) {
      setSelectedJobId(jobs[0].id);
    }
  }, [jobs, selectedJobId]);

  // Fetch detailed checks & evidence whenever selectedJobId or its updated_at changes
  const activeJobSummary = useMemo(
    () => jobs.find((j) => j.id === selectedJobId) || null,
    [jobs, selectedJobId]
  );

  useEffect(() => {
    if (!activeJobSummary) {
      setDetail(null);
      setDetailError('');
      return;
    }
    let active = true;
    setDetailLoading(true);
    setDetailError('');
    read<{ job: Job; steps: Step[] }>(`/v1/operations/jobs/${encodeURIComponent(activeJobSummary.id)}`)
      .then((res) => {
        if (active) setDetail(res);
      })
      .catch((cause) => {
        if (active) {
          setDetail(null);
          setDetailError(
            cause instanceof Error ? cause.message : 'Run evidence could not be loaded.'
          );
        }
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeJobSummary?.id, activeJobSummary?.updated_at, activeJobSummary?.status]);

  const targets = state?.targets[workflow] || [];
  const filteredTargets = useMemo(
    () =>
      targets.filter((item) =>
        item.label.toLowerCase().includes(targetSearch.trim().toLowerCase())
      ),
    [targets, targetSearch]
  );
  const confirmedTarget = targets.some((item) => item.id === target)
    ? target
    : targets[0]?.id || '';
  const visibleTarget = filteredTargets.some((item) => item.id === confirmedTarget)
    ? confirmedTarget
    : filteredTargets[0]?.id || '';

  const ready = state?.state === 'running';
  const paused = state?.state === 'paused';
  const needsResearch = ['company-enrichment', 'people-enrichment'].includes(workflow);
  const activeSkill = SKILLS.find((item) => item.id === workflow) || SKILLS[0];

  const matchingPublishedSkills = useMemo(
    () => skills.filter((item) => item.status === 'published' && item.workflow === workflow),
    [skills, workflow]
  );
  const validSelectedSkillId = matchingPublishedSkills.some((item) => item.id === selectedSkillId)
    ? selectedSkillId
    : '';
  const canEditSkills = skillsLoaded ? skillsCanEdit : owner;

  const draftCount = useMemo(() => jobs.filter((j) => j.status === 'draft').length, [jobs]);
  const reviewCount = useMemo(() => jobs.filter((j) => hasPendingProposal(j)).length, [jobs]);
  const failedCount = useMemo(() => jobs.filter((j) => j.status === 'failed').length, [jobs]);
  const pausedCaseCount = useMemo(
    () => jobs.filter((j) => ['paused', 'blocked', 'awaiting_review'].includes(j.status)).length,
    [jobs]
  );
  const completedCount = useMemo(
    () => jobs.filter((j) => ['succeeded', 'completed'].includes(j.status)).length,
    [jobs]
  );
  const attentionCount = useMemo(
    () => jobs.filter((j) => ['failed', 'blocked'].includes(j.status)).length,
    [jobs]
  );
  const activeRunCount = useMemo(
    () => jobs.filter((j) => ['queued', 'running'].includes(j.status)).length,
    [jobs]
  );

  const filteredJobs = useMemo(() => {
    const q = runSearch.trim().toLowerCase();
    return jobs.filter((job) => {
      if (workflowFilter !== 'all' && job.workflow !== workflowFilter) return false;
      if (statusFilter === 'draft' && job.status !== 'draft') return false;
      if (statusFilter === 'active' && !['queued', 'running'].includes(job.status)) return false;
      if (
        statusFilter === 'paused' &&
        !['paused', 'blocked', 'awaiting_review'].includes(job.status)
      )
        return false;
      if (statusFilter === 'completed' && !['succeeded', 'completed'].includes(job.status))
        return false;
      if (statusFilter === 'review' && !hasPendingProposal(job)) return false;
      if (statusFilter === 'failed' && job.status !== 'failed') return false;
      if (!q) return true;
      const wfName = WORKFLOW_NAMES[job.workflow] || job.workflow;
      return (
        wfName.toLowerCase().includes(q) ||
        job.target.toLowerCase().includes(q) ||
        job.status.toLowerCase().includes(q) ||
        (job.last_error || '').toLowerCase().includes(q)
      );
    });
  }, [jobs, statusFilter, workflowFilter, runSearch]);

  const displayedJobs = showAllRuns ? filteredJobs : filteredJobs.slice(0, 10);

  async function act<T>(fn: () => Promise<T>, successNote?: string): Promise<T | undefined> {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const value = await fn();
      await refresh();
      if (successNote) setNotice(successNote);
      return value;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Operations Desk request failed.');
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  const upsertSkill = (nextSkill: WorkspaceSkill) => {
    setSkills((prev) => {
      const exists = prev.some((item) => item.id === nextSkill.id);
      if (!exists) return [nextSkill, ...prev];
      return prev.map((item) => (item.id === nextSkill.id ? nextSkill : item));
    });
  };

  const handleSaveSkill = async (payload: {
    action: 'save';
    workflow: string;
    name: string;
    description: string;
    instructions: string;
    id?: string;
    revision?: number;
  }): Promise<WorkspaceSkill> => {
    const res = (await mutate('/v1/operations/skills', payload)) as { skill?: WorkspaceSkill };
    if (!res?.skill) {
      throw new Error('Workspace skill save response did not include a skill record.');
    }
    upsertSkill(res.skill);
    void loadSkills(false);
    return res.skill;
  };

  const handlePublishSkill = async (payload: {
    action: 'publish';
    id: string;
    revision: number;
  }): Promise<WorkspaceSkill> => {
    const res = (await mutate('/v1/operations/skills', payload)) as { skill?: WorkspaceSkill };
    if (!res?.skill) {
      throw new Error('Workspace skill publish response did not include a skill record.');
    }
    upsertSkill(res.skill);
    void loadSkills(false);
    return res.skill;
  };

  const handleSelectWorkflowForNewCase = (workflowId: string, skillId?: string) => {
    setWorkflow(workflowId);
    setSelectedSkillId(skillId || '');
    setTarget('');
    setTargetSearch('');
    newCaseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      if (targetSelectRef.current && !targetSelectRef.current.disabled) {
        targetSelectRef.current.focus();
      } else {
        workflowSelectRef.current?.focus();
      }
    }, 80);
  };

  const handleInspectJobInInbox = (jobId: string) => {
    setSelectedJobId(jobId);
    setStatusFilter('all');
    setWorkflowFilter('all');
    setRunSearch('');
    setTab('inbox');
    window.setTimeout(() => {
      inspectorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleFilterInboxByWorkflow = (workflowId: string) => {
    setWorkflowFilter(workflowId);
    setStatusFilter('all');
    setRunSearch('');
    setTab('inbox');
  };

  const handleRunWorkflow = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready || !owner || busy || !visibleTarget || (needsResearch && !state?.research_configured))
      return;
    const payload: Record<string, unknown> = {
      workflow,
      target: visibleTarget,
      request_key: crypto.randomUUID(),
    };
    if (validSelectedSkillId) payload.skill_id = validSelectedSkillId;

    const created = (await act(
      () => mutate('/v1/operations/jobs', payload),
      `Started case: ${WORKFLOW_NAMES[workflow] || workflow} for ${visibleTarget}.`
    )) as { job?: { id?: string }; id?: string } | undefined;
    const createdId = created?.job?.id || created?.id;
    if (createdId) setSelectedJobId(createdId);
    if (created) {
      if (statusFilter !== 'all' && statusFilter !== 'active') setStatusFilter('all');
      if (workflowFilter !== 'all' && workflowFilter !== workflow) setWorkflowFilter('all');
      setTab('inbox');
    }
  };

  const handleSaveDraft = async () => {
    if (!owner || busy || !visibleTarget) return;
    const payload: Record<string, unknown> = {
      workflow,
      target: visibleTarget,
      request_key: crypto.randomUUID(),
      draft: true,
    };
    if (validSelectedSkillId) payload.skill_id = validSelectedSkillId;

    const created = (await act(
      () => mutate('/v1/operations/jobs', payload),
      `Saved draft case: ${WORKFLOW_NAMES[workflow] || workflow} for ${visibleTarget} (no model calls).`
    )) as { job?: { id?: string }; id?: string } | undefined;
    const createdId = created?.job?.id || created?.id;
    if (createdId) setSelectedJobId(createdId);
    if (created) {
      if (statusFilter !== 'all' && statusFilter !== 'draft') setStatusFilter('all');
      if (workflowFilter !== 'all' && workflowFilter !== workflow) setWorkflowFilter('all');
      setTab('inbox');
    }
  };

  const handleStartDraftCase = async (job: Job) => {
    const draftNeedsResearch = ['company-enrichment', 'people-enrichment'].includes(job.workflow);
    if (!ready || !owner || busy || (draftNeedsResearch && !state?.research_configured)) return;
    const started = (await act(
      () =>
        mutate('/v1/operations/jobs', {
          action: 'start',
          case_id: job.id,
        }),
      `Started case: ${WORKFLOW_NAMES[job.workflow] || job.workflow} for ${job.target}.`
    )) as { job?: { id?: string }; id?: string } | undefined;
    if (started) {
      const nextId = started?.job?.id || started?.id || job.id;
      setSelectedJobId(nextId);
      if (statusFilter === 'draft') setStatusFilter('all');
    }
  };

  const handleSelectRun = (job: Job) => {
    setSelectedJobId(job.id);
    if (window.innerWidth < 1024) {
      window.setTimeout(() => {
        inspectorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    }
  };

  const focusDecisionSettings = () => {
    const el = document.getElementById('decision-service-settings');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.querySelector<HTMLElement>('button[role="switch"]')?.focus();
      return;
    }
    if (onNavigateTab) onNavigateTab('AUTOMATION');
    else window.location.hash = '#automation';
  };

  const navigateSettings = (targetTab: ActiveNavTab, hash: string) => {
    if (onNavigateTab) {
      onNavigateTab(targetTab);
    } else {
      window.location.hash = hash;
    }
  };

  const tabs: Array<{ id: DeskTab; label: string; count?: number }> = [
    { id: 'inbox', label: 'Case Inbox', count: jobs.length },
    { id: 'board', label: 'Agent Board', count: SKILLS.length },
    { id: 'triggers', label: 'Automatic triggers' },
    { id: 'instructions', label: 'Instructions' },
  ];

  const decisionServiceOn: boolean | null = !state
    ? null
    : state.api_enabled !== undefined
      ? state.api_enabled
      : state.state === 'running'
        ? true
        : state.state === 'paused'
          ? false
          : null;

  const readinessChecks = useMemo(() => {
    if (!state) return [];
    const workerReady = Boolean(state.enabled && state.worker_healthy);
    const workerLabel = workerReady
      ? 'Online'
      : !state.enabled
        ? 'Worker off'
        : 'Worker offline';

    return [
      {
        id: 'decision-service',
        label: 'Decision service',
        ready: decisionServiceOn === true,
        unknown: decisionServiceOn === null,
        status:
          decisionServiceOn === true
            ? 'Enabled'
            : decisionServiceOn === false
              ? 'Decision service off'
              : 'Status unknown',
        detail:
          decisionServiceOn === false
            ? 'Manual runs also require the decision service enabled.'
            : decisionServiceOn === true
              ? 'Automatic and manual runs are permitted.'
              : 'Service status was not reported by the backend.',
      },
      {
        id: 'operations-model',
        label: 'Operations model',
        ready: Boolean(state.configured),
        unknown: false,
        status: state.configured ? 'Configured' : 'Operations model unconfigured',
        detail: state.configured
          ? 'Server-side operations model configuration is present.'
          : 'Configured on the workspace server; keys are never entered in this screen.',
      },
      {
        id: 'operations-runtime',
        label: 'Operations runtime',
        ready: Boolean(state.installed),
        unknown: false,
        status: state.installed ? 'Available' : 'Runtime unavailable',
        detail: state.installed
          ? 'Predefined workflow runtime is installed.'
          : 'The operations execution runtime is not available on this host.',
      },
      {
        id: 'operations-worker',
        label: 'Operations worker',
        ready: workerReady,
        unknown: false,
        status: workerLabel,
        detail: workerReady
          ? 'Worker heartbeat is healthy.'
          : !state.enabled
            ? 'The background operations worker is turned off.'
            : 'The operations worker is offline or not reporting healthy.',
      },
    ];
  }, [state, decisionServiceOn]);

  const inspectedJob = detail?.job || activeJobSummary;
  const inspectedReport = inspectedJob?.result?.report;
  const inspectedSteps = detail?.steps || [];
  const inspectedHasProposal = hasPendingProposal(inspectedJob);
  const inspectedUsage = inspectedJob?.result?.usage;
  const inspectedReceipt = inspectedJob?.result?.provider_receipt;
  const inspectedSubagents = useMemo(
    () => extractRecordedSubagents(inspectedJob),
    [inspectedJob]
  );

  const hasTechnicalDetails = Boolean(
    inspectedJob &&
      (inspectedJob.id ||
        inspectedJob.workflow ||
        inspectedUsage?.model_calls != null ||
        inspectedUsage?.total_tokens != null ||
        (inspectedReport?.evidence_sequences && inspectedReport.evidence_sequences.length > 0))
  );

  const deskStatusLabel = loading && !state
    ? 'Checking status…'
    : unavailable && !state
      ? 'Unavailable'
      : ready
        ? 'Ready'
        : paused
          ? 'Runs paused'
          : 'Setup required';

  const deskStatusTone = loading && !state
    ? 'text-[#64748b]'
    : unavailable && !state
      ? 'text-[#b91c1c]'
      : ready
        ? 'text-[#15803d]'
        : 'text-[#b45309]';

  const nextHandoff = workflowNextTab(inspectedJob?.workflow);

  return (
    <div className="space-y-5" aria-label="Operations Desk workbench">
      {/* Compact 12-Column Flat Ledger Strip (answers what can run and what needs attention) */}
      <section
        className="grid grid-cols-1 divide-y divide-[#e2e8f0] rounded-[10px] border border-[#e2e8f0] bg-white sm:grid-cols-12 sm:divide-x sm:divide-y-0"
        aria-label="Operations Desk status"
      >
        <div className="px-4 py-3 sm:col-span-3">
          <p className="text-[11px] font-medium text-[#64748b]">Desk readiness</p>
          <p className={`mt-0.5 text-sm font-semibold ${deskStatusTone}`}>{deskStatusLabel}</p>
          <p className="mt-0.5 text-[11px] text-[#64748b]">
            {unavailable
              ? 'Last snapshot shown'
              : paused
                ? 'Decision service off'
                : state?.policy.enabled
                  ? `${state.policy.workflows.length} automatic triggers on`
                  : 'Manual runs only'}
          </p>
        </div>

        <div className="px-4 py-3 tabular-nums sm:col-span-3">
          <p className="text-[11px] font-medium text-[#64748b]">Awaiting review</p>
          <p
            className={`mt-0.5 text-sm font-semibold ${
              reviewCount > 0 ? 'text-[#b45309]' : 'text-[#0f172a]'
            }`}
          >
            {state ? `${reviewCount.toLocaleString()} proposal${reviewCount === 1 ? '' : 's'}` : '—'}
          </p>
          <p className="mt-0.5 text-[11px] text-[#64748b]">Changes never auto-apply</p>
        </div>

        <div className="px-4 py-3 tabular-nums sm:col-span-3">
          <p className="text-[11px] font-medium text-[#64748b]">Failed or held</p>
          <p
            className={`mt-0.5 text-sm font-semibold ${
              attentionCount > 0 ? 'text-[#b91c1c]' : 'text-[#0f172a]'
            }`}
          >
            {state
              ? `${attentionCount.toLocaleString()} case${attentionCount === 1 ? '' : 's'}`
              : '—'}
          </p>
          <p className="mt-0.5 text-[11px] text-[#64748b]">Requires operator inspection</p>
        </div>

        <div className="px-4 py-3 tabular-nums sm:col-span-3">
          <p className="text-[11px] font-medium text-[#64748b]">Recent cases</p>
          <p className="mt-0.5 text-sm font-semibold text-[#0f172a]">
            {state ? `${jobs.length.toLocaleString()} recorded` : '—'}
          </p>
          <p className="mt-0.5 text-[11px] text-[#64748b]">
            {activeRunCount > 0 ? `${activeRunCount} currently active` : 'Bounded Case Inbox history'}
          </p>
        </div>
      </section>

      {/* Contextual Status Notices (Unavailable / Paused / Setup / Error / Notice) */}
      {unavailable && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#991b1b]"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p>
              <strong>Operations Desk service is unavailable.</strong>{' '}
              {state
                ? 'Showing the last loaded snapshot. Automatic retries continue in the background.'
                : 'Check your workspace session or try refreshing.'}
            </p>
          </div>
          <button
            type="button"
            className="dm-button"
            onClick={() => void reloadAll()}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Retry
          </button>
        </div>
      )}

      {error && !unavailable && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-[10px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#991b1b]"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            aria-label="Dismiss error"
            className="text-[#991b1b] hover:text-[#7f1d1d]"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-[10px] border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm text-[#166534]"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0" />
            {notice}
          </span>
          <button
            type="button"
            onClick={() => setNotice('')}
            aria-label="Dismiss notice"
            className="text-[#166534] hover:text-[#14532d]"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {state && !ready && (
        <div
          role="status"
          className="rounded-[10px] border border-[#fde68a] bg-[#fffbeb] px-4 py-4 text-sm text-[#92400e]"
        >
          <div className="flex items-start gap-2.5">
            <KeyRound size={16} className="mt-0.5 shrink-0 text-[#b45309]" />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-semibold text-[#78350f]">
                    {paused
                      ? 'Runs paused — decision service is off.'
                      : 'Setup required before starting new cases.'}
                  </p>
                  <p className="text-xs leading-relaxed text-[#92400e]">
                    {paused
                      ? 'Manual runs also require the decision service enabled. Recorded cases, evidence, reports, and workflow instructions remain readable.'
                      : 'Manual runs also require the decision service enabled alongside a configured operations model, available runtime, and online worker. No credentials or API keys are entered in this screen.'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {decisionServiceOn === false && (
                    <button
                      type="button"
                      className="dm-button dm-button-primary"
                      onClick={focusDecisionSettings}
                    >
                      Go to decision service settings
                    </button>
                  )}
                  <button
                    type="button"
                    className="dm-button"
                    onClick={() => navigateSettings('AUTOMATION', '#automation')}
                  >
                    Open Automation settings
                  </button>
                  <button
                    type="button"
                    className="dm-button"
                    onClick={() => navigateSettings('CONNECTORS', '#connections')}
                  >
                    Open Connections settings
                  </button>
                </div>
              </div>

              <ul
                className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
                aria-label="Operations readiness conditions"
              >
                {readinessChecks.map((check) => (
                  <li
                    key={check.id}
                    className="rounded-md border border-[#fde68a] bg-white px-3 py-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-[#475569]">{check.label}</span>
                      <span
                        className={`font-semibold ${
                          check.ready
                            ? 'text-[#15803d]'
                            : check.unknown
                              ? 'text-[#64748b]'
                              : 'text-[#b45309]'
                        }`}
                      >
                        {check.status}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-[#64748b]">{check.detail}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Top Primary Action Ledger Bar: New case (Predefined Workflow + Target) */}
      <section
        ref={newCaseRef}
        id="ops-desk-new-case"
        className="dm-card"
        aria-labelledby="ops-desk-runner-title"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e2e8f0] pb-4">
          <div>
            <h2 id="ops-desk-runner-title" className="text-base font-semibold text-[#0f172a]">
              New case
            </h2>
            <p className="mt-0.5 text-xs text-[#64748b]">
              A workspace owner can select a predefined workflow below to start a read-only case,
              with no new arbitrary agents or tools. {activeSkill.text}
            </p>
          </div>
          <ol
            className="hidden flex-wrap items-center gap-1.5 text-[11px] text-[#64748b] md:flex"
            aria-label="Workflow template sequence"
          >
            <li className="font-medium text-[#475569]">Template:</li>
            {activeSkill.steps.map((stepLabel, idx) => (
              <li key={stepLabel} className="inline-flex items-center gap-1">
                <span className="font-semibold tabular-nums text-[#0f172a]">{idx + 1}.</span>
                <span>{stepLabel}</span>
                {idx < activeSkill.steps.length - 1 && (
                  <ArrowRight size={11} className="text-[#94a3b8]" />
                )}
              </li>
            ))}
          </ol>
        </div>

        <form onSubmit={handleRunWorkflow} className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
            <label className="block md:col-span-3">
              <span className="block text-xs font-medium text-[#334155]">Workflow</span>
              <select
                ref={workflowSelectRef}
                className="dm-input mt-1.5 w-full"
                value={workflow}
                disabled={busy || !state}
                onChange={(e) => {
                  setWorkflow(e.target.value);
                  setSelectedSkillId('');
                  setTarget('');
                  setTargetSearch('');
                }}
              >
                {SKILLS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="block md:col-span-3">
              <span className="block text-xs font-medium text-[#334155]">
                Workspace skill <span className="font-normal text-[#64748b]">(optional)</span>
              </span>
              <select
                className="dm-input mt-1.5 w-full"
                value={validSelectedSkillId}
                disabled={busy || skillsUnavailable || !matchingPublishedSkills.length}
                aria-label="Published workspace skill for selected workflow"
                onChange={(e) => setSelectedSkillId(e.target.value)}
              >
                {skillsUnavailable ? (
                  <option value="">Skills API unavailable</option>
                ) : (
                  <>
                    <option value="">
                      {matchingPublishedSkills.length
                        ? 'None (built-in workflow)'
                        : 'No published skills for workflow'}
                    </option>
                    {matchingPublishedSkills.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} (rev {item.revision})
                      </option>
                    ))}
                  </>
                )}
              </select>
            </label>

            <label className="block md:col-span-3">
              <span className="block text-xs font-medium text-[#334155]">Workspace target</span>
              <select
                ref={targetSelectRef}
                className="dm-input mt-1.5 w-full"
                value={visibleTarget}
                onChange={(e) => setTarget(e.target.value)}
                disabled={busy || !state || !filteredTargets.length}
              >
                {filteredTargets.length ? (
                  filteredTargets.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label.replaceAll('_', ' ')}
                    </option>
                  ))
                ) : (
                  <option value="">
                    {!state
                      ? 'Loading targets…'
                      : targetSearch
                        ? 'No matching targets'
                        : workflow === 'sync-investigation'
                          ? 'No failed delivery jobs'
                          : 'No eligible targets available'}
                  </option>
                )}
              </select>
            </label>

            <div className="flex flex-wrap items-center gap-2 md:col-span-3 md:justify-end">
              <button
                type="button"
                className={
                  !ready
                    ? 'dm-button dm-button-primary flex-1 justify-center whitespace-nowrap sm:flex-initial'
                    : 'dm-button flex-1 justify-center whitespace-nowrap sm:flex-initial'
                }
                disabled={!owner || busy || !visibleTarget}
                onClick={() => void handleSaveDraft()}
              >
                Save draft
              </button>
              <button
                type="submit"
                className={
                  ready
                    ? 'dm-button dm-button-primary flex-1 justify-center whitespace-nowrap sm:flex-initial'
                    : 'dm-button flex-1 justify-center whitespace-nowrap sm:flex-initial'
                }
                disabled={
                  !ready ||
                  !owner ||
                  busy ||
                  !visibleTarget ||
                  (needsResearch && !state?.research_configured)
                }
              >
                {busy ? <RefreshCw size={15} className="animate-spin" /> : <ArrowRight size={15} />}
                Start case
              </button>
            </div>
          </div>

          {targets.length > 8 && (
            <div className="grid grid-cols-1 md:grid-cols-12">
              <label className="block md:col-span-3 md:col-start-7">
                <span className="sr-only">Filter workspace targets</span>
                <input
                  type="search"
                  className="dm-input h-8 w-full text-xs"
                  value={targetSearch}
                  onChange={(e) => setTargetSearch(e.target.value)}
                  placeholder="Filter workspace targets…"
                />
              </label>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748b]">
            <div className="space-y-0.5">
              {paused && (
                <p className="text-[#b45309]">
                  Runs paused — manual runs also require the decision service enabled. Owners can
                  still Save draft with no model calls.
                </p>
              )}
              {state && !ready && !paused && (
                <p className="text-[#475569]">
                  Owners can Save draft while setup is pending; drafts make no model calls.
                </p>
              )}
              {!owner && state && (
                <p className="text-[#475569]">
                  Workspace owner permission is required to save drafts, start cases, cancel active
                  runs, or edit triggers.
                </p>
              )}
              {state && !targets.length && (
                <p>
                  {workflow === 'sync-investigation'
                    ? 'There are no failed delivery jobs to investigate right now. Choose another workflow to continue.'
                    : 'This workflow needs eligible workspace records before it can run.'}
                </p>
              )}
              {workflow === 'people-enrichment' && (
                <p>
                  Only demand units with positive coverage are eligible. Public names and job titles
                  remain candidates for human review.
                </p>
              )}
              {ready && needsResearch && !state?.research_configured && (
                <p className="text-[#b45309]">
                  Connect the public research service in Connections before running this workflow.
                </p>
              )}
            </div>

            <button
              type="button"
              className="dm-text-button whitespace-nowrap shrink-0"
              onClick={() => setTab('instructions')}
            >
              Edit instructions for {activeSkill.title.toLowerCase()}
            </button>
          </div>
        </form>
      </section>

      {/* Main Desk Surface with Accessible Tabs */}
      <section className="dm-card !p-0 overflow-hidden" aria-label="Operations Desk ledger">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0] px-5 py-3">
          <div
            className="inline-flex flex-wrap items-center gap-1"
            role="tablist"
            aria-label="Operations Desk views"
          >
            {tabs.map((item, index) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={`ops-desk-tab-${item.id}`}
                  aria-selected={active}
                  aria-controls={`ops-desk-panel-${item.id}`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => setTab(item.id)}
                  onKeyDown={(event) => {
                    let next = index;
                    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
                    else if (event.key === 'ArrowLeft')
                      next = (index + tabs.length - 1) % tabs.length;
                    else if (event.key === 'Home') next = 0;
                    else if (event.key === 'End') next = tabs.length - 1;
                    else return;
                    event.preventDefault();
                    setTab(tabs[next].id);
                    document.getElementById(`ops-desk-tab-${tabs[next].id}`)?.focus();
                  }}
                  className={`whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1d4ed8] ${
                    active
                      ? 'bg-[#0f172a] text-white'
                      : 'text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]'
                  }`}
                >
                  {item.label}
                  {item.count != null && state ? (
                    <span className={`ml-1.5 ${active ? 'text-[#cbd5e1]' : 'text-[#94a3b8]'}`}>
                      {item.count.toLocaleString()}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#475569] hover:text-[#0f172a]"
            onClick={() => void reloadAll()}
            disabled={loading || busy}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* TAB 1: CASE INBOX (Desktop Queue + Evidence Inspector; Mobile Stacked Zero-Overflow) */}
        <div
          role="tabpanel"
          id="ops-desk-panel-inbox"
          aria-labelledby="ops-desk-tab-inbox"
          hidden={tab !== 'inbox'}
        >
          {loading && !state ? (
            <div className="space-y-3 p-6" role="status" aria-label="Loading recorded cases">
              <div className="dm-skeleton h-12 w-full" />
              <div className="dm-skeleton h-12 w-full" />
              <div className="dm-skeleton h-12 w-4/5" />
            </div>
          ) : (
            <>
              {/* Visual Case Inbox Status Filter Chips */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 sm:px-5">
                <div
                  className="flex flex-wrap items-center gap-1.5"
                  role="group"
                  aria-label="Filter cases by status"
                >
                  {(
                    [
                      {
                        id: 'all' as const,
                        label: 'All',
                        count: jobs.length,
                        dot: null,
                        activeClass: 'border-[#0f172a] bg-[#0f172a] text-white',
                        countClass: 'bg-white/15 text-white',
                      },
                      {
                        id: 'draft' as const,
                        label: 'Draft',
                        count: draftCount,
                        dot: 'bg-[#64748b]',
                        activeClass: 'border-[#475569] bg-[#f1f5f9] text-[#0f172a]',
                        countClass: 'bg-[#e2e8f0] text-[#0f172a]',
                      },
                      {
                        id: 'active' as const,
                        label: 'Active',
                        count: activeRunCount,
                        dot: 'bg-[#2563eb]',
                        activeClass: 'border-[#93c5fd] bg-[#eff6ff] text-[#1d4ed8]',
                        countClass: 'bg-[#dbeafe] text-[#1d4ed8]',
                      },
                      {
                        id: 'paused' as const,
                        label: 'Paused',
                        count: pausedCaseCount,
                        dot: 'bg-[#d97706]',
                        activeClass: 'border-[#fcd34d] bg-[#fffbeb] text-[#92400e]',
                        countClass: 'bg-[#fde68a] text-[#78350f]',
                      },
                      {
                        id: 'completed' as const,
                        label: 'Completed',
                        count: completedCount,
                        dot: 'bg-[#16a34a]',
                        activeClass: 'border-[#86efac] bg-[#f0fdf4] text-[#166534]',
                        countClass: 'bg-[#dcfce7] text-[#166534]',
                      },
                      {
                        id: 'review' as const,
                        label: 'Awaiting review',
                        count: reviewCount,
                        dot: 'bg-[#b45309]',
                        activeClass: 'border-[#fcd34d] bg-[#fffbeb] text-[#92400e]',
                        countClass: 'bg-[#fde68a] text-[#78350f]',
                      },
                      {
                        id: 'failed' as const,
                        label: 'Failed',
                        count: failedCount,
                        dot: 'bg-[#dc2626]',
                        activeClass: 'border-[#fca5a5] bg-[#fef2f2] text-[#991b1b]',
                        countClass: 'bg-[#fee2e2] text-[#991b1b]',
                      },
                    ]
                  ).map((chip) => {
                    const active = statusFilter === chip.id;
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          setStatusFilter(
                            active && chip.id !== 'all' ? 'all' : chip.id
                          )
                        }
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1d4ed8] ${
                          active
                            ? chip.activeClass
                            : 'border-[#e2e8f0] bg-white text-[#475569] hover:border-[#cbd5e1] hover:text-[#0f172a]'
                        }`}
                      >
                        {chip.dot && (
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${chip.dot}`}
                            aria-hidden="true"
                          />
                        )}
                        <span>{chip.label}</span>
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
                            active
                              ? chip.countClass
                              : 'bg-[#f1f5f9] text-[#64748b]'
                          }`}
                        >
                          {chip.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {statusFilter !== 'all' && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-[#1d4ed8] hover:underline"
                    onClick={() => setStatusFilter('all')}
                  >
                    Reset status
                  </button>
                )}
              </div>

              {!jobs.length ? (
                <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
                  <ListChecks size={26} className="text-[#94a3b8]" />
                  <h3 className="text-sm font-semibold text-[#0f172a]">No recorded cases yet</h3>
                  <p className="max-w-md text-xs leading-relaxed text-[#64748b]">
                    Select a predefined workflow and workspace target in New case above to save a
                    draft or start a case. Recorded checks, timestamped evidence, reports, and
                    proposed changes will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,0.92fr)_minmax(0,1.4fr)]">
                  {/* Left Column: Filterable Case Queue */}
                  <div className="min-w-0 border-b border-[#e2e8f0] lg:border-b-0 lg:border-r">
                    <div className="space-y-2.5 border-b border-[#e2e8f0] bg-[#f8fafc] p-4">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <label className="block">
                          <span className="sr-only">Filter cases by workflow</span>
                      <select
                        className="dm-input h-9 w-full text-xs"
                        value={workflowFilter}
                        onChange={(e) => setWorkflowFilter(e.target.value)}
                      >
                        <option value="all">All workflows</option>
                        {SKILLS.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="relative block">
                      <span className="sr-only">Search cases</span>
                      <Search
                        size={13}
                        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                      />
                      <input
                        type="search"
                        className="dm-input dm-search-input h-9 w-full text-xs"
                        placeholder="Target or error…"
                        value={runSearch}
                        onChange={(e) => setRunSearch(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="flex items-center justify-between text-[11px] tabular-nums text-[#64748b]">
                    <span>
                      Showing {displayedJobs.length} of {filteredJobs.length} matching cases
                    </span>
                    {(statusFilter !== 'all' || workflowFilter !== 'all' || runSearch) && (
                      <button
                        type="button"
                        className="font-semibold text-[#1d4ed8] hover:underline"
                        onClick={() => {
                          setStatusFilter('all');
                          setWorkflowFilter('all');
                          setRunSearch('');
                        }}
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </div>

                {displayedJobs.length ? (
                  <ul className="divide-y divide-[#e2e8f0]" aria-label="Recorded cases">
                    {displayedJobs.map((job) => {
                      const isSelected = job.id === inspectedJob?.id;
                      const proposalPending = hasPendingProposal(job);
                      const canCancel = owner && ['draft', 'queued', 'running'].includes(job.status);

                      return (
                        <li
                          key={job.id}
                          className={`transition-colors ${
                            isSelected ? 'bg-[#eff6ff]/70' : 'bg-white hover:bg-[#f8fafc]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 px-4 py-3.5">
                            <button
                              type="button"
                              aria-current={isSelected ? 'true' : undefined}
                              onClick={() => handleSelectRun(job)}
                              className="min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4ed8]"
                            >
                              <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <span
                                  className={`truncate text-sm font-semibold ${
                                    isSelected ? 'text-[#1d4ed8]' : 'text-[#0f172a]'
                                  }`}
                                >
                                  {WORKFLOW_NAMES[job.workflow] || job.workflow.replaceAll('-', ' ')}
                                </span>
                                <span
                                  className={`shrink-0 text-xs font-semibold ${statusTextTone(job.status)}`}
                                >
                                  {formatStatusLabel(job.status)}
                                </span>
                              </div>
                              <p className="mt-0.5 break-all text-xs text-[#475569]">
                                {job.target || 'Target not recorded'}
                              </p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] tabular-nums text-[#64748b]">
                                <span>{formatStamp(job.updated_at)}</span>
                                {job.status === 'draft' && (
                                  <span>· No model calls</span>
                                )}
                                {proposalPending && (
                                  <span className="font-semibold text-[#b45309]">
                                    · Proposal awaiting review
                                  </span>
                                )}
                              </div>
                              {job.last_error && (
                                <p className="mt-1 break-words text-xs text-[#b91c1c]">
                                  {job.last_error}
                                </p>
                              )}
                            </button>

                            {canCancel && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void act(
                                    () =>
                                      mutate(
                                        `/v1/operations/jobs/${encodeURIComponent(job.id)}/cancel`,
                                        {}
                                      ),
                                    job.status === 'draft'
                                      ? 'Draft case cancelled.'
                                      : 'Cancellation requested for active run.'
                                  )
                                }
                                className="shrink-0 text-xs font-semibold text-[#b91c1c] hover:underline"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="p-8 text-center text-xs text-[#64748b]">
                    No cases match these filters.
                  </div>
                )}

                {filteredJobs.length > 10 && (
                  <div className="border-t border-[#e2e8f0] bg-[#f8fafc] px-4 py-2.5">
                    <button
                      type="button"
                      className="dm-text-button text-xs"
                      onClick={() => setShowAllRuns((v) => !v)}
                    >
                      {showAllRuns
                        ? 'Show latest 10 cases'
                        : `Show all ${filteredJobs.length.toLocaleString()} matching cases`}
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Selected-Case Evidence Inspector */}
              <div
                ref={inspectorRef}
                className="min-w-0 bg-[#f8fafc]/45 p-5 sm:p-6"
                aria-live="polite"
                aria-label="Selected case evidence inspector"
              >
                {!inspectedJob ? (
                  <div className="flex h-full min-h-[260px] flex-col items-center justify-center text-center text-xs text-[#64748b]">
                    <p>Select a case from the inbox to inspect checks, evidence, reports, and proposals.</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Case Title & Actions */}
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e2e8f0] pb-4">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#64748b]">Selected case</p>
                        <h3 className="mt-0.5 text-lg font-semibold tracking-tight text-[#0f172a]">
                          {WORKFLOW_NAMES[inspectedJob.workflow] ||
                            inspectedJob.workflow.replaceAll('-', ' ')}
                        </h3>
                        <p className="mt-0.5 break-all text-xs text-[#475569] tabular-nums">
                          Target:{' '}
                          <strong className="font-medium text-[#0f172a]">
                            {inspectedJob.target || 'Not recorded'}
                          </strong>{' '}
                          · Updated {formatStamp(inspectedJob.updated_at)}
                          {(inspectedJob.skill_name || inspectedJob.skill_id) && (
                            <>
                              {' '}
                              · Workspace skill:{' '}
                              <strong className="font-medium text-[#0f172a]">
                                {inspectedJob.skill_name || inspectedJob.skill_id}
                              </strong>
                              {inspectedJob.skill_revision != null
                                ? ` (rev ${inspectedJob.skill_revision})`
                                : ''}
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {inspectedJob.status === 'draft' && (
                          <button
                            type="button"
                            className="dm-button dm-button-primary"
                            disabled={
                              !ready ||
                              !owner ||
                              busy ||
                              (['company-enrichment', 'people-enrichment'].includes(
                                inspectedJob.workflow
                              ) &&
                                !state?.research_configured)
                            }
                            onClick={() => void handleStartDraftCase(inspectedJob)}
                          >
                            {busy ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <ArrowRight size={14} />
                            )}
                            Start case
                          </button>
                        )}
                        {owner && ['draft', 'queued', 'running'].includes(inspectedJob.status) && (
                          <button
                            type="button"
                            className="dm-button"
                            disabled={busy}
                            onClick={() =>
                              void act(
                                () =>
                                  mutate(
                                    `/v1/operations/jobs/${encodeURIComponent(inspectedJob.id)}/cancel`,
                                    {}
                                  ),
                                inspectedJob.status === 'draft'
                                  ? 'Draft case cancelled.'
                                  : 'Cancellation requested for this run.'
                              )
                            }
                          >
                            {inspectedJob.status === 'draft' ? 'Cancel draft' : 'Cancel run'}
                          </button>
                        )}
                      </div>
                    </div>

                    {inspectedJob.status === 'draft' && (() => {
                      const draftNeedsResearch = [
                        'company-enrichment',
                        'people-enrichment',
                      ].includes(inspectedJob.workflow);
                      const blockReasons: string[] = [];
                      if (!owner) {
                        blockReasons.push('Workspace owner permission is required to start a case.');
                      }
                      if (!state) {
                        blockReasons.push('Operations Desk readiness status is unavailable.');
                      } else {
                        if (paused || decisionServiceOn === false) {
                          blockReasons.push(
                            'Runs paused — decision service is off (manual runs also require the decision service enabled).'
                          );
                        }
                        if (!state.configured) {
                          blockReasons.push('Operations model is unconfigured.');
                        }
                        if (!state.installed) {
                          blockReasons.push('Operations runtime is unavailable.');
                        }
                        if (!state.enabled) {
                          blockReasons.push('Operations worker is off.');
                        } else if (!state.worker_healthy) {
                          blockReasons.push('Operations worker is offline.');
                        }
                        if (draftNeedsResearch && !state.research_configured) {
                          blockReasons.push(
                            'Public research connection is not configured in Connections.'
                          );
                        }
                        if (!ready && blockReasons.length === 0) {
                          blockReasons.push('Run readiness checks have not passed yet.');
                        }
                      }

                      return (
                        <div
                          role="status"
                          className="rounded-lg border border-[#e2e8f0] bg-white p-4 text-xs text-[#334155]"
                        >
                          <p className="font-semibold text-[#0f172a]">
                            Draft case saved — no model calls have been made.
                          </p>
                          {blockReasons.length > 0 ? (
                            <div className="mt-2 space-y-1 text-[#92400e]">
                              <p className="font-medium text-[#78350f]">
                                Start case is disabled until run readiness checks pass:
                              </p>
                              <ul className="list-disc space-y-0.5 pl-4">
                                {blockReasons.map((reason) => (
                                  <li key={reason}>{reason}</li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <p className="mt-1 text-[#475569]">
                              Readiness checks pass. Select Start case above to queue read-only
                              checks and record evidence.
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {detailError && (
                      <div role="alert" className="dm-notice dm-notice-error text-xs">
                        {detailError}
                      </div>
                    )}

                    {/* Three Distinct Real States: Finished checks | Proposed actions | Confirmed provider results */}
                    <dl className="grid grid-cols-1 divide-y divide-[#e2e8f0] rounded-lg border border-[#e2e8f0] bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                      <div className="p-3.5">
                        <dt className="text-[11px] font-medium text-[#64748b]">Finished checks</dt>
                        <dd
                          className={`mt-1 text-sm font-semibold ${statusTextTone(inspectedJob.status)}`}
                        >
                          {formatStatusLabel(inspectedJob.status)}
                        </dd>
                        <p className="mt-0.5 text-[11px] tabular-nums text-[#64748b]">
                          {inspectedJob.status === 'draft'
                            ? 'Not started · no model calls'
                            : detailLoading
                              ? 'Loading check log…'
                              : detail
                                ? `${inspectedSteps.length} check${inspectedSteps.length === 1 ? '' : 's'} recorded`
                                : 'Step count unavailable'}
                        </p>
                      </div>

                      <div className="p-3.5">
                        <dt className="text-[11px] font-medium text-[#64748b]">Proposed actions</dt>
                        <dd
                          className={`mt-1 text-sm font-semibold ${
                            inspectedHasProposal ? 'text-[#b45309]' : 'text-[#0f172a]'
                          }`}
                        >
                          {inspectedHasProposal
                            ? 'Awaiting review'
                            : inspectedReport?.summary
                              ? 'None proposed'
                              : 'Not submitted'}
                        </dd>
                        <p className="mt-0.5 text-[11px] text-[#64748b]">
                          {inspectedReport?.facts?.length
                            ? `${inspectedReport.facts.length} candidate fact${inspectedReport.facts.length === 1 ? '' : 's'}`
                            : inspectedHasProposal
                              ? 'Review required before changes'
                              : 'No configuration or record change'}
                        </p>
                      </div>

                      <div className="p-3.5">
                        <dt className="text-[11px] font-medium text-[#64748b]">
                          Confirmed provider results
                        </dt>
                        <dd
                          className={`mt-1 text-sm font-semibold ${
                            inspectedReceipt?.status === 'confirmed'
                              ? 'text-[#15803d]'
                              : 'text-[#475569]'
                          }`}
                        >
                          {inspectedReceipt?.status
                            ? formatStatusLabel(inspectedReceipt.status)
                            : 'No provider write'}
                        </dd>
                        <p className="mt-0.5 text-[11px] text-[#64748b]">
                          {inspectedReceipt?.summary ||
                            'Desk runs are read-only; delivery receipts appear in Playbooks.'}
                        </p>
                      </div>
                    </dl>

                    {/* Error banner if run failed */}
                    {inspectedJob.last_error && (
                      <div
                        role="alert"
                        className="rounded-lg border border-[#fecaca] bg-[#fef2f2] p-3.5 text-xs text-[#991b1b]"
                      >
                        <p className="font-semibold">Run stopped with an error</p>
                        <p className="mt-1 break-words leading-relaxed">{inspectedJob.last_error}</p>
                      </div>
                    )}

                    {/* Clearly Titled Section: Proposed Change Awaiting Review */}
                    {inspectedHasProposal && (
                      <section
                        className="rounded-lg border border-[#fcd34d] bg-[#fffbeb] p-4"
                        aria-labelledby="ops-desk-proposal-heading"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4
                            id="ops-desk-proposal-heading"
                            className="text-sm font-semibold text-[#78350f]"
                          >
                            Proposed change awaiting review
                          </h4>
                          <span className="text-xs font-semibold text-[#b45309]">
                            Not applied automatically
                          </span>
                        </div>

                        {inspectedReport?.proposal && (
                          <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-[#1e293b]">
                            {inspectedReport.proposal}
                          </p>
                        )}

                        {inspectedReport?.facts && inspectedReport.facts.length > 0 && (
                          <div className="mt-3 space-y-2.5 border-t border-[#fde68a] pt-3">
                            <p className="text-xs font-semibold text-[#78350f]">
                              Extracted candidates requiring review ({inspectedReport.facts.length})
                            </p>
                            <div className="space-y-2">
                              {inspectedReport.facts.map((fact, index) => (
                                <article
                                  key={`${fact.field}-${index}`}
                                  className="rounded-md border border-[#fde68a] bg-white p-3 text-xs"
                                >
                                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                                    <span className="font-semibold capitalize text-[#0f172a]">
                                      {fact.field.replaceAll('_', ' ')}
                                    </span>
                                    <span className="text-[11px] tabular-nums text-[#64748b]">
                                      Evidence #{fact.evidence_sequence}
                                    </span>
                                  </div>
                                  <p className="mt-1 font-medium text-[#0f172a]">{fact.value}</p>
                                  {fact.quote && (
                                    <blockquote className="mt-1.5 border-l-2 border-[#cbd5e1] pl-2.5 text-[#475569]">
                                      {fact.quote}
                                    </blockquote>
                                  )}
                                  {fact.source_url && (
                                    <a
                                      href={fact.source_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="mt-2 inline-flex items-center gap-1 font-semibold text-[#1d4ed8] hover:underline"
                                    >
                                      Inspect cited source <ArrowRight size={12} />
                                    </a>
                                  )}
                                </article>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#fde68a] pt-3 text-xs">
                          <span className="text-[#78350f]">
                            Review and apply any policy or destination change in the governed
                            workspace view.
                          </span>
                          {onNavigateTab && (
                            <button
                              type="button"
                              className="font-semibold text-[#1d4ed8] hover:underline"
                              onClick={() => onNavigateTab(nextHandoff.tab)}
                            >
                              {nextHandoff.label} →
                            </button>
                          )}
                        </div>
                      </section>
                    )}

                    {/* Validated Report Summary */}
                    <section className="rounded-lg border border-[#e2e8f0] bg-white p-4">
                      <h4 className="text-sm font-semibold text-[#0f172a]">Findings summary</h4>
                      <p className="mt-1.5 whitespace-pre-line break-words text-sm leading-relaxed text-[#334155]">
                        {inspectedReport?.summary ||
                          (inspectedJob.status === 'draft'
                            ? 'Draft case saved with no model calls. Start this case once readiness checks pass to run read-only checks and record evidence.'
                            : ['queued', 'running'].includes(inspectedJob.status)
                              ? 'Checks are still running. A validated summary will appear once checks finish.'
                              : 'No validated summary was recorded for this run.')}
                      </p>
                      {inspectedReport?.outcome && (
                        <p className="mt-2 border-t border-[#f1f5f9] pt-2 text-xs text-[#64748b]">
                          Recorded outcome:{' '}
                          <strong className="font-semibold text-[#0f172a]">
                            {inspectedReport.outcome.replaceAll('_', ' ')}
                          </strong>
                        </p>
                      )}
                    </section>

                    {/* Timestamped Checks & Run Evidence Ledger */}
                    <section className="rounded-lg border border-[#e2e8f0] bg-white p-4">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-[#0f172a]">
                          Run evidence · Recorded checks
                        </h4>
                        <span className="text-xs tabular-nums text-[#64748b]">
                          {detailLoading
                            ? 'Loading…'
                            : `${inspectedSteps.length} step${inspectedSteps.length === 1 ? '' : 's'}`}
                        </span>
                      </div>

                      {detailLoading ? (
                        <div className="mt-3 space-y-2" role="status">
                          <div className="dm-skeleton h-9 w-full" />
                          <div className="dm-skeleton h-9 w-full" />
                        </div>
                      ) : inspectedSteps.length > 0 ? (
                        <ol className="mt-3 divide-y divide-[#f1f5f9]">
                          {inspectedSteps.map((step) => {
                            const stepStamp =
                              step.completed_at ||
                              step.updated_at ||
                              step.created_at ||
                              step.timestamp ||
                              null;
                            return (
                              <li key={step.sequence} className="py-3 first:pt-1 last:pb-0">
                                <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2
                                      size={14}
                                      className={`shrink-0 ${statusTextTone(step.status)}`}
                                    />
                                    <span className="font-semibold text-[#0f172a]">
                                      {step.sequence}. {STEP_NAMES[step.tool] || 'Operations check'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2.5 tabular-nums">
                                    <span className={`font-semibold ${statusTextTone(step.status)}`}>
                                      {formatStatusLabel(step.status)}
                                    </span>
                                    <span className="text-[#64748b]">
                                      {stepStamp ? formatStamp(stepStamp) : 'Time not recorded'}
                                    </span>
                                  </div>
                                </div>
                                <details className="mt-2 text-xs">
                                  <summary className="cursor-pointer font-medium text-[#1d4ed8] hover:underline">
                                    Inspect recorded check output
                                  </summary>
                                  <pre className="mt-2 max-h-64 overflow-x-auto rounded-md border border-[#e2e8f0] bg-[#f8fafc] p-3 font-mono text-[11px] leading-relaxed text-[#334155]">
                                    {JSON.stringify(step.result, null, 2)}
                                  </pre>
                                </details>
                              </li>
                            );
                          })}
                        </ol>
                      ) : (
                        <p className="mt-2 text-xs text-[#64748b]">
                          No individual check steps have been recorded for this run yet.
                        </p>
                      )}
                    </section>

                    {/* Recorded Subagents (only when present in recorded API results) */}
                    {inspectedSubagents.length > 0 && (
                      <section className="rounded-lg border border-[#e2e8f0] bg-white p-4">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-semibold text-[#0f172a]">
                            Recorded subagents
                          </h4>
                          <span className="text-xs tabular-nums text-[#64748b]">
                            {inspectedSubagents.length} recorded
                          </span>
                        </div>
                        <ul className="mt-3 divide-y divide-[#f1f5f9] text-xs">
                          {inspectedSubagents.map((sub, idx) => (
                            <li
                              key={sub.id || `${sub.name || 'subagent'}-${idx}`}
                              className="py-2.5 first:pt-0 last:pb-0"
                            >
                              <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <span className="font-semibold text-[#0f172a]">
                                  {sub.name || sub.role || `Subagent ${idx + 1}`}
                                </span>
                                <div className="flex items-center gap-2 tabular-nums">
                                  {sub.status && (
                                    <span className={`font-semibold ${statusTextTone(sub.status)}`}>
                                      {formatStatusLabel(sub.status)}
                                    </span>
                                  )}
                                  {sub.completed_at && (
                                    <span className="text-[#64748b]">
                                      {formatStamp(sub.completed_at)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {sub.summary && (
                                <p className="mt-1 leading-relaxed text-[#475569]">{sub.summary}</p>
                              )}
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {/* Collapsed Technical Details (only when backed by API fields) */}
                    {hasTechnicalDetails && (
                      <details className="rounded-lg border border-[#e2e8f0] bg-white px-4 py-3 text-xs">
                        <summary className="cursor-pointer font-semibold text-[#334155]">
                          Technical details
                        </summary>
                        <dl className="mt-3 grid grid-cols-1 gap-2.5 border-t border-[#f1f5f9] pt-3 sm:grid-cols-2 tabular-nums">
                          <div>
                            <dt className="text-[#64748b]">Run ID</dt>
                            <dd className="mt-0.5 break-all font-mono text-[#0f172a]">
                              {inspectedJob.id}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[#64748b]">Workflow key</dt>
                            <dd className="mt-0.5 font-mono text-[#0f172a]">
                              {inspectedJob.workflow}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[#64748b]">Last recorded update</dt>
                            <dd className="mt-0.5 text-[#0f172a]">
                              {formatStamp(inspectedJob.updated_at)}
                            </dd>
                          </div>
                          {inspectedReport?.evidence_sequences &&
                            inspectedReport.evidence_sequences.length > 0 && (
                              <div>
                                <dt className="text-[#64748b]">Evidence sequences cited</dt>
                                <dd className="mt-0.5 font-mono text-[#0f172a]">
                                  {inspectedReport.evidence_sequences.join(', ')}
                                </dd>
                              </div>
                            )}
                          {inspectedUsage?.model_calls != null && (
                            <div>
                              <dt className="text-[#64748b]">Evaluation calls</dt>
                              <dd className="mt-0.5 text-[#0f172a]">
                                {inspectedUsage.model_calls.toLocaleString()}
                              </dd>
                            </div>
                          )}
                          {inspectedUsage?.total_tokens != null && (
                            <div>
                              <dt className="text-[#64748b]">Total tokens</dt>
                              <dd className="mt-0.5 text-[#0f172a]">
                                {inspectedUsage.total_tokens.toLocaleString()}
                              </dd>
                            </div>
                          )}
                        </dl>
                      </details>
                    )}
                  </div>
                )}
              </div>
            </div>
              )}
            </>
          )}
        </div>

        {/* TAB 2: AGENT BOARD & WORKSPACE SKILLS */}
        <div
          role="tabpanel"
          id="ops-desk-panel-board"
          aria-labelledby="ops-desk-tab-board"
          hidden={tab !== 'board'}
        >
          <OperationsAgentBoard
            workflows={SKILLS}
            workflowNames={WORKFLOW_NAMES}
            stateLoaded={Boolean(state)}
            ready={ready}
            paused={paused}
            decisionServiceOn={decisionServiceOn}
            researchConfigured={Boolean(state?.research_configured)}
            automaticWorkflows={state?.automatic_workflows || []}
            policyEnabled={Boolean(state?.policy.enabled)}
            policyWorkflows={state?.policy.workflows || []}
            targets={state?.targets || {}}
            workflowSkillsMap={state?.workflow_skills}
            jobs={jobs}
            skills={skills}
            skillsLoading={skillsLoading}
            skillsUnavailable={skillsUnavailable}
            skillsError={skillsError}
            canEditSkills={canEditSkills}
            onReloadSkills={() => loadSkills(true)}
            onSaveSkill={handleSaveSkill}
            onPublishSkill={handlePublishSkill}
            onSelectWorkflowForNewCase={handleSelectWorkflowForNewCase}
            onInspectJobInInbox={handleInspectJobInInbox}
            onFilterInboxByWorkflow={handleFilterInboxByWorkflow}
            onOpenInstructions={(wfId) => {
              setWorkflow(wfId);
              setTab('instructions');
            }}
            onNavigateTab={onNavigateTab}
            formatStamp={formatStamp}
            formatStatusLabel={formatStatusLabel}
            statusTextTone={statusTextTone}
            hasPendingProposal={hasPendingProposal}
          />
        </div>

        {/* TAB 3: AUTOMATIC TRIGGERS */}
        <div
          role="tabpanel"
          id="ops-desk-panel-triggers"
          aria-labelledby="ops-desk-tab-triggers"
          hidden={tab !== 'triggers'}
          className="space-y-4 p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-[#0f172a]">Automatic triggers</h3>
              <p className="mt-0.5 text-xs text-[#64748b]">
                Authorize event categories to start read-only checks automatically. Each target is
                reviewed at most once per day.
              </p>
            </div>
            <span
              className={`text-xs font-semibold ${
                state?.policy.enabled ? 'text-[#15803d]' : 'text-[#64748b]'
              }`}
            >
              {state?.policy.enabled ? 'Enabled' : 'Off'}
            </span>
          </div>

          <div className="divide-y divide-[#e2e8f0] rounded-lg border border-[#e2e8f0] bg-white">
            {(state?.automatic_workflows || []).map((id) => (
              <label
                key={id}
                className="flex cursor-pointer items-start gap-3 px-4 py-3.5 text-sm hover:bg-[#f8fafc]"
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-[#1d4ed8]"
                  checked={selectedTriggers.includes(id)}
                  disabled={!owner || busy}
                  onChange={(event) => {
                    setDraftDirty(true);
                    setSelectedTriggers(
                      event.target.checked
                        ? [...selectedTriggers, id]
                        : selectedTriggers.filter((item) => item !== id)
                    );
                  }}
                />
                <span>
                  <strong className="block font-semibold text-[#0f172a]">
                    {SKILLS.find((item) => item.id === id)?.title || id}
                  </strong>
                  <span className="mt-0.5 block text-xs text-[#64748b]">
                    {id === 'sync-investigation'
                      ? 'Starts when a delivery job fails.'
                      : id === 'customer-onboarding'
                        ? 'Starts when a historical import finishes or fails.'
                        : 'Starts when a current decision identifies missing company fit evidence.'}
                  </span>
                </span>
              </label>
            ))}
            {state && !(state.automatic_workflows || []).length && (
              <p className="p-4 text-xs text-[#64748b]">
                No automatic trigger categories are returned by the service.
              </p>
            )}
          </div>

          <p className="text-xs text-[#64748b]">
            Scoring analysis and professional-role research remain explicit owner-initiated runs.
            Findings always require review before records or destinations change.
          </p>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              className="dm-button dm-button-primary"
              disabled={!ready || !owner || busy || !selectedTriggers.length}
              onClick={() =>
                void act(async () => {
                  await mutate('/v1/operations/policy', {
                    enabled: true,
                    workflows: selectedTriggers,
                    revision: state?.policy.revision,
                  });
                  setDraftDirty(false);
                }, 'Automatic triggers saved.')
              }
            >
              Save automatic triggers
            </button>
            <button
              type="button"
              className="dm-button"
              disabled={!owner || busy || !state?.policy.enabled}
              onClick={() =>
                void act(async () => {
                  await mutate('/v1/operations/policy', {
                    enabled: false,
                    workflows: [],
                    revision: state?.policy.revision,
                  });
                  setDraftDirty(false);
                }, 'Automatic triggers turned off.')
              }
            >
              Turn off triggers
            </button>
          </div>

          {!owner && state && (
            <p className="text-xs text-[#64748b]">
              Workspace owner permission is required to save or disable automatic triggers.
            </p>
          )}
          {!ready && state && (
            <p className="text-xs text-[#b45309]">
              Enable Automatic decisions and verify worker health before activating triggers.
            </p>
          )}
        </div>

        {/* TAB 3: INSTRUCTIONS */}
        <div
          role="tabpanel"
          id="ops-desk-panel-instructions"
          aria-labelledby="ops-desk-tab-instructions"
          hidden={tab !== 'instructions'}
          className="space-y-4 p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-[#0f172a]">Workflow instructions</h3>
              <p className="mt-0.5 text-xs text-[#64748b]">
                Choose a workflow to inspect or update its role guidance and review format.
              </p>
            </div>
            <label className="w-full sm:w-72">
              <span className="sr-only">Choose workflow instructions</span>
              <select
                className="dm-input w-full text-xs"
                value={workflow}
                onChange={(e) => setWorkflow(e.target.value)}
              >
                {SKILLS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {state ? (
            state.instructions[workflow] ? (
              <OperationsInstructions
                key={workflow}
                workflow={workflow}
                label={WORKFLOW_NAMES[workflow] || workflow}
                profile={state.instructions[workflow]}
                owner={owner}
                light={light}
                expanded
                save={async (body) => {
                  const value = await mutate<{ instructions: InstructionProfile }>(
                    '/v1/operations/instructions',
                    body
                  );
                  await refresh();
                  return value.instructions;
                }}
              />
            ) : (
              <p className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4 text-xs text-[#64748b]">
                No editable instruction profile is returned for this workflow.
              </p>
            )
          ) : (
            <p className="text-xs text-[#64748b]">Loading workflow instructions…</p>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e2e8f0] bg-[#f8fafc] px-5 py-3 text-xs text-[#64748b]">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-[#475569]" />
              Changes require human review
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 size={14} className="text-[#475569]" />
              2-minute run limit · up to 12 checks
            </span>
          </div>
          <span className={state?.research_configured ? 'font-medium text-[#15803d]' : ''}>
            {state?.research_configured
              ? 'Public research connected'
              : 'Public research not configured'}
          </span>
        </footer>
      </section>
    </div>
  );
}
