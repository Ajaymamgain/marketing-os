import React, { useEffect, useState } from 'react';
import { RefreshCw, ArrowRight, Activity } from 'lucide-react';

type Review = { success: boolean; run_id?: string; status: string; stop_reason?: string; steps: Array<{ action: string; status: string; result?: Record<string, unknown> }> };
type OperatorStatus = { enabled: boolean; installed: boolean; runs: Array<{ id: string; status: string; completed_at: string | null; result: Review }> };
const labels: Record<string, string> = { check_runtime: 'Workspace health', check_queue: 'Automation queue', explain_score: 'Score evidence', inspect_decision: 'Next action evidence', queue_rescore: 'Score refresh queued' };

export function OperationsAgentPanel({ light }: { light: boolean }) {
  const [status, setStatus] = useState<OperatorStatus | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [running, setRunning] = useState(false);
  const [owner, setOwner] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [state, me] = await Promise.all([fetch('/v1/operator/status', { credentials: 'include' }), fetch('/v1/auth/me', { credentials: 'include' })]);
        if (!state.ok || !me.ok) throw new Error('Operations runtime status could not load.');
        const [next, session] = await Promise.all([state.json(), me.json()]);
        if (active) { setStatus(next); setOwner(session.role === 'owner'); }
      } catch { if (active) setError('Operations runtime status is unavailable.'); }
    }
    void load();
    return () => { active = false; };
  }, []);
  async function run() {
    setRunning(true); setError('');
    try {
      const me = await fetch('/v1/auth/me', { credentials: 'include' });
      if (!me.ok) throw new Error('Sign in again to run an operations review.');
      const session = await me.json();
      const response = await fetch('/v1/operator/run', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': session.csrf_token }, body: JSON.stringify({ goal: 'workspace_review' }), signal: AbortSignal.timeout(100_000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || (response.status === 429 ? 'A review is already running. Try again shortly.' : 'The operations review could not complete.'));
      setReview(result);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Operations review failed.'); }
    finally { setRunning(false); }
  }
  const latest = review || status?.runs?.[0]?.result;
  const ready = status?.enabled && status?.installed;
  return <section className="auto-surface auto-checks" data-theme={light ? 'light' : 'dark'} aria-labelledby="pi-operations-title">
    <div className="auto-section-heading"><div><h2 id="pi-operations-title">Workspace checks</h2><p>Inspect service health and queued work.</p></div><span className={`auto-badge ${ready ? 'is-success' : 'is-neutral'}`}>{!status ? 'Checking…' : ready ? 'Available' : 'Unavailable'}</span></div>
    <button className="dm-button dm-button-secondary auto-full-button" onClick={() => void run()} disabled={!ready || !owner || running}>{running ? <RefreshCw size={16} className="animate-spin" /> : <Activity size={16} />}{running ? 'Reviewing workspace…' : 'Run workspace review'}</button>
    <p className="auto-help">Up to 4 checks · 90-second limit</p>
    {!owner && status && <p className="auto-help">A workspace owner can run this review.</p>}
    {error && <p className="auto-error" role="alert">{error}</p>}
    {latest && <div className="auto-latest-review" aria-live="polite"><strong>{latest.stop_reason === 'uncertain_decision' ? 'Last review ended early' : latest.success ? 'Last review completed' : latest.status === 'timed_out' ? 'Last review timed out' : 'Last review needs attention'}</strong>
      {latest.steps?.length ? <ul>{latest.steps.map((step, index) => <li key={index}><span className={`auto-status-dot ${step.status === 'completed' ? 'is-success' : ''}`} />{labels[step.action] || 'Operations check'}<span>{step.status}</span></li>)}</ul> : <p className="auto-help">No checks completed.</p>}
      {latest.stop_reason === 'uncertain_decision' && <p className="auto-help">The completed checks are recorded. Further steps need more evidence.</p>}</div>}
    <a className="auto-text-link" href="/security">Account security<ArrowRight size={14} /></a>
  </section>;
}
