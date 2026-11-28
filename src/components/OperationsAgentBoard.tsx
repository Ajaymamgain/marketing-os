import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Copy,
  FileText,
  Plus,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { ActiveNavTab } from '../types';
import {
  OperationsWorkflowVisualization,
  type JobDetailPayload,
  type VisualizationMode,
} from './OperationsWorkflowVisualization';

export type WorkspaceSkill = {
  id: string;
  workflow: string;
  name: string;
  description: string;
  instructions: string;
  status: 'draft' | 'published' | string;
  revision: number;
  updated_at: string | null;
};

export type WorkflowSkillScope = {
  tools?: string[];
  description?: string;
  [key: string]: unknown;
};

export type RecordedSubagent = {
  id?: string;
  name?: string;
  role?: string;
  objective?: string;
  status?: string;
  summary?: string;
  completed_at?: string | null;
  [key: string]: unknown;
};

export type OperationsBoardJob = {
  id: string;
  workflow: string;
  target: string;
  status: string;
  trigger?: 'manual' | 'automatic' | string | null;
  created_at?: string | null;
  updated_at: string;
  completed_at?: string | null;
  last_error?: string;
  skill_id?: string | null;
  skill_name?: string | null;
  skill_revision?: number | null;
  result?: {
    report?: {
      facts?: Array<{
        field: string;
        value: string;
        source_url: string;
        quote: string;
        evidence_sequence: number;
      }>;
      summary: string;
      proposal: string;
      outcome: string;
      evidence_sequences: number[];
      subagents?: RecordedSubagent[];
    };
    usage?: { model_calls?: number; total_tokens?: number };
    provider_receipt?: { status?: string; confirmed_at?: string | null; summary?: string } | null;
    subagents?: RecordedSubagent[];
  };
};

export type WorkflowDefinition = {
  id: string;
  title: string;
  text: string;
  steps: readonly string[];
};

export const TOOL_FRIENDLY_LABELS: Record<string, string> = {
  dm_operation_context: 'Read case context & job evidence',
  dm_connector_inspect: 'Inspect approved connection tools',
  dm_analyze_data: 'Run registered workspace analysis',
  dm_extract_sources: 'Extract cited source passages',
  dm_research_people: 'Search public professional roles',
  dm_research_company: 'Search public company sources',
  dm_configuration_preview: 'Preview scoring configuration draft',
  dm_operation_submit: 'Submit validated report',
  dm_list_connectors: 'List workspace connections',
  dm_read_decisions: 'Read stored decisions',
  dm_read_imports: 'Inspect historical import records',
  dm_read_deliveries: 'Inspect recorded delivery runs',
};

