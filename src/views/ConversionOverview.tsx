import {useEffect, useMemo, useState} from 'react';
import {ArrowRight, ChevronRight, CloudUpload, Users} from 'lucide-react';
import {fetchHistoricalReplay, getConversionBatch} from '../services/api';
import type {ConversionBatch, ConversionBatchDetail, ConversionMatching, ConversionWorkspace, HistoricalReplaySnapshot} from '../services/api';
import {ConversionFlow} from './ConversionFlow';

const format = new Intl.NumberFormat('en', {maximumFractionDigits: 2});
const display = (value: number | null | undefined) => value == null ? '—' : format.format(value);
const platforms: Record<string, string> = {google: 'Google Ads', meta: 'Meta', facebook: 'Meta', linkedin: 'LinkedIn'};
const goals = [
  {id: 'meeting_booked', label: 'SQL · Meeting Booked'},
  {id: 'meeting_held', label: 'SQL · Meeting Held'},
  {id: 'proposal_sent', label: 'SQL · Proposal Sent'},
  {id: 'completed_sale', label: 'Closed-Won Sale'},
];
const stages = [
  {key: 'inquiries', label: 'Website Inquiries', color: '#334155'},
  {key: 'mqls', label: 'Marketing Qualified', color: '#0284c7'},
  {key: 'tals', label: 'Reported TALs', color: '#0d9488'},
  {key: 'tqls', label: 'Reported TQLs', color: '#059669'},
  {key: 'closed_won', label: 'Closed Won', color: '#64748b'},
] as const;
type AdRow = HistoricalReplaySnapshot['ads']['timeline'][number];
type Operation = ConversionBatch['operation'];
type Platform = ConversionBatch['destination']['platform'];
export interface ConversionReviewSettings {
  platform: Platform;
  outcome: string;
  matching: ConversionMatching;
  maxClickAge: string;
}

function sum(rows: AdRow[], key: string, outcomes = false) {
  const reported = rows.filter(row => (!outcomes || Number(row.outcome_rows) > 0) && typeof row[key] === 'number' && Number.isFinite(row[key]));
  return reported.length ? reported.reduce((total, row) => total + Number(row[key]), 0) : null;
}
function monthLabel(key: string) {
  return new Date(key + '-01T00:00:00Z').toLocaleDateString('en', {month: 'long', year: 'numeric', timeZone: 'UTC'});
}
function dayLabel(date: string) {
  return new Date(date + 'T00:00:00Z').toLocaleDateString('en', {month: 'short', day: 'numeric', timeZone: 'UTC'});
}
function actualBatchEconomics(batch: ConversionBatchDetail | null) {
  const eligible = batch?.rows.filter(row => row.state === 'accepted' || row.state === 'processed') || [];
  const values = new Map<string, number>();
  const won = new Map<string, {total: number; count: number}>();
  const lag = eligible.flatMap(row => row.lag_days == null ? [] : [row.lag_days]);
  for (const row of eligible) {
    if (row.value == null || !row.currency) continue;
    values.set(row.currency, (values.get(row.currency) || 0) + row.value);
    if (row.outcome === 'completed_sale') {
      const previous = won.get(row.currency) || {total: 0, count: 0};
      won.set(row.currency, {total: previous.total + row.value, count: previous.count + 1});
    }
  }
  return {
    recorded: Array.from(values, ([currency, value]) => `${currency} ${display(value)}`).join(' · ') || '—',
    average: Array.from(won, ([currency, value]) => `${currency} ${display(value.total / value.count)}`).join(' · ') || '—',
    lag: lag.length ? display(lag.reduce((a, b) => a + b, 0) / lag.length) + ' days' : '—',
  };
}

