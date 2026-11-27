import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flame,
  PlayCircle,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { JourneyPathHeatmap } from '../components/JourneyPathHeatmap';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AccountDemandUnit, ActiveNavTab, FunnelStage, TelemetrySignal } from '../types';
import {
  DemandUnitInspection,
  ScoreSnapshot,
  fetchScoreHistory,
  inspectDemandUnit,
} from '../services/api';

interface Props {
  accounts: AccountDemandUnit[];
  signals?: TelemetrySignal[];
  onSelectAccount: (account: AccountDemandUnit) => void;
  onNavigateTab?: (tab: ActiveNavTab) => void;
}

interface JourneyStageMeta {
  id: FunnelStage;
  step: string;
  label: string;
  criteria: string;
}

const STAGES: JourneyStageMeta[] = [
  { id: 'target', step: '01', label: 'Target', criteria: 'Account tracked in ICP filter' },
  { id: 'engaged', step: '02', label: 'Engaged', criteria: 'Active marketing or product signal' },
  {
    id: 'prioritized_du',
    step: '03',
    label: 'Prioritized',
    criteria: 'High-fit orchestration cohort',
  },
  {
    id: 'qualified_du',
    step: '04',
    label: 'Qualified',
    criteria: 'Score & coverage gates cleared',
  },
  { id: 'pipeline_deal', step: '05', label: 'Pipeline', criteria: 'Active commercial opportunity' },
  { id: 'closed_won', step: '06', label: 'Closed won', criteria: 'Won revenue or expansion' },
];

type TimelineKind = 'all' | 'signal' | 'score' | 'execution';
type SortMode = 'score_desc' | 'signals_desc' | 'coverage_asc' | 'name_asc';

interface UnifiedTimelineEvent {
  id: string;
  kind: Exclude<TimelineKind, 'all'>;
  timestamp: string;
  epoch: number;
  title: string;
  subtitle: string;
  detail?: string;
  badgeText?: string;
  tone: 'neutral' | 'blue' | 'emerald' | 'amber' | 'red';
}

const formatDateTime = (stamp?: string | null) =>
  !stamp || Number.isNaN(Date.parse(stamp))
    ? 'Time not recorded'
    : new Date(stamp).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

