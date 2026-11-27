import {useEffect, useState} from 'react';
import type {MouseEvent} from 'react';
import {AlertTriangle, ArrowRight, CircleCheck, Link2, ScrollText, Unplug} from 'lucide-react';
import {approvePlaybookSkill, fetchPlaybookSkills, fetchPlaybookRuns} from '../services/api';
import type {PlaybookRun} from '../services/api';
import type {ActiveNavTab} from '../types';
import './playbook-skills.css';

const operations: Record<string, string> = {
  list: 'Verify static list',
  lookup: 'Find lead IDs',
  membership: 'Read membership',
  add: 'Add members',
  remove: 'Remove members',
};

export function PlaybookSkillPanel({
  refreshKey,
  onApproved,
  embedded = false,
  onNavigateTab,
}: {
  refreshKey: number;
  onApproved: () => void;
  embedded?: boolean;
  onNavigateTab?: (tab: ActiveNavTab) => void;
}) {
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
  const boundToolEntries = binding ? Object.entries(binding.tools) : [];
  const configured = Boolean(binding && (binding.ready || binding.bound || boundToolEntries.length > 0));
  const adobeMcpVerified = Boolean(binding && (binding.ready || (binding.bound && binding.missing.length === 0)));

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

  const handleConnectionsNav = (event: MouseEvent<HTMLAnchorElement>) => {
    if (onNavigateTab) {
      event.preventDefault();
      onNavigateTab('CONNECTORS');
    }
  };

  const statusBadgeText = !binding
    ? 'Checking'
    : binding.ready
      ? 'Verified write · Adobe MCP approved'
      : adobeMcpVerified
        ? 'Verified Adobe MCP · Approval required'
        : binding.bound
          ? 'Adobe MCP connected · Missing capabilities'
          : 'Adobe MCP setup required';

  const content = (
    <>
      {!embedded && (
        <div className="dm-section-heading">
          <div>
            <h2 id="pb-skill-title">Marketo static-list skill &amp; Adobe MCP</h2>
            <p className="dm-muted">
              Verify the Adobe MCP connection, approve the published skill version and tools, and
              review blocked requirements before activating a static list.
            </p>
          </div>
          <a href="#connections" onClick={handleConnectionsNav} className="dm-button dm-button-secondary">
            <Link2 size={15} /> Manage Connections
          </a>
        </div>
      )}

      {error && <p role="alert" className="dm-notice dm-notice-warning">{error}</p>}
      {!binding && !error && <p className="dm-muted" role="status">Checking verified Adobe MCP connection and published skill…</p>}

      {binding && (
        <div className={embedded ? 'rounded-lg border border-[#e2e8f0] bg-[#f8fafc]/70 p-4' : 'pb-skill-connection'}>
          <div className="pb-skill-heading">
            <div>
              <h3>Executing skill · Marketo static-list reconciliation</h3>
              <p className="dm-muted">
                {binding.ready
                  ? 'Verified Adobe MCP connection is active and the current skill version and write tools are approved for static-list reconciliation.'
                  : adobeMcpVerified
                    ? 'Verified Adobe MCP connection detected. Approve the current published skill version and bound tools to enable verified static-list writes.'
                    : 'Connect and verify the Adobe MCP server in Connections to unlock verified Marketo static-list writes.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={binding.ready ? 'dm-badge dm-badge-ready' : 'dm-badge'}>
                {binding.ready ? <CircleCheck size={14} /> : <Unplug size={14} />}
                {statusBadgeText}
              </span>
              {embedded && (
                <a href="#connections" onClick={handleConnectionsNav} className="dm-button dm-button-secondary">
                  <Link2 size={14} /> Manage Connections
                </a>
              )}
            </div>
          </div>

          {binding.missing.length > 0 && (
            <div role="status" className="mt-3 rounded-md border border-[#fde68a] bg-[#fffbeb] px-3 py-2.5 text-xs text-[#92400e]">
              <p className="flex items-center gap-1.5 font-semibold text-[#78350f]">
                <AlertTriangle size={14} className="shrink-0 text-[#b45309]" />
                Skill blocked — missing Adobe MCP capabilities
              </p>
              <p className="mt-1">
                {configured
                  ? `Required capabilities: ${binding.missing.map(item => operations[item] || item).join(', ')}.`
                  : `${binding.missing.map(item => operations[item] || item).join('. ')}.`}
              </p>
            </div>
          )}

          {!binding.ready && binding.missing.length === 0 && catalog.can_approve && (
            <div className="pb-skill-actions">
              <button
                type="button"
                className="dm-button dm-button-primary"
                disabled={busy}
                onClick={() => void approve()}
              >
                {busy ? 'Approving…' : 'Approve current skill and tools'}
              </button>
              <span className="dm-muted">
                Pins version {binding.skill_digest ? binding.skill_digest.slice(7, 19) : 'current'} and
                the verified Adobe MCP tools for enabled static-list mappings.
              </span>
            </div>
          )}

          {!binding.ready && binding.missing.length === 0 && !catalog.can_approve && (
            <p className="dm-muted mt-2">
              Workspace owner permission is required to approve the current Marketo skill and tools.
            </p>
          )}

          <details className="pb-skill-details">
            <summary>
              <ScrollText size={15} /> Published version and tools ({boundToolEntries.length} bound
              {binding.skill_digest ? ` · ${binding.skill_digest.slice(7, 19)}` : ''})
            </summary>
            <dl>
              <div>
                <dt>Adobe MCP connection</dt>
                <dd>{binding.ready ? 'Verified & approved' : adobeMcpVerified ? 'Verified · awaiting owner approval' : binding.bound ? 'Connected · incomplete tools' : 'Not connected'}</dd>
              </div>
              <div>
                <dt>Published skill</dt>
                <dd>{binding.skill_uri || 'Not reported'}</dd>
              </div>
              <div>
                <dt>Published version</dt>
                <dd aria-label={binding.skill_digest}>
                  {binding.skill_digest ? binding.skill_digest.slice(7, 19) : 'Not recorded'}
                </dd>
              </div>
              {boundToolEntries.map(([operation, tool]) => (
                <div key={operation}>
                  <dt>{operations[operation] || operation}</dt>
                  <dd>{tool}</dd>
                </div>
              ))}
            </dl>
            {catalog.procedure && <pre className="pb-procedure">{catalog.procedure}</pre>}
            {catalog.skills.length > 0 && (
              <div className="mt-3 border-t border-[#e2e8f0] pt-3">
                <p className="text-xs font-semibold text-[#334155]">
                  Published MCP skills ({catalog.skills.length})
                </p>
                <ul>
                  {catalog.skills.map(skill => (
                    <li key={skill.uri}>
                      <strong>{skill.frontmatter.name.replaceAll('-', ' ')}</strong>
                      <p className="dm-muted">{skill.frontmatter.description}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </details>
        </div>
      )}
    </>
  );

  if (embedded) {
    return (
      <div className="pb-skill-embedded" aria-label="Marketo static-list executing skill">
        {content}
      </div>
    );
  }

  return (
    <section className="dm-panel pb-skill-panel" aria-labelledby="pb-skill-title">
      {content}
    </section>
  );
}

export function PlaybookRunHistory({
  demandUnitKey,
  refreshKey,
  onLatestRun,
}: {
  demandUnitKey: string;
  refreshKey: number;
  onLatestRun?: (run: PlaybookRun | null) => void;
}) {
  const [runs, setRuns] = useState<PlaybookRun[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    fetchPlaybookRuns(demandUnitKey).then(result => {
      if (active) {
        setRuns(result.runs);
        onLatestRun?.(result.runs[0] || null);
      }
    })
      .catch(reason => {
        if (active) {
          setError(reason.message);
          onLatestRun?.(null);
        }
      })
      .finally(() => {if (active) setLoading(false);});
    return () => {active = false;};
  }, [demandUnitKey, refreshKey]);

  return <section className="dm-panel" id="playbook-runs" aria-labelledby="pb-runs-title">
    <div className="dm-section-heading"><h2 id="pb-runs-title">Run history &amp; provider readback</h2><a href="#tasks" className="dm-text-link">Operational activity <ArrowRight size={14}/></a></div>
    {error && <p role="alert" className="dm-notice dm-notice-warning">{error}</p>}
    {loading ? <p className="dm-muted" role="status">Loading playbook runs…</p> : !error && (runs.length ? (
      <div className="pb-receipt-table">
        <table><thead><tr><th scope="col">Run</th><th scope="col">Destination</th><th scope="col">Result</th>
          <th scope="col">Confirmed</th><th scope="col">Unverified</th></tr></thead>
          <tbody>{runs.map(run => <tr key={run.run_id}>
            <td>{new Date(run.completed_at).toLocaleString()}<small>{run.run_id}</small></td>
            <td>Marketo list #{run.marketo_list_id}<small>{run.transport === 'mcp' ? `Adobe MCP · ${run.skill_digest?.slice(7, 19) || 'Skill recorded'}` : 'Legacy run'}</small></td>
            <td className="capitalize">{run.status?.replaceAll('_', ' ') || 'Recorded'}<small>{run.action}</small></td>
            <td>{run.applied_count}<small>{run.added_count ?? '—'} added · {run.removed_count ?? '—'} removed</small></td>
            <td>{Math.max(run.requested_count - run.applied_count, run.skipped_count)}</td>
          </tr>)}</tbody>
        </table>
      </div>
    ) : <p className="dm-empty">No membership receipts for this demand unit.</p>)}
  </section>;
}
