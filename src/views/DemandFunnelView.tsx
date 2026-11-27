import React, { useState } from 'react';
import { AccountDemandUnit, FunnelStage } from '../types';

interface Props {
  accounts: AccountDemandUnit[];
  onSelectAccount: (account: AccountDemandUnit) => void;
}

interface Step {
  stage: FunnelStage;
  name: string;
  count: number;
  description: string;
}

const stageDefinitions: Omit<Step, 'count'>[] = [
  { stage: 'target', name: 'Tracked', description: 'Every demand unit currently in this workspace.' },
  { stage: 'engaged', name: 'Engaged or later', description: 'Units whose current stage is Engaged or later.' },
  { stage: 'prioritized_du', name: 'Prioritized or later', description: 'Units whose current stage is Prioritized or later.' },
  { stage: 'qualified_du', name: 'Qualified or later', description: 'Units whose current stage is Qualified or later.' },
  { stage: 'pipeline_deal', name: 'Pipeline or later', description: 'Units whose current stage is Pipeline or later.' },
  { stage: 'closed_won', name: 'Closed won or later', description: 'Units whose current stage is Closed Won or Expansion.' },
  { stage: 'expansion', name: 'Expansion', description: 'Units currently in an expansion stage.' },
];

const count = (value: number) => value.toLocaleString();
const percent = (value: number) => `${value.toFixed(1)}%`;