const formatShortAxisDate = (stamp?: string | null) =>
  !stamp || Number.isNaN(Date.parse(stamp))
    ? 'Snapshot'
    : new Date(stamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const humanize = (raw?: string | null) =>
  (raw || 'Not recorded').replaceAll('_', ' ').trim();

const normalizeStage = (stage: FunnelStage): FunnelStage =>
  stage === 'expansion' ? 'closed_won' : stage;

export const CustomerJourneyView: React.FC<Props> = ({
  accounts,
  signals = [],
  onSelectAccount,
  onNavigateTab,
}) => {
  const [viewMode, setViewMode] = useState<'journey' | 'heatmap'>('journey');
  const [selectedId, setSelectedId] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [accountSearch, setAccountSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<'all' | 'holds' | FunnelStage>('all');
  const [sortMode, setSortMode] = useState<SortMode>('score_desc');

  const [details, setDetails] = useState<DemandUnitInspection | null>(null);
  const [history, setHistory] = useState<ScoreSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [timelineFilter, setTimelineFilter] = useState<TimelineKind>('all');
  const [timelineSearch, setTimelineSearch] = useState('');
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showAllJobs, setShowAllJobs] = useState(false);
  const [visibleSeries, setVisibleSeries] = useState({
    composite: true,
    fit: true,
    intent: true,
    coverage: true,
  });

  const pickerRef = useRef<HTMLDivElement | null>(null);
  const cacheRef = useRef<
    Map<string, { details: DemandUnitInspection; history: ScoreSnapshot[] }>
  >(new Map());

  // Close searchable picker on outside click or Escape
  useEffect(() => {
    if (!pickerOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setPickerOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPickerOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [pickerOpen]);

  // Filtered and sorted cohort for scalable navigation (works seamlessly with 500+ accounts)
  const filteredAccounts = useMemo(() => {
    const q = accountSearch.trim().toLowerCase();
    const list = accounts.filter((acc) => {
      if (stageFilter === 'holds') {
        if (acc.committee.coverageScore > 0) return false;
      } else if (stageFilter !== 'all') {
        if (normalizeStage(acc.stage) !== stageFilter) return false;
      }
      if (!q) return true;
      return (
        acc.accountName.toLowerCase().includes(q) ||
        acc.solutionTarget.toLowerCase().includes(q) ||
        acc.domain.toLowerCase().includes(q) ||
        (acc.industry || '').toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortMode === 'score_desc') return b.compositeScore - a.compositeScore;
      if (sortMode === 'signals_desc') {
        return (b.scoreAudit?.signalsCount ?? 0) - (a.scoreAudit?.signalsCount ?? 0);
      }
      if (sortMode === 'coverage_asc') {
        return a.committee.coverageScore - b.committee.coverageScore;
      }
      return a.accountName.localeCompare(b.accountName);
    });
  }, [accounts, accountSearch, stageFilter, sortMode]);

  const selected = useMemo(() => {
    if (selectedId) {
      const inFiltered = filteredAccounts.find((a) => a.id === selectedId);
      if (inFiltered) return inFiltered;
      const inAll = accounts.find((a) => a.id === selectedId);
      if (inAll && stageFilter === 'all' && !accountSearch.trim()) return inAll;
    }
    return filteredAccounts[0] || accounts[0] || null;
  }, [accounts, filteredAccounts, selectedId, stageFilter, accountSearch]);

  const currentIdxInCohort = selected
    ? filteredAccounts.findIndex((a) => a.id === selected.id)
    : -1;

  const stepAccount = (delta: number) => {
    if (!filteredAccounts.length) return;
    const base = currentIdxInCohort >= 0 ? currentIdxInCohort : 0;
    const nextIdx = (base + delta + filteredAccounts.length) % filteredAccounts.length;
    setSelectedId(filteredAccounts[nextIdx].id);
  };

  // Load demand unit evidence + score history with instant cache lookup
  useEffect(() => {
    if (!selected) return;
    let active = true;
    const cacheKey = `${selected.id}:${selected.scoreAudit?.lastScoredAt || ''}`;
    const cached = cacheRef.current.get(cacheKey);
    setShowAllEvents(false);
    setShowAllJobs(false);

    if (cached) {
      setDetails(cached.details);
      setHistory(cached.history);
      setError('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    Promise.all([inspectDemandUnit(selected.id), fetchScoreHistory(selected.id)])
      .then(([evidence, scores]) => {
        if (!active) return;
        cacheRef.current.set(cacheKey, { details: evidence, history: scores });
        setDetails(evidence);
        setHistory(scores);
      })
      .catch((err) => {
        if (!active) return;
        setDetails(null);
        setHistory([]);
        setError(err instanceof Error ? err.message : 'Journey evidence unavailable.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selected?.id, selected?.scoreAudit?.lastScoredAt]);

  // Stage counts across full workspace
  const stageCounts = useMemo(() => {
    const map: Record<FunnelStage, number> = {
      target: 0,
      engaged: 0,
      prioritized_du: 0,
      qualified_du: 0,
      pipeline_deal: 0,
      closed_won: 0,
      expansion: 0,
    };
    for (const acc of accounts) {
      const normalized = normalizeStage(acc.stage);
      map[normalized] = (map[normalized] || 0) + 1;
    }
    return map;
  }, [accounts]);

  const holdCount = useMemo(
    () => accounts.filter((a) => a.committee.coverageScore === 0).length,
    [accounts]
  );

  // Chronological score chart points (oldest -> newest)
  const scoreChartData = useMemo(() => {
    const sorted = [...history].sort(
      (a, b) => Date.parse(a.scored_at || '') - Date.parse(b.scored_at || '')
    );
    return sorted.map((snap, idx) => ({
      index: idx + 1,
      label: formatShortAxisDate(snap.scored_at),
      fullDate: formatDateTime(snap.scored_at),
      composite: Number(snap.composite_score.toFixed(1)),
      fit: Number(snap.fit_score.toFixed(1)),
      intent: Number(snap.intent_score.toFixed(1)),
      coverage: Number(snap.coverage_score.toFixed(1)),
      mode: snap.decision_applied ? 'Automated evaluation' : 'Policy score',
    }));
  }, [history]);

  // Unified chronological timeline combining signals, score snapshots, and execution jobs
  const unifiedTimeline = useMemo<UnifiedTimelineEvent[]>(() => {
    if (!selected) return [];
    const items: UnifiedTimelineEvent[] = [];

    // 1. Inspection signals
    const seenSignalKeys = new Set<string>();
    for (let i = 0; i < (details?.signals || []).length; i++) {
      const sig = details!.signals[i];
      const epoch = Date.parse(sig.timestamp || '') || 0;
      const key = `${sig.event_type}|${sig.timestamp}`;
      seenSignalKeys.add(key);
      items.push({
        id: `sig-${sig.id || i}`,
        kind: 'signal',
        timestamp: sig.timestamp,
        epoch,
        title: humanize(sig.event_type),
        subtitle: `${sig.event_source || 'Recorded feed'} · ${formatDateTime(sig.timestamp)}`,
        detail:
          sig.signal_weight != null
            ? `Activity weight ${sig.signal_weight} · intent contribution decayed by policy`
            : undefined,
        badgeText: sig.signal_weight != null ? `+${sig.signal_weight} wt` : 'Signal',
        tone: 'blue',
      });
    }

    // Supplement with workspace-level signals for this account when not already present
    const accountSignals = signals.filter(
      (s) =>
        s.accountId === selected.id ||
        s.accountName.toLowerCase() === selected.accountName.toLowerCase()
    );
    for (const sig of accountSignals) {
      const key = `${sig.title}|${sig.timestamp}`;
      if (seenSignalKeys.has(key)) continue;
      const epoch = Date.parse(sig.timestamp || '') || 0;
      items.push({
        id: `ws-sig-${sig.id}`,
        kind: 'signal',
        timestamp: sig.timestamp,
        epoch,
        title: humanize(sig.title),
        subtitle: `${sig.sourceFeed || sig.category} · ${formatDateTime(sig.timestamp)}`,
        detail: sig.detail,
        badgeText: sig.scoreImpact ? `+${sig.scoreImpact} pts` : sig.category,
        tone:
          sig.severity === 'CRITICAL' || sig.severity === 'SURGE' ? 'amber' : 'blue',
      });
    }

    // 2. Score history snapshots (with delta vs previous chronological snapshot)
    const chronoHistory = [...history].sort(
      (a, b) => Date.parse(a.scored_at || '') - Date.parse(b.scored_at || '')
    );
    chronoHistory.forEach((snap, idx) => {
      const prev = idx > 0 ? chronoHistory[idx - 1] : null;
      const delta = prev ? Number((snap.composite_score - prev.composite_score).toFixed(1)) : null;
      const epoch = Date.parse(snap.scored_at || '') || 0;
      items.push({
        id: `score-${snap.id}`,
        kind: 'score',
        timestamp: snap.scored_at,
        epoch,
        title: `Composite scored ${snap.composite_score.toFixed(1)} / 100`,
        subtitle: `${snap.decision_applied ? 'Automated evaluation' : 'Policy score'} · ${formatDateTime(snap.scored_at)}`,
        detail: `Fit ${snap.fit_score.toFixed(1)} · Intent ${snap.intent_score.toFixed(1)} · Coverage ${snap.coverage_score.toFixed(1)}`,
        badgeText:
          delta == null
            ? 'Baseline'
            : delta > 0
              ? `+${delta} pts`
              : delta < 0
                ? `${delta} pts`
                : 'No change',
        tone: delta != null && delta > 0 ? 'emerald' : delta != null && delta < 0 ? 'amber' : 'neutral',
      });
    });

    // 3. Execution jobs
    for (const job of details?.jobs || []) {
      const ts = job.completed_at || job.created_at;
      const epoch = Date.parse(ts || '') || 0;
      const ok = job.status === 'succeeded' || job.status === 'completed';
      const failed = job.status === 'failed';
      items.push({
        id: `job-${job.id}`,
        kind: 'execution',
        timestamp: ts,
        epoch,
        title: `${job.destination} · ${humanize(job.action)}`,
        subtitle: `${job.result?.mode === 'dry_run' ? 'Dry run preview' : 'Connector workflow'} · ${formatDateTime(ts)}`,
        detail: job.result?.message || undefined,
        badgeText: job.status,
        tone: ok ? 'emerald' : failed ? 'red' : 'blue',
      });
    }

    return items.sort((a, b) => b.epoch - a.epoch);
  }, [selected, details, history, signals]);

  const timelineCounts = useMemo(() => {
    let signal = 0;
    let score = 0;
    let execution = 0;
    for (const item of unifiedTimeline) {
      if (item.kind === 'signal') signal += 1;
      else if (item.kind === 'score') score += 1;
      else execution += 1;
    }
    return { all: unifiedTimeline.length, signal, score, execution };
  }, [unifiedTimeline]);

  const visibleTimeline = useMemo(() => {
    const q = timelineSearch.trim().toLowerCase();
    return unifiedTimeline.filter((item) => {
      if (timelineFilter !== 'all' && item.kind !== timelineFilter) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        (item.detail || '').toLowerCase().includes(q)
      );
    });
  }, [unifiedTimeline, timelineFilter, timelineSearch]);

  const displayedTimeline = showAllEvents ? visibleTimeline : visibleTimeline.slice(0, 12);

  const selectedStageIdx = selected
    ? Math.max(
        0,
        STAGES.findIndex((s) => s.id === normalizeStage(selected.stage))
      )
    : 0;

  const fitScore = selected
    ? Math.round(selected.scoreAudit?.fit ?? selected.scores?.firmographicFit ?? 0)
    : 0;
  const intentScore = selected
    ? Math.round(
        selected.scoreAudit?.intent ??
          Math.max(
            selected.scores?.intentSurge ?? 0,
            selected.scores?.behavioralEngagement ?? 0,
            selected.scores?.productTelemetry ?? 0
          )
      )
    : 0;
  const coverageScore = selected
    ? Math.round(selected.scoreAudit?.coverage ?? selected.committee.coverageScore ?? 0)
    : 0;

  const engagedMembers = useMemo(() => {
    if (!selected) return [];
    return [...(selected.committee.members || [])]
      .sort((a, b) => (b.engagementScore || 0) - (a.engagementScore || 0))
      .slice(0, 4);
  }, [selected]);

  const jobs = details?.jobs || [];
  const displayedJobs = showAllJobs ? jobs : jobs.slice(0, 8);

  const handleStageCardClick = (stageId: FunnelStage) => {
    if (stageFilter === stageId) {
      setStageFilter('all');
      return;
    }
    setStageFilter(stageId);
    const firstInStage = accounts
      .filter((a) => normalizeStage(a.stage) === stageId)
      .sort((a, b) => b.compositeScore - a.compositeScore)[0];
    if (firstInStage) {
      setSelectedId(firstInStage.id);
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      {/* Header + Scalable Searchable Account Journey Navigator */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Customer journey</h1>
          <p className="mt-1 text-sm text-[#475569]">
            Inspect lifecycle progression, score trajectory, buying-group touchpoints, and execution
            history for any demand unit.
          </p>
        </div>

        {/* View Mode Toggle + Searchable Combobox + Prev/Next Stepper */}
        {accounts.length > 0 && (
          <div className="flex flex-wrap items-center gap-2.5">
            <div
              className="inline-flex items-center rounded-lg border border-[#cbd5e1] bg-[#f8fafc] p-0.5"
              role="group"
              aria-label="Customer journey view mode"
            >
              <button
                type="button"
                aria-pressed={viewMode === 'journey'}
                onClick={() => setViewMode('journey')}
                className={`whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  viewMode === 'journey'
                    ? 'bg-[#0f172a] text-white'
                    : 'text-[#475569] hover:text-[#0f172a]'
                }`}
              >
                Account journey
              </button>
              <button
                type="button"
                aria-pressed={viewMode === 'heatmap'}
                onClick={() => setViewMode('heatmap')}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  viewMode === 'heatmap'
                    ? 'bg-[#0f172a] text-white'
                    : 'text-[#475569] hover:text-[#0f172a]'
                }`}
              >
                <Flame size={13} className={viewMode === 'heatmap' ? 'text-[#fbbf24]' : 'text-[#b45309]'} />
                Heatmap
              </button>
            </div>

            {viewMode === 'journey' && (
              <>
                <div ref={pickerRef} className="relative w-full sm:w-[340px]">
              <button
                type="button"
                aria-expanded={pickerOpen}
                onClick={() => setPickerOpen((open) => !open)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-[#cbd5e1] bg-white px-3.5 py-2 text-left text-sm transition-colors hover:border-[#94a3b8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4ed8]"
              >
                <div className="min-w-0">
                  <span className="block truncate font-semibold text-[#0f172a]">
                    {selected ? selected.accountName : 'Select demand unit'}
                  </span>
                  {selected && (
                    <span className="block truncate text-xs text-[#64748b] tabular-nums">
                      {selected.solutionTarget} · Score {selected.compositeScore}
                    </span>
                  )}
                </div>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-[#64748b] transition-transform ${
                    pickerOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {pickerOpen && (
                <div className="absolute right-0 z-30 mt-1.5 w-full min-w-[320px] overflow-hidden rounded-xl border border-[#cbd5e1] bg-white shadow-lg sm:w-[420px]">
                  <div className="border-b border-[#e2e8f0] bg-[#f8fafc] p-3">
                    <div className="relative">
                      <Search
                        size={14}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]"
                      />
                      <input
                        type="text"
                        value={accountSearch}
                        onChange={(e) => setAccountSearch(e.target.value)}
                        placeholder={`Search ${accounts.length.toLocaleString()} demand units…`}
                        className="w-full rounded-md border border-[#cbd5e1] bg-white py-1.5 pl-8 pr-8 text-xs text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#1d4ed8] focus:outline-none"
                        autoFocus
                      />
                      {accountSearch && (
                        <button
                          type="button"
                          onClick={() => setAccountSearch('')}
                          aria-label="Clear search"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#0f172a]"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px]">
                      <span className="tabular-nums text-[#64748b]">
                        {filteredAccounts.length.toLocaleString()} of{' '}
                        {accounts.length.toLocaleString()} units
                      </span>
                      <select
                        aria-label="Sort demand units"
                        value={sortMode}
                        onChange={(e) => setSortMode(e.target.value as SortMode)}
                        className="rounded border border-[#cbd5e1] bg-white px-2 py-1 text-[11px] font-medium text-[#334155]"
                      >
                        <option value="score_desc">Highest score</option>
                        <option value="signals_desc">Most signals</option>
                        <option value="coverage_asc">Lowest coverage</option>
                        <option value="name_asc">Account A–Z</option>
                      </select>
                    </div>
                  </div>

                  <div className="max-h-[300px] divide-y divide-[#f1f5f9] overflow-y-auto">
                    {filteredAccounts.slice(0, 60).map((acc) => {
                      const isActive = selected?.id === acc.id;
                      const isHold = acc.committee.coverageScore === 0;
                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => {
                            setSelectedId(acc.id);
                            setPickerOpen(false);
                          }}
                          className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-xs transition-colors ${
                            isActive ? 'bg-[#eff6ff]' : 'hover:bg-[#f8fafc]'
                          }`}
                        >
                          <div className="min-w-0">
                            <p
                              className={`truncate font-semibold ${
                                isActive ? 'text-[#1d4ed8]' : 'text-[#0f172a]'
                              }`}
                            >
                              {acc.accountName}
                            </p>
                            <p className="truncate text-[11px] text-[#64748b]">
                              {acc.solutionTarget} · {humanize(acc.stage)}
                            </p>
                          </div>
                          <div className="shrink-0 text-right tabular-nums">
                            <span className="block font-semibold text-[#0f172a]">
                              {acc.compositeScore}
                            </span>
                            <span
                              className={`block text-[11px] ${
                                isHold ? 'font-medium text-[#b45309]' : 'text-[#64748b]'
                              }`}
                            >
                              {isHold ? '0% hold' : `${acc.committee.coverageScore}% cov`}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                    {filteredAccounts.length === 0 && (
                      <p className="p-4 text-center text-xs text-[#64748b]">
                        No demand units match this filter.
                      </p>
                    )}
                    {filteredAccounts.length > 60 && (
                      <p className="bg-[#f8fafc] px-3.5 py-2 text-center text-[11px] text-[#64748b]">
                        Showing top 60 of {filteredAccounts.length.toLocaleString()} matches — refine
                        search to narrow further.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="inline-flex items-center rounded-lg border border-[#cbd5e1] bg-white">
              <button
                type="button"
                onClick={() => stepAccount(-1)}
                disabled={filteredAccounts.length <= 1}
                aria-label="Previous demand unit"
                className="inline-flex items-center justify-center px-2.5 py-2.5 text-[#334155] transition-colors hover:bg-[#f8fafc] disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="border-x border-[#e2e8f0] px-2.5 py-2 text-xs font-medium tabular-nums text-[#475569]">
                {currentIdxInCohort >= 0 ? currentIdxInCohort + 1 : 0} /{' '}
                {filteredAccounts.length.toLocaleString()}
              </span>
              <button
                type="button"
                onClick={() => stepAccount(1)}
                disabled={filteredAccounts.length <= 1}
                aria-label="Next demand unit"
                className="inline-flex items-center justify-center px-2.5 py-2.5 text-[#334155] transition-colors hover:bg-[#f8fafc] disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Active Cohort Stage Filter Strip */}
      {accounts.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e2e8f0] bg-white px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter journey cohort">
            {[
              { id: 'all' as const, label: 'All units', count: accounts.length },
              { id: 'holds' as const, label: 'Coverage holds', count: holdCount },
              ...STAGES.map((s) => ({ id: s.id, label: s.label, count: stageCounts[s.id] })),
            ].map((item) => {
              const active = stageFilter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setStageFilter(item.id);
                    if (item.id !== 'all' && item.id !== 'holds') {
                      const match = accounts
                        .filter((a) => normalizeStage(a.stage) === item.id)
                        .sort((a, b) => b.compositeScore - a.compositeScore)[0];
                      if (match) setSelectedId(match.id);
                    }
                  }}
                  className={`whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-xs font-medium tabular-nums transition-colors ${
                    active
                      ? 'bg-[#0f172a] text-white'
                      : 'text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]'
                  }`}
                >
                  {item.label}{' '}
                  <span className={active ? 'text-[#cbd5e1]' : 'text-[#94a3b8]'}>
                    {item.count.toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>
          {(stageFilter !== 'all' || accountSearch) && (
            <button
              type="button"
              onClick={() => {
                setStageFilter('all');
                setAccountSearch('');
              }}
              className="text-xs font-semibold text-[#1d4ed8] hover:underline"
            >
              Reset cohort filter
            </button>
          )}
        </div>
      )}

      {viewMode === 'heatmap' ? (
        <JourneyPathHeatmap
          accounts={stageFilter === 'all' && !accountSearch.trim() ? accounts : filteredAccounts}
          onInspectAccountJourney={(acc) => {
            setSelectedId(acc.id);
            setViewMode('journey');
          }}
          onSelectAccountDrawer={onSelectAccount}
          onNavigateTab={onNavigateTab}
        />
      ) : !selected ? (
        <div className="dm-card dm-empty">
          No demand units match this filter. Reset filters or run Data imports &amp; replay.
        </div>
      ) : (
        <>
          {/* Selected Account Summary + 5-Metric Strip */}
          <section className="dm-card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <h2 className="text-xl font-bold tracking-tight text-[#0f172a]">
                    {selected.accountName}
                  </h2>
                  <span className="text-xs font-semibold text-[#475569]">
                    · {selected.primaryMotion} motion
                  </span>
                  {selected.industry && (
                    <span className="text-xs text-[#64748b]">· {selected.industry}</span>
                  )}
                </div>
                <p className="mt-1 text-sm text-[#475569]">
                  {selected.solutionTarget} · {selected.domain}
                  {selected.assignedAe && selected.assignedAe !== 'Unassigned'
                    ? ` · AE: ${selected.assignedAe}`
                    : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {onNavigateTab && (
                  <button
                    type="button"
                    className="dm-button"
                    onClick={() => onNavigateTab('COMMITTEES')}
                  >
                    Buying committee
                  </button>
                )}
                <button
                  type="button"
                  className="dm-button dm-button-primary"
                  onClick={() => onSelectAccount(selected)}
                >
                  Inspect demand unit <ArrowRight size={15} />
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 divide-y divide-[#e2e8f0] rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] sm:grid-cols-3 lg:grid-cols-5 lg:divide-x lg:divide-y-0">
              <div className="p-4 tabular-nums">
                <p className="dm-caption">Composite score</p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-lg font-bold text-[#0f172a]">
                    {selected.compositeScore}
                  </span>
                  <span className="text-xs text-[#64748b]">/ 100</span>
                  {selected.scoreDelta7d !== 0 && (
                    <span
                      className={`text-xs font-semibold ${
                        selected.scoreDelta7d > 0 ? 'text-[#15803d]' : 'text-[#b45309]'
                      }`}
                    >
                      {selected.scoreDelta7d > 0
                        ? `+${selected.scoreDelta7d}`
                        : selected.scoreDelta7d}
                    </span>
                  )}
                </div>
              </div>
              <div className="p-4 tabular-nums">
                <p className="dm-caption">ICP fit</p>
                <p className="mt-1 text-lg font-bold text-[#0f172a]">{fitScore}</p>
              </div>
              <div className="p-4 tabular-nums">
                <p className="dm-caption">Intent &amp; signal</p>
                <p className="mt-1 text-lg font-bold text-[#0f172a]">{intentScore}</p>
              </div>
              <div className="p-4 tabular-nums">
                <p className="dm-caption">Committee coverage</p>
                <p
                  className={`mt-1 text-lg font-bold ${
                    coverageScore === 0 ? 'text-[#b45309]' : 'text-[#0f172a]'
                  }`}
                >
                  {coverageScore}%
                </p>
              </div>
              <div className="col-span-2 p-4 sm:col-span-1">
                <p className="dm-caption">Operating lane</p>
                <p
                  className={`mt-1 text-lg font-bold capitalize ${
                    coverageScore === 0
                      ? 'text-[#b45309]'
                      : selected.scoreAudit?.routingState === 'SALES_LANE'
                        ? 'text-[#15803d]'
                        : 'text-[#1d4ed8]'
                  }`}
                >
                  {coverageScore === 0
                    ? 'Coverage hold'
                    : humanize(selected.scoreAudit?.routingState || 'Review').toLowerCase()}
                </p>
              </div>
            </div>
          </section>

          {/* Interactive 6-Stage Lifecycle Progression Stepper */}
          <section className="dm-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[#0f172a]">
                  Lifecycle progression
                </h2>
                <p className="mt-0.5 text-[13px] text-[#64748b]">
                  Highlighted stage is the stored state for {selected.accountName}. Click any stage
                  to jump to accounts in that cohort.
                </p>
              </div>
              <span className="text-xs tabular-nums text-[#64748b]">
                Stage {selectedStageIdx + 1} of {STAGES.length}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {STAGES.map((stage, idx) => {
                const isCurrent = idx === selectedStageIdx;
                const isEarlier = idx < selectedStageIdx;
                const isFilterActive = stageFilter === stage.id;
                const countInStage = stageCounts[stage.id] || 0;

                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => handleStageCardClick(stage.id)}
                    aria-pressed={isCurrent}
                    className={`group flex flex-col justify-between rounded-lg border p-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4ed8] ${
                      isCurrent
                        ? 'border-[#1d4ed8] bg-[#eff6ff]/70'
                        : isFilterActive
                          ? 'border-[#0f172a] bg-[#f8fafc]'
                          : isEarlier
                            ? 'border-[#cbd5e1] bg-[#f8fafc]/60 hover:border-[#94a3b8]'
                            : 'border-[#e2e8f0] bg-white hover:border-[#cbd5e1] hover:bg-[#f8fafc]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[11px] font-semibold tabular-nums ${
                            isCurrent
                              ? 'text-[#1d4ed8]'
                              : isEarlier
                                ? 'text-[#059669]'
                                : 'text-[#64748b]'
                          }`}
                        >
                          {stage.step}
                        </span>
                        {isCurrent ? (
                          <span className="text-[11px] font-semibold text-[#1d4ed8]">Active</span>
                        ) : isEarlier ? (
                          <Check size={13} className="text-[#059669]" aria-label="Prior stage" />
                        ) : (
                          <span className="text-[11px] text-[#94a3b8]">Next</span>
                        )}
                      </div>

                      <h3
                        className={`mt-2 text-sm font-semibold ${
                          isCurrent ? 'text-[#1d4ed8]' : 'text-[#0f172a]'
                        }`}
                      >
                        {stage.label}
                      </h3>
                      <p className="mt-1 text-[11px] leading-snug text-[#64748b]">
                        {stage.criteria}
                      </p>
                    </div>

                    <div className="mt-3.5 flex items-baseline justify-between border-t border-[#e2e8f0]/80 pt-2.5 tabular-nums">
                      <span className="text-base font-bold text-[#0f172a]">
                        {countInStage.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-[#64748b] group-hover:text-[#1d4ed8]">
                        {countInStage === 1 ? 'unit' : 'units'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="dm-caption mt-3">
              Prior stages reflect lifecycle order and are not back-dated when historical transition
              timestamps are absent.
            </p>
          </section>

          {/* Row 2: Score Trajectory Chart + Buying-Group Touchpoints */}
          <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
            <section className="dm-card flex flex-col">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-[#0f172a]">Score trajectory</h2>
                  <p className="mt-0.5 text-[13px] text-[#64748b]">
                    {scoreChartData.length >= 2
                      ? `Composite, Fit, Intent, and Coverage across ${scoreChartData.length} recorded snapshots.`
                      : 'Current score component breakdown. Trend lines activate once 2+ score snapshots are recorded.'}
                  </p>
                </div>

                {scoreChartData.length >= 2 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        ['composite', 'Composite', '#1d4ed8'],
                        ['fit', 'Fit', '#334155'],
                        ['intent', 'Intent', '#0284c7'],
                        ['coverage', 'Coverage', '#059669'],
                      ] as const
                    ).map(([key, label, color]) => {
                      const enabled = visibleSeries[key];
                      return (
                        <button
                          key={key}
                          type="button"
                          aria-pressed={enabled}
                          onClick={() =>
                            setVisibleSeries((prev) => ({ ...prev, [key]: !prev[key] }))
                          }
                          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                            enabled
                              ? 'border-[#cbd5e1] bg-white text-[#0f172a]'
                              : 'border-transparent bg-[#f1f5f9] text-[#94a3b8]'
                          }`}
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: enabled ? color : '#cbd5e1' }}
                          />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {loading ? (
                <div className="mt-5 space-y-3" role="status" aria-label="Loading score history">
                  <div className="dm-skeleton h-44 w-full" />
                </div>
              ) : scoreChartData.length >= 2 ? (
                <div className="mt-5 h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={scoreChartData}
                      margin={{ top: 10, right: 12, left: -16, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="journeyCompositeFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.18} />
                          <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <ReferenceLine
                        y={70}
                        stroke="#d97706"
                        strokeDasharray="4 4"
                        label={{
                          value: 'Qualify 70',
                          position: 'insideTopRight',
                          fill: '#b45309',
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const pt = payload[0].payload as (typeof scoreChartData)[number];
                          return (
                            <div className="rounded-lg border border-[#cbd5e1] bg-white p-3 text-xs shadow-sm tabular-nums">
                              <p className="font-semibold text-[#0f172a]">{pt.fullDate}</p>
                              <p className="text-[11px] text-[#64748b]">{pt.mode}</p>
                              <div className="mt-2 space-y-1 border-t border-[#f1f5f9] pt-2">
                                <div className="flex justify-between gap-4">
                                  <span className="text-[#1d4ed8]">Composite</span>
                                  <strong>{pt.composite} / 100</strong>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-[#334155]">ICP fit</span>
                                  <strong>{pt.fit}</strong>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-[#0284c7]">Intent</span>
                                  <strong>{pt.intent}</strong>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-[#059669]">Coverage</span>
                                  <strong>{pt.coverage}%</strong>
                                </div>
                              </div>
                            </div>
                          );
                        }}
                      />
                      {visibleSeries.composite && (
                        <Area
                          type="monotone"
                          dataKey="composite"
                          stroke="#1d4ed8"
                          strokeWidth={2.25}
                          fill="url(#journeyCompositeFill)"
                          dot={{ r: 3.5, fill: '#1d4ed8', stroke: '#ffffff', strokeWidth: 1.5 }}
                          activeDot={{ r: 5 }}
                        />
                      )}
                      {visibleSeries.fit && (
                        <Line
                          type="monotone"
                          dataKey="fit"
                          stroke="#334155"
                          strokeWidth={1.5}
                          strokeDasharray="4 3"
                          dot={false}
                        />
                      )}
                      {visibleSeries.intent && (
                        <Line
                          type="monotone"
                          dataKey="intent"
                          stroke="#0284c7"
                          strokeWidth={1.75}
                          dot={false}
                        />
                      )}
                      {visibleSeries.coverage && (
                        <Line
                          type="monotone"
                          dataKey="coverage"
                          stroke="#059669"
                          strokeWidth={1.75}
                          dot={false}
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="mt-5 space-y-4 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4 tabular-nums">
                  {[
                    { label: 'Composite score', value: selected.compositeScore, color: '#1d4ed8', unit: '/ 100' },
                    { label: 'ICP fit', value: fitScore, color: '#334155', unit: '/ 100' },
                    { label: 'Intent & behavioral signal', value: intentScore, color: '#0284c7', unit: '/ 100' },
                    { label: 'Buying-group coverage', value: coverageScore, color: '#059669', unit: '%' },
                  ].map((item) => (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[#334155]">{item.label}</span>
                        <strong className="font-semibold text-[#0f172a]">
                          {item.value} <span className="font-normal text-[#64748b]">{item.unit}</span>
                        </strong>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#e2e8f0]">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${Math.min(100, item.value)}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {history.length === 1 && (
                    <p className="border-t border-[#e2e8f0] pt-3 text-xs text-[#64748b]">
                      Single snapshot recorded on {formatDateTime(history[0].scored_at)}.
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* Buying-Group Touchpoints & Role Coverage */}
            <section className="dm-card flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="flex items-center gap-2 text-base font-semibold text-[#0f172a]">
                      <Users size={16} className="text-[#64748b]" />
                      Buying-group touchpoints
                    </h2>
                    <p className="mt-0.5 text-[13px] text-[#64748b] tabular-nums">
                      {selected.committee.totalIdentified} of {selected.committee.totalRequired}{' '}
                      required roles identified ({coverageScore}% coverage).
                    </p>
                  </div>
                </div>

                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#e2e8f0]">
                  <div
                    className={`h-full ${coverageScore === 0 ? 'bg-[#d97706]' : 'bg-[#059669]'}`}
                    style={{ width: `${Math.min(100, coverageScore)}%` }}
                  />
                </div>

                {engagedMembers.length > 0 ? (
                  <div className="mt-4 divide-y divide-[#e2e8f0] rounded-lg border border-[#e2e8f0] bg-white">
                    {engagedMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[#0f172a]">{member.name}</p>
                          <p className="truncate text-[11px] capitalize text-[#64748b]">
                            {member.title || humanize(String(member.role))}
                          </p>
                        </div>
                        <div className="shrink-0 text-right tabular-nums">
                          <span className="block font-semibold text-[#1d4ed8]">
                            {member.engagementScore}
                          </span>
                          <span className="block text-[11px] text-[#64748b]">
                            {member.lastSeen || 'Recorded'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-3.5 text-xs text-[#64748b]">
                    No verified stakeholders recorded on this demand unit yet.
                  </div>
                )}

                {selected.committee.missingRoles.length > 0 && (
                  <div className="mt-3.5 border-t border-[#f1f5f9] pt-3">
                    <p className="text-xs font-semibold text-[#334155]">Missing required roles</p>
                    <p className="mt-1 text-xs capitalize text-[#b45309]">
                      {selected.committee.missingRoles
                        .map((role) => humanize(String(role)))
                        .join(' · ')}
                    </p>
                  </div>
                )}
              </div>

              {onNavigateTab && (
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[#e2e8f0] pt-3.5">
                  <button
                    type="button"
                    className="dm-text-button"
                    onClick={() => onNavigateTab('COMMITTEES')}
                  >
                    Manage committee <ArrowRight size={14} />
                  </button>
                  <button
                    type="button"
                    className="dm-text-button"
                    onClick={() => onNavigateTab('COVERAGE')}
                  >
                    Coverage inspector <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </section>
          </div>

          {/* Row 3: Unified Chronological Journey Stream + Insights & Next Steps */}
          <div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
            <section className="dm-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-[#0f172a]">
                    Unified journey timeline
                  </h2>
                  <p className="mt-0.5 text-[13px] text-[#64748b]">
                    Chronological stream of recorded signals, score updates, and workflow actions.
                  </p>
                </div>
                <span className="text-xs tabular-nums text-[#64748b]">
                  {visibleTimeline.length.toLocaleString()} matching events
                </span>
              </div>

              {/* Filter Tabs + Timeline Search */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-y border-[#e2e8f0] py-3">
                <div
                  className="inline-flex flex-wrap items-center rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-0.5"
                  role="group"
                  aria-label="Filter journey events"
                >
                  {(
                    [
                      ['all', 'All', timelineCounts.all],
                      ['signal', 'Signals', timelineCounts.signal],
                      ['score', 'Scores', timelineCounts.score],
                      ['execution', 'Executions', timelineCounts.execution],
                    ] as const
                  ).map(([kind, label, count]) => {
                    const active = timelineFilter === kind;
                    return (
                      <button
                        key={kind}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setTimelineFilter(kind)}
                        className={`whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-xs font-medium tabular-nums transition-colors ${
                          active
                            ? 'bg-[#0f172a] text-white'
                            : 'text-[#475569] hover:text-[#0f172a]'
                        }`}
                      >
                        {label} {count}
                      </button>
                    );
                  })}
                </div>

                <div className="relative w-full sm:w-[220px]">
                  <Search
                    size={13}
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                  />
                  <input
                    type="text"
                    value={timelineSearch}
                    onChange={(e) => setTimelineSearch(e.target.value)}
                    placeholder="Filter timeline…"
                    className="w-full rounded-md border border-[#cbd5e1] bg-white py-1.5 pl-8 pr-3 text-xs text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#1d4ed8] focus:outline-none"
                  />
                </div>
              </div>

              {loading && (
                <div className="mt-5 space-y-3" role="status" aria-label="Loading recorded evidence">
                  <div className="dm-skeleton h-12 w-full" />
                  <div className="dm-skeleton h-12 w-full" />
                  <div className="dm-skeleton h-12 w-4/5" />
                </div>
              )}

              {error && (
                <div role="alert" className="dm-notice dm-notice-error mt-4">
                  {error}
                </div>
              )}

              {!loading && displayedTimeline.length > 0 && (
                <ol className="mt-4 divide-y divide-[#f1f5f9]">
                  {displayedTimeline.map((event) => {
                    const Icon =
                      event.kind === 'signal'
                        ? Activity
                        : event.kind === 'score'
                          ? TrendingUp
                          : event.tone === 'emerald'
                            ? CheckCircle2
                            : PlayCircle;
                    const toneColor =
                      event.tone === 'emerald'
                        ? 'text-[#15803d]'
                        : event.tone === 'amber'
                          ? 'text-[#b45309]'
                          : event.tone === 'red'
                            ? 'text-[#b91c1c]'
                            : event.tone === 'blue'
                              ? 'text-[#1d4ed8]'
                              : 'text-[#475569]';

                    return (
                      <li key={event.id} className="flex items-start gap-3 py-3.5">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#e2e8f0] bg-[#f8fafc]">
                          <Icon size={14} className={toneColor} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="text-sm font-semibold capitalize text-[#0f172a]">
                              {event.title}
                            </p>
                            {event.badgeText && (
                              <span
                                className={`text-xs font-semibold capitalize tabular-nums ${toneColor}`}
                              >
                                {event.badgeText}
                              </span>
                            )}
                          </div>
                          <p className="dm-caption mt-0.5 tabular-nums">{event.subtitle}</p>
                          {event.detail && (
                            <p className="mt-1 text-xs leading-relaxed text-[#475569]">
                              {event.detail}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}

              {!loading && visibleTimeline.length > 12 && (
                <div className="mt-3 border-t border-[#e2e8f0] pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAllEvents((v) => !v)}
                    className="dm-text-button"
                  >
                    {showAllEvents
                      ? 'Show fewer events'
                      : `Show all ${visibleTimeline.length.toLocaleString()} events`}
                  </button>
                </div>
              )}

              {!loading && !error && !displayedTimeline.length && (
                <p className="dm-empty">
                  {timelineSearch || timelineFilter !== 'all'
                    ? 'No timeline events match the active filter.'
                    : 'No recorded activity for this demand unit.'}
                </p>
              )}
            </section>

            {/* Right Sidebar: Operating Gate, Blockers, and Next Steps */}
            <aside className="space-y-5">
              <section className="dm-card">
                <h2 className="flex items-center gap-2 text-base font-semibold text-[#0f172a]">
                  <ShieldCheck size={17} className="text-[#64748b]" />
                  Operating gate &amp; next steps
                </h2>
                <div className="mt-4 space-y-4">
                  {selected.committee.coverageScore === 0 && (
                    <div className="dm-notice dm-notice-warning">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                      <p>
                        Coverage is zero. Verify first-party roles and consent before enabling any
                        audience addition or sales handoff.
                      </p>
                    </div>
                  )}

                  {details?.blockers
                    .filter((b) => b.code !== 'coverage_zero')
                    .slice(0, 3)
                    .map((b) => (
                      <div
                        key={b.code}
                        className="border-t border-[#f1f5f9] pt-3 first:border-t-0 first:pt-0"
                      >
                        <p className="text-sm font-medium text-[#0f172a]">{b.message}</p>
                        {b.next_action && <p className="dm-caption mt-1">{b.next_action}</p>}
                      </div>
                    ))}

                  <div className="border-t border-[#e2e8f0] pt-3">
                    <p className="dm-caption">Stored recommended play</p>
                    <p className="mt-1 text-sm font-semibold capitalize text-[#0f172a]">
                      {humanize(selected.recommendedPlaybookId || 'Not evaluated').toLowerCase()}
                    </p>
                  </div>

                  <p className="dm-caption leading-relaxed">
                    {selected.jevDecision?.applied
                      ? 'A recorded automated decision is available. Destination mapping and product coverage gates still control execution.'
                      : 'No current automated evaluation. Scores alone do not authorize an audience addition.'}
                  </p>

                  <div className="flex flex-col gap-2 border-t border-[#e2e8f0] pt-3.5">
                    {onNavigateTab && (
                      <>
                        <button
                          type="button"
                          className="dm-text-button justify-start"
                          onClick={() => onNavigateTab('SIGNALS')}
                        >
                          Review next action in playbooks <ArrowRight size={14} />
                        </button>
                        <button
                          type="button"
                          className="dm-text-button justify-start"
                          onClick={() => onNavigateTab('RULES')}
                        >
                          Adjust scoring thresholds <ArrowRight size={14} />
                        </button>
                        <button
                          type="button"
                          className="dm-text-button justify-start"
                          onClick={() => onNavigateTab('AUTOMATION')}
                        >
                          Inspect decision automation <ArrowRight size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </section>

              <section className="dm-card">
                <h2 className="text-base font-semibold text-[#0f172a]">Score snapshot log</h2>
                <div className="mt-3 divide-y divide-[#e2e8f0]">
                  {history.slice(0, 5).map((snapshot) => (
                    <div key={snapshot.id} className="py-3 tabular-nums">
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <strong className="font-semibold text-[#0f172a]">
                          {snapshot.composite_score.toFixed(1)} / 100
                        </strong>
                        <span className="dm-caption">
                          {snapshot.decision_applied ? 'Automated' : 'Policy score'}
                        </span>
                      </div>
                      <p className="dm-caption mt-0.5">{formatDateTime(snapshot.scored_at)}</p>
                      <p className="dm-caption mt-0.5">
                        Fit {snapshot.fit_score.toFixed(1)} · Intent{' '}
                        {snapshot.intent_score.toFixed(1)} · Coverage{' '}
                        {snapshot.coverage_score.toFixed(1)}%
                      </p>
                    </div>
                  ))}
                </div>
                {!history.length && !loading && (
                  <p className="dm-caption mt-3">No recorded score history available.</p>
                )}
              </section>
            </aside>
          </div>

          {/* Bottom: Execution History Table */}
          <section className="dm-card !p-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
              <div>
                <h2 className="text-base font-semibold text-[#0f172a]">Execution history</h2>
                <p className="dm-caption mt-1">
                  Job status records workflow execution. A succeeded job alone does not prove that
                  an external audience changed.
                </p>
              </div>
              {jobs.length > 8 && (
                <button
                  type="button"
                  onClick={() => setShowAllJobs((v) => !v)}
                  className="dm-text-button"
                >
                  {showAllJobs ? 'Show recent 8' : `Show all ${jobs.length.toLocaleString()} jobs`}
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="dm-table w-full min-w-[560px]">
                <thead>
                  <tr>
                    <th>Destination</th>
                    <th>Action</th>
                    <th>Status</th>
                    <th>Recorded at</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedJobs.map((job) => (
                    <tr key={job.id}>
                      <td>
                        <strong className="font-medium text-[#0f172a]">{job.destination}</strong>
                        <p className="dm-caption">
                          {job.result?.mode === 'dry_run'
                            ? 'Preview · no provider request'
                            : job.destination === 'playbook_executor'
                              ? 'Internal workflow'
                              : 'Recorded connector job'}
                        </p>
                      </td>
                      <td className="capitalize">{humanize(job.action)}</td>
                      <td>
                        <span
                          className={`text-xs font-semibold capitalize ${
                            job.status === 'succeeded' || job.status === 'completed'
                              ? 'text-[#15803d]'
                              : job.status === 'failed'
                                ? 'text-[#b91c1c]'
                                : 'text-[#1d4ed8]'
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="tabular-nums">
                        {formatDateTime(job.completed_at || job.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!jobs.length && <p className="dm-empty">No provider jobs recorded.</p>}
          </section>
        </>
      )}
    </div>
  );
};
