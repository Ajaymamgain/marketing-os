import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { AccountDemandUnit, ActiveNavTab, FunnelStage } from '../types';

export interface FunnelStageDef {
  stage: FunnelStage;
  label: string;
  shortCode: string;
  goalLabel: string;
  routingRole: string;
  description: string;
  whyTitle: string;
  whyBody: string;
  gateRule: string;
  color: string;
  activeColor: string;
}

export const DEMAND_WATERFALL_STAGES: FunnelStageDef[] = [
  {
    stage: 'target',
    label: 'Tracked Accounts',
    shortCode: 'Tracked',
    goalLabel: 'Tracked',
    routingRole: 'Universe baseline',
    description: 'Every scored account and need tracked in the active workspace filter.',
    whyTitle: 'Why start with the full tracked universe?',
    whyBody:
      'Every downstream conversion rate is measured against the active account universe so fit, intent, and buying-group coverage gaps stay visible.',
    gateRule: 'Included in active account & need filter',
    color: '#334155',
    activeColor: '#1e293b',
  },
  {
    stage: 'engaged',
    label: 'Engaged',
    shortCode: 'Engaged',
    goalLabel: 'Engaged',
    routingRole: 'Nurture & signal capture',
    description: 'Accounts showing active marketing engagement or recorded buying-group activity.',
    whyTitle: 'Why track engagement before scoring thresholds?',
    whyBody:
      'Engaged accounts generate behavioral, product, and intent telemetry that feeds the composite model, but they stay in marketing nurture until fit and momentum converge.',
    gateRule: 'Active engagement or composite score ≥ 35',
    color: '#0284c7',
    activeColor: '#0369a1',
  },
  {
    stage: 'prioritized_du',
    label: 'Prioritized',
    shortCode: 'Prioritized',
    goalLabel: 'Prioritized',
    routingRole: 'Orchestrate & enrich',
    description: 'High-fit accounts crossing priority scoring thresholds for active orchestration.',
    whyTitle: 'Why orchestrate prioritized units before sales handoff?',
    whyBody:
      'Prioritized demand units show strong ICP fit or surge momentum, making them ideal for buying-group discovery and targeted plays before committing AE capacity.',
    gateRule: 'Score within 15 pts of qualification threshold',
    color: '#0d9488',
    activeColor: '#0f766e',
  },
  {
    stage: 'qualified_du',
    label: 'Qualified',
    shortCode: 'Qualified',
    goalLabel: 'Qualified · Sales-Ready',
    routingRole: 'Primary · Sales lane',
    description: 'Demand units meeting fit, intent, and verified buying-group coverage gates.',
    whyTitle: 'Why is Qualified the primary routing gate?',
    whyBody:
      'Accounts passing both the composite score threshold and the buying-group coverage gate clear policy holds and route cleanly into sales workflows without wasting SDR cycles.',
    gateRule: 'Composite ≥ threshold + buying-group coverage gate',
    color: '#059669',
    activeColor: '#047857',
  },
  {
    stage: 'pipeline_deal',
    label: 'Pipeline',
    shortCode: 'Pipeline',
    goalLabel: 'Pipeline',
    routingRole: 'Active opportunity',
    description: 'Active sales opportunities progressing through commercial evaluation.',
    whyTitle: 'Why separate active pipeline from newly qualified demand?',
    whyBody:
      'Pipeline accounts already carry open commercial motion. Tracking them alongside scoring exposes stakeholder gaps before late-stage deals stall.',
    gateRule: 'Verified sales opportunity in commercial evaluation',
    color: '#1d4ed8',
    activeColor: '#1e40af',
  },
  {
    stage: 'closed_won',
    label: 'Closed Won',
    shortCode: 'Won',
    goalLabel: 'Closed Won',
    routingRole: 'Revenue & expansion',
    description: 'Completed deals and expansion-ready customer accounts.',
    whyTitle: 'Why close the loop at Closed Won?',
    whyBody:
      'Comparing won-account fit, intent, and committee depth against earlier tiers calibrates scoring weights around patterns that actually close.',
    gateRule: 'Closed-won revenue or active expansion unit',
    color: '#475569',
    activeColor: '#334155',
  },
];

const STAGE_ORDER: FunnelStage[] = [
  'target',
  'engaged',
  'prioritized_du',
  'qualified_du',
  'pipeline_deal',
  'closed_won',
  'expansion',
];

const GOAL_STAGES: FunnelStage[] = [
  'engaged',
  'prioritized_du',
  'qualified_du',
  'pipeline_deal',
  'closed_won',
];

interface ScoringPolicyState {
  fitWeight: number;
  intentWeight: number;
  coverageWeight: number;
  qualifyThreshold: number;
  minCoverage: number;
}

interface ScoringPreset {
  id: 'live' | 'intent' | 'coverage' | 'velocity';
  label: string;
  policy: ScoringPolicyState;
}

function parseFormulaWeights(scoreFormula?: string): { fit: number; intent: number; coverage: number } {
  const fallback = { fit: 35, intent: 40, coverage: 25 };
  if (!scoreFormula) return fallback;
  const fitMatch = scoreFormula.match(/fit\s*[×*x]\s*([0-9.]+)/i);
  const intentMatch = scoreFormula.match(/intent\s*[×*x]\s*([0-9.]+)/i);
  const covMatch = scoreFormula.match(/coverage\s*[×*x]\s*([0-9.]+)/i);
  if (!fitMatch || !intentMatch || !covMatch) return fallback;

  const toPct = (raw: string) => {
    const val = Number.parseFloat(raw);
    if (!Number.isFinite(val) || val <= 0) return 0;
    return val <= 1 ? Math.round(val * 100) : Math.round(val);
  };
  const fit = toPct(fitMatch[1]);
  const intent = toPct(intentMatch[1]);
  const coverage = toPct(covMatch[1]);
  if (fit + intent + coverage === 0) return fallback;
  return { fit, intent, coverage };
}

