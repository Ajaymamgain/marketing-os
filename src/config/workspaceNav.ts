import {
  LayoutDashboard,
  Building2,
  Radar,
  Target,
  Workflow,
  TrendingUp,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { ActiveNavTab } from '../types';

export interface WorkspaceSubTab {
  id: ActiveNavTab;
  label: string;
}

export interface WorkspaceSection {
  id: 'overview' | 'accounts' | 'intelligence' | 'scoring' | 'operations' | 'conversions' | 'settings';
  label: string;
  icon: LucideIcon;
  defaultTab: ActiveNavTab;
  subtitle: string;
  tabs: WorkspaceSubTab[];
  placement: 'primary' | 'footer';
}

export const WORKSPACE_SECTIONS: WorkspaceSection[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    defaultTab: 'OVERVIEW',
    subtitle: 'Demand pulse',
    placement: 'primary',
    tabs: [{ id: 'OVERVIEW', label: 'Overview' }],
  },
  {
    id: 'accounts',
    label: 'Accounts',
    icon: Building2,
    defaultTab: 'ACCOUNTS',
    subtitle: 'Accounts & pipeline',
    placement: 'primary',
    tabs: [
      { id: 'ACCOUNTS', label: 'Account matrix' },
      { id: 'FUNNEL', label: 'Demand funnel' },
      { id: 'JOURNEY', label: 'Customer journey' },
      { id: 'COMMITTEES', label: 'Buying committees' },
      { id: 'COVERAGE', label: 'Coverage checks' },
      { id: 'SEGMENTS', label: 'Segments' },
    ],
  },
  {
    id: 'intelligence',
    label: 'Intelligence',
    icon: Radar,
    defaultTab: 'INTELLIGENCE',
    subtitle: 'Research workspace',
    placement: 'primary',
    tabs: [{ id: 'INTELLIGENCE', label: 'Account & ad intelligence' }],
  },
  {
    id: 'scoring',
    label: 'Scoring',
    icon: Target,
    defaultTab: 'DEMAND_UNITS',
    subtitle: 'Scoring & models',
    placement: 'primary',
    tabs: [
      { id: 'DEMAND_UNITS', label: 'Demand scores' },
      { id: 'RULES', label: 'Scoring studio' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: Workflow,
    defaultTab: 'DECISION_OPS',
    subtitle: 'Marketing operations',
    placement: 'primary',
    tabs: [
      { id: 'DECISION_OPS', label: 'Decision Inbox' },
      { id: 'OPERATIONS_DESK', label: 'Operations Desk' },
      { id: 'SIGNALS', label: 'Playbooks' },
      { id: 'AUTOMATION', label: 'Automation' },
      { id: 'TASKS', label: 'Activity & tasks' },
    ],
  },
  {
    id: 'conversions',
    label: 'Conversions',
    icon: TrendingUp,
    defaultTab: 'CONVERSIONS',
    subtitle: 'Marketing operations',
    placement: 'primary',
    tabs: [{ id: 'CONVERSIONS', label: 'Conversions' }],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    defaultTab: 'CONNECTORS',
    subtitle: 'Workspace settings',
    placement: 'footer',
    tabs: [
      { id: 'CONNECTORS', label: 'Connections' },
      { id: 'SIMULATOR', label: 'Data imports & replay' },
      { id: 'TERMINAL', label: 'Workspace access' },
    ],
  },
];

export const PRIMARY_SECTIONS = WORKSPACE_SECTIONS.filter((s) => s.placement === 'primary');
export const FOOTER_SECTIONS = WORKSPACE_SECTIONS.filter((s) => s.placement === 'footer');

export const INDEPENDENT_TABS: ReadonlySet<ActiveNavTab> = new Set<ActiveNavTab>([
  'CONNECTORS',
  'SEGMENTS',
  'AUTOMATION',
  'OPERATIONS_DESK',
  'INTELLIGENCE',
  'CONVERSIONS',
]);

export const TAB_TO_HASH: Record<ActiveNavTab, string> = {
  LANDING: 'landing',
  OVERVIEW: 'overview',
  DEMAND_UNITS: 'demand-units',
  FUNNEL: 'funnel',
  JOURNEY: 'journey',
  ACCOUNTS: 'accounts',
  COMMITTEES: 'committees',
  COVERAGE: 'coverage',
  DECISION_OPS: 'decisions',
  OPERATIONS_DESK: 'operations-desk',
  SIGNALS: 'playbooks',
  SIMULATOR: 'imports',
  CONVERSIONS: 'conversions',
  RULES: 'scoring-studio',
  CONNECTORS: 'connections',
  SEGMENTS: 'segments',
  INTELLIGENCE: 'intelligence',
  TASKS: 'tasks',
  TERMINAL: 'access',
  AUTOMATION: 'automation',
};

export const HASH_TO_TAB: Record<string, ActiveNavTab> = {
  '': 'LANDING',
  landing: 'LANDING',
  overview: 'OVERVIEW',
  waterfall: 'OVERVIEW',
  'demand-units': 'DEMAND_UNITS',
  scoring: 'DEMAND_UNITS',
  'scoring-studio': 'RULES',
  rules: 'RULES',
  funnel: 'FUNNEL',
  journey: 'JOURNEY',
  matrix: 'ACCOUNTS',
  accounts: 'ACCOUNTS',
  committees: 'COMMITTEES',
  committee: 'COMMITTEES',
  coverage: 'COVERAGE',
  segments: 'SEGMENTS',
  pi: 'DECISION_OPS',
  decisions: 'DECISION_OPS',
  'decision-inbox': 'DECISION_OPS',
  operations: 'DECISION_OPS',
  copilot: 'DECISION_OPS',
  'pi-ops': 'DECISION_OPS',
  'operations-desk': 'OPERATIONS_DESK',
  'ops-desk': 'OPERATIONS_DESK',
  desk: 'OPERATIONS_DESK',
  'jev-automation': 'AUTOMATION',
  automation: 'AUTOMATION',
  signals: 'SIGNALS',
  playbooks: 'SIGNALS',
  simulator: 'SIMULATOR',
  imports: 'SIMULATOR',
  conversions: 'CONVERSIONS',
  connectors: 'CONNECTORS',
  connections: 'CONNECTORS',
  settings: 'CONNECTORS',
  intelligence: 'INTELLIGENCE',
  enrichment: 'INTELLIGENCE',
  tasks: 'TASKS',
  terminal: 'TERMINAL',
  access: 'TERMINAL',
};

export function getWorkspaceSection(tab: ActiveNavTab): {
  section: WorkspaceSection | null;
  subTab: WorkspaceSubTab | null;
} {
  for (const section of WORKSPACE_SECTIONS) {
    const match = section.tabs.find((item) => item.id === tab);
    if (match) {
      return { section, subTab: match };
    }
  }
  return { section: null, subTab: null };
}
