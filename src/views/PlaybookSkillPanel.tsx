import {useEffect, useState} from 'react';
import {ArrowRight, CircleCheck, Link2, ScrollText, Unplug} from 'lucide-react';
import {approvePlaybookSkill, fetchPlaybookSkills, fetchPlaybookRuns} from '../services/api';
import type {PlaybookRun} from '../services/api';
import './playbook-skills.css';

const operations: Record<string, string> = {
  list: 'Verify static list',
  lookup: 'Find lead IDs',
  membership: 'Read membership',
  add: 'Add members',
  remove: 'Remove members',
};

export function PlaybookSkillPanel({refreshKey, onApproved}: {refreshKey: number; onApproved: () => void}) {
  const [catalog, setCatalog] = useState<Awaited<ReturnType<typeof fetchPlaybookSkills>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let current = true;
    fetchPlaybookSkills().then(next => {if (current) {setCatalog(next); setError('');}})
      .catch(cause => {if (current) setError(cause.message);});
    return () => {current = false;};
  }, [refreshKey]);

  const binding = catalog?.marketo;
  const configured = binding && (binding.ready || binding.bound || Object.keys(binding.tools).length > 0);
  async function approve() {
    if (!catalog || busy) return;
    setBusy(true);
    setError('');
    try {
      const marketo = await approvePlaybookSkill(catalog.marketo.skill_digest, catalog.marketo.tool_digest);
      setCatalog({...catalog, marketo});
      onApproved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not approve the skill.');
    } finally {
      setBusy(false);
    }
  }

  return <section className="dm-panel pb-skill-panel" aria-labelledby="pb-skill-title">
    <div className="dm-section-heading">
      <div>
        <h2 id="pb-skill-title">Playbook skills</h2>
        <p className="dm-muted">Review the procedures and MCP tools that power this workspace’s playbooks.</p>
      </div>
      <a href="#connections" className="dm-button dm-button-secondary"><Link2 size={15}/> Manage Connections</a>
    </div>
    {error && <p role="alert" className="dm-notice dm-notice-warning">{error}</p>}
    {!binding && !error && <p className="dm-muted" role="status">Loading playbook skills…</p>}
    {binding && <div className="pb-skill-connection">
      <div className="pb-skill-heading">
        <div><h3>Marketo audience membership</h3><p className="dm-muted">Reconcile a dedicated static list when eligibility or consent changes.</p></div>
        <span className={binding.ready ? 'dm-badge dm-badge-ready' : 'dm-badge'}>
          {binding.ready ? <CircleCheck size={14}/> : <Unplug size={14}/>}
          {binding.ready ? 'MCP approved' : binding.bound ? 'Review needed' : 'Setup required'}
        </span>
      </div>
      {binding.missing.length > 0 &&
        <p className="dm-muted">{configured
          ? `Required capabilities: ${binding.missing.map(item => operations[item] || item).join(', ')}.`
          : binding.missing.map(item => operations[item] || item).join('. ')}.</p>}
      <details className="pb-skill-details">
        <summary><ScrollText size={15}/> Review skill and tools</summary>
        <pre className="pb-procedure">{catalog.procedure}</pre>
        <dl><div><dt>Published skill</dt><dd>{binding.skill_uri}</dd></div>
          <div><dt>Version</dt><dd aria-label={binding.skill_digest}>{binding.skill_digest.slice(7, 19)}</dd></div>
          {Object.entries(binding.tools).map(([operation, tool]) =>
            <div key={operation}><dt>{operations[operation]}</dt><dd>{tool}</dd></div>)}
        </dl>
      </details>
      {!binding.ready && binding.missing.length === 0 && catalog.can_approve && <div className="pb-skill-actions">
        <button type="button" className="dm-button dm-button-primary" disabled={busy} onClick={() => void approve()}>
          {busy ? 'Approving…' : 'Approve Marketo skill and tools'}
        </button>
        <span className="dm-muted">Existing enabled mappings will use this MCP account.</span>
      </div>}
      {!binding.ready && binding.missing.length === 0 && !catalog.can_approve && (
        <p className="dm-muted">Workspace owner permission is required to approve Marketo skills and tools.</p>
      )}
    </div>}
    {catalog && <details className="pb-skill-details">
      <summary>Published MCP skills <span className="dm-badge">{catalog.skills.length}</span></summary>
      <ul>{catalog.skills.map(skill => <li key={skill.uri}><strong>{skill.frontmatter.name.replaceAll('-', ' ')}</strong>
        <p className="dm-muted">{skill.frontmatter.description}</p></li>)}</ul>
    </details>}
  </section>;
}

export function PlaybookRunHistory({demandUnitKey, refreshKey}: {demandUnitKey: string; refreshKey: number}) {
  const [runs, setRuns] = useState<PlaybookRun[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    fetchPlaybookRuns(demandUnitKey).then(result => {if (active) setRuns(result.runs);})
      .catch(reason => {if (active) setError(reason.message);})
      .finally(() => {if (active) setLoading(false);});
    return () => {active = false;};
  }, [demandUnitKey, refreshKey]);

  return <section className="dm-panel" id="playbook-runs" aria-labelledby="pb-runs-title">
    <div className="dm-section-heading"><h2 id="pb-runs-title">Run history</h2><a href="#tasks" className="dm-text-link">Operational activity <ArrowRight size={14}/></a></div>
    {error && <p role="alert" className="dm-notice dm-notice-warning">{error}</p>}
    {loading ? <p className="dm-muted" role="status">Loading playbook runs…</p> : !error && (runs.length ? (
      <div className="pb-receipt-table">
        <table><thead><tr><th scope="col">Run</th><th scope="col">Destination</th><th scope="col">Result</th>
          <th scope="col">Confirmed</th><th scope="col">Unverified</th></tr></thead>
          <tbody>{runs.map(run => <tr key={run.run_id}>
            <td>{new Date(run.completed_at).toLocaleString()}<small>{run.run_id}</small></td>
            <td>Marketo list #{run.marketo_list_id}<small>{run.transport === 'mcp' ? `MCP · ${run.skill_digest?.slice(7, 19) || 'Skill recorded'}` : 'Legacy run'}</small></td>
            <td className="capitalize">{run.status?.replaceAll('_', ' ') || 'Recorded'}<small>{run.action}</small></td>
            <td>{run.applied_count}<small>{run.added_count ?? '—'} added · {run.removed_count ?? '—'} removed</small></td>
            <td>{Math.max(run.requested_count - run.applied_count, run.skipped_count)}</td>
          </tr>)}</tbody>
        </table>
      </div>
    ) : <p className="dm-empty">No membership receipts for this demand unit.</p>)}
  </section>;
}
