import { OperationsInstructions, type InstructionProfile } from './OperationsInstructions';
import React, { useEffect, useState } from 'react';
import { Workflow, RefreshCw, ArrowRight, ShieldCheck, Search, Users, SlidersHorizontal, FileCheck2, Wrench, Clock3, CheckCircle2, ListChecks, KeyRound, X } from 'lucide-react';

type Fact = { field: string; value: string; source_url: string; quote: string; evidence_sequence: number };
type Report = { facts?: Fact[]; summary: string; proposal: string; outcome: string; evidence_sequences: number[] };
type Job = { id: string; workflow: string; target: string; status: string; updated_at: string; last_error?: string; result: { report?: Report; usage?: { model_calls: number; total_tokens: number } } };
type Step = { sequence: number; tool: string; status: string; result: Record<string, unknown> };
type State = { api_enabled?:boolean; instructions: Record<string, InstructionProfile>; research_configured: boolean; enabled: boolean; configured: boolean; installed: boolean; worker_healthy: boolean; state: string; workflows: string[]; automatic_workflows: string[]; targets: Record<string, Array<{ id: string; label: string }>>; jobs: Job[]; policy: { enabled: boolean; workflows: string[]; revision: number } };
const names: Record<string, string> = { 'connector-review':'MCP connector review', 'sync-investigation': 'Investigate a failed delivery', 'customer-onboarding': 'Review customer data', 'company-enrichment': 'Research company evidence', 'configuration-analysis': 'Analyze scoring configuration', 'people-enrichment': 'Research public professional roles' };
const stepNames: Record<string, string> = { dm_operation_context: 'Job evidence', dm_connector_inspect: 'Connector inspection', dm_analyze_data: 'Registered analysis', dm_extract_sources: 'Source extraction', dm_research_people: 'Professional role evidence', dm_research_company: 'Company source evidence', dm_configuration_preview: 'Configuration preview', dm_operation_submit: 'Validated report' };

