import React, { useEffect } from 'react';
import { ChevronsLeft, ChevronsRight, ExternalLink, X } from 'lucide-react';
import { ActiveNavTab } from '../types';
import {
  PRIMARY_SECTIONS,
  FOOTER_SECTIONS,
  getWorkspaceSection,
  WorkspaceSection,
} from '../config/workspaceNav';

interface NavigationProps {
  activeTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  urgentTaskCount: number;
  coverageHoldCount?: number;
  isCompact?: boolean;
  onToggleCompact?: () => void;
  onHideSidebar?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  urgentTaskCount,
  isCompact = false,
  onToggleCompact,
  onHideSidebar,
}) => {
  const { section: activeSection } = getWorkspaceSection(activeTab);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onHideSidebar && window.matchMedia('(max-width: 767px)').matches) {
        onHideSidebar();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onHideSidebar]);

  const renderSectionLink = (section: WorkspaceSection) => {
    const Icon = section.icon;
    const isActive = activeSection?.id === section.id;
    const count = section.id === 'operations' && urgentTaskCount > 0 ? urgentTaskCount : 0;

    return (
      <button
        key={section.id}
        type="button"
        onClick={() => onSelectTab(section.defaultTab)}
        title={isCompact ? section.label : undefined}
        className={`dm-nav-link ${isActive ? 'is-active' : ''} ${
          isCompact ? 'md:justify-center md:px-0' : ''
        }`}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon size={17} strokeWidth={1.8} className="shrink-0" />
        <span className={`truncate ${isCompact ? 'md:hidden' : ''}`}>{section.label}</span>
        {count > 0 && !isCompact && (
          <span className="ml-auto text-xs font-semibold tabular-nums text-[#b45309]">
            {count}
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-[#0f172a]/30 backdrop-blur-[1px] md:hidden"
        onClick={onHideSidebar}
        aria-hidden="true"
      />
      <nav
        aria-label="Main navigation"
        className={`dm-sidebar fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[#e2e8f0] bg-white transition-[width] duration-150 md:sticky md:top-14 md:z-auto md:h-[calc(100dvh-56px)] shrink-0 ${
          isCompact ? 'w-[244px] md:w-[68px]' : 'w-[248px] md:w-[228px]'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#e2e8f0] px-4 py-3 md:hidden">
          <span className="text-sm font-semibold text-[#0f172a]">Navigation</span>
          <button
            type="button"
            className="dm-icon-button"
            onClick={onHideSidebar}
            aria-label="Close navigation"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2.5 py-4 space-y-1">
          {PRIMARY_SECTIONS.map(renderSectionLink)}
        </div>

        <div className="border-t border-[#e2e8f0] px-2.5 py-3 space-y-1">
          {FOOTER_SECTIONS.map(renderSectionLink)}

          {!isCompact && (
            <button
              type="button"
              className="dm-nav-link text-[#64748b]"
              onClick={() => onSelectTab('LANDING')}
            >
              <ExternalLink size={16} strokeWidth={1.8} className="shrink-0" />
              <span className="truncate">Product website</span>
            </button>
          )}

          {onToggleCompact && (
            <button
              type="button"
              onClick={onToggleCompact}
              className={`hidden md:flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a] ${
                isCompact ? 'justify-center px-0' : ''
              }`}
              title={isCompact ? 'Expand navigation' : 'Collapse navigation'}
              aria-label={isCompact ? 'Expand navigation' : 'Collapse navigation'}
            >
              {isCompact ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
              {!isCompact && <span>Collapse rail</span>}
            </button>
          )}
        </div>
      </nav>
    </>
  );
};
