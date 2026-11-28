import React from 'react';
import { ArrowRight } from 'lucide-react';
import { ActiveNavTab } from '../types';
import { ApiDecisionsControl } from '../components/ApiDecisionsControl';
import { OperationsJobsPanel } from '../components/OperationsJobsPanel';

interface OperationsDeskViewProps {
  onNavigateTab?: (tab: ActiveNavTab) => void;
}

export const OperationsDeskView: React.FC<OperationsDeskViewProps> = ({ onNavigateTab }) => {
  const navigate = (tab: ActiveNavTab) => {
    onNavigateTab?.(tab);
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <header className="dm-page-heading">
        <div>
          <h1>Operations Desk</h1>
          <p>
            See what this workspace can run and what needs attention. Review Case Inbox evidence,
            manage Agent Board workflows and workspace skills, and inspect proposed changes before
            anything touches a connected destination.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onNavigateTab ? (
            <>
              <button
                type="button"
                className="dm-button"
                onClick={() => navigate('DECISION_OPS')}
              >
                Decision Inbox
              </button>
              <button
                type="button"
                className="dm-button"
                onClick={() => navigate('SIGNALS')}
              >
                Playbooks
              </button>
              <button
                type="button"
                className="dm-button"
                onClick={() => navigate('AUTOMATION')}
              >
                Automation <ArrowRight size={15} />
              </button>
            </>
          ) : (
            <>
              <a href="#decisions" className="dm-button">
                Decision Inbox
              </a>
              <a href="#playbooks" className="dm-button">
                Playbooks
              </a>
              <a href="#automation" className="dm-button">
                Automation <ArrowRight size={15} />
              </a>
            </>
          )}
        </div>
      </header>

      <div id="decision-service-settings" tabIndex={-1} className="scroll-mt-4 outline-none">
        <ApiDecisionsControl />
      </div>

      <OperationsJobsPanel light onNavigateTab={onNavigateTab} />
    </div>
  );
};
