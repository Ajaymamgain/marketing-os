import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Layers3,
  Search,
  ShieldCheck,
  TriangleAlert,
  Zap,
} from 'lucide-react';
import { ApiDecisionsControl } from '../components/ApiDecisionsControl';
import { OperationsAgentPanel } from '../components/OperationsAgentPanel';
import { OperationsJobsPanel } from '../components/OperationsJobsPanel';
import { fetchJevAutomationStatus, type JevAutomationStatus } from '../services/api';

interface JevAutomationViewProps {
  embedded?: boolean;
  theme?: 'dark' | 'light';
}

const timeLabel = (value?: string | null) => {
  if (!value) return 'Not recorded yet';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Not available'
    : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

const readable = (value: string) =>
  value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const pipeline = [
  {
    key: 'marketo_sync',
    title: 'Collect signals',
    source: 'Marketo ingestion',
    href: '#connectors',
    action: 'Review connections',
  },
  {
    key: 'audience_reconciliation',
    title: 'Plan audiences',
    source: 'Audience reconciliation',
    href: '#playbooks',
    action: 'Review playbooks',
  },
  {
    key: 'delivery',
    title: 'Deliver actions',
    source: 'Job delivery',
    href: '#tasks',
    action: 'View operational activity',
  },
];

const reasons: Record<string, string> = {
  unverified_program_mappings: 'Verify the Marketo program mappings before importing signals.',
  dry_run_no_provider_writes:
    'Dry run is enabled. Changes are prepared without sending them to providers.',
};

export const JevAutomationView: React.FC<JevAutomationViewProps> = ({
  embedded = false,
  theme = 'dark',
}) => {
  const [status, setStatus] = useState<JevAutomationStatus | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [decisionFilter, setDecisionFilter] = useState<'all' | 'changed' | 'review'>('all');
  const [decisionQuery, setDecisionQuery] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      const next = await fetchJevAutomationStatus();
      if (!active) return;
      setUnavailable(!next);
      if (next) {
        setStatus(next);
        setLastRefresh(new Date());
      }
    };
    void load();
    const timer = window.setInterval(load, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const automation = status?.automation;
  const live = status?.execution_policy.integration_mode === 'local';
  const workersHealthy = Boolean(
    automation?.workers?.jev?.healthy && automation?.workers?.integration?.healthy
  );
  const working = Boolean(
    workersHealthy && status?.decision_engine.configured && automation?.enabled
  );
  const problem = Boolean(automation?.last_error || automation?.failed_units);
  const operations = automation?.operations;
  const blocked = Object.values(operations || {}).filter((step) =>
    ['blocked', 'failed'].includes(step.status)
  ).length;

  const allDecisions = automation?.recent_decisions || [];
  const filteredDecisions = useMemo(() => {
    const q = decisionQuery.trim().toLowerCase();
    return allDecisions.filter((decision) => {
      if (decisionFilter === 'changed' && !decision.changed) return false;
      if (decisionFilter === 'review' && !decision.error) return false;
      if (!q) return true;
      return [
        decision.account_domain,
        decision.need_key,
        decision.demand_unit_key,
        decision.stage,
        decision.routing_state,
      ].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [allDecisions, decisionFilter, decisionQuery]);

  const decisions = filteredDecisions.slice(0, embedded ? 5 : 12);

  return (
    <section className="dm-automation" data-theme={theme} aria-label="Automation workspace">
      <header className="auto-page-header">
        <div>
          <h1>Automation</h1>
          <p className="auto-subtitle">
            Your signals, decisions and actions. One place to keep them moving.
          </p>
        </div>
        <div className="auto-header-actions">
          <span
            className={`auto-badge ${
              working && !problem && !unavailable ? 'is-success' : 'is-neutral'
            }`}
          >
            {!status
              ? 'Checking services'
              : unavailable
                ? 'Connection interrupted'
                : automation?.running
                  ? 'Evaluation in progress'
                  : status?.decision_engine.provider === 'paused'
                    ? 'API decisions paused'
                    : working && !problem
                      ? 'Evaluation active'
                      : 'Evaluation needs attention'}
          </span>
          <a className="dm-button dm-button-secondary" href="#tasks">
            View activity
            <ArrowRight size={15} />
          </a>
        </div>
      </header>

      <ApiDecisionsControl />

      <div
        className={`auto-notice ${unavailable || problem ? 'is-warning' : ''}`}
        role={unavailable ? 'alert' : 'status'}
      >
        <div>
          <ShieldCheck size={17} />
          <p>
            <strong>
              {!status
                ? unavailable
                  ? 'Service status unavailable'
                  : 'Loading service status'
                : live
                  ? 'Live delivery enabled'
                  : 'Dry run enabled'}
            </strong>
            <span>
              {unavailable
                ? status
                  ? 'Connection lost. The last successful snapshot remains visible.'
                  : 'Unable to connect. Service status will retry automatically.'
                : !status
                  ? 'Checking the latest workspace snapshot.'
                  : live
                    ? 'Approved actions can be sent to connected platforms.'
                    : status?.decision_engine.provider === 'paused'
                      ? 'API decisions are paused. External platforms receive no changes.'
                      : 'Scoring and decisions continue. External platforms receive no changes.'}
            </span>
          </p>
        </div>
        {blocked > 0 && (
          <span className="auto-badge is-warning">
            {blocked} delivery steps need attention
          </span>
        )}
      </div>

      <div className="auto-metrics">
        {[
          {
            label: 'Units evaluated',
            value: automation?.units_evaluated,
            note: 'In the latest cycle',
            icon: Layers3,
          },
          {
            label: 'Decisions updated',
            value: automation?.changes_applied,
            note: `${automation?.decisions_applied ?? '—'} decisions applied`,
            icon: Zap,
          },
          {
            label: 'Waiting to be scored',
            value: automation?.queue?.pending,
            note: `${automation?.queue?.retrying ?? '—'} awaiting retry`,
            icon: Activity,
          },
          {
            label: 'Evaluation cadence',
            value: automation ? `${Math.round(automation.cadence_seconds / 60)} min` : undefined,
            note: `Next: ${timeLabel(automation?.next_run_at)}`,
            icon: Clock3,
          },
        ].map((metric) => (
          <div className="auto-metric" key={metric.label}>
            <div>
              <span>{metric.label}</span>
              <metric.icon size={17} />
            </div>
            <strong className="tabular-nums">{metric.value ?? '—'}</strong>
            <small className="tabular-nums">{metric.note}</small>
          </div>
        ))}
      </div>

      <section className="auto-surface auto-pipeline" aria-labelledby="automation-pipeline-title">
        <div className="auto-section-heading">
          <div>
            <h2 id="automation-pipeline-title">Delivery pipeline</h2>
            <p>Follow each step from incoming signals to platform actions.</p>
          </div>
          <span className="auto-caption tabular-nums">
            {lastRefresh
              ? `Updated ${lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Connecting…'}
          </span>
        </div>
        <div className="auto-pipeline-grid">
          {pipeline.map((step, index) => {
            const operation = operations?.[step.key];
            const attention = operation && ['blocked', 'failed'].includes(operation.status);
            const complete = operation?.status === 'completed';
            const reason = operation?.result?.reason;
            return (
              <article key={step.key} className="auto-pipeline-step">
                <div className="auto-step-top">
                  <span className="auto-step-number tabular-nums">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={`auto-badge ${
                      attention ? 'is-warning' : complete ? 'is-success' : 'is-neutral'
                    }`}
                  >
                    {attention ? (
                      <TriangleAlert size={12} />
                    ) : complete ? (
                      <CheckCircle2 size={12} />
                    ) : (
                      <Clock3 size={12} />
                    )}
                    {operation ? readable(operation.status) : 'Waiting'}
                  </span>
                </div>
                <h3>{step.title}</h3>
                <span className="auto-caption">{step.source}</span>
                <p>
                  {reason
                    ? reasons[reason] || readable(reason)
                    : operation?.last_error
                      ? 'This step failed. Review its recorded outcome for details.'
                      : `Last cycle completed: ${timeLabel(operation?.last_completed_at)}`}
                </p>
                {!!operation?.result?.failed && (
                  <p className="tabular-nums">{operation.result.failed} jobs need review.</p>
                )}
                <a href={step.href} className="auto-text-link">
                  {step.action}
                  <ArrowRight size={14} />
                </a>
              </article>
            );
          })}
        </div>
      </section>

      {!embedded && <OperationsJobsPanel light={theme === 'light'} />}

      <div className="auto-bottom-grid">
        <section className="auto-surface" aria-labelledby="recent-decisions-title">
          <div className="auto-section-heading">
            <div>
              <h2 id="recent-decisions-title">Recent decisions</h2>
              <p className="tabular-nums">
                {allDecisions.length
                  ? `Showing ${decisions.length} of ${filteredDecisions.length} matching (${allDecisions.length} recorded)`
                  : 'The latest evaluated accounts and their current routing.'}
              </p>
            </div>
            <a href="#decisions" className="auto-text-link">
              Decision inbox
              <ArrowRight size={14} />
            </a>
          </div>

          {!embedded && allDecisions.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#e2e8f0] px-5 py-3">
              <div className="dm-segmented" role="group" aria-label="Filter recent decisions">
                {(
                  [
                    ['all', 'All'],
                    ['changed', 'Updated'],
                    ['review', 'Needs review'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={decisionFilter === id}
                    onClick={() => setDecisionFilter(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="relative w-full sm:w-56">
                <span className="sr-only">Filter recent decisions</span>
                <Search
                  size={14}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                />
                <input
                  type="search"
                  className="dm-input dm-search-input w-full text-[13px]"
                  placeholder="Account or route…"
                  value={decisionQuery}
                  onChange={(e) => setDecisionQuery(e.target.value)}
                />
              </label>
            </div>
          )}

          <div className="auto-decisions">
            {decisions.length ? (
              decisions.map((decision, index) => (
                <div key={`${decision.demand_unit_key}-${index}`} className="auto-decision">
                  <div className="auto-decision-account">
                    <strong>{decision.account_domain || 'Account unavailable'}</strong>
                    <span>
                      {readable(
                        String(
                          decision.need_key ||
                            decision.demand_unit_key?.split(':').at(-1) ||
                            'Demand evaluation'
                        )
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="auto-caption">Stage</span>
                    <strong>{decision.stage || 'Not evaluated'}</strong>
                  </div>
                  <div>
                    <span className="auto-caption">Route</span>
                    <strong>
                      {decision.routing_state === 'HOLD'
                        ? 'On hold'
                        : decision.routing_state
                          ? readable(decision.routing_state.toLowerCase())
                          : 'Not assigned'}
                    </strong>
                  </div>
                  <span
                    className={`auto-badge ${
                      decision.error
                        ? 'is-warning'
                        : decision.changed
                          ? 'is-info'
                          : 'is-neutral'
                    }`}
                  >
                    {decision.error
                      ? 'Needs review'
                      : decision.changed
                        ? 'Updated'
                        : 'Unchanged'}
                  </span>
                </div>
              ))
            ) : (
              <div className="auto-empty">
                <Activity size={24} />
                <strong>
                  {allDecisions.length
                    ? 'No decisions match this filter'
                    : status
                      ? 'No decisions recorded yet'
                      : 'Loading recent decisions'}
                </strong>
                <p>
                  {allDecisions.length
                    ? 'Clear the search or status filter to inspect all recent decisions.'
                    : 'Evaluated accounts will appear here with their current stage and route.'}
                </p>
              </div>
            )}
          </div>
        </section>

        <aside className="auto-support">
          {!embedded && <OperationsAgentPanel light={theme === 'light'} />}
          <section className="auto-surface auto-controls">
            <div className="auto-section-heading">
              <div>
                <h2>Operating controls</h2>
                <p>Applied to every evaluation.</p>
              </div>
              <ShieldCheck size={18} />
            </div>
            <dl>
              <div>
                <dt>Score model</dt>
                <dd>{status?.execution_policy.score_formula || '35% fit · 40% intent · 25% coverage'}</dd>
              </div>
              <div>
                <dt>Coverage gate</dt>
                <dd>Zero coverage blocks Engaged, A1 and immediate sales routing.</dd>
              </div>
              <div>
                <dt>Workspace access</dt>
                <dd>Evidence and actions stay within the authenticated workspace.</dd>
              </div>
              <div>
                <dt>Last cycle</dt>
                <dd className="tabular-nums">{timeLabel(automation?.last_completed_at)}</dd>
              </div>
            </dl>
            <a href="#rules" className="auto-text-link">
              Open scoring studio
              <ArrowRight size={14} />
            </a>
          </section>
        </aside>
      </div>
    </section>
  );
};