export function ConversionOverview({workspace, refreshKey, onStart, onDestinations, onHistory, onBatch}: {
  workspace: ConversionWorkspace | null;
  refreshKey?: number;
  onStart: (operation: Operation, settings: ConversionReviewSettings) => void;
  onDestinations: () => void;
  onHistory: () => void;
  onBatch: (id: string) => void;
}) {
  const [snapshot, setSnapshot] = useState<HistoricalReplaySnapshot | null>(null);
  const [reportError, setReportError] = useState('');
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState<Platform>('google');
  const [month, setMonth] = useState('');
  const [goal, setGoal] = useState('meeting_held');
  const [matching, setMatching] = useState<ConversionMatching>('automatic');
  const [maxClickAge, setMaxClickAge] = useState('');
  const [currentStage, setCurrentStage] = useState(3);
  const [batchId, setBatchId] = useState('');
  const [batch, setBatch] = useState<ConversionBatchDetail | null>(null);
  const [batchError, setBatchError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setReportError('');
    void fetchHistoricalReplay().then(result => {
      if (active) setSnapshot(result);
    }).catch(() => {
      if (active) setReportError('Could not load the saved campaign export.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {active = false;};
  }, [revision, refreshKey]);

  const platformBatches = workspace?.batches.filter(item => item.destination.platform === platform) || [];
  const selectedBatch = platformBatches.find(item => item.id === batchId) || platformBatches[0];
  useEffect(() => {
    let active = true;
    setBatch(null);
    setBatchError('');
    if (!selectedBatch) return;
    void getConversionBatch(selectedBatch.id).then(result => {
      if (active) setBatch(result);
    }).catch(error => {
      if (active) setBatchError(error.message);
    });
    return () => {active = false;};
  }, [selectedBatch?.id, refreshKey]);

  const ads = useMemo(() => (snapshot?.ads.timeline || []).filter(row => /^\d{4}-\d{2}-\d{2}$/.test(row.date)), [snapshot]);
  const source = ads.filter(row => row.platform === platform || (platform === 'meta' && row.platform === 'facebook'));
  const months = [...new Set(source.map(row => row.date.slice(0, 7)))].sort().reverse();
  const selectedMonth = months.includes(month) ? month : months.find(key => {
    const start = new Date(key + '-01T00:00:00Z');
    const daysInMonth = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
    return new Set(source.filter(row => row.date.startsWith(key)).map(row => row.date)).size === daysInMonth;
  }) || months[0];
  const slice = source.filter(row => selectedMonth && row.date.startsWith(selectedMonth)).sort((a, b) => a.date.localeCompare(b.date));
  const data = stages.map(stage => ({...stage, value: sum(slice, stage.key, true)}));
  const focused = data[currentStage];
  const dates = [...new Set(slice.map(row => row.date))];
  const daily = dates.map(date => ({date, clicks: sum(slice.filter(row => row.date === date), 'clicks')}));
  const peakClicks = Math.max(1, ...daily.map(day => day.clicks ?? 0));
  const peak = Math.max(1, ...data.map(stage => stage.value ?? 0));
  const stageWidth = (index: number) => {
    const value = data[index]?.value;
    return value == null ? 66 : 66 + (value / peak) * 270;
  };
  const selectedGoal = goals.find(item => item.id === goal)!;
  const destination = workspace?.destinations.find(item => item.platform === platform && item.kind === 'conversion' && item.outcome === goal);
  const acceptedCount = batch ? (batch.counts.accepted || 0) + (batch.counts.processed || 0) : null;
  const economics = actualBatchEconomics(batch);
  const settings = {platform, outcome: goal, matching, maxClickAge};
  const validAge = maxClickAge === '' || /^([1-9]|[1-8][0-9]|90)$/.test(maxClickAge);

  return <div className="cv-operational">
    <div className="cv-results-heading cv-goals-heading">
      <div><h2>Conversion Funnel &amp; Flow</h2><p className="cv-caption">Campaign reports, CRM signal settings and delivery receipts.</p></div>
      <div className="cv-goal-options" role="group" aria-label="Conversion goal">
        {goals.map(item => <button key={item.id} type="button" aria-pressed={item.id === goal} onClick={() => {
          setGoal(item.id);setCurrentStage(item.id === 'completed_sale' ? 4 : 3);
        }}>{item.label}</button>)}
      </div>
    </div>

    <section className="cv-pane cv-settings-card" aria-label="Report and conversion settings">
      <div className="cv-operational-settings">
        <label>Ad platform<select className="dm-input" value={platform} onChange={e => {setPlatform(e.target.value as Platform);setMonth('');setBatchId('');}}>
          {['google', 'meta', 'linkedin'].map(item => <option key={item} value={item}>{platforms[item]}</option>)}
        </select></label>
        <label>Reporting month<select className="dm-input" value={selectedMonth || ''} disabled={!months.length} onChange={e => setMonth(e.target.value)}>
          {!months.length && <option value="">{loading ? 'Loading export…' : 'No saved export'}</option>}
          {months.map(item => <option key={item} value={item}>{monthLabel(item)}</option>)}
        </select></label>
        <label>Match identifiers<select className="dm-input" value={platform === 'google' ? matching : 'email'} disabled={platform !== 'google'} onChange={e => setMatching(e.target.value as ConversionMatching)}>
          <option value="automatic">GCLID or consented email</option><option value="gclid">Require GCLID</option><option value="email">Consented email only</option>
        </select></label>
        <label>Click-age limit (days)<input className="dm-input" type="number" min={1} max={90} step={1} placeholder={platform === 'google' ? 'Provider window' : 'Google only'}
          value={platform === 'google' ? maxClickAge : ''} disabled={platform !== 'google'} aria-invalid={platform === 'google' && !validAge}
          onChange={e => setMaxClickAge(e.target.value)}/></label>
      </div>
      <div className="cv-report-kpis">
        <div><span>Monthly ad spend</span><strong>{display(sum(slice, 'spend'))}</strong><small>Saved export · currency unspecified</small></div>
        <div><span>Monthly inquiries</span><strong>{display(data[0].value)}</strong><small>{dates.length ? `${dates.length} reported days` : 'No reporting period'}</small></div>
        <div><span>Average won deal</span><strong>{economics.average}</strong><small>Accepted closed-won records</small></div>
        <div><span>Click to outcome</span><strong>{economics.lag}</strong><small>Accepted rows with click timestamps</small></div>
      </div>
    </section>

    <section className="cv-pane cv-original-funnel" id="conversion-funnel">
      <div className="cv-pane-title cv-results-heading">
        <div><h3>Demand Waterfall Funnel</h3><p>{selectedMonth ? `${platforms[platform]} · ${monthLabel(selectedMonth)}` : 'Saved campaign outcomes'}</p></div>
        {workspace && <span className="cv-delivery-state">{workspace.live_enabled ? 'Live delivery enabled' : 'Live delivery disabled'}</span>}
      </div>
      {reportError && <p role="alert" className="dm-notice dm-notice-error">{reportError} <button onClick={() => setRevision(v => v + 1)} className="dm-text-button">Retry</button></p>}
      <div className="cv-funnel-layout">
        <div>
          <div className="cv-funnel-labels" aria-hidden="true"><span>Stage</span><span>Reported volume</span></div>
          <div className="cv-funnel-stages" role="group" aria-label="Demand waterfall stages">
            {data.map((item, index) => {
              const top = stageWidth(index);
              const bottom = Math.min(top - 9, stageWidth(index + 1));
              return <button key={item.key} aria-pressed={currentStage === index} onClick={() => setCurrentStage(index)} aria-label={`${item.label}: ${item.value == null ? 'not reported' : display(item.value)}`}>
                <span>{item.label}</span>
                <svg viewBox="0 0 350 51" aria-hidden="true">
                  <polygon points={`${175 - top / 2},0 ${175 + top / 2},0 ${175 + bottom / 2},51 ${175 - bottom / 2},51`} fill={item.value == null ? '#e8edf3' : item.color}/>
                  <text x="175" y="32" textAnchor="middle" fill={item.value == null ? '#4f6078' : '#fff'}>{display(item.value)}</text>
                </svg>
              </button>;
            })}
          </div>
          <p className="cv-caption">{loading ? 'Loading campaign report…' : 'Reported stage counts are independent. Missing values appear as a dash.'}</p>
        </div>
        <aside className="cv-funnel-detail">
          <span className="cv-caption">{focused.label} · {selectedMonth ? monthLabel(selectedMonth) : 'No reporting period'}</span>
          <h3>{selectedGoal.label}</h3>
          <dl><div><dt>Selected stage</dt><dd>{display(focused.value)}</dd></div><div><dt>CRM destination</dt><dd>{destination?.name || 'Unassigned'}</dd></div></dl>
          <p className="cv-caption">Review eligible CRM rows for this goal. Select a destination before sending.</p>
          <button className="dm-button dm-button-primary" disabled={platform === 'google' && !validAge} onClick={() => onStart('conversion', settings)}><CloudUpload size={15}/> Import offline conversions</button>
          {!validAge && platform === 'google' && <p className="cv-caption" role="alert">Choose a whole number from 1 to 90 days.</p>}
          <button className="dm-button" onClick={() => onStart('add', settings)}><Users size={15}/> Sync an audience</button>
          <button className="dm-text-button" onClick={onDestinations}>Manage destinations <ArrowRight size={14}/></button>
        </aside>
      </div>
    </section>

    <section className="cv-pane cv-operational-history">
      <div className="cv-pane-title cv-results-heading">
        <div><h3>Campaign Timeline</h3><p>{dates.length ? `${display(sum(slice, 'clicks'))} reported clicks in this period` : 'Daily clicks in the selected reporting period.'}</p></div>
        {dates.length > 0 && <span className="cv-caption">{dayLabel(dates[0])} – {dayLabel(dates[dates.length - 1])}</span>}
      </div>
      {dates.length ? <>
        <div className="cv-timeline" role="img" aria-label="Daily reported clicks">
          {daily.map(day => <div key={day.date} title={`${dayLabel(day.date)} · ${display(day.clicks)} clicks`}><i style={{height: `${(day.clicks ?? 0) / peakClicks * 100}%`}}/></div>)}
        </div>
        <details className="cv-daily-details">
          <summary>Daily values</summary>
          <ul>{daily.map(day => <li key={day.date}><span>{dayLabel(day.date)}</span><strong>{display(day.clicks)}</strong></li>)}</ul>
        </details>
      </> : <p className="cv-caption">No daily clicks are available for this selection.</p>}
    </section>

    <section className="cv-pane">
      <div className="cv-pane-title cv-results-heading">
        <div><h3>Conversion Value</h3><p>Accepted and processed rows from the selected batch.</p></div>
        <button className="dm-text-button" onClick={onHistory}>Run history <ChevronRight size={15}/></button>
      </div>
      <label className="cv-batch-select">Reviewed batch<select className="dm-input" value={selectedBatch?.id || ''} onChange={e => setBatchId(e.target.value)}>
        {!platformBatches.length && <option value="">No reviewed batches for {platforms[platform]}</option>}
        {platformBatches.map(item => <option key={item.id} value={item.id}>{item.destination.name} · {new Date(item.created).toLocaleString()}</option>)}
      </select></label>
      {batchError && <p className="cv-caption" role="alert">{batchError}</p>}
      <div className="cv-report-kpis cv-economics">
        <div><span>Reported spend</span><strong>{display(sum(slice, 'spend'))}</strong><small>Export does not identify currency</small></div>
        <div><span>Accepted or processed</span><strong>{display(acceptedCount)}</strong><small>Selected CRM batch</small></div>
        <div><span>Reported conversion value</span><strong>{economics.recorded}</strong><small>By submitted currency</small></div>
        <div><span>Campaign ROAS</span><strong>—</strong><small>Requires attributed revenue and matching spend currency</small></div>
      </div>
    </section>

    <ConversionFlow key={batch?.id || 'empty'} batch={batch} onOpenBatch={onBatch}/>
  </div>;
}
