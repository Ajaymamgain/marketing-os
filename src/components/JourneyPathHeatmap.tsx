import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Flame, GitBranch, ShieldAlert } from 'lucide-react';
import { AccountDemandUnit, ActiveNavTab, FunnelStage } from '../types';

export interface JourneyHeatmapStage {
  id: FunnelStage;
  short: string;
  label: string;
}

const HEATMAP_STAGES: JourneyHeatmapStage[] = [
  { id: 'target', short: 'Target', label: 'Target' },
  { id: 'engaged', short: 'Engaged', label: 'Engaged' },
  { id: 'prioritized_du', short: 'Prioritized', label: 'Prioritized' },
  { id: 'qualified_du', short: 'Qualified', label: 'Qualified' },
  { id: 'pipeline_deal', short: 'Pipeline', label: 'Pipeline' },
  { id: 'closed_won', short: 'Won', label: 'Closed won' },
];

const STAGE_INDEX: Record<FunnelStage, number> = {
  target: 0,
  engaged: 1,
  prioritized_du: 2,
  qualified_du: 3,
  pipeline_deal: 4,
  closed_won: 5,
  expansion: 5,
};

type MetricDisplay = 'count' | 'rate';

interface MatrixCell {
  fromIdx: number;
  toIdx: number;
  kind: 'stall' | 'forward' | 'empty';
  accounts: AccountDemandUnit[];
  count: number;
  rateOfOrigin: number;
  avgScore: number;
  avgCoverage: number;
  coverageBlockedCount: number;
  flatMomentumCount: number;
  isFastTrack: boolean;
}

interface HandoffSummary {
  fromIdx: number;
  toIdx: number;
  fromLabel: string;
  toLabel: string;
  reachedFrom: number;
  advancedCount: number;
  stalledCount: number;
  advancePct: number;
  stallPct: number;
  coverageBlockedAtFrom: number;
}

interface Props {
  accounts: AccountDemandUnit[];
  onInspectAccountJourney: (account: AccountDemandUnit) => void;
  onSelectAccountDrawer: (account: AccountDemandUnit) => void;
  onNavigateTab?: (tab: ActiveNavTab) => void;
}

function getForwardCellStyle(intensity: number, isSelected: boolean): string {
  if (intensity <= 0) {
    return isSelected
      ? 'border-[#1d4ed8] bg-[#eff6ff] text-[#475569]'
      : 'border-[#e2e8f0] bg-[#f8fafc]/70 text-[#94a3b8]';
  }
  if (intensity < 0.22) {
    return isSelected
      ? 'border-[#1d4ed8] bg-[#dbeafe] text-[#1e3a8a] ring-1 ring-[#1d4ed8]'
      : 'border-[#bfdbfe] bg-[#eff6ff] text-[#1e40af] hover:border-[#60a5fa]';
  }
  if (intensity < 0.48) {
    return isSelected
      ? 'border-[#1e40af] bg-[#bfdbfe] text-[#1e3a8a] ring-1 ring-[#1d4ed8]'
      : 'border-[#93c5fd] bg-[#dbeafe] text-[#1e3a8a] hover:border-[#3b82f6]';
  }
  if (intensity < 0.75) {
    return isSelected
      ? 'border-[#0f172a] bg-[#2563eb] text-white ring-1 ring-[#0f172a]'
      : 'border-[#2563eb] bg-[#3b82f6] text-white hover:bg-[#2563eb]';
  }
  return isSelected
    ? 'border-[#0f172a] bg-[#1e40af] text-white ring-1 ring-[#0f172a]'
    : 'border-[#1d4ed8] bg-[#1d4ed8] text-white hover:bg-[#1e40af]';
}

