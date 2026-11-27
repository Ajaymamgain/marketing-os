import React from 'react';
import {
  ArrowRight,
  ShieldCheck,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Target,
} from 'lucide-react';
import { AccountDemandUnit, ActiveNavTab, TelemetrySignal, OperationalTask } from '../types';
import { JevAutomationStatus } from '../services/api';
import { DemandMomentumChart } from '../components/DemandMomentumChart';
import { DemandWaterfallFunnel } from '../components/DemandWaterfallFunnel';

interface Props {
  accounts: AccountDemandUnit[];
  signals: TelemetrySignal[];
  tasks: OperationalTask[];
  theme?: 'dark' | 'light';
  onSelectAccount: (account: AccountDemandUnit) => void;
  onNavigateTab: (tab: ActiveNavTab) => void;
  scoreFormula?: string;
  runtime?: JevAutomationStatus | null;
}

const readable = (value: string) => value.replaceAll('_', ' ').toLowerCase();

export const DemandOverviewView: React.FC<Props> = ({
  accounts,
  signals,
  tasks,
  onSelectAccount,
  onNavigateTab,
  runtime,
  scoreFormula,
}) => {
  const blocked = accounts.filter((a) => a.committee.coverageScore === 0).length;
  const ready = accounts.filter(
    (a) => a.committee.coverageScore > 0 && a.scoreAudit?.routingState === 'SALES_LANE'
  ).length;
  const evaluated = accounts.filter(
    (a) => a.jevDecision?.applied && a.jevDecision.provider === 'typesafe'
  ).length;
  const pending = tasks.filter((task) => task.audit?.source === 'jev_decision' && !task.archived);
  const ranked = [...accounts].sort((a, b) => b.compositeScore - a.compositeScore).slice(0, 7);

  const automation = runtime?.automation;
  const workers = Object.entries(automation?.workers || {});
  const workerIssues = workers.filter(([, worker]) => !worker.healthy).length;
  const pilot = runtime?.execution_policy.integration_mode === 'dry_run';

  const metrics = [
    {
      title: 'Tracked demand',
      value: accounts.length,
      detail: 'Account and need in current filter',
      icon: Target,
    },
    {
      title: 'Sales-ready demand',
      value: ready,
      detail: 'Sales lane with verified coverage',
      icon: CheckCircle2,
    },
    {
      title: 'Coverage holds',
      value: blocked,
      detail: 'Held until buying-group evidence is verified',
      icon: ShieldCheck,
    },
    {
      title: 'Automation records',
      value: pending.length,
      detail: 'Recorded decisions and delivery activity',
      icon: Activity,
    },
  ];

  return (
    <div className="dm-overview mx-auto max-w-[1440px] space-y-6">
      <div className="dm-page-heading">
        <div>
          <h1>Demand overview</h1>
          <p>Operating priorities, account waterfall, scoring momentum, and execution health.</p>
        </div>
        <button
          type="button"
          className="dm-button dm-button-primary"
          onClick={() => onNavigateTab('SIGNALS')}
        >
          Open playbooks <ArrowRight size={15} />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ title, value, detail, icon: Icon }) => (
          <article className="dm-card dm-metric" key={title}>
            <div className="flex items-center justify-between">
              <span>{title}</span>
              <Icon size={17} />
            </div>
            <strong>{value.toLocaleString()}</strong>
            <p>{detail}</p>
          </article>
        ))}
      </div>

      <DemandWaterfallFunnel
        accounts={accounts}
        onSelectAccount={onSelectAccount}
        onNavigateTab={onNavigateTab}
        scoreFormula={scoreFormula}
        showFullFunnelLink
      />

      <DemandMomentumChart
        accounts={accounts}
        signals={signals}
        onNavigateTab={onNavigateTab}
      />

      <section className="dm-card !p-0 overflow-hidden">
        <div className="dm-section-title px-6 py-5">
          <div>
            <h2>Demand to review</h2>
            <p>Highest composite scores paired with their operating gate and recommended play.</p>
          </div>
          <button
            type="button"
            className="dm-text-button"
            onClick={() => onNavigateTab('DEMAND_UNITS')}
          >
            All demand scores <ArrowRight size={14} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="dm-table w-full min-w-[680px]">
            <thead>
              <tr>
                <th>Account & need</th>
                <th className="text-right">Score</th>
                <th className="text-right">Coverage</th>
                <th>Operating gate</th>
                <th>Recommended play</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((a) => {
                const isHold = a.committee.coverageScore === 0;
                const isSales = !isHold && a.scoreAudit?.routingState === 'SALES_LANE';
                return (
                  <tr key={a.id}>
                    <td>
                      <button
                        type="button"
                        className="dm-account-link"
                        onClick={() => onSelectAccount(a)}
                      >
                        {a.accountName}
                      </button>
                      <p className="dm-caption mt-0.5">{a.solutionTarget}</p>
                    </td>
                    <td className="text-right">
                      <strong className="font-semibold text-[#0f172a]">{a.compositeScore}</strong>
                      <span className="dm-caption"> / 100</span>
                    </td>
                    <td className="text-right">{a.committee.coverageScore}%</td>
                    <td>
                      <span
                        className={`text-xs font-semibold capitalize ${
                          isHold
                            ? 'text-[#b45309]'
                            : isSales
                              ? 'text-[#15803d]'
                              : 'text-[#1d4ed8]'
                        }`}
                      >
                        {isHold ? 'Coverage hold' : readable(a.scoreAudit?.routingState || 'review')}
                      </span>
                    </td>
                    <td className="capitalize text-[#334155]">
                      {readable(a.recommendedPlaybookId || 'Not evaluated')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!ranked.length && (
            <div className="dm-empty flex flex-col items-center gap-3 py-10">
              <p>No demand units match this filter. Connect a data source or import historical activity.</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  className="dm-button dm-button-primary"
                  onClick={() => onNavigateTab('SIMULATOR')}
                >
                  Open data imports
                </button>
                <button
                  type="button"
                  className="dm-button"
                  onClick={() => onNavigateTab('CONNECTORS')}
                >
                  Review connections
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="dm-caption border-t border-[#e2e8f0] bg-[#f8fafc] px-6 py-3.5 tabular-nums">
          Composite = {scoreFormula || 'fit × 0.35 + intent × 0.40 + coverage × 0.25'}. Automated
          evaluation selects decisions; product policy enforces execution gates.
        </p>
      </section>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className="dm-card flex flex-col">
          <div className="dm-section-title">
            <div>
              <h2>Execution health</h2>
              <p>Live service status and recorded evaluations.</p>
            </div>
            <span
              className={`text-xs font-semibold ${
                !runtime
                  ? 'text-[#64748b]'
                  : pilot
                    ? 'text-[#b45309]'
                    : 'text-[#15803d]'
              }`}
            >
              {runtime
                ? pilot
                  ? 'Dry run'
                  : runtime.execution_policy.integration_mode || 'Configured'
                : 'Unavailable'}
            </span>
          </div>

          <div className="mt-5 divide-y divide-[#f1f5f9]">
            <div className="dm-health-row py-2.5">
              <span>Decision service</span>
              <strong>{runtime?.decision_engine.configured ? 'Configured' : 'Not verified'}</strong>
            </div>
            <div className="dm-health-row py-2.5">
              <span>Recorded evaluations</span>
              <strong>
                {evaluated} / {accounts.length}
              </strong>
            </div>
            <div className="dm-health-row py-2.5">
              <span>Worker health</span>
              <strong>
                {workers.length
                  ? `${workers.length - workerIssues} / ${workers.length} healthy`
                  : 'No telemetry'}
              </strong>
            </div>
            <div className="dm-health-row py-2.5">
              <span>Awaiting evaluation</span>
              <strong>{automation?.queue?.pending ?? '—'}</strong>
            </div>
          </div>

          <div className={`dm-notice mt-4 ${pilot || workerIssues ? 'dm-notice-warning' : ''}`}>
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p>
              {pilot
                ? 'Provider writes are disabled. Validate mappings and outcomes before switching to live execution.'
                : workerIssues
                  ? 'A worker needs attention. Review automation before enabling new actions.'
                  : 'Recorded model decisions still pass consent, coverage, and destination checks before action.'}
            </p>
          </div>

          <button
            type="button"
            className="dm-text-button mt-auto pt-4"
            onClick={() => onNavigateTab('AUTOMATION')}
          >
            Inspect automation <ArrowRight size={14} />
          </button>
        </section>

        <section className="dm-card flex flex-col">
          <div className="dm-section-title">
            <div>
              <h2>Operational activity</h2>
              <p>System-generated decision records for your workspace.</p>
            </div>
            <button
              type="button"
              className="dm-text-button"
              onClick={() => onNavigateTab('TASKS')}
            >
              View activity <ArrowRight size={14} />
            </button>
          </div>
          <div className="mt-3 divide-y divide-[#e2e8f0]">
            {pending.slice(0, 4).map((t) => (
              <div key={t.id} className="py-3.5">
                <p className="text-sm font-medium leading-5 text-[#0f172a]">{t.title}</p>
                <p className="dm-caption mt-1">
                  {t.accountName} · {(t.audit?.routing_state || 'Recorded').replaceAll('_', ' ')}
                </p>
              </div>
            ))}
            {!pending.length && <p className="dm-empty">No recorded system activity.</p>}
          </div>
        </section>

        <section className="dm-card flex flex-col">
          <div className="dm-section-title">
            <div>
              <h2>Recent evidence</h2>
              <p>Incoming signals available to the scoring service.</p>
            </div>
            <Activity size={16} className="text-[#64748b]" />
          </div>
          <div className="mt-3 divide-y divide-[#e2e8f0]">
            {signals.slice(0, 4).map((s) => (
              <div key={s.id} className="py-3.5">
                <p className="text-sm font-medium leading-5 text-[#0f172a]">
                  {s.title.replaceAll('_', ' ')}
                </p>
                <p className="dm-caption mt-1 tabular-nums">
                  {s.sourceFeed} ·{' '}
                  {s.timestamp && !Number.isNaN(Date.parse(s.timestamp))
                    ? new Date(s.timestamp).toLocaleString()
                    : s.timestamp || 'Time not recorded'}
                </p>
              </div>
            ))}
            {!signals.length && <p className="dm-empty">No recorded signals yet.</p>}
          </div>
        </section>
      </div>
    </div>
  );
};
