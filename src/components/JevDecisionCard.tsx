import React from 'react';
import { Sparkles, Info } from 'lucide-react';
import { JevDecision } from '../types';

interface Props {
  jevDecision?: JevDecision | null;
  compact?: boolean;
}

const percent = (value?: number) =>
  typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value * 100)}%` : 'Not recorded';

export const JevDecisionCard: React.FC<Props> = ({ jevDecision: decision, compact }) => {
  if (!decision?.applied || decision.provider !== 'typesafe') {
    return (
      <div className="dm-notice">
        <Info size={16} className="mt-0.5 shrink-0 text-[#64748b]" />
        <div>
          <strong className="font-semibold text-[#0f172a]">No current automated evaluation</strong>
          <p className="mt-0.5 text-[#475569]">
            Stored policy scores remain available. Automated additions require a successful, current
            evaluation and product gates.
          </p>
        </div>
      </div>
    );
  }

  const choices = Object.entries(decision.choice || {}).filter(([, value]) => value?.selected);

  return (
    <section className="dm-card" aria-label="Recorded decision evaluation">
      <div className="dm-section-title">
        <div>
          <h2 className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#1d4ed8]" />
            Recorded decision evaluation
          </h2>
          <p>Recorded evidence · policy checks enforced</p>
        </div>
        <span className="text-xs font-semibold text-[#15803d]">Recorded</span>
      </div>

      <div className="mt-4 grid grid-cols-2 divide-x divide-[#e2e8f0] rounded-lg border border-[#e2e8f0] bg-[#f8fafc]">
        <div className="p-3.5">
          <p className="dm-caption">Readiness judgment</p>
          <strong className="mt-1 block text-lg font-semibold tabular-nums text-[#0f172a]">
            {decision.score?.score != null ? `${decision.score.score.toFixed(2)} / 3` : 'Not recorded'}
          </strong>
        </div>
        <div className="p-3.5">
          <p className="dm-caption">Progression estimate</p>
          <strong className="mt-1 block text-lg font-semibold tabular-nums text-[#0f172a]">
            {percent(decision.noul?.probability ?? decision.progress_probability)}
          </strong>
        </div>
      </div>

      {choices.length > 0 && (
        <dl className={`mt-4 grid gap-3 ${compact ? '' : 'sm:grid-cols-2'}`}>
          {choices.map(([key, value]) => (
            <div key={key} className="border-t border-[#f1f5f9] pt-2.5">
              <dt className="dm-caption capitalize">{key.replaceAll('_', ' ')}</dt>
              <dd className="mt-0.5 break-words text-sm font-medium capitalize text-[#0f172a]">
                {value?.selected.replaceAll('_', ' ')}{' '}
                <span className="dm-caption font-normal tabular-nums">· {percent(value?.confidence)}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}

      <p className="dm-caption mt-4">
        This estimate expresses uncertainty and is not a measured conversion probability. Consent,
        verified coverage, destination mapping, and decision freshness still control execution.
      </p>
    </section>
  );
};