function getStallCellStyle(intensity: number, isSelected: boolean, isTopBottleneck: boolean): string {
  if (intensity <= 0) {
    return isSelected
      ? 'border-[#b45309] bg-[#fffbeb] text-[#92400e]'
      : 'border-[#e2e8f0] bg-[#f8fafc]/70 text-[#94a3b8]';
  }
  if (intensity < 0.25) {
    return isSelected
      ? 'border-[#b45309] bg-[#fef3c7] text-[#78350f] ring-1 ring-[#b45309]'
      : 'border-[#fde68a] bg-[#fffbeb] text-[#92400e] hover:border-[#f59e0b]';
  }
  if (intensity < 0.55) {
    return isSelected
      ? 'border-[#92400e] bg-[#fde68a] text-[#78350f] ring-1 ring-[#92400e]'
      : 'border-[#fcd34d] bg-[#fef3c7] text-[#78350f] hover:border-[#d97706]';
  }
  if (intensity < 0.8) {
    return isSelected
      ? 'border-[#0f172a] bg-[#d97706] text-white ring-1 ring-[#0f172a]'
      : isTopBottleneck
        ? 'border-[#92400e] bg-[#f59e0b] text-white hover:bg-[#d97706]'
        : 'border-[#d97706] bg-[#f59e0b] text-white hover:bg-[#d97706]';
  }
  return isSelected
    ? 'border-[#0f172a] bg-[#92400e] text-white ring-1 ring-[#0f172a]'
    : 'border-[#92400e] bg-[#b45309] text-white hover:bg-[#92400e]';
}

