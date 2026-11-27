import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, Users } from 'lucide-react';
import { AccountDemandUnit } from '../types';

interface Props {
  accounts: AccountDemandUnit[];
  onSelectAccount: (account: AccountDemandUnit) => void;
}

const roles = [
  ['champion', 'Champion'],
  ['economic_buyer', 'Economic buyer'],
  ['technical_evaluator', 'Technical evaluator'],
] as const;

export const CommitteeCoverageInspectorView: React.FC<Props> = ({
  accounts,
  onSelectAccount,
}) => {
  const [selectedId, setSelectedId] = useState('');
  const selected = accounts.find((a) => a.id === selectedId) || accounts[0];

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <div className="dm-page-heading">
        <div>
          <h1>Coverage checks</h1>
          <p>Inspect the supported role evidence that controls a buying group’s operating gates.</p>
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
        <div className="dm-card dm-empty">No demand units available.</div>
      ) : (
        <>
          <section className="dm-card">
            <div className="dm-section-title">
              <div>
                <h2>{selected.accountName}</h2>
                <p>{selected.solutionTarget}</p>
              </div>
              <button
                type="button"
                className="dm-button"
                onClick={() => onSelectAccount(selected)}
              >
                Inspect demand <ArrowRight size={15} />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 divide-y divide-[#e2e8f0] rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {[
                ['Supported coverage', `${selected.committee.coverageScore}%`],
                ['Identified people', selected.committee.members.length],
                [
                  'Coverage-ready people',
                  selected.committee.members.filter((m) => m.status === 'active').length,
                ],
              ].map(([label, value]) => (
                <div key={String(label)} className="p-4">
                  <p className="dm-caption">{label}</p>
                  <strong className="mt-1 block text-2xl font-semibold tabular-nums text-[#0f172a]">
                    {value}
                  </strong>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-3">
            {roles.map(([role, label]) => {
              const identified = selected.committee.members.filter((m) => m.role === role);
              const active = identified.filter((m) => m.status === 'active');
              return (
                <article className="dm-card" key={role}>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-semibold text-[#0f172a]">{label}</h2>
                    <Users size={16} className="text-[#64748b]" />
                  </div>
                  <p
                    className={`mt-3 text-xs font-semibold ${
                      active.length ? 'text-[#15803d]' : 'text-[#b45309]'
                    }`}
                  >
                    {active.length ? 'Supported coverage present' : 'Evidence missing'}
                  </p>
                  <p className="dm-caption mt-2 tabular-nums">
                    {identified.length} identified · {active.length} coverage-ready
                  </p>
                  <p className="dm-caption mt-2">
                    A recorded name or inferred title alone does not qualify this role.
                  </p>
                </article>
              );
            })}
          </div>

          <section className="dm-card">
            <h2 className="flex items-center gap-2 text-base font-semibold text-[#0f172a]">
              <ShieldCheck size={17} className="text-[#64748b]" />
              Operating gates
            </h2>
            <p className="dm-caption mt-1.5">
              Coverage is an eligibility check. It does not grant consent, campaign permission, or
              connector access.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {['A1 priority', 'Engaged stage', '4-hour sales SLA', 'Persona discovery'].map(
                (label) => {
                  const blocked = selected.committee.coverageScore === 0;
                  return (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-3 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3"
                    >
                      <span className="text-sm font-medium text-[#0f172a]">{label}</span>
                      <span
                        className={`text-xs font-semibold ${
                          blocked ? 'text-[#b45309]' : 'text-[#15803d]'
                        }`}
                      >
                        {blocked ? 'Blocked by coverage' : 'Coverage gate passed'}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
            <a href="#committees" className="dm-text-button mt-4">
              Review role evidence in buying committees <ArrowRight size={14} />
            </a>
          </section>

          <section className="dm-card !p-0 overflow-hidden">
            <div className="px-6 py-5">
              <h2 className="text-base font-semibold text-[#0f172a]">Member evidence</h2>
              <p className="dm-caption mt-1">
                Verification, consent, and recent engagement determine which people count.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="dm-table w-full min-w-[620px]">
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Recorded role</th>
                    <th>Evidence</th>
                    <th>Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.committee.members.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <strong className="font-semibold text-[#0f172a]">{m.name}</strong>
                        <p className="dm-caption mt-0.5">{m.title}</p>
                      </td>
                      <td className="capitalize">{m.role.replaceAll('_', ' ')}</td>
                      <td>
                        <p className="dm-caption">{m.keyNotes}</p>
                        <p className="dm-caption mt-0.5 tabular-nums">
                          Last engagement:{' '}
                          {m.lastSeen && !Number.isNaN(Date.parse(m.lastSeen))
                            ? new Date(m.lastSeen).toLocaleDateString()
                            : 'Not recorded'}
                        </p>
                      </td>
                      <td>
                        <span
                          className={`text-xs font-semibold ${
                            m.status === 'active' ? 'text-[#15803d]' : 'text-[#b45309]'
                          }`}
                        >
                          {m.status === 'active' ? 'Counts' : 'Not counted'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!selected.committee.members.length && (
              <p className="dm-empty">No member evidence recorded.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
};
