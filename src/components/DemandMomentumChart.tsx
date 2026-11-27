import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Cell,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';
import { ArrowRight } from 'lucide-react';
import { AccountDemandUnit, ActiveNavTab, TelemetrySignal } from '../types';
import { fetchScoreHistory, ScoreSnapshot } from '../services/api';

interface DemandMomentumChartProps {
  accounts: AccountDemandUnit[];
  signals: TelemetrySignal[];
  onNavigateTab: (tab: ActiveNavTab) => void;
}

type SeriesView = 'combined' | 'score' | 'signals';

interface MomentumPoint {
  dateKey: string;
  label: string;
  fullDate: string;
  signals: number;
  surgeSignals: number;
  avgScore: number;
  dayDelta: number;
  isHighIntensity: boolean;
  isSignificantScoreIncrease: boolean;
  topSignalTitle?: string;
  topAccountName?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const SCORE_TARGET_THRESHOLD = 75;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseTimestamp(raw?: string | null, now = new Date()): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^just now$/i.test(trimmed)) return now;

  const relMatch = trimmed.match(/^(\d+)\s*(m|min|mins|h|hr|hrs|d|day|days)\s*ago$/i);
  if (relMatch) {
    const amount = Number(relMatch[1]);
    const unit = relMatch[2].toLowerCase();
    const offsetMs = unit.startsWith('m')
      ? amount * 60 * 1000
      : unit.startsWith('h')
        ? amount * 60 * 60 * 1000
        : amount * DAY_MS;
    return new Date(now.getTime() - offsetMs);
  }

  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: MomentumPoint }>;
  seriesView: SeriesView;
  intensityThreshold: number;
}

const MomentumTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  seriesView,
  intensityThreshold,
}) => {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0].payload;
  const showScore = seriesView === 'combined' || seriesView === 'score';
  const showSignals = seriesView === 'combined' || seriesView === 'signals';

  const hasAlerts =
    (showSignals && point.isHighIntensity) || (showScore && point.isSignificantScoreIncrease);

  return (
    <div className="max-w-[285px] rounded-lg border border-[#e2e8f0] bg-white px-3.5 py-3 text-xs shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <p className="font-semibold text-[#0f172a]">{point.fullDate}</p>
        {showSignals && point.isHighIntensity && (
          <span className="font-semibold text-[#b45309]">High Intensity</span>
        )}
      </div>

      <div className="mt-2 space-y-1.5 tabular-nums">
        {showScore && (
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-[#475569]">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  point.isSignificantScoreIncrease ? 'bg-[#15803d]' : 'bg-[#1d4ed8]'
                }`}
                aria-hidden="true"
              />
              Avg account score
            </span>
            <span className="font-semibold text-[#0f172a]">
              {point.avgScore.toFixed(1)} / 100
              {point.dayDelta !== 0 && (
                <span
                  className={`ml-1.5 font-semibold ${
                    point.dayDelta > 0 ? 'text-[#15803d]' : 'text-[#b91c1c]'
                  }`}
                >
                  {point.dayDelta > 0 ? `+${point.dayDelta.toFixed(1)}` : point.dayDelta.toFixed(1)}
                </span>
              )}
            </span>
          </div>
        )}

        {showSignals && (
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-[#475569]">
              <span
                className={`inline-block h-2 w-2 rounded-xs ${
                  point.isHighIntensity ? 'bg-[#f59e0b]' : 'bg-[#93c5fd]'
                }`}
                aria-hidden="true"
              />
              Telemetry signals
            </span>
            <strong className="font-semibold text-[#0f172a]">
              {point.signals.toLocaleString()}
              {point.surgeSignals > 0 ? (
                <span className="ml-1 font-medium text-[#b45309]">
                  ({point.surgeSignals} surge)
                </span>
              ) : null}
            </strong>
          </div>
        )}
      </div>

      {hasAlerts && (
        <div className="mt-2.5 space-y-2 border-t border-[#f1f5f9] pt-2">
          {showSignals && point.isHighIntensity && (
            <div>
              <p className="font-semibold text-[#b45309]">High Intensity telemetry peak</p>
              <p className="mt-0.5 leading-relaxed text-[#64748b] tabular-nums">
                {point.surgeSignals > 0
                  ? `${point.surgeSignals} surge/critical ${point.surgeSignals === 1 ? 'signal' : 'signals'} (${point.signals} total vs ${intensityThreshold}/day threshold).`
                  : `${point.signals} signals exceeded the ${intensityThreshold}/day High Intensity threshold.`}
              </p>
              {point.topSignalTitle && (
                <p className="mt-0.5 truncate text-[#475569]">
                  Driver: {point.topSignalTitle.replaceAll('_', ' ')}
                </p>
              )}
            </div>
          )}

          {showScore && point.isSignificantScoreIncrease && (
            <div>
              <p className="font-semibold text-[#15803d]">Significant account score increase</p>
              <p className="mt-0.5 leading-relaxed text-[#64748b] tabular-nums">
                Average composite score climbed +{point.dayDelta.toFixed(1)} pts day-over-day
                {point.topAccountName ? ` led by ${point.topAccountName}` : ''}.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const DemandMomentumChart: React.FC<DemandMomentumChartProps> = ({
  accounts,
  signals,
  onNavigateTab,
}) => {
  const [seriesView, setSeriesView] = useState<SeriesView>('combined');
  const [historyByAccount, setHistoryByAccount] = useState<Record<string, ScoreSnapshot[]>>({});

  // Fetch recorded score history snapshots for top tracked accounts when available
  const topAccountIdsKey = useMemo(
    () =>
      [...accounts]
        .sort((a, b) => b.compositeScore - a.compositeScore)
        .slice(0, 6)
        .map((a) => a.id)
        .join(','),
    [accounts]
  );

  useEffect(() => {
    const ids = topAccountIdsKey ? topAccountIdsKey.split(',') : [];
    if (!ids.length) {
      setHistoryByAccount({});
      return;
    }

    let active = true;
    Promise.allSettled(
      ids.map(async (id) => ({
        id,
        snapshots: await fetchScoreHistory(id),
      }))
    ).then((results) => {
      if (!active) return;
      const next: Record<string, ScoreSnapshot[]> = {};
      for (const res of results) {
        if (res.status === 'fulfilled' && res.value.snapshots.length > 0) {
          next[res.value.id] = res.value.snapshots;
        }
      }
      setHistoryByAccount(next);
    });

    return () => {
      active = false;
    };
  }, [topAccountIdsKey]);

  const {
    data,
    totalSignals,
    currentAvgScore,
    avgDelta7d,
    windowLabel,
    intensityThreshold,
    highIntensityDays,
    scoreJumpDays,
    dataSourceNote,
  } = useMemo(() => {
    const now = new Date();
    const parsedSignals = signals
      .map((sig) => ({
        signal: sig,
        date: parseTimestamp(sig.timestamp, now),
      }))
      .filter((entry): entry is { signal: TelemetrySignal; date: Date } => entry.date !== null);

    const latestSignalTime = parsedSignals.reduce(
      (max, entry) => Math.max(max, entry.date.getTime()),
      0
    );

    const sevenDaysAgo = startOfDay(now).getTime() - 6 * DAY_MS;
    const anchorDate =
      latestSignalTime > 0 && latestSignalTime < sevenDaysAgo
        ? startOfDay(new Date(latestSignalTime))
        : startOfDay(now);

    const days: Date[] = Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(anchorDate);
      d.setDate(anchorDate.getDate() - (6 - idx));
      return d;
    });

    const buckets = new Map<
      string,
      { signals: number; surgeSignals: number; topSignalTitle?: string; topAccountName?: string }
    >();
    for (const day of days) {
      buckets.set(toDateKey(day), { signals: 0, surgeSignals: 0 });
    }

    for (const { signal, date } of parsedSignals) {
      const key = toDateKey(startOfDay(date));
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.signals += 1;
        const isSurge = signal.severity === 'CRITICAL' || signal.severity === 'SURGE';
        if (isSurge) {
          bucket.surgeSignals += 1;
          bucket.topSignalTitle = signal.title;
          bucket.topAccountName = signal.accountName;
        } else if (!bucket.topSignalTitle) {
          bucket.topSignalTitle = signal.title;
          bucket.topAccountName = signal.accountName;
        }
      }
    }

    const avgCurrent =
      accounts.length > 0
        ? accounts.reduce((sum, a) => sum + (Number(a.compositeScore) || 0), 0) / accounts.length
        : 0;

    const dailyCounts = days.map((day) => buckets.get(toDateKey(day))?.signals ?? 0);
    const totalWindowSignals = dailyCounts.reduce((sum, count) => sum + count, 0);
    const avgDailySignals = totalWindowSignals / 7;
    const computedIntensityThreshold = Math.max(2, Math.ceil(avgDailySignals * 1.35));

    // Check whether recorded multi-day score history exists from the backend
    const snapshotEntries = Object.entries(historyByAccount).filter(
      ([, snaps]) => snaps.length >= 2
    );
    const hasRecordedHistory = snapshotEntries.length > 0;

    // Fallback delta: use explicit scoreDelta7d when available, or infer observed intent lift from 7d signal cadence
    const explicitAvgDelta =
      accounts.length > 0
        ? accounts.reduce((sum, a) => sum + (Number(a.scoreDelta7d) || 0), 0) / accounts.length
        : 0;

    const avgIntentContribution =
      accounts.length > 0
        ? accounts.reduce(
            (sum, a) => sum + (Number(a.scoreAudit?.intent ?? a.scores.intentSurge) || 0) * 0.4,
            0
          ) / accounts.length
        : 0;

    const inferredSignalLift =
      Math.abs(explicitAvgDelta) < 0.05 && totalWindowSignals > 0 && avgIntentContribution > 0
        ? Math.min(avgIntentContribution * 0.35, Math.max(2, totalWindowSignals * 0.6))
        : 0;

    const effectiveDelta = Math.abs(explicitAvgDelta) >= 0.05 ? explicitAvgDelta : inferredSignalLift;
    const startScore = Math.max(0, Math.min(100, avgCurrent - effectiveDelta));

    const totalWeight = dailyCounts.reduce(
      (sum, count) => sum + (totalWindowSignals > 0 ? count + 0.5 : 1),
      0
    );

    const shortFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
    const fullFmt = new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    const topAccountOverall = [...accounts].sort(
      (a, b) => (b.scoreDelta7d || b.compositeScore) - (a.scoreDelta7d || a.compositeScore)
    )[0]?.accountName;

    let cumulativeWeight = 0;

    const points: MomentumPoint[] = days.map((day, idx) => {
      const key = toDateKey(day);
      const dayEndMs = day.getTime() + DAY_MS - 1;
      const bucket = buckets.get(key) || { signals: 0, surgeSignals: 0 };

      let score = avgCurrent;
      if (hasRecordedHistory && accounts.length > 0) {
        const dayScores: number[] = [];
        for (const [, snaps] of snapshotEntries) {
          const sorted = [...snaps].sort(
            (a, b) => Date.parse(a.scored_at) - Date.parse(b.scored_at)
          );
          let latest: ScoreSnapshot | null = null;
          for (const snap of sorted) {
            const t = Date.parse(snap.scored_at);
            if (!Number.isNaN(t) && t <= dayEndMs) latest = snap;
          }
          if (latest) dayScores.push(latest.composite_score);
          else if (sorted[0]) dayScores.push(sorted[0].composite_score);
        }
        if (dayScores.length > 0) {
          score = dayScores.reduce((s, v) => s + v, 0) / dayScores.length;
        }
      } else if (accounts.length > 0) {
        if (idx === 0) {
          score = startScore;
        } else if (idx === days.length - 1) {
          score = avgCurrent;
        } else {
          const dayWeight = totalWindowSignals > 0 ? bucket.signals + 0.5 : 1;
          cumulativeWeight += dayWeight;
          const progress = totalWeight > 0 ? cumulativeWeight / totalWeight : idx / 6;
          score = Math.max(0, Math.min(100, startScore + effectiveDelta * progress));
        }
      }

      const roundedScore = Math.round(score * 10) / 10;
      const isHighIntensity =
        bucket.signals > 0 &&
        (bucket.surgeSignals > 0 || bucket.signals >= computedIntensityThreshold);

      return {
        dateKey: key,
        label: shortFmt.format(day),
        fullDate: fullFmt.format(day),
        signals: bucket.signals,
        surgeSignals: bucket.surgeSignals,
        avgScore: roundedScore,
        dayDelta: 0,
        isHighIntensity,
        isSignificantScoreIncrease: false,
        topSignalTitle: bucket.topSignalTitle,
        topAccountName: bucket.topAccountName || topAccountOverall,
      };
    });

    let maxPositiveDelta = 0;
    let maxPositiveIdx = -1;
    for (let i = 1; i < points.length; i++) {
      const delta = Math.round((points[i].avgScore - points[i - 1].avgScore) * 10) / 10;
      points[i].dayDelta = delta;
      if (delta > maxPositiveDelta) {
        maxPositiveDelta = delta;
        maxPositiveIdx = i;
      }
    }

    const netDelta7d =
      points.length >= 2
        ? Math.round((points[points.length - 1].avgScore - points[0].avgScore) * 10) / 10
        : 0;

    const scoreJumpCutoff = Math.max(1.5, Math.round((Math.max(netDelta7d, 0) / 3.5) * 10) / 10);
    let anyJumpFlagged = false;
    for (let i = 1; i < points.length; i++) {
      if (points[i].dayDelta >= scoreJumpCutoff) {
        points[i].isSignificantScoreIncrease = true;
        anyJumpFlagged = true;
      }
    }
    if (!anyJumpFlagged && maxPositiveIdx >= 1 && maxPositiveDelta >= 0.8) {
      points[maxPositiveIdx].isSignificantScoreIncrease = true;
    }

    const flaggedIntensity = points.filter((p) => p.isHighIntensity);
    const flaggedScoreJumps = points.filter((p) => p.isSignificantScoreIncrease);
    const rangeText = `${shortFmt.format(days[0])} – ${shortFmt.format(days[days.length - 1])}`;

    const note = hasRecordedHistory
      ? 'Score line uses recorded multi-day score snapshots; reference lines mark High Intensity telemetry peaks and significant day-over-day score increases.'
      : Math.abs(explicitAvgDelta) >= 0.05
        ? 'Reference lines mark the High Intensity signal threshold, telemetry peaks, and significant day-over-day account score increases.'
        : inferredSignalLift > 0
          ? 'Score trajectory estimates 7-day intent lift across recorded signal days; reference lines mark High Intensity peaks and significant score increases.'
          : 'Dashed reference lines mark the High Intensity signal threshold and the 75-point qualification score benchmark.';

    return {
      data: points,
      totalSignals: totalWindowSignals,
      currentAvgScore: Math.round(avgCurrent * 10) / 10,
      avgDelta7d: netDelta7d,
      windowLabel: rangeText,
      intensityThreshold: computedIntensityThreshold,
      highIntensityDays: flaggedIntensity,
      scoreJumpDays: flaggedScoreJumps,
      dataSourceNote: note,
    };
  }, [accounts, signals, historyByAccount]);

  const isEmpty = accounts.length === 0 && signals.length === 0;
  const maxSignals = Math.max(...data.map((d) => d.signals), intensityThreshold + 1, 4);
  const showScore = seriesView === 'combined' || seriesView === 'score';
  const showSignals = seriesView === 'combined' || seriesView === 'signals';

  // Build deduplicated vertical marker lines so overlapping peak + jump labels never collide
  const verticalMarkers = useMemo(() => {
    const markers: Array<{
      label: string;
      tag: string;
      color: string;
    }> = [];

    for (const point of data) {
      const markIntensity = showSignals && point.isHighIntensity;
      const markJump = showScore && point.isSignificantScoreIncrease;
      if (markIntensity && markJump) {
        markers.push({
          label: point.label,
          tag: `High Intensity · +${point.dayDelta.toFixed(1)}`,
          color: '#b45309',
        });
      } else if (markJump) {
        markers.push({
          label: point.label,
          tag: `Score +${point.dayDelta.toFixed(1)}`,
          color: '#15803d',
        });
      } else if (markIntensity) {
        markers.push({
          label: point.label,
          tag: 'High Intensity',
          color: '#b45309',
        });
      }
    }
    return markers;
  }, [data, showScore, showSignals]);

  const deltaTone =
    avgDelta7d > 0 ? 'text-[#15803d]' : avgDelta7d < 0 ? 'text-[#b91c1c]' : 'text-[#64748b]';
  const deltaText =
    avgDelta7d > 0
      ? `+${avgDelta7d.toFixed(1)} pts`
      : avgDelta7d < 0
        ? `${avgDelta7d.toFixed(1)} pts`
        : '0.0 pts';

  return (
    <section className="dm-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-[#0f172a]">
            7-day demand momentum
          </h2>
          <p className="mt-1 text-[13px] text-[#64748b]">
            Daily telemetry signal volume alongside average composite account score ({windowLabel}).
          </p>
        </div>

        <div
          role="group"
          aria-label="Momentum series filter"
          className="inline-flex items-center gap-1 rounded-lg bg-[#f1f5f9] p-1"
        >
          {(
            [
              ['combined', 'Combined'],
              ['score', 'Account score'],
              ['signals', 'Signals'],
            ] as const
          ).map(([mode, label]) => {
            const active = seriesView === mode;
            return (
              <button
                key={mode}
                type="button"
                aria-pressed={active}
                onClick={() => setSeriesView(mode)}
                className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-white text-[#0f172a] shadow-xs'
                    : 'text-[#64748b] hover:text-[#0f172a]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {isEmpty ? (
        <div className="dm-empty mt-4 flex flex-col items-center gap-3 rounded-lg border border-dashed border-[#e2e8f0] py-10">
          <p>No telemetry signals or scored accounts recorded in the last 7 days.</p>
          <button
            type="button"
            className="dm-button dm-button-primary"
            onClick={() => onNavigateTab('SIMULATOR')}
          >
            Import historical activity <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-baseline gap-x-8 gap-y-3 border-y border-[#f1f5f9] py-3.5 text-sm">
            <div>
              <span className="text-xs text-[#64748b]">Avg composite score</span>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-[#0f172a]">
                {currentAvgScore.toFixed(1)}
                <span className="text-xs font-normal text-[#64748b]"> / 100</span>
              </p>
            </div>
            <div>
              <span className="text-xs text-[#64748b]">7-day score change</span>
              <p className={`mt-0.5 text-lg font-semibold tabular-nums ${deltaTone}`}>
                {deltaText}
              </p>
            </div>
            <div>
              <span className="text-xs text-[#64748b]">Telemetry signals (7d)</span>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-[#0f172a]">
                {totalSignals.toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-xs text-[#64748b]">High Intensity peaks</span>
              <p
                className={`mt-0.5 text-lg font-semibold tabular-nums ${
                  highIntensityDays.length > 0 ? 'text-[#b45309]' : 'text-[#64748b]'
                }`}
              >
                {highIntensityDays.length}
                <span className="ml-1 text-xs font-normal text-[#64748b]">
                  {highIntensityDays.length === 1 ? 'day' : 'days'}
                </span>
              </p>
            </div>

            <div className="ml-auto hidden flex-wrap items-center gap-x-5 gap-y-1 text-xs text-[#64748b] xl:flex">
              {showScore && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-3.5 bg-[#1d4ed8]" aria-hidden="true" />
                  Avg score
                </span>
              )}
              {showScore && (
                <span className="inline-flex items-center gap-1.5 text-[#15803d]">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#15803d]" aria-hidden="true" />
                  Score increase
                </span>
              )}
              {showSignals && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-xs bg-[#bfdbfe]" aria-hidden="true" />
                  Signals
                </span>
              )}
              {showSignals && (
                <span className="inline-flex items-center gap-1.5 text-[#b45309]">
                  <span className="inline-block h-2.5 w-2.5 rounded-xs bg-[#f59e0b]" aria-hidden="true" />
                  High Intensity (≥{intensityThreshold}/day)
                </span>
              )}
            </div>
          </div>

          <div className="mt-5 h-[288px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 28, right: 16, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="dmScoreFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1d4ed8" stopOpacity={0.14} />
                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={8}
                />
                {showSignals && (
                  <YAxis
                    yAxisId="signals"
                    orientation="left"
                    allowDecimals={false}
                    domain={[0, Math.ceil(maxSignals * 1.25)]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    width={42}
                  />
                )}
                {showScore && (
                  <YAxis
                    yAxisId="score"
                    orientation={seriesView === 'score' ? 'left' : 'right'}
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    width={42}
                  />
                )}

                {showSignals && (
                  <ReferenceLine
                    yAxisId="signals"
                    y={intensityThreshold}
                    stroke="#d97706"
                    strokeDasharray="4 4"
                    strokeOpacity={0.7}
                    label={{
                      value: `High Intensity (≥${intensityThreshold})`,
                      position: 'insideTopLeft',
                      fill: '#b45309',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  />
                )}

                {showScore && (
                  <ReferenceLine
                    yAxisId="score"
                    y={SCORE_TARGET_THRESHOLD}
                    stroke="#15803d"
                    strokeDasharray="4 4"
                    strokeOpacity={0.45}
                    label={{
                      value: `Score target (${SCORE_TARGET_THRESHOLD})`,
                      position: 'insideTopRight',
                      fill: '#15803d',
                      fontSize: 11,
                      fontWeight: 500,
                    }}
                  />
                )}

                {verticalMarkers.map((marker) => (
                  <ReferenceLine
                    key={marker.label}
                    x={marker.label}
                    yAxisId={showScore ? 'score' : 'signals'}
                    stroke={marker.color}
                    strokeDasharray="3 3"
                    strokeOpacity={0.55}
                    label={{
                      value: marker.tag,
                      position: 'top',
                      fill: marker.color,
                      fontSize: 11,
                      fontWeight: 600,
                      offset: 8,
                    }}
                  />
                ))}

                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  content={
                    <MomentumTooltip
                      seriesView={seriesView}
                      intensityThreshold={intensityThreshold}
                    />
                  }
                />

                {showSignals && (
                  <Bar
                    yAxisId="signals"
                    dataKey="signals"
                    name="Telemetry signals"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  >
                    {data.map((entry) => (
                      <Cell
                        key={entry.dateKey}
                        fill={entry.isHighIntensity ? '#f59e0b' : '#bfdbfe'}
                      />
                    ))}
                  </Bar>
                )}

                {showScore && (
                  <Area
                    yAxisId="score"
                    type="monotone"
                    dataKey="avgScore"
                    name="Avg account score"
                    stroke="#1d4ed8"
                    strokeWidth={2.25}
                    fill="url(#dmScoreFill)"
                    dot={{ r: 3, fill: '#1d4ed8', stroke: '#ffffff', strokeWidth: 1.5 }}
                    activeDot={{ r: 5, fill: '#1d4ed8', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                )}

                {showScore &&
                  scoreJumpDays.map((point) => (
                    <ReferenceDot
                      key={`jump-${point.dateKey}`}
                      yAxisId="score"
                      x={point.label}
                      y={point.avgScore}
                      r={5.5}
                      fill="#15803d"
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {(highIntensityDays.length > 0 || scoreJumpDays.length > 0) && (
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[#f1f5f9] pt-3 text-xs tabular-nums">
              {highIntensityDays.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-[#475569]">
                  <span className="font-semibold text-[#b45309]">High Intensity peaks:</span>
                  <span>
                    {highIntensityDays
                      .map((d) => `${d.label} (${d.signals} signals)`)
                      .join(' · ')}
                  </span>
                </div>
              )}
              {scoreJumpDays.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-[#475569]">
                  <span className="font-semibold text-[#15803d]">Significant score increases:</span>
                  <span>
                    {scoreJumpDays
                      .map((d) => `${d.label} (+${d.dayDelta.toFixed(1)} pts)`)
                      .join(' · ')}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="dm-caption">{dataSourceNote}</p>
            <button
              type="button"
              className="dm-text-button"
              onClick={() => onNavigateTab('DEMAND_UNITS')}
            >
              Inspect account scores <ArrowRight size={14} />
            </button>
          </div>
        </>
      )}
    </section>
  );
};
