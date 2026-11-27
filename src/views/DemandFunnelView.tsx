import React, { useState } from 'react';
import { AccountDemandUnit, FunnelStage } from '../types';
import {
  DemandWaterfallFunnel,
  DEMAND_WATERFALL_STAGES,
} from '../components/DemandWaterfallFunnel';

interface Props {
  accounts: AccountDemandUnit[];
  onSelectAccount: (account: AccountDemandUnit) => void;
}

const STAGE_ORDER: FunnelStage[] = [
  'target',
  'engaged',
  'prioritized_du',
  'qualified_du',
  'pipeline_deal',
  'closed_won',
  'expansion',
];

const count = (value: number) => value.toLocaleString();

export const DemandFunnelView: React.FC<Props> = ({ accounts, onSelectAccount }) => {
  const [selectedStage, setSelectedStage] = useState<FunnelStage>('prioritized_du');
  const [showAll, setShowAll] = useState(false);

  const countAtOrLater = (stage: FunnelStage) => {
    const idx = STAGE_ORDER.indexOf(stage);
    return accounts.filter((account) => {
      const accIdx = STAGE_ORDER.indexOf(account.stage);
      return (accIdx === -1 ? 0 : accIdx) >= idx;
    }).length;
  };

  const selectedDef =
    DEMAND_WATERFALL_STAGES.find((s) => s.stage === selectedStage) ?? DEMAND_WATERFALL_STAGES[0];
  const liveInStage = accounts.filter((account) =>
    selectedStage === 'closed_won'
      ? account.stage === 'closed_won' || account.stage === 'expansion'
      : account.stage === selectedStage
  );
  const visibleAccounts = showAll ? accounts : liveInStage;
  const fictionalSampleCount = accounts.filter((account) =>
    account.domain.endsWith('.example')
  ).length;

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
      <header className="dm-page-heading">
        <div>
          <h1>Demand funnel</h1>
          <p className="max-w-[70ch]">
            Current account waterfall across every stage. Tapered width reflects the share of tracked
            units at each stage or later, paired with average composite scores.
            {fictionalSampleCount > 0
              ? ` ${fictionalSampleCount} units use sample .example domains.`
              : ''}
          </p>
        </div>
      </header>

      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Workspace funnel summary"
      >
        {[
          { label: 'Tracked units', value: count(accounts.length), detail: 'All current stages' },
          {
            label: 'Prioritized or later',
            value: count(countAtOrLater('prioritized_du')),
            detail: 'At or beyond priority',
          },
          {
            label: 'Qualified or later',
            value: count(countAtOrLater('qualified_du')),
            detail: 'At or beyond qualification',
          },
          {
            label: 'Closed won or later',
            value: count(countAtOrLater('closed_won')),
            detail: 'Closed won and expansion',
          },
        ].map((metric) => (
          <article key={metric.label} className="dm-card dm-metric">
            <div>{metric.label}</div>
            <strong>{metric.value}</strong>
            <p>{metric.detail}</p>
          </article>
        ))}
      </section>

      <DemandWaterfallFunnel
        accounts={accounts}
        selectedStage={selectedStage}
        onSelectStage={(stage) => {
          setSelectedStage(stage);
          setShowAll(false);
        }}
        onSelectAccount={onSelectAccount}
        title="Volume by stage"
        subtitle="Select any trapezoid segment to inspect stage scoring and filter the unit table below."
      />

      <section className="dm-card !p-0 overflow-hidden" aria-labelledby="live-units-heading">
        <div className="flex items-center justify-between gap-3 px-6 py-4">
          <div>
            <h2 id="live-units-heading" className="text-base font-semibold text-[#0f172a]">
              {showAll ? 'All demand units' : `${selectedDef.label} cohort`}
            </h2>
            <p className="dm-caption mt-0.5 tabular-nums">
              {visibleAccounts.length.toLocaleString()} units shown
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAll((value) => !value)}
            className="dm-text-button"
          >
            {showAll ? 'Show this stage only' : `Show all ${accounts.length}`}
          </button>
        </div>

        {visibleAccounts.length === 0 ? (
          <p className="dm-empty border-t border-[#e2e8f0]">
            No demand units are currently in this stage.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="dm-table w-full min-w-[560px]">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Need</th>
                  <th className="text-right">Coverage</th>
                  <th className="text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {visibleAccounts.map((account) => (
                  <tr
                    key={account.id}
                    onClick={() => onSelectAccount(account)}
                    className="cursor-pointer"
                  >
                    <td>
                      <button
                        type="button"
                        className="dm-account-link"
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelectAccount(account);
                        }}
                      >
                        {account.accountName}
                      </button>
                    </td>
                    <td className="text-[#475569]">{account.solutionTarget}</td>
                    <td className="text-right">{account.committee.coverageScore}%</td>
                    <td className="text-right font-semibold text-[#0f172a]">
                      {account.compositeScore}
                    </td>
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
