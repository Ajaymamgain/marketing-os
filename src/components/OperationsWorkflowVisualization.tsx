import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import {
  extractRecordedSubagents,
  formatFriendlyToolLabel,
  type OperationsBoardJob,
  type RecordedSubagent,
  type WorkflowDefinition,
} from './OperationsAgentBoard';

export type StepActor = 'primary' | 'specialist-1' | 'specialist-2' | string | null | undefined;

export type OperationStepReceipt = {
  sequence: number;
  tool: string;
  status: string;
  actor?: StepActor;
  created_at?: string | null;
  completed_at?: string | null;
  updated_at?: string | null;
  timestamp?: string | null;
  result?: Record<string, unknown> | null;
};

export type JobDetailPayload = {
  job: OperationsBoardJob;
  steps: OperationStepReceipt[];
};

export type VisualizationMode = 'plan' | 'recorded';

interface OperationsWorkflowVisualizationProps {
  workflow: WorkflowDefinition;
  workflowJobs: OperationsBoardJob[];
  workflowTools?: string[];
  fetchJobDetail: (jobId: string) => Promise<JobDetailPayload>;
  pinnedCaseId?: string | null;
  requestedMode?: VisualizationMode;
  focusRequestTick?: number;
  isActive?: boolean;
  onOpenCaseInInbox: (jobId: string) => void;
  onPreselectNewCase: (workflowId: string) => void;
  formatStamp: (value?: string | null) => string;
  formatStatusLabel: (status?: string | null) => string;
  statusTextTone: (status?: string | null) => string;
}

const POLL_INTERVAL_MS = 4000;
const PLAYBACK_INTERVAL_MS = 900;

const TERMINAL_OR_IDLE_STATUSES = new Set([
  'succeeded',
  'completed',
  'failed',
  'cancelled',
  'canceled',
  'draft',
  'paused',
  'blocked',
  'awaiting_review',
]);

function isActivePollableStatus(status?: string | null): boolean {
  if (!status) return false;
  const normalized = status.toLowerCase();
  if (TERMINAL_OR_IDLE_STATUSES.has(normalized)) return false;
  return ['queued', 'running', 'in_progress', 'pending'].includes(normalized);
}

function normalizeActorKey(actor?: StepActor): string {
  if (!actor || typeof actor !== 'string' || !actor.trim()) return 'unrecorded';
  const cleaned = actor.trim().toLowerCase();
  if (cleaned === 'primary' || cleaned === 'specialist-1' || cleaned === 'specialist-2') {
    return cleaned;
  }
  return cleaned;
}

export function formatActorLabel(actor?: StepActor): string {
  const key = normalizeActorKey(actor);
  if (key === 'primary') return 'Main agent';
  if (key === 'specialist-1') return 'Specialist 1';
  if (key === 'specialist-2') return 'Specialist 2';
  if (key === 'unrecorded') return 'Actor not recorded';
  const specialistMatch = /^specialist-(\d+)$/.exec(key);
  if (specialistMatch) return `Specialist ${specialistMatch[1]}`;
  return 'Actor not recorded';
}

function formatTriggerLabel(trigger?: string | null): string | null {
  if (!trigger || typeof trigger !== 'string') return null;
  const normalized = trigger.trim().toLowerCase();
  if (normalized === 'manual') return 'Manual';
  if (normalized === 'automatic') return 'Automatic';
  return null;
}

function statusHexColor(status?: string | null): string {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'failed') return '#b91c1c';
  if (normalized === 'paused' || normalized === 'blocked' || normalized === 'awaiting_review') {
    return '#b45309';
  }
  if (normalized === 'succeeded' || normalized === 'completed') return '#15803d';
  if (normalized === 'running' || normalized === 'queued') return '#1d4ed8';
  return '#64748b';
}

function nodeStatusBorderHex(status?: string | null): string {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'failed') return '#fca5a5';
  if (normalized === 'paused' || normalized === 'blocked' || normalized === 'awaiting_review') {
    return '#fcd34d';
  }
  return '#cbd5e1';
}

const SENSITIVE_KEY_PATTERN =
  /email|mail|phone|mobile|contact|lead|person|people|member|customer|token|secret|key|password|passwd|auth|cookie|credential|bearer|header|raw|payload|body|rows|records|ssn|address/i;

const SAFE_SCALAR_KEYS: Record<string, string> = {
  count: 'Items checked',
  total: 'Total',
  checked: 'Checked',
  matched: 'Matched',
  issues_found: 'Issues identified',
  issue_count: 'Issues identified',
  facts_extracted: 'Candidate facts',
  sources_checked: 'Sources checked',
  source_count: 'Sources checked',
  tools_count: 'Tools inspected',
  tool_count: 'Tools inspected',
  eligible_count: 'Eligible records',
  ok: 'Check passed',
  valid: 'Validated',
  code: 'Code',
};

function sanitizeSafeText(raw: string, maxLen = 220): string {
  let cleaned = raw
    // Redact email addresses
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted]')
    // Redact bearer/JWT/API-key-like strings
    .replace(/\b(Bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9._-]{10,}|sk-[A-Za-z0-9_-]{8,})\b/g, '[redacted]')
    // Redact phone-like sequences
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[redacted]')
    .replace(/\s+/g, ' ')
    .trim();

  // Never emit raw JSON objects or arrays
  if (
    (cleaned.startsWith('{') && cleaned.endsWith('}')) ||
    (cleaned.startsWith('[') && cleaned.endsWith(']'))
  ) {
    return '';
  }

  if (cleaned.length > maxLen) {
    cleaned = `${cleaned.slice(0, maxLen - 1).trimEnd()}…`;
  }
  return cleaned;
}

