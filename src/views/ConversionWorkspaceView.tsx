import {useEffect, useRef, useState} from 'react';
import type {FormEvent, ReactNode} from 'react';
import {ArrowDownToLine, ChevronRight, CloudUpload, RefreshCw} from 'lucide-react';
import {conversionBatchLink, getConversionBatch, getConversionWorkspace, reviewConversionFile, runConversionAction} from '../services/api';
import type {ConversionBatch, ConversionBatchDetail, ConversionDestination, ConversionMatching, ConversionReceipt, ConversionWorkspace} from '../services/api';
import {ConversionOverview} from './ConversionOverview';
import type {ConversionReviewSettings} from './ConversionOverview';
import './conversion-workspace.css';

type Platform = ConversionDestination['platform'];
type Operation = ConversionBatch['operation'];
type View = 'simulator' | 'overview' | 'delivery' | 'audiences' | 'destinations' | 'history';
const platforms: Record<Platform, string> = {google: 'Google Ads', meta: 'Meta', linkedin: 'LinkedIn'};
const operations: Record<Operation, string> = {conversion: 'Offline conversion', add: 'Add audience members', remove: 'Remove audience members'};
const views: Record<View, string> = {simulator: 'Working example', overview: 'Delivery overview', delivery: 'Offline conversions', audiences: 'Customer sync', destinations: 'Destinations', history: 'Run history'};
const status: Record<string, string> = {
  ready: 'Ready', blocked: 'Held', sending: 'Sending',
  accepted: 'Accepted', processed: 'Processed', failed: 'Failed', uncertain: 'Check provider',
};
const outcomes: Record<string, string> = {
  qualified_lead: 'Qualified lead', converted_lead: 'Converted lead', completed_sale: 'Completed sale',
  meeting_booked: 'Meeting booked', meeting_held: 'Meeting held', proposal_sent: 'Proposal sent',
};

