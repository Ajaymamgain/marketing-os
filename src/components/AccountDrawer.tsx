import React from 'react';
import { X, ArrowRight, Users, Activity } from 'lucide-react';
import { AccountDemandUnit, AutomationPlaybook } from '../types';
import { JevDecisionCard } from './JevDecisionCard';
import { EnrichmentEvidence } from './EnrichmentEvidence';
import { fetchJevDecision } from '../services/api';

interface Props {
  account: AccountDemandUnit | null;
  onClose: () => void;
  playbooks: AutomationPlaybook[];
  onTriggerPlaybook: (playbookId: string, accountName: string) => void;
}

export const AccountDrawer: React.FC<Props> = ({
  account,
  onClose,
  playbooks,
  onTriggerPlaybook,
}) => {
  const [liveDecision, setLiveDecision] = React.useState<AccountDemandUnit['jevDecision'] | null>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef(onClose);
  closeRef.current = onClose;

  React.useEffect(() => {
    let active = true;
    setLiveDecision(account?.jevDecision || null);
    if (account?.id && !account.jevDecision) {
      fetchJevDecision(account.id).then((decision) => {
        if (active) setLiveDecision(decision);
      });
    }
    return () => {
      active = false;
    };
  }, [account?.id, account?.jevDecision]);

  React.useEffect(() => {
    if (!account?.id) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.focus();

    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== 'Tab' || !panel) return;
      const controls = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]'
        )
      ).filter((el) => el.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      if (!first) {
        event.preventDefault();
        panel.focus();
      } else if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      previous?.focus();
    };
  }, [account?.id]);

  if (!account) return null;

  const scoredAt = account.scoreAudit?.lastScoredAt;
  const routingState = (account.scoreAudit?.routingState || 'HOLD').replaceAll('_', ' ').toLowerCase();
  const components: [string, number][] = [
    ['Account fit', Number(account.scoreAudit?.fit ?? account.scores.firmographicFit)],
    ['Decayed activity intent', Number(account.scoreAudit?.intent ?? account.scores.intentSurge)],
    ['Supported buying-group coverage', Number(account.scoreAudit?.coverage ?? account.committee.coverageScore)],
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#0f172a]/35 backdrop-blur-[2px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Demand unit: ${account.accountName}`}
        tabIndex={-1}
        className="dm-drawer-panel flex h-full w-full max-w-2xl flex-col border-l border-[#e2e8f0] bg-white shadow-xl outline-none"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#e2e8f0] px-6 py-5">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-[#0f172a]">{account.accountName}</h2>
            <p className="dm-caption mt-1 break-words">
              {account.domain} · {account.solutionTarget}
            </p>
          </div>
          <button
            type="button"
            className="dm-icon-button"
            aria-label="Close demand unit details"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <section className="grid grid-cols-2 divide-x divide-[#e2e8f0] rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc]">
            <div className="p-4">
              <p className="dm-caption">Composite score</p>
              <strong className="mt-1.5 block text-3xl font-semibold tracking-tight tabular-nums text-[#0f172a]">
                {account.compositeScore}
                <span className="text-sm font-normal text-[#64748b]"> / 100</span>
              </strong>
            </div>
            <div className="p-4">
              <p className="dm-caption">Current lane</p>
              <strong className="mt-1.5 block text-lg font-semibold capitalize text-[#0f172a]">
                {routingState}
              </strong>
              <p className="dm-caption mt-0.5 capitalize">{account.stage.replaceAll('_', ' ')}</p>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-[#0f172a]">Recorded scoring components</h3>
            <p className="dm-caption mt-1">
              Policy combines fit, intent, and supported coverage to select the next eligible action.
            </p>
            <div className="mt-4 space-y-4">
              {components.map(([label, value]) => (
                <div key={label}>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#334155]">{label}</span>
                    <strong className="font-semibold tabular-nums text-[#0f172a]">
                      {value.toFixed(1)} / 100
                    </strong>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#e2e8f0]">
                    <div
                      className="h-full rounded-full bg-[#1d4ed8]"
                      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <JevDecisionCard jevDecision={liveDecision || account.jevDecision} />
          <EnrichmentEvidence account={account} />

          <section className="border-t border-[#e2e8f0] pt-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[#0f172a]">
              <Users size={16} className="text-[#64748b]" />
              Buying-group evidence
            </h3>
            <p className="dm-caption mt-1.5 tabular-nums">
              {account.committee.totalIdentified} identified ·{' '}
              {account.committee.members.filter((member) => member.status === 'active').length}{' '}
              coverage-ready · 3 required roles
            </p>
            {account.committee.missingRoles.length > 0 && (
              <div className="dm-notice dm-notice-warning mt-3">
                Missing supported roles:{' '}
                {account.committee.missingRoles.map((role) => role.replaceAll('_', ' ')).join(', ')}
              </div>
            )}
            <div className="mt-3 divide-y divide-[#e2e8f0]">
              {account.committee.members.map((member) => (
                <div key={member.id} className="py-3.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <strong className="text-sm font-semibold text-[#0f172a]">{member.name}</strong>
                    <span
                      className={`text-xs font-semibold ${
                        member.status === 'active' ? 'text-[#15803d]' : 'text-[#b45309]'
                      }`}
                    >
                      {member.status === 'active' ? 'Counts for coverage' : 'Not counted'}
                    </span>
                  </div>
                  <p className="dm-caption mt-0.5">
                    {member.title} · <span className="capitalize">{member.role.replaceAll('_', ' ')}</span>
                  </p>
                  {member.keyNotes && <p className="mt-1.5 text-xs text-[#475569]">{member.keyNotes}</p>}
                  <p className="dm-caption mt-1 tabular-nums">
                    Last engagement:{' '}
                    {member.lastSeen && !Number.isNaN(Date.parse(member.lastSeen))
                      ? new Date(member.lastSeen).toLocaleString()
                      : 'Not recorded'}
                  </p>
                </div>
              ))}
            </div>
            {!account.committee.members.length && (
              <p className="dm-empty">No identified people recorded.</p>
            )}
          </section>

          <div className="dm-notice">
            <Activity size={16} className="mt-0.5 shrink-0 text-[#64748b]" />
            <p>
              Product usage telemetry and deal value are not connected. Recorded marketing activity
              contributes to intent.
            </p>
          </div>

          <section className="border-t border-[#e2e8f0] pt-5">
            <h3 className="text-sm font-semibold text-[#0f172a]">Audience operations playbooks</h3>
            <p className="dm-caption mt-1">
              Open a playbook to review eligibility and destination mapping.
            </p>
            <div className="mt-3 divide-y divide-[#e2e8f0]">
              {playbooks.slice(0, 3).map((playbook) => (
                <div key={playbook.id} className="py-3.5">
                  <h4 className="text-sm font-medium text-[#0f172a]">{playbook.title}</h4>
                  <p className="dm-caption mt-1">{playbook.description}</p>
                  <button
                    type="button"
                    className="dm-text-button mt-2"
                    onClick={() => onTriggerPlaybook(playbook.id, account.accountName)}
                  >
                    Review playbook <ArrowRight size={15} />
                  </button>
                </div>
              ))}
            </div>
            {!playbooks.length && <p className="dm-empty">No playbooks available.</p>}
          </section>
        </div>

        <footer className="border-t border-[#e2e8f0] bg-[#f8fafc] px-6 py-3.5 dm-caption tabular-nums">
          Last scored:{' '}
          {scoredAt && !Number.isNaN(Date.parse(scoredAt))
            ? new Date(scoredAt).toLocaleString()
            : 'Not recorded'}
        </footer>
      </div>
    </div>
  );
};
