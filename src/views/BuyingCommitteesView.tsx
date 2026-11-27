import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  Users,
  ShieldCheck,
  Check,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { AccountDemandUnit, CommitteeMember } from "../types";
import { verifyMemberRole, fetchWorkspaceAccess } from "../services/api";
interface Props {
  accounts: AccountDemandUnit[];
  onSelectAccount: (account: AccountDemandUnit) => void;
  onAddMember?: (accountId: string, member: CommitteeMember) => void;
  onApplied?: () => void;
}
const roles = [
  { id: "champion", name: "Champion" },
  { id: "economic_buyer", name: "Economic buyer" },
  { id: "technical_evaluator", name: "Technical evaluator" },
];
const overrideRoles = [
  ...roles,
  { id: "influencer", name: "Influencer" },
  { id: "user", name: "User" },
];
function inferenceLabel(member: CommitteeMember) {
  if (member.roleSource === "human") return "Owner verified";
  if (member.roleSource === "verified") return "Source verified";
  if (member.roleInference?.status === "accepted") return "Automatically inferred";
  if (member.roleInference?.status === "unavailable")
    return "Inference unavailable";
  if (member.roleInference?.status === "uncertain")
    return "Insufficient evidence";
  if (member.roleInference?.status === "stale") return "Evidence changed";
  return "Awaiting automatic evaluation";
}
export const BuyingCommitteesView: React.FC<Props> = ({
  accounts,
  onSelectAccount,
  onApplied,
}) => {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState("");
  const [limit, setLimit] = useState(12);
  const [verification, setVerification] = useState<{
    email: string;
    role: string;
  } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [owner, setOwner] = useState(false);
  useEffect(() => {
    let active = true;
    fetchWorkspaceAccess()
      .then((access) => {
        if (active) setOwner(access.role === "owner");
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const filtered = accounts.filter((a) => {
    const matchesSearch = [a.accountName, a.domain, a.solutionTarget].some(
      (v) => v.toLowerCase().includes(query.toLowerCase()),
    );
    const matchesCoverage =
      filter === "all" ||
      (filter === "zero"
        ? a.committee.coverageScore === 0
        : a.committee.missingRoles.includes(filter));
    return matchesSearch && matchesCoverage;
  });
  const selected = filtered.find((a) => a.id === selectedId) || filtered[0];
  useEffect(() => {
    setVerification(null);
    setConfirmed(false);
    setError("");
    setNotice("");
  }, [selected?.id]);
  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !verification || !confirmed) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await verifyMemberRole(
        selected.id,
        verification.email,
        verification.role,
      );
      setVerification(null);
      setConfirmed(false);
      setNotice(
        "Owner override saved. A fresh score evaluation is queued; consent and recency still apply.",
      );
      onApplied?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Role override failed.");
    } finally {
      setSaving(false);
    }
  };
  const allMembers = accounts.flatMap((a) => a.committee.members);
  const committeeMembers = [...(selected?.committee.members || [])].sort(
    (a, b) => {
      const rank = (member: CommitteeMember) =>
        member.status === "active"
          ? 0
          : member.roleInference?.status === "accepted"
            ? 1
            : 2;
      const recency = (member: CommitteeMember) =>
        Date.parse(member.lastSeen) || 0;
      return rank(a) - rank(b) || recency(b) - recency(a);
    },
  );
  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <div className="dm-page-heading">
        <div>
          <h1>Buying committees</h1>
          <p>
            Automatically map the people behind each buying need, with evidence
            for every role.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1d4ed8]">
          <Sparkles size={14} />
          Automatic role inference
        </span>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          [
            "Identified people",
            allMembers.length,
            "Imported contacts across demand units",
          ],
          [
            "Automatically mapped",
            allMembers.filter(
              (m) =>
                m.roleSource === "jev_inferred" &&
                m.roleInference?.status === "accepted",
            ).length,
            "Inferred roles supported by current evidence",
          ],
          [
            "Coverage-ready people",
            allMembers.filter((m) => m.status === "active").length,
            "Supported role, consent and recent engagement",
          ],
        ].map(([label, value, note]) => (
          <article key={String(label)} className="dm-card dm-metric">
            <div>{label}</div>
            <strong>{Number(value).toLocaleString()}</strong>
            <p>{note}</p>
          </article>
        ))}
      </div>
      <details className="dm-card dm-committee-automation">
        <summary className="dm-committee-help-summary">
          <Sparkles size={16} className="text-[#1d4ed8]" />
          How the committee is built
          <ChevronDown size={16} className="text-[#64748b]" />
        </summary>
        <p className="dm-caption mt-3">
          Runs during scoring after imports and on scheduled refreshes. No
          manual role labels required.
        </p>
        <div className="dm-committee-steps">
          <div>
            <span>01</span>
            <h3>Understand the person</h3>
            <p>
              Job title, company industry and the specific business need
              establish the relevant function.
            </p>
          </div>
          <div>
            <span>02</span>
            <h3>Read the evidence</h3>
            <p>
              Recent person-level activities help distinguish an evaluator,
              buyer, user or advocate.
            </p>
          </div>
          <div>
            <span>03</span>
            <h3>Apply supported roles</h3>
            <p>
              Strong evidence can count automatically. Ambiguous contacts stay
              uncertain; new evidence triggers a fresh evaluation.
            </p>
          </div>
        </div>
        <div className="dm-committee-policy">
          <ShieldCheck size={16} />
          <p>
            A senior title or a pricing visit does not establish a champion.
            Internal advocacy needs its own recorded evidence. Consent and the
            configured engagement window still apply.
          </p>
        </div>
      </details>
      {error && (
        <div role="alert" className="dm-notice dm-notice-error">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="dm-notice">
          <Check size={16} />
          {notice}
        </div>
      )}
      <section className="dm-card flex flex-wrap gap-4">
        <label className="dm-field flex-1 min-w-[200px]">
          Search demand units
          <input
            className="dm-input"
            placeholder="Account, domain, or need…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(12);
            }}
          />
        </label>
        <label className="dm-field">
          Coverage filter
          <select
            className="dm-input"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setLimit(12);
            }}
          >
            <option value="all">All buying groups</option>
            <option value="zero">Zero coverage</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                Missing {r.name.toLowerCase()}
              </option>
            ))}
          </select>
        </label>
      </section>
      <div className="grid gap-5 lg:grid-cols-[1fr_1.35fr]">
        <section className="space-y-2.5 order-2 lg:order-1 self-start lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <p className="dm-caption tabular-nums">{filtered.length} matching demand units</p>
          {filtered.slice(0, limit).map((a) => (
            <button
              key={a.id}
              type="button"
              className={`dm-committee-unit ${selected?.id === a.id ? "is-selected" : ""}`}
              onClick={() => setSelectedId(a.id)}
            >
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold text-sm text-[#0f172a]">{a.accountName}</h2>
                  <p className="dm-caption mt-0.5 truncate">{a.solutionTarget}</p>
                </div>
                <span
                  className={`text-xs font-semibold tabular-nums shrink-0 ${
                    a.committee.coverageScore === 0 ? "text-[#b45309]" : "text-[#1d4ed8]"
                  }`}
                >
                  {a.committee.coverageScore}% coverage
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[#e2e8f0] mt-3.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#1d4ed8]"
                  style={{ width: `${a.committee.coverageScore}%` }}
                />
              </div>
              <p className="dm-caption mt-2.5 tabular-nums">
                {a.committee.members.length} identified ·{" "}
                {
                  a.committee.members.filter((m) => m.status === "active")
                    .length
                }{" "}
                coverage-ready
              </p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {roles.map((r) => (
                  <span
                    key={r.id}
                    className={`text-xs ${a.committee.missingRoles.includes(r.id) ? "text-[#b45309]" : "text-[#15803d]"}`}
                  >
                    {a.committee.missingRoles.includes(r.id) ? "○" : "✓"}{" "}
                    {r.name}
                  </span>
                ))}
              </div>
            </button>
          ))}
          {!filtered.length && (
            <div className="dm-card dm-empty">
              No buying groups match this filter.
            </div>
          )}
          {filtered.length > limit && (
            <button
              type="button"
              className="dm-button w-full"
              onClick={() => setLimit((v) => v + 12)}
            >
              Show 12 more groups
            </button>
          )}
        </section>
        <section className="dm-card self-start order-1 lg:order-2 lg:sticky lg:top-20">
          {selected ? (
            <>
              <div className="dm-section-title">
                <div>
                  <h2>{selected.accountName}</h2>
                  <p>{selected.solutionTarget}</p>
                </div>
                <button
                  type="button"
                  className="dm-text-button"
                  onClick={() => onSelectAccount(selected)}
                >
                  Inspect demand <ArrowRight size={14} />
                </button>
              </div>
              <h3 className="font-semibold text-sm mt-5 flex gap-2 items-center text-[#0f172a]">
                <Users size={16} className="text-[#64748b]" />
                People & role evidence
              </h3>
              <p className="dm-caption mt-1">
                Roles belong to this buying need. The same person can play a
                different role for another purchase.
              </p>
              <div className="divide-y divide-[#e2e8f0] mt-3">
                {committeeMembers.map((member) => (
                  <article key={member.id} className="py-4">
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm text-[#0f172a]">{member.name}</p>
                        <p className="dm-caption">{member.title}</p>
                      </div>
                      <span
                        className={`text-xs font-semibold shrink-0 ${
                          member.status === "active" ? "text-[#15803d]" : "text-[#b45309]"
                        }`}
                      >
                        {member.status === "active"
                          ? "Counts for coverage"
                          : "Not counted"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-2.5 gap-y-1 items-baseline mt-2.5 text-sm">
                      <strong className="font-semibold text-[#0f172a]">
                        {member.role === "unknown"
                          ? "Role not established"
                          : overrideRoles.find(
                              (role) => role.id === member.role,
                            )?.name || member.role.replaceAll("_", " ")}
                      </strong>
                      <span className="text-[#cbd5e1]" aria-hidden="true">·</span>
                      <span className="text-xs font-medium text-[#1d4ed8]">
                        {inferenceLabel(member)}
                      </span>
                      {member.roleSource?.startsWith("jev") &&
                        (member.roleConfidence || 0) > 0 && (
                          <span className="dm-caption tabular-nums">
                            · {Math.round((member.roleConfidence || 0) * 100)}% confidence
                          </span>
                        )}
                    </div>
                    {member.roleInference?.status === "uncertain" &&
                      member.roleInference.suggested_role &&
                      member.roleInference.suggested_role !== "unknown" && (
                        <p className="dm-caption mt-2">
                          Possible {member.roleInference.suggested_role} ·
                          evidence not strong enough for coverage
                        </p>
                      )}
                    <div className="dm-committee-evidence">
                      <p>{member.keyNotes}</p>
                      <p>{member.coverageReason}</p>
                      {member.roleInference?.reason && (
                        <p>{member.roleInference.reason}</p>
                      )}
                      <p>
                        Last engagement:{" "}
                        {member.lastSeen &&
                        !Number.isNaN(Date.parse(member.lastSeen)) &&
                        new Date(member.lastSeen).getFullYear() > 1970
                          ? new Date(member.lastSeen).toLocaleDateString()
                          : "Not recorded"}
                      </p>
                      {member.roleInference?.evaluated_at && (
                        <p>
                          Evaluated:{" "}
                          {new Date(
                            member.roleInference.evaluated_at,
                          ).toLocaleString()}
                        </p>
                      )}
                    </div>
                    {owner && member.email && (
                      <details className="dm-committee-override">
                        <summary>
                          Optional owner correction <ChevronDown size={14} />
                        </summary>
                        <p className="dm-caption my-2">
                          Automatic inference is the default. An evidence-backed
                          owner override is preserved on future imports.
                        </p>
                        <button
                          className="dm-text-button"
                          onClick={() => {
                            setVerification({
                              email: member.email,
                              role: overrideRoles.some(
                                (r) => r.id === member.role,
                              )
                                ? member.role
                                : "influencer",
                            });
                            setConfirmed(false);
                          }}
                        >
                          Correct this role
                        </button>
                      </details>
                    )}
                  </article>
                ))}
              </div>
              {!selected.committee.members.length && (
                <p className="dm-empty">
                  No contacts yet. Connect or import first-party contacts and
                  activities; Dual Motion maps the committee as evidence
                  arrives.
                </p>
              )}
              {verification && (
                <form
                  className="rounded-lg border p-4 mt-4 space-y-4 bg-[#f8faff]"
                  onSubmit={verify}
                >
                  <h3 className="font-semibold text-sm">
                    Owner correction for {verification.email}
                  </h3>
                  <label className="dm-field">
                    Evidence-backed role
                    <select
                      className="dm-input"
                      value={verification.role}
                      onChange={(e) =>
                        setVerification({
                          ...verification,
                          role: e.target.value,
                        })
                      }
                    >
                      {overrideRoles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex gap-3 text-sm leading-6">
                    <input
                      className="mt-1 w-4 h-4"
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />
                    I verified this person's role using first-party evidence.
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="dm-button dm-button-primary"
                      disabled={saving || !confirmed}
                    >
                      {saving ? "Saving…" : "Save owner correction"}
                    </button>
                    <button
                      className="dm-button"
                      type="button"
                      disabled={saving}
                      onClick={() => setVerification(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <p className="dm-empty">
              Select a demand unit to review its buying group.
            </p>
          )}
        </section>
      </div>
    </div>
  );
};
