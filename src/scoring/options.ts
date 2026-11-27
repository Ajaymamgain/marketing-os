import { AccountDemandUnit } from '../types';

export interface ScoreWeights {
  fit: number;
  intent: number;
  coverage: number;
}

export interface ScoreOption {
  id: string;
  name: string;
  detail: string;
  weights: ScoreWeights;
}

export const SCORE_OPTIONS: ScoreOption[] = [
  {
    id: 'balanced',
    name: 'Balanced',
    detail: 'Default contract. Intent leads, and fit and coverage still count.',
    weights: { fit: 35, intent: 40, coverage: 25 },
  },
  {
    id: 'intent',
    name: 'Intent led',
    detail: 'Recent engagement decides the score.',
    weights: { fit: 20, intent: 60, coverage: 20 },
  },
  {
    id: 'fit',
    name: 'Fit led',
    detail: 'Account quality decides when engagement is noisy.',
    weights: { fit: 60, intent: 25, coverage: 15 },
  },
  {
    id: 'coverage',
    name: 'Coverage led',
    detail: 'The buying group decides. Coverage at 0 still blocks activation.',
    weights: { fit: 20, intent: 30, coverage: 50 },
  },
];

export function matchingOption(weights: ScoreWeights): string {
  const found = SCORE_OPTIONS.find(
    (option) => option.weights.fit === weights.fit && option.weights.intent === weights.intent && option.weights.coverage === weights.coverage,
  );
  return found?.id || 'custom';
}

export function projectScore(account: AccountDemandUnit, weights: ScoreWeights): number {
  const fit = account.scores.firmographicFit;
  const intent = account.scores.behavioralEngagement;
  const coverage = account.committee.coverageScore;
  const value = ((fit * weights.fit) + (intent * weights.intent) + (coverage * weights.coverage)) / 100;
  return Math.round(value * 10) / 10;
}

export function rebalance(current: ScoreWeights, key: keyof ScoreWeights, value: number): ScoreWeights {
  const nextValue = Math.max(0, Math.min(100, Math.round(value)));
  const others = (['fit', 'intent', 'coverage'] as const).filter((item) => item !== key);
  const remainder = 100 - nextValue;
  const otherTotal = others.reduce((sum, item) => sum + current[item], 0);
  const next = { ...current, [key]: nextValue };
  if (otherTotal <= 0) {
    next[others[0]] = Math.floor(remainder / 2);
    next[others[1]] = remainder - next[others[0]];
    return next;
  }
  const first = Math.round((current[others[0]] / otherTotal) * remainder);
  next[others[0]] = first;
  next[others[1]] = remainder - first;
  return next;
}
