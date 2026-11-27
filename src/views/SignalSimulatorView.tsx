import {HistoricalImportPanel} from '../components/HistoricalImportPanel';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowUpRight, BarChart3, CirclePause, CirclePlay,
  Database, Filter, RotateCcw, ShieldCheck, TriangleAlert,
} from 'lucide-react';
import { fetchHistoricalReplay, type HistoricalReplaySnapshot } from '../services/api';

type Source = 'ads' | 'marketo';
type DailyAds = { date: string; rows: number; outcome_rows: number } & Record<string, number | string>;
const ADS_FIELDS = ['spend', 'impressions', 'clicks', 'inquiries', 'mqls', 'tals', 'tqls', 'closed_won', 'predicted_value', 'gross_booking_value', 'qualified_out'] as const;
const n = (value: unknown) => Number(value || 0);
const count = (value: number) => Math.round(value).toLocaleString();
const amount = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
const percent = (part: number, whole: number) => whole ? `${(part / whole * 100).toFixed(1)}%` : '—';
const formatDate = (value: string) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

function groupAds(rows: HistoricalReplaySnapshot['ads']['timeline'], platform: string): DailyAds[] {
  const days = new Map<string, DailyAds>();
  for (const row of rows) {
    if (platform !== 'all' && row.platform !== platform) continue;
    const existing = days.get(row.date) || { date: row.date, rows: 0, outcome_rows: 0 } as DailyAds;
    existing.rows += n(row.rows);
    existing.outcome_rows += n(row.outcome_rows);
    for (const key of ADS_FIELDS) existing[key] = n(existing[key]) + n(row[key]);
    days.set(row.date, existing);
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function metricCard(label: string, value: string, detail: string, light: boolean) {
  return (
    <div key={label} className={`rounded-xl border p-4 sm:p-5 ${light ? 'border-slate-200 bg-white' : 'border-slate-700/75 bg-[#0b1727]'}`}>
      <div className={`text-[11px] font-semibold uppercase tracking-[.12em] ${light ? 'text-slate-500' : 'text-slate-400'}`}>{label}</div>
      <div className="mt-2 text-[clamp(1.5rem,2vw,2.15rem)] font-semibold tracking-tight tabular-nums">{value}</div>
      <div className={`mt-1 text-xs leading-5 ${light ? 'text-slate-600' : 'text-slate-400'}`}>{detail}</div>
    </div>
  );
}

export const SignalSimulatorView: React.FC<{ theme?: 'dark' | 'light' }> = ({ theme = 'dark' }) => {
  const [data, setData] = useState<HistoricalReplaySnapshot | null>(null);
  const [dataset, setDataset] = useState<'actual' | 'synthetic'>('actual');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<Source>('ads');
  const [platform, setPlatform] = useState('google');
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const light = theme === 'light';
  const shell = light ? 'bg-[#f5f7fa] text-slate-950 border-slate-200' : 'bg-[#07111e] text-slate-100 border-slate-700/70';
  const panel = light ? 'bg-white border-slate-200' : 'bg-[#0b1727] border-slate-700/75';
  const muted = light ? 'text-slate-600' : 'text-slate-400';

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchHistoricalReplay(dataset).then((snapshot) => {
      if (active) setData(snapshot);
    }).catch((reason) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Unable to load historical replay');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [dataset]);

  const adsDays = useMemo(() => data ? groupAds(data.ads.timeline, platform) : [], [data, platform]);
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
        if (current >= last) { setPlaying(false); return current; }
        return current + 1;
      });
    }, source === 'ads' ? 115 : 550);
    return () => window.clearInterval(timer);
  }, [playing, last, points.length, source]);

  const adsTotals = useMemo(() => {
    const totals: Record<string, number> = { rows: 0, outcome_rows: 0 };
    for (const row of adsDays.slice(0, activeCursor + 1)) {
      for (const key of ['rows', 'outcome_rows', ...ADS_FIELDS]) totals[key] = (totals[key] || 0) + n(row[key]);
    }
    return totals;
  }, [adsDays, activeCursor]);
  const marketoTotals = useMemo(() => {
    const totals: Record<string, number> = { total: 0 };
    for (const row of (data?.marketo.timeline || []).slice(0, activeCursor + 1)) {
      totals.total += row.total;
      for (const [kind, value] of Object.entries(row.activities)) totals[kind] = (totals[kind] || 0) + value;
    }
    return totals;
  }, [data, activeCursor]);
  const values = points.map((point) => source === 'ads' ? n((point as DailyAds).clicks) : n((point as { total: number }).total));
  const maxValue = Math.max(1, ...values);
  const chartBars = Array.from({ length: Math.min(44, points.length) }, (_, bucket) => {
    const bucketCount = Math.min(44, points.length);
    const start = Math.floor(bucket * points.length / bucketCount);
    const end = Math.floor((bucket + 1) * points.length / bucketCount);
    const value = values.slice(start, end).reduce((sum, next) => sum + next, 0);
    const peak = source === 'marketo' ? Math.log10(1 + value) / Math.log10(1 + maxValue) : value / (maxValue * Math.max(1, end - start));
    return { height: Math.max(3, Math.round(peak * 100)), active: start <= activeCursor };
  });
  const currentLabel = source === 'ads' ? adsDays[activeCursor]?.date : data?.marketo.timeline[activeCursor]?.time;

  if (loading) return <><HistoricalImportPanel/><div className={`rounded-2xl border p-10 ${shell}`}>Loading historical source data…</div></>;
  if (error) return <><HistoricalImportPanel/><div role="alert" className={`rounded-2xl border p-10 ${shell}`}>{error}</div></>;
  if (!data) return (
    <><HistoricalImportPanel/><div className={`rounded-2xl border p-8 ${shell}`}>
      <h1 className="text-2xl font-semibold">Historical chart replay</h1>
      <p className={`mt-3 max-w-2xl text-sm leading-6 ${muted}`}>No aggregate replay is available for this workspace. Use the historical import above to bring customer events into scoring.</p>
    </div></>
  );

  const marketo = data.marketo;
  const ads = data.ads;
  const funnel = marketo.funnel;
  const peak = marketo.timeline.reduce((best, row) => row.total > best.total ? row : best, marketo.timeline[0]);

  return (
    <><HistoricalImportPanel/><section className={`overflow-hidden rounded-2xl border ${shell}`}>
      <div className={`border-b px-5 py-6 sm:px-8 sm:py-8 ${light ? 'border-slate-200 bg-white' : 'border-slate-700/70 bg-[radial-gradient(ellipse_at_top_right,rgba(29,78,216,.22),transparent_45%)]'}`}>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.16em] text-sky-500"><Activity className="h-4 w-4" /> Source intelligence / historical replay</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Historical chart replay</h1>
            <p className={`mt-2 max-w-2xl text-sm leading-6 ${muted}`}>Explore source-shaped Marketo activity and paid-media delivery at their recorded cadence. Replay changes the view only; it does not alter workspace scores or send data to platforms.</p>
          </div>
          <div className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${light ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'}`}><ShieldCheck className="h-4 w-4" /> {dataset === 'synthetic' ? 'Fictional test data' : 'Read-only source data'}</div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2" aria-label="Dataset">
          {([['actual', 'Supplied exports'], ['synthetic', 'Synthetic full scale']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setDataset(key)} aria-pressed={dataset === key} className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${dataset === key ? light ? 'border-sky-400 bg-sky-100 text-sky-900' : 'border-sky-400 bg-sky-400/15 text-sky-200' : light ? 'border-slate-200 text-slate-600 hover:bg-slate-100' : 'border-slate-600 text-slate-400 hover:border-slate-400'}`}>{label}</button>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Replay source">
          {([['ads', 'Advertising delivery', ads.rows], ['marketo', 'Marketo activity', marketo.rows]] as const).map(([key, label, rows]) => (
            <button key={key} role="tab" aria-selected={source === key} onClick={() => setSource(key)} className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${source === key ? 'border-sky-400 bg-sky-500 text-white' : light ? 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100' : 'border-slate-600 bg-[#0b1727] text-slate-300 hover:border-slate-400'}`}>{label}<span className="ml-2 text-xs opacity-75">{count(rows)}</span></button>
          ))}
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-8">
        {data.validation && (
          <div className={`rounded-xl border p-4 sm:p-5 ${light ? 'border-sky-200 bg-sky-50' : 'border-sky-400/30 bg-sky-400/5'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-semibold">Synthetic data → scoring validation</h2><span className="text-xs text-sky-500">Isolated test tenant · Validated scoring workflow</span></div>
            <p className={`mt-1 text-xs leading-5 ${muted}`}>{count(data.validation.mapped_leads)} fictional leads mapped to accounts; {count(data.validation.units_evaluated)} demand units evaluated; {count(data.validation.jev_decisions_applied)} decisions applied; {count(data.validation.failed_units)} failed. These results are separate from your live workspace.</p>
            {data.validation.decisions.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{data.validation.decisions.slice(0, 4).map((item) => <span key={item.demand_unit_key} className={`rounded-md border px-2.5 py-1.5 text-[11px] ${light ? 'border-sky-200 bg-white text-slate-700' : 'border-sky-400/20 bg-[#0b1727] text-slate-300'}`}>{item.demand_unit_key.split(':').slice(-2).join(' · ')} → {item.stage || 'Failed'}</span>)}</div>}
          </div>
        )}
        <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${panel}`}>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`text-xs font-semibold uppercase tracking-[.12em] ${muted}`}>{source === 'ads' ? 'Daily observations' : 'Hourly activities'}</span>
            {source === 'ads' && <label className="flex items-center gap-2 text-xs font-medium"><Filter className="h-3.5 w-3.5 text-sky-500" /><span>Platform</span><select value={platform} onChange={(event) => setPlatform(event.target.value)} className={`rounded-md border px-2.5 py-1.5 text-xs ${light ? 'border-slate-300 bg-white text-slate-900' : 'border-slate-600 bg-[#101f31] text-slate-100'}`}><option value="all">All platforms</option>{ads.platforms.map((item) => <option key={item.name} value={item.name}>{item.name[0].toUpperCase() + item.name.slice(1)}</option>)}</select></label>}
          </div>
          <span className={`text-xs tabular-nums ${muted}`}>{source === 'ads' ? `${formatDate(ads.date_start)} – ${formatDate(ads.date_end)}` : `${formatDate(marketo.date_start)} – ${formatDate(marketo.date_end)}`}</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {source === 'ads' ? <>
            {metricCard('Spend recorded', amount(adsTotals.spend || 0), 'Source currency unspecified · cumulative', light)}
            {metricCard('Clicks', count(adsTotals.clicks || 0), `${count(adsTotals.impressions || 0)} impressions · ${percent(adsTotals.clicks || 0, adsTotals.impressions || 0)} CTR`, light)}
            {metricCard('Inquiries reported', count(adsTotals.inquiries || 0), `${count(adsTotals.outcome_rows || 0)} rows with outcome fields`, light)}
            {metricCard('MQLs reported', count(adsTotals.mqls || 0), `${count(adsTotals.closed_won || 0)} closed won reported`, light)}
          </> : <>
            {metricCard('Activity events', count(marketoTotals.total || 0), 'Cumulative activity records', light)}
            {metricCard('Email delivered', count(marketoTotals['7'] || 0), `${count(marketoTotals['6'] || 0)} sends recorded`, light)}
            {metricCard('Email opens', count(marketoTotals['10'] || 0), 'Opens are weaker intent evidence', light)}
            {metricCard('Email clicks + forms', count((marketoTotals['11'] || 0) + (marketoTotals['2'] || 0)), `${count(marketoTotals['2'] || 0)} form submissions`, light)}
          </>}
        </div>

        <div className={`rounded-xl border p-5 sm:p-6 ${panel}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="flex items-center gap-2 text-base font-semibold"><BarChart3 className="h-4 w-4 text-sky-500" /> Event replay</h2><p className={`mt-1 text-xs ${muted}`}>{source === 'ads' ? 'Click volume by day · grouped into 44 intervals' : 'Activity volume by hour · logarithmic height to preserve quiet hours'}</p></div>
            <div className="text-right"><div className="text-xs font-semibold tabular-nums">{currentLabel ? formatDate(currentLabel) : '—'}</div><div className={`mt-0.5 text-[11px] ${muted}`}>{count(activeCursor + 1)} of {count(points.length)} periods</div></div>
          </div>
          <div aria-label="Historical event volume chart" role="img" className="mt-7 flex h-40 items-end gap-[3px] border-b border-slate-600/50 pb-1">
            {chartBars.map((bar, index) => <div key={index} className={`min-w-0 flex-1 rounded-t-sm transition-colors ${bar.active ? 'bg-sky-500' : light ? 'bg-slate-200' : 'bg-slate-700'}`} style={{ height: `${bar.height}%` }} />)}
          </div>
          <div className={`mt-2 flex justify-between text-[11px] ${muted}`}><span>{source === 'ads' ? formatDate(ads.date_start) : formatDate(marketo.date_start)}</span><span>{source === 'ads' ? formatDate(ads.date_end) : formatDate(marketo.date_end)}</span></div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button onClick={() => { if (activeCursor >= last) setCursor(0); setPlaying(!playing); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600">{playing ? <CirclePause className="h-4 w-4" /> : <CirclePlay className="h-4 w-4" />}{playing ? 'Pause replay' : 'Play from start'}</button>
            <button onClick={() => { setPlaying(false); setCursor(last); }} className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${light ? 'border-slate-300 text-slate-700 hover:bg-slate-100' : 'border-slate-600 text-slate-200 hover:bg-slate-800'}`}><RotateCcw className="h-4 w-4" /> Full period</button>
            <input aria-label="Replay position" type="range" min={0} max={last} value={activeCursor} onChange={(event) => { setPlaying(false); setCursor(Number(event.target.value)); }} className="min-w-[160px] flex-1 accent-sky-500" />
          </div>
        </div>

        {data.population && (
          <div className={`rounded-xl border p-5 sm:p-6 ${panel}`}>
            <h2 className="text-base font-semibold">Accounts and segments</h2>
            <p className={`mt-1 text-xs leading-5 ${muted}`}>{count(data.population.accounts)} fictional accounts carry the lead-to-account join the supplied export does not include. Segments are need groups, not ad audiences.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {data.population.segments.map((segment) => (
                <div key={segment.id} className={`rounded-lg border px-3 py-3 ${light ? 'border-slate-200' : 'border-slate-700/70'}`}>
                  <div className="text-sm font-medium">{segment.name}</div>
                  <div className={`mt-1 text-xs tabular-nums ${muted}`}>{count(segment.accounts)} accounts · {count(segment.leads)} leads</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[1.3fr_.9fr]">
          <div className={`rounded-xl border p-5 sm:p-6 ${panel}`}>
            <h2 className="flex items-center gap-2 text-base font-semibold"><Database className="h-4 w-4 text-sky-500" /> {source === 'ads' ? 'Platform evidence' : 'Marketo signal taxonomy'}</h2>
            <p className={`mt-1 text-xs leading-5 ${muted}`}>{source === 'ads' ? 'This export contains multiple ad platforms even though its filename mentions Google Ads. Spend currency is not supplied.' : 'Activity labels follow Adobe’s standard Marketo activity IDs. Unknown IDs stay classified as other.'}</p>
            <div className="mt-5 divide-y divide-slate-700/30">
              {source === 'ads' ? ads.platforms.map((item) => {
                const rows = ads.timeline.filter((row) => row.platform === item.name);
                const spend = rows.reduce((sum, row) => sum + n(row.spend), 0);
                const clicks = rows.reduce((sum, row) => sum + n(row.clicks), 0);
                return <div key={item.name} className="flex items-center justify-between gap-4 py-3 text-sm"><div className="font-medium capitalize">{item.name}<span className={`ml-2 text-xs ${muted}`}>{count(item.rows)} rows</span></div><div className="text-right tabular-nums"><span className="font-semibold">{amount(spend)} spend</span><span className={`ml-3 text-xs ${muted}`}>{count(clicks)} clicks</span></div></div>;
              }) : marketo.activity_types.slice(0, 9).map((item) => <div key={item.id} className="flex items-center justify-between gap-4 py-3 text-sm"><div className="font-medium">{item.label}<span className={`ml-2 text-xs ${muted}`}>ID {item.id}</span></div><div className="text-right tabular-nums"><span className="font-semibold">{count(item.events)}</span><span className={`ml-3 text-xs ${muted}`}>{count(item.unique_leads)} people</span></div></div>)}
            </div>
          </div>
          <div className="space-y-5">
            <div className={`rounded-xl border p-5 sm:p-6 ${panel}`}>
              <h2 className="flex items-center gap-2 text-base font-semibold"><ArrowUpRight className="h-4 w-4 text-emerald-500" /> What the signals show</h2>
              <div className={`mt-4 space-y-3 text-sm leading-6 ${muted}`}>
                {source === 'marketo' ? <>
                  <p><strong className={light ? 'text-slate-900' : 'text-slate-100'}>{percent(funnel.delivered_after_send, funnel.sent_leads)}</strong> of people with a recorded send also have a delivery event in this extract.</p>
                  <p><strong className={light ? 'text-slate-900' : 'text-slate-100'}>{percent(funnel.opened_after_delivery, funnel.delivered_after_send)}</strong> of delivered people also opened; <strong className={light ? 'text-slate-900' : 'text-slate-100'}>{percent(funnel.clicked_after_delivery, funnel.delivered_after_send)}</strong> clicked. These are observed overlaps, not conversion attribution.</p>
                  <p><strong className={light ? 'text-slate-900' : 'text-slate-100'}>{percent(peak.total, marketo.rows)}</strong> of all events occurred in the peak hour ({formatDate(peak.time)}). The export is dominated by a batch send.</p>
                </> : <>
                  <p><strong className={light ? 'text-slate-900' : 'text-slate-100'}>{count(ads.outcome_rows)}</strong> of {count(ads.rows)} rows contain outcome fields. Blank outcomes are unknown, so campaign cost-per-lead estimates need a verified reporting definition.</p>
                  <p><strong className={light ? 'text-slate-900' : 'text-slate-100'}>{count(ads.outcome_rows_without_spend)}</strong> outcome rows have no spend value. Treat them separately when reconciling spend and conversions.</p>
                  <p>Google accounts for <strong className={light ? 'text-slate-900' : 'text-slate-100'}>{percent(ads.platforms.find((item) => item.name === 'google')?.rows || 0, ads.rows)}</strong> of source rows; filter to Google before assessing its performance.</p>
                </>}
              </div>
            </div>
            <div className={`rounded-xl border p-5 sm:p-6 ${panel}`}>
              <h2 className="text-sm font-semibold">Recommended next move</h2>
              <p className={`mt-3 text-xs leading-5 ${muted}`}>
                {source === 'marketo'
                  ? 'Use form submissions and email clicks as stronger engagement evidence than sends, deliveries, or opens. Review bounces separately. Add an authorized lead-to-account mapping before these events can influence demand-unit scores.'
                  : 'Validate the meaning and coverage of inquiry and MQL fields, especially outcome rows without spend. Compare Google campaigns inside Google only, then reconcile conversion definitions before calculating acquisition cost or pacing alerts.'}
              </p>
            </div>
            <div className={`rounded-xl border p-5 sm:p-6 ${light ? 'border-amber-200 bg-amber-50' : 'border-amber-400/25 bg-amber-400/5'}`}>
              <h2 className="flex items-center gap-2 text-sm font-semibold"><TriangleAlert className="h-4 w-4 text-amber-500" /> Interpretation guardrails</h2>
              <p className={`mt-3 text-xs leading-5 ${muted}`}>{dataset === 'synthetic' ? 'All values are fictional. The companion lead and program maps support an isolated scoring validation, while ad campaign totals remain reporting-only. The replay does not imply ad-to-person attribution or change the live workspace.' : 'The source periods do not overlap and neither file contains a shared account key. This view does not infer Google-to-Marketo attribution or update demand units. A lead-to-account mapping and aligned reporting window are needed before those actions are valid.'}</p>
            </div>
          </div>
        </div>
        <div className={`text-[11px] ${muted}`}>Source: {dataset === 'synthetic' ? 'generated fictional CSV exports' : 'locally supplied CSV exports'} · Aggregated replay generated {formatDate(data.generated_at)} · Visible only to this workspace.</div>
      </div>
    </section></>
  );
};