async function read<T>(path: string): Promise<T> {
  const response = await fetch(path, { credentials: 'include' });
  if (!response.ok) throw new Error('Operations jobs could not load.');
  return response.json();
}
async function mutate(path: string, body: unknown) {
  const session = await read<{ csrf_token: string }>('/v1/auth/me');
  const response = await fetch(path, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': session.csrf_token }, body: JSON.stringify(body) });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || 'Operations request was rejected.');
  return value;
}

export function OperationsJobsPanel({ light }: { light: boolean }) {
  const [state, setState] = useState<State | null>(null);
  const [owner, setOwner] = useState(false);
  const [workflow, setWorkflow] = useState('sync-investigation');
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<{ job: Job; steps: Step[] } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [draftDirty, setDraftDirty] = useState(false);
  const [tab, setTab] = useState('workflows');
  const [targetSearch, setTargetSearch] = useState('');
  async function refresh() { const next = await read<State>('/v1/operations/status'); setState(next); return next; }
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [next, me] = await Promise.all([read<State>('/v1/operations/status'), read<{ role: string }>('/v1/auth/me')]);
        if (active) { setState(next); setOwner(me.role === 'owner'); }
      } catch { if (active) setError('Operations jobs are unavailable.'); }
    };
    void load(); const timer = window.setInterval(load, 8000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  const policySignature = JSON.stringify(state?.policy.workflows || []);
  useEffect(() => { if (!draftDirty) setSelected(JSON.parse(policySignature)); }, [policySignature, draftDirty]);
  const targets = state?.targets[workflow] || [];
  const confirmedTarget = targets.some(item => item.id === target) ? target : targets[0]?.id || '';
  const ready = state?.state === 'running';
  async function act(fn: () => Promise<unknown>) {
    setBusy(true); setError('');
    try { await fn(); await refresh(); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Operations request failed.'); }
    finally { setBusy(false); }
  }
  async function inspect(job: Job) {
    setDetail(await read<{ job: Job; steps: Step[] }>(`/v1/operations/jobs/${encodeURIComponent(job.id)}`));
  }
  const tabs = [{ id: 'workflows', label: 'Workflows' }, { id: 'triggers', label: 'Automatic triggers' }, { id: 'instructions', label: 'Instructions' }, { id: 'history', label: 'Job history' }];
  const skills = [
    { id:'connector-review',title:'MCP connector review',text:'Inspect verified tools and investigate connected data.',icon:Wrench },
    { id: 'sync-investigation', title: 'Delivery investigation', text: 'Find blockers and prepare a repair plan.', icon: Wrench },
    { id: 'customer-onboarding', title: 'Data onboarding', text: 'Check imported data and scoring readiness.', icon: FileCheck2 },
    { id: 'company-enrichment', title: 'Company research', text: 'Search, extract and cite company evidence.', icon: Search },
    { id: 'configuration-analysis', title: 'Scoring analysis', text: 'Analyze scores and preview configuration.', icon: SlidersHorizontal },
    { id: 'people-enrichment', title: 'Professional roles', text: 'Research public names and job titles.', icon: Users },
  ];
  const skill = skills.find(item => item.id === workflow)!;
  const filteredTargets = targets.filter(item => item.label.toLowerCase().includes(targetSearch.toLowerCase()));
  const visibleTarget = filteredTargets.some(item => item.id === confirmedTarget) ? confirmedTarget : filteredTargets[0]?.id || '';
  const needsResearch = ['company-enrichment', 'people-enrichment'].includes(workflow);
  const setup = [{ label: 'Operations model', value: state?.configured }, { label: 'Agent runtime', value: state?.installed }, { label: 'Operations worker', value: state?.enabled && state?.worker_healthy }, { label: 'Public research', value: state?.research_configured }];
  return <section aria-labelledby="operations-jobs-title" className="auto-surface auto-workbench">
    <div className="auto-section-heading"><div className="auto-title-icon"><span className="auto-icon-box"><Workflow size={19} /></span><div><h2 id="operations-jobs-title">Operations Agent</h2><p>Choose a responsibility. Track the evidence behind every outcome.</p></div></div><span className={`auto-badge ${ready ? 'is-success' : 'is-warning'}`}>{!state ? 'Loading…' : ready ? 'Ready for work' : state.state==='paused' ? 'Paused' : 'Setup required'}</span></div>
    <div className="auto-tabs" role="tablist" aria-label="Operations Agent sections">{tabs.map((item, index) => <button key={item.id} type="button" role="tab" id={`operations-tab-${item.id}`} aria-selected={tab === item.id} aria-controls={`operations-pane-${item.id}`} tabIndex={tab === item.id ? 0 : -1} onClick={() => setTab(item.id)} onKeyDown={event => {
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault(); setTab(tabs[next].id); document.getElementById(`operations-tab-${tabs[next].id}`)?.focus();
    }}>{item.label}{' '}{item.id === 'history' && state && <span>{state.jobs.length}</span>}</button>)}</div>
    {error && <p role="alert" className="auto-error">{error}</p>}
    <div className="auto-workbench-grid" hidden={!['workflows', 'instructions'].includes(tab)}>
      <div className="auto-skill-list" aria-label="Workflow selection"><p className="auto-caption">Approved responsibilities</p>{skills.map(item => <button type="button" className="auto-skill" key={item.id} aria-pressed={workflow === item.id} disabled={busy} onClick={() => { setWorkflow(item.id); setTarget(''); setTargetSearch(''); }}><span className="auto-skill-icon"><item.icon size={18} /></span><span><strong>{item.title}</strong><small>{item.text}</small></span><ArrowRight size={14} /></button>)}</div>
      <div className="auto-skill-content">
        <div role="tabpanel" id="operations-pane-workflows" aria-labelledby="operations-tab-workflows" hidden={tab !== 'workflows'}>
          <div className="auto-skill-heading"><span className="auto-icon-box"><skill.icon size={20} /></span><div><h3>{skill.title}</h3><p>{skill.text}</p></div></div>
          <ol className="auto-job-flow" aria-label="Workflow steps">{(['company-enrichment', 'people-enrichment'].includes(workflow) ? ['Read context', 'Search sources', 'Extract evidence', 'Propose facts'] : workflow === 'configuration-analysis' ? ['Read context', 'Analyze scores', 'Preview draft', 'Report findings'] : ['Read context', 'Inspect evidence', 'Analyze issues', 'Report findings']).map((label, index) => <li key={label}><span>{index + 1}</span>{label}{index < 3 && <ArrowRight size={12} />}</li>)}</ol>
          {state && !ready && <div className="auto-setup-note"><KeyRound size={18} /><div><strong>{state.state==='paused' ? 'Automatic decisions are off for this workspace' : !state.configured ? 'Configure the operations model to run this workflow' : 'Enable the operations worker to run this workflow'}</strong><p>You can configure responsibilities and instructions now. Running also requires a configured model, a healthy operations worker and automatic decisions turned on. MCP reviews need owner-approved read tools.</p><details><summary>View service status</summary><ul>{setup.map(check => <li key={check.label}><span>{check.label}</span><span className={`auto-badge ${check.value ? 'is-success' : 'is-neutral'}`}>{check.value ? 'Ready' : 'Not ready'}</span></li>)}</ul></details></div></div>}
          {ready && needsResearch && !state?.research_configured && <p className="auto-help">Connect the public research service before running this responsibility.</p>}
          <form className="auto-run-form" onSubmit={event => { event.preventDefault(); void act(() => mutate('/v1/operations/jobs', { workflow, target: visibleTarget, request_key: crypto.randomUUID() })); }}>
            {targets.length > 8 && <label>Find a workspace target<input type="search" value={targetSearch} onChange={event => setTargetSearch(event.target.value)} placeholder="Search account domain or demand…" /></label>}
            <label>Workspace target<select value={visibleTarget} onChange={event => setTarget(event.target.value)} disabled={busy || !filteredTargets.length}>{filteredTargets.length ? filteredTargets.map(item => <option value={item.id} key={item.id}>{item.label.replaceAll('_', ' ')}</option>) : <option value="">{targetSearch ? 'No matching targets' : workflow === 'sync-investigation' ? 'No failed delivery jobs' : 'No eligible data available'}</option>}</select></label>
            {!targets.length && <p className="auto-help">{workflow === 'sync-investigation' ? 'There are no failed delivery jobs to investigate. Choose another responsibility to continue.' : 'This responsibility needs eligible workspace data before it can run.'}</p>}
            {workflow === 'people-enrichment' && <p className="auto-help">Only demand units with positive coverage are eligible. Public names and titles are candidates for review.</p>}
            <div className="auto-run-actions"><button className="dm-button dm-button-primary" disabled={!ready || !owner || busy || !visibleTarget || (needsResearch && !state?.research_configured)} type="submit">{busy ? <RefreshCw size={16} className="animate-spin" /> : <ArrowRight size={16} />}Run workflow</button><button type="button" className="auto-text-link" onClick={() => setTab('instructions')}>Edit job instructions</button></div>
            {!owner && state && <p className="auto-help">A workspace owner can start agent workflows.</p>}
          </form>
        </div>
        <div role="tabpanel" id="operations-pane-instructions" aria-labelledby="operations-tab-instructions" hidden={tab !== 'instructions'}>{state ? skills.map(item => state.instructions[item.id] && <div key={item.id} hidden={workflow !== item.id}><OperationsInstructions workflow={item.id} label={names[item.id]} profile={state.instructions[item.id]} owner={owner} light={light} expanded save={async body => { const value = await mutate('/v1/operations/instructions', body); await refresh(); return value.instructions; }} /></div>) : <p className="auto-help">Loading workflow instructions…</p>}</div>
      </div>
    </div>
    <div role="tabpanel" id="operations-pane-triggers" aria-labelledby="operations-tab-triggers" hidden={tab !== 'triggers'} className="auto-tab-content">
      <div className="auto-section-heading"><div><h3>Let events start the work</h3><p>Authorize a category once. Each target is reviewed at most once a day.</p></div><span className={`auto-badge ${state?.policy.enabled ? 'is-success' : 'is-neutral'}`}>{state?.policy.enabled ? 'Enabled' : 'Off'}</span></div>
      <div className="auto-trigger-list">{(state?.automatic_workflows || []).map(id => <label key={id}><input type="checkbox" checked={selected.includes(id)} disabled={!owner || busy} onChange={event => { setDraftDirty(true); setSelected(event.target.checked ? [...selected, id] : selected.filter(item => item !== id)); }} /><span><strong>{skills.find(item => item.id === id)?.title}</strong><small>{id === 'sync-investigation' ? 'When a delivery job fails' : id === 'customer-onboarding' ? 'When a historical import completes or fails' : 'When a current decision identifies missing company fit evidence'}</small></span></label>)}</div>
      <p className="auto-help">Scoring analysis and professional-role research remain explicit owner requests. Research findings require review before records change.</p><div className="auto-run-actions"><button type="button" className="dm-button dm-button-primary" disabled={!ready || !owner || busy || !selected.length} onClick={() => void act(async () => { await mutate('/v1/operations/policy', { enabled: true, workflows: selected, revision: state?.policy.revision }); setDraftDirty(false); })}>Save automatic triggers</button><button type="button" className="dm-button dm-button-secondary" disabled={!owner || busy || !state?.policy.enabled} onClick={() => void act(async () => { await mutate('/v1/operations/policy', { enabled: false, workflows: [], revision: state?.policy.revision }); setDraftDirty(false); })}>Turn off triggers</button></div>{!ready && <p className="auto-help">Enable the operations service before activating triggers.</p>}
    </div>
    <div role="tabpanel" id="operations-pane-history" aria-labelledby="operations-tab-history" hidden={tab !== 'history'} className="auto-tab-content">
      {state?.jobs.length ? <ul className="auto-job-list">{state.jobs.slice(0, 8).map(job => <li key={job.id}><span className="auto-skill-icon"><ListChecks size={18} /></span><div><strong>{names[job.workflow]}</strong><p>{job.target}</p><small>{new Date(job.updated_at).toLocaleString()}</small>{job.last_error && <p className="auto-help">{job.last_error}</p>}</div><span className={`auto-badge ${job.status === 'succeeded' ? 'is-success' : ['failed', 'blocked', 'awaiting_review'].includes(job.status) ? 'is-warning' : 'is-neutral'}`}>{job.status.replaceAll('_', ' ')}</span><button type="button" className="dm-button dm-button-secondary" disabled={busy} onClick={() => void act(() => inspect(job))}>View report</button>{owner && ['queued', 'running'].includes(job.status) && <button type="button" className="auto-text-link" disabled={busy} onClick={() => void act(() => mutate(`/v1/operations/jobs/${encodeURIComponent(job.id)}/cancel`, {}))}>Cancel</button>}</li>)}</ul> : <div className="auto-empty"><ListChecks size={28} /><strong>No agent jobs yet</strong><p>Once a workflow runs, its checks, findings and review proposals will appear here.</p><button type="button" className="dm-button dm-button-secondary" onClick={() => setTab('workflows')}>Choose a workflow</button></div>}
      {detail && <div className="auto-report" aria-live="polite"><div className="auto-section-heading"><div><h3>Job report</h3><span className="auto-caption">{detail.job.status.replaceAll('_', ' ')}</span></div><button type="button" className="dm-button dm-button-secondary" onClick={() => setDetail(null)}><X size={14} />Close report</button></div><p className="auto-report-text">{detail.job.result.report?.summary || 'No validated report has been submitted.'}</p>{detail.job.result.report?.facts?.length ? <div className="auto-facts"><h4>Extracted candidates · review required</h4>{detail.job.result.report.facts.map((fact, index) => <article key={index}><span className="auto-caption">{fact.field.replaceAll('_', ' ')}</span><strong>{fact.value}</strong><blockquote>{fact.quote}</blockquote><a className="auto-text-link" href={fact.source_url} target="_blank" rel="noopener noreferrer">View source · evidence {fact.evidence_sequence}<ArrowRight size={12} /></a></article>)}</div> : null}{detail.job.result.report?.proposal && <div className="auto-proposal"><h4>Proposed change · requires review</h4><p className="auto-report-text">{detail.job.result.report.proposal}</p></div>}<ol className="auto-receipts">{detail.steps.map(step => <li key={step.sequence}><p><CheckCircle2 size={14} />{step.sequence}. {stepNames[step.tool] || 'Operations check'} · {step.status}</p><details><summary>Recorded evidence</summary><pre>{JSON.stringify(step.result, null, 2)}</pre></details></li>)}</ol><p className="auto-help">Reports and proposals do not apply provider or policy changes.</p></div>}
    </div>
    <footer className="auto-workbench-footer"><span><ShieldCheck size={14} />Changes require review</span><span><Clock3 size={14} />2-minute job limit</span><span>Up to 12 checks · 2 specialists</span><span className={state?.research_configured ? 'auto-connected' : ''}>{state?.research_configured ? 'Public research connected' : 'Public research not configured'}</span></footer>
  </section>;
}
