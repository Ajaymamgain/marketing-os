import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Search,
  Settings2,
  SlidersHorizontal,
} from 'lucide-react';
import { AccountDemandUnit } from '../types';
import { fetchScoreHistory, fetchScoringPolicy, ScoreSnapshot, ScoringPolicy } from '../services/api';
import { JevDecisionCard } from '../components/JevDecisionCard';

interface DemandUnitScoringViewProps {
  accounts: AccountDemandUnit[];
  theme?: 'dark' | 'light';
  onSelectAccount: (account: AccountDemandUnit) => void;
  onApplied?: () => void;
}

type PortfolioFilter = 'all' | 'sales' | 'marketing' | 'hold' | 'coverage';
type PortfolioSort = 'highest' | 'lowest' | 'recent';

const defaultWeights = { fit: 0, intent: 0, coverage: 0 };

const priorityLabels: Record<string, string> = {
  P1_IMMEDIATE_SALES: 'Immediate sales',
  P2_SALES_READY: 'Sales ready',
  P3_MARKETING_PLAY: 'Marketing play',
  MONITOR: 'Monitor',
};

const stageLabels: Record<string, string> = {
  target: 'Target',
  engaged: 'Engaged',
  prioritized_du: 'Prioritized',
  qualified_du: 'Qualified',
  pipeline_deal: 'Pipeline',
  closed_won: 'Closed won',
  expansion: 'Expansion',
};

const humanize = (value: string) =>
  value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const number = (value: number) => (Number.isFinite(value) ? value.toFixed(1) : '0.0');
const clamp = (value: number) => Math.max(0, Math.min(100, value));
const scoreFor = (account: AccountDemandUnit) => account.scoreAudit?.composite ?? account.compositeScore;
const coverageFor = (account: AccountDemandUnit) =>
  account.scoreAudit?.coverage ?? account.committee.coverageScore;
const routeFor = (account: AccountDemandUnit) => account.scoreAudit?.routingState || 'HOLD';

function scoredAt(value: string | null | undefined) {
  if (!value) return 'No score timestamp';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No score timestamp';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    date
  );
}

