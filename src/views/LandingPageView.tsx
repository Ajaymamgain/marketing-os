import React from 'react';
import {ActiveNavTab, AccountDemandUnit} from '../types';
import {RestoredLandingPage} from './RestoredLandingPage';

interface LandingPageViewProps {
  onNavigateTab: (tab: ActiveNavTab) => void;
  onSelectAccount?: (account: AccountDemandUnit) => void;
  accounts?: AccountDemandUnit[];
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export function LandingPageView({onNavigateTab}: LandingPageViewProps) {
  return <RestoredLandingPage onNavigateTab={onNavigateTab}/>;
}
