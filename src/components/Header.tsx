import React, { useEffect, useRef } from 'react';
import { PanelLeft, RefreshCw, Search, X } from 'lucide-react';
import { ActiveNavTab } from '../types';
import { getWorkspaceSection } from '../config/workspaceNav';

interface HeaderProps {
  independentView?: boolean;
  activeTab: ActiveNavTab;
  onRefresh: () => void;
  searchQuery?: string;
  onSearchAccount: (query: string) => void;
  activeAccountCount: number;
  isSidebarHidden?: boolean;
  onToggleSidebar?: () => void;
  onNavigateTab?: (tab: ActiveNavTab) => void;
  isLoading?: boolean;
  lastUpdated?: string | null;
  integrationMode?: string;
}

export const Header: React.FC<HeaderProps> = ({
  independentView,
  activeTab,
  onRefresh,
  searchQuery = '',
  onSearchAccount,
  activeAccountCount,
  isSidebarHidden,
  onToggleSidebar,
  onNavigateTab,
  isLoading,
  lastUpdated,
  integrationMode,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { section, subTab } = getWorkspaceSection(activeTab);
  const hasMultipleSubTabs = (section?.tabs.length ?? 0) > 1;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (independentView) return;
      const target = event.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (event.key === '/' && !isEditable && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        searchInputRef.current?.focus();
      } else if (event.key === 'Escape' && document.activeElement === searchInputRef.current) {
        if (searchQuery) {
          onSearchAccount('');
        } else {
          searchInputRef.current?.blur();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [independentView, onSearchAccount, searchQuery]);

  const modeLabel =
    integrationMode === 'dry_run'
      ? 'Dry run'
      : integrationMode === 'local'
        ? 'Live execution'
        : integrationMode?.replaceAll('_', ' ');

  return (
    <header className="dm-header sticky top-0 z-40 border-b border-[#e2e8f0] bg-white">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          className="dm-icon-button shrink-0"
          onClick={onToggleSidebar}
          aria-label={isSidebarHidden ? 'Show navigation' : 'Hide navigation'}
          aria-expanded={!isSidebarHidden}
          title={isSidebarHidden ? 'Show navigation' : 'Hide navigation'}
        >
          <PanelLeft size={17} />
        </button>

        <div className="min-w-0 flex-1">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => onNavigateTab?.('OVERVIEW')}
              className="shrink-0 whitespace-nowrap font-semibold tracking-tight text-[#0f172a] hover:text-[#1d4ed8]"
            >
              Dual Motion
            </button>
            {section && (
              <>
                <span className="hidden text-[#cbd5e1] sm:inline" aria-hidden="true">/</span>
                {hasMultipleSubTabs ? (
                  <button
                    type="button"
                    onClick={() => onNavigateTab?.(section.defaultTab)}
                    className="hidden shrink-0 whitespace-nowrap font-medium text-[#64748b] hover:text-[#0f172a] sm:inline"
                  >
                    {section.label}
                  </button>
                ) : (
                  <span className="hidden truncate font-medium text-[#475569] sm:inline">
                    {section.label}
                  </span>
                )}
              </>
            )}
            {hasMultipleSubTabs && subTab && (
              <>
                <span className="hidden text-[#cbd5e1] sm:inline" aria-hidden="true">/</span>
                <span className="hidden truncate font-medium text-[#0f172a] sm:inline">
                  {subTab.label}
                </span>
              </>
            )}
          </nav>
          <p className="truncate text-xs text-[#64748b] tabular-nums">
            {independentView ? (
              section?.subtitle || 'Workspace'
            ) : (
              <>
                {activeAccountCount.toLocaleString()} demand units
                {lastUpdated ? (
                  <> · Updated {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
                ) : (
                  <> · Syncing workspace</>
                )}
              </>
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {modeLabel && (
            <span
              className={`hidden whitespace-nowrap text-xs font-semibold sm:inline ${
                integrationMode === 'dry_run' ? 'text-[#b45309]' : 'text-[#15803d]'
              }`}
            >
              {modeLabel}
            </span>
          )}

          {!independentView && (
            <label className="relative hidden lg:block">
              <span className="sr-only">Search demand units</span>
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"
              />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                placeholder="Search accounts or domains…"
                onChange={(e) => onSearchAccount(e.target.value)}
                className="dm-input dm-search-input w-64"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => onSearchAccount('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 flex h-6 w-6 min-h-6 -translate-y-1/2 items-center justify-center rounded text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
                >
                  <X size={14} />
                </button>
              ) : (
                <kbd
                  aria-hidden="true"
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-[#e2e8f0] bg-[#f8fafc] px-1.5 py-0.5 font-mono text-[11px] text-[#94a3b8]"
                >
                  /
                </kbd>
              )}
            </label>
          )}

          <button
            type="button"
            className="dm-icon-button"
            onClick={onRefresh}
            disabled={isLoading}
            aria-label="Refresh workspace"
            title="Refresh workspace"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {!independentView && (
        <div className="border-t border-[#f1f5f9] px-4 py-2 lg:hidden">
          <label className="relative block">
            <span className="sr-only">Search demand units</span>
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"
            />
            <input
              type="search"
              value={searchQuery}
              placeholder="Search accounts or domains…"
              onChange={(e) => onSearchAccount(e.target.value)}
              className="dm-input dm-search-input w-full"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchAccount('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 flex h-6 w-6 min-h-6 -translate-y-1/2 items-center justify-center rounded text-[#64748b] hover:text-[#0f172a]"
              >
                <X size={14} />
              </button>
            )}
          </label>
        </div>
      )}
    </header>
  );
};