function summarizeSafeStepResult(step: OperationStepReceipt): string {
  const result = step.result;
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return step.status.toLowerCase() === 'failed'
      ? 'Tool step failed. No safe summary message was recorded.'
      : 'Tool receipt recorded with no text summary.';
  }

  const parts: string[] = [];

  // 1. Check safe explicit prose fields first
  const textCandidates = ['summary', 'message', 'reason', 'note', 'outcome', 'error'] as const;
  for (const field of textCandidates) {
    const val = result[field];
    if (typeof val === 'string' && val.trim()) {
      const safe = sanitizeSafeText(val, 220);
      if (safe) {
        parts.push(safe);
        break;
      }
    }
  }

  // 2. Append strictly whitelisted scalar operational counters (never contacts, credentials, or raw payloads)
  const metricParts: string[] = [];
  for (const [key, value] of Object.entries(result)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) continue;
    const label = SAFE_SCALAR_KEYS[key];
    if (!label) continue;
    if (typeof value === 'number' && Number.isFinite(value)) {
      metricParts.push(`${label}: ${value.toLocaleString()}`);
    } else if (typeof value === 'boolean') {
      metricParts.push(`${label}: ${value ? 'Yes' : 'No'}`);
    } else if (typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 32) {
      const safe = sanitizeSafeText(value, 32);
      if (safe) metricParts.push(`${label}: ${safe}`);
    }
    if (metricParts.length >= 3) break;
  }

  if (metricParts.length > 0) {
    parts.push(metricParts.join(' · '));
  }

  if (parts.length > 0) return parts.join(' — ');

  if (step.status.toLowerCase() === 'failed') {
    return 'Tool check stopped with an error. Inspect Case Inbox for approved summary details.';
  }
  if (['running', 'queued'].includes(step.status.toLowerCase())) {
    return 'Tool receipt is currently in progress.';
  }
  return 'Tool receipt recorded. Structured payload details are withheld from this visualization.';
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1).trimEnd()}…`;
}

export const OperationsWorkflowVisualization: React.FC<OperationsWorkflowVisualizationProps> = ({
  workflow,
  workflowJobs,
  workflowTools,
  fetchJobDetail,
  pinnedCaseId,
  requestedMode,
  focusRequestTick = 0,
  isActive = true,
  onOpenCaseInInbox,
  onPreselectNewCase,
  formatStamp,
  formatStatusLabel,
  statusTextTone,
}) => {
  const [mode, setMode] = useState<VisualizationMode>(requestedMode || 'plan');
  const [selectedCaseId, setSelectedCaseId] = useState<string>(() => {
    if (pinnedCaseId && workflowJobs.some((j) => j.id === pinnedCaseId)) return pinnedCaseId;
    return workflowJobs[0]?.id || '';
  });

  const [jobDetail, setJobDetail] = useState<JobDetailPayload | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [retryTick, setRetryTick] = useState(0);

  const [selectedStepIndex, setSelectedStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const containerRef = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const requestSeqRef = useRef(0);
  const activePinnedRef = useRef<{ workflowId: string; caseId: string } | null>(null);
  const fetchJobDetailRef = useRef(fetchJobDetail);
  fetchJobDetailRef.current = fetchJobDetail;

  // Respond cleanly when Case Inbox opens a specific case in the visualization
  useEffect(() => {
    if (!focusRequestTick) return;
    if (requestedMode) setMode(requestedMode);
    if (pinnedCaseId) {
      activePinnedRef.current = { workflowId: workflow.id, caseId: pinnedCaseId };
      setSelectedCaseId(pinnedCaseId);
    }
    setSelectedStepIndex(0);
    setPlaying(false);
    const timer = window.setTimeout(() => {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      headingRef.current?.focus();
    }, 40);
    return () => window.clearTimeout(timer);
  }, [focusRequestTick, pinnedCaseId, requestedMode, workflow.id]);

  // Keep selectedCaseId synced when switching workflows or when new jobs arrive without overriding manual selection
  useEffect(() => {
    const pinnedForWorkflow =
      activePinnedRef.current && activePinnedRef.current.workflowId === workflow.id
        ? activePinnedRef.current.caseId
        : null;

    setSelectedCaseId((current) => {
      if (pinnedForWorkflow && current === pinnedForWorkflow) return current;
      if (current && workflowJobs.some((j) => j.id === current)) return current;
      if (pinnedForWorkflow) return pinnedForWorkflow;
      return workflowJobs[0]?.id || '';
    });
  }, [workflow.id, workflowJobs]);

  // Reset step selection and playback cleanly on workflow, case, or mode change
  useEffect(() => {
    setSelectedStepIndex(0);
    setPlaying(false);
  }, [workflow.id, selectedCaseId, mode]);

  // Fetch recorded run detail via authenticated GET /v1/operations/jobs/{id} with stale-response guard
  useEffect(() => {
    if (!isActive || mode !== 'recorded') return;
    if (!selectedCaseId) {
      requestSeqRef.current += 1;
      setJobDetail(null);
      setLoadingDetail(false);
      setDetailError('');
      return;
    }

    let active = true;
    const reqId = ++requestSeqRef.current;

    setLoadingDetail(true);
    setDetailError('');
    setJobDetail((prev) => (prev?.job.id === selectedCaseId ? prev : null));

    fetchJobDetailRef
      .current(selectedCaseId)
      .then((payload) => {
        if (!active || reqId !== requestSeqRef.current) return;
        setJobDetail(payload);
        setDetailError('');
      })
      .catch((cause) => {
        if (!active || reqId !== requestSeqRef.current) return;
        setJobDetail(null);
        setDetailError(
          cause instanceof Error ? cause.message : 'Recorded run receipts could not load.'
        );
      })
      .finally(() => {
        if (active && reqId === requestSeqRef.current) {
          setLoadingDetail(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isActive, mode, selectedCaseId, retryTick]);

  const summaryJob = useMemo(
    () => workflowJobs.find((j) => j.id === selectedCaseId) || null,
    [workflowJobs, selectedCaseId]
  );

  const activeJob: OperationsBoardJob | null =
    jobDetail?.job.id === selectedCaseId ? jobDetail.job : summaryJob;

  const shouldPoll =
    isActive &&
    mode === 'recorded' &&
    Boolean(selectedCaseId) &&
    isActivePollableStatus(activeJob?.status);

  // Poll active running/queued case for new receipts every 4s; stop for terminal state or unmount
  useEffect(() => {
    if (!shouldPoll || !selectedCaseId) return;
    let active = true;

    const timer = window.setInterval(() => {
      const reqId = ++requestSeqRef.current;
      fetchJobDetailRef
        .current(selectedCaseId)
        .then((payload) => {
          if (!active || reqId !== requestSeqRef.current) return;
          setJobDetail(payload);
          setDetailError('');
        })
        .catch(() => {
          // Keep last valid receipt snapshot on transient poll errors
        });
    }, POLL_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [shouldPoll, selectedCaseId]);

  const orderedReceipts = useMemo(() => {
    if (!jobDetail || jobDetail.job.id !== selectedCaseId) return [];
    return [...(jobDetail.steps || [])].sort((a, b) => a.sequence - b.sequence);
  }, [jobDetail, selectedCaseId]);

  const activeLanes = useMemo(() => {
    const present = new Set<string>();
    for (const step of orderedReceipts) {
      present.add(normalizeActorKey(step.actor));
    }
    const preferredOrder = ['primary', 'specialist-1', 'specialist-2', 'unrecorded'];
    const ordered: string[] = [];
    for (const key of preferredOrder) {
      if (present.has(key)) ordered.push(key);
    }
    for (const key of present) {
      if (!ordered.includes(key)) ordered.push(key);
    }
    return ordered;
  }, [orderedReceipts]);

  const recordedSubagents = useMemo(
    () => extractRecordedSubagents(activeJob),
    [activeJob]
  );

  const attributedSubagents = useMemo(
    () =>
      recordedSubagents.filter(
        (sub): sub is RecordedSubagent & { id: string } =>
          typeof sub.id === 'string' &&
          (sub.id === 'specialist-1' || sub.id === 'specialist-2')
      ),
    [recordedSubagents]
  );

  const unattributedSubagents = useMemo(
    () =>
      recordedSubagents.filter(
        (sub) =>
          typeof sub.id !== 'string' ||
          (sub.id !== 'specialist-1' && sub.id !== 'specialist-2')
      ),
    [recordedSubagents]
  );

  const itemCount = mode === 'plan' ? workflow.steps.length : orderedReceipts.length;
  const clampedIndex = itemCount > 0 ? Math.min(selectedStepIndex, itemCount - 1) : 0;

  // Client-side playback strictly navigates existing steps/receipts; never triggers tools or models
  useEffect(() => {
    if (!playing) return;
    if (itemCount <= 1 || clampedIndex >= itemCount - 1) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setSelectedStepIndex((current) => Math.min(current + 1, itemCount - 1));
    }, PLAYBACK_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [playing, clampedIndex, itemCount]);

  const handleStepSelect = (index: number) => {
    setPlaying(false);
    setSelectedStepIndex(index);
  };

  const handlePrev = () => {
    setPlaying(false);
    setSelectedStepIndex((current) => Math.max(0, current - 1));
  };

  const handleNext = () => {
    setPlaying(false);
    setSelectedStepIndex((current) => Math.min(Math.max(0, itemCount - 1), current + 1));
  };

  const handleTogglePlay = () => {
    if (itemCount <= 1) return;
    if (!playing && clampedIndex >= itemCount - 1) {
      setSelectedStepIndex(0);
      setPlaying(true);
      return;
    }
    setPlaying((prev) => !prev);
  };

  const handleReset = () => {
    setPlaying(false);
    setSelectedStepIndex(0);
  };

  // SVG layout math for Workflow plan (neutral single row)
  const planNodeW = 192;
  const planNodeH = 68;
  const planGapX = 42;
  const planPadX = 24;
  const planCanvasW = Math.max(
    760,
    planPadX * 2 + workflow.steps.length * planNodeW + Math.max(0, workflow.steps.length - 1) * planGapX
  );
  const planCanvasH = 128;
  const planNodeY = (planCanvasH - planNodeH) / 2;

  // SVG layout math for Recorded run (actor swimlanes + chronological columns)
  const laneRailW = 148;
  const recNodeW = 200;
  const recNodeH = 72;
  const recGapX = 44;
  const recPadX = 24;
  const recLaneH = 102;
  const recPadY = 14;
  const recCanvasW = Math.max(
    760,
    laneRailW +
      recPadX * 2 +
      orderedReceipts.length * recNodeW +
      Math.max(0, orderedReceipts.length - 1) * recGapX
  );
  const recCanvasH = Math.max(128, recPadY * 2 + Math.max(1, activeLanes.length) * recLaneH);

  const activeReceipt = mode === 'recorded' ? orderedReceipts[clampedIndex] || null : null;
  const activePlanStage = mode === 'plan' ? workflow.steps[clampedIndex] || null : null;
  const caseTriggerLabel = formatTriggerLabel(activeJob?.trigger);
  const caseOutcomeLabel = activeJob?.result?.report?.outcome
    ? activeJob.result.report.outcome.replaceAll('_', ' ')
    : null;

  return (
    <section
      ref={containerRef}
      id="ops-workflow-visualization"
      className="border-b border-[#e2e8f0] bg-white p-4 sm:p-5"
      aria-labelledby="ops-workflow-viz-heading"
    >
      {/* Top Bar: Title + Mode Switcher + Case Controls */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <h4
              ref={headingRef}
              tabIndex={-1}
              id="ops-workflow-viz-heading"
              className="text-sm font-semibold text-[#0f172a] outline-none"
            >
              Workflow visualization
            </h4>
            <span className="text-[11px] font-medium text-[#64748b]">
              {mode === 'plan'
                ? 'Template · Reference stage sequence only'
                : 'Recorded run · Actual tool receipts'}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[#64748b]">
            {mode === 'plan'
              ? 'Reference template sequence for this built-in workflow. Stages are uncolored by state and do not represent run evidence.'
              : 'Chronological tool receipts and recorded actor attribution from the selected case. Navigation inspects saved receipts only.'}
          </p>
        </div>

        {/* Mode Toggle: Workflow plan | Recorded run */}
        <div
          className="inline-flex shrink-0 items-center rounded-md border border-[#e2e8f0] bg-[#f8fafc] p-0.5"
          role="tablist"
          aria-label="Workflow visualization mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'plan'}
            onClick={() => setMode('plan')}
            className={`whitespace-nowrap rounded px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1d4ed8] ${
              mode === 'plan'
                ? 'bg-[#0f172a] text-white'
                : 'text-[#475569] hover:text-[#0f172a]'
            }`}
          >
            Workflow plan
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'recorded'}
            onClick={() => setMode('recorded')}
            className={`whitespace-nowrap rounded px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1d4ed8] ${
              mode === 'recorded'
                ? 'bg-[#0f172a] text-white'
                : 'text-[#475569] hover:text-[#0f172a]'
            }`}
          >
            Recorded run
            <span className={`ml-1.5 ${mode === 'recorded' ? 'text-[#cbd5e1]' : 'text-[#94a3b8]'}`}>
              {workflowJobs.length}
            </span>
          </button>
        </div>
      </div>

      {/* Controls Toolbar: Previous / Next / Play / Reset + Recorded Case Selector */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2.5 border-y border-[#e2e8f0] bg-[#f8fafc] px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1 rounded-md border border-[#cbd5e1] bg-white px-2.5 text-xs font-medium text-[#0f172a] hover:bg-[#f1f5f9] disabled:opacity-45"
            disabled={itemCount === 0 || clampedIndex <= 0}
            onClick={handlePrev}
          >
            <ChevronLeft size={13} aria-hidden="true" /> Previous
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1 rounded-md border border-[#cbd5e1] bg-white px-2.5 text-xs font-medium text-[#0f172a] hover:bg-[#f1f5f9] disabled:opacity-45"
            disabled={itemCount === 0 || clampedIndex >= itemCount - 1}
            onClick={handleNext}
          >
            Next <ChevronRight size={13} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1 rounded-md border border-[#cbd5e1] bg-white px-2.5 text-xs font-medium text-[#0f172a] hover:bg-[#f1f5f9] disabled:opacity-45"
            disabled={itemCount <= 1}
            onClick={handleTogglePlay}
          >
            {playing ? <Pause size={12} aria-hidden="true" /> : <Play size={12} aria-hidden="true" />}
            {playing ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center justify-center rounded-md border border-[#cbd5e1] bg-white px-2 text-xs text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a] disabled:opacity-45"
            aria-label="Reset visualization step"
            disabled={itemCount === 0 || (clampedIndex === 0 && !playing)}
            onClick={handleReset}
          >
            <RotateCcw size={12} aria-hidden="true" />
          </button>
          {itemCount > 0 && (
            <span className="ml-1 text-[11px] font-medium tabular-nums text-[#475569]">
              {mode === 'plan' ? 'Stage' : 'Receipt'} {clampedIndex + 1} / {itemCount}
            </span>
          )}
        </div>

        {mode === 'recorded' && (
          <div className="flex flex-wrap items-center gap-2">
            {workflowJobs.length > 0 && (
              <label className="flex items-center gap-1.5 text-xs text-[#475569]">
                <span className="sr-only">Select recent case for this workflow</span>
                <select
                  className="dm-input h-8 max-w-[260px] text-xs"
                  value={selectedCaseId}
                  onChange={(e) => {
                    activePinnedRef.current = null;
                    setSelectedCaseId(e.target.value);
                  }}
                >
                  {selectedCaseId && !workflowJobs.some((j) => j.id === selectedCaseId) && (
                    <option value={selectedCaseId}>
                      Selected case ({activeJob?.target || selectedCaseId.slice(0, 8)})
                    </option>
                  )}
                  {workflowJobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {formatStatusLabel(job.status)} · {job.target || 'No target'} ·{' '}
                      {formatStamp(job.updated_at)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {activeJob && (
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-md border border-[#cbd5e1] bg-white px-2.5 text-xs font-semibold text-[#1d4ed8] hover:bg-[#eff6ff]"
                onClick={() => onOpenCaseInInbox(activeJob.id)}
              >
                Open in Case Inbox <ArrowRight size={12} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* MODE 1: WORKFLOW PLAN (Template only, uncolored by state) */}
      {mode === 'plan' && (
        <div className="mt-3.5 space-y-3">
          {/* Desktop Connected Node Canvas */}
          <div className="hidden overflow-x-auto rounded-lg border border-[#e2e8f0] bg-[#f8fafc] md:block">
            <svg
              viewBox={`0 0 ${planCanvasW} ${planCanvasH}`}
              width="100%"
              style={{ minWidth: `${planCanvasW}px`, height: `${planCanvasH}px`, display: 'block' }}
              role="group"
              aria-label={`${workflow.title} reference template sequence`}
            >
              <defs>
                <pattern
                  id={`ops-plan-grid-${workflow.id}`}
                  width="18"
                  height="18"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="1" cy="1" r="1" fill="#dbe4ee" />
                </pattern>
              </defs>
              <rect
                width={planCanvasW}
                height={planCanvasH}
                fill={`url(#ops-plan-grid-${workflow.id})`}
                aria-hidden="true"
              />

              {/* Connectors */}
              {workflow.steps.slice(1).map((stage, i) => {
                const x1 = planPadX + i * (planNodeW + planGapX) + planNodeW;
                const x2 = planPadX + (i + 1) * (planNodeW + planGapX);
                const cy = planNodeY + planNodeH / 2;
                const activePath = i < clampedIndex;
                return (
                  <g key={`edge-${stage}-${i}`}>
                    <path
                      d={`M ${x1} ${cy} H ${x2 - 5}`}
                      fill="none"
                      stroke={activePath ? '#1d4ed8' : '#cbd5e1'}
                      strokeWidth={activePath ? 2.2 : 1.5}
                    />
                    <polygon
                      points={`${x2 - 6},${cy - 3.5} ${x2},${cy} ${x2 - 6},${cy + 3.5}`}
                      fill={activePath ? '#1d4ed8' : '#cbd5e1'}
                    />
                  </g>
                );
              })}

              {/* Template Stage Nodes (strictly uncolored by execution state) */}
              {workflow.steps.map((stage, i) => {
                const x = planPadX + i * (planNodeW + planGapX);
                const selected = i === clampedIndex;
                return (
                  <g
                    key={`stage-${stage}-${i}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Template stage ${i + 1}: ${stage}`}
                    aria-pressed={selected}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleStepSelect(i)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleStepSelect(i);
                      } else if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        handleStepSelect(Math.min(workflow.steps.length - 1, i + 1));
                      } else if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        handleStepSelect(Math.max(0, i - 1));
                      }
                    }}
                  >
                    <rect
                      x={x}
                      y={planNodeY}
                      width={planNodeW}
                      height={planNodeH}
                      rx={8}
                      fill={selected ? '#eff6ff' : '#ffffff'}
                      stroke={selected ? '#1d4ed8' : '#cbd5e1'}
                      strokeWidth={selected ? 2 : 1}
                    />
                    <text
                      x={x + 12}
                      y={planNodeY + 21}
                      fill="#64748b"
                      fontSize="10.5"
                      fontWeight="600"
                      fontFamily="IBM Plex Mono, ui-monospace, monospace"
                    >
                      {`STAGE 0${i + 1}`}
                    </text>
                    <text
                      x={x + planNodeW - 12}
                      y={planNodeY + 21}
                      textAnchor="end"
                      fill="#64748b"
                      fontSize="10.5"
                      fontWeight="500"
                    >
                      Template
                    </text>
                    <text
                      x={x + 12}
                      y={planNodeY + 46}
                      fill="#0f172a"
                      fontSize="12.5"
                      fontWeight="600"
                    >
                      {truncateText(stage, 23)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Mobile Vertical Stacked Template Flow */}
          <ol
            className="space-y-0 md:hidden"
            aria-label={`${workflow.title} reference template sequence`}
          >
            {workflow.steps.map((stage, i) => {
              const selected = i === clampedIndex;
              return (
                <li key={`mobile-stage-${stage}-${i}`}>
                  {i > 0 && (
                    <div className="ml-5 h-3.5 w-0.5 bg-[#cbd5e1]" aria-hidden="true">
                      <div
                        className={`h-full w-full ${i <= clampedIndex ? 'bg-[#1d4ed8]' : 'bg-[#cbd5e1]'}`}
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => handleStepSelect(i)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                      selected
                        ? 'border-[#1d4ed8] bg-[#eff6ff]'
                        : 'border-[#cbd5e1] bg-white hover:bg-[#f8fafc]'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="block font-mono text-[10.5px] font-semibold text-[#64748b]">
                        Stage 0{i + 1} · Template
                      </span>
                      <span className="mt-0.5 block text-xs font-semibold text-[#0f172a]">
                        {stage}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>

          {/* Selected Template Stage Detail */}
          {activePlanStage && (
            <div
              className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-xs"
              aria-live="polite"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-[#0f172a]">
                  Template stage {clampedIndex + 1} of {workflow.steps.length} · {activePlanStage}
                </p>
                <span className="text-[11px] font-medium text-[#64748b]">Reference only</span>
              </div>
              <p className="mt-1 leading-relaxed text-[#475569]">
                Reference stage for <strong className="font-medium text-[#0f172a]">{workflow.title}</strong>:{' '}
                {workflow.text} Actual tool receipts and actor attribution appear under{' '}
                <strong className="font-medium text-[#0f172a]">Recorded run</strong> once a case executes.
              </p>
              {Array.isArray(workflowTools) && workflowTools.length > 0 && (
                <p className="mt-1.5 text-[11px] text-[#64748b]">
                  Template tool scope ({workflowTools.length}):{' '}
                  {workflowTools.map(formatFriendlyToolLabel).join(' · ')}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODE 2: RECORDED RUN (Actual GET /v1/operations/jobs/{id} receipts + actor lanes) */}
      {mode === 'recorded' && (
        <div className="mt-3.5 space-y-3">
          {/* Case-level metadata strip (distinguishing Case outcome from individual Tool outcomes) */}
          {activeJob && (
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 tabular-nums">
                <span>
                  <span className="text-[#64748b]">Case status: </span>
                  <strong className={`font-semibold ${statusTextTone(activeJob.status)}`}>
                    {formatStatusLabel(activeJob.status)}
                  </strong>
                </span>
                {caseOutcomeLabel && (
                  <span>
                    <span className="text-[#64748b]">Case outcome: </span>
                    <strong className="font-medium capitalize text-[#0f172a]">
                      {caseOutcomeLabel}
                    </strong>
                  </span>
                )}
                {caseTriggerLabel && (
                  <span>
                    <span className="text-[#64748b]">Trigger: </span>
                    <strong className="font-medium text-[#0f172a]">{caseTriggerLabel}</strong>
                  </span>
                )}
                <span className="break-all text-[#475569]">
                  Target: <strong className="font-medium text-[#0f172a]">{activeJob.target || 'Not recorded'}</strong>
                </span>
              </div>

              {shouldPoll && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#1d4ed8]">
                  <RefreshCw size={11} className="animate-spin" aria-hidden="true" />
                  Checking for new receipts
                </span>
              )}
            </div>
          )}

          {/* No cases exist for this workflow */}
          {!workflowJobs.length ? (
            <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-5 py-7 text-center text-xs">
              <p className="font-semibold text-[#0f172a]">No recorded cases for this workflow</p>
              <p className="mx-auto mt-1 max-w-md text-[#64748b]">
                Save a draft or start a case in New case to record tool receipts for{' '}
                {workflow.title}.
              </p>
              <button
                type="button"
                className="mt-3 font-semibold text-[#1d4ed8] hover:underline"
                onClick={() => onPreselectNewCase(workflow.id)}
              >
                Preselect in New case →
              </button>
            </div>
          ) : loadingDetail && !jobDetail ? (
            /* Explicit loading state — never treated as empty */
            <div
              className="space-y-2 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4"
              role="status"
              aria-label="Loading recorded run receipts"
            >
              <p className="text-xs font-medium text-[#475569]">Loading recorded run receipts…</p>
              <div className="dm-skeleton h-16 w-full" />
            </div>
          ) : detailError && !jobDetail ? (
            /* Error / retry state */
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-xs text-[#991b1b]"
            >
              <span className="flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" aria-hidden="true" />
                {detailError}
              </span>
              <button
                type="button"
                className="dm-button"
                onClick={() => setRetryTick((n) => n + 1)}
              >
                <RefreshCw size={12} aria-hidden="true" /> Retry
              </button>
            </div>
          ) : orderedReceipts.length === 0 ? (
            /* Honest empty run state for draft / queued / receipt-less cases */
            <div
              role="status"
              className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-5 py-6 text-xs text-[#475569]"
            >
              <p className="font-semibold text-[#0f172a]">
                {activeJob?.status === 'draft'
                  ? 'Draft case — no tool receipts recorded'
                  : activeJob?.status === 'queued'
                    ? 'Queued case — awaiting first tool receipt'
                    : 'No tool receipts recorded for this case'}
              </p>
              <p className="mt-1 leading-relaxed text-[#64748b]">
                {activeJob?.status === 'draft'
                  ? 'Draft cases make no model calls and record no tool receipts until started.'
                  : activeJob?.status === 'queued'
                    ? 'The case is queued for the operations worker. Receipts will appear here automatically as checks run.'
                    : 'This case has no recorded tool receipts. Steps without receipts are not shown.'}
              </p>
              {activeJob?.last_error && (
                <p className="mt-2 break-words text-[#b91c1c]">{activeJob.last_error}</p>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Connected Swimlane Canvas */}
              <div className="hidden overflow-x-auto rounded-lg border border-[#e2e8f0] bg-[#f8fafc] md:block">
                <svg
                  viewBox={`0 0 ${recCanvasW} ${recCanvasH}`}
                  width="100%"
                  style={{ minWidth: `${recCanvasW}px`, height: `${recCanvasH}px`, display: 'block' }}
                  role="group"
                  aria-label={`Recorded tool receipts for ${workflow.title}`}
                >
                  <defs>
                    <pattern
                      id={`ops-rec-grid-${workflow.id}`}
                      width="18"
                      height="18"
                      patternUnits="userSpaceOnUse"
                    >
                      <circle cx="1" cy="1" r="1" fill="#dbe4ee" />
                    </pattern>
                  </defs>
                  <rect
                    width={recCanvasW}
                    height={recCanvasH}
                    fill={`url(#ops-rec-grid-${workflow.id})`}
                    aria-hidden="true"
                  />

                  {/* Left Actor Lane Rail */}
                  <rect
                    x={0}
                    y={0}
                    width={laneRailW}
                    height={recCanvasH}
                    fill="#ffffff"
                    aria-hidden="true"
                  />
                  <line
                    x1={laneRailW}
                    y1={0}
                    x2={laneRailW}
                    y2={recCanvasH}
                    stroke="#e2e8f0"
                    strokeWidth={1}
                  />

                  {/* Actor Lane Headers & Horizontal Hairlines */}
                  {activeLanes.map((laneKey, laneIdx) => {
                    const laneTop = recPadY + laneIdx * recLaneH;
                    const laneCenterY = laneTop + recLaneH / 2;
                    const matchedSubagent = attributedSubagents.find((s) => s.id === laneKey);
                    return (
                      <g key={`lane-${laneKey}`}>
                        {laneIdx > 0 && (
                          <line
                            x1={0}
                            y1={laneTop}
                            x2={recCanvasW}
                            y2={laneTop}
                            stroke="#e2e8f0"
                            strokeWidth={1}
                          />
                        )}
                        <text
                          x={14}
                          y={matchedSubagent?.name ? laneCenterY - 4 : laneCenterY + 4}
                          fill="#0f172a"
                          fontSize="11.5"
                          fontWeight="600"
                        >
                          {formatActorLabel(laneKey)}
                        </text>
                        {matchedSubagent?.name && (
                          <text
                            x={14}
                            y={laneCenterY + 13}
                            fill="#64748b"
                            fontSize="10"
                            fontWeight="500"
                          >
                            {truncateText(matchedSubagent.name, 19)}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {/* Chronological Connectors & Recorded Actor Handoffs */}
                  {orderedReceipts.slice(1).map((step, i) => {
                    const prev = orderedReceipts[i];
                    const prevLaneIdx = activeLanes.indexOf(normalizeActorKey(prev.actor));
                    const currLaneIdx = activeLanes.indexOf(normalizeActorKey(step.actor));
                    const x1 = laneRailW + recPadX + i * (recNodeW + recGapX) + recNodeW;
                    const x2 = laneRailW + recPadX + (i + 1) * (recNodeW + recGapX);
                    const y1 = recPadY + prevLaneIdx * recLaneH + recLaneH / 2;
                    const y2 = recPadY + currLaneIdx * recLaneH + recLaneH / 2;
                    const midX = x1 + recGapX / 2;
                    const isVisited = i < clampedIndex;
                    const pathD =
                      y1 === y2
                        ? `M ${x1} ${y1} H ${x2 - 5}`
                        : `M ${x1} ${y1} H ${midX} V ${y2} H ${x2 - 5}`;

                    return (
                      <g key={`rec-edge-${prev.sequence}-${step.sequence}`}>
                        <path
                          d={pathD}
                          fill="none"
                          stroke={isVisited ? '#1d4ed8' : '#cbd5e1'}
                          strokeWidth={isVisited ? 2.2 : 1.5}
                        />
                        <polygon
                          points={`${x2 - 6},${y2 - 3.5} ${x2},${y2} ${x2 - 6},${y2 + 3.5}`}
                          fill={isVisited ? '#1d4ed8' : '#cbd5e1'}
                        />
                      </g>
                    );
                  })}

                  {/* Recorded Receipt Nodes */}
                  {orderedReceipts.map((step, i) => {
                    const laneIdx = activeLanes.indexOf(normalizeActorKey(step.actor));
                    const x = laneRailW + recPadX + i * (recNodeW + recGapX);
                    const y = recPadY + laneIdx * recLaneH + (recLaneH - recNodeH) / 2;
                    const selected = i === clampedIndex;
                    const toolLabel = formatFriendlyToolLabel(step.tool);
                    const statusLabel = formatStatusLabel(step.status);
                    const statusHex = statusHexColor(step.status);
                    const actorLabel = formatActorLabel(step.actor);

                    return (
                      <g
                        key={`rec-node-${step.sequence}`}
                        role="button"
                        tabIndex={0}
                        aria-label={`Receipt ${step.sequence}: ${toolLabel}, ${actorLabel}, status ${statusLabel}`}
                        aria-pressed={selected}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleStepSelect(i)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleStepSelect(i);
                          } else if (e.key === 'ArrowRight') {
                            e.preventDefault();
                            handleStepSelect(Math.min(orderedReceipts.length - 1, i + 1));
                          } else if (e.key === 'ArrowLeft') {
                            e.preventDefault();
                            handleStepSelect(Math.max(0, i - 1));
                          }
                        }}
                      >
                        <rect
                          x={x}
                          y={y}
                          width={recNodeW}
                          height={recNodeH}
                          rx={8}
                          fill={selected ? '#eff6ff' : '#ffffff'}
                          stroke={selected ? '#1d4ed8' : nodeStatusBorderHex(step.status)}
                          strokeWidth={selected ? 2.2 : 1.2}
                        />
                        <text
                          x={x + 11}
                          y={y + 20}
                          fill="#64748b"
                          fontSize="10.5"
                          fontWeight="600"
                          fontFamily="IBM Plex Mono, ui-monospace, monospace"
                        >
                          {`#${step.sequence}`}
                        </text>
                        <text
                          x={x + recNodeW - 11}
                          y={y + 20}
                          textAnchor="end"
                          fill={statusHex}
                          fontSize="10.5"
                          fontWeight="600"
                        >
                          {truncateText(statusLabel, 16)}
                        </text>
                        <text
                          x={x + 11}
                          y={y + 42}
                          fill="#0f172a"
                          fontSize="12"
                          fontWeight="600"
                        >
                          {truncateText(toolLabel, 24)}
                        </text>
                        <text
                          x={x + 11}
                          y={y + 59}
                          fill="#64748b"
                          fontSize="10.5"
                          fontWeight="500"
                        >
                          {truncateText(actorLabel, 24)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Mobile Stacked Vertical Recorded Receipt Flow */}
              <ol
                className="space-y-0 md:hidden"
                aria-label={`Recorded tool receipts for ${workflow.title}`}
              >
                {orderedReceipts.map((step, i) => {
                  const selected = i === clampedIndex;
                  return (
                    <li key={`mobile-rec-${step.sequence}`}>
                      {i > 0 && (
                        <div className="ml-5 h-3.5 w-0.5 bg-[#cbd5e1]" aria-hidden="true">
                          <div
                            className={`h-full w-full ${i <= clampedIndex ? 'bg-[#1d4ed8]' : 'bg-[#cbd5e1]'}`}
                          />
                        </div>
                      )}
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => handleStepSelect(i)}
                        className={`w-full rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                          selected
                            ? 'border-[#1d4ed8] bg-[#eff6ff]'
                            : 'border-[#cbd5e1] bg-white hover:bg-[#f8fafc]'
                        }`}
                      >
                        <div className="flex items-baseline justify-between gap-2 text-[11px] tabular-nums">
                          <span className="font-mono font-semibold text-[#64748b]">
                            #{step.sequence} · {formatActorLabel(step.actor)}
                          </span>
                          <span className={`font-semibold ${statusTextTone(step.status)}`}>
                            {formatStatusLabel(step.status)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs font-semibold text-[#0f172a]">
                          {formatFriendlyToolLabel(step.tool)}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ol>

              {/* Selected Receipt Detail Panel (concise safe summary only — never raw JSON/PII/credentials) */}
              {activeReceipt && (
                <div
                  className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4 text-xs"
                  aria-live="polite"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#e2e8f0] pb-2.5">
                    <p className="text-sm font-semibold text-[#0f172a]">
                      Receipt #{activeReceipt.sequence} · {formatFriendlyToolLabel(activeReceipt.tool)}
                    </p>
                    <span className="font-mono text-[11px] text-[#64748b]">
                      {activeReceipt.tool}
                    </span>
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-3 tabular-nums sm:grid-cols-4">
                    <div>
                      <dt className="text-[11px] font-medium text-[#64748b]">Actor</dt>
                      <dd className="mt-0.5 font-semibold text-[#0f172a]">
                        {formatActorLabel(activeReceipt.actor)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-medium text-[#64748b]">Tool status</dt>
                      <dd className={`mt-0.5 font-semibold ${statusTextTone(activeReceipt.status)}`}>
                        {formatStatusLabel(activeReceipt.status)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-medium text-[#64748b]">Created</dt>
                      <dd className="mt-0.5 text-[#334155]">
                        {formatStamp(activeReceipt.created_at || activeReceipt.timestamp)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-medium text-[#64748b]">Completed</dt>
                      <dd className="mt-0.5 text-[#334155]">
                        {activeReceipt.completed_at
                          ? formatStamp(activeReceipt.completed_at)
                          : isActivePollableStatus(activeReceipt.status)
                            ? 'In progress'
                            : 'Not recorded'}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-3 border-t border-[#e2e8f0] pt-2.5">
                    <p className="text-[11px] font-medium text-[#64748b]">Safe result summary</p>
                    <p className="mt-0.5 leading-relaxed text-[#334155]">
                      {summarizeSafeStepResult(activeReceipt)}
                    </p>
                  </div>

                  <p className="mt-2.5 text-[11px] text-[#64748b]">
                    Playback and step controls navigate existing recorded receipts only; they never
                    invoke tools or call a model.
                  </p>
                </div>
              )}

              {/* Specialist Rail (attributed by exact specialist ID) + Older Unattributed Summaries */}
              {(attributedSubagents.length > 0 || unattributedSubagents.length > 0) && (
                <div className="grid grid-cols-1 gap-3 border-t border-[#e2e8f0] pt-3 lg:grid-cols-12">
                  {attributedSubagents.length > 0 && (
                    <div className={unattributedSubagents.length > 0 ? 'lg:col-span-7' : 'lg:col-span-12'}>
                      <p className="text-[11px] font-semibold text-[#334155]">
                        Attributed specialist lanes
                      </p>
                      <ul className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {attributedSubagents.map((sub) => {
                          const firstStepIdx = orderedReceipts.findIndex(
                            (step) => normalizeActorKey(step.actor) === sub.id
                          );
                          const safeSummary = sanitizeSafeText(
                            sub.summary || sub.objective || 'No summary recorded.',
                            180
                          );
                          return (
                            <li
                              key={sub.id}
                              className="rounded-md border border-[#e2e8f0] bg-[#f8fafc] p-3 text-xs"
                            >
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="font-semibold text-[#0f172a]">
                                  {formatActorLabel(sub.id)}
                                  {sub.name ? ` · ${sub.name}` : ''}
                                </span>
                                {firstStepIdx >= 0 && (
                                  <button
                                    type="button"
                                    className="shrink-0 text-[11px] font-semibold text-[#1d4ed8] hover:underline"
                                    onClick={() => handleStepSelect(firstStepIdx)}
                                  >
                                    Jump to #{orderedReceipts[firstStepIdx].sequence}
                                  </button>
                                )}
                              </div>
                              {safeSummary && (
                                <p className="mt-1 leading-relaxed text-[#475569]">{safeSummary}</p>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {unattributedSubagents.length > 0 && (
                    <div className={attributedSubagents.length > 0 ? 'lg:col-span-5' : 'lg:col-span-12'}>
                      <p className="text-[11px] font-semibold text-[#334155]">
                        Recorded subagent summaries{' '}
                        <span className="font-normal text-[#64748b]">(not linked to steps)</span>
                      </p>
                      <ul className="mt-1.5 space-y-1.5">
                        {unattributedSubagents.map((sub, idx) => {
                          const safeSummary = sanitizeSafeText(
                            sub.summary || sub.objective || '',
                            180
                          );
                          return (
                            <li
                              key={`${sub.name || 'subagent'}-${idx}`}
                              className="rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-xs"
                            >
                              <p className="font-semibold text-[#0f172a]">
                                {sub.name || sub.role || `Recorded subagent ${idx + 1}`}
                              </p>
                              {safeSummary && (
                                <p className="mt-0.5 leading-relaxed text-[#475569]">{safeSummary}</p>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
};
