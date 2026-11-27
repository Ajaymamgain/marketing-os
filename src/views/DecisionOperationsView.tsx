import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Search, ShieldCheck, X } from 'lucide-react';
import { TelemetrySignal, AccountDemandUnit, ActiveNavTab } from '../types';
import { fetchDecisionRecommendations, DecisionRecommendation } from '../services/api';

interface Props {
  signals: TelemetrySignal[];
  accounts: AccountDemandUnit[];
  onSelectAccount: (account: AccountDemandUnit) => void;
  onNavigateTab?: (tab: ActiveNavTab) => void;
}

type DecisionFilter = 'all' | 'blocked' | 'ready';
type DecisionSort = 'score' | 'coverage_asc' | 'name';

export const DecisionOperationsView: React.FC<Props> = ({
  accounts,
  onSelectAccount,
  onNavigateTab,
}) => {
  const [items, setItems] = useState<DecisionRecommendation[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DecisionFilter>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<DecisionSort>('score');
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    let active = true;
    fetchDecisionRecommendations()
      .then((rows) => {
        if (active) {
          setItems(rows);
          setError('');
        }
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Decisions unavailable.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [accounts]);

  const accountById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts]
  );

  const matchingAccounts = useMemo(
    () => items.filter((item) => accountById.has(item.demand_unit_key)),
    [items, accountById]
  );

  const blockedCount = useMemo(
    () => matchingAccounts.filter((item) => item.blockers.length > 0).length,
    [matchingAccounts]
  );

  const readyCount = matchingAccounts.length - blockedCount;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return matchingAccounts
      .filter((item) => {
        if (filter === 'blocked' && item.blockers.length === 0) return false;
        if (filter === 'ready' && item.blockers.length > 0) return false;
        if (!q) return true;
        const account = accountById.get(item.demand_unit_key);
        return [
          account?.accountName,
          item.account_domain,
          item.need_key.replaceAll('_', ' '),
          item.recommended_action,
          ...item.blockers.map((b) => b.message),
        ].some((v) => v?.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        if (sort === 'coverage_asc') {
          return a.coverage_score - b.coverage_score || b.composite_score - a.composite_score;
        }
        if (sort === 'name') {
          const na = accountById.get(a.demand_unit_key)?.accountName || a.account_domain;
          const nb = accountById.get(b.demand_unit_key)?.accountName || b.account_domain;
          return na.localeCompare(nb);
        }
        return b.composite_score - a.composite_score;
      });
  }, [matchingAccounts, filter, query, sort, accountById]);

  const hasFilters = filter !== 'all' || query.trim().length > 0;

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <div className="dm-page-heading">
        <div>
          <h1>Decision Inbox</h1>
          <p>Review policy holds and the next operating step for each demand unit.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onNavigateTab ? (
            <>
              <button
                type="button"
                className="dm-button"
                onClick={() => onNavigateTab('OPERATIONS_DESK')}
              >
                Operations Desk
              </button>
              <button
                type="button"
                className="dm-button dm-button-primary"
                onClick={() => onNavigateTab('SIGNALS')}
              >
                Open Playbooks <ArrowRight size={15} />
              </button>
            </>
          ) : (
            <>
              <a href="#operations-desk" className="dm-button">
                Operations Desk
              </a>
              <a href="#playbooks" className="dm-button dm-button-primary">
                Open Playbooks <ArrowRight size={15} />
              </a>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <article className="dm-card dm-metric">
          <div>Decisions queued</div>
          <strong className="tabular-nums">{matchingAccounts.length.toLocaleString()}</strong>
          <p>Evaluated demand units in active workspace</p>
        </article>
        <article className="dm-card dm-metric">
          <div>Policy holds</div>
          <strong className="tabular-nums text-[#b45309]">{blockedCount.toLocaleString()}</strong>
          <p>Held for coverage, mapping, or consent requirements</p>
        </article>
        <article className="dm-card dm-metric">
          <div>Ready to route</div>
          <strong className="tabular-nums text-[#15803d]">{readyCount.toLocaleString()}</strong>
          <p>Cleared policy checks for next operating step</p>
        </article>
      </div>

      <div className="dm-notice">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#64748b]" />
        <p>
          Decision Inbox shows recorded recommendations and held actions. Provider delivery only
          runs in Playbooks after coverage, destination mapping, and consent checks pass.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="Decision filters" className="dm-segmented">
            <button
              type="button"
              aria-pressed={filter === 'all'}
              onClick={() => {
                setFilter('all');
                setLimit(20);
              }}
            >
              All decisions ({matchingAccounts.length})
            </button>
            <button
              type="button"
              aria-pressed={filter === 'blocked'}
              onClick={() => {
                setFilter('blocked');
                setLimit(20);
              }}
            >
              Policy holds ({blockedCount})
            </button>
            <button
              type="button"
              aria-pressed={filter === 'ready'}
              onClick={() => {
                setFilter('ready');
                setLimit(20);
              }}
            >
              Ready ({readyCount})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <label className="relative w-full sm:w-64">
              <span className="sr-only">Search decisions</span>
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"
              />
              <input
                type="search"
                className="dm-input dm-search-input w-full"
                placeholder="Account, need, or blocker…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setLimit(20);
                }}
              />
            </label>

            <label className="shrink-0">
              <span className="sr-only">Sort decisions</span>
              <select
                className="dm-input h-[38px] text-[13px]"
                value={sort}
                onChange={(e) => setSort(e.target.value as DecisionSort)}
              >
                <option value="score">Highest score</option>
                <option value="coverage_asc">Lowest coverage</option>
                <option value="name">Account A–Z</option>
              </select>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748b] tabular-nums">
          <span>
            Showing{' '}
            <strong className="font-semibold text-[#0f172a]">
              {Math.min(limit, visible.length).toLocaleString()}
            </strong>{' '}
            of{' '}
            <strong className="font-semibold text-[#0f172a]">
              {visible.length.toLocaleString()}
            </strong>{' '}
            matching decisions
            {hasFilters ? ` (${matchingAccounts.length.toLocaleString()} total)` : ''}
          </span>
          {hasFilters && (
            <button
              type="button"
              className="inline-flex items-center gap-1 font-medium text-[#1d4ed8] hover:underline"
              onClick={() => {
                setFilter('all');
                setQuery('');
                setLimit(20);
              }}
            >
              <X size={13} /> Clear filters
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="dm-notice dm-notice-error" role="alert">
          {error}
        </div>
      )}

      {loading && (
        <div className="grid gap-4 lg:grid-cols-2" role="status" aria-label="Loading decision queue">
          {[0, 1, 2, 3].map((idx) => (
            <div key={idx} className="dm-card space-y-3">
              <div className="dm-skeleton h-5 w-48" />
              <div className="dm-skeleton h-4 w-full" />
              <div className="dm-skeleton h-4 w-32" />
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.slice(0, limit).map((item) => {
            const account = accountById.get(item.demand_unit_key);
            const hasHold = item.blockers.length > 0;
            return (
              <section className="dm-card flex flex-col" key={item.demand_unit_key}>
                <div className="dm-section-title">
                  <div>
                    <h2>{account?.accountName || item.account_domain}</h2>
                    <p className="capitalize">{item.need_key.replaceAll('_', ' ')}</p>
                  </div>
                  <span
                    className={`text-xs font-semibold whitespace-nowrap ${
                      hasHold ? 'text-[#b45309]' : 'text-[#15803d]'
                    }`}
                  >
                    {hasHold ? 'Policy hold' : 'Ready to route'}
                  </span>
                </div>

                <p className="mt-4 text-sm font-medium leading-6 text-[#0f172a]">
                  {item.recommended_action}
                </p>

                <p className="dm-caption mt-2 tabular-nums">
                  Score {item.composite_score.toFixed(1)} · Coverage {item.coverage_score}%
                </p>

                {item.blockers.length > 0 && (
                  <div className="mt-3 space-y-1.5 border-t border-[#f1f5f9] pt-3">
                    {item.blockers.map((blocker) => (
                      <p className="text-xs text-[#92400e]" key={blocker.code}>
                        {blocker.message}
                      </p>
                    ))}
                  </div>
                )}

                <div className="mt-auto flex flex-wrap items-center gap-4 pt-5">
                  {account && (
                    <button
                      type="button"
                      className="dm-button"
                      onClick={() => onSelectAccount(account)}
                    >
                      Inspect evidence <ArrowRight size={14} />
                    </button>
                  )}
                  <a
                    className="dm-text-button"
                    href="#playbooks"
                    onClick={(event) => {
                      sessionStorage.setItem('dm-playbook-demand-unit', item.demand_unit_key);
                      if (onNavigateTab) {
                        event.preventDefault();
                        onNavigateTab('SIGNALS');
                      }
                    }}
                  >
                    Open in Playbooks
                  </a>
                  <a
                    className="dm-text-button"
                    href="#tasks"
                    onClick={(event) => {
                      if (onNavigateTab) {
                        event.preventDefault();
                        onNavigateTab('TASKS');
                      }
                    }}
                  >
                    View activity
                  </a>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {visible.length > limit && (
        <button
          type="button"
          className="dm-button w-full"
          onClick={() => setLimit((count) => count + 20)}
        >
          Show 20 more decisions ({visible.length - limit} remaining)
        </button>
      )}

      {!loading && !error && !visible.length && (
        <div className="dm-card dm-empty space-y-2">
          <p>No decisions match these criteria.</p>
          {hasFilters && (
            <button
              type="button"
              className="dm-text-button"
              onClick={() => {
                setFilter('all');
                setQuery('');
                setLimit(20);
              }}
            >
              Reset filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};
