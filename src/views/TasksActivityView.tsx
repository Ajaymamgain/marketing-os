import React, { useState } from 'react';
import { ArrowRight, Activity, Search, ShieldCheck, ChevronDown, ChevronUp, X } from 'lucide-react';
import { OperationalTask, AccountDemandUnit } from '../types';

interface Props {
  tasks: OperationalTask[];
  accounts: AccountDemandUnit[];
  onSelectAccount: (account: AccountDemandUnit) => void;
}

const formatStamp = (value?: string) =>
  value && !Number.isNaN(Date.parse(value))
    ? new Date(value).toLocaleString()
    : 'Time not recorded';

const formatNumber = (value?: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(1) : '—';

const humanize = (value?: string) =>
  value ? value.replaceAll('_', ' ').toLowerCase() : 'Not recorded';

export const TasksActivityView: React.FC<Props> = ({ tasks, accounts, onSelectAccount }) => {
  const [filter, setFilter] = useState<'system' | 'holds' | 'delivery' | 'all' | 'archived'>('system');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const system = tasks.filter(
    (record) => record.audit?.source === 'jev_decision' && !record.archived
  );
  const holds = system.filter(
    (record) => record.audit?.decision_kind === 'decision' && record.audit?.coverage === 0
  );
  const deliveries = system.filter((record) => record.audit?.decision_kind === 'marketo_delivery');
  const archived = tasks.filter((record) => record.archived);

  const records = tasks
    .filter((record) => {
      if (filter === 'system' && (record.audit?.source !== 'jev_decision' || record.archived)) {
        return false;
      }
      if (
        filter === 'holds' &&
        (record.audit?.source !== 'jev_decision' ||
          record.audit?.decision_kind !== 'decision' ||
          record.audit?.coverage !== 0 ||
          record.archived)
      ) {
        return false;
      }
      if (
        filter === 'delivery' &&
        (record.audit?.decision_kind !== 'marketo_delivery' || record.archived)
      ) {
        return false;
      }
      if (filter === 'archived' && !record.archived) return false;
      return [
        record.title,
        record.accountName,
        record.audit?.play || '',
        record.audit?.routing_state || '',
      ].some((value) => value.toLowerCase().includes(query.toLowerCase()));
    })
    .sort(
      (a, b) =>
        (Date.parse(b.audit?.recorded_at || b.createdAt || '') || 0) -
        (Date.parse(a.audit?.recorded_at || a.createdAt || '') || 0)
    );

  const pages = Math.max(1, Math.ceil(records.length / 20));
  const current = Math.min(page, pages);
  const pageStart = records.length ? (current - 1) * 20 + 1 : 0;
  const pageEnd = Math.min(current * 20, records.length);

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <div className="dm-page-heading">
        <div>
          <h1>Operational activity</h1>
          <p>
            Read the decisions and delivery records that automation creates as account demand
            changes.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#475569]">
          <Activity size={14} className="text-[#1d4ed8]" />
          System generated
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {(
          [
            ['system', 'System records', system.length, 'Decision and delivery records'],
            ['holds', 'Coverage holds', holds.length, 'No audience addition from these decisions'],
            ['delivery', 'Delivery records', deliveries.length, 'Inspect connector outcomes separately'],
          ] as const
        ).map(([targetFilter, label, value, note]) => (
          <button
            type="button"
            key={label}
            onClick={() => {
              setFilter(targetFilter);
              setPage(1);
            }}
            className={`dm-card dm-metric text-left transition-colors hover:border-[#cbd5e1] ${
              filter === targetFilter ? 'border-[#1d4ed8]/40 bg-[#f8fafc]' : ''
            }`}
          >
            <div>{label}</div>
            <strong className="tabular-nums">{value.toLocaleString()}</strong>
            <p>{note}</p>
          </button>
        ))}
      </div>

      <div className="dm-notice">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#64748b]" />
        <p>
          This is an activity log, not a manual checklist. Each stable operating action keeps its
          latest score snapshot. A decision record does not confirm a provider write; score history
          and connector jobs retain separate evidence.
        </p>
      </div>

      <section className="dm-card !p-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e2e8f0] px-6 py-4">
          <div className="dm-segmented" role="group" aria-label="Activity filter">
            {(
              [
                ['system', `System decisions (${system.length})`],
                ['holds', `Coverage holds (${holds.length})`],
                ['delivery', `Delivery records (${deliveries.length})`],
                ['all', `All (${tasks.length})`],
                ['archived', `Archived (${archived.length})`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={filter === id}
                onClick={() => {
                  setFilter(id);
                  setPage(1);
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="relative w-full sm:w-72">
            <span className="sr-only">Search activity</span>
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"
            />
            <input
              type="search"
              className="dm-input dm-search-input w-full"
              placeholder="Account, play, lane, or action…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f1f5f9] bg-[#f8fafc] px-6 py-2.5 text-xs text-[#64748b] tabular-nums">
          <span>
            Showing{' '}
            <strong className="font-semibold text-[#0f172a]">
              {records.length ? `${pageStart}–${pageEnd}` : '0'}
            </strong>{' '}
            of{' '}
            <strong className="font-semibold text-[#0f172a]">
              {records.length.toLocaleString()}
            </strong>{' '}
            matching records ({tasks.length.toLocaleString()} total)
          </span>
          {(query.trim() || filter !== 'system') && (
            <button
              type="button"
              className="inline-flex items-center gap-1 font-medium text-[#1d4ed8] hover:underline"
              onClick={() => {
                setFilter('system');
                setQuery('');
                setPage(1);
              }}
            >
              <X size={13} /> Reset filters
            </button>
          )}
        </div>

        <ol className="divide-y divide-[#e2e8f0]">
          {records.slice((current - 1) * 20, current * 20).map((record) => {
            const audit = record.audit;
            const account = accounts.find((a) => a.id === record.accountId);
            const delivery = audit?.decision_kind === 'marketo_delivery';
            const isExpanded = expanded === record.id;
            const isHold = audit?.coverage === 0 && !delivery && !record.archived;

            return (
              <li key={record.id} className="px-6 py-5 transition-colors hover:bg-[#f8fafc]/60">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="dm-caption tabular-nums">
                      {formatStamp(audit?.recorded_at || record.createdAt)} ·{' '}
                      {delivery
                        ? 'Delivery record'
                        : audit?.source === 'jev_decision'
                          ? 'Operating decision'
                          : 'Legacy record'}
                    </p>
                    <h2 className="mt-1 text-base font-semibold text-[#0f172a]">
                      {account
                        ? `${account.accountName} · ${account.solutionTarget}`
                        : record.accountName}
                    </h2>
                  </div>
                  <span
                    className={`text-xs font-semibold capitalize ${
                      record.archived
                        ? 'text-[#64748b]'
                        : isHold
                          ? 'text-[#b45309]'
                          : delivery
                            ? 'text-[#15803d]'
                            : 'text-[#1d4ed8]'
                    }`}
                  >
                    {record.archived
                      ? 'Archived duplicate'
                      : delivery
                        ? 'Delivery recorded'
                        : isHold
                          ? 'Coverage hold'
                          : humanize(audit?.routing_state)}
                  </span>
                </div>

                <p className="mt-2 text-sm leading-6 text-[#334155]">
                  {audit?.operational_next_action?.title || record.title}
                </p>

                {audit?.source === 'jev_decision' && (
                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-[#475569] tabular-nums">
                    <span>
                      Fit <strong className="font-semibold text-[#0f172a]">{formatNumber(audit.fit)}</strong>
                    </span>
                    <span>
                      Intent{' '}
                      <strong className="font-semibold text-[#0f172a]">
                        {formatNumber(audit.intent)}
                      </strong>
                    </span>
                    <span>
                      Coverage{' '}
                      <strong className="font-semibold text-[#0f172a]">
                        {formatNumber(audit.coverage)}
                      </strong>
                    </span>
                    <span>
                      Composite{' '}
                      <strong className="font-semibold text-[#1d4ed8]">
                        {formatNumber(audit.composite)}
                      </strong>
                    </span>
                  </div>
                )}

                <div className="mt-3.5 flex flex-wrap items-center gap-5">
                  {account && (
                    <button
                      type="button"
                      className="dm-text-button"
                      onClick={() => onSelectAccount(account)}
                    >
                      Inspect demand unit <ArrowRight size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="dm-text-button"
                    aria-expanded={isExpanded}
                    onClick={() => setExpanded(isExpanded ? null : record.id)}
                  >
                    {isExpanded ? 'Hide details' : 'Record details'}{' '}
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-4 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4">
                    <dl className="grid gap-4 text-sm sm:grid-cols-2">
                      {[
                        ['Recommended play', humanize(audit?.play)],
                        ['Recorded stage', humanize(audit?.stage)],
                        ['Requested audience action', humanize(audit?.marketo_action)],
                        ['Destination', audit?.marketo_destination || 'No destination recorded'],
                        [
                          'Decision evaluation',
                          audit?.decision_applied === true
                            ? 'Recorded as applied'
                            : audit?.decision_applied === false
                              ? 'Not applied'
                              : 'Not recorded in this legacy record',
                        ],
                        ['Scored at', formatStamp(audit?.scored_at)],
                        [
                          'Record type',
                          delivery
                            ? 'Delivery evidence'
                            : record.archived
                              ? 'Archived decision'
                              : 'Operating decision',
                        ],
                        ['Record ID', record.id],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <dt className="dm-caption">{label}</dt>
                          <dd className="mt-0.5 break-words font-medium text-[#0f172a]">{value}</dd>
                        </div>
                      ))}
                    </dl>
                    {delivery && (
                      <p className="dm-caption mt-4 border-t border-[#e2e8f0] pt-3 tabular-nums">
                        Recorded delivery: {audit?.applied_count ?? '—'} of{' '}
                        {audit?.requested_count ?? '—'} contacts. Run ID:{' '}
                        {audit?.run_id || 'Not recorded'}.
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        {!records.length && <div className="dm-empty">No activity matches this filter.</div>}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e2e8f0] bg-[#f8fafc] px-6 py-3.5">
          <p className="dm-caption tabular-nums">
            {records.length.toLocaleString()} records · Page {current} of {pages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="dm-button"
              disabled={current <= 1}
              onClick={() => setPage(current - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="dm-button"
              disabled={current >= pages}
              onClick={() => setPage(current + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
