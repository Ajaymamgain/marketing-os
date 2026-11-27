import React, { useRef } from 'react';
import { ActiveNavTab } from '../types';
import { WorkspaceSection } from '../config/workspaceNav';

interface WorkspaceSubNavProps {
  section: WorkspaceSection;
  activeTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  counts?: Partial<Record<ActiveNavTab, number>>;
}

export const WorkspaceSubNav: React.FC<WorkspaceSubNavProps> = ({
  section,
  activeTab,
  onSelectTab,
  counts = {},
}) => {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  if (section.tabs.length <= 1) return null;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const total = section.tabs.length;
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight') nextIndex = (index + 1) % total;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + total) % total;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = total - 1;

    if (nextIndex !== null) {
      event.preventDefault();
      const target = section.tabs[nextIndex];
      onSelectTab(target.id);
      buttonRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div className="mx-auto mb-6 max-w-[1440px] border-b border-[#e2e8f0]">
      <div
        role="tablist"
        aria-label={`${section.label} views`}
        className="-mb-px flex items-center gap-6 overflow-x-auto"
      >
        {section.tabs.map((tab, index) => {
          const isActive = tab.id === activeTab;
          const count = counts[tab.id];
          return (
            <button
              key={tab.id}
              ref={(el) => {
                buttonRefs.current[index] = el;
              }}
              type="button"
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onSelectTab(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 py-3 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4ed8] ${
                isActive
                  ? 'border-[#1d4ed8] font-semibold text-[#1d4ed8]'
                  : 'border-transparent font-medium text-[#64748b] hover:border-[#cbd5e1] hover:text-[#0f172a]'
              }`}
            >
              <span>{tab.label}</span>
              {typeof count === 'number' && count > 0 && (
                <span
                  className={`text-xs font-semibold tabular-nums ${
                    isActive ? 'text-[#1d4ed8]' : 'text-[#64748b]'
                  }`}
                >
                  {count.toLocaleString()}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