function incomingView(): View {
  const value = new URLSearchParams(location.search).get('conversion_view');
  if (value === 'delivery' && incomingOperation() !== 'conversion') return 'audiences';
  return value === 'overview' || value === 'delivery' || value === 'audiences' || value === 'destinations' || value === 'history' ? value : 'simulator';
}
function incomingPlatform(): Platform {
  const value = new URLSearchParams(location.search).get('platform');
  return value === 'meta' || value === 'linkedin' ? value : 'google';
}
function incomingOperation(): Operation {
  const query = new URLSearchParams(location.search);
  const value = query.get('operation');
  return value === 'add' || value === 'remove' ? value : query.get('conversion_view') === 'audiences' ? 'add' : 'conversion';
}
function download(text: string) {
  const url = URL.createObjectURL(new Blob([text], {type: 'text/csv'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'dual-motion-ads-import.csv';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const total = (counts: Record<string, number>) => Object.values(counts).reduce((sum, count) => sum + count, 0);
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'short'}) : '—';

function Receipts({rows, diagnostics}: {rows: ConversionReceipt[]; diagnostics?: (line: number) => void}) {
  return <div className="cv-table-container"><table className="cv-table">
    <thead><tr><th scope="col">Row</th><th scope="col">Outcome</th><th scope="col">Matching data</th><th scope="col">Consent</th><th scope="col">Value</th><th scope="col">Result</th></tr></thead>
    <tbody>{rows.map(row => <tr key={row.line}>
      <td>{row.line}</td><td>{row.outcome ? outcomes[row.outcome] : '—'}{row.occurred_at && <small><time dateTime={row.occurred_at}>{formatDate(row.occurred_at)}</time></small>}</td>
      <td>{row.matched_by}</td><td className="capitalize">{row.consent}</td>
      <td className="cv-money">{row.value != null ? row.value.toLocaleString(undefined, {maximumFractionDigits: 6}) + ' ' + row.currency : '—'}</td>
      <td><span className={`cv-status is-${row.state}`}>{status[row.state] || row.state}</span><small>{row.message}</small>
        {row.reference && <small>Receipt {row.reference}</small>}
        {diagnostics && row.check_after && row.state === 'accepted' && <div className="cv-diagnostics">
          {Date.parse(row.check_after) <= Date.now() ? <button className="dm-text-button" onClick={() => diagnostics(row.line)}>Check Google status</button>
            : <small>Next check {formatDate(row.check_after)}</small>}
        </div>}
      </td>
    </tr>)}</tbody>
  </table></div>;
}

function Counts({counts}: {counts: Record<string, number>}) {
  const entries = [
    ['Imported', total(counts)], ['Ready', counts.ready || 0],
    ['Accepted or processed', (counts.accepted || 0) + (counts.processed || 0)],
    ['Needs attention', (counts.blocked || 0) + (counts.failed || 0) + (counts.uncertain || 0)],
  ];
  return <div className="cv-counts" aria-live="polite">{entries.map(([name, value]) => <div key={name}><span>{name}</span><strong>{value}</strong></div>)}</div>;
}

const blankDestination = {
  platform: 'google', kind: 'conversion', name: '', target: '', token: '', account: '', manager: '',
  outcome: 'qualified_lead', event: 'Lead', source: 'system_generated', terms: false,
} satisfies Record<string, string | boolean>;

function DestinationForm({busy, onSave}: {busy: boolean; onSave: (body: Record<string, unknown>) => Promise<boolean>}) {
  const [form, setForm] = useState(blankDestination);
  const set = (field: keyof typeof form, value: string | boolean) => setForm(old => ({...old, [field]: value}));
  const fields = form.platform === 'google' ? 'Google Ads conversion action or Customer Match list'
    : form.platform === 'meta' ? 'Meta dataset or Custom Audience' : 'LinkedIn conversion rule or DMP segment';
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (await onSave(form)) setForm(old => ({...old, token: '', name: '', target: ''}));
  }
  const field = (label: string, id: keyof typeof form, attrs?: {placeholder?: string; required?: boolean; type?: string; inputMode?: 'numeric'}) => <label>{label}<input className="dm-input" value={String(form[id])} onChange={e => set(id, e.target.value)} {...attrs}/></label>;
  return <form className="cv-pane" onSubmit={submit}>
    <div className="cv-pane-title"><h2>Save a destination</h2><p>{fields}. Saving stores the credential for your workspace.</p></div>
    <fieldset className="cv-form-grid" disabled={busy}>
      <label>Platform<select className="dm-input" value={form.platform} onChange={e => set('platform', e.target.value)}>
        {Object.entries(platforms).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      <label>Asset type<select className="dm-input" value={form.kind} onChange={e => set('kind', e.target.value)}><option value="conversion">Conversion action</option><option value="audience">Audience</option></select></label>
      {field('Display name', 'name', {required: true})}
      {field('Platform asset ID', 'target', {required: true, inputMode: 'numeric'})}
      {form.platform === 'google' && <>{field('Google Ads account ID', 'account', {required: true, inputMode: 'numeric'})}{field('Manager account ID (optional)', 'manager', {inputMode: 'numeric'})}</>}
      {form.kind === 'conversion' && <label>CRM outcome<select className="dm-input" value={form.outcome} onChange={e => set('outcome', e.target.value)}>
        {Object.entries(outcomes).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>}
      {form.platform === 'meta' && form.kind === 'conversion' && <>
        {field('Meta event name', 'event', {required: true})}
        <label>Offline source<select className="dm-input" value={form.source} onChange={e => set('source', e.target.value)}><option value="system_generated">CRM or system</option><option value="physical_store">In store</option><option value="phone_call">Phone call</option><option value="other">Other offline activity</option></select></label>
      </>}
      <label>Bearer token<input className="dm-input" type="password" autoComplete="off" required value={form.token} onChange={e => set('token', e.target.value)}/></label>
      {form.platform === 'google' && form.kind === 'audience' && <label className="cv-inline-check"><input type="checkbox" checked={form.terms} onChange={e => set('terms', e.target.checked)}/> Customer Match terms accepted in Google Ads</label>}
    </fieldset>
    <p className="cv-caption">{form.platform === 'google' ? 'Use a Data Manager–scoped OAuth access token.' : form.platform === 'meta' ? 'Use a token authorized for the selected dataset or audience.' : form.kind === 'conversion' ? 'Use a Conversions API token with conversion write access.' : 'Use a Matched Audiences token with rw_dmp_segments access.'}</p>
    <button className="dm-button dm-button-primary" disabled={busy}>Save destination</button>
  </form>;
}

export function ConversionWorkspaceView({refreshKey}: {refreshKey?: number}) {
  const [view, setView] = useState<View>(incomingView);
  const [workspace, setWorkspace] = useState<ConversionWorkspace | null>(null);
  const [platform, setPlatform] = useState<Platform>(incomingPlatform);
  const [operation, setOperation] = useState<Operation>(incomingOperation);
  const [batch, setBatch] = useState<ConversionBatchDetail | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [destination, setDestination] = useState('');
  const [assignment, setAssignment] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [expectedOutcome, setExpectedOutcome] = useState(() => {
    const value = new URLSearchParams(location.search).get('conversion_outcome');
    return value && Object.hasOwn(outcomes, value) ? value : '';
  });
  const [matching, setMatching] = useState<ConversionMatching>(() => {
    const value = new URLSearchParams(location.search).get('conversion_matching');
    return value === 'gclid' || value === 'email' ? value : 'automatic';
  });
  const [maxClickAge, setMaxClickAge] = useState('');
  const googleConversion = platform === 'google' && operation === 'conversion';
  const validAge = !googleConversion || maxClickAge === '' || /^([1-9]|[1-8][0-9]|90)$/.test(maxClickAge);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  useEffect(() => {mounted.current = true; return () => {mounted.current = false;};}, []);

  const refresh = async () => setWorkspace(await getConversionWorkspace());
  useEffect(() => {
    if (view !== 'simulator') void refresh().catch(reason => setError(reason.message));
  }, [view, refreshKey]);
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('batch');
    if (incomingView() === 'history' && id) {
      void getConversionBatch(id).then(setBatch).catch(reason => setError(reason.message));
    }
  }, []);

  async function act(work: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {await work(); return true;}
    catch (reason) {setError(reason instanceof Error ? reason.message : 'Conversion request failed.'); return false;}
    finally {setBusy(false);}
  }
  const changeView = (next: View, requested?: Operation) => {
    const nextOperation = next === 'delivery' ? 'conversion'
      : next === 'audiences' ? requested || (operation === 'remove' ? 'remove' : 'add') : operation;
    if (nextOperation !== operation) {
      setOperation(nextOperation);
      setBatch(null);
      setDestination('');
      setFile(null);
    }
    setView(next);
    const url = new URL(location.href);
    for (const key of ['conversion_view', 'platform', 'operation', 'batch', 'conversion_outcome', 'conversion_matching', 'conversion_trace']) url.searchParams.delete(key);
    if (next !== 'simulator') url.searchParams.set('conversion_view', next);
    if (next === 'audiences') url.searchParams.set('operation', nextOperation);
    history.replaceState(history.state, '', url);
    setError('');
    setConfirmation('');
    setAssignment('');
  };
  const changeOperation = (next: Operation) => {
    setOperation(next);
    setDestination('');
    setBatch(null);
  };
  const options = workspace?.destinations.filter(item =>
    item.platform === platform && item.kind === (operation === 'conversion' ? 'conversion' : 'audience') &&
    (operation !== 'conversion' || !expectedOutcome || item.outcome === expectedOutcome),
  ) || [];
  const startWithSettings = (next: Operation, settings: ConversionReviewSettings) => {
    setPlatform(settings.platform);
    setExpectedOutcome(next === 'conversion' ? settings.outcome : '');
    setMatching(settings.matching);
    setMaxClickAge(settings.maxClickAge);
    setBatch(null);
    setFile(null);
    setDestination('');
    changeView(next === 'conversion' ? 'delivery' : 'audiences', next);
  };
  const selected = options.find(item => item.id === destination);
  const assignmentOptions = batch && !batch.assigned ? workspace?.destinations.filter(item => item.platform === batch.destination.platform && item.kind === batch.destination.kind && (!batch.review_policy?.outcome || item.outcome === batch.review_policy.outcome)) || [] : [];

  async function sendBatch(start: ConversionBatchDetail) {
    await act(async () => {
      let current = start;
      while (mounted.current && current.counts.ready > 0) {
        const next = await runConversionAction<ConversionBatchDetail>({action: 'send', batch: current.id, confirmation});
        setBatch(next);
        // Stop the client loop on an uncertain or rejected row, leaving the remaining rows resumable.
        const failure = (next.counts.failed || 0) > (current.counts.failed || 0) ||
          (next.counts.uncertain || 0) > (current.counts.uncertain || 0);
        if (failure || next.counts.ready === current.counts.ready) break;
        current = next;
      }
      setConfirmation('');
      if (mounted.current) await refresh();
    });
  }

  const platformField: ReactNode = <label>Platform<select className="dm-input" value={platform} onChange={e => {
    setPlatform(e.target.value as Platform);
    setDestination('');
    setBatch(null);
  }}>{Object.entries(platforms).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>;
  const operationField: ReactNode = <label>Workflow<select className="dm-input" value={operation} onChange={e => changeOperation(e.target.value as Operation)}>
    <option value="add">Add audience members</option><option value="remove">Remove audience members</option></select></label>;

  if (view === 'simulator') {
    const id = new URLSearchParams(location.search).get('conversion_trace');
    const trace = id && /^[a-f0-9-]{36}$/.test(id) ? `?batch=${encodeURIComponent(id)}#flowchart` : '';
    return <iframe className="cv-simulator-frame" src={`/conversion-simulator.html${trace}`} title="Google Ads conversion funnel and flow" />;
  }

  return <div className="cv-root">
    <header className="dm-page-heading">
      <div><h1>Conversions</h1><p>Report campaign outcomes, send offline conversions, and manage ad audiences.</p></div>
    </header>
    <nav className="cv-tabs" aria-label="Conversion workspace">
      {(Object.keys(views) as View[]).map(key => <button key={key} aria-current={view === key ? 'page' : undefined} onClick={() => changeView(key)} disabled={busy}>{views[key]}</button>)}
    </nav>
    {error && <div className="dm-notice dm-notice-error" role="alert">{error} {!workspace && <button className="dm-button" onClick={() => void act(refresh)}>Retry</button>}</div>}
    {view === 'overview' && <ConversionOverview workspace={workspace} refreshKey={refreshKey}
      onStart={startWithSettings}
      onDestinations={() => changeView('destinations')}
      onHistory={() => changeView('history')}
      onBatch={id => {changeView('history'); void act(async () => setBatch(await getConversionBatch(id)));}} />}
    {(view === 'delivery' || view === 'audiences') && <section className="cv-pane">
      <div className="cv-pane-title"><h2>{view === 'audiences' ? 'Import audience changes' : 'Import offline conversions'}</h2><p>Upload up to 250 CRM records. You can assign a destination after review.</p></div>
      <fieldset className="cv-form-grid" disabled={busy || !workspace?.can_manage}>
        {platformField}{view === 'audiences' && operationField}
        {operation === 'conversion' && <label>CRM outcome<select className="dm-input" value={expectedOutcome} onChange={e => {
          setExpectedOutcome(e.target.value);setDestination('');setBatch(null);
        }}><option value="">Use the destination mapping</option>{Object.entries(outcomes).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>}
        {googleConversion && <>
          <label>Match identifiers<select className="dm-input" value={matching} onChange={e => {setMatching(e.target.value as ConversionMatching);setBatch(null);}}>
            <option value="automatic">GCLID or consented email</option><option value="gclid">Require GCLID</option><option value="email">Consented email only</option>
          </select></label>
          <label>Click-age limit (days)<input className="dm-input" type="number" min={1} max={90} step={1} value={maxClickAge} aria-invalid={!validAge}
            placeholder="Provider window" onChange={e => {setMaxClickAge(e.target.value);setBatch(null);}}/></label>
        </>}
        <label>Destination<select className="dm-input" value={selected?.id || ''} onChange={e => {setDestination(e.target.value); setBatch(null);}}>
          <option value="">Assign after review</option>
          {options.map(item => <option key={item.id} value={item.id}>{item.name} · {item.target}</option>)}</select></label>
        <label>CRM CSV file<input className="dm-input cv-file" type="file" accept=".csv,text/csv" onChange={e => {setFile(e.target.files?.[0] || null); setBatch(null);}}/></label>
      </fieldset>
      <div className="cv-actions">
        <button className="dm-button dm-button-primary" disabled={!file || !validAge || busy || !workspace?.can_manage} onClick={() => void act(async () => {
          if (!file) return;
          setBatch(await reviewConversionFile(file, {
            target: selected?.id, platform, operation,
            ...(operation === 'conversion' && expectedOutcome ? {expected_outcome: expectedOutcome} : {}),
            ...(googleConversion ? {matching, max_click_age: maxClickAge ? Number(maxClickAge) : null} : {}),
          }));
          await refresh();
        })}><CloudUpload size={16}/> Review file</button>
        <button className="dm-button" disabled={!workspace} onClick={() => workspace && download(workspace.templates[operation])}><ArrowDownToLine size={15}/> CSV template</button>
        {!options.length && <button className="dm-text-button" onClick={() => changeView('destinations')}>Set up a destination <ChevronRight size={15}/></button>}
      </div>
      {workspace && !workspace.live_enabled && <p className="cv-caption">Live delivery is disabled in this workspace. You can still validate real records.</p>}
      {workspace && !workspace.can_manage && <p className="cv-caption">A workspace owner can import files and manage delivery.</p>}
    </section>}
    {view === 'destinations' && <>
      <section className="cv-pane">
        <div className="cv-pane-title"><h2>Saved destinations</h2><p>Platform permissions are checked on delivery.</p></div>
        {!workspace?.destinations.length ? <p className="dm-empty">No conversion actions or audiences have been configured.</p> :
          <div className="cv-destinations">{workspace.destinations.map(item => <div key={item.id}><strong>{item.name}</strong><span>{platforms[item.platform]} · {item.target} · {item.kind === 'audience' ? 'Audience' : outcomes[item.outcome || ''] || 'Conversion action'}</span></div>)}</div>}
      </section>
      {workspace?.can_manage && <DestinationForm busy={busy} onSave={body => act(async () => {
        await runConversionAction({action: 'save_destination', ...body});
        await refresh();
      })}/>}
    </>}
    {view === 'history' && <section className="cv-pane">
      <div className="cv-pane-title cv-results-heading"><div><h2>Conversion batches</h2><p>Reviewed CRM files and their provider receipts.</p></div><button className="dm-button" disabled={busy} onClick={() => void act(refresh)}><RefreshCw size={15}/> Refresh</button></div>
      {!workspace?.batches.length ? <p className="dm-empty">No CRM batches yet.</p> : <div className="cv-history">
        {workspace.batches.map(item => <button key={item.id} disabled={busy} aria-pressed={batch?.id === item.id} onClick={() => void act(async () => setBatch(await getConversionBatch(item.id)))}>
          <span><strong>{item.destination.name}</strong><small>{platforms[item.destination.platform]} · {operations[item.operation]}</small></span>
          <span><strong>{total(item.counts)} rows</strong><small>{formatDate(item.created)}</small></span><ChevronRight size={16}/>
        </button>)}
      </div>}
    </section>}

    {batch && (view === 'delivery' || view === 'audiences' || view === 'history') && <section className="cv-pane">
      <div className="cv-pane-title cv-results-heading"><div><h2>{batch.mode === 'review' ? 'Delivery review' : 'Delivery receipts'}</h2><p>{batch.destination.name} · {operations[batch.operation]} · {batch.id.slice(0, 8)}</p></div>
        <div className="cv-actions">
          {batch.operation === 'conversion' && batch.destination.platform === 'google' &&
            <a className="dm-button" href={conversionBatchLink(batch.id, 'trace')}>View in flow <ChevronRight size={15}/></a>}
          <button className="dm-button" disabled={busy} onClick={() => void act(async () => setBatch(await getConversionBatch(batch.id)))}><RefreshCw size={15}/> Refresh batch</button>
        </div></div>
      <Counts counts={batch.counts}/>
      {batch.review_policy && <p className="cv-caption">
        {batch.review_policy.outcome ? `CRM outcome · ${outcomes[batch.review_policy.outcome]}` : ''}
        {batch.review_policy.matching === 'gclid' ? ' · GCLID required' : batch.review_policy.matching === 'email' ? ' · Email-only matching' : ''}
        {batch.review_policy.max_click_age ? ` · ${batch.review_policy.max_click_age}-day click-age limit` : ''}
      </p>}
      {!batch.assigned && workspace?.can_manage && batch.counts.ready > 0 && <div className="cv-inline cv-send">
        {assignmentOptions.length > 0 ? <>
          <label>Assign destination<select className="dm-input" value={assignment} onChange={e => setAssignment(e.target.value)}>
            <option value="">Choose a destination</option>
            {assignmentOptions.map(item => <option key={item.id} value={item.id}>{item.name} · {item.target}</option>)}
          </select></label>
          <button className="dm-button" disabled={!assignment || busy} onClick={() => void act(async () => {
            setBatch(await runConversionAction<ConversionBatchDetail>({action: 'assign', batch: batch.id, target: assignment}));
            await refresh();
          })}>Assign reviewed batch</button>
        </> : <>
          <p>Save a {platforms[batch.destination.platform]} destination to deliver eligible rows.</p>
          <button className="dm-button" onClick={() => changeView('destinations')}>Configure destination</button>
        </>}
      </div>}
      {batch.assigned && workspace?.live_enabled && workspace.can_manage && batch.counts.ready > 0 && <div className="cv-inline cv-send">
        {batch.mode === 'review' && <label>Confirm live delivery<input className="dm-input" value={confirmation} onChange={e => setConfirmation(e.target.value)} placeholder="Type SEND" autoComplete="off"/></label>}
        <button className="dm-button dm-button-primary" disabled={busy || (batch.mode === 'review' && confirmation !== 'SEND')} onClick={() => void sendBatch(batch)}>
          {busy ? 'Delivering…' : batch.mode === 'review' ? `Send ${batch.counts.ready} ${batch.counts.ready === 1 ? 'row' : 'rows'}` : 'Resume remaining rows'}</button>
      </div>}
      <Receipts rows={batch.rows} diagnostics={!busy && workspace?.live_enabled && workspace.can_manage && batch.destination.platform === 'google'
        ? line => void act(async () => setBatch(await runConversionAction<ConversionBatchDetail>({action: 'diagnostics', batch: batch.id, line}))) : undefined}/>
    </section>}
  </div>;
}
