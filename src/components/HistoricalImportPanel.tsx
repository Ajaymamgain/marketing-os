import React, {useEffect,useState} from 'react';
import {Upload,Database,RefreshCw,ShieldCheck,ArrowRight,TriangleAlert} from 'lucide-react';
import {fetchHistoricalImports,previewHistoricalImport,updateHistoricalImport,type HistoricalImport} from '../services/api';

const date=(value:string|null)=>value ? new Date(value).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}) : 'No accepted dates';
async function csvText(file:File|null) {
  if (!file) return undefined;
  if (file.size > 40*1024*1024) throw new Error('Each file must be at most 40 MiB. Split larger exports into batches.');
  try {return new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());}
  catch {throw new Error('Save your files as UTF-8 CSV and try again.');}
}

export function HistoricalImportPanel() {
  const [canEdit,setCanEdit]=useState(false);
  const [source,setSource]=useState('marketo');
  const [file,setFile]=useState<File|null>(null);
  const [contacts,setContacts]=useState<File|null>(null);
  const [mapping,setMapping]=useState<File|null>(null);
  const [imports,setImports]=useState<HistoricalImport[]>([]);
  const [preview,setPreview]=useState<HistoricalImport|null>(null);
  const [busy,setBusy]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [historyError,setHistoryError]=useState<string|null>(null);
  const [message,setMessage]=useState<string|null>(null);
  const [releaseReview,setReleaseReview]=useState<string|null>(null);
  useEffect(()=>{
    let active=true;
    fetch('/v1/auth/me',{credentials:'include'}).then(r=>r.ok?r.json():null)
      .then(s=>{if(active) setCanEdit(['owner','admin'].includes(s?.role));}).catch(()=>{});
    return ()=>{active=false;};
  },[]);
  useEffect(()=>{
    if (!canEdit) return;
    let active=true;
    const refresh=()=>fetchHistoricalImports().then(rows=>{if(active) {setHistoryError(null);setImports(rows);setPreview(old=>old ? rows.find(row=>row.id===old.id)||old : null);}})
      .catch(cause=>{if(active) setHistoryError(cause instanceof Error?cause.message:'Import history unavailable');});
    refresh();
    const timer=window.setInterval(()=>{if(document.visibilityState==='visible') refresh();},5000);
    return ()=>{active=false;window.clearInterval(timer);};
  },[canEdit]);
  const refresh=async()=>{const rows=await fetchHistoricalImports();setImports(rows);setHistoryError(null);};
  const validate=async(e:React.FormEvent)=>{
    e.preventDefault();if(!file) return;
    setBusy('preview');setError(null);setMessage(null);setPreview(null);
    try {
      const total=file.size+(contacts?.size||0)+(mapping?.size||0);
      if(total>50*1024*1024) throw new Error('Upload at most 50 MiB per batch, including mapping files.');
      const [csv,leads_csv,mappings_csv]=await Promise.all([csvText(file),source==='marketo'?csvText(contacts):undefined,source==='marketo'?csvText(mapping):undefined]);
      const next=await previewHistoricalImport({source,filename:file.name,csv:csv!,leads_csv,mappings_csv});
      setPreview(next);await refresh();
    } catch(cause) {setError(cause instanceof Error?cause.message:'Import preview failed');}
    finally {setBusy(null);}
  };
  const update=async(item:HistoricalImport,action:'commit'|'release')=>{
    setBusy(item.id);setError(null);setMessage(null);
    try {
      const next=await updateHistoricalImport(item.id,action);setPreview(old=>old?.id===next.id?next:old);setReleaseReview(null);await refresh();
      setMessage(action==='commit'?'Backfill queued. Original dates are preserved; campaign activation remains held.':'Activation hold released. Normal automation still requires current decision approval, consent, coverage, and mapped destinations.');
    } catch(cause) {setError(cause instanceof Error?cause.message:'Could not update import');}
    finally {setBusy(null);}
  };
  return <section className="dm-backfill dm-panel" aria-label="Customer data backfill">
    <div className="dm-section-heading"><div><p className="dm-eyebrow">CUSTOMER ONBOARDING</p><h2><Database size={18}/> Import historical data</h2><p className="dm-muted">Add authorized historical exports to the workspace event ledger. Preview identities, dates and mappings before importing; provider delivery stays on hold.</p></div><span className="dm-badge"><ShieldCheck size={13}/> Tenant-scoped backfill</span></div>
    <p className="dm-notice">This import changes workspace data. Accepted events queue scoring and next-action evaluation; automatic evaluations wait while automatic decisions are off. The chart replay below only changes the view.</p>
    {error && <p role="alert" className="dm-notice dm-notice-warning">{error}</p>}
    {historyError && <p role="status" className="dm-notice dm-notice-warning">Import history is temporarily unavailable: {historyError}</p>}
    {message && <p role="status" className="dm-notice">{message}</p>}
    {!canEdit ? <p className="dm-muted">A workspace owner can upload and approve historical data.</p> : <>
      <details className="dm-backfill-form"><summary><Upload size={16}/> Upload and validate CSV files</summary>
        <form onSubmit={validate}><fieldset disabled={busy!==null} className="dm-backfill-fields">
          <label>Data format<select value={source} onChange={e=>{setSource(e.target.value);setPreview(null);setContacts(null);setMapping(null);}}><option value="marketo">Marketo bulk activity export</option><option value="activities">Normalized person-level activities</option><option value="ads">Advertising campaign reporting</option></select></label>
          <label>Activity or reporting CSV<input required type="file" accept=".csv,text/csv" onChange={e=>{setFile(e.target.files?.[0]||null);setPreview(null);}}/></label>
          {source==='marketo' && <div className="dm-backfill-columns"><label>Contact identity CSV<input type="file" accept=".csv,text/csv" onChange={e=>{setContacts(e.target.files?.[0]||null);setPreview(null);}}/><small>Columns: leadId, email, account_domain. Optional title, name, need_key.</small></label><label>Campaign → need CSV<input type="file" accept=".csv,text/csv" onChange={e=>{setMapping(e.target.files?.[0]||null);setPreview(null);}}/><small>Columns: campaignId, need_key. Existing verified workspace mappings can also resolve the need.</small></label></div>}
          <p className="dm-muted">{source==='activities'?'Required columns: id, email, account_domain, need_key, activity_type, occurred_at. Use ISO dates with a timezone, for example 2023-07-06T14:30:00Z.':source==='ads'?'Required columns: date, platform, campaign. Optional spend, impressions, clicks and funnel outcome fields. Blank metrics remain unknown; campaign totals cannot score a person.':'Required columns: marketoGUID, leadId, activityDate, activityTypeId. Lead identity and need mapping must resolve before an event can enter scoring.'}</p>
          <p className="dm-footnote">Up to 200,000 rows and 40 MiB per file; 50 MiB total. Invalid rows are quarantined. This upload does not grant consent or overwrite current contact titles.</p>
          <button className="dm-button dm-button-primary" disabled={!file || busy!==null}><Upload size={15}/>{busy==='preview'?'Validating…':'Preview import'}</button>
        </fieldset></form>
      </details>
      {preview && <div className="dm-backfill-preview" aria-live="polite"><div className="dm-section-heading"><h3>{preview.filename}</h3><span className="dm-badge">{preview.status}</span></div>
        <div className="dm-backfill-stats">{[['Source rows',preview.summary.total_rows],['Accepted',preview.summary.accepted_rows],['Quarantined',preview.summary.quarantined_rows],['Affected units',preview.summary.affected_units]].map(([label,value])=><div key={label}><strong>{Number(value).toLocaleString()}</strong><span>{label}</span></div>)}</div>
        <p className="dm-muted">{date(preview.summary.date_start)} – {date(preview.summary.date_end)} · {preview.summary.excluded_activity_rows.toLocaleString()} non-intent / bot rows excluded · {preview.summary.duplicate_file_rows.toLocaleString()} duplicate rows excluded</p>
        {preview.summary.issues.length>0 && <details><summary><TriangleAlert size={15}/> Review quarantined rows</summary><ul className="dm-backfill-issues">{preview.summary.issues.map(issue=><li key={issue.row}>Row {issue.row}: {issue.reason.replaceAll('_',' ')}</li>)}</ul></details>}
        <p className="dm-muted">Importing queues accepted rows only. Scores reflect their original age; old events are not rewritten as fresh intent. Provider activation requires a separate review.</p>
        {preview.status==='preview' && <button className="dm-button dm-button-primary" disabled={!preview.summary.accepted_rows || busy!==null} onClick={()=>update(preview,'commit')}>Import {preview.summary.accepted_rows.toLocaleString()} accepted rows <ArrowRight size={15}/></button>}
      </div>}
      <div className="dm-section-heading dm-backfill-history-head"><h3>Import history</h3><button className="dm-button dm-button-secondary" disabled={busy!==null} onClick={()=>{setBusy('refresh');refresh().catch(cause=>setHistoryError(cause.message)).finally(()=>setBusy(null));}} aria-label="Refresh import history"><RefreshCw size={15}/> Refresh</button></div>
      {!imports.length && <p className="dm-muted">No historical imports yet. Chart replay below is separate from workspace ingestion.</p>}
      <div className="dm-backfill-history">{imports.map(item=><article key={item.id}><div><strong>{item.filename}</strong><p className="dm-muted">{item.status} · {item.processed_rows.toLocaleString()} / {item.summary.accepted_rows.toLocaleString()} rows processed · {item.scoring.jev_evaluated} / {item.scoring.units} units evaluated automatically</p><p className="dm-footnote">{item.held_units ? `${item.held_units} ${item.held_units===1?'unit':'units'} on activation hold` : item.status==='preview' ? 'Preview only; workspace unchanged' : item.summary.reporting_rows ? 'Campaign reporting only; no person scoring' : 'No import activation hold'}{item.last_error ? ` · ${item.last_error}`:''}</p></div><div className="dm-playbook-actions">
        <button className="dm-button dm-button-secondary" onClick={()=>setPreview(item)}>Inspect</button>
        {item.status==='failed' && <button className="dm-button dm-button-secondary" disabled={busy!==null} onClick={()=>update(item,'commit')}>Retry import</button>}
        {item.status==='completed' && item.held_units>0 && <button className="dm-button dm-button-secondary" disabled={busy!==null || item.scoring.pending>0} onClick={()=>setReleaseReview(item.id)}>Review activation</button>}
        {releaseReview===item.id && <div className="dm-activation-review"><p>Enable normal automation for {item.held_units} imported units? Approved mappings may then update provider audiences. Consent and coverage gates still apply.</p><button className="dm-button dm-button-primary" disabled={busy!==null} onClick={()=>update(item,'release')}>Enable normal automation</button><button className="dm-button dm-button-secondary" onClick={()=>setReleaseReview(null)}>Keep on hold</button></div>}
      </div></article>)}</div>
    </>}
  </section>;
}
