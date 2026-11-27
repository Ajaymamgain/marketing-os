import React, { useEffect, useState } from 'react';
import { ShieldCheck, RefreshCw, ArrowRight } from 'lucide-react';
import { AccountDemandUnit } from '../types';
import {
  fetchWorkspaceAccess,
  WorkspaceAccess,
  fetchJevAutomationStatus,
  JevAutomationStatus,
} from '../services/api';

export const WorkspaceTerminalView: React.FC<{ accounts: AccountDemandUnit[] }> = ({
  accounts,
}) => {
  const [access, setAccess] = useState<WorkspaceAccess | null>(null);
  const [runtime, setRuntime] = useState<JevAutomationStatus | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([fetchWorkspaceAccess(), fetchJevAutomationStatus()])
      .then(([session, status]) => {
        if (active) {
          setAccess(session);
          setRuntime(status);
        }
      })
      .catch((cause) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Workspace session unavailable.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retry]);

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <header className="dm-page-heading">
        <div>
          <h1>Workspace access</h1>
          <p>Review the current product session and the automation execution mode.</p>
        </div>
        <button
          type="button"
          className="dm-button"
          onClick={() => setRetry((n) => n + 1)}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh session
        </button>
      </header>

      {loading && (
        <div className="dm-card space-y-4" role="status" aria-label="Checking workspace session">
          <div className="dm-skeleton h-5 w-44" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="dm-skeleton h-12 w-full" />
            <div className="dm-skeleton h-12 w-full" />
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="dm-notice dm-notice-error flex-wrap items-center justify-between">
          <span>{error}</span>
          <a href="/login" className="dm-text-button">
            Sign in
          </a>
        </div>
      )}

      {access && !loading && (
        <>
          <section className="dm-card">
            <div className="dm-section-title">
              <div>
                <h2>Current session</h2>
                <p>Read from the authenticated product API.</p>
              </div>
              <ShieldCheck size={18} className="text-[#15803d]" />
            </div>

            <dl className="mt-5 grid gap-5 border-t border-[#e2e8f0] pt-5 sm:grid-cols-2">
              {[
                ['Signed-in identity', access.email],
                ['Workspace', access.tenant_id],
                ['Product role', access.role],
                [
                  'Access mode',
                  access.local_workspace
                    ? 'Local development session'
                    : 'Authenticated workspace session',
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="dm-caption">{label}</dt>
                  <dd className="mt-1 break-words text-sm font-medium text-[#0f172a]">{value}</dd>
                </div>
              ))}
            </dl>

            {access.local_workspace && (
              <div className="dm-notice dm-notice-warning mt-5">
                <p>
                  Local development access is enabled. Public deployment must require sign-in and
                  provision company-specific workspace access.
                </p>
              </div>
            )}
          </section>

          <section className="dm-card">
            <h2 className="text-base font-semibold text-[#0f172a]">Automation boundaries</h2>
            <dl className="mt-4 grid gap-5 border-t border-[#e2e8f0] pt-4 sm:grid-cols-3">
              {[
                ['Demand units', accounts.length.toLocaleString()],
                [
                  'Decision service',
                  runtime?.decision_engine.configured ? 'Configured' : 'Status unavailable',
                ],
                [
                  'Provider execution',
                  runtime?.execution_policy.integration_mode === 'dry_run'
                    ? 'Dry run · writes disabled'
                    : runtime?.execution_policy.integration_mode || 'Status unavailable',
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="dm-caption">{label}</dt>
                  <dd className="mt-1 text-sm font-medium tabular-nums text-[#0f172a]">{value}</dd>
                </div>
              ))}
            </dl>

            <p className="dm-caption mt-5">
              Automated operations use authenticated product tools. Model output cannot bypass
              tenant access, consent, coverage, or destination checks.
            </p>
            <a href="#automation" className="dm-text-button mt-4">
              Inspect automation <ArrowRight size={14} />
            </a>
          </section>

          <section className="dm-card">
            <h2 className="text-base font-semibold text-[#0f172a]">Workspace administration</h2>
            <p className="dm-caption mt-1.5">
              Connector credentials and role evidence are managed by workspace owners. This screen
              does not claim SSO, MFA, or a security certification.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a className="dm-button" href="#connectors">
                Manage connections
              </a>
              <a className="dm-button" href="#rules">
                Review scoring configuration
              </a>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