function extractScoreComponents(account: AccountDemandUnit) {
  const fit = Math.round(
    account.scoreAudit?.fit ?? account.scores?.firmographicFit ?? 0
  );
  const intent = Math.round(
    account.scoreAudit?.intent ??
      Math.max(
        account.scores?.intentSurge ?? 0,
        account.scores?.behavioralEngagement ?? 0,
        account.scores?.productTelemetry ?? 0
      )
  );
  const coverage = Math.round(
    account.scoreAudit?.coverage ?? account.committee?.coverageScore ?? 0
  );
  const liveComposite = Math.round(
    account.compositeScore ?? account.scoreAudit?.composite ?? 0
  );
  return { fit, intent, coverage, liveComposite };
}

function normalizeWeights(fitWeight: number, intentWeight: number, coverageWeight: number) {
  const sum = Math.max(1, fitWeight + intentWeight + coverageWeight);
  const fitPct = Math.round((fitWeight / sum) * 100);
  const intentPct = Math.round((intentWeight / sum) * 100);
  const coveragePct = Math.max(0, 100 - fitPct - intentPct);
  return { fitPct, intentPct, coveragePct };
}

function formatCompactCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000).toLocaleString()}k`;
  return `$${Math.round(value).toLocaleString()}`;
}

interface EvaluatedAccount {
  account: AccountDemandUnit;
  fit: number;
  intent: number;
  coverage: number;
  score: number;
  stage: FunnelStage;
  coverageHold: boolean;
  meetsThreshold: boolean;
}

interface FunnelRowMetrics extends FunnelStageDef {
  index: number;
  count: number;
  liveCount: number;
  countDelta: number;
  exactCount: number;
  liveExactCount: number;
  pctOfTop: number;
  avgScore: number;
  avgFit: number;
  avgIntent: number;
  avgCoverage: number;
  coverageHolds: number;
  salesReady: number;
  exactAccounts: EvaluatedAccount[];
  cumulativeAccounts: EvaluatedAccount[];
}

interface DemandWaterfallFunnelProps {
  accounts: AccountDemandUnit[];
  selectedStage?: FunnelStage;
  onSelectStage?: (stage: FunnelStage) => void;
  onSelectAccount: (account: AccountDemandUnit) => void;
  onNavigateTab?: (tab: ActiveNavTab) => void;
  showFullFunnelLink?: boolean;
  scoreFormula?: string;
  enableScoringControls?: boolean;
  title?: string;
  subtitle?: string;
}

export const DemandWaterfallFunnel: React.FC<DemandWaterfallFunnelProps> = ({
  accounts,
  selectedStage: controlledStage,
  onSelectStage,
  onSelectAccount,
  onNavigateTab,
  showFullFunnelLink = false,
  scoreFormula,
  enableScoringControls = true,
  title = 'Demand Waterfall Funnel',
  subtitle = 'Interactive account scoring waterfall, policy cutoff gate, and stage-level qualification simulator.',
}) => {
  const defaultWeights = useMemo(() => parseFormulaWeights(scoreFormula), [scoreFormula]);

  const liveBaselinePolicy = useMemo<ScoringPolicyState>(
    () => ({
      fitWeight: defaultWeights.fit,
      intentWeight: defaultWeights.intent,
      coverageWeight: defaultWeights.coverage,
      qualifyThreshold: 70,
      minCoverage: 1,
    }),
    [defaultWeights]
  );

  const presets = useMemo<ScoringPreset[]>(
    () => [
      { id: 'live', label: 'Live policy', policy: liveBaselinePolicy },
      {
        id: 'intent',
        label: 'Intent-led',
        policy: {
          fitWeight: 25,
          intentWeight: 55,
          coverageWeight: 20,
          qualifyThreshold: 68,
          minCoverage: 15,
        },
      },
      {
        id: 'coverage',
        label: 'Coverage-strict',
        policy: {
          fitWeight: 30,
          intentWeight: 30,
          coverageWeight: 40,
          qualifyThreshold: 72,
          minCoverage: 40,
        },
      },
      {
        id: 'velocity',
        label: 'High-velocity',
        policy: {
          fitWeight: 30,
          intentWeight: 50,
          coverageWeight: 20,
          qualifyThreshold: 62,
          minCoverage: 0,
        },
      },
    ],
    [liveBaselinePolicy]
  );

  const [internalStage, setInternalStage] = useState<FunnelStage>('qualified_du');
  const [targetGoalStage, setTargetGoalStage] = useState<FunnelStage>('qualified_du');
  const [openWhyStage, setOpenWhyStage] = useState<FunnelStage | null>(null);
  const [activePreset, setActivePreset] = useState<ScoringPreset['id'] | 'custom'>('live');
  const [policy, setPolicy] = useState<ScoringPolicyState>(liveBaselinePolicy);

  useEffect(() => {
    if (activePreset === 'live') {
      setPolicy(liveBaselinePolicy);
    }
  }, [activePreset, liveBaselinePolicy]);

  useEffect(() => {
    if (!openWhyStage) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenWhyStage(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openWhyStage]);

  const activeStage = controlledStage ?? internalStage;
  const isSimulated =
    policy.fitWeight !== liveBaselinePolicy.fitWeight ||
    policy.intentWeight !== liveBaselinePolicy.intentWeight ||
    policy.coverageWeight !== liveBaselinePolicy.coverageWeight ||
    policy.qualifyThreshold !== liveBaselinePolicy.qualifyThreshold ||
    policy.minCoverage !== liveBaselinePolicy.minCoverage;

  const normalized = useMemo(
    () => normalizeWeights(policy.fitWeight, policy.intentWeight, policy.coverageWeight),
    [policy.fitWeight, policy.intentWeight, policy.coverageWeight]
  );

  const handleStageSelect = (stage: FunnelStage) => {
    setInternalStage(stage);
    onSelectStage?.(stage);
  };

  const handleGoalSelect = (stage: FunnelStage) => {
    setTargetGoalStage(stage);
    handleStageSelect(stage);
  };

  const handlePresetSelect = (preset: ScoringPreset) => {
    setActivePreset(preset.id);
    setPolicy(preset.policy);
  };

  const updatePolicy = (patch: Partial<ScoringPolicyState>) => {
    setActivePreset('custom');
    setPolicy((prev) => ({ ...prev, ...patch }));
  };

  const resetToLive = () => {
    setActivePreset('live');
    setPolicy(liveBaselinePolicy);
  };

  const { rows, liveSummary, simSummary } = useMemo(() => {
    const totalWeight = Math.max(1, policy.fitWeight + policy.intentWeight + policy.coverageWeight);
    const prioritizeThreshold = Math.max(40, policy.qualifyThreshold - 15);
    const engageThreshold = Math.max(20, prioritizeThreshold - 18);

    const evaluate = (simulate: boolean): EvaluatedAccount[] =>
      accounts.map((account) => {
        const { fit, intent, coverage, liveComposite } = extractScoreComponents(account);
        if (!simulate) {
          const coverageHold = coverage === 0;
          const stage: FunnelStage =
            account.stage === 'expansion' ? 'closed_won' : account.stage;
          return {
            account,
            fit,
            intent,
            coverage,
            score: liveComposite,
            stage,
            coverageHold,
            meetsThreshold: liveComposite >= liveBaselinePolicy.qualifyThreshold,
          };
        }

        const simScore = Math.round(
          (fit * policy.fitWeight + intent * policy.intentWeight + coverage * policy.coverageWeight) /
            totalWeight
        );
        const coverageHold = policy.minCoverage > 0 && coverage < policy.minCoverage;
        const meetsThreshold = simScore >= policy.qualifyThreshold;

        let simStage: FunnelStage;
        if (
          account.stage === 'closed_won' ||
          account.stage === 'expansion' ||
          account.stage === 'pipeline_deal'
        ) {
          simStage = account.stage === 'expansion' ? 'closed_won' : account.stage;
        } else if (meetsThreshold && !coverageHold) {
          simStage = 'qualified_du';
        } else if (simScore >= prioritizeThreshold) {
          simStage = 'prioritized_du';
        } else if (simScore >= engageThreshold || account.stage === 'engaged') {
          simStage = 'engaged';
        } else {
          simStage = 'target';
        }

        return {
          account,
          fit,
          intent,
          coverage,
          score: simScore,
          stage: simStage,
          coverageHold,
          meetsThreshold,
        };
      });

    const liveEvaluated = evaluate(false);
    const activeEvaluated = isSimulated ? evaluate(true) : liveEvaluated;

    const totalTracked = accounts.length;
    const avgOf = (list: EvaluatedAccount[], pick: (item: EvaluatedAccount) => number) =>
      list.length > 0
        ? Math.round(list.reduce((sum, item) => sum + pick(item), 0) / list.length)
        : 0;

    const builtRows: FunnelRowMetrics[] = DEMAND_WATERFALL_STAGES.map((def, index) => {
      const stageIdx = STAGE_ORDER.indexOf(def.stage);

      const filterCumulative = (list: EvaluatedAccount[]) =>
        list.filter((item) => {
          const idx = STAGE_ORDER.indexOf(item.stage);
          return (idx === -1 ? 0 : idx) >= stageIdx;
        });

      const filterExact = (list: EvaluatedAccount[]) =>
        list.filter((item) =>
          def.stage === 'closed_won'
            ? item.stage === 'closed_won' || item.stage === 'expansion'
            : item.stage === def.stage
        );

      const cumulative = filterCumulative(activeEvaluated).sort((a, b) => b.score - a.score);
      const exact = filterExact(activeEvaluated).sort((a, b) => b.score - a.score);
      const liveCumulative = filterCumulative(liveEvaluated);
      const liveExact = filterExact(liveEvaluated);

      const sampleForAvg = exact.length > 0 ? exact : cumulative;
      const count = cumulative.length;
      const liveCount = liveCumulative.length;

      return {
        ...def,
        index,
        count,
        liveCount,
        countDelta: count - liveCount,
        exactCount: exact.length,
        liveExactCount: liveExact.length,
        pctOfTop: totalTracked > 0 ? Math.round((count / totalTracked) * 100) : 0,
        avgScore: avgOf(sampleForAvg, (item) => item.score),
        avgFit: avgOf(sampleForAvg, (item) => item.fit),
        avgIntent: avgOf(sampleForAvg, (item) => item.intent),
        avgCoverage: avgOf(sampleForAvg, (item) => item.coverage),
        coverageHolds: exact.filter((item) => item.coverageHold).length,
        salesReady: exact.filter(
          (item) =>
            !item.coverageHold &&
            (isSimulated
              ? item.meetsThreshold
              : item.account.scoreAudit?.routingState === 'SALES_LANE')
        ).length,
        exactAccounts: exact,
        cumulativeAccounts: cumulative,
      };
    });

    const summarize = (list: EvaluatedAccount[], minCov: number) => {
      const qualifiedOrLater = list.filter((item) => {
        const idx = STAGE_ORDER.indexOf(item.stage);
        return idx >= STAGE_ORDER.indexOf('qualified_du');
      });
      const heldAtGate = list.filter(
        (item) =>
          item.meetsThreshold &&
          minCov > 0 &&
          item.coverage < minCov &&
          STAGE_ORDER.indexOf(item.stage) < STAGE_ORDER.indexOf('pipeline_deal')
      );
      const totalCoverageHolds = list.filter((item) => item.coverageHold).length;
      const qualifiedValue = qualifiedOrLater.reduce(
        (sum, item) =>
          sum +
          (item.account.dataAvailability?.revenue !== false && item.account.estDealValue > 0
            ? item.account.estDealValue
            : 0),
        0
      );
      return {
        qualifiedCount: qualifiedOrLater.length,
        qualifiedShare:
          list.length > 0 ? Math.round((qualifiedOrLater.length / list.length) * 100) : 0,
        avgQualifiedScore: avgOf(qualifiedOrLater, (item) => item.score),
        avgAllScore: avgOf(list, (item) => item.score),
        heldAtGate: heldAtGate.length,
        totalCoverageHolds,
        qualifiedValue,
      };
    };

    return {
      rows: builtRows,
      liveSummary: summarize(liveEvaluated, liveBaselinePolicy.minCoverage),
      simSummary: summarize(activeEvaluated, policy.minCoverage),
    };
  }, [accounts, isSimulated, liveBaselinePolicy, policy]);

  const peak = Math.max(1, ...rows.map((r) => r.count));
  const stageWidth = (index: number) => {
    const value = rows[index]?.count ?? 0;
    if (accounts.length === 0) return 96;
    return 76 + (value / peak) * 264;
  };

  const activeIndex = Math.max(
    0,
    rows.findIndex((r) => r.stage === activeStage)
  );
  const focused = rows[activeIndex] ?? rows[0];
  const prior = activeIndex > 0 ? rows[activeIndex - 1] : null;
  const stepShare =
    prior && prior.count > 0 ? Math.round((focused.count / prior.count) * 100) : null;
  const previewAccounts = (
    focused.exactAccounts.length > 0 ? focused.exactAccounts : focused.cumulativeAccounts
  ).slice(0, 4);

  const qualifiedDelta = simSummary.qualifiedCount - liveSummary.qualifiedCount;
  const coverageLabel =
    policy.minCoverage === 0 ? 'No gate (0%)' : policy.minCoverage === 1 ? '> 0% verified' : `≥ ${policy.minCoverage}%`;

  return (
    <section className="dm-card !p-0 overflow-hidden" aria-labelledby="demand-waterfall-heading">
      {/* Header + Conversions-style Routing Goal Selector */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e2e8f0] px-6 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2
              id="demand-waterfall-heading"
              className="text-base font-semibold tracking-tight text-[#0f172a]"
            >
              {title}
            </h2>
            {isSimulated && (
              <span className="text-xs font-semibold text-[#1d4ed8]">
                · What-if simulation active
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[13px] text-[#64748b]">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            className="inline-flex flex-wrap items-center rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-0.5"
            role="group"
            aria-label="Primary routing goal"
          >
            {GOAL_STAGES.map((stageKey) => {
              const stageDef = DEMAND_WATERFALL_STAGES.find((s) => s.stage === stageKey)!;
              const isGoal = targetGoalStage === stageKey;
              return (
                <button
                  key={stageKey}
                  type="button"
                  aria-pressed={isGoal}
                  onClick={() => handleGoalSelect(stageKey)}
                  className={`whitespace-nowrap shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1d4ed8] ${
                    isGoal
                      ? 'bg-[#0f172a] text-white'
                      : 'text-[#475569] hover:text-[#0f172a]'
                  }`}
                >
                  {stageDef.goalLabel}
                </button>
              );
            })}
          </div>

          {showFullFunnelLink && onNavigateTab && (
            <button
              type="button"
              className="dm-text-button whitespace-nowrap shrink-0"
              onClick={() => onNavigateTab('FUNNEL')}
            >
              Open full funnel <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Two-Column Funnel + Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.72fr)_minmax(310px,1fr)]">
        {/* Left: Conversions-style Centered Trapezoid Waterfall with Policy Cutoff & Why Popover */}
        <div className="min-w-0 px-5 py-5 sm:px-6">
          <div
            className="grid grid-cols-[minmax(112px,1.05fr)_minmax(0,2.15fr)_minmax(116px,0.95fr)] items-center gap-3 px-2 pb-2.5 text-[11px] font-semibold text-[#64748b]"
            aria-hidden="true"
          >
            <span>Stage &amp; role</span>
            <span className="text-center">Account volume · % of tracked</span>
            <span className="text-right">Score &amp; detail</span>
          </div>

          <div className="grid gap-1.5" role="group" aria-label="Demand waterfall stages">
            {rows.map((row, index) => {
              const isSelected = row.stage === focused.stage;
              const isGoal = row.stage === targetGoalStage;
              const isWhyOpen = openWhyStage === row.stage;
              const top = stageWidth(index);
              const nextW = index + 1 < rows.length ? stageWidth(index + 1) : Math.max(60, top - 28);
              const bottom = Math.max(58, Math.min(top - 8, nextW));
              const hasVolume = row.count > 0;
              const prevRow = index > 0 ? rows[index - 1] : null;
              const fromPrev =
                prevRow && prevRow.count > 0 ? Math.round((row.count / prevRow.count) * 100) : null;

              return (
                <React.Fragment key={row.stage}>
                  {/* Dashed Policy & Coverage Cutoff Line mirroring Conversions' expiry cutoff */}
                  {row.stage === 'qualified_du' && (
                    <div
                      className="my-1.5 flex items-center gap-2.5 px-2"
                      role="separator"
                      aria-label={`Sales routing and coverage gate: composite at least ${policy.qualifyThreshold}, buying-group coverage ${coverageLabel}`}
                    >
                      <div className="h-px flex-1 border-t border-dashed border-[#d97706]" />
                      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[11px] font-semibold tabular-nums text-[#b45309]">
                        <span>
                          ROUTING &amp; COVERAGE GATE · SCORE ≥ {policy.qualifyThreshold} · COVERAGE{' '}
                          {coverageLabel.toUpperCase()}
                        </span>
                        {simSummary.heldAtGate > 0 && (
                          <span className="text-[#92400e]">
                            · {simSummary.heldAtGate} held by coverage
                          </span>
                        )}
                      </div>
                      <div className="h-px flex-1 border-t border-dashed border-[#d97706]" />
                    </div>
                  )}

                  <div
                    className={`rounded-lg border transition-colors ${
                      isSelected
                        ? 'border-[#93c5fd] bg-[#eff6ff]/60'
                        : isGoal
                          ? 'border-[#cbd5e1] bg-[#f8fafc]/70'
                          : 'border-transparent hover:border-[#e2e8f0] hover:bg-[#f8fafc]'
                    }`}
                  >
                    <div className="grid w-full grid-cols-[minmax(112px,1.05fr)_minmax(0,2.15fr)_minmax(116px,0.95fr)] items-center gap-3 px-2.5 py-1.5">
                      {/* Stage label button */}
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => handleStageSelect(row.stage)}
                        className="min-w-0 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4ed8]"
                      >
                        <span
                          className={`block truncate text-[13px] font-semibold ${
                            isSelected ? 'text-[#1d4ed8]' : 'text-[#0f172a]'
                          }`}
                        >
                          {row.label}
                        </span>
                        <span className="block truncate text-[11px] tabular-nums text-[#64748b]">
                          {row.exactCount.toLocaleString()} in stage
                          {isGoal && (
                            <span className="font-semibold text-[#059669]"> · Goal</span>
                          )}
                        </span>
                      </button>

                      {/* Centered SVG Trapezoid */}
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        aria-label={`${row.label}: ${row.count.toLocaleString()} accounts (${row.pctOfTop}% of tracked)`}
                        onClick={() => handleStageSelect(row.stage)}
                        className="w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4ed8]"
                      >
                        <svg
                          viewBox="0 0 360 52"
                          className="h-[48px] w-full select-none sm:h-[52px]"
                          aria-hidden="true"
                        >
                          <polygon
                            points={`${180 - top / 2},1 ${180 + top / 2},1 ${180 + bottom / 2},51 ${180 - bottom / 2},51`}
                            fill={!hasVolume ? '#e2e8f0' : isSelected ? row.activeColor : row.color}
                            stroke={isSelected ? '#0f172a' : isGoal ? '#059669' : 'none'}
                            strokeWidth={isSelected ? 1.5 : isGoal ? 1.25 : 0}
                          />
                          <text
                            x="180"
                            y={hasVolume ? '24' : '31'}
                            textAnchor="middle"
                            fill={!hasVolume ? '#64748b' : '#ffffff'}
                            fontSize="15.5"
                            fontWeight="700"
                            fontFamily="IBM Plex Mono, monospace"
                          >
                            {row.count.toLocaleString()}
                            {isSimulated && row.countDelta !== 0
                              ? ` (${row.countDelta > 0 ? '+' : ''}${row.countDelta})`
                              : ''}
                          </text>
                          {hasVolume && (
                            <text
                              x="180"
                              y="41"
                              textAnchor="middle"
                              fill="rgba(255,255,255,0.9)"
                              fontSize="10.5"
                              fontFamily="IBM Plex Mono, monospace"
                            >
                              {row.pctOfTop}% of tracked
                            </text>
                          )}
                        </svg>
                      </button>

                      {/* Right: Score, conversion % from prev, and interactive Why? trigger */}
                      <div className="flex flex-col items-end gap-0.5 text-right tabular-nums">
                        <div className="flex items-baseline gap-1">
                          <span className="text-[13px] font-semibold text-[#0f172a]">
                            {row.count > 0 ? row.avgScore : '—'}
                          </span>
                          {row.count > 0 && (
                            <span className="text-[11px] text-[#64748b]">/ 100</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-[#64748b]">
                          <span>
                            {index === 0
                              ? 'Baseline'
                              : fromPrev != null
                                ? `${fromPrev}% prev`
                                : '—'}
                          </span>
                          <button
                            type="button"
                            aria-expanded={isWhyOpen}
                            onClick={() => {
                              handleStageSelect(row.stage);
                              setOpenWhyStage(isWhyOpen ? null : row.stage);
                            }}
                            className={`inline-flex items-center gap-0.5 font-semibold transition-colors ${
                              isWhyOpen
                                ? 'text-[#0f172a]'
                                : 'text-[#1d4ed8] hover:text-[#1e40af]'
                            }`}
                          >
                            {isWhyOpen ? (
                              <>
                                Close <X size={11} />
                              </>
                            ) : (
                              <>
                                Why? <ChevronDown size={11} />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Anchored inline "Why this stage matters" breakdown (Conversions-style popover) */}
                    {isWhyOpen && (
                      <div
                        className="mx-2.5 mb-2.5 rounded-lg border border-[#cbd5e1] bg-white p-3.5 text-xs"
                        role="region"
                        aria-label={`${row.label} scoring explanation`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[#0f172a]">{row.whyTitle}</p>
                            <p className="mt-1 leading-relaxed text-[#475569]">{row.whyBody}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setOpenWhyStage(null)}
                            className="shrink-0 text-[#64748b] hover:text-[#0f172a]"
                            aria-label="Close stage explanation"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-3 border-t border-[#e2e8f0] pt-3 sm:grid-cols-3 tabular-nums">
                          <div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-[#64748b]">Avg ICP fit</span>
                              <span className="font-semibold text-[#0f172a]">{row.avgFit}</span>
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#e2e8f0]">
                              <div
                                className="h-full bg-[#334155]"
                                style={{ width: `${Math.min(100, row.avgFit)}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-[#64748b]">Avg intent</span>
                              <span className="font-semibold text-[#0f172a]">{row.avgIntent}</span>
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#e2e8f0]">
                              <div
                                className="h-full bg-[#0284c7]"
                                style={{ width: `${Math.min(100, row.avgIntent)}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-[#64748b]">Avg coverage</span>
                              <span className="font-semibold text-[#0f172a]">
                                {row.avgCoverage}%
                              </span>
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#e2e8f0]">
                              <div
                                className="h-full bg-[#059669]"
                                style={{ width: `${Math.min(100, row.avgCoverage)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#f1f5f9] pt-2.5 text-[11px]">
                          <span className="text-[#475569]">
                            <strong className="text-[#0f172a]">Gate:</strong> {row.gateRule}
                          </span>
                          {onNavigateTab && (
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                className="font-semibold text-[#1d4ed8] hover:underline"
                                onClick={() => onNavigateTab('RULES')}
                              >
                                Scoring rules →
                              </button>
                              <button
                                type="button"
                                className="font-semibold text-[#0f172a] hover:underline"
                                onClick={() => onNavigateTab('ACCOUNTS')}
                              >
                                View accounts →
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          <p className="dm-caption mt-4 tabular-nums">
            Width reflects cumulative accounts at each stage or later across{' '}
            {accounts.length.toLocaleString()} tracked units. Click any tier or{' '}
            <strong className="font-semibold text-[#0f172a]">Why?</strong> to inspect its score
            drivers.
          </p>
        </div>

        {/* Right: Conversions-style Selected Stage Inspector */}
        <aside
          className="flex flex-col justify-between gap-5 border-t border-[#e2e8f0] bg-[#f8fafc]/70 p-6 lg:border-l lg:border-t-0"
          aria-label="Selected funnel stage inspector"
        >
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-[#64748b] tabular-nums">
                {focused.routingRole} · {focused.pctOfTop}% of tracked
              </p>
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <h3 className="text-lg font-semibold tracking-tight text-[#0f172a]">
                  {focused.label}
                </h3>
                {focused.stage === targetGoalStage && (
                  <span className="text-xs font-semibold text-[#059669]">Primary goal</span>
                )}
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-[#475569]">
                {focused.description}
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-[#e2e8f0] py-3.5 tabular-nums">
              <div>
                <dt className="text-xs text-[#64748b]">Stage or later</dt>
                <dd className="mt-0.5 flex items-baseline gap-1.5 text-lg font-semibold text-[#0f172a]">
                  <span>{focused.count.toLocaleString()}</span>
                  {isSimulated && focused.countDelta !== 0 && (
                    <span
                      className={`text-xs font-semibold ${
                        focused.countDelta > 0 ? 'text-[#15803d]' : 'text-[#b45309]'
                      }`}
                    >
                      {focused.countDelta > 0 ? `+${focused.countDelta}` : focused.countDelta}
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#64748b]">In exact stage</dt>
                <dd className="mt-0.5 text-lg font-semibold text-[#0f172a]">
                  {focused.exactCount.toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#64748b]">Avg composite</dt>
                <dd className="mt-0.5 text-sm font-semibold text-[#0f172a]">
                  {focused.count > 0 ? `${focused.avgScore} / 100` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#64748b]">From prior stage</dt>
                <dd className="mt-0.5 text-sm font-semibold text-[#0f172a]">
                  {stepShare != null ? `${stepShare}%` : 'Baseline'}
                </dd>
              </div>
            </dl>

            {/* Stage Score Component Drivers (Fit / Intent / Coverage) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#0f172a]">Stage score profile</span>
                <span className="text-[11px] tabular-nums text-[#64748b]">
                  {normalized.fitPct}/{normalized.intentPct}/{normalized.coveragePct} weights
                </span>
              </div>
              {[
                { label: 'ICP fit', value: focused.avgFit, color: '#334155', suffix: '/100' },
                { label: 'Intent & signal', value: focused.avgIntent, color: '#0284c7', suffix: '/100' },
                {
                  label: 'Committee coverage',
                  value: focused.avgCoverage,
                  color: '#059669',
                  suffix: '%',
                },
              ].map((bar) => (
                <div key={bar.label} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] tabular-nums">
                    <span className="text-[#475569]">{bar.label}</span>
                    <span className="font-semibold text-[#0f172a]">
                      {focused.count > 0 ? `${bar.value}${bar.suffix}` : '—'}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e2e8f0]">
                    <div
                      className="h-full transition-all duration-200"
                      style={{
                        width: `${focused.count > 0 ? Math.min(100, bar.value) : 0}%`,
                        backgroundColor: bar.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {focused.coverageHolds > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-xs text-[#92400e]">
                <ShieldAlert size={14} className="mt-0.5 shrink-0 text-[#b45309]" />
                <p className="tabular-nums">
                  <strong>{focused.coverageHolds}</strong>{' '}
                  {focused.coverageHolds === 1 ? 'account is' : 'accounts are'} below the{' '}
                  {coverageLabel} buying-group coverage gate.
                </p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#0f172a]">
                  {focused.exactAccounts.length > 0
                    ? `Top accounts in ${focused.shortCode}`
                    : `Top accounts at ${focused.shortCode} or later`}
                </span>
                <span className="text-[#64748b]">Cov · Score</span>
              </div>

              {previewAccounts.length > 0 ? (
                <div className="mt-2 divide-y divide-[#e2e8f0] rounded-lg border border-[#e2e8f0] bg-white">
                  {previewAccounts.map((item) => (
                    <button
                      key={item.account.id}
                      type="button"
                      onClick={() => onSelectAccount(item.account)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-xs transition-colors hover:bg-[#f8fafc]"
                    >
                      <div className="min-w-0">
                        <span className="block truncate font-semibold text-[#0f172a]">
                          {item.account.accountName}
                        </span>
                        <span className="block truncate text-[11px] text-[#64748b]">
                          {item.account.solutionTarget}
                        </span>
                      </div>
                      <div className="shrink-0 text-right tabular-nums">
                        <span className="font-semibold text-[#1d4ed8]">{item.score}</span>
                        <span className="ml-1.5 text-[11px] text-[#64748b]">
                          {item.coverage}%
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-[#64748b]">
                  No accounts currently recorded at this stage.
                </p>
              )}
            </div>
          </div>

          {onNavigateTab && (
            <div className="flex flex-wrap items-center gap-2 border-t border-[#e2e8f0] pt-4">
              <button
                type="button"
                className="dm-button dm-button-primary flex-1"
                onClick={() => onNavigateTab('DEMAND_UNITS')}
              >
                Inspect demand scoring
              </button>
              <button
                type="button"
                className="dm-button"
                onClick={() => onNavigateTab('ACCOUNTS')}
              >
                Account matrix
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* Bottom: Conversions-style Interactive Account Scoring & Threshold Simulator */}
      {enableScoringControls && (
        <div
          className="border-t border-[#e2e8f0] bg-[#f8fafc]/80 px-6 py-5"
          aria-label="Account scoring and qualification simulator"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={15} className="text-[#1d4ed8]" />
              <div>
                <h3 className="text-sm font-semibold text-[#0f172a]">
                  Account Scoring &amp; Gate Simulator
                </h3>
                <p className="text-xs text-[#64748b] tabular-nums">
                  Active model: Fit {normalized.fitPct}% · Intent {normalized.intentPct}% · Coverage{' '}
                  {normalized.coveragePct}% — adjust gates to model pipeline qualification live.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div
                className="inline-flex flex-wrap items-center rounded-lg border border-[#e2e8f0] bg-white p-0.5"
                role="group"
                aria-label="Scoring policy presets"
              >
                {presets.map((preset) => {
                  const selected = activePreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => handlePresetSelect(preset)}
                      className={`whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        selected
                          ? 'bg-[#1d4ed8] text-white'
                          : 'text-[#475569] hover:text-[#0f172a]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {isSimulated && (
                <button
                  type="button"
                  onClick={resetToLive}
                  className="inline-flex items-center gap-1 rounded-md border border-[#cbd5e1] bg-white px-2.5 py-1.5 text-xs font-medium text-[#334155] transition-colors hover:border-[#94a3b8] hover:text-[#0f172a]"
                >
                  <RotateCcw size={12} /> Reset
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            {/* Left: Interactive Sliders */}
            <div className="grid gap-4 rounded-lg border border-[#e2e8f0] bg-white p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <div className="flex items-center justify-between text-xs tabular-nums">
                    <span className="font-medium text-[#334155]">
                      Qualification score threshold
                    </span>
                    <strong className="font-semibold text-[#0f172a]">
                      {policy.qualifyThreshold} / 100
                    </strong>
                  </div>
                  <input
                    type="range"
                    min={45}
                    max={90}
                    step={1}
                    value={policy.qualifyThreshold}
                    onChange={(e) => updatePolicy({ qualifyThreshold: Number(e.target.value) })}
                    className="mt-2 h-1.5 w-full cursor-pointer accent-[#1d4ed8]"
                  />
                  <div className="mt-1 flex justify-between text-[11px] tabular-nums text-[#64748b]">
                    <span>45 (broader)</span>
                    <span>70 live</span>
                    <span>90 (strict)</span>
                  </div>
                </label>

                <label className="block">
                  <div className="flex items-center justify-between text-xs tabular-nums">
                    <span className="font-medium text-[#334155]">
                      Minimum buying-group coverage
                    </span>
                    <strong className="font-semibold text-[#0f172a]">{coverageLabel}</strong>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={75}
                    step={5}
                    value={policy.minCoverage === 1 ? 5 : policy.minCoverage}
                    onChange={(e) => updatePolicy({ minCoverage: Number(e.target.value) })}
                    className="mt-2 h-1.5 w-full cursor-pointer accent-[#059669]"
                  />
                  <div className="mt-1 flex justify-between text-[11px] tabular-nums text-[#64748b]">
                    <span>0% (no gate)</span>
                    <span>25%</span>
                    <span>75% (deep committee)</span>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 border-t border-[#f1f5f9] pt-3.5 sm:grid-cols-3">
                <label className="block">
                  <div className="flex items-center justify-between text-xs tabular-nums">
                    <span className="text-[#475569]">ICP fit weight</span>
                    <strong className="font-semibold text-[#0f172a]">
                      {normalized.fitPct}%
                    </strong>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={60}
                    step={5}
                    value={policy.fitWeight}
                    onChange={(e) => updatePolicy({ fitWeight: Number(e.target.value) })}
                    className="mt-1.5 h-1.5 w-full cursor-pointer accent-[#334155]"
                  />
                </label>

                <label className="block">
                  <div className="flex items-center justify-between text-xs tabular-nums">
                    <span className="text-[#475569]">Intent weight</span>
                    <strong className="font-semibold text-[#0f172a]">
                      {normalized.intentPct}%
                    </strong>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={70}
                    step={5}
                    value={policy.intentWeight}
                    onChange={(e) => updatePolicy({ intentWeight: Number(e.target.value) })}
                    className="mt-1.5 h-1.5 w-full cursor-pointer accent-[#0284c7]"
                  />
                </label>

                <label className="block">
                  <div className="flex items-center justify-between text-xs tabular-nums">
                    <span className="text-[#475569]">Coverage weight</span>
                    <strong className="font-semibold text-[#0f172a]">
                      {normalized.coveragePct}%
                    </strong>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={60}
                    step={5}
                    value={policy.coverageWeight}
                    onChange={(e) => updatePolicy({ coverageWeight: Number(e.target.value) })}
                    className="mt-1.5 h-1.5 w-full cursor-pointer accent-[#059669]"
                  />
                </label>
              </div>
            </div>

            {/* Right: 3-Column Baseline vs. Simulated Pipeline Comparison */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col justify-between rounded-lg border border-[#e2e8f0] bg-white p-3.5 tabular-nums">
                <div>
                  <span className="text-[11px] font-semibold text-[#64748b]">
                    Current baseline
                  </span>
                  <div className="mt-1.5 text-xl font-bold text-[#0f172a]">
                    {liveSummary.qualifiedCount.toLocaleString()}
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#64748b]">
                    Qualified or later ({liveSummary.qualifiedShare}%)
                  </p>
                </div>
                <p className="mt-3 border-t border-[#f1f5f9] pt-2 text-[11px] text-[#475569]">
                  Avg score <strong>{liveSummary.avgQualifiedScore}</strong> ·{' '}
                  {liveSummary.totalCoverageHolds} holds
                </p>
              </div>

              <div
                className={`flex flex-col justify-between rounded-lg border p-3.5 tabular-nums ${
                  isSimulated
                    ? 'border-[#93c5fd] bg-[#eff6ff]/70'
                    : 'border-[#e2e8f0] bg-white'
                }`}
              >
                <div>
                  <span className="text-[11px] font-semibold text-[#1d4ed8]">
                    {isSimulated ? 'Simulated outcome' : 'Active policy'}
                  </span>
                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="text-xl font-bold text-[#0f172a]">
                      {simSummary.qualifiedCount.toLocaleString()}
                    </span>
                    {isSimulated && (
                      <span
                        className={`text-xs font-semibold ${
                          qualifiedDelta > 0
                            ? 'text-[#15803d]'
                            : qualifiedDelta < 0
                              ? 'text-[#b45309]'
                              : 'text-[#64748b]'
                        }`}
                      >
                        {qualifiedDelta > 0
                          ? `+${qualifiedDelta}`
                          : qualifiedDelta < 0
                            ? `${qualifiedDelta}`
                            : '0'}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#475569]">
                    Qualified or later ({simSummary.qualifiedShare}%)
                  </p>
                </div>
                <p className="mt-3 border-t border-[#e2e8f0]/80 pt-2 text-[11px] text-[#475569]">
                  Avg score <strong>{simSummary.avgQualifiedScore}</strong> · gate ≥{' '}
                  {policy.qualifyThreshold}
                </p>
              </div>

              <div className="flex flex-col justify-between rounded-lg border border-[#e2e8f0] bg-white p-3.5 tabular-nums">
                <div>
                  <span className="text-[11px] font-semibold text-[#64748b]">
                    {simSummary.qualifiedValue > 0 ? 'Qualified pipeline' : 'Gate impact'}
                  </span>
                  <div className="mt-1.5 text-xl font-bold text-[#0f172a]">
                    {simSummary.qualifiedValue > 0
                      ? formatCompactCurrency(simSummary.qualifiedValue)
                      : `${simSummary.heldAtGate.toLocaleString()} held`}
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#64748b]">
                    {simSummary.qualifiedValue > 0
                      ? `${simSummary.heldAtGate} high-score holds at gate`
                      : 'High-score units awaiting coverage'}
                  </p>
                </div>
                {onNavigateTab ? (
                  <button
                    type="button"
                    onClick={() => onNavigateTab('RULES')}
                    className="mt-3 inline-flex items-center gap-1 border-t border-[#f1f5f9] pt-2 text-left text-[11px] font-semibold text-[#1d4ed8] hover:underline"
                  >
                    Configure live rules <ArrowRight size={12} />
                  </button>
                ) : (
                  <p className="mt-3 border-t border-[#f1f5f9] pt-2 text-[11px] text-[#475569]">
                    {simSummary.totalCoverageHolds} total coverage holds
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