export const DemandFunnelView: React.FC<Props> = ({ accounts, onSelectAccount }) => {
  const [selectedStage, setSelectedStage] = useState<FunnelStage>('prioritized_du');
  const [showAll, setShowAll] = useState(false);
  const stageOrder = stageDefinitions.map((step) => step.stage);
  const steps: Step[] = stageDefinitions.map((step, index) => ({
    ...step,
    count: accounts.filter((account) => stageOrder.indexOf(account.stage) >= index).length,
  }));
  const selectedIndex = Math.max(0, steps.findIndex((step) => step.stage === selectedStage));
  const selected = steps[selectedIndex];
  const previous = steps[selectedIndex - 1];
  const exactCounts = steps.map((step, index) => step.count - (steps[index + 1]?.count ?? 0));
  const liveInStage = accounts.filter((account) => account.stage === selectedStage);
  const visibleAccounts = showAll ? accounts : liveInStage;
  const fictionalSampleCount = accounts.filter((account) => account.domain.endsWith('.example')).length;
  const tracked = steps[0]?.count ?? 0;

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-4">
      <header className="px-1">
        <h1 className="text-[22px] font-semibold tracking-tight text-[#1c1f26]">Demand funnel</h1>
        <p className="mt-1 max-w-[68ch] text-[13px] leading-5 text-[#6b7280]">
          Current stage snapshot. Bar length is the share of tracked units at that stage or later, not a measured conversion rate.
          {fictionalSampleCount > 0 ? ` ${fictionalSampleCount} units use fictional .example domains.` : ''}
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Workspace funnel summary">
        {[
          { label: 'Tracked units', value: count(tracked), detail: 'All current stages' },
          { label: 'Prioritized or later', value: count(steps[2]?.count ?? 0), detail: 'At or beyond priority' },
          { label: 'Qualified or later', value: count(steps[3]?.count ?? 0), detail: 'At or beyond qualification' },
          { label: 'Closed won or later', value: count(steps[5]?.count ?? 0), detail: 'At or beyond won' },
        ].map((metric) => (
          <article key={metric.label} className="hex-cell">
            <p className="hex-label">{metric.label}</p>
            <p className="hex-figure">{metric.value}</p>
            <p className="hex-note">{metric.detail}</p>
          </article>
        ))}
      </section>

      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.85fr)]">
        <section className="hex-cell" aria-labelledby="funnel-heading">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 id="funnel-heading" className="text-[14px] font-semibold text-[#1c1f26]">Volume by stage</h2>
            <span className="text-[12px] text-[#9ca3af]">Share of tracked units</span>
          </div>
          <div className="flex flex-col">
            {steps.map((step, index) => {
              const isSelected = selected.stage === step.stage;
              const share = tracked ? (step.count / tracked) * 100 : 0;
              return (
                <button
                  key={step.stage}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedStage(step.stage);
                    setShowAll(false);
                  }}
                  className={`rounded-md px-3 py-2.5 text-left ${isSelected ? 'bg-[#eef3ff]' : 'hover:bg-[#f7f8fa]'}`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className={`text-[13px] ${isSelected ? 'font-semibold text-[#1d4ed8]' : 'font-medium text-[#1c1f26]'}`}>
                      {step.name}
                    </span>
                    <span className="text-[13px] font-semibold tabular-nums text-[#1c1f26]">{count(step.count)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e6e8ee]" role="img" aria-label={`${percent(share)} of tracked units`}>
                      <div className="h-full rounded-full bg-[#1d4ed8]" style={{ width: `${share}%` }} />
                    </div>
                    <span className="w-12 text-right text-[12px] tabular-nums text-[#6b7280]">{percent(share)}</span>
                  </div>
                  <p className="mt-1 text-[12px] text-[#6b7280]">{count(exactCounts[index])} at this stage</p>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="hex-cell xl:sticky xl:top-4" aria-label="Selected stage details">
          <p className="hex-label">Selected stage</p>
          <h2 className="mt-2 text-[18px] font-semibold tracking-tight text-[#1c1f26]">{selected.name}</h2>
          <p className="mt-1 text-[13px] leading-5 text-[#6b7280]">{selected.description}</p>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-[#eef0f3] pt-4">
            <div>
              <dt className="text-[12px] text-[#6b7280]">At this stage or later</dt>
              <dd className="mt-1 text-[20px] font-semibold tabular-nums text-[#1c1f26]">{count(selected.count)}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-[#6b7280]">Exactly this stage</dt>
              <dd className="mt-1 text-[20px] font-semibold tabular-nums text-[#1c1f26]">{count(liveInStage.length)}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-[#6b7280]">Share of tracked</dt>
              <dd className="mt-1 text-[16px] font-semibold tabular-nums text-[#1c1f26]">{tracked ? percent((selected.count / tracked) * 100) : '—'}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-[#6b7280]">Share of prior step</dt>
              <dd className="mt-1 text-[16px] font-semibold tabular-nums text-[#1c1f26]">{previous?.count ? percent((selected.count / previous.count) * 100) : '—'}</dd>
            </div>
          </dl>
          {selected.stage === 'qualified_du' && (
            <p className="mt-4 text-[12px] leading-5 text-[#6b7280]">
              Coverage 0 blocks A1, Engaged, the 4-hour SLA, and persona discovery.
            </p>
          )}
        </aside>
      </div>

      <section className="hex-cell overflow-hidden p-0" aria-labelledby="live-units-heading">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <h2 id="live-units-heading" className="text-[14px] font-semibold text-[#1c1f26]">
            {showAll ? 'All demand units' : selected.name}
          </h2>
          <button
            type="button"
            onClick={() => setShowAll((value) => !value)}
            className="text-[12px] font-medium text-[#1d4ed8] hover:underline"
          >
            {showAll ? 'Show this stage' : `Show all ${accounts.length}`}
          </button>
        </div>
        {visibleAccounts.length === 0 ? (
          <p className="border-t border-[#eef0f3] px-4 py-10 text-center text-[13px] text-[#6b7280]">
            No demand units are currently in this stage.
          </p>
        ) : (
          <div className="overflow-x-auto border-t border-[#eef0f3]">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#9ca3af]">
                  <th className="px-4 py-2 font-medium">Account</th>
                  <th className="px-3 py-2 font-medium">Need</th>
                  <th className="px-3 py-2 text-right font-medium">Coverage</th>
                  <th className="px-4 py-2 text-right font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                {visibleAccounts.map((account) => (
                  <tr
                    key={account.id}
                    onClick={() => onSelectAccount(account)}
                    className="cursor-pointer border-t border-[#eef0f3] hover:bg-[#f7f8fa]"
                  >
                    <td className="px-4 py-3 text-[13px] font-medium text-[#1c1f26]">{account.accountName}</td>
                    <td className="px-3 py-3 text-[13px] text-[#3f4450]">{account.solutionTarget}</td>
                    <td className="px-3 py-3 text-right text-[13px] tabular-nums text-[#1c1f26]">{account.committee.coverageScore}%</td>
                    <td className="px-4 py-3 text-right text-[14px] font-semibold tabular-nums text-[#1c1f26]">{account.compositeScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