export function formatFriendlyToolLabel(toolName: string): string {
  if (TOOL_FRIENDLY_LABELS[toolName]) return TOOL_FRIENDLY_LABELS[toolName];
  const cleaned = toolName.replace(/^dm_/, '').replaceAll('_', ' ').trim();
  if (!cleaned) return toolName;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function extractRecordedSubagents(job?: OperationsBoardJob | null): RecordedSubagent[] {
  if (!job?.result) return [];
  const raw = Array.isArray(job.result.subagents)
    ? job.result.subagents
    : Array.isArray(job.result.report?.subagents)
      ? job.result.report.subagents
      : [];
  return raw.filter((item): item is RecordedSubagent => Boolean(item && typeof item === 'object'));
}

interface OperationsAgentBoardProps {
  workflows: readonly WorkflowDefinition[];
  workflowNames: Record<string, string>;
  stateLoaded: boolean;
  ready: boolean;
  paused: boolean;
  decisionServiceOn: boolean | null;
  researchConfigured: boolean;
  automaticWorkflows: string[];
  policyEnabled: boolean;
  policyWorkflows: string[];
  targets: Record<string, Array<{ id: string; label: string }>>;
  workflowSkillsMap?: Record<string, WorkflowSkillScope>;
  jobs: OperationsBoardJob[];
  skills: WorkspaceSkill[];
  skillsLoading: boolean;
  skillsUnavailable: boolean;
  skillsError: string;
  canEditSkills: boolean;
  onReloadSkills: () => Promise<void>;
  onSaveSkill: (payload: {
    action: 'save';
    workflow: string;
    name: string;
    description: string;
    instructions: string;
    id?: string;
    revision?: number;
  }) => Promise<WorkspaceSkill>;
  onPublishSkill: (payload: {
    action: 'publish';
    id: string;
    revision: number;
  }) => Promise<WorkspaceSkill>;
  onSelectWorkflowForNewCase: (workflowId: string, skillId?: string) => void;
  onInspectJobInInbox: (jobId: string) => void;
  onFilterInboxByWorkflow: (workflowId: string) => void;
  onOpenInstructions: (workflowId: string) => void;
  onNavigateTab?: (tab: ActiveNavTab) => void;
  fetchJobDetail: (jobId: string) => Promise<JobDetailPayload>;
  isActive?: boolean;
  externalWorkflowId?: string | null;
  externalPinnedCaseId?: string | null;
  externalVizMode?: VisualizationMode;
  externalVizFocusTick?: number;
  formatStamp: (value?: string | null) => string;
  formatStatusLabel: (status?: string | null) => string;
  statusTextTone: (status?: string | null) => string;
  hasPendingProposal: (job?: OperationsBoardJob | null) => boolean;
}

type EditorMode = 'closed' | 'create' | 'edit' | 'view';

export const OperationsAgentBoard: React.FC<OperationsAgentBoardProps> = ({
  workflows,
  workflowNames,
  stateLoaded,
  ready,
  paused,
  decisionServiceOn,
  researchConfigured,
  automaticWorkflows,
  policyEnabled,
  policyWorkflows,
  targets,
  workflowSkillsMap,
  jobs,
  skills,
  skillsLoading,
  skillsUnavailable,
  skillsError,
  canEditSkills,
  onReloadSkills,
  onSaveSkill,
  onPublishSkill,
  onSelectWorkflowForNewCase,
  onInspectJobInInbox,
  onFilterInboxByWorkflow,
  onOpenInstructions,
  onNavigateTab,
  fetchJobDetail,
  isActive = true,
  externalWorkflowId,
  externalPinnedCaseId,
  externalVizMode,
  externalVizFocusTick = 0,
  formatStamp,
  formatStatusLabel,
  statusTextTone,
  hasPendingProposal,
}) => {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>(workflows[0]?.id || 'sync-investigation');
  const [skillWorkflowFilter, setSkillWorkflowFilter] = useState<string>('all');
  const [skillStatusFilter, setSkillStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  // Skill editor state
  const [editorMode, setEditorMode] = useState<EditorMode>('closed');
  const [editorFocusTick, setEditorFocusTick] = useState(0);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [editingRevision, setEditingRevision] = useState<number | undefined>(undefined);
  const [editingStatus, setEditingStatus] = useState<string>('draft');
  const [editingUpdatedAt, setEditingUpdatedAt] = useState<string | null>(null);
  const [formWorkflow, setFormWorkflow] = useState<string>(workflows[0]?.id || 'sync-investigation');
  const [formName, setFormName] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formInstructions, setFormInstructions] = useState<string>('');
  const [formDirty, setFormDirty] = useState<boolean>(false);

  const [skillBusy, setSkillBusy] = useState<'save' | 'publish' | null>(null);
  const [publishingRowId, setPublishingRowId] = useState<string | null>(null);
  const [skillFormError, setSkillFormError] = useState<string>('');
  const [skillStatusNotice, setSkillStatusNotice] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    instructions?: string;
  }>({});

  const editorSectionRef = useRef<HTMLElement | null>(null);
  const skillNameInputRef = useRef<HTMLInputElement | null>(null);
  const editorHeadingRef = useRef<HTMLHeadingElement | null>(null);

  // Group bounded recent jobs by workflow (preserving backend order, most recent first)
  const jobsByWorkflow = useMemo(() => {
    const map: Record<string, OperationsBoardJob[]> = {};
    for (const wf of workflows) map[wf.id] = [];
    for (const job of jobs) {
      if (!map[job.workflow]) map[job.workflow] = [];
      map[job.workflow].push(job);
    }
    return map;
  }, [jobs, workflows]);

  const publishedSkillsByWorkflow = useMemo(() => {
    const map: Record<string, WorkspaceSkill[]> = {};
    for (const skill of skills) {
      if (skill.status !== 'published') continue;
      if (!map[skill.workflow]) map[skill.workflow] = [];
      map[skill.workflow].push(skill);
    }
    return map;
  }, [skills]);

  const inspectedWorkflow =
    workflows.find((w) => w.id === selectedWorkflowId) || workflows[0];
  const inspectedWorkflowJobs = jobsByWorkflow[inspectedWorkflow.id] || [];
  const latestInspectedJob = inspectedWorkflowJobs[0] || null;
  const latestInspectedSubagents = useMemo(
    () => extractRecordedSubagents(latestInspectedJob),
    [latestInspectedJob]
  );

  const inspectedToolScope = workflowSkillsMap?.[inspectedWorkflow.id]?.tools;
  const editorToolScope = workflowSkillsMap?.[formWorkflow]?.tools;

  const filteredSkills = useMemo(() => {
    return skills.filter((item) => {
      if (skillWorkflowFilter !== 'all' && item.workflow !== skillWorkflowFilter) return false;
      if (skillStatusFilter !== 'all' && item.status !== skillStatusFilter) return false;
      return true;
    });
  }, [skills, skillWorkflowFilter, skillStatusFilter]);

  useEffect(() => {
    if (!externalVizFocusTick || !externalWorkflowId) return;
    if (workflows.some((wf) => wf.id === externalWorkflowId)) {
      setSelectedWorkflowId(externalWorkflowId);
    }
  }, [externalVizFocusTick, externalWorkflowId, workflows]);

  useEffect(() => {
    if (editorMode === 'closed') return;
    const timer = window.setTimeout(() => {
      editorSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (editorMode === 'create' || editorMode === 'edit') {
        skillNameInputRef.current?.focus();
      } else {
        editorHeadingRef.current?.focus();
      }
    }, 30);
    return () => window.clearTimeout(timer);
  }, [editorMode, editingSkillId, editorFocusTick]);

  const openCreateSkill = (initialWorkflow?: string) => {
    if (!canEditSkills || skillsUnavailable) return;
    setEditorMode('create');
    setEditorFocusTick((n) => n + 1);
    setEditingSkillId(null);
    setEditingRevision(undefined);
    setEditingStatus('draft');
    setEditingUpdatedAt(null);
    setFormWorkflow(initialWorkflow || selectedWorkflowId || workflows[0]?.id || 'sync-investigation');
    setFormName('');
    setFormDescription('');
    setFormInstructions('');
    setFormDirty(false);
    setValidationErrors({});
    setSkillFormError('');
    setSkillStatusNotice('');
  };

  const openSkill = (skill: WorkspaceSkill) => {
    const isDraft = skill.status === 'draft';
    setEditorMode(isDraft && canEditSkills ? 'edit' : 'view');
    setEditorFocusTick((n) => n + 1);
    setEditingSkillId(skill.id);
    setEditingRevision(skill.revision);
    setEditingStatus(skill.status);
    setEditingUpdatedAt(skill.updated_at);
    setFormWorkflow(skill.workflow);
    setFormName(skill.name);
    setFormDescription(skill.description || '');
    setFormInstructions(skill.instructions || '');
    setFormDirty(false);
    setValidationErrors({});
    setSkillFormError('');
    setSkillStatusNotice('');
  };

  const openDuplicateSkill = (skill: WorkspaceSkill) => {
    if (!canEditSkills || skillsUnavailable) return;
    setEditorMode('create');
    setEditorFocusTick((n) => n + 1);
    setEditingSkillId(null);
    setEditingRevision(undefined);
    setEditingStatus('draft');
    setEditingUpdatedAt(null);
    setFormWorkflow(skill.workflow);
    setFormName(`${skill.name} (draft)`.slice(0, 120));
    setFormDescription(skill.description || '');
    setFormInstructions(skill.instructions || '');
    setFormDirty(true);
    setValidationErrors({});
    setSkillFormError('');
    setSkillStatusNotice(
      `Duplicated "${skill.name}" (rev ${skill.revision}) into a new unpublished draft. Save draft to persist it.`
    );
  };

  const closeEditor = () => {
    setEditorMode('closed');
    setValidationErrors({});
    setSkillFormError('');
  };

  const validateEditor = (): boolean => {
    const nextErrors: { name?: string; instructions?: string } = {};
    if (!formName.trim()) {
      nextErrors.name = 'Enter a descriptive skill name.';
    }
    if (!formInstructions.trim()) {
      nextErrors.instructions = 'Enter workflow instructions for this skill.';
    }
    setValidationErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSaveDraft = async (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    if (!canEditSkills || skillsUnavailable || skillBusy) return;
    if (!validateEditor()) return;

    setSkillBusy('save');
    setSkillFormError('');
    setSkillStatusNotice('');
    try {
      const saved = await onSaveSkill({
        action: 'save',
        workflow: formWorkflow,
        name: formName.trim(),
        description: formDescription.trim(),
        instructions: formInstructions.trim(),
        ...(editingSkillId ? { id: editingSkillId, revision: editingRevision } : {}),
      });
      setEditingSkillId(saved.id);
      setEditingRevision(saved.revision);
      setEditingStatus(saved.status);
      setEditingUpdatedAt(saved.updated_at);
      setFormWorkflow(saved.workflow);
      setFormName(saved.name);
      setFormDescription(saved.description || '');
      setFormInstructions(saved.instructions || '');
      setFormDirty(false);
      setEditorMode(saved.status === 'draft' ? 'edit' : 'view');
      setSkillStatusNotice(
        `Saved draft "${saved.name}" (rev ${saved.revision}). No model calls were made.`
      );
    } catch (cause) {
      setSkillFormError(
        cause instanceof Error ? cause.message : 'Workspace skill draft could not be saved.'
      );
    } finally {
      setSkillBusy(null);
    }
  };

  const handlePublishFromEditor = async () => {
    if (!canEditSkills || skillsUnavailable || skillBusy) return;
    if (!validateEditor()) return;

    setSkillBusy('publish');
    setSkillFormError('');
    setSkillStatusNotice('');
    try {
      let targetId = editingSkillId;
      let targetRevision = editingRevision;

      if (!targetId || targetRevision == null || formDirty) {
        const saved = await onSaveSkill({
          action: 'save',
          workflow: formWorkflow,
          name: formName.trim(),
          description: formDescription.trim(),
          instructions: formInstructions.trim(),
          ...(targetId ? { id: targetId, revision: targetRevision } : {}),
        });
        targetId = saved.id;
        targetRevision = saved.revision;
        setEditingSkillId(saved.id);
        setEditingRevision(saved.revision);
        setFormDirty(false);
      }

      const published = await onPublishSkill({
        action: 'publish',
        id: targetId,
        revision: targetRevision,
      });

      setEditingSkillId(published.id);
      setEditingRevision(published.revision);
      setEditingStatus(published.status);
      setEditingUpdatedAt(published.updated_at);
      setFormWorkflow(published.workflow);
      setFormName(published.name);
      setFormDescription(published.description || '');
      setFormInstructions(published.instructions || '');
      setFormDirty(false);
      setEditorMode('view');
      setSkillStatusNotice(
        `Published "${published.name}" (rev ${published.revision}). It is now read-only and selectable in New case for ${workflowNames[published.workflow] || published.workflow}.`
      );
    } catch (cause) {
      setSkillFormError(
        cause instanceof Error ? cause.message : 'Workspace skill could not be published.'
      );
    } finally {
      setSkillBusy(null);
    }
  };

  const handleQuickPublishRow = async (skill: WorkspaceSkill) => {
    if (!canEditSkills || skillsUnavailable || publishingRowId || skillBusy) return;
    setPublishingRowId(skill.id);
    setSkillFormError('');
    setSkillStatusNotice('');
    try {
      const published = await onPublishSkill({
        action: 'publish',
        id: skill.id,
        revision: skill.revision,
      });
      if (editingSkillId === published.id) {
        setEditingRevision(published.revision);
        setEditingStatus(published.status);
        setEditingUpdatedAt(published.updated_at);
        setEditorMode('view');
        setFormDirty(false);
      }
      setSkillStatusNotice(
        `Published "${published.name}" (rev ${published.revision}). No model calls were made.`
      );
    } catch (cause) {
      setSkillFormError(
        cause instanceof Error ? cause.message : 'Workspace skill could not be published.'
      );
    } finally {
      setPublishingRowId(null);
    }
  };

  const getWorkflowReadiness = (wfId: string) => {
    const needsResearch = ['company-enrichment', 'people-enrichment'].includes(wfId);
    const eligibleCount = targets[wfId]?.length ?? 0;

    if (!stateLoaded) {
      return { label: 'Status unavailable', tone: 'text-[#64748b]' };
    }
    if (paused || decisionServiceOn === false) {
      return { label: 'Runs paused', tone: 'text-[#b45309]' };
    }
    if (!ready) {
      return { label: 'Setup required', tone: 'text-[#b45309]' };
    }
    if (needsResearch && !researchConfigured) {
      return { label: 'Research setup required', tone: 'text-[#b45309]' };
    }
    if (eligibleCount === 0) {
      return { label: 'Ready · 0 eligible targets', tone: 'text-[#475569]' };
    }
    return { label: 'Ready', tone: 'text-[#15803d]' };
  };

  const getWorkflowTriggerLabel = (wfId: string) => {
    const autoEligible = automaticWorkflows.includes(wfId);
    if (!autoEligible) return 'Manual only';
    if (policyEnabled && policyWorkflows.includes(wfId)) return 'Automatic + manual';
    return 'Manual · auto trigger off';
  };

  const handlePlaybooksLink = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (onNavigateTab) {
      event.preventDefault();
      onNavigateTab('SIGNALS');
    }
  };

  const isEditorReadOnly = editorMode === 'view' || !canEditSkills;

  return (
    <div className="divide-y divide-[#e2e8f0]">
      {/* SECTION 1: BUILT-IN WORKFLOW BOARD (12-column ledger on desktop, stacked list on mobile) */}
      <section className="p-5 sm:p-6" aria-labelledby="ops-agent-board-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <h3 id="ops-agent-board-heading" className="text-base font-semibold text-[#0f172a]">
                Agent Board
              </h3>
              <span className="text-xs font-medium tabular-nums text-[#64748b]">
                {workflows.length} built-in workflows
              </span>
            </div>
            <p className="mt-0.5 text-xs text-[#64748b]">
              Six fixed read-only workflows backed by workspace readiness and recorded case history.
              Select a workflow to inspect its template sequence, tool scope, or latest run evidence.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="dm-button dm-button-primary whitespace-nowrap shrink-0"
              disabled={!canEditSkills || skillsUnavailable}
              onClick={() => openCreateSkill(selectedWorkflowId)}
            >
              <Plus size={14} /> Create skill
            </button>
          </div>
        </div>

        {/* Desktop 12-column column headers */}
        <div
          className="mt-4 hidden grid-cols-12 gap-4 border-y border-[#e2e8f0] bg-[#f8fafc] px-4 py-2 text-[11px] font-semibold text-[#475569] lg:grid"
          aria-hidden="true"
        >
          <div className="col-span-4">Workflow &amp; purpose</div>
          <div className="col-span-3">Trigger &amp; readiness</div>
          <div className="col-span-3">Recent case state &amp; latest run</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {/* Responsive workflow rows */}
        <ul
          className="mt-4 divide-y divide-[#e2e8f0] rounded-lg border border-[#e2e8f0] bg-white lg:mt-0 lg:rounded-t-none lg:border-t-0"
          aria-label="Built-in operations workflows"
        >
          {workflows.map((wf) => {
            const wfJobs = jobsByWorkflow[wf.id] || [];
            const latestJob = wfJobs[0] || null;
            const pendingCount = wfJobs.filter((j) => hasPendingProposal(j)).length;
            const targetCount = stateLoaded ? (targets[wf.id]?.length ?? 0) : null;
            const publishedCount = (publishedSkillsByWorkflow[wf.id] || []).length;
            const readiness = getWorkflowReadiness(wf.id);
            const triggerLabel = getWorkflowTriggerLabel(wf.id);
            const isSelected = inspectedWorkflow.id === wf.id;

            return (
              <li
                key={wf.id}
                className={`transition-colors ${
                  isSelected ? 'bg-[#eff6ff]/50' : 'bg-white hover:bg-[#f8fafc]'
                }`}
              >
                <div className="grid grid-cols-1 gap-3 px-4 py-3.5 lg:grid-cols-12 lg:items-center lg:gap-4">
                  {/* Col 1-4: Workflow & purpose */}
                  <div className="min-w-0 lg:col-span-4">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setSelectedWorkflowId(wf.id)}
                        className={`text-left text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4ed8] ${
                          isSelected ? 'text-[#1d4ed8]' : 'text-[#0f172a] hover:text-[#1d4ed8]'
                        }`}
                      >
                        {wf.title}
                      </button>
                      <span className="text-[11px] tabular-nums text-[#64748b]">
                        {targetCount == null
                          ? '—'
                          : `${targetCount} target${targetCount === 1 ? '' : 's'}`}
                        {publishedCount > 0 && (
                          <>
                            {' '}
                            · {publishedCount} published skill{publishedCount === 1 ? '' : 's'}
                          </>
                        )}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-[#475569]">{wf.text}</p>
                  </div>

                  {/* Col 5-7: Trigger & readiness */}
                  <div className="min-w-0 text-xs lg:col-span-3">
                    <p className={`font-semibold ${readiness.tone}`}>{readiness.label}</p>
                    <p className="mt-0.5 text-[#64748b]">{triggerLabel}</p>
                  </div>

                  {/* Col 8-10: Real recent case state & latest run */}
                  <div className="min-w-0 text-xs lg:col-span-3">
                    {latestJob ? (
                      <>
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className={`font-semibold ${statusTextTone(latestJob.status)}`}>
                            {formatStatusLabel(latestJob.status)}
                          </span>
                          <span className="tabular-nums text-[#64748b]">
                            {formatStamp(latestJob.updated_at)}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-[#475569]" title={latestJob.target}>
                          {latestJob.target || 'Target not recorded'}
                        </p>
                        <p className="mt-0.5 text-[11px] tabular-nums text-[#64748b]">
                          {wfJobs.length} in recent history
                          {pendingCount > 0 && (
                            <span className="font-semibold text-[#b45309]">
                              {' '}
                              · {pendingCount} awaiting review
                            </span>
                          )}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-[#475569]">No recorded cases</p>
                        <p className="mt-0.5 text-[11px] text-[#64748b]">
                          No runs in current history
                        </p>
                      </>
                    )}
                  </div>

                  {/* Col 11-12: Row actions */}
                  <div className="flex flex-wrap items-center gap-3 text-xs lg:col-span-2 lg:justify-end">
                    <button
                      type="button"
                      className="whitespace-nowrap font-semibold text-[#1d4ed8] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4ed8]"
                      onClick={() => onSelectWorkflowForNewCase(wf.id)}
                    >
                      Use in New case
                    </button>
                    <button
                      type="button"
                      className="whitespace-nowrap font-medium text-[#475569] hover:text-[#0f172a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4ed8]"
                      onClick={() => setSelectedWorkflowId(wf.id)}
                      aria-expanded={isSelected}
                    >
                      {isSelected ? 'Inspecting' : 'Inspect'}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {/* COMPACT WORKFLOW INSPECTION AREA (Header -> Workflow Visualization -> Template & Tool Scope | Run Evidence) */}
        <div
          className="mt-4 overflow-hidden rounded-lg border border-[#e2e8f0] bg-white"
          aria-label={`Inspection details for ${inspectedWorkflow.title}`}
        >
          {/* Selected Workflow Header */}
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#e2e8f0] bg-[#f8fafc]/80 px-4 py-3.5 sm:px-5">
            <div>
              <p className="text-[11px] font-medium text-[#64748b]">
                Selected built-in workflow
              </p>
              <h4 className="mt-0.5 text-sm font-semibold text-[#0f172a]">
                {inspectedWorkflow.title}
              </h4>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <button
                type="button"
                className="font-semibold text-[#1d4ed8] hover:underline"
                onClick={() => onSelectWorkflowForNewCase(inspectedWorkflow.id)}
              >
                Preselect in New case
              </button>
              <button
                type="button"
                className="font-medium text-[#475569] hover:text-[#0f172a]"
                onClick={() => onOpenInstructions(inspectedWorkflow.id)}
              >
                Edit instructions
              </button>
            </div>
          </div>

          {/* Workflow Visualization (Workflow plan template + Recorded run receipts) */}
          <div className="border-b border-[#e2e8f0]">
            <OperationsWorkflowVisualization
              workflow={inspectedWorkflow}
              workflowJobs={inspectedWorkflowJobs}
              workflowTools={inspectedToolScope}
              fetchJobDetail={fetchJobDetail}
              pinnedCaseId={
                externalWorkflowId === inspectedWorkflow.id ? externalPinnedCaseId : null
              }
              requestedMode={
                externalWorkflowId === inspectedWorkflow.id ? externalVizMode : undefined
              }
              focusRequestTick={
                externalWorkflowId === inspectedWorkflow.id ? externalVizFocusTick : 0
              }
              isActive={isActive}
              onOpenCaseInInbox={onInspectJobInInbox}
              onPreselectNewCase={(wfId) => onSelectWorkflowForNewCase(wfId)}
              formatStamp={formatStamp}
              formatStatusLabel={formatStatusLabel}
              statusTextTone={statusTextTone}
            />
          </div>

          <div className="grid grid-cols-1 divide-y divide-[#e2e8f0] bg-[#f8fafc]/60 lg:grid-cols-12 lg:divide-x lg:divide-y-0">
            {/* Left 7 cols: Template sequence + Read-only tool scope */}
            <div className="space-y-4 p-4 sm:p-5 lg:col-span-7">
            {/* Template sequence explicitly labeled as a template */}
            <div>
              <p className="text-xs font-semibold text-[#334155]">
                Template sequence{' '}
                <span className="font-normal text-[#64748b]">
                  (example check order · not run evidence)
                </span>
              </p>
              <ol className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-[#334155]">
                {inspectedWorkflow.steps.map((stepName, index) => (
                  <li key={stepName} className="inline-flex items-center gap-1.5">
                    <span className="font-semibold tabular-nums text-[#0f172a]">
                      {index + 1}.
                    </span>
                    <span>{stepName}</span>
                    {index < inspectedWorkflow.steps.length - 1 && (
                      <ArrowRight size={11} className="text-[#94a3b8]" aria-hidden="true" />
                    )}
                  </li>
                ))}
              </ol>
            </div>

            {/* Read-only workflow tool scope from GET /v1/operations/status */}
            <div className="border-t border-[#e2e8f0] pt-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-xs font-semibold text-[#334155]">
                  Inherited workflow tool scope{' '}
                  <span className="font-normal text-[#64748b]">(read-only)</span>
                </p>
                {Array.isArray(inspectedToolScope) && (
                  <span className="text-[11px] tabular-nums text-[#64748b]">
                    {inspectedToolScope.length} tool{inspectedToolScope.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              {Array.isArray(inspectedToolScope) && inspectedToolScope.length > 0 ? (
                <>
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#334155]">
                    {inspectedToolScope.map((tool) => (
                      <li key={tool} className="inline-flex items-center gap-1.5">
                        <span className="h-1 w-1 rounded-full bg-[#64748b]" aria-hidden="true" />
                        <span>{formatFriendlyToolLabel(tool)}</span>
                      </li>
                    ))}
                  </ul>
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer font-medium text-[#475569] hover:text-[#0f172a]">
                      Technical tool names
                    </summary>
                    <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-[#475569]">
                      {inspectedToolScope.map((tool) => (
                        <li key={tool}>{tool}</li>
                      ))}
                    </ul>
                  </details>
                </>
              ) : (
                <p className="mt-1.5 text-xs text-[#64748b]">
                  {stateLoaded
                    ? 'Tool scope was not reported for this workflow by the backend.'
                    : 'Tool scope loads from workspace operations status.'}
                </p>
              )}
            </div>
          </div>

          {/* Right 5 cols: Run evidence from Case Inbox */}
          <div className="space-y-3 p-4 sm:p-5 lg:col-span-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xs font-semibold text-[#334155]">
                Run evidence{' '}
                <span className="font-normal text-[#64748b]">(recorded in Case Inbox)</span>
              </p>
              {wfCountLabel(inspectedWorkflowJobs.length)}
            </div>

            {latestInspectedJob ? (
              <div className="space-y-2.5 text-xs">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className={`font-semibold ${statusTextTone(latestInspectedJob.status)}`}>
                    {formatStatusLabel(latestInspectedJob.status)}
                  </span>
                  <span className="tabular-nums text-[#64748b]">
                    Updated {formatStamp(latestInspectedJob.updated_at)}
                  </span>
                </div>
                <p className="break-all text-[#334155]">
                  Target:{' '}
                  <strong className="font-medium text-[#0f172a]">
                    {latestInspectedJob.target || 'Not recorded'}
                  </strong>
                </p>
                {(latestInspectedJob.skill_name || latestInspectedJob.skill_id) && (
                  <p className="text-[#475569]">
                    Workspace skill:{' '}
                    <strong className="font-medium text-[#0f172a]">
                      {latestInspectedJob.skill_name || latestInspectedJob.skill_id}
                    </strong>
                    {latestInspectedJob.skill_revision != null
                      ? ` (rev ${latestInspectedJob.skill_revision})`
                      : ''}
                  </p>
                )}
                {latestInspectedJob.result?.report?.summary && (
                  <p className="line-clamp-3 leading-relaxed text-[#475569]">
                    {latestInspectedJob.result.report.summary}
                  </p>
                )}
                {latestInspectedJob.last_error && (
                  <p className="break-words text-[#b91c1c]">{latestInspectedJob.last_error}</p>
                )}

                {/* Recorded subagents: render ONLY when present in recorded API results */}
                {latestInspectedSubagents.length > 0 && (
                  <div className="border-t border-[#e2e8f0] pt-2">
                    <p className="text-[11px] font-semibold text-[#334155]">
                      Recorded subagents ({latestInspectedSubagents.length})
                    </p>
                    <ul className="mt-1 space-y-1 text-[11px] text-[#475569]">
                      {latestInspectedSubagents.map((sub, idx) => (
                        <li key={sub.id || `${sub.name || 'subagent'}-${idx}`}>
                          <span className="font-medium text-[#0f172a]">
                            {sub.name || sub.role || `Subagent ${idx + 1}`}
                          </span>
                          {sub.status && (
                            <span className={`ml-1.5 font-semibold ${statusTextTone(sub.status)}`}>
                              · {formatStatusLabel(sub.status)}
                            </span>
                          )}
                          {sub.summary && <span className="block text-[#64748b]">{sub.summary}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 border-t border-[#e2e8f0] pt-2.5">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-semibold text-[#1d4ed8] hover:underline"
                    onClick={() => onInspectJobInInbox(latestInspectedJob.id)}
                  >
                    Open run evidence in Case Inbox <ArrowRight size={12} />
                  </button>
                  {inspectedWorkflowJobs.length > 1 && (
                    <button
                      type="button"
                      className="font-medium text-[#475569] hover:text-[#0f172a]"
                      onClick={() => onFilterInboxByWorkflow(inspectedWorkflow.id)}
                    >
                      All {inspectedWorkflowJobs.length} cases
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-xs text-[#64748b]">
                <p>
                  No recorded run evidence for this workflow yet. Recorded check steps appear in
                  Case Inbox once a case runs.
                </p>
                <button
                  type="button"
                  className="font-semibold text-[#1d4ed8] hover:underline"
                  onClick={() => onSelectWorkflowForNewCase(inspectedWorkflow.id)}
                >
                  Open in New case →
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: REUSABLE WORKSPACE SKILLS (List + Owner-Only Authoring Editor) */}
      <section className="p-5 sm:p-6" aria-labelledby="ops-workspace-skills-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h3 id="ops-workspace-skills-heading" className="text-base font-semibold text-[#0f172a]">
              Workspace skills
            </h3>
            <p className="mt-0.5 text-xs text-[#64748b]">
              Reusable instruction sets attached to an exact built-in workflow. Tools are inherited
              read-only from the workflow template. Creating or publishing a skill makes no model
              calls and does not run a case.
            </p>
          </div>
          {!skillsUnavailable && (
            <span className="text-xs font-medium tabular-nums text-[#64748b]">
              {skills.length} skill{skills.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {!canEditSkills && !skillsUnavailable && !skillsLoading && (
          <p className="mt-3 text-xs text-[#475569]" role="status">
            Workspace owner permission is required to create, edit, duplicate, or publish workspace
            skills.
          </p>
        )}

        {skillStatusNotice && (
          <div
            role="status"
            className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] px-3.5 py-2.5 text-xs text-[#166534]"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 size={14} className="shrink-0" />
              {skillStatusNotice}
            </span>
            <button
              type="button"
              onClick={() => setSkillStatusNotice('')}
              aria-label="Dismiss skill status"
              className="text-[#166534] hover:text-[#14532d]"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {skillFormError && (
          <div
            role="alert"
            className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3.5 py-2.5 text-xs text-[#991b1b]"
          >
            <span>{skillFormError}</span>
            <button
              type="button"
              onClick={() => setSkillFormError('')}
              aria-label="Dismiss skill error"
              className="text-[#991b1b] hover:text-[#7f1d1d]"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Missing preview backend / API unavailable state */}
        {skillsUnavailable ? (
          <div
            role="status"
            className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-4 py-4 text-xs text-[#334155]"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[#b45309]" />
              <div>
                <p className="font-semibold text-[#0f172a]">Workspace skills API unavailable</p>
                <p className="mt-0.5 text-[#475569]">
                  {skillsError ||
                    'Could not reach GET /v1/operations/skills. Skills are stored on the workspace server and are not cached in browser storage.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="dm-button whitespace-nowrap shrink-0"
              disabled={skillsLoading}
              onClick={() => void onReloadSkills()}
            >
              <RefreshCw size={13} className={skillsLoading ? 'animate-spin' : ''} /> Retry
            </button>
          </div>
        ) : (
          <>
            {/* Filter strip for workspace skills */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 border-y border-[#e2e8f0] bg-[#f8fafc] px-4 py-2.5">
              <div
                className="inline-flex flex-wrap items-center gap-1"
                role="group"
                aria-label="Filter workspace skills by status"
              >
                {(
                  [
                    { id: 'all', label: 'All', count: skills.length },
                    {
                      id: 'published',
                      label: 'Published',
                      count: skills.filter((s) => s.status === 'published').length,
                    },
                    {
                      id: 'draft',
                      label: 'Draft',
                      count: skills.filter((s) => s.status === 'draft').length,
                    },
                  ] as const
                ).map((item) => {
                  const active = skillStatusFilter === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSkillStatusFilter(item.id)}
                      className={`whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-xs font-medium tabular-nums transition-colors ${
                        active
                          ? 'bg-[#0f172a] text-white'
                          : 'text-[#475569] hover:bg-[#e2e8f0]/60 hover:text-[#0f172a]'
                      }`}
                    >
                      {item.label}{' '}
                      <span className={active ? 'text-[#cbd5e1]' : 'text-[#94a3b8]'}>
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <label className="flex items-center gap-2 text-xs text-[#475569]">
                <span className="sr-only">Filter skills by workflow</span>
                <select
                  className="dm-input h-8 text-xs"
                  value={skillWorkflowFilter}
                  onChange={(e) => setSkillWorkflowFilter(e.target.value)}
                >
                  <option value="all">All workflows</option>
                  {workflows.map((wf) => (
                    <option key={wf.id} value={wf.id}>
                      {wf.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Skills ledger list */}
            {skillsLoading && !skills.length ? (
              <div className="space-y-2 py-4" role="status" aria-label="Loading workspace skills">
                <div className="dm-skeleton h-11 w-full" />
                <div className="dm-skeleton h-11 w-full" />
              </div>
            ) : filteredSkills.length === 0 ? (
              <div className="rounded-b-lg border border-t-0 border-[#e2e8f0] bg-white px-5 py-8 text-center">
                <FileText size={20} className="mx-auto text-[#94a3b8]" />
                <p className="mt-2 text-xs font-semibold text-[#0f172a]">
                  {skills.length === 0
                    ? 'No workspace skills authored yet'
                    : 'No workspace skills match these filters'}
                </p>
                <p className="mx-auto mt-1 max-w-md text-xs text-[#64748b]">
                  {skills.length === 0
                    ? 'Create a draft skill for any built-in workflow, refine its instructions, and publish it to make it selectable in New case.'
                    : 'Clear the workflow or status filter to see all recorded skills.'}
                </p>
              </div>
            ) : (
              <ul
                className="divide-y divide-[#e2e8f0] rounded-b-lg border border-t-0 border-[#e2e8f0] bg-white"
                aria-label="Workspace skills list"
              >
                {filteredSkills.map((skill) => {
                  const isPublished = skill.status === 'published';
                  const isDraft = skill.status === 'draft';
                  const isOpenInEditor =
                    editorMode !== 'closed' && editingSkillId === skill.id;

                  return (
                    <li
                      key={`${skill.id}-${skill.revision}`}
                      className={`px-4 py-3.5 transition-colors ${
                        isOpenInEditor ? 'bg-[#eff6ff]/50' : 'hover:bg-[#f8fafc]'
                      }`}
                    >
                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-center lg:gap-4">
                        <div className="min-w-0 lg:col-span-4">
                          <button
                            type="button"
                            onClick={() => openSkill(skill)}
                            className="text-left text-sm font-semibold text-[#0f172a] hover:text-[#1d4ed8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4ed8]"
                          >
                            {skill.name}
                          </button>
                          {skill.description && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-[#475569]">
                              {skill.description}
                            </p>
                          )}
                        </div>

                        <div className="min-w-0 text-xs text-[#334155] lg:col-span-3">
                          <span className="font-medium">
                            {workflowNames[skill.workflow] || skill.workflow}
                          </span>
                        </div>

                        <div className="min-w-0 text-xs tabular-nums lg:col-span-2">
                          <span
                            className={`font-semibold ${
                              isPublished ? 'text-[#15803d]' : 'text-[#475569]'
                            }`}
                          >
                            {isPublished ? 'Published' : isDraft ? 'Draft' : skill.status}
                          </span>
                          <span className="ml-1.5 text-[#64748b]">· rev {skill.revision}</span>
                          <p className="mt-0.5 text-[11px] text-[#64748b]">
                            {formatStamp(skill.updated_at)}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs lg:col-span-3 lg:justify-end">
                          {isPublished && (
                            <button
                              type="button"
                              className="whitespace-nowrap font-semibold text-[#1d4ed8] hover:underline"
                              onClick={() =>
                                onSelectWorkflowForNewCase(skill.workflow, skill.id)
                              }
                            >
                              Use in New case
                            </button>
                          )}
                          <button
                            type="button"
                            className="whitespace-nowrap font-medium text-[#334155] hover:text-[#0f172a]"
                            onClick={() => openSkill(skill)}
                          >
                            {isDraft && canEditSkills ? 'Edit draft' : 'Inspect'}
                          </button>
                          {isDraft && canEditSkills && (
                            <button
                              type="button"
                              className="whitespace-nowrap font-semibold text-[#15803d] hover:underline disabled:opacity-50"
                              disabled={publishingRowId !== null || skillBusy !== null}
                              onClick={() => void handleQuickPublishRow(skill)}
                            >
                              {publishingRowId === skill.id ? 'Publishing…' : 'Publish'}
                            </button>
                          )}
                          {canEditSkills && (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-[#475569] hover:text-[#0f172a]"
                              onClick={() => openDuplicateSkill(skill)}
                            >
                              <Copy size={12} /> Duplicate
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* INLINE WORKSPACE SKILL AUTHORING / READ-ONLY INSPECTOR PANEL */}
            {editorMode !== 'closed' && (
              <section
                ref={editorSectionRef}
                aria-labelledby="ops-skill-editor-heading"
                className="mt-5 rounded-lg border border-[#cbd5e1] bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e2e8f0] pb-3.5">
                  <div>
                    <h4
                      ref={editorHeadingRef}
                      tabIndex={-1}
                      id="ops-skill-editor-heading"
                      className="text-sm font-semibold text-[#0f172a] outline-none"
                    >
                      {editorMode === 'create'
                        ? 'Create workspace skill'
                        : editorMode === 'edit'
                          ? `Edit draft skill · rev ${editingRevision ?? 1}`
                          : `Published skill · rev ${editingRevision ?? 1} (read-only)`}
                    </h4>
                    <p className="mt-0.5 text-xs text-[#64748b]">
                      {editorMode === 'view' && editingStatus === 'published'
                        ? 'Published revisions are read-only for audit consistency. Duplicate this revision to author a new draft.'
                        : 'Saving or publishing a skill makes no model calls and does not start a case.'}
                      {editingUpdatedAt ? ` · Last updated ${formatStamp(editingUpdatedAt)}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {editorMode === 'view' && editingStatus === 'published' && editingSkillId && (
                      <button
                        type="button"
                        className="dm-button"
                        onClick={() =>
                          onSelectWorkflowForNewCase(formWorkflow, editingSkillId)
                        }
                      >
                        Use in New case
                      </button>
                    )}
                    {editorMode === 'view' && canEditSkills && (
                      <button
                        type="button"
                        className="dm-button dm-button-primary"
                        onClick={() =>
                          openDuplicateSkill({
                            id: editingSkillId || '',
                            workflow: formWorkflow,
                            name: formName,
                            description: formDescription,
                            instructions: formInstructions,
                            status: editingStatus,
                            revision: editingRevision ?? 1,
                            updated_at: editingUpdatedAt,
                          })
                        }
                      >
                        <Copy size={14} /> Duplicate to new draft
                      </button>
                    )}
                    <button
                      type="button"
                      className="dm-button"
                      onClick={closeEditor}
                      aria-label="Close skill editor"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSaveDraft} className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-12" noValidate>
                  {/* Left 8 cols: Form fields */}
                  <div className="space-y-4 lg:col-span-8">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="ops-skill-workflow"
                          className="block text-xs font-medium text-[#334155]"
                        >
                          Built-in workflow
                        </label>
                        <select
                          id="ops-skill-workflow"
                          className="dm-input mt-1.5 w-full"
                          value={formWorkflow}
                          disabled={isEditorReadOnly || skillBusy !== null}
                          onChange={(e) => {
                            setFormWorkflow(e.target.value);
                            setFormDirty(true);
                          }}
                        >
                          {workflows.map((wf) => (
                            <option key={wf.id} value={wf.id}>
                              {wf.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="ops-skill-name"
                          className="block text-xs font-medium text-[#334155]"
                        >
                          Skill name
                        </label>
                        <input
                          ref={skillNameInputRef}
                          id="ops-skill-name"
                          type="text"
                          required
                          maxLength={120}
                          className="dm-input mt-1.5 w-full"
                          value={formName}
                          disabled={isEditorReadOnly || skillBusy !== null}
                          aria-invalid={Boolean(validationErrors.name)}
                          aria-describedby={validationErrors.name ? 'ops-skill-name-error' : undefined}
                          placeholder="e.g. Enterprise renewal delivery audit"
                          onChange={(e) => {
                            setFormName(e.target.value);
                            setFormDirty(true);
                            if (validationErrors.name) {
                              setValidationErrors((prev) => ({ ...prev, name: undefined }));
                            }
                          }}
                        />
                        {validationErrors.name && (
                          <p id="ops-skill-name-error" role="alert" className="mt-1 text-xs text-[#b91c1c]">
                            {validationErrors.name}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="ops-skill-description"
                        className="block text-xs font-medium text-[#334155]"
                      >
                        Description <span className="font-normal text-[#64748b]">(optional)</span>
                      </label>
                      <input
                        id="ops-skill-description"
                        type="text"
                        maxLength={300}
                        className="dm-input mt-1.5 w-full"
                        value={formDescription}
                        disabled={isEditorReadOnly || skillBusy !== null}
                        placeholder="Short note on when operators should pick this skill in New case."
                        onChange={(e) => {
                          setFormDescription(e.target.value);
                          setFormDirty(true);
                        }}
                      />
                    </div>

                    <div>
                      <div className="flex items-baseline justify-between gap-2">
                        <label
                          htmlFor="ops-skill-instructions"
                          className="block text-xs font-medium text-[#334155]"
                        >
                          Skill instructions
                        </label>
                        <span className="text-[11px] tabular-nums text-[#64748b]">
                          {formInstructions.length.toLocaleString()} / 4,000
                        </span>
                      </div>
                      <textarea
                        id="ops-skill-instructions"
                        rows={6}
                        required
                        maxLength={4000}
                        className="dm-input mt-1.5 w-full leading-relaxed"
                        value={formInstructions}
                        disabled={isEditorReadOnly || skillBusy !== null}
                        aria-invalid={Boolean(validationErrors.instructions)}
                        aria-describedby="ops-skill-instructions-help"
                        placeholder="Specify focus checks, prioritization criteria, citation format, and handoff summary structure. Do not include credentials or customer records."
                        onChange={(e) => {
                          setFormInstructions(e.target.value);
                          setFormDirty(true);
                          if (validationErrors.instructions) {
                            setValidationErrors((prev) => ({ ...prev, instructions: undefined }));
                          }
                        }}
                      />
                      {validationErrors.instructions && (
                        <p role="alert" className="mt-1 text-xs text-[#b91c1c]">
                          {validationErrors.instructions}
                        </p>
                      )}
                      <p id="ops-skill-instructions-help" className="mt-1.5 text-[11px] text-[#64748b]">
                        Instructions guide read-only evidence synthesis only. Keep credentials and
                        customer records out of skill instructions.
                      </p>
                    </div>

                    {!isEditorReadOnly && (
                      <div className="flex flex-wrap items-center gap-2.5 border-t border-[#e2e8f0] pt-3.5">
                        <button
                          type="submit"
                          className="dm-button"
                          disabled={skillBusy !== null}
                        >
                          {skillBusy === 'save' ? 'Saving draft…' : 'Save draft'}
                        </button>
                        <button
                          type="button"
                          className="dm-button dm-button-primary"
                          disabled={skillBusy !== null}
                          onClick={() => void handlePublishFromEditor()}
                        >
                          {skillBusy === 'publish' ? 'Publishing…' : 'Publish skill'}
                        </button>
                        <span className="text-[11px] text-[#64748b]">
                          No model calls · does not run a case
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right 4 cols: Inherited read-only tool scope for selected workflow */}
                  <aside
                    className="space-y-3 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4 lg:col-span-4"
                    aria-label="Inherited workflow tool scope"
                  >
                    <div>
                      <p className="text-xs font-semibold text-[#0f172a]">
                        Inherited tool scope (read-only)
                      </p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-[#64748b]">
                        Inherited from{' '}
                        <strong className="font-medium text-[#334155]">
                          {workflowNames[formWorkflow] || formWorkflow}
                        </strong>
                        . Skills cannot add provider writes or expand tool permissions.
                      </p>
                    </div>

                    {Array.isArray(editorToolScope) && editorToolScope.length > 0 ? (
                      <>
                        <ul className="space-y-1.5 text-xs text-[#334155]">
                          {editorToolScope.map((tool) => (
                            <li key={tool} className="flex items-start gap-2">
                              <ShieldCheck
                                size={13}
                                className="mt-0.5 shrink-0 text-[#475569]"
                                aria-hidden="true"
                              />
                              <span>{formatFriendlyToolLabel(tool)}</span>
                            </li>
                          ))}
                        </ul>
                        <details className="border-t border-[#e2e8f0] pt-2.5 text-xs">
                          <summary className="cursor-pointer font-medium text-[#475569] hover:text-[#0f172a]">
                            Technical tool names ({editorToolScope.length})
                          </summary>
                          <ul className="mt-1.5 space-y-1 font-mono text-[11px] text-[#475569]">
                            {editorToolScope.map((tool) => (
                              <li key={tool}>{tool}</li>
                            ))}
                          </ul>
                        </details>
                      </>
                    ) : (
                      <p className="text-xs text-[#64748b]">
                        {stateLoaded
                          ? 'No tool scope list was returned for this workflow.'
                          : 'Loading workflow tool scope from operations status…'}
                      </p>
                    )}
                  </aside>
                </form>
              </section>
            )}
          </>
        )}
      </section>

      {/* SECTION 3: COMPACT CROSS-LINK TO PLAYBOOKS */}
      <section
        className="flex flex-wrap items-center justify-between gap-3 bg-[#f8fafc] px-5 py-3.5 text-xs sm:px-6"
        aria-label="Playbooks handoff"
      >
        <div className="min-w-0">
          <p className="font-semibold text-[#0f172a]">Audience playbooks &amp; destination activation</p>
          <p className="mt-0.5 text-[#475569]">
            Create playbooks that evaluate stored decisions to plan eligible accounts. Verified
            destination activation uses the separately approved Marketo skill and dedicated list
            mapping.
          </p>
        </div>
        <a
          href="#playbooks"
          onClick={handlePlaybooksLink}
          className="dm-button whitespace-nowrap shrink-0"
        >
          Open Playbooks <ArrowRight size={14} />
        </a>
      </section>
    </div>
  );
};

function wfCountLabel(count: number) {
  return (
    <span className="text-[11px] tabular-nums text-[#64748b]">
      {count === 0 ? '0 recent cases' : `${count} recent case${count === 1 ? '' : 's'}`}
    </span>
  );
}
