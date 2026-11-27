import {useEffect, useRef, useState} from 'react';
import type {FormEvent} from 'react';
import {X} from 'lucide-react';
import {getConversionWorkspace, reviewConversionFile, runConversionAction} from '../services/api';
import type {ConversionBatchDetail, ConversionMatching, ConversionWorkspace} from '../services/api';

export const inputStyle = 'block w-full rounded-md border border-slate-300 bg-white p-2 text-sm';
export const outlineButton = 'inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50';
export const primaryButton = 'inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50';

export function ConversionSignalImport({outcomes, onImport, onClose}: {
  outcomes: Record<string, string>;
  onImport: (batch: ConversionBatchDetail) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [entryMode, setEntryMode] = useState<'csv' | 'single'>('csv');
  const [workspace, setWorkspace] = useState<ConversionWorkspace | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function loadWorkspace() {
    setLoading(true);
    setError('');
    try {
      setWorkspace(await getConversionWorkspace());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load the workspace.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    dialog.current?.showModal();
    void loadWorkspace();
  }, []);

  async function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const values = new FormData(event.currentTarget);
    const file = values.get('file');
    const outcome = String(values.get('outcome') || '');
    const matching = values.get('matching') as ConversionMatching;
    const options = {
      platform: 'google', operation: 'conversion', matching,
      ...(outcome ? {expected_outcome: outcome} : {}),
    } as const;
    setBusy(true);
    setError('');
    try {
      let batch: ConversionBatchDetail;
      if (entryMode === 'csv') {
        if (!(file instanceof File) || !file.size) throw new Error('Choose a CSV file with at least one conversion.');
        batch = await reviewConversionFile(file, options);
      } else {
        const fields = ['event_id', 'occurred_at', 'email', 'gclid', 'click_at', 'outcome', 'ad_user_data', 'value', 'currency'];
        const record = Object.fromEntries(fields.map(key => [key, String(values.get(key) || '').trim()]));
        if (!record.email && !record.gclid) throw new Error('Enter a Google click ID or CRM email.');
        batch = await runConversionAction({action: 'review', ...options, record});
      }
      form.current?.reset();
      dialog.current?.close();
      onImport(batch);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not review the file.');
    } finally {
      setBusy(false);
    }
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([workspace?.templates.conversion || ''], {type: 'text/csv'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'offline-conversions.csv';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <dialog ref={dialog} aria-labelledby="signal-import-title" onClose={onClose}
    onCancel={event => {if (busy) event.preventDefault();}}
    className="m-auto w-[calc(100%-1.5rem)] max-w-lg max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl backdrop:bg-slate-900/35">
    <div className="flex items-center justify-between gap-3">
      <h2 id="signal-import-title" className="text-lg font-bold">Upload conversion signal</h2>
      <button type="button" onClick={() => dialog.current?.close()} disabled={busy}
        aria-label="Close conversion upload" className="p-2 rounded-md hover:bg-slate-100"><X className="size-4" /></button>
    </div>
    <p className="mt-2 text-sm text-slate-600">Enter a Google Ads conversion from your CRM or upload a CSV. Review checks each record and saves it for delivery approval.</p>
    {loading && <p className="mt-3 text-sm" role="status">Checking workspace access…</p>}
    {error && <p className="mt-3 rounded-md bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error} {!workspace && <button
      className="ml-1 font-semibold underline" onClick={() => void loadWorkspace()}>Retry</button>}</p>}
    {workspace && !workspace.can_manage && <p className="mt-3 text-sm">A workspace owner can upload conversion signals.</p>}
    {workspace && !workspace.live_enabled && <p className="mt-3 rounded-md bg-slate-50 p-2 text-sm text-slate-700">Review only · Live delivery is disabled in this workspace.</p>}
    {workspace?.can_manage && !workspace.destinations.some(item => item.platform === 'google' && item.kind === 'conversion') &&
      <p className="mt-2 text-sm text-slate-600">Save a Google Ads conversion action when you’re ready to deliver reviewed records.{' '}
        <a className="font-semibold text-teal-800 underline" href="/?conversion_view=destinations#conversions" target="_top">Set up a destination</a>
      </p>}
    <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Source">
      {(['csv', 'single'] as const).map(mode => <button type="button" key={mode} disabled={busy}
        aria-pressed={entryMode === mode} className={entryMode === mode ? primaryButton : outlineButton}
        onClick={() => {setEntryMode(mode); setError('');}}>{mode === 'csv' ? 'Upload CSV' : 'Enter one signal'}</button>)}
    </div>
    <form ref={form} key={entryMode} onSubmit={review} className="mt-4 space-y-4">
      <fieldset disabled={!workspace?.can_manage || loading || busy} className="space-y-3">
        {entryMode === 'csv' ? <label className="block space-y-1 text-sm font-medium">
          <span>CRM CSV file</span>
          <input type="file" name="file" accept=".csv,text/csv" required className={inputStyle} />
        </label> : <SingleSignalFields />}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium">
            <span>CRM outcome</span>
            <select name="outcome" className={inputStyle} required={entryMode === 'single'}>
              <option value="">{entryMode === 'csv' ? 'Use the CSV outcome' : 'Choose an outcome'}</option>
              {Object.entries(outcomes).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm font-medium">
            <span>Match identifiers</span>
            <select name="matching" className={inputStyle}>
              <option value="automatic">GCLID or consented email</option>
              <option value="gclid">Require GCLID</option>
              <option value="email">Consented email only</option>
            </select>
          </label>
        </div>
        {entryMode === 'csv' && <p className="text-xs text-slate-600">Up to 250 rows. Include an event ID, a timestamp with timezone, an identifier, and recorded ad data consent.</p>}
        <div className="flex flex-wrap gap-2">
          <button type="submit" className={primaryButton}>{busy ? 'Reviewing…' : 'Review and show flow'}</button>
          {entryMode === 'csv' && <button type="button" onClick={downloadTemplate} className={outlineButton}>CSV template</button>}
        </div>
      </fieldset>
    </form>
  </dialog>;
}

function SingleSignalFields() {
  const fields = [
    {name: 'event_id', label: 'CRM event ID', maxLength: 64, required: true},
    {name: 'occurred_at', label: 'Outcome timestamp', maxLength: 40, required: true, placeholder: '2026-11-22T09:30:00+08:00'},
    {name: 'email', label: 'CRM email', maxLength: 254, type: 'email'},
    {name: 'gclid', label: 'Google click ID (GCLID)', maxLength: 512},
    {name: 'click_at', label: 'Click timestamp (optional)', maxLength: 40, placeholder: '2026-11-20T09:30:00+08:00'},
  ];
  return <>
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map(({label, name, ...attributes}) => <label key={name} className="space-y-1 text-sm font-medium">
        <span>{label}</span>
        <input name={name} className={inputStyle}
          aria-describedby={name.endsWith('_at') ? 'conversion-time-help' : undefined} {...attributes}/>
      </label>)}
      <label className="space-y-1 text-sm font-medium">
        <span>Ad data consent</span>
        <select name="ad_user_data" className={inputStyle} defaultValue="unknown">
          <option value="unknown">Unknown</option>
          <option value="granted">Granted</option>
          <option value="denied">Denied</option>
        </select>
      </label>
    </div>
    <p id="conversion-time-help" className="text-xs text-slate-600">Copy the CRM timestamps with their timezone offset or use UTC with Z.</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1 text-sm font-medium">
        <span>Value (optional)</span>
        <input name="value" inputMode="decimal" placeholder="e.g. 1500.00" maxLength={19} className={inputStyle}/>
      </label>
      <label className="space-y-1 text-sm font-medium">
        <span>Currency (if value provided)</span>
        <input name="currency" autoCapitalize="characters" placeholder="e.g. USD" maxLength={3} className={inputStyle}/>
      </label>
    </div>
  </>;
}