export const JourneyPathHeatmap: React.FC<Props> = ({
  accounts,
  onInspectAccountJourney,
  onSelectAccountDrawer,
  onNavigateTab,
}) => {
  const [metricDisplay, setMetricDisplay] = useState<MetricDisplay>('count');
  const [selectedCoords, setSelectedCoords] = useState<{ from: number; to: number } | null>(null);

  const analysis = useMemo(() => {
    const n = HEATMAP_STAGES.length;
    const buckets: AccountDemandUnit[][][] = Array.from({ length: n }, () =>
      Array.from({ length: n }, () => [])
    );
    const reachedCounts = Array<number>(n).fill(0);

    for (const acc of accounts) {
      const stageIdx = STAGE_INDEX[acc.stage] ?? 0;

      // Record every stage reached in lifecycle order
      for (let s = 0; s <= stageIdx; s++) {
        reachedCounts[s] += 1;
      }

      // Diagonal (stageIdx -> stageIdx): accounts currently resting / dwelling / stalling here
      buckets[stageIdx][stageIdx].push(acc);

      // Build forward transitions leading to stageIdx
      if (stageIdx > 0) {
        // High-velocity accounts with strong surge (+12 pts 7d delta or high intent+fit) exhibit fast-track jumps
        const isFastTrack =
          stageIdx >= 2 &&
          ((acc.scoreDelta7d || 0) >= 12 ||
            ((acc.scoreAudit?.intent ?? acc.scores?.intentSurge ?? 0) >= 82 &&
              (acc.scoreAudit?.fit ?? acc.scores?.firmographicFit ?? 0) >= 75));

        if (isFastTrack) {
          // Fast-track skip into current stage (e.g., Target -> Prioritized or Engaged -> Qualified)
          const jumpFrom = Math.max(0, stageIdx - 2);
          for (let s = 0; s < jumpFrom; s++) {
            buckets[s][s + 1].push(acc);
          }
          buckets[jumpFrom][stageIdx].push(acc);
        } else {
          for (let s = 0; s < stageIdx; s++) {
            buckets[s][s + 1].push(acc);
          }
        }
      }
    }

    const avg = (list: AccountDemandUnit[], fn: (a: AccountDemandUnit) => number) =>
      list.length > 0 ? Math.round(list.reduce((sum, a) => sum + fn(a), 0) / list.length) : 0;

    let maxForward = 1;
    let maxStall = 1;
    let topForwardCell: { from: number; to: number; count: number; rate: number } | null = null;
    let topStallCell: { from: number; count: number; rate: number } | null = null;

    const matrix: MatrixCell[][] = Array.from({ length: n }, (_, fromIdx) =>
      Array.from({ length: n }, (_, toIdx) => {
        const list = [...buckets[fromIdx][toIdx]].sort(
          (a, b) => b.compositeScore - a.compositeScore
        );
        const count = list.length;
        const denom = Math.max(1, reachedCounts[fromIdx]);
        const rateOfOrigin = reachedCounts[fromIdx] > 0 ? Math.round((count / denom) * 100) : 0;
        const kind: MatrixCell['kind'] =
          fromIdx === toIdx ? 'stall' : toIdx > fromIdx ? 'forward' : 'empty';

        if (kind === 'forward' && count > maxForward) {
          maxForward = count;
        }
        // Closed won is a terminal goal, not a stall bottleneck
        if (kind === 'stall' && fromIdx < n - 1 && count > maxStall) {
          maxStall = count;
        }

        if (kind === 'forward' && count > 0) {
          if (!topForwardCell || count > topForwardCell.count) {
            topForwardCell = { from: fromIdx, to: toIdx, count, rate: rateOfOrigin };
          }
        }
        if (kind === 'stall' && fromIdx < n - 1 && count > 0) {
          if (!topStallCell || count > topStallCell.count) {
            topStallCell = { from: fromIdx, count, rate: rateOfOrigin };
          }
        }

        return {
          fromIdx,
          toIdx,
          kind,
          accounts: list,
          count,
          rateOfOrigin,
          avgScore: avg(list, (a) => a.compositeScore || 0),
          avgCoverage: avg(list, (a) => a.committee.coverageScore || 0),
          coverageBlockedCount: list.filter((a) => a.committee.coverageScore === 0).length,
          flatMomentumCount: list.filter((a) => (a.scoreDelta7d || 0) <= 0).length,
          isFastTrack: toIdx - fromIdx > 1,
        };
      })
    );

    const handoffs: HandoffSummary[] = [];
    for (let i = 0; i < n - 1; i++) {
      const reachedFrom = reachedCounts[i];
      const stalledCount = matrix[i][i].count;
      const advancedCount = Math.max(0, reachedFrom - stalledCount);
      const advancePct = reachedFrom > 0 ? Math.round((advancedCount / reachedFrom) * 100) : 0;
      const stallPct = reachedFrom > 0 ? Math.round((stalledCount / reachedFrom) * 100) : 0;
      handoffs.push({
        fromIdx: i,
        toIdx: i + 1,
        fromLabel: HEATMAP_STAGES[i].label,
        toLabel: HEATMAP_STAGES[i + 1].label,
        reachedFrom,
        advancedCount,
        stalledCount,
        advancePct,
        stallPct,
        coverageBlockedAtFrom: matrix[i][i].coverageBlockedCount,
      });
    }

    const prePipelineCoverageStalls = accounts.filter(
      (a) => (STAGE_INDEX[a.stage] ?? 0) < 4 && a.committee.coverageScore === 0
    ).length;

    const qualifiedOrLater = reachedCounts[3] || 0;
    const qualifiedThroughputPct =
      accounts.length > 0 ? Math.round((qualifiedOrLater / accounts.length) * 100) : 0;

    return {
      matrix,
      reachedCounts,
      maxForward,
      maxStall,
      topForwardCell: topForwardCell as {
        from: number;
        to: number;
        count: number;
        rate: number;
      } | null,
      topStallCell: topStallCell as { from: number; count: number; rate: number } | null,
      handoffs,
      prePipelineCoverageStalls,
      qualifiedOrLater,
      qualifiedThroughputPct,
    };
  }, [accounts]);

  const effectiveSelection = useMemo(() => {
    if (selectedCoords) {
      return analysis.matrix[selectedCoords.from]?.[selectedCoords.to] ?? null;
    }
    if (analysis.topStallCell) {
      return analysis.matrix[analysis.topStallCell.from][analysis.topStallCell.from];
    }
    if (analysis.topForwardCell) {
      return analysis.matrix[analysis.topForwardCell.from][analysis.topForwardCell.to];
    }
    return analysis.matrix[0][0];
  }, [analysis, selectedCoords]);

  const topBottleneckIdx = analysis.topStallCell?.from ?? -1;

  if (accounts.length === 0) {
    return (
      <div className="dm-card dm-empty">
        No accounts match the active cohort filter. Reset filters to visualize stage paths and
        bottlenecks.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top 4 Bottleneck & Path KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="dm-card dm-metric">
          <div className="flex items-center justify-between">
            <span>Primary stall point</span>
            <Flame size={16} className="text-[#b45309]" />
          </div>
          <strong className="text-[#b45309]">
            {analysis.topStallCell
              ? HEATMAP_STAGES[analysis.topStallCell.from].label
              : 'None'}
          </strong>
          <p className="tabular-nums">
            {analysis.topStallCell
              ? `${analysis.topStallCell.count.toLocaleString()} accounts dwelling (${analysis.topStallCell.rate}% of stage cohort)`
              : 'No pre-win stall concentration'}
          </p>
        </article>

        <article className="dm-card dm-metric">
          <div className="flex items-center justify-between">
            <span>Most frequent path</span>
            <GitBranch size={16} className="text-[#1d4ed8]" />
          </div>
          <strong>
            {analysis.topForwardCell
              ? `${HEATMAP_STAGES[analysis.topForwardCell.from].short} → ${HEATMAP_STAGES[analysis.topForwardCell.to].short}`
              : '—'}
          </strong>
          <p className="tabular-nums">
            {analysis.topForwardCell
              ? `${analysis.topForwardCell.count.toLocaleString()} accounts (${analysis.topForwardCell.rate}% conversion)`
              : 'No forward stage transitions yet'}
          </p>
        </article>

        <article className="dm-card dm-metric">
          <div className="flex items-center justify-between">
            <span>Coverage-blocked stalls</span>
            <ShieldAlert size={16} className="text-[#b45309]" />
          </div>
          <strong className="tabular-nums">
            {analysis.prePipelineCoverageStalls.toLocaleString()}
          </strong>
          <p>Pre-pipeline units held at 0% buying-group coverage</p>
        </article>

        <article className="dm-card dm-metric">
          <div className="flex items-center justify-between">
            <span>Qualification throughput</span>
            <ArrowRight size={16} className="text-[#059669]" />
          </div>
          <strong className="tabular-nums">{analysis.qualifiedThroughputPct}%</strong>
          <p className="tabular-nums">
            {analysis.qualifiedOrLater.toLocaleString()} of {accounts.length.toLocaleString()}{' '}
            reached Qualified or later
          </p>
        </article>
      </div>

      {/* Main 2-Column Heatmap Matrix + Selected Path/Stall Inspector */}
      <section className="dm-card !p-0 overflow-hidden" aria-labelledby="journey-heatmap-heading">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0] px-6 py-4">
          <div>
            <h2
              id="journey-heatmap-heading"
              className="text-base font-semibold tracking-tight text-[#0f172a]"
            >
              Stage transition &amp; stall heatmap
            </h2>
            <p className="mt-0.5 text-[13px] text-[#64748b]">
              Blue cells track forward account movement between stages; amber diagonal cells
              highlight where accounts currently stall.
            </p>
          </div>

          <div
            className="inline-flex items-center rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-0.5"
            role="group"
            aria-label="Heatmap cell metric"
          >
            {(
              [
                ['count', 'Account count'],
                ['rate', 'Stage share %'],
              ] as const
            ).map(([mode, label]) => {
              const active = metricDisplay === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setMetricDisplay(mode)}
                  className={`whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    active ? 'bg-[#0f172a] text-white' : 'text-[#475569] hover:text-[#0f172a]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
          {/* Left: 6x6 Matrix */}
          <div className="min-w-0 overflow-x-auto p-5 sm:p-6">
            <div className="min-w-[540px]">
              <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-[#64748b]">
                <span>Origin stage (rows) → Next / current stage (columns)</span>
                <span className="tabular-nums">
                  {accounts.length.toLocaleString()} accounts analyzed
                </span>
              </div>

              <div className="grid grid-cols-[106px_repeat(6,minmax(0,1fr))] gap-1.5">
                {/* Header Row */}
                <div className="flex items-end pb-1 text-[11px] font-semibold text-[#64748b]">
                  From \ To
                </div>
                {HEATMAP_STAGES.map((col) => (
                  <div
                    key={col.id}
                    className="pb-1 text-center text-[11px] font-semibold text-[#334155]"
                  >
                    {col.short}
                  </div>
                ))}

                {/* Matrix Rows */}
                {HEATMAP_STAGES.map((rowStage, fromIdx) => (
                  <React.Fragment key={rowStage.id}>
                    <div className="flex flex-col justify-center pr-2">
                      <span className="truncate text-xs font-semibold text-[#0f172a]">
                        {rowStage.short}
                      </span>
                      <span className="text-[10px] tabular-nums text-[#64748b]">
                        {analysis.reachedCounts[fromIdx].toLocaleString()} reached
                      </span>
                    </div>

                    {HEATMAP_STAGES.map((colStage, toIdx) => {
                      const cell = analysis.matrix[fromIdx][toIdx];
                      const isSelected =
                        effectiveSelection?.fromIdx === fromIdx &&
                        effectiveSelection?.toIdx === toIdx;
                      const isClosedWonGoal = fromIdx === HEATMAP_STAGES.length - 1 && toIdx === fromIdx;
                      const isTopBottleneck = fromIdx === topBottleneckIdx && toIdx === fromIdx;

                      if (cell.kind === 'empty') {
                        return (
                          <div
                            key={`${fromIdx}-${toIdx}`}
                            aria-hidden="true"
                            className="flex h-[62px] items-center justify-center rounded-lg border border-dashed border-[#e2e8f0]/70 bg-[#f8fafc]/40 text-xs text-[#cbd5e1]"
                          >
                            —
                          </div>
                        );
                      }

                      const intensity =
                        cell.kind === 'stall'
                          ? cell.count / analysis.maxStall
                          : cell.count / analysis.maxForward;

                      const colorClass = isClosedWonGoal
                        ? isSelected
                          ? 'border-[#047857] bg-[#059669] text-white ring-1 ring-[#0f172a]'
                          : cell.count > 0
                            ? 'border-[#6ee7b7] bg-[#ecfdf5] text-[#065f46] hover:border-[#059669]'
                            : 'border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8]'
                        : cell.kind === 'stall'
                          ? getStallCellStyle(intensity, isSelected, isTopBottleneck)
                          : getForwardCellStyle(intensity, isSelected);

                      const primaryVal =
                        cell.count === 0
                          ? '0'
                          : metricDisplay === 'count'
                            ? cell.count.toLocaleString()
                            : `${cell.rateOfOrigin}%`;

                      const subLabel =
                        cell.count === 0
                          ? ''
                          : isClosedWonGoal
                            ? 'Won'
                            : cell.kind === 'stall'
                              ? isTopBottleneck
                                ? 'Top stall'
                                : 'Stall'
                              : cell.isFastTrack
                                ? 'Fast-track'
                                : `${cell.rateOfOrigin}%`;

                      return (
                        <button
                          key={`${fromIdx}-${toIdx}`}
                          type="button"
                          onClick={() => setSelectedCoords({ from: fromIdx, to: toIdx })}
                          aria-pressed={isSelected}
                          aria-label={`${rowStage.label} to ${colStage.label}: ${cell.count} accounts (${cell.rateOfOrigin}%)`}
                          className={`flex h-[62px] flex-col items-center justify-center rounded-lg border px-1.5 text-center transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4ed8] ${colorClass}`}
                        >
                          <span className="text-sm font-bold leading-none tabular-nums">
                            {primaryVal}
                          </span>
                          {subLabel && (
                            <span className="mt-1 text-[10px] font-medium leading-none opacity-90 tabular-nums">
                              {subLabel}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#e2e8f0] pt-3.5 text-[11px] text-[#64748b]">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-flex gap-0.5">
                      <span className="h-2.5 w-2.5 rounded-xs bg-[#dbeafe]" />
                      <span className="h-2.5 w-2.5 rounded-xs bg-[#3b82f6]" />
                      <span className="h-2.5 w-2.5 rounded-xs bg-[#1d4ed8]" />
                    </span>
                    Forward path density
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-flex gap-0.5">
                      <span className="h-2.5 w-2.5 rounded-xs bg-[#fef3c7]" />
                      <span className="h-2.5 w-2.5 rounded-xs bg-[#f59e0b]" />
                      <span className="h-2.5 w-2.5 rounded-xs bg-[#b45309]" />
                    </span>
                    Stage stall concentration
                  </span>
                </div>
                <span>Click any cell to inspect accounts &amp; blockers</span>
              </div>
            </div>
          </div>

          {/* Right: Selected Path / Stall Cell Inspector */}
          <aside
            className="flex flex-col justify-between gap-5 border-t border-[#e2e8f0] bg-[#f8fafc]/70 p-6 xl:border-l xl:border-t-0"
            aria-label="Selected path or stall inspector"
          >
            {effectiveSelection ? (
              <div className="space-y-4">
                <div>
                  <p
                    className={`text-xs font-semibold ${
                      effectiveSelection.kind === 'stall' &&
                      effectiveSelection.fromIdx < HEATMAP_STAGES.length - 1
                        ? 'text-[#b45309]'
                        : 'text-[#1d4ed8]'
                    }`}
                  >
                    {effectiveSelection.kind === 'stall'
                      ? effectiveSelection.fromIdx === HEATMAP_STAGES.length - 1
                        ? 'Completed outcome'
                        : 'Stage stall & dwell analysis'
                      : effectiveSelection.isFastTrack
                        ? 'Fast-track progression corridor'
                        : 'Stage-to-stage progression path'}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold tracking-tight text-[#0f172a]">
                    {effectiveSelection.kind === 'stall'
                      ? `${HEATMAP_STAGES[effectiveSelection.fromIdx].label} cohort`
                      : `${HEATMAP_STAGES[effectiveSelection.fromIdx].label} → ${HEATMAP_STAGES[effectiveSelection.toIdx].label}`}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#475569]">
                    {effectiveSelection.kind === 'stall'
                      ? effectiveSelection.fromIdx === HEATMAP_STAGES.length - 1
                        ? 'Accounts that have completed the commercial cycle into Closed Won or expansion.'
                        : `Accounts currently resting in ${HEATMAP_STAGES[effectiveSelection.fromIdx].label} without advancing to ${HEATMAP_STAGES[effectiveSelection.fromIdx + 1]?.label}.`
                      : effectiveSelection.isFastTrack
                        ? 'High-momentum accounts leaping forward on strong 7-day surge and ICP alignment.'
                        : `Accounts progressing from ${HEATMAP_STAGES[effectiveSelection.fromIdx].label} into ${HEATMAP_STAGES[effectiveSelection.toIdx].label}.`}
                  </p>
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-[#e2e8f0] py-3.5 tabular-nums">
                  <div>
                    <dt className="text-xs text-[#64748b]">Accounts</dt>
                    <dd className="mt-0.5 text-lg font-bold text-[#0f172a]">
                      {effectiveSelection.count.toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#64748b]">Share of origin</dt>
                    <dd className="mt-0.5 text-lg font-bold text-[#0f172a]">
                      {effectiveSelection.rateOfOrigin}%
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#64748b]">Avg composite</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-[#0f172a]">
                      {effectiveSelection.count > 0 ? `${effectiveSelection.avgScore} / 100` : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#64748b]">Avg coverage</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-[#0f172a]">
                      {effectiveSelection.count > 0 ? `${effectiveSelection.avgCoverage}%` : '—'}
                    </dd>
                  </div>
                </dl>

                {/* Stall Diagnostics (only when accounts exist) */}
                {effectiveSelection.count > 0 &&
                  effectiveSelection.kind === 'stall' &&
                  effectiveSelection.fromIdx < HEATMAP_STAGES.length - 1 && (
                    <div className="space-y-2.5 rounded-lg border border-[#fde68a] bg-[#fffbeb] p-3.5 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-[#92400e]">
                        <AlertTriangle size={14} className="shrink-0 text-[#b45309]" />
                        <span>Why accounts stall here</span>
                      </div>
                      <div className="space-y-2 tabular-nums">
                        <div>
                          <div className="flex justify-between text-[11px] text-[#78350f]">
                            <span>0% buying-group coverage hold</span>
                            <strong>
                              {effectiveSelection.coverageBlockedCount} /{' '}
                              {effectiveSelection.count}
                            </strong>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#fde68a]">
                            <div
                              className="h-full bg-[#b45309]"
                              style={{
                                width: `${Math.round(
                                  (effectiveSelection.coverageBlockedCount /
                                    effectiveSelection.count) *
                                    100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-[11px] text-[#78350f]">
                            <span>Flat or declining 7d score momentum</span>
                            <strong>
                              {effectiveSelection.flatMomentumCount} / {effectiveSelection.count}
                            </strong>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#fde68a]">
                            <div
                              className="h-full bg-[#d97706]"
                              style={{
                                width: `${Math.round(
                                  (effectiveSelection.flatMomentumCount /
                                    effectiveSelection.count) *
                                    100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Accounts in this cell */}
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#0f172a]">
                      Accounts in this {effectiveSelection.kind === 'stall' ? 'stage' : 'path'}
                    </span>
                    <span className="text-[#64748b]">Click to open journey</span>
                  </div>

                  {effectiveSelection.accounts.length > 0 ? (
                    <div className="mt-2 divide-y divide-[#e2e8f0] rounded-lg border border-[#e2e8f0] bg-white">
                      {effectiveSelection.accounts.slice(0, 5).map((acc) => (
                        <div
                          key={acc.id}
                          className="flex items-center justify-between gap-2 px-3 py-2.5 text-xs transition-colors hover:bg-[#f8fafc]"
                        >
                          <button
                            type="button"
                            onClick={() => onInspectAccountJourney(acc)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <span className="block truncate font-semibold text-[#0f172a] hover:text-[#1d4ed8]">
                              {acc.accountName}
                            </span>
                            <span className="block truncate text-[11px] text-[#64748b]">
                              {acc.solutionTarget}
                            </span>
                          </button>
                          <div className="flex shrink-0 items-center gap-2.5 tabular-nums">
                            <span
                              className={`text-[11px] ${
                                acc.committee.coverageScore === 0
                                  ? 'font-semibold text-[#b45309]'
                                  : 'text-[#64748b]'
                              }`}
                            >
                              {acc.committee.coverageScore}%
                            </span>
                            <span className="font-semibold text-[#1d4ed8]">
                              {acc.compositeScore}
                            </span>
                            <button
                              type="button"
                              onClick={() => onSelectAccountDrawer(acc)}
                              className="text-[11px] font-medium text-[#475569] hover:text-[#0f172a]"
                              title="Open full account drawer"
                            >
                              Details
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-[#64748b]">
                      No accounts recorded on this path in the current filter.
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            {onNavigateTab && (
              <div className="flex flex-wrap items-center gap-2 border-t border-[#e2e8f0] pt-4">
                <button
                  type="button"
                  className="dm-button dm-button-primary flex-1"
                  onClick={() => onNavigateTab('SIGNALS')}
                >
                  Unblock in playbooks
                </button>
                <button
                  type="button"
                  className="dm-button"
                  onClick={() => onNavigateTab('COVERAGE')}
                >
                  Coverage holds
                </button>
              </div>
            )}
          </aside>
        </div>
      </section>

      {/* Bottom: Stage-by-Stage Advance vs. Stall Bottleneck Bar Strip */}
      <section className="dm-card" aria-labelledby="stage-dropoff-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="stage-dropoff-heading" className="text-base font-semibold text-[#0f172a]">
              Stage-to-stage progression vs. stall breakdown
            </h2>
            <p className="mt-0.5 text-[13px] text-[#64748b]">
              Compare advance rates against stage stall rates across each sequential handoff. Click
              any row to highlight its stall cohort above.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#64748b]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-[#1d4ed8]" /> Advanced
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-[#d97706]" /> Stalled / dwelling
            </span>
          </div>
        </div>

        <div className="mt-4 divide-y divide-[#e2e8f0]">
          {analysis.handoffs.map((step) => {
            const isTop = step.fromIdx === topBottleneckIdx;
            return (
              <button
                key={step.fromIdx}
                type="button"
                onClick={() => setSelectedCoords({ from: step.fromIdx, to: step.fromIdx })}
                className="grid w-full grid-cols-1 items-center gap-3 py-3 text-left transition-colors hover:bg-[#f8fafc] md:grid-cols-[210px_minmax(0,1fr)_170px]"
              >
                <div>
                  <span className="text-sm font-semibold text-[#0f172a]">
                    {step.fromLabel} → {step.toLabel}
                  </span>
                  <span className="mt-0.5 block text-xs tabular-nums text-[#64748b]">
                    {step.reachedFrom.toLocaleString()} reached {step.fromLabel}
                    {isTop && (
                      <span className="ml-1.5 font-semibold text-[#b45309]">· Primary stall</span>
                    )}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex h-3 w-full overflow-hidden rounded-full bg-[#e2e8f0]">
                    <div
                      className="h-full bg-[#1d4ed8] transition-all"
                      style={{ width: `${step.advancePct}%` }}
                    />
                    <div
                      className="h-full bg-[#d97706] transition-all"
                      style={{ width: `${step.stallPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] tabular-nums text-[#64748b]">
                    <span>
                      <strong className="text-[#1d4ed8]">{step.advancePct}%</strong> advanced (
                      {step.advancedCount.toLocaleString()})
                    </span>
                    <span>
                      <strong className="text-[#b45309]">{step.stallPct}%</strong> stalled (
                      {step.stalledCount.toLocaleString()})
                    </span>
                  </div>
                </div>

                <div className="text-left text-xs tabular-nums md:text-right">
                  <span className="font-semibold text-[#0f172a]">
                    {step.coverageBlockedAtFrom.toLocaleString()} coverage holds
                  </span>
                  <span className="block text-[11px] text-[#64748b]">at {step.fromLabel}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
