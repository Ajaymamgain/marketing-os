import React, { useEffect, useState } from 'react';
import { ArrowRight, Activity, ShieldCheck, AlertTriangle } from 'lucide-react';
import { AccountDemandUnit } from '../types';
import {
  inspectDemandUnit,
  DemandUnitInspection,
  fetchScoreHistory,
  ScoreSnapshot,
} from '../services/api';

interface Props {
  accounts: AccountDemandUnit[];
  onSelectAccount: (account: AccountDemandUnit) => void;
}

const stages = [
  ['target', 'Target'],
  ['engaged', 'Engaged'],
  ['prioritized_du', 'Prioritized'],
  ['qualified_du', 'Qualified'],
  ['pipeline_deal', 'Pipeline'],
  ['closed_won', 'Closed won'],
] as const;

const formatDate = (stamp: string) =>
  Number.isNaN(Date.parse(stamp)) ? 'Time not recorded' : new Date(stamp).toLocaleString();

export const CustomerJourneyView: React.FC<Props> = ({ accounts, onSelectAccount }) => {
  const [selectedId, setSelectedId] = useState('');
  const [details, setDetails] = useState<DemandUnitInspection | null>(null);
  const [history, setHistory] = useState<ScoreSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selected = accounts.find((a) => a.id === selectedId) || accounts[0];

  useEffect(() => {
    if (!selected) return;
    let active = true;
    setLoading(true);
    setDetails(null);
    setHistory([]);
    setError('');
    Promise.all([inspectDemandUnit(selected.id), fetchScoreHistory(selected.id)])
      .then(([evidence, scores]) => {
        if (active) {
          setDetails(evidence);
          setHistory(scores);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Journey evidence unavailable.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selected?.id, selected?.scoreAudit?.lastScoredAt]);

  const events = [...(details?.signals || [])]
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
    .slice(0, 20);

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <div className="dm-page-heading">
        <div>
          <h1>Customer journey</h1>
          <p>
            Follow recorded activity, score changes, and operating decisions for each buying need.
          </p>
        </div>
        <label className="dm-field w-full sm:w-auto">
          Demand unit
          <select
            className="dm-input w-full sm:min-w-[340px] sm:max-w-[420px]"
            value={selected?.id || ''}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.accountName} · {a.solutionTarget}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!selected ? (
        <div className="dm-card dm-empty">
          No demand units available. Connect a data source or run Data imports & replay.
        </div>
      ) : (
        <>
          <section className="dm-card">
            <div className="dm-section-title">
              <div>
                <h2>{selected.accountName}</h2>
                <p>
                  {selected.solutionTarget} · {selected.domain}
                </p>
              </div>
              <button
                type="button"
                className="dm-button"
                onClick={() => onSelectAccount(selected)}
              >
                Inspect demand unit <ArrowRight size={15} />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 divide-y divide-[#e2e8f0] rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] lg:grid-cols-4 lg:divide-x lg:divide-y-0">
              {[
                ['Composite', `${selected.compositeScore} / 100`],
                ['Coverage', `${selected.committee.coverageScore}%`],
                ['Recorded activity', String(selected.scoreAudit?.signalsCount ?? 0)],
                [
                  'Current lane',
                  (selected.scoreAudit?.routingState || 'HOLD').replaceAll('_', ' ').toLowerCase(),
                ],
              ].map(([label, value]) => (
                <div key={label} className="p-4">
                  <p className="dm-caption">{label}</p>
                  <p className="mt-1 text-lg font-semibold capitalize tabular-nums text-[#0f172a]">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="dm-card">
            <div className="dm-section-title">
              <div>
                <h2>Current journey position</h2>
                <p>
                  Highlighted stage is the stored state. Earlier stages are not assumed to have been
                  completed.
                </p>
              </div>
            </div>

            <div className="dm-journey-stages mt-5">
              {stages.map(([id, label], i) => {
                const isCurrent = selected.stage === id;
                const stageCount = accounts.filter((a) => a.stage === id).length;
                return (
                  <div key={id} className={`dm-stage ${isCurrent ? 'is-current' : ''}`}>
                    <span className="dm-caption tabular-nums">0{i + 1}</span>
                    <h3
                      className={`mt-1.5 text-sm font-semibold ${
                        isCurrent ? 'text-[#1d4ed8]' : 'text-[#0f172a]'
                      }`}
                    >
                      {label}
                    </h3>
                    <p className="dm-caption mt-1">
                      {isCurrent ? 'Current stage' : 'Not inferred'}
                    </p>
                    <span className="mt-3 block text-lg font-semibold tabular-nums text-[#0f172a]">
                      {stageCount}
                      <span className="dm-caption ml-1.5 font-normal">units</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
            <section className="dm-card">
              <div className="dm-section-title">
                <div>
                  <h2>Activity timeline</h2>
                  <p>Actual signal records attached to this account and need.</p>
                </div>
                <Activity size={16} className="text-[#64748b]" />
              </div>

              {loading && (
                <div className="mt-5 space-y-3" role="status" aria-label="Loading recorded evidence">
                  <div className="dm-skeleton h-12 w-full" />
                  <div className="dm-skeleton h-12 w-full" />
                  <div className="dm-skeleton h-12 w-4/5" />
                </div>
              )}

              {error && (
                <div role="alert" className="dm-notice dm-notice-error mt-4">
                  {error}
                </div>
              )}

              {!loading && events.length > 0 && (
                <ol className="mt-5">
                  {events.map((event, i) => (
                    <li key={`${event.id}-${i}`} className="dm-timeline-event">
                      <span className="dm-timeline-dot" />
                      <div>
                        <p className="text-sm font-medium capitalize text-[#0f172a]">
                          {event.event_type.replaceAll('_', ' ')}
                        </p>
                        <p className="dm-caption mt-0.5 tabular-nums">
                          {event.event_source || 'Source not recorded'} · {formatDate(event.timestamp)}
                        </p>
                        {event.signal_weight != null && (
                          <p className="dm-caption mt-0.5 tabular-nums">
                            Recorded activity weight: {event.signal_weight} · intent contribution is
                            decayed by policy
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}

              {!loading && !error && !events.length && (
                <p className="dm-empty">No recorded activity for this demand unit.</p>
              )}
            </section>

            <aside className="space-y-5">
              <section className="dm-card">
                <h2 className="flex items-center gap-2 text-base font-semibold text-[#0f172a]">
                  <ShieldCheck size={17} className="text-[#64748b]" />
                  Insights & next steps
                </h2>
                <div className="mt-4 space-y-4">
                  {selected.committee.coverageScore === 0 && (
                    <div className="dm-notice dm-notice-warning">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                      <p>
                        Coverage is zero. Verify first-party roles and consent before enabling any
                        audience addition or sales handoff.
                      </p>
                    </div>
                  )}

                  {details?.blockers
                    .filter((b) => b.code !== 'coverage_zero')
                    .slice(0, 3)
                    .map((b) => (
                      <div key={b.code} className="border-t border-[#f1f5f9] pt-3 first:border-t-0 first:pt-0">
                        <p className="text-sm font-medium text-[#0f172a]">{b.message}</p>
                        <p className="dm-caption mt-1">{b.next_action}</p>
                      </div>
                    ))}

                  <div className="border-t border-[#e2e8f0] pt-3">
                    <p className="dm-caption">Stored recommended play</p>
                    <p className="mt-1 text-sm font-semibold capitalize text-[#0f172a]">
                      {(selected.recommendedPlaybookId || 'Not evaluated')
                        .replaceAll('_', ' ')
                        .toLowerCase()}
                    </p>
                  </div>

                  <p className="dm-caption">
                    {selected.jevDecision?.applied
                      ? 'A recorded decision is available. Destination mapping and product gates still control execution.'
                      : 'No current automated evaluation. Scores alone do not authorize an audience addition.'}
                  </p>

                  <a className="dm-text-button" href="#playbooks">
                    Review next action in playbooks <ArrowRight size={14} />
                  </a>
                </div>
              </section>

              <section className="dm-card">
                <h2 className="text-base font-semibold text-[#0f172a]">Recent score changes</h2>
                <div className="mt-3 divide-y divide-[#e2e8f0]">
                  {history.slice(0, 4).map((snapshot) => (
                    <div key={snapshot.id} className="py-3">
                      <div className="flex justify-between text-sm">
                        <strong className="font-semibold tabular-nums text-[#0f172a]">
                          {snapshot.composite_score.toFixed(1)} / 100
                        </strong>
                        <span className="dm-caption">
                          {snapshot.decision_applied ? 'Automatically evaluated' : 'Policy score'}
                        </span>
                      </div>
                      <p className="dm-caption mt-1 tabular-nums">{formatDate(snapshot.scored_at)}</p>
                      <p className="dm-caption tabular-nums">
                        Fit {snapshot.fit_score.toFixed(1)} · Intent {snapshot.intent_score.toFixed(1)}{' '}
                        · Coverage {snapshot.coverage_score.toFixed(1)}
                      </p>
                    </div>
                  ))}
                </div>
                {!history.length && !loading && (
                  <p className="dm-caption mt-3">No recorded score history available.</p>
                )}
              </section>
            </aside>
          </div>

          <section className="dm-card !p-0 overflow-hidden">
            <div className="px-6 py-5">
              <h2 className="text-base font-semibold text-[#0f172a]">Execution history</h2>
              <p className="dm-caption mt-1">
                Job status records workflow execution. A succeeded job alone does not prove that an
                external audience changed.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="dm-table w-full min-w-[560px]">
                <thead>
                  <tr>
                    <th>Destination</th>
                    <th>Action</th>
                    <th>Status</th>
                    <th>Recorded at</th>
                  </tr>
                </thead>
                <tbody>
                  {details?.jobs.slice(0, 8).map((job) => (
                    <tr key={job.id}>
                      <td>
                        <strong className="font-medium text-[#0f172a]">{job.destination}</strong>
                        <p className="dm-caption">
                          {job.result?.mode === 'dry_run'
                            ? 'Preview · no provider request'
                            : job.destination === 'playbook_executor'
                              ? 'Internal workflow'
                              : 'Recorded connector job'}
                        </p>
                      </td>
                      <td className="capitalize">{job.action.replaceAll('_', ' ')}</td>
                      <td>
                        <span
                          className={`text-xs font-semibold capitalize ${
                            job.status === 'succeeded' || job.status === 'completed'
                              ? 'text-[#15803d]'
                              : job.status === 'failed'
                                ? 'text-[#b91c1c]'
                                : 'text-[#1d4ed8]'
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="tabular-nums">{formatDate(job.completed_at || job.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!details?.jobs.length && <p className="dm-empty">No provider jobs recorded.</p>}
          </section>
        </>
      )}
    </div>
  );
};
