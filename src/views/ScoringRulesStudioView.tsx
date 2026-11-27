import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Save,
  CheckCircle2,
  ArrowRight,
  Layers3,
  Activity,
  Building2,
  Users,
  FlaskConical,
} from "lucide-react";
import { AccountDemandUnit } from "../types";
import {
  ActivityTypeScore,
  EvidencePreview,
  ScoringModelCatalog,
  ScoringModelDocument,
  fetchActivityScores,
  fetchScoringModels,
  saveScoringModel,
  publishScoringModel,
  previewEvidenceConfiguration,
} from "../services/api";
import { SCORE_OPTIONS, matchingOption, rebalance } from "../scoring/options";
import { ModelEvidenceFields } from "../scoring/ModelEvidenceFields";
import {
  ActivityRuleBuilder,
  ModelDialog,
} from "../scoring/ActivityRuleBuilder";

type Tab = "mix" | "fit" | "intent" | "coverage" | "preview";
const tabs: Array<{ id: Tab; name: string; icon: typeof Layers3 }> = [
  { id: "mix", name: "Model setup", icon: Layers3 },
  { id: "fit", name: "Company fit", icon: Building2 },
  { id: "intent", name: "Activity rules", icon: Activity },
  { id: "coverage", name: "Buying group", icon: Users },
  { id: "preview", name: "Test & preview", icon: FlaskConical },
];
const copy = <T,>(value: T): T => structuredClone(value);
const serialize = (
  document: ScoringModelDocument,
  name: string,
  description: string,
) => JSON.stringify({ document, name, description });

