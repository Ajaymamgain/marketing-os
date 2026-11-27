import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CirclePause,
  CirclePlay,
  Database,
  Filter,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { HistoricalImportPanel } from '../components/HistoricalImportPanel';
import { fetchHistoricalReplay, type HistoricalReplaySnapshot } from '../services/api';

type Source = 'ads' | 'marketo';
type DailyAds = { date: string; rows: number; outcome_rows: number } & Record<string, number | string>;

const ADS_FIELDS = [
  'spend',
  'impressions',
  'clicks',
  'inquiries',
  'mqls',
  'tals',
  'tqls',
  'closed_won',
  'predicted_value',
  'gross_booking_value',
  'qualified_out',
] as const;

const n = (value: unknown) => Number(value || 0);
const count = (value: number) => Math.round(value).toLocaleString();
const amount = (value: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
const percent = (part: number, whole: number) =>
  whole ? `${((part / whole) * 100).toFixed(1)}%` : '—';
const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

function groupAds(rows: HistoricalReplaySnapshot['ads']['timeline'], platform: string): DailyAds[] {
  const days = new Map<string, DailyAds>();
  for (const row of rows) {
    if (platform !== 'all' && row.platform !== platform) continue;
    const existing =
      days.get(row.date) || ({ date: row.date, rows: 0, outcome_rows: 0 } as DailyAds);
    existing.rows += n(row.rows);
    existing.outcome_rows += n(row.outcome_rows);
    for (const key of ADS_FIELDS) existing[key] = n(existing[key]) + n(row[key]);
    days.set(row.date, existing);
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="dm-card dm-metric">
      <div>{label}</div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

export const SignalSimulatorView: React.FC<{ theme?: 'dark' | 'light' }> = () => {
  const [data, setData] = useState<HistoricalReplaySnapshot | null>(null);
  const [dataset, setDataset] = useState<'actual' | 'synthetic'>('actual');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<Source>('ads');
  const [platform, setPlatform] = useState('google');
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchHistoricalReplay(dataset)
      .then((snapshot) => {
        if (active) setData(snapshot);
      })
      .catch((reason) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : 'Unable to load historical replay');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [dataset]);

  const adsDays = useMemo(
    () => (data ? groupAds(data.ads.timeline, platform) : []),
    [data, platform]
  );
  const points = source === 'ads' ? adsDays : data?.marketo.timeline || [];
  const last = Math.max(0, points.length - 1);
  const activeCursor = Math.min(cursor, last);

  useEffect(() => {
    setPlaying(false);
    setCursor(Math.max(0, points.length - 1));
  }, [source, platform, points.length, dataset]);

  useEffect(() => {
    if (!playing || !points.length) return;
    const timer = window.setInterval(() => {
      setCursor((current) => {
        if (current >= last) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, source === 'ads' ? 115 : 550);
    return () => window.clearInterval(timer);
  }, [playing, last, points.length, source]);

  const adsTotals = useMemo(() => {
    const totals: Record<string, number> = { rows: 0, outcome_rows: 0 };
    for (const row of adsDays.slice(0, activeCursor + 1)) {
      for (const key of ['rows', 'outcome_rows', ...ADS_FIELDS]) {
        totals[key] = (totals[key] || 0) + n(row[key]);
      }
    }
    return totals;
  }, [adsDays, activeCursor]);

  const marketoTotals = useMemo(() => {
    const totals: Record<string, number> = { total: 0 };
    for (const row of (data?.marketo.timeline || []).slice(0, activeCursor + 1)) {
      totals.total += row.total;
      for (const [kind, value] of Object.entries(row.activities)) {
        totals[kind] = (totals[kind] || 0) + value;
      }
    }
    return totals;
  }, [data, activeCursor]);

  const values = points.map((point) =>
    source === 'ads' ? n((point as DailyAds).clicks) : n((point as { total: number }).total)
  );
  const maxValue = Math.max(1, ...values);
  const chartBars = Array.from({ length: Math.min(44, points.length) }, (_, bucket) => {
    const bucketCount = Math.min(44, points.length);
    const start = Math.floor((bucket * points.length) / bucketCount);
    const end = Math.floor(((bucket + 1) * points.length) / bucketCount);
    const value = values.slice(start, end).reduce((sum, next) => sum + next, 0);
    const peakVal =
      source === 'marketo'
        ? Math.log10(1 + value) / Math.log10(1 + maxValue)
        : value / (maxValue * Math.max(1, end - start));
    return { height: Math.max(3, Math.round(peakVal * 100)), active: start <= activeCursor };
  });

  const currentLabel =
    source === 'ads' ? adsDays[activeCursor]?.date : data?.marketo.timeline[activeCursor]?.time;

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <div className="dm-page-heading">
        <div>
          <h1>Data imports & replay</h1>
          <p>
            Import first-party historical files into scoring or replay source-shaped Marketo and
            paid-media timelines safely.
          </p>
        </div>
        <a className="dm-button" href="#conversions">
          Open conversion simulator <ArrowRight size={15} />
        </a>
      </div>

      <HistoricalImportPanel />

      {loading && (
        <div className="dm-card space-y-4" role="status" aria-label="Loading historical source data">
          <div className="dm-skeleton h-6 w-52" />
          <div className="dm-skeleton h-40 w-full" />
        </div>
      )}

      {error && (
        <div role="alert" className="dm-notice dm-notice-error">
          {error}
        </div>
      )}

      {!loading && !error && !data && (
        <div className="dm-card">
          <h2 className="text-lg font-semibold text-[#0f172a]">Historical chart replay</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#475569]">
            No aggregate replay is available for this workspace. Use the historical import above to
            bring customer events into scoring.
          </p>
        </div>
      )}

      {!loading && !error && data && (() => {
        const marketo = data.marketo;
        const ads = data.ads;
        const funnel = marketo.funnel;
        const peak = marketo.timeline.reduce(
          (best, row) => (row.total > best.total ? row : best),
          marketo.timeline[0]
        );

        return (
          <section className="space-y-5">
            <div className="dm-card space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-[#0f172a]">Historical chart replay</h2>
                  <p className="mt-1 max-w-2xl text-sm text-[#475569]">
                    Explore source-shaped Marketo activity and paid-media delivery at their recorded
                    cadence. Replay changes the view only; it does not alter workspace scores or send
                    data to platforms.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#15803d]">
                  <ShieldCheck size={15} />
                  {dataset === 'synthetic' ? 'Fictional test data' : 'Read-only source data'}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e2e8f0] pt-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="dm-segmented" role="group" aria-label="Dataset">
                    {(
                      [
                        ['actual', 'Supplied exports'],
                        ['synthetic', 'Synthetic full scale'],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setDataset(key)}
                        aria-pressed={dataset === key}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="dm-segmented" role="tablist" aria-label="Replay source">
                    {(
                      [
                        ['ads', 'Advertising delivery', ads.rows],
                        ['marketo', 'Marketo activity', marketo.rows],
                      ] as const
                    ).map(([key, label, rows]) => (
                      <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={source === key}
                        onClick={() => setSource(key)}
                      >
                        {label}{' '}
                        <span className="ml-1 text-xs font-normal tabular-nums text-[#64748b]">
                          {count(rows)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {source === 'ads' && (
                    <label className="flex items-center gap-2 text-xs font-medium text-[#475569]">
                      <Filter size={14} className="text-[#1d4ed8]" />
                      <span>Platform</span>
                      <select
                        value={platform}
                        onChange={(event) => setPlatform(event.target.value)}
                        className="dm-input !min-h-[34px] !py-1 text-xs"
                      >
                        <option value="all">All platforms</option>
                        {ads.platforms.map((item) => (
                          <option key={item.name} value={item.name}>
                            {item.name[0].toUpperCase() + item.name.slice(1)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <span className="dm-caption tabular-nums">
                    {source === 'ads'
                      ? `${formatDate(ads.date_start)} – ${formatDate(ads.date_end)}`
                      : `${formatDate(marketo.date_start)} – ${formatDate(marketo.date_end)}`}
                  </span>
                </div>
              </div>
            </div>

            {data.validation && (
              <div className="dm-notice flex-col gap-2">
                <div className="flex w-full flex-wrap items-center justify-between gap-2">
                  <strong className="text-sm font-semibold text-[#0f172a]">
                    Synthetic data → scoring validation
                  </strong>
                  <span className="text-xs font-medium text-[#1d4ed8]">
                    Isolated test tenant · Validated scoring workflow
                  </span>
                </div>
                <p className="text-xs leading-5 text-[#475569] tabular-nums">
                  {count(data.validation.mapped_leads)} fictional leads mapped to accounts;{' '}
                  {count(data.validation.units_evaluated)} demand units evaluated;{' '}
                  {count(data.validation.jev_decisions_applied)} decisions applied;{' '}
                  {count(data.validation.failed_units)} failed. These results are separate from your
                  live workspace.
                </p>
                {data.validation.decisions.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#334155]">
                    {data.validation.decisions.slice(0, 4).map((item) => (
                      <span key={item.demand_unit_key}>
                        {item.demand_unit_key.split(':').slice(-2).join(' · ')} →{' '}
                        <strong className="font-semibold">{item.stage || 'Failed'}</strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {source === 'ads' ? (
                <>
                  <MetricCard
                    label="Spend recorded"
                    value={amount(adsTotals.spend || 0)}
                    detail="Source currency unspecified · cumulative"
                  />
                  <MetricCard
                    label="Clicks"
                    value={count(adsTotals.clicks || 0)}
                    detail={`${count(adsTotals.impressions || 0)} impressions · ${percent(adsTotals.clicks || 0, adsTotals.impressions || 0)} CTR`}
                  />
                  <MetricCard
                    label="Inquiries reported"
                    value={count(adsTotals.inquiries || 0)}
                    detail={`${count(adsTotals.outcome_rows || 0)} rows with outcome fields`}
                  />
                  <MetricCard
                    label="MQLs reported"
                    value={count(adsTotals.mqls || 0)}
                    detail={`${count(adsTotals.closed_won || 0)} closed won reported`}
                  />
                </>
              ) : (
                <>
                  <MetricCard
                    label="Activity events"
                    value={count(marketoTotals.total || 0)}
                    detail="Cumulative activity records"
                  />
                  <MetricCard
                    label="Email delivered"
                    value={count(marketoTotals['7'] || 0)}
                    detail={`${count(marketoTotals['6'] || 0)} sends recorded`}
                  />
                  <MetricCard
                    label="Email opens"
                    value={count(marketoTotals['10'] || 0)}
                    detail="Opens are weaker intent evidence"
                  />
                  <MetricCard
                    label="Email clicks + forms"
                    value={count((marketoTotals['11'] || 0) + (marketoTotals['2'] || 0))}
                    detail={`${count(marketoTotals['2'] || 0)} form submissions`}
                  />
                </>
              )}
            </div>

            <div className="dm-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-semibold text-[#0f172a]">
                    <BarChart3 size={16} className="text-[#1d4ed8]" />
                    Event replay
                  </h2>
                  <p className="dm-caption mt-1">
                    {source === 'ads'
                      ? 'Click volume by day · grouped into 44 intervals'
                      : 'Activity volume by hour · logarithmic height to preserve quiet hours'}
                  </p>
                </div>
                <div className="text-right tabular-nums">
                  <div className="text-xs font-semibold text-[#0f172a]">
                    {currentLabel ? formatDate(currentLabel) : '—'}
                  </div>
                  <div className="dm-caption mt-0.5">
                    {count(activeCursor + 1)} of {count(points.length)} periods
                  </div>
                </div>
              </div>

              <div
                aria-label="Historical event volume chart"
                role="img"
                className="mt-6 flex h-40 items-end gap-[3px] border-b border-[#e2e8f0] pb-1"
              >
                {chartBars.map((bar, index) => (
                  <div
                    key={index}
                    className={`min-w-0 flex-1 rounded-t-sm transition-colors ${
                      bar.active ? 'bg-[#1d4ed8]' : 'bg-[#e2e8f0]'
                    }`}
                    style={{ height: `${bar.height}%` }}
                  />
                ))}
              </div>

              <div className="mt-2 flex justify-between dm-caption tabular-nums">
                <span>
                  {source === 'ads' ? formatDate(ads.date_start) : formatDate(marketo.date_start)}
                </span>
                <span>
                  {source === 'ads' ? formatDate(ads.date_end) : formatDate(marketo.date_end)}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (activeCursor >= last) setCursor(0);
                    setPlaying(!playing);
                  }}
                  className="dm-button dm-button-primary"
                >
                  {playing ? <CirclePause size={15} /> : <CirclePlay size={15} />}
                  {playing ? 'Pause replay' : 'Play from start'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlaying(false);
                    setCursor(last);
                  }}
                  className="dm-button"
                >
                  <RotateCcw size={15} /> Full period
                </button>
                <input
                  aria-label="Replay position"
                  type="range"
                  min={0}
                  max={last}
                  value={activeCursor}
                  onChange={(event) => {
                    setPlaying(false);
                    setCursor(Number(event.target.value));
                  }}
                  className="min-w-[160px] flex-1 accent-[#1d4ed8]"
                />
              </div>
            </div>

            {data.population && (
              <div className="dm-card">
                <h2 className="text-base font-semibold text-[#0f172a]">Accounts and segments</h2>
                <p className="dm-caption mt-1">
                  {count(data.population.accounts)} fictional accounts carry the lead-to-account join
                  the supplied export does not include. Segments are need groups, not ad audiences.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {data.population.segments.map((segment) => (
                    <div
                      key={segment.id}
                      className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-3"
                    >
                      <div className="text-sm font-medium text-[#0f172a]">{segment.name}</div>
                      <div className="dm-caption mt-1 tabular-nums">
                        {count(segment.accounts)} accounts · {count(segment.leads)} leads
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-5 xl:grid-cols-[1.3fr_.9fr]">
              <div className="dm-card">
                <h2 className="flex items-center gap-2 text-base font-semibold text-[#0f172a]">
                  <Database size={16} className="text-[#1d4ed8]" />
                  {source === 'ads' ? 'Platform evidence' : 'Marketo signal taxonomy'}
                </h2>
                <p className="dm-caption mt-1">
                  {source === 'ads'
                    ? 'This export contains multiple ad platforms even though its filename mentions Google Ads. Spend currency is not supplied.'
                    : 'Activity labels follow Adobe’s standard Marketo activity IDs. Unknown IDs stay classified as other.'}
                </p>

                <div className="mt-4 divide-y divide-[#e2e8f0]">
                  {source === 'ads'
                    ? ads.platforms.map((item) => {
                        const rows = ads.timeline.filter((row) => row.platform === item.name);
                        const spend = rows.reduce((sum, row) => sum + n(row.spend), 0);
                        const clicks = rows.reduce((sum, row) => sum + n(row.clicks), 0);
                        return (
                          <div
                            key={item.name}
                            className="flex items-center justify-between gap-4 py-3 text-sm"
                          >
                            <div className="font-medium capitalize text-[#0f172a]">
                              {item.name}
                              <span className="dm-caption ml-2 tabular-nums">
                                {count(item.rows)} rows
                              </span>
                            </div>
                            <div className="text-right tabular-nums">
                              <span className="font-semibold text-[#0f172a]">
                                {amount(spend)} spend
                              </span>
                              <span className="dm-caption ml-3">{count(clicks)} clicks</span>
                            </div>
                          </div>
                        );
                      })
                    : marketo.activity_types.slice(0, 9).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-4 py-3 text-sm"
                        >
                          <div className="font-medium text-[#0f172a]">
                            {item.label}
                            <span className="dm-caption ml-2 tabular-nums">ID {item.id}</span>
                          </div>
                          <div className="text-right tabular-nums">
                            <span className="font-semibold text-[#0f172a]">
                              {count(item.events)}
                            </span>
                            <span className="dm-caption ml-3">
                              {count(item.unique_leads)} people
                            </span>
                          </div>
                        </div>
                      ))}
                </div>
              </div>

              <div className="space-y-5">
                <div className="dm-card">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-[#0f172a]">
                    <ArrowUpRight size={16} className="text-[#15803d]" />
                    What the signals show
                  </h2>
                  <div className="mt-3 space-y-3 text-sm leading-6 text-[#475569]">
                    {source === 'marketo' ? (
                      <>
                        <p>
                          <strong className="font-semibold tabular-nums text-[#0f172a]">
                            {percent(funnel.delivered_after_send, funnel.sent_leads)}
                          </strong>{' '}
                          of people with a recorded send also have a delivery event in this extract.
                        </p>
                        <p>
                          <strong className="font-semibold tabular-nums text-[#0f172a]">
                            {percent(funnel.opened_after_delivery, funnel.delivered_after_send)}
                          </strong>{' '}
                          of delivered people also opened;{' '}
                          <strong className="font-semibold tabular-nums text-[#0f172a]">
                            {percent(funnel.clicked_after_delivery, funnel.delivered_after_send)}
                          </strong>{' '}
                          clicked. These are observed overlaps, not conversion attribution.
                        </p>
                        <p>
                          <strong className="font-semibold tabular-nums text-[#0f172a]">
                            {percent(peak.total, marketo.rows)}
                          </strong>{' '}
                          of all events occurred in the peak hour ({formatDate(peak.time)}). The
                          export is dominated by a batch send.
                        </p>
                      </>
                    ) : (
                      <>
                        <p>
                          <strong className="font-semibold tabular-nums text-[#0f172a]">
                            {count(ads.outcome_rows)}
                          </strong>{' '}
                          of {count(ads.rows)} rows contain outcome fields. Blank outcomes are
                          unknown, so campaign cost-per-lead estimates need a verified reporting
                          definition.
                        </p>
                        <p>
                          <strong className="font-semibold tabular-nums text-[#0f172a]">
                            {count(ads.outcome_rows_without_spend)}
                          </strong>{' '}
                          outcome rows have no spend value. Treat them separately when reconciling
                          spend and conversions.
                        </p>
                        <p>
                          Google accounts for{' '}
                          <strong className="font-semibold tabular-nums text-[#0f172a]">
                            {percent(
                              ads.platforms.find((item) => item.name === 'google')?.rows || 0,
                              ads.rows
                            )}
                          </strong>{' '}
                          of source rows; filter to Google before assessing its performance.
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="dm-card">
                  <h2 className="text-sm font-semibold text-[#0f172a]">Recommended next move</h2>
                  <p className="mt-2 text-xs leading-5 text-[#475569]">
                    {source === 'marketo'
                      ? 'Use form submissions and email clicks as stronger engagement evidence than sends, deliveries, or opens. Review bounces separately. Add an authorized lead-to-account mapping before these events can influence demand-unit scores.'
                      : 'Validate the meaning and coverage of inquiry and MQL fields, especially outcome rows without spend. Compare Google campaigns inside Google only, then reconcile conversion definitions before calculating acquisition cost or pacing alerts.'}
                  </p>
                </div>

                <div className="dm-notice dm-notice-warning">
                  <TriangleAlert size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <h2 className="text-sm font-semibold">Interpretation guardrails</h2>
                    <p className="mt-1 text-xs leading-5">
                      {dataset === 'synthetic'
                        ? 'All values are fictional. The companion lead and program maps support an isolated scoring validation, while ad campaign totals remain reporting-only. The replay does not imply ad-to-person attribution or change the live workspace.'
                        : 'The source periods do not overlap and neither file contains a shared account key. This view does not infer Google-to-Marketo attribution or update demand units. A lead-to-account mapping and aligned reporting window are needed before those actions are valid.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <p className="dm-caption">
              Source: {dataset === 'synthetic' ? 'generated fictional CSV exports' : 'locally supplied CSV exports'} · Aggregated replay generated {formatDate(data.generated_at)} · Visible only to this workspace.
            </p>
          </section>
        );
      })()}
    </div>
  );
};