export const DemandUnitScoringView: React.FC<DemandUnitScoringViewProps> = ({
  accounts,
  onSelectAccount,
}) => {
  const topRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<PortfolioFilter>('all');
  const [sort, setSort] = useState<PortfolioSort>('highest');
  const [visibleCount, setVisibleCount] = useState(20);
  const [policyError, setPolicyError] = useState('');
  const [policy, setPolicy] = useState<ScoringPolicy | null>(null);
  const [history, setHistory] = useState<ScoreSnapshot[]>([]);
  const [historyState, setHistoryState] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  useEffect(() => {
    let active = true;
    fetchScoringPolicy()
      .then((value) => {
        if (active) setPolicy(value);
      })
      .catch((error) => {
        if (active) {
          setPolicyError(error instanceof Error ? error.message : 'Saved scoring policy unavailable.');
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!accounts.some((item) => item.id === selectedId)) setSelectedId(accounts[0]?.id || '');
  }, [accounts, selectedId]);

  useEffect(() => {
    setVisibleCount(20);
  }, [query, filter, sort]);

  const weights = policy
    ? { fit: policy.fit_percent, intent: policy.intent_percent, coverage: policy.coverage_percent }
    : defaultWeights;
  const selected = accounts.find((item) => item.id === selectedId) || accounts[0];

  useEffect(() => {
    if (!selected?.id) {
      setHistory([]);
      setHistoryState('ready');
      return;
    }
    let active = true;
    setHistoryState('loading');
    fetchScoreHistory(selected.id)
      .then((rows) => {
        if (active) {
          setHistory(rows);
          setHistoryState('ready');
        }
      })
      .catch(() => {
        if (active) {
          setHistory([]);
          setHistoryState('unavailable');
        }
      });
    return () => {
      active = false;
    };
  }, [selected?.id, selected?.scoreAudit?.lastScoredAt]);

  const audit = selected?.scoreAudit;
  const fit = audit?.fit ?? selected?.scores.firmographicFit ?? 0;
  const intent = audit?.intent ?? selected?.scores.behavioralEngagement ?? 0;
  const coverage = audit?.coverage ?? selected?.committee.coverageScore ?? 0;
  const composite = selected ? scoreFor(selected) : 0;

  const contributions = [
    {
      label: 'Account fit',
      score: fit,
      weight: weights.fit,
      className: 'fit',
      detail: 'Industry, size, revenue, and technology',
    },
    {
      label: 'Buying intent',
      score: intent,
      weight: weights.intent,
      className: 'intent',
      detail: 'Identified activity with decay and repeat limits',
    },
    {
      label: 'Group coverage',
      score: coverage,
      weight: weights.coverage,
      className: 'coverage',
      detail: 'Verified people in the buying group',
    },
  ];

  const calculated = contributions.reduce((sum, item) => sum + (item.score * item.weight) / 100, 0);
  const salesCount = accounts.filter((item) => routeFor(item) === 'SALES_LANE').length;
  const coverageGaps = accounts.filter((item) => coverageFor(item) <= 0).length;
  const average = accounts.length
    ? accounts.reduce((sum, item) => sum + scoreFor(item), 0) / accounts.length
    : 0;

  const filtered = useMemo(
    () =>
      accounts
        .filter((item) => {
          const term = query.trim().toLowerCase();
          if (
            term &&
            ![item.accountName, item.domain, item.solutionTarget].some((value) =>
              value.toLowerCase().includes(term)
            )
          ) {
            return false;
          }
          if (filter === 'sales') return routeFor(item) === 'SALES_LANE';
          if (filter === 'marketing') return routeFor(item) === 'MARKETING_LANE';
          if (filter === 'hold') return routeFor(item) === 'HOLD';
          if (filter === 'coverage') return coverageFor(item) <= 0;
          return true;
        })
        .sort((left, right) => {
          if (sort === 'recent') {
            return (
              (Date.parse(right.scoreAudit?.lastScoredAt || '') || 0) -
                (Date.parse(left.scoreAudit?.lastScoredAt || '') || 0) ||
              scoreFor(right) - scoreFor(left)
            );
          }
          return sort === 'lowest'
            ? scoreFor(left) - scoreFor(right)
            : scoreFor(right) - scoreFor(left);
        }),
    [accounts, query, filter, sort]
  );

  return (
    <div className="score-studio" ref={topRef}>
      <header className="score-studio-head">
        <div>
          <h1>Demand scoring</h1>
          <p>
            Trace the evidence behind a demand unit, review its operating lane, and inspect how fit,
            intent, and coverage contribute.
          </p>
        </div>
        <a className="score-studio-config" href="#rules">
          <Settings2 size={16} aria-hidden="true" />
          Configure scoring
          <ArrowRight size={15} aria-hidden="true" />
        </a>
      </header>

      <section className="score-studio-metrics" aria-label="Scoring portfolio summary">
        <div>
          <span>Demand units</span>
          <strong>{accounts.length.toLocaleString()}</strong>
          <small>In this workspace</small>
        </div>
        <div>
          <span>Average score</span>
          <strong>{number(average)}</strong>
          <small>Across scored demand units</small>
        </div>
        <div>
          <span>Sales lane</span>
          <strong>{salesCount.toLocaleString()}</strong>
          <small>Current routing decisions</small>
        </div>
        <div>
          <span>Coverage gaps</span>
          <strong>{coverageGaps.toLocaleString()}</strong>
          <small>Verified coverage is zero</small>
        </div>
      </section>

      {selected?.domain.endsWith('.example') && (
        <div className="dm-notice">
          <CircleAlert size={16} className="mt-0.5 shrink-0 text-[#64748b]" />
          <p>
            This is a synthetic account from the sample dataset. Scoring and decision services run on
            its imported events; scores are not conversion-trained predictions.
          </p>
        </div>
      )}

      {selected ? (
        <div className="score-studio-focus">
          <section className="score-studio-primary" aria-label="Selected demand unit score">
            <div className="score-studio-primary-top">
              <span className="score-studio-overline">Selected demand unit</span>
              <span className="score-studio-grade">{audit?.grade || 'Scored'}</span>
            </div>

            <div className="score-studio-identity">
              <div>
                <h2>{selected.accountName}</h2>
                <p>
                  {selected.solutionTarget} <span aria-hidden="true">·</span> {selected.domain}
                </p>
              </div>
              <span className="score-studio-stage">
                {stageLabels[selected.stage] || humanize(selected.stage)}
              </span>
            </div>

            <div className="score-studio-score-line">
              <div className="score-studio-big-score">
                <strong>{number(composite)}</strong>
                <span>/ 100</span>
              </div>
              <div className="score-studio-score-context">
                <span>Composite score</span>
                <p>Calculated from three explainable inputs to evaluate the next eligible action.</p>
              </div>
            </div>

            <div
              className="score-studio-gauge"
              role="meter"
              aria-label="Composite score"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={clamp(composite)}
            >
              <span style={{ width: `${clamp(composite)}%` }} />
            </div>

            <div className="score-studio-primary-footer">
              <span>
                <Clock3 size={14} aria-hidden="true" /> Scored {scoredAt(audit?.lastScoredAt)}
              </span>
              <button type="button" onClick={() => onSelectAccount(selected)}>
                Open account <ArrowRight size={15} aria-hidden="true" />
              </button>
            </div>
          </section>

          <section className="score-studio-breakdown" aria-label="Score calculation">
            <div className="score-studio-section-head">
              <div>
                <p className="score-studio-overline">Score breakdown</p>
                <h2>Where the score comes from</h2>
              </div>
              <span>Weighted / 100</span>
            </div>

            {!policy && (
              <p role={policyError ? 'alert' : 'status'} className="dm-notice mt-4">
                {policyError || 'Loading saved policy…'}
              </p>
            )}

            {policy && (
              <div className="score-studio-contributions">
                {contributions.map((item) => (
                  <div className={`score-studio-contribution ${item.className}`} key={item.label}>
                    <div className="score-studio-contribution-heading">
                      <strong>{item.label}</strong>
                      <span>
                        {number(item.score)} × {item.weight}%{' '}
                        <b>= {number((item.score * item.weight) / 100)} pts</b>
                      </span>
                    </div>
                    <div className="score-studio-track">
                      <span style={{ width: `${clamp(item.score)}%` }} />
                    </div>
                    <p>{item.detail}</p>
                  </div>
                ))}
              </div>
            )}

            {policy && (
              <div className="score-studio-formula">
                <span>Current policy</span>
                <strong>
                  {weights.fit}% fit + {weights.intent}% intent + {weights.coverage}% coverage
                </strong>
              </div>
            )}

            {policy && Math.abs(calculated - composite) > 1 && (
              <p className="score-studio-stale">
                <CircleAlert size={15} aria-hidden="true" className="shrink-0 mt-0.5" />
                Stored score differs from the current formula. Review the timestamp or recalculate in
                Scoring studio.
              </p>
            )}
          </section>
        </div>
      ) : (
        <section className="score-studio-empty">
          No demand units are available in this workspace yet. Import identified activity to start
          scoring.
        </section>
      )}

      {selected && <JevDecisionCard jevDecision={selected.jevDecision} />}

      {selected && (
        <div className="score-studio-detail">
          <section className="score-studio-panel">
            <div className="score-studio-section-head">
              <div>
                <p className="score-studio-overline">Explainability</p>
                <h2>Evidence behind this score</h2>
              </div>
              <span>{audit?.signalsCount ?? 0} recorded events</span>
            </div>
            {audit?.positiveSignals.length ? (
              <ul className="score-studio-evidence">
                {audit.positiveSignals.slice(0, 5).map((signal, index) => (
                  <li key={`${signal}-${index}`}>
                    <CheckCircle2 size={16} aria-hidden="true" />
                    <span>{signal}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="score-studio-placeholder">
                No positive score evidence has been recorded for this demand unit.
              </p>
            )}
            {!!audit?.negativeSignals.length && (
              <div className="score-studio-cautions">
                <strong>Needs attention</strong>
                {audit.negativeSignals.slice(0, 3).map((signal, index) => (
                  <p key={`${signal}-${index}`}>
                    <CircleAlert size={14} aria-hidden="true" /> {signal}
                  </p>
                ))}
              </div>
            )}
          </section>

          <section className="score-studio-panel score-studio-next">
            <div className="score-studio-section-head">
              <div>
                <p className="score-studio-overline">Operating decision</p>
                <h2>What happens next</h2>
              </div>
              <span
                className={`score-studio-route ${
                  routeFor(selected) === 'SALES_LANE'
                    ? 'sales'
                    : routeFor(selected) === 'MARKETING_LANE'
                      ? 'marketing'
                      : 'hold'
                }`}
              >
                {routeFor(selected) === 'SALES_LANE'
                  ? 'Sales lane'
                  : routeFor(selected) === 'MARKETING_LANE'
                    ? 'Marketing lane'
                    : 'Hold'}
              </span>
            </div>

            <div className="score-studio-next-play">
              <span>Recommended play</span>
              <strong>
                {humanize(audit?.recommendedPlay || selected.recommendedPlaybookId || 'No play selected')}
              </strong>
            </div>

            <div className="score-studio-next-grid">
              <div>
                <span>Priority</span>
                <strong>{priorityLabels[audit?.priorityBand || ''] || 'Review'}</strong>
              </div>
              <div>
                <span>Buying group</span>
                <strong className="tabular-nums">{number(coverage)} / 100</strong>
              </div>
            </div>

            {coverage <= 0 && (
              <p className="score-studio-gate">
                <CircleAlert size={16} aria-hidden="true" className="shrink-0 mt-0.5" />
                No verified coverage. Audience activation and urgent sales routing are blocked.
              </p>
            )}

            <a
              href="#playbooks"
              onClick={() => sessionStorage.setItem('dm-playbook-demand-unit', selected.id)}
              className="score-studio-text-link"
            >
              Review playbook and delivery state <ArrowRight size={15} aria-hidden="true" />
            </a>
          </section>
        </div>
      )}

      {selected && (
        <section className="score-studio-history" aria-label="Stored score history">
          <div className="score-studio-section-head">
            <div>
              <p className="score-studio-overline">Score history</p>
              <h2>Recorded changes</h2>
            </div>
            <span>{history.length ? `${history.length} recent snapshots` : 'Current score only'}</span>
          </div>
          {historyState === 'loading' ? (
            <p className="score-studio-placeholder">Loading recorded scores…</p>
          ) : historyState === 'unavailable' ? (
            <p className="score-studio-placeholder">Score history is unavailable right now.</p>
          ) : history.length ? (
            <div className="score-studio-history-list">
              {history.slice(0, 5).map((snapshot, index) => {
                const previous = history[index + 1];
                const change = previous ? snapshot.composite_score - previous.composite_score : null;
                return (
                  <article key={snapshot.id}>
                    <span>{scoredAt(snapshot.scored_at)}</span>
                    <strong>{number(snapshot.composite_score)}</strong>
                    <small>
                      {change === null
                        ? 'First recorded score'
                        : `${change > 0 ? '+' : ''}${number(change)} pts since prior`}
                    </small>
                    <em>{snapshot.decision_applied ? 'Decision applied' : 'Score recorded'}</em>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="score-studio-placeholder">
              The current score predates snapshot tracking. Changes will appear here after this unit
              is rescored.
            </p>
          )}
        </section>
      )}

      <section className="score-studio-portfolio" aria-label="Demand unit score portfolio">
        <div className="score-studio-section-head">
          <div>
            <p className="score-studio-overline">Portfolio</p>
            <h2>Review demand units</h2>
          </div>
          <span>
            {filtered.length} shown of {accounts.length}
          </span>
        </div>

        <div className="score-studio-controls">
          <label className="score-studio-search">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">Search accounts or needs</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search account, domain, or need…"
            />
          </label>
          <label className="score-studio-select">
            <SlidersHorizontal size={15} aria-hidden="true" />
            <span className="sr-only">Filter demand units</span>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as PortfolioFilter)}
            >
              <option value="all">All routes</option>
              <option value="sales">Sales lane</option>
              <option value="marketing">Marketing lane</option>
              <option value="hold">On hold</option>
              <option value="coverage">Coverage gap</option>
            </select>
            <ChevronDown size={15} aria-hidden="true" />
          </label>
          <label className="score-studio-select">
            <span className="sr-only">Sort demand units</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as PortfolioSort)}
            >
              <option value="highest">Highest score</option>
              <option value="lowest">Lowest score</option>
              <option value="recent">Recently scored</option>
            </select>
            <ChevronDown size={15} aria-hidden="true" />
          </label>
        </div>

        <div className="score-studio-table-wrap">
          <table className="score-studio-table">
            <thead>
              <tr>
                <th scope="col">Account / need</th>
                <th scope="col" className="text-right">Score</th>
                <th scope="col" className="text-right">Fit</th>
                <th scope="col" className="text-right">Intent</th>
                <th scope="col" className="text-right">Coverage</th>
                <th scope="col">Operating lane</th>
                <th scope="col">
                  <span className="sr-only">Review</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, visibleCount).map((item) => (
                <tr key={item.id} className={item.id === selected?.id ? 'selected' : ''}>
                  <td>
                    <strong>{item.accountName}</strong>
                    <span>{item.solutionTarget}</span>
                  </td>
                  <td className="score-studio-table-score text-right">{number(scoreFor(item))}</td>
                  <td className="text-right">
                    {number(item.scoreAudit?.fit ?? item.scores.firmographicFit)}
                  </td>
                  <td className="text-right">
                    {number(item.scoreAudit?.intent ?? item.scores.behavioralEngagement)}
                  </td>
                  <td className="text-right">{number(coverageFor(item))}</td>
                  <td>
                    <span
                      className={`score-studio-table-route ${
                        routeFor(item) === 'SALES_LANE'
                          ? 'sales'
                          : routeFor(item) === 'MARKETING_LANE'
                            ? 'marketing'
                            : 'hold'
                      }`}
                    >
                      {routeFor(item) === 'SALES_LANE'
                        ? 'Sales'
                        : routeFor(item) === 'MARKETING_LANE'
                          ? 'Marketing'
                          : 'Hold'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(item.id);
                        topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      aria-label={`Review score for ${item.accountName}`}
                    >
                      Review <ArrowRight size={14} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <p className="score-studio-empty">No demand units match these filters.</p>
          )}
        </div>

        {filtered.length > visibleCount && (
          <button
            className="score-studio-more"
            type="button"
            onClick={() => setVisibleCount((count) => count + 20)}
          >
            Show 20 more <ChevronDown size={15} aria-hidden="true" />
          </button>
        )}
      </section>

      <p className="score-studio-footnote">
        Scores prioritize demand; they are not purchase probabilities. Campaign reporting without an
        identified person does not increase buyer intent.
      </p>
    </div>
  );
};