export function ScoringRulesStudioView({
  accounts,
  onApplied,
}: {
  accounts: AccountDemandUnit[];
  onApplied?: () => void;
}) {
  const [catalog, setCatalog] = useState<ScoringModelCatalog | null>(null);
  const [document, setDocument] = useState<ScoringModelDocument | null>(null);
  const [types, setTypes] = useState<ActivityTypeScore[]>([]);
  const [selected, setSelected] = useState("workspace");
  const [name, setName] = useState("Demand priority");
  const [description, setDescription] = useState("");
  const [baseline, setBaseline] = useState("");
  const [tab, setTab] = useState<Tab>("mix");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState<EvidencePreview | null>(null);
  const [unit, setUnit] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [template, setTemplate] = useState("copy");
  const generation = useRef(0);
  const load = async () => {
    setBusy(true);
    setError("");
    try {
      const [value, activities] = await Promise.all([
        fetchScoringModels(),
        fetchActivityScores(),
      ]);
      setCatalog(value);
      setTypes(activities);
      setSelected("workspace");
      setDocument(copy(value.workspace.document));
      setName("Demand priority");
      setDescription("");
      setBaseline(serialize(value.workspace.document, "Demand priority", ""));
      setPreview(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load scoring models",
      );
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    generation.current++;
    setPreview(null);
  }, [document, unit]);
  const model = catalog?.models.find((m) => m.model_id === selected);
  const active = catalog?.models.find(
    (m) => m.model_id === catalog.active_model_id,
  );
  const dirty =
    !!document && serialize(document, name, description) !== baseline;
  const canEdit = !!catalog?.can_edit;
  const alreadyPublished = !!model && model.model_id === catalog?.active_model_id && model.published_revision === model.revision && JSON.stringify(model.document) === JSON.stringify(catalog.workspace.document);
  const validFit =
    !!document &&
    Math.abs(
      Object.values(document.settings.fit.component_weights).reduce(
        (a, b) => a + b,
        0,
      ) - 100,
    ) < 0.001;
  const patch = (change: Partial<ScoringModelDocument>) => {
    setDocument((current) => (current ? { ...current, ...change } : null));
    setStatus("");
  };
  const choose = (id: string) => {
    if (!catalog) return;
    const next = catalog.models.find((m) => m.model_id === id);
    const data = copy(next?.document || catalog.workspace.document),
      modelName = next?.name || "Demand priority",
      desc = next?.description || "";
    setSelected(id);
    setName(modelName);
    setDescription(desc);
    setDocument(data);
    setBaseline(serialize(data, modelName, desc));
    setPreview(null);
    setError("");
    setStatus("");
  };
  const preserve = (value: ScoringModelCatalog) => ({
    ...value,
    can_edit: catalog?.can_edit,
    sample_profile: catalog?.sample_profile,
  });
  const save = async () => {
    if (!document || !canEdit || busy) return;
    setBusy(true);
    setError("");
    try {
      const value = await saveScoringModel({
        model_id: model?.model_id,
        revision: model?.revision || 0,
        name,
        description,
        document,
      });
      const saved = value.models.find(
        (m) => m.model_id === value.saved_model_id,
      )!;
      setCatalog(preserve(value));
      setSelected(saved.model_id);
      setName(saved.name);
      setDescription(saved.description);
      setDocument(copy(saved.document));
      setBaseline(serialize(saved.document, saved.name, saved.description));
      setStatus(
        `“${saved.name}” saved as revision ${saved.revision}. Active scoring has not changed.`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save draft");
    } finally {
      setBusy(false);
    }
  };
  const publish = async () => {
    if (!model || !catalog || dirty || busy || !canEdit) return;
    setBusy(true);
    setError("");
    try {
      const value = await publishScoringModel(
        model.model_id,
        model.revision,
        catalog.workspace.token,
      );
      setCatalog(preserve(value));
      setStatus(
        value.rescore === "queued"
          ? `“${model.name}” published. Recalculation is queued; Automated evaluation reviews the updated scores next.`
          : "Model published, but recalculation could not be queued. Check Automation.",
      );
      onApplied?.();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not publish model",
      );
    } finally {
      setBusy(false);
    }
  };
  const test = async () => {
    if (!document || !accounts.length) return;
    const request = ++generation.current;
    setBusy(true);
    setError("");
    try {
      const value = await previewEvidenceConfiguration(
        document.settings,
        unit || accounts[0].id,
        document.weights,
        document.activity_points,
      );
      if (generation.current === request) setPreview(value);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not preview model",
      );
    } finally {
      setBusy(false);
    }
  };
  const eventTypes = useMemo(
    () => types.filter((t) => t.source !== "ad_platform"),
    [types],
  );
  const ruleEventTypes = useMemo(
    () => [
      ...eventTypes,
      ...(catalog?.observed_events || [])
        .filter(
          (row, index, rows) =>
            !eventTypes.some((t) => t.type === row.event_type) &&
            rows.findIndex((other) => other.event_type === row.event_type) ===
              index,
        )
        .map((row) => ({
          type: row.event_type,
          label: row.label + " · observed",
          source: "marketo" as const,
          points: 0,
        })),
    ],
    [eventTypes, catalog?.observed_events],
  );
  if (!catalog || !document)
    return (
      <div className="dm-scoring-studio">
        <h1>Scoring studio</h1>
        <p role={error ? "alert" : "status"}>
          {error || "Loading your scoring models…"}
        </p>
        {error && (
          <button
            className="dm-button dm-button-secondary"
            onClick={() => void load()}
          >
            Retry loading
          </button>
        )}
      </div>
    );
  return (
    <div className="dm-scoring-studio">
      <header className="dm-model-page-head">
        <div>
          <p className="dm-model-kicker">
            DEMAND INTELLIGENCE / SCORING STUDIO
          </p>
          <h1>Scoring models</h1>
          <p>
            Define who fits, what shows intent, and which buying roles matter.
            The next action is chosen from recorded evidence.
          </p>
        </div>
        <button
          className="dm-button dm-button-primary"
          disabled={!canEdit || busy}
          onClick={() => {
            setNewName("");
            setTemplate("copy");
            setNewOpen(true);
          }}
        >
          <Plus size={17} />
          Create model
        </button>
      </header>
      {error && (
        <p role="alert" className="dm-notice dm-notice-warning">
          {error}{" "}
          <button className="dm-model-text-button" onClick={() => void load()}>
            Reload saved models
          </button>
        </p>
      )}
      {status && (
        <p role="status" className="dm-notice">
          {status}
        </p>
      )}
      <div className="dm-model-active-strip">
        <span className="dm-model-live-dot" />
        <span>
          <strong>Active workspace policy</strong>{" "}
          {active?.name || "Default demand scoring"}{" "}
          <small>
            Revision {catalog.workspace.revision} · one active model for all
            account/need combinations in this workspace
          </small>
        </span>
        <span className="dm-model-tag">Rules-based · explainable</span>
      </div>
      <div className="dm-model-layout">
        <aside className="dm-model-library" aria-label="Scoring model library">
          <div className="dm-model-library-title">
            <strong>Models</strong>
            <span>{catalog.models.length}</span>
          </div>
          <p>
            Save alternatives here. Publishing replaces the workspace policy.
          </p>
          <button
            className={selected === "workspace" ? "is-selected" : ""}
            onClick={() => choose("workspace")}
            disabled={busy || dirty}
          >
            <Layers3 size={17} />
            <span>
              Current workspace policy
              <small>View or copy the applied rules</small>
            </span>
          </button>
          {catalog.models.map((item) => (
            <button
              key={item.model_id}
              className={selected === item.model_id ? "is-selected" : ""}
              onClick={() => choose(item.model_id)}
              disabled={busy || dirty}
            >
              <span className="dm-model-library-mark">
                {item.name.slice(0, 1).toUpperCase()}
              </span>
              <span>
                {item.name}
                <small>
                  {item.model_id === catalog.active_model_id ? "Active · " : ""}
                  Revision {item.revision}
                  {item.published_revision === item.revision
                    ? " · published"
                    : " · draft"}
                </small>
              </span>
            </button>
          ))}
          {dirty && (
            <p className="dm-model-library-warning">
              Save or discard your edits before switching models.
            </p>
          )}
          <div className="dm-model-library-help">
            <strong>Fit → Intent → Coverage</strong>
            <p>
              A score prioritizes a demand unit. It is not a conversion
              probability or an approval to send a campaign.
            </p>
          </div>
        </aside>
        <div className="dm-model-workbench">
          <div className="dm-model-editor-head">
            <div>
              <p className="dm-model-kicker">
                {selected === "workspace"
                  ? "WORKSPACE POLICY COPY"
                  : `MODEL / REVISION ${model?.revision || 0}`}
              </p>
              <h2>{name || "Untitled model"}</h2>
              <p>
                {dirty
                  ? "Unsaved model changes"
                  : model
                    ? "Saved model draft"
                    : "Create a named model from these applied rules"}
              </p>
            </div>
            <div className="dm-model-editor-actions">
              <button
                className="dm-button dm-button-secondary"
                disabled={
                  !canEdit ||
                  busy ||
                  !validFit ||
                  !name.trim() ||
                  (!!model && !dirty)
                }
                onClick={() => void save()}
              >
                <Save size={16} />
                {model ? "Save draft" : "Save as model"}
              </button>
              <button
                className="dm-button dm-button-primary"
                disabled={!canEdit || busy || !model || dirty || !validFit || alreadyPublished}
                onClick={() => void publish()}
              >
                <CheckCircle2 size={16} />
                Publish model
              </button>
              {dirty && (
                <button
                  className="dm-model-text-button"
                  disabled={busy}
                  onClick={() => {
                    if (model) choose(model.model_id);
                    else choose("workspace");
                  }}
                >
                  Discard edits
                </button>
              )}
            </div>
          </div>
          <div
            className="dm-model-tabs"
            role="tablist"
            aria-label="Scoring model sections"
          >
            {tabs.map(({ id, name: label, icon: Icon }) => (
              <button
                key={id}
                id={`model-tab-${id}`}
                role="tab"
                aria-selected={tab === id}
                aria-controls={`model-panel-${id}`}
                onClick={() => setTab(id)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                    e.preventDefault();
                    const index = tabs.findIndex((t) => t.id === tab);
                    const next =
                      tabs[
                        (index +
                          (e.key === "ArrowRight" ? 1 : tabs.length - 1)) %
                          tabs.length
                      ].id;
                    setTab(next);
                    globalThis.document
                      .getElementById(`model-tab-${next}`)
                      ?.focus();
                  }
                }}
                tabIndex={tab === id ? 0 : -1}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
          {!canEdit && (
            <p className="dm-notice">
              Only workspace owners can create, preview, or publish scoring
              models.
            </p>
          )}
          {!validFit && (
            <p role="alert" className="dm-notice dm-notice-warning">
              Company fit attribute weights must total 100%. Update them in
              Company fit before saving or previewing.
            </p>
          )}
          <fieldset disabled={!canEdit || busy} className="dm-model-fieldset">
            <div
              role="tabpanel"
              id={`model-panel-${tab}`}
              aria-labelledby={`model-tab-${tab}`}
            >
              {tab === "mix" && (
                <div className="dm-model-fields">
                  <section className="dm-model-panel">
                    <p className="dm-model-kicker">MODEL IDENTITY</p>
                    <h2>Give this score a purpose</h2>
                    <label>
                      Model name
                      <input
                        maxLength={80}
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          setStatus("");
                        }}
                        placeholder="e.g. Enterprise demand priority"
                      />
                    </label>
                    <label>
                      Purpose & operating notes
                      <textarea
                        maxLength={500}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What does this model prioritize, and why?"
                      />
                    </label>
                    <div className="dm-model-callout">
                      <strong>Scope: account + need</strong>
                      <p>
                        Each demand unit gets fit, intent, coverage, and a
                        composite score. The active model applies across this
                        workspace; separate simultaneous models by product or
                        segment are not supported yet.
                      </p>
                    </div>
                  </section>
                  <section className="dm-model-panel">
                    <p className="dm-model-kicker">COMPOSITE SCORE</p>
                    <h2>Choose how the dimensions combine</h2>
                    <div className="dm-model-presets">
                      {SCORE_OPTIONS.map((option) => (
                        <button
                          type="button"
                          aria-pressed={
                            matchingOption(document.weights) === option.id
                          }
                          key={option.id}
                          onClick={() =>
                            patch({ weights: copy(option.weights) })
                          }
                        >
                          <strong>{option.name}</strong>
                          <span>
                            {option.weights.fit} / {option.weights.intent} /{" "}
                            {option.weights.coverage}
                          </span>
                        </button>
                      ))}
                    </div>
                    {(["fit", "intent", "coverage"] as const).map((key) => (
                      <label className="dm-model-slider" key={key}>
                        <span>
                          {key === "fit"
                            ? "Company fit"
                            : key === "intent"
                              ? "Engagement intent"
                              : "Buying-group coverage"}
                          <strong>{document.weights[key]}%</strong>
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          aria-label={`${key} composite weight`}
                          value={document.weights[key]}
                          onChange={(e) =>
                            patch({
                              weights: rebalance(
                                document.weights,
                                key,
                                Number(e.target.value),
                              ),
                            })
                          }
                        />
                      </label>
                    ))}
                    <div className="dm-model-formula">
                      Fit × {document.weights.fit / 100} + Intent ×{" "}
                      {document.weights.intent / 100} + Coverage ×{" "}
                      {document.weights.coverage / 100}
                    </div>
                  </section>
                  <section className="dm-model-panel dm-model-span">
                    <h2>From model draft to automatic action</h2>
                    <div className="dm-model-flow">
                      <div>
                        <span>01</span>
                        <strong>Define your rules</strong>
                        <p>
                          Fit attributes, activity conditions, points, and
                          decay.
                        </p>
                      </div>
                      <ArrowRight size={18} />
                      <div>
                        <span>02</span>
                        <strong>Preview & publish</strong>
                        <p>
                          Save a draft, test recorded evidence, then activate.
                        </p>
                      </div>
                      <ArrowRight size={18} />
                      <div>
                        <span>03</span>
                        <strong>Choose the next eligible play</strong>
                        <p>
                          Scores and evidence guide next actions. Execution
                          gates still apply.
                        </p>
                      </div>
                    </div>
                  </section>
                </div>
              )}
              {tab === "fit" && (
                <ModelEvidenceFields
                  section="fit"
                  settings={document.settings}
                  onChange={(settings) => patch({ settings })}
                />
              )}
              {tab === "intent" && (
                <div className="dm-model-stack">
                  <ActivityRuleBuilder
                    rules={document.settings.activity_rules}
                    types={ruleEventTypes}
                    onChange={(activity_rules) =>
                      patch({
                        settings: { ...document.settings, activity_rules },
                      })
                    }
                  />
                  <section className="dm-model-panel">
                    <p className="dm-model-kicker">BASE EVENT POINTS</p>
                    <h2>The fallback when no specific rule matches</h2>
                    <p className="dm-model-note">
                      Generic events use these points and half-lives. The values
                      below do not add a second score on top of a matching
                      activity rule.
                    </p>
                    <div className="dm-model-table-wrap">
                      <table className="dm-model-table">
                        <thead>
                          <tr>
                            <th>Activity</th>
                            <th>Event key</th>
                            <th>Points</th>
                            <th>Half-life · days</th>
                          </tr>
                        </thead>
                        <tbody>
                          {eventTypes.map((row) => (
                            <tr key={row.type}>
                              <th>{row.label}</th>
                              <td>
                                <code>{row.type}</code>
                              </td>
                              <td>
                                <input
                                  aria-label={`${row.label} base points`}
                                  type="number"
                                  min="0"
                                  max="100"
                                  step=".1"
                                  value={
                                    document.activity_points[row.type] ??
                                    row.points
                                  }
                                  onChange={(e) =>
                                    patch({
                                      activity_points: {
                                        ...document.activity_points,
                                        [row.type]: Number(e.target.value),
                                      },
                                    })
                                  }
                                />
                              </td>
                              <td>
                                {row.type in document.settings.half_lives ? (
                                  <input
                                    aria-label={`${row.label} half-life days`}
                                    type="number"
                                    min="1"
                                    max="90"
                                    value={
                                      document.settings.half_lives[row.type]
                                    }
                                    onChange={(e) =>
                                      patch({
                                        settings: {
                                          ...document.settings,
                                          half_lives: {
                                            ...document.settings.half_lives,
                                            [row.type]: Number(e.target.value),
                                          },
                                        },
                                      })
                                    }
                                  />
                                ) : (
                                  document.settings.default_half_life_days
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                  <ModelEvidenceFields
                    section="intent"
                    settings={document.settings}
                    onChange={(settings) => patch({ settings })}
                  />
                  <p className="dm-model-note">
                    Ad campaign totals remain reporting data. They cannot
                    establish which person took an action.
                  </p>
                </div>
              )}
              {tab === "coverage" && (
                <ModelEvidenceFields
                  section="coverage"
                  settings={document.settings}
                  onChange={(settings) => patch({ settings })}
                />
              )}
              {tab === "preview" && (
                <div className="dm-model-stack">
                  <section className="dm-model-panel">
                    <p className="dm-model-kicker">READ-ONLY MODEL TEST</p>
                    <h2>See what this model would do</h2>
                    <p className="dm-model-note">
                      Uses this draft's complete rules and recorded evidence. No
                      decision request, score write, or campaign delivery occurs.
                    </p>
                    <div className="dm-model-preview-select">
                      <label>
                        Account and need
                        <select
                          aria-label="Test account and need"
                          value={unit || accounts[0]?.id || ""}
                          onChange={(e) => setUnit(e.target.value)}
                        >
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.accountName} · {a.id}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        className="dm-button dm-button-primary"
                        disabled={!accounts.length || !validFit}
                        onClick={() => void test()}
                      >
                        <FlaskConical size={16} />
                        Run preview
                      </button>
                    </div>
                    {!accounts.length && (
                      <p className="dm-notice">
                        Import identified activity before testing against a
                        demand unit.
                      </p>
                    )}
                    {preview ? (
                      <div className="dm-model-preview">
                        <div className="dm-model-preview-metrics">
                          <div>
                            <span>Last recorded score</span>
                            <strong>{preview.current_composite}</strong>
                          </div>
                          <div>
                            <span>This model draft</span>
                            <strong>{preview.projected_composite}</strong>
                          </div>
                          <div>
                            <span>Coverage gate</span>
                            <strong
                              className={
                                preview.activation_blocked ? "is-blocked" : ""
                              }
                            >
                              {preview.activation_blocked
                                ? "Blocked"
                                : "Evidence present"}
                            </strong>
                          </div>
                        </div>
                        <div className="dm-model-table-wrap">
                          <table className="dm-model-table">
                            <thead>
                              <tr>
                                <th>Dimension</th>
                                <th>Score / 100</th>
                                <th>Contribution</th>
                                <th>Evidence</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <th>Company fit</th>
                                <td>{preview.fit}</td>
                                <td>{preview.contributions.fit}</td>
                                <td>
                                  {preview.fit_evidence.fit_confidence * 100}%
                                  known weighted evidence
                                  {preview.fit_evidence.insufficient_data
                                    ? " · below minimum"
                                    : ""}
                                </td>
                              </tr>
                              <tr>
                                <th>Engagement intent</th>
                                <td>
                                  {preview.intent.normalized_intent_score}
                                </td>
                                <td>{preview.contributions.intent}</td>
                                <td>
                                  {preview.intent.activities.reduce(
                                    (sum, a) => sum + a.count,
                                    0,
                                  )}{" "}
                                  eligible events
                                </td>
                              </tr>
                              <tr>
                                <th>Buying group</th>
                                <td>{preview.coverage}</td>
                                <td>{preview.contributions.coverage}</td>
                                <td>
                                  {preview.coverage_evidence.active_role_count}{" "}
                                  verified engaged roles
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <h3>Activities that contributed</h3>
                        {preview.intent.activities.length ? (
                          <div className="dm-model-evidence-list">
                            {preview.intent.activities.map((a) => (
                              <div key={a.activity}>
                                <strong>{a.label}</strong>
                                <span>
                                  {a.count} events · {a.points} decayed, capped
                                  points
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="dm-model-note">
                            No eligible activities in this model's window.
                            Missing metadata conditions do not match.
                          </p>
                        )}
                        <div className="dm-source-tags">
                          {Object.entries(preview.intent.excluded_events).map(
                            ([key, value]) => (
                              <span key={key}>
                                {key.replaceAll("_", " ")}
                                <strong>{value} excluded</strong>
                              </span>
                            ),
                          )}
                        </div>
                        <p className="dm-model-callout">
                          {preview.activation_blocked
                            ? "Activation is blocked because coverage is zero."
                            : "Coverage evidence is present; provider, consent, confidence and destination gates still apply."}{" "}
                          Missing core roles:{" "}
                          {preview.coverage_evidence.missing_roles.join(", ") ||
                            "none"}
                          .
                        </p>
                      </div>
                    ) : (
                      <div className="dm-model-empty">
                        <FlaskConical size={28} />
                        <h3>Test with an actual demand unit</h3>
                        <p>
                          Your preview shows which rules contributed, excluded
                          evidence, and the activation gate.
                        </p>
                      </div>
                    )}
                  </section>
                  <details className="dm-model-panel">
                    <summary>What the sample data can tell us</summary>
                    <p className="dm-model-note">
                      {catalog.sample_profile?.recommendation ||
                        "Use identified engagement, verified roles and real company attributes. Anonymous ad metrics cannot identify a buyer."}
                    </p>
                    {catalog.sample_profile?.available && (
                      <p className="dm-model-note">
                        {catalog.sample_profile.marketo_rows.toLocaleString()}{" "}
                        Marketo activity rows ·{" "}
                        {catalog.sample_profile.ads_rows.toLocaleString()} ad
                        reporting rows. Existing records without URL or asset
                        metadata cannot match those conditions.
                      </p>
                    )}
                  </details>
                </div>
              )}
            </div>
          </fieldset>
          <footer className="dm-model-footer">
            <span>
              <strong>Zero coverage = no activation.</strong> Consent exclusions
              and commercial evidence gates remain enforced.
            </span>
            <button
              className="dm-model-text-button"
              onClick={() => setTab(tab === "preview" ? "mix" : "preview")}
            >
              {tab === "preview" ? "Back to model setup" : "Test this model"}
              <ArrowRight size={15} />
            </button>
          </footer>
        </div>
      </div>
      {newOpen && (
        <ModelDialog
          title="Create a scoring model"
          onClose={() => setNewOpen(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const next = copy(document);
              if (template !== "copy")
                next.weights = copy(
                  SCORE_OPTIONS.find((o) => o.id === template)!.weights,
                );
              setSelected("new");
              setName(newName.trim());
              setDescription("");
              setDocument(next);
              setBaseline("");
              setPreview(null);
              setTab("mix");
              setError("");
              setStatus(
                "New model draft. Save it before publishing; active scoring has not changed.",
              );
              setNewOpen(false);
            }}
          >
            <label>
              Model name
              <input
                autoFocus
                required
                maxLength={80}
                placeholder="e.g. Enterprise buying readiness"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </label>
            <label>
              Starting point
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
              >
                <option value="copy">Copy the model currently open</option>
                {SCORE_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} · {o.weights.fit}/{o.weights.intent}/
                    {o.weights.coverage}
                  </option>
                ))}
              </select>
            </label>
            <p className="dm-model-callout">
              Each starting point copies the open model's fit rules, activities
              and coverage settings. Presets change only the composite weights.
              Save and preview before publishing.
            </p>
            <div className="dm-model-dialog-foot">
              <button
                type="button"
                className="dm-button dm-button-secondary"
                onClick={() => setNewOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="dm-button dm-button-primary">
                Create draft
              </button>
            </div>
          </form>
        </ModelDialog>
      )}
    </div>
  );
}
