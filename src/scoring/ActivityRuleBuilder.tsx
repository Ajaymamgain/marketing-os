import React, { useEffect, useRef, useState } from "react";
import { ActivityRule, ActivityTypeScore } from "../services/api";
import { Plus, X, ArrowUp, ArrowDown, Pencil, Trash2 } from "lucide-react";

export function ModelDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLInputElement>("input")?.focus();
    }
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="dm-model-dialog"
      aria-labelledby="model-dialog-title"
      onCancel={onClose}
    >
      <div className="dm-model-dialog-head">
        <div>
          <p className="dm-model-kicker">SCORING STUDIO</p>
          <h2 id="model-dialog-title">{title}</h2>
        </div>
        <button
          type="button"
          className="dm-model-icon"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
const examples = [
  {
    name: "Pricing page visit",
    event_type: "visit_webpage",
    field: "url",
    value: "/pricing",
    points: 12,
    half_life_days: 7,
  },
  {
    name: "Demo form submitted",
    event_type: "form_fill",
    field: "asset_name",
    value: "demo",
    points: 20,
    half_life_days: 14,
  },
  {
    name: "Content download",
    event_type: "form_fill",
    field: "asset_name",
    value: "download",
    points: 8,
    half_life_days: 7,
  },
  {
    name: "Webinar attended",
    event_type: "webinar",
    field: "any",
    value: "",
    points: 12,
    half_life_days: 14,
  },
] as const;
export function ActivityRuleBuilder({
  rules,
  types,
  onChange,
}: {
  rules: ActivityRule[];
  types: ActivityTypeScore[];
  onChange: (rules: ActivityRule[]) => void;
}) {
  const [editing, setEditing] = useState<ActivityRule | null>(null);
  const [isNew, setIsNew] = useState(false);
  const create = () => {
    setIsNew(true);
    setEditing({
      id: crypto.randomUUID(),
      name: "",
      event_type: "visit_webpage",
      field: "any",
      operator: "contains",
      value: "",
      points: 10,
      half_life_days: 7,
      enabled: true,
    });
  };
  const update = (key: keyof ActivityRule, value: unknown) =>
    setEditing((current) => (current ? { ...current, [key]: value } : null));
  const move = (index: number, delta: number) => {
    const next = [...rules];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    onChange(next);
  };
  return (
    <section className="dm-model-panel">
      <div className="dm-model-section-head">
        <div>
          <p className="dm-model-kicker">EVENT MAPPING</p>
          <h2>Score the activity that matters</h2>
          <p className="dm-model-note">
            A specific rule replaces base points for a matching event. First
            matching enabled rule wins; an event earns points once.
          </p>
        </div>
        <button
          type="button"
          className="dm-button dm-button-primary"
          onClick={create}
        >
          <Plus size={16} />
          Add activity
        </button>
      </div>
      {!rules.length ? (
        <div className="dm-model-empty">
          <span className="dm-model-empty-mark">+ pts</span>
          <h3>Your first activity rule starts here</h3>
          <p>
            A pricing visit can be worth more than a general page visit. Add a
            condition, choose points, then test it on recorded data.
          </p>
          <button
            type="button"
            className="dm-button dm-button-secondary"
            onClick={create}
          >
            Create an activity rule
          </button>
        </div>
      ) : (
        <div className="dm-model-rule-list">
          {rules.map((rule, index) => (
            <article
              key={rule.id}
              className={`dm-model-rule ${rule.enabled ? "" : "dm-model-rule-paused"}`}
            >
              <div className="dm-model-rule-order">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="dm-model-rule-description">
                <strong>{rule.name}</strong>
                <p>
                  {types.find((t) => t.type === rule.event_type)?.label ||
                    rule.event_type}
                  {rule.field !== "any"
                    ? ` · ${rule.field.replaceAll("_", " ")} ${rule.operator} “${rule.value}”`
                    : " · all eligible events"}
                </p>
                <small>
                  {rule.half_life_days}-day half-life ·{" "}
                  {rule.enabled
                    ? "Enabled"
                    : "Paused; base scoring still applies"}
                </small>
              </div>
              <div className="dm-model-points">
                +{rule.points}
                <span>points</span>
              </div>
              <div className="dm-model-rule-actions">
                <button
                  type="button"
                  className="dm-model-icon"
                  disabled={index === 0}
                  aria-label={`Move ${rule.name} up`}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  type="button"
                  className="dm-model-icon"
                  disabled={index === rules.length - 1}
                  aria-label={`Move ${rule.name} down`}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown size={15} />
                </button>
                <button
                  type="button"
                  className="dm-model-icon"
                  aria-label={`Edit ${rule.name}`}
                  onClick={() => {
                    setIsNew(false);
                    setEditing(rule);
                  }}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  className="dm-model-icon"
                  aria-label={`Remove ${rule.name} from draft`}
                  onClick={() =>
                    onChange(rules.filter((r) => r.id !== rule.id))
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {editing && (
        <ModelDialog
          title={isNew ? "Create an activity rule" : "Edit activity rule"}
          onClose={() => setEditing(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onChange(
                isNew
                  ? [...rules, editing]
                  : rules.map((r) => (r.id === editing.id ? editing : r)),
              );
              setEditing(null);
            }}
          >
            {isNew && (
              <div className="dm-model-example-list">
                <p className="dm-model-note">
                  Start with an example, or define your own.
                </p>
                {examples.map((example) => (
                  <button
                    type="button"
                    key={example.name}
                    onClick={() => setEditing({ ...editing, ...example })}
                  >
                    {example.name}
                  </button>
                ))}
              </div>
            )}
            <label>
              Activity name
              <input
                autoFocus
                required
                maxLength={100}
                placeholder="e.g. Pricing page visit"
                value={editing.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </label>
            <label>
              Incoming activity type
              <select
                value={
                  types.some((t) => t.type === editing.event_type)
                    ? editing.event_type
                    : "__custom"
                }
                onChange={(e) =>
                  update(
                    "event_type",
                    e.target.value === "__custom"
                      ? "custom_event"
                      : e.target.value,
                  )
                }
              >
                {types
                  .filter((t) => t.source !== "ad_platform")
                  .map((t) => (
                    <option key={t.type} value={t.type}>
                      {t.label}
                    </option>
                  ))}
                <option value="__custom">Custom tracked event…</option>
              </select>
            </label>
            {!types.some((t) => t.type === editing.event_type) && (
              <label>
                Incoming event key
                <input
                  required
                  maxLength={100}
                  value={editing.event_type}
                  onChange={(e) => update("event_type", e.target.value)}
                />
                <small>
                  Use the event type your data source actually sends. Creating a
                  rule does not start tracking this event.
                </small>
              </label>
            )}
            <div className="dm-model-form-grid">
              <label>
                Match condition
                <select
                  value={editing.field}
                  onChange={(e) => update("field", e.target.value)}
                >
                  <option value="any">All eligible events of this type</option>
                  <option value="url">Page URL</option>
                  <option value="asset_name">Asset or form name</option>
                  <option value="campaign_id">Campaign ID</option>
                </select>
              </label>
              {editing.field !== "any" && (
                <label>
                  Operator
                  <select
                    value={editing.operator}
                    onChange={(e) => update("operator", e.target.value)}
                  >
                    <option value="contains">Contains</option>
                    <option value="equals">Equals</option>
                  </select>
                </label>
              )}
            </div>
            {editing.field !== "any" && (
              <label>
                Matching value
                <input
                  required
                  maxLength={250}
                  placeholder={
                    editing.field === "url"
                      ? "/pricing"
                      : "Value from your source data"
                  }
                  value={editing.value}
                  onChange={(e) => update("value", e.target.value)}
                />
                <small>
                  Case-insensitive. Missing fields do not match. Existing rows
                  without this field keep their base score.
                </small>
              </label>
            )}
            <div className="dm-model-form-grid">
              <label>
                Points
                <input
                  required
                  type="number"
                  min="0"
                  max="100"
                  step=".1"
                  value={editing.points}
                  onChange={(e) => update("points", Number(e.target.value))}
                />
              </label>
              <label>
                Half-life · days
                <input
                  required
                  type="number"
                  min="1"
                  max="90"
                  value={editing.half_life_days}
                  onChange={(e) =>
                    update("half_life_days", Number(e.target.value))
                  }
                />
              </label>
            </div>
            <label className="dm-model-check">
              <input
                type="checkbox"
                checked={editing.enabled}
                onChange={(e) => update("enabled", e.target.checked)}
              />
              Enable this rule when the model is published
            </label>
            <p className="dm-model-callout">
              Before caps, one matching event contributes {editing.points} points today,{" "}
              {editing.points / 2} after {editing.half_life_days} days.
              Repetition caps and the model's evidence window still apply.
            </p>
            <div className="dm-model-dialog-foot">
              <button
                type="button"
                className="dm-button dm-button-secondary"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button type="submit" className="dm-button dm-button-primary">
                {isNew ? "Add to model draft" : "Update draft rule"}
              </button>
            </div>
          </form>
        </ModelDialog>
      )}
    </section>
  );
}
