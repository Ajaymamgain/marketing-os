import React from "react";
import { EvidenceSettings } from "../services/api";

type Props = {
  settings: EvidenceSettings;
  onChange: (settings: EvidenceSettings) => void;
  section: "fit" | "intent" | "coverage";
};
export function ModelEvidenceFields({ settings: s, onChange, section }: Props) {
  const fit = (key: string, value: unknown) =>
    onChange({ ...s, fit: { ...s.fit, [key]: value } });
  const coverage = (key: string, value: unknown) =>
    onChange({ ...s, coverage: { ...s.coverage, [key]: value } });
  if (section === "fit")
    return (
      <div className="dm-model-fields">
        <section className="dm-model-panel">
          <p className="dm-model-kicker">01 / COMPANY PROFILE</p>
          <h2>What does a good customer look like?</h2>
          <p className="dm-model-note">
            Known company attributes earn fit points. Missing data stays
            unknown.
          </p>
          <label>
            Target industries
            <textarea
              value={s.fit.target_industries.join(", ")}
              onChange={(e) =>
                fit(
                  "target_industries",
                  e.target.value
                    .split(",")
                    .map((v) => v.trim())
                    .filter(Boolean),
                )
              }
            />
            <small>Separate industry names with commas.</small>
          </label>
          <label>
            Target technologies
            <textarea
              value={s.fit.target_technologies.join(", ")}
              onChange={(e) =>
                fit(
                  "target_technologies",
                  e.target.value
                    .split(",")
                    .map((v) => v.trim())
                    .filter(Boolean),
                )
              }
            />
          </label>
          <div className="dm-model-form-grid">
            {(
              [
                ["headcount_min", "Minimum employees"],
                ["headcount_max", "Maximum employees"],
                ["revenue_min", "Minimum annual revenue · USD"],
                ["revenue_max", "Maximum annual revenue · USD"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  type="number"
                  min="0"
                  value={s.fit[key]}
                  onChange={(e) => fit(key, Number(e.target.value))}
                />
              </label>
            ))}
          </div>
        </section>
        <section className="dm-model-panel">
          <p className="dm-model-kicker">02 / FIT CONTRIBUTIONS</p>
          <h2>Weight the attributes that matter</h2>
          <p className="dm-model-note">
            These weights live inside fit. They must total 100%.
          </p>
          {Object.entries(s.fit.component_weights).map(([key, value]) => (
            <label className="dm-model-weight" key={key}>
              <span>
                {
                  (
                    {
                      headcount: "Company size",
                      industry: "Industry",
                      revenue: "Revenue",
                      technology: "Technology",
                    } as Record<string, string>
                  )[key]
                }
              </span>
              <input
                type="number"
                min="0"
                max="100"
                value={value}
                onChange={(e) =>
                  fit("component_weights", {
                    ...s.fit.component_weights,
                    [key]: Number(e.target.value),
                  })
                }
              />
              <span>%</span>
            </label>
          ))}
          <p className="dm-model-note">
            Total:{" "}
            {Object.values(s.fit.component_weights).reduce((a, b) => a + b, 0)}%
          </p>
          <label>
            Minimum known weighted evidence · %
            <input
              type="number"
              min="10"
              max="100"
              value={s.fit.minimum_known_weight * 100}
              onChange={(e) =>
                fit("minimum_known_weight", Number(e.target.value) / 100)
              }
            />
            <small>
              Below this threshold, fit contributes zero. Above it, known
              attribute weights are normalized.
            </small>
          </label>
          <details>
            <summary>Account tier adjustments</summary>
            <div className="dm-model-form-grid">
              {Object.entries(s.fit.tier_multipliers).map(([key, value]) => (
                <label key={key}>
                  {key.replaceAll("_", " ")} · multiplier
                  <input
                    type="number"
                    min="0"
                    max="1.5"
                    step=".05"
                    value={value}
                    onChange={(e) =>
                      fit("tier_multipliers", {
                        ...s.fit.tier_multipliers,
                        [key]: Number(e.target.value),
                      })
                    }
                  />
                </label>
              ))}
            </div>
          </details>
        </section>
      </div>
    );
  if (section === "coverage")
    return (
      <div className="dm-model-fields">
        <section className="dm-model-panel">
          <p className="dm-model-kicker">VERIFIED BUYING GROUP</p>
          <h2>Credit the roles behind a decision</h2>
          <p className="dm-model-note">
            Distinct verified roles count once. Consent and recent engagement
            are required.
          </p>
          <div className="dm-model-form-grid">
            {Object.entries(s.coverage.role_points).map(([key, value]) => (
              <label key={key}>
                {key.replace(/\b\w/g, (c) => c.toUpperCase())} · points
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={value}
                  onChange={(e) =>
                    coverage("role_points", {
                      ...s.coverage.role_points,
                      [key]: Number(e.target.value),
                    })
                  }
                />
              </label>
            ))}
          </div>
        </section>
        <section className="dm-model-panel">
          <h2>Recency & consensus</h2>
          <label>
            Buying-group engagement window · days
            <input
              type="number"
              min="1"
              max="90"
              value={s.coverage.recency_window_days}
              onChange={(e) =>
                coverage("recency_window_days", Number(e.target.value))
              }
            />
          </label>
          <div className="dm-model-form-grid">
            {(["two_role_bonus", "three_role_bonus"] as const).map((key) => (
              <label key={key}>
                {key === "two_role_bonus"
                  ? "Two distinct roles"
                  : "Three or more roles"}{" "}
                · bonus
                <input
                  type="number"
                  min="0"
                  max="25"
                  value={s.coverage[key]}
                  onChange={(e) => coverage(key, Number(e.target.value))}
                />
              </label>
            ))}
          </div>
          <p className="dm-model-callout">
            Role points + consensus bonus, capped at 100. Zero coverage blocks
            activation regardless of the composite score.
          </p>
        </section>
      </div>
    );
  return (
    <details className="dm-model-panel dm-model-advanced">
      <summary>Engagement safeguards & decay</summary>
      <p className="dm-model-note">
        Set the defaults for base activities and repetition. A matching custom
        rule uses its own half-life.
      </p>
      <div className="dm-model-form-grid">
        {(
          [
            ["intent_window_days", "Engagement window · days", 1, 90, 1],
            [
              "default_half_life_days",
              "Other activity half-life · days",
              1,
              90,
              1,
            ],
            ["daily_event_cap", "Events / person / type / UTC day", 1, 100, 1],
            ["repeat_multiplier", "Repeat contribution", 0, 1, 0.05],
            ["activity_points_cap", "Points cap / activity bucket", 1, 100, 1],
            ["normalization_scale", "Intent saturation scale", 1, 100, 1],
          ] as const
        ).map(([key, label, min, max, step]) => (
          <label key={key}>
            {label}
            <input
              type="number"
              min={min}
              max={max}
              step={step}
              value={s[key]}
              onChange={(e) =>
                onChange({ ...s, [key]: Number(e.target.value) })
              }
            />
          </label>
        ))}
      </div>
      <label className="dm-model-check">
        <input
          type="checkbox"
          checked={s.exclude_bots}
          onChange={(e) => onChange({ ...s, exclude_bots: e.target.checked })}
        />
        Exclude flagged bot events
      </label>
      <p className="dm-model-note">
        Sends, deliveries, bounces, unsubscribes, webhooks and anonymous ad
        totals never add intent.
      </p>
    </details>
  );
}
