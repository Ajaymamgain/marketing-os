// Restored from the preserved November 16 landing build; uses the current React runtime.
import * as T from 'react';
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  Layers,
  Workflow,
  Zap,
  Search,
  Activity,
  ArrowRight,
  Users,
  ShieldCheck,
  Bot,
  CircleCheckBig,
  Copy,
  Flame,
  Globe,
  HeartHandshake,
  LockKeyhole,
  ShieldAlert,
  SlidersVertical,
} from 'lucide-react';
function DualMotionLogo({ className: e = `w-7 h-7` }) {
  return (
    <div className={`relative flex items-center justify-center ${e}`}>
      <svg
        viewBox={`0 0 32 32`}
        fill={`none`}
        className={`w-full h-full`}
        aria-hidden={`true`}
      >
        <rect
          x={`4`}
          y={`6`}
          width={`13`}
          height={`13`}
          rx={`2.5`}
          fill={`#fe551b`}
        />
        <rect
          x={`15`}
          y={`13`}
          width={`13`}
          height={`13`}
          rx={`2.5`}
          fill={`#1c1917`}
        />
        <path
          d={`M10 12.5L22 19.5`}
          stroke={`#ffffff`}
          strokeWidth={`2`}
          strokeLinecap={`round`}
        />
      </svg>
    </div>
  );
}
var RestoredLandingPage = ({ onNavigateTab }) => {
  let [hasCoverage, setHasCoverage] = T.useState(!0),
    [selectedDemoAccount, setSelectedDemoAccount] = T.useState(
      `northstar`,
    ),
    [activeMcpTab, setActiveMcpTab] = T.useState(`cursor`),
    [codeCopied, setCodeCopied] = T.useState(!1),
    [fitWeight, setFitWeight] = T.useState(0.35),
    [intentWeight, setIntentWeight] = T.useState(0.4),
    [coverageWeight, setCoverageWeight] = T.useState(0.25),
    [activeDropdown, setActiveDropdown] = T.useState(null),
    navigate = (t) => onNavigateTab(t),
    scrollToSection = (e) => {
      (document.getElementById(e)?.scrollIntoView({
        behavior: `smooth`,
        block: `start`,
      }),
        setActiveDropdown(null));
    },
    demoAccount = {
      northstar: {
        account: `Northstar Technologies`,
        need: `Cloud Security & Compliance`,
        domain: `northstar.tech`,
        tier: `Tier 1 Enterprise · $120M ARR`,
        fit: 86,
        intent: 78,
        coverageScore: hasCoverage ? 60 : 0,
        roles: [
          {
            name: `Alex Rivera`,
            role: `Chief Information Security Officer`,
            status: `Verified`,
            consent: `Active Consent`,
          },
          {
            name: `Sarah Chen`,
            role: `VP Cloud Architecture`,
            status: `Verified`,
            consent: `Active Consent`,
          },
          {
            name: `David Kim`,
            role: `Lead DevSecOps`,
            status: hasCoverage ? `Verified` : `Unconfirmed`,
            consent: `Active Consent`,
          },
        ],
      },
      datadog: {
        account: `Datadog Inc`,
        need: `Realtime Infrastructure Observability`,
        domain: `datadog.com`,
        tier: `Strategic Account · $1.6B ARR`,
        fit: 92,
        intent: 84,
        coverageScore: hasCoverage ? 75 : 0,
        roles: [
          {
            name: `Marcus Brody`,
            role: `VP Engineering`,
            status: `Verified`,
            consent: `Active Consent`,
          },
          {
            name: `Elena Rostova`,
            role: `Director SRE`,
            status: `Verified`,
            consent: `Active Consent`,
          },
        ],
      },
      figma: {
        account: `Figma Design`,
        need: `Enterprise Design System Governance`,
        domain: `figma.com`,
        tier: `Growth Enterprise · $600M ARR`,
        fit: 89,
        intent: 68,
        coverageScore: hasCoverage ? 50 : 0,
        roles: [
          {
            name: `Julian Vance`,
            role: `Head of Product Design`,
            status: `Verified`,
            consent: `Active Consent`,
          },
        ],
      },
    }[selectedDemoAccount],
    fitScore = demoAccount.fit,
    intentScore = demoAccount.intent,
    coverageScore = demoAccount.coverageScore,
    compositeScore = (
      fitScore * 0.35 +
      intentScore * 0.4 +
      coverageScore * 0.25
    ).toFixed(1),
    totalWeight = fitWeight + intentWeight + coverageWeight,
    configuredScore =
      totalWeight > 0
        ? (
            (fitScore * fitWeight +
              intentScore * intentWeight +
              coverageScore * coverageWeight) /
            totalWeight
          ).toFixed(1)
        : `—`,
    copyCode = (e) => {
      (navigator.clipboard?.writeText(e),
        setCodeCopied(!0),
        setTimeout(() => setCodeCopied(!1), 2200));
    },
    mcpExamples = {
      cursor: `// Streamable HTTP MCP; configure an authenticated agent session.
{
  "mcpServers": {
    "dual-motion": {
      "url": "http://127.0.0.1:8000/mcp",
      "headers": { "Authorization": "Bearer <agent-session-token>" }
    }
  }
}`,
      claude: `// Use your client's Streamable HTTP MCP connection.
// Server: http://127.0.0.1:8000/mcp
// Authentication: a tenant-scoped agent session token
// Tools: dm_workspace, dm_inspect, dm_act
// Obtain a short-lived agent session through workspace authentication.`,
      python: `# Authenticated product API; requests is a standard HTTP library.
import os
import requests

response = requests.get(
    "http://127.0.0.1:8000/v1/demand-units",
    headers={"Authorization": "Bearer " + os.environ["DUAL_MOTION_AGENT_TOKEN"]},
    timeout=30,
)
response.raise_for_status()
units = response.json()`,
      curl: `# Use an authenticated agent session token from the current workspace.
curl http://127.0.0.1:8000/v1/demand-units   -H "Authorization: Bearer $DUAL_MOTION_AGENT_TOKEN"`,
    };
  return (
    <div
      className={`gb-landing font-sans bg-white text-[#1c1917] min-h-screen selection:bg-[#fe551b]/20 selection:text-[#fe551b]`}
    >
      <aside
        aria-label={`Announcement`}
        className={`bg-[#fafaf9] border-b border-[#efeeed] py-2 px-4 text-xs font-medium text-[#57534d] flex items-center justify-center gap-2.5 transition-colors`}
      >
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#fe551b] text-white text-[11px] font-semibold tracking-wide`}
        >{`New`}</span>
        <span
          className={`truncate`}
        >{`Explore the controlled pilot: evidence-based scoring, automated decisions and Marketo operations.`}</span>
        <button
          type={`button`}
          onClick={() => scrollToSection(`mcp-section`)}
          className={`inline-flex items-center gap-1 font-semibold text-[#1c1917] hover:text-[#fe551b] transition-colors ml-1 cursor-pointer`}
        >
          {`View integration `}
          <ArrowRight size={13} />
        </button>
      </aside>
      <header
        className={`sticky top-0 z-50 bg-white/85 backdrop-blur-xl border-b border-[#efeeed]`}
      >
        <div
          className={`max-w-[1240px] mx-auto px-6 h-18 flex items-center justify-between gap-6`}
        >
          <div className={`flex items-center gap-3`}>
            <a
              href={`#hero`}
              onClick={(e) => {
                (e.preventDefault(),
                  window.scrollTo({
                    top: 0,
                    behavior: `smooth`,
                  }));
              }}
              className={`flex items-center gap-2.5 text-[#1c1917] font-bold text-[20px] tracking-tight hover:opacity-90 transition-opacity`}
            >
              <DualMotionLogo className={`w-8 h-8`} />
              <span className={`tracking-tight`}>{`dual motion`}</span>
            </a>
          </div>
          <nav
            className={`hidden lg:flex items-center gap-1 text-[14px] font-medium text-[#57534d]`}
            aria-label={`Main menu`}
          >
            <div
              className={`relative group`}
              onMouseEnter={() => setActiveDropdown(`product`)}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                type={`button`}
                className={`px-3 py-2 rounded-lg hover:text-[#1c1917] hover:bg-[#fafaf9] flex items-center gap-1 transition-colors`}
                onClick={() => scrollToSection(`product`)}
              >
                {`Product `}
                <ChevronDown
                  size={14}
                  className={`opacity-60 group-hover:rotate-180 transition-transform duration-200`}
                />
              </button>
              {activeDropdown === `product` && (
                <div
                  className={`absolute top-full left-0 w-80 p-2 bg-white rounded-xl shadow-xl border border-[#efeeed] animate-in fade-in slide-in-from-top-1 duration-150`}
                >
                  <button
                    type={`button`}
                    onClick={() => {
                      (navigate(`DEMAND_UNITS`), setActiveDropdown(null));
                    }}
                    className={`w-full text-left p-2.5 rounded-lg hover:bg-[#fafaf9] transition-colors flex items-start gap-3`}
                  >
                    <div
                      className={`p-2 rounded-md bg-[#fafaf9] text-[#fe551b] border border-[#efeeed]`}
                    >
                      <Layers size={16} />
                    </div>
                    <div>
                      <div
                        className={`text-sm font-semibold text-[#1c1917]`}
                      >{`Demand Unit Scoring`}</div>
                      <div
                        className={`text-xs text-[#79716b]`}
                      >{`Transparent fit, intent, and coverage formula.`}</div>
                    </div>
                  </button>
                  <button
                    type={`button`}
                    onClick={() => {
                      (navigate(`AUTOMATION`), setActiveDropdown(null));
                    }}
                    className={`w-full text-left p-2.5 rounded-lg hover:bg-[#fafaf9] transition-colors flex items-start gap-3`}
                  >
                    <div
                      className={`p-2 rounded-md bg-[#fafaf9] text-[#1c1917] border border-[#efeeed]`}
                    >
                      <Bot size={16} />
                    </div>
                    <div>
                      <div
                        className={`text-sm font-semibold text-[#1c1917]`}
                      >{`Decision automation`}</div>
                      <div
                        className={`text-xs text-[#79716b]`}
                      >{`Autonomous decision layer inside product guardrails.`}</div>
                    </div>
                  </button>
                  <button
                    type={`button`}
                    onClick={() => {
                      (navigate(`RULES`), setActiveDropdown(null));
                    }}
                    className={`w-full text-left p-2.5 rounded-lg hover:bg-[#fafaf9] transition-colors flex items-start gap-3`}
                  >
                    <div
                      className={`p-2 rounded-md bg-[#fafaf9] text-[#fe551b] border border-[#efeeed]`}
                    >
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <div
                        className={`text-sm font-semibold text-[#1c1917]`}
                      >{`Scoring Rules Studio`}</div>
                      <div
                        className={`text-xs text-[#79716b]`}
                      >{`Zero coverage safety gates & SLA enforcement.`}</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
            <button
              type={`button`}
              onClick={() => scrollToSection(`empathy-reality`)}
              className={`px-3 py-2 rounded-lg hover:text-[#1c1917] hover:bg-[#fafaf9] transition-colors`}
            >{`Why Dual Motion`}</button>
            <button
              type={`button`}
              onClick={() => scrollToSection(`guardrails`)}
              className={`px-3 py-2 rounded-lg hover:text-[#1c1917] hover:bg-[#fafaf9] transition-colors`}
            >{`Guardrails`}</button>
            <button
              type={`button`}
              onClick={() => scrollToSection(`features-bento`)}
              className={`px-3 py-2 rounded-lg hover:text-[#1c1917] hover:bg-[#fafaf9] transition-colors`}
            >{`Architecture`}</button>
            <button
              type={`button`}
              onClick={() => scrollToSection(`mcp-section`)}
              className={`px-3 py-2 rounded-lg hover:text-[#1c1917] hover:bg-[#fafaf9] transition-colors`}
            >{`MCP & Agent`}</button>
            <button
              type={`button`}
              onClick={() => scrollToSection(`enterprise`)}
              className={`px-3 py-2 rounded-lg hover:text-[#1c1917] hover:bg-[#fafaf9] transition-colors`}
            >{`Governance`}</button>
          </nav>
          <div className={`flex items-center gap-3`}>
            <button
              type={`button`}
              onClick={() => navigate(`OVERVIEW`)}
              className={`text-[14px] font-semibold text-[#57534d] hover:text-[#1c1917] px-3 py-2 transition-colors`}
            >{`Log in`}</button>
            <button
              type={`button`}
              onClick={() => navigate(`OVERVIEW`)}
              className={`h-10 px-4.5 rounded-full bg-[#1c1917] hover:bg-[#2d2926] text-white text-[13px] font-semibold flex items-center gap-2 shadow-sm transition-all hover:scale-[1.02] cursor-pointer`}
            >
              <span>{`Explore workspace`}</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>
      <main>
        <section id={`hero`} className={`relative pt-20 pb-16 overflow-hidden`}>
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[580px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#fe551b]/15 via-[#ffefe8]/40 to-transparent pointer-events-none -z-10 blur-3xl opacity-80`}
          />
          <div className={`max-w-[1240px] mx-auto px-6 text-center`}>
            <div
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#efeeed] shadow-xs text-xs font-semibold text-[#57534d] mb-6 hover:border-[#fe551b]/40 transition-colors`}
            >
              <span
                className={`w-2 h-2 rounded-full bg-[#fe551b] animate-pulse`}
              />
              <span>{`Stop burning target accounts on unverified noise`}</span>
              <ChevronRight size={13} className={`text-[#a8a29e]`} />
            </div>
            <h1
              className={`text-[48px] sm:text-[68px] lg:text-[84px] font-semibold tracking-[-0.04em] leading-[1.02] text-[#1c1917] max-w-[980px] mx-auto`}
            >
              {`Every demand signal deserves a`}
              {` `}
              <span
                className={`relative inline-block font-normal italic font-serif text-[#1c1917]`}
              >
                {`clear next move.`}
                <span
                  className={`absolute bottom-1 left-0 right-0 h-[2.5px] bg-[#fe551b] rounded-full opacity-60`}
                />
              </span>
            </h1>
            <p
              className={`mt-7 max-w-[760px] mx-auto text-[18px] sm:text-[21px] text-[#57534d] leading-[1.48] font-normal`}
            >{`Sales is exhausted by vanity lead scores. Marketing is tired of pipeline blame. Dual Motion replaces guesswork with explainable math — holding outbound outreach until a real buying committee is verified.`}</p>
            <div
              className={`mt-8 flex flex-wrap items-center justify-center gap-3.5`}
            >
              <button
                type={`button`}
                onClick={() => navigate(`OVERVIEW`)}
                className={`h-12 px-6 rounded-full bg-[#1c1917] hover:bg-[#2d2926] text-white text-[15px] font-semibold flex items-center gap-2.5 shadow-md transition-all hover:scale-[1.02] cursor-pointer`}
              >
                <span>{`Explore the workspace`}</span>
                <ArrowRight size={16} />
              </button>
              <button
                type={`button`}
                onClick={() => scrollToSection(`product`)}
                className={`h-12 px-5.5 rounded-full bg-white hover:bg-[#fafaf9] text-[#1c1917] text-[15px] font-semibold border border-[#efeeed] shadow-xs flex items-center gap-2 transition-all hover:border-[#d6d3d1] cursor-pointer`}
              >
                <ShieldCheck size={16} className={`text-[#fe551b]`} />
                <span>{`See the coverage gate`}</span>
              </button>
            </div>
            <div
              className={`mt-10 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#a8a29e]`}
            >
              <span className={`w-5 h-[1px] bg-[#d6d3d1]`} />
              <span>{`One account + one buying need = one work item. No guessing. No spam.`}</span>
              <span className={`w-5 h-[1px] bg-[#d6d3d1]`} />
            </div>
            <div
              className={`mt-14 max-w-[960px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 text-left`}
            >
              <div
                className={`p-4.5 rounded-2xl bg-white border border-[#efeeed] shadow-xs`}
              >
                <div
                  className={`flex items-center gap-2 text-[#059669] text-xs font-bold uppercase tracking-wider mb-1`}
                >
                  <ShieldAlert size={14} />
                  {` Shield Reps From Dead Ends`}
                </div>
                <div
                  className={`text-xl font-bold text-[#1c1917]`}
                >{`Coverage 0 = Hard Hold`}</div>
                <p
                  className={`text-xs text-[#79716b] mt-1 leading-relaxed`}
                >{`Never ask your SDRs to cold-call an account just because an intern downloaded a PDF.`}</p>
              </div>
              <div
                className={`p-4.5 rounded-2xl bg-white border border-[#efeeed] shadow-xs`}
              >
                <div
                  className={`flex items-center gap-2 text-[#fe551b] text-xs font-bold uppercase tracking-wider mb-1`}
                >
                  <Flame size={14} />
                  {` Protect Brand Reputation`}
                </div>
                <div
                  className={`text-xl font-bold text-[#1c1917]`}
                >{`Consent Before Outreach`}</div>
                <p
                  className={`text-xs text-[#79716b] mt-1 leading-relaxed`}
                >{`Stop automated AI bots from blasting unconsented emails and burning Tier-1 domains.`}</p>
              </div>
              <div
                className={`p-4.5 rounded-2xl bg-white border border-[#efeeed] shadow-xs`}
              >
                <div
                  className={`flex items-center gap-2 text-[#1c1917] text-xs font-bold uppercase tracking-wider mb-1`}
                >
                  <HeartHandshake size={14} />
                  {` End the Blame Game`}
                </div>
                <div
                  className={`text-xl font-bold text-[#1c1917]`}
                >{`Explainable Arithmetic`}</div>
                <p
                  className={`text-xs text-[#79716b] mt-1 leading-relaxed`}
                >{`Fit 35%, decayed intent 40%, coverage 25%. A formula both Sales and Marketing defend.`}</p>
              </div>
            </div>
          </div>
        </section>
        <section id={`product`} className={`relative py-12 px-4 sm:px-6`}>
          <div className={`max-w-[1240px] mx-auto`}>
            <div
              className={`relative rounded-2xl p-1 bg-gradient-to-b from-[#efeeed] to-[#fafaf9] shadow-2xl border border-[#e7e5e4]`}
            >
              <div
                className={`bg-[#fcfcfb] rounded-t-xl px-4 py-3 border-b border-[#efeeed] flex items-center justify-between gap-4`}
              >
                <div className={`flex items-center gap-2`}>
                  <span
                    className={`w-3 h-3 rounded-full bg-[#ff5f56] inline-block shadow-xs`}
                  />
                  <span
                    className={`w-3 h-3 rounded-full bg-[#ffbd2e] inline-block shadow-xs`}
                  />
                  <span
                    className={`w-3 h-3 rounded-full bg-[#27c93f] inline-block shadow-xs`}
                  />
                </div>
                <div
                  className={`flex-1 max-w-[540px] mx-auto flex items-center justify-between px-3.5 py-1.5 rounded-lg bg-white border border-[#efeeed] text-xs text-[#79716b] shadow-xs`}
                >
                  <div className={`flex items-center gap-2`}>
                    <Search size={14} className={`text-[#a8a29e]`} />
                    <span>{`Search demand units, committees, scoring rules...`}</span>
                  </div>
                  <div className={`flex items-center gap-1`}>
                    <kbd
                      className={`px-1.5 py-0.5 rounded bg-[#f5f5f4] text-[10px] font-mono text-[#79716b] border border-[#e7e5e4]`}
                    >{`⌘K`}</kbd>
                  </div>
                </div>
                <div className={`flex items-center gap-2`}>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f0fdf4] text-[#166534] text-[11px] font-semibold border border-[#bbf7d0]`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-ping`}
                    />
                    {`Illustrative workspace preview`}
                  </span>
                </div>
              </div>
              <div
                className={`grid grid-cols-1 lg:grid-cols-12 min-h-[620px] bg-white rounded-b-xl overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-[#efeeed]`}
              >
                <aside
                  aria-label={`Demo accounts navigation`}
                  className={`lg:col-span-3 p-4 bg-[#fafaf9] text-xs flex flex-col justify-between`}
                >
                  <div className={`space-y-4`}>
                    <div
                      className={`flex items-center justify-between pb-3 border-b border-[#efeeed]`}
                    >
                      <div
                        className={`flex items-center gap-2 font-bold text-[#1c1917]`}
                      >
                        <DualMotionLogo className={`w-5 h-5`} />
                        <span>{`Workspace / Interactive example`}</span>
                      </div>
                      <span
                        className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#e7e5e4] text-[#57534d]`}
                      >{`Example`}</span>
                    </div>
                    <div>
                      <div
                        className={`text-[10px] font-bold uppercase tracking-wider text-[#a8a29e] mb-2 px-2`}
                      >{`Demand Units`}</div>
                      <div className={`space-y-1`}>
                        <button
                          type={`button`}
                          onClick={() => setSelectedDemoAccount(`northstar`)}
                          className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors ${selectedDemoAccount === `northstar` ? `bg-white text-[#1c1917] font-semibold shadow-xs border border-[#efeeed]` : `text-[#57534d] hover:bg-[#f5f5f4]`}`}
                        >
                          <div className={`truncate`}>
                            <div>{`Northstar Tech`}</div>
                            <div
                              className={`text-[11px] font-normal text-[#79716b]`}
                            >{`Cloud Security`}</div>
                          </div>
                          <span
                            className={`font-mono text-[11px] text-[#fe551b] font-semibold`}
                          >
                            {(86 * .35 + 78 * .4 + (hasCoverage ? 60 : 0) * .25).toFixed(1)}
                          </span>
                        </button>
                        <button
                          type={`button`}
                          onClick={() => setSelectedDemoAccount(`datadog`)}
                          className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors ${selectedDemoAccount === `datadog` ? `bg-white text-[#1c1917] font-semibold shadow-xs border border-[#efeeed]` : `text-[#57534d] hover:bg-[#f5f5f4]`}`}
                        >
                          <div className={`truncate`}>
                            <div>{`Datadog Inc`}</div>
                            <div
                              className={`text-[11px] font-normal text-[#79716b]`}
                            >{`Realtime APM`}</div>
                          </div>
                          <span
                            className={`font-mono text-[11px] text-[#57534d]`}
                          >{(92 * .35 + 84 * .4 + (hasCoverage ? 75 : 0) * .25).toFixed(1)}</span>
                        </button>
                        <button
                          type={`button`}
                          onClick={() => setSelectedDemoAccount(`figma`)}
                          className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors ${selectedDemoAccount === `figma` ? `bg-white text-[#1c1917] font-semibold shadow-xs border border-[#efeeed]` : `text-[#57534d] hover:bg-[#f5f5f4]`}`}
                        >
                          <div className={`truncate`}>
                            <div>{`Figma Design`}</div>
                            <div
                              className={`text-[11px] font-normal text-[#79716b]`}
                            >{`Design Governance`}</div>
                          </div>
                          <span
                            className={`font-mono text-[11px] text-[#57534d]`}
                          >{(89 * .35 + 68 * .4 + (hasCoverage ? 50 : 0) * .25).toFixed(1)}</span>
                        </button>
                      </div>
                    </div>
                    <div>
                      <div
                        className={`text-[10px] font-bold uppercase tracking-wider text-[#a8a29e] mb-2 px-2`}
                      >{`Control & Safety`}</div>
                      <div className={`space-y-1`}>
                        <button
                          type={`button`}
                          onClick={() => navigate(`AUTOMATION`)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-[#57534d] hover:bg-[#f5f5f4]`}
                        >
                          <span className={`flex items-center gap-2`}>
                            <Bot size={13} className={`text-[#fe551b]`} />
                            {`Decision inbox`}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full bg-[#fe551b]/10 text-[#fe551b] font-semibold text-[10px]`}
                          >{`3`}</span>
                        </button>
                        <button
                          type={`button`}
                          onClick={() => navigate(`RULES`)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-[#57534d] hover:bg-[#f5f5f4]`}
                        >
                          <span className={`flex items-center gap-2`}>
                            <ShieldCheck
                              size={13}
                              className={`text-[#1c1917]`}
                            />
                            {`Coverage Gate Rule`}
                          </span>
                          <span
                            className={`text-[10px] text-[#166534] font-medium`}
                          >{`Active`}</span>
                        </button>
                        <button
                          type={`button`}
                          onClick={() => navigate(`CONNECTORS`)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-[#57534d] hover:bg-[#f5f5f4]`}
                        >
                          <span className={`flex items-center gap-2`}>
                            <Zap size={13} className={`text-[#fe551b]`} />
                            {`Marketo connection`}
                          </span>
                          <span
                            className={`w-2 h-2 rounded-full bg-emerald-500`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className={`pt-4 border-t border-[#efeeed]`}>
                    <button
                      type={`button`}
                      onClick={() => navigate(`OVERVIEW`)}
                      className={`w-full py-2 px-3 rounded-lg bg-white border border-[#efeeed] hover:border-[#d6d3d1] text-[#1c1917] font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all`}
                    >
                      <span>{`Open in console`}</span>
                      <ArrowUpRight size={13} />
                    </button>
                  </div>
                </aside>
                <div
                  className={`lg:col-span-5 p-6 bg-white flex flex-col justify-between`}
                >
                  <div>
                    <div
                      className={`flex items-center gap-1.5 text-xs text-[#a8a29e] mb-3`}
                    >
                      <span>{`Demand Units`}</span>
                      <ChevronRight size={12} />
                      <span className={`text-[#57534d] font-medium`}>
                        {demoAccount.account}
                      </span>
                      <ChevronRight size={12} />
                      <span className={`text-[#1c1917] font-semibold`}>
                        {demoAccount.need}
                      </span>
                    </div>
                    <div
                      className={`flex items-start justify-between gap-4 mb-6`}
                    >
                      <div>
                        <h3
                          className={`text-xl font-bold text-[#1c1917] tracking-tight`}
                        >
                          {demoAccount.account}
                        </h3>
                        <p className={`text-xs text-[#79716b] mt-0.5`}>
                          {demoAccount.domain}
                          {` · `}
                          {demoAccount.tier}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${hasCoverage ? `bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]` : `bg-[#fff7ed] text-[#9a3412] border border-[#fed7aa]`}`}
                      >
                        {hasCoverage ? (
                          <T.Fragment>
                            <span
                              className={`w-2 h-2 rounded-full bg-[#10b981]`}
                            />
                            {`Sales Lane · 4h SLA Active`}
                          </T.Fragment>
                        ) : (
                          <T.Fragment>
                            <LockKeyhole
                              size={13}
                              className={`text-[#ea580c]`}
                            />
                            {`On Hold · Protecting Account`}
                          </T.Fragment>
                        )}
                      </span>
                    </div>
                    <div
                      className={`p-5 rounded-xl bg-[#fafaf9] border border-[#efeeed] mb-5`}
                    >
                      <div
                        className={`flex items-center justify-between text-xs text-[#79716b] font-semibold mb-2`}
                      >
                        <span
                          className={`uppercase tracking-wider`}
                        >{`Composite Priority Score`}</span>
                        <span
                          className={`font-mono text-[#1c1917]`}
                        >{`fit×0.35 + intent×0.40 + cov×0.25`}</span>
                      </div>
                      <div className={`flex items-baseline gap-2 mb-3`}>
                        <span
                          className={`text-5xl font-extrabold tracking-tight text-[#1c1917] font-mono transition-all`}
                        >
                          {compositeScore}
                        </span>
                        <span
                          className={`text-sm text-[#a8a29e] font-mono`}
                        >{`/ 100`}</span>
                      </div>
                      <div
                        className={`w-full h-2 rounded-full bg-[#e7e5e4] overflow-hidden mb-4`}
                      >
                        <div
                          className={`h-full bg-gradient-to-r from-[#fe551b] to-[#ea580c] transition-all duration-500 rounded-full`}
                          style={{
                            width: `${Math.min(100, Math.max(0, Number(compositeScore)))}%`,
                          }}
                        />
                      </div>
                      <div
                        className={`grid grid-cols-3 gap-2 pt-3 border-t border-[#e7e5e4]/70 text-center`}
                      >
                        <div
                          className={`p-2 rounded-lg bg-white border border-[#efeeed]`}
                        >
                          <div
                            className={`text-[11px] text-[#79716b]`}
                          >{`Account Fit`}</div>
                          <div
                            className={`text-sm font-bold text-[#1c1917] font-mono`}
                          >
                            {fitScore}
                          </div>
                          <div
                            className={`text-[10px] text-[#a8a29e]`}
                          >{`× 35%`}</div>
                        </div>
                        <div
                          className={`p-2 rounded-lg bg-white border border-[#efeeed]`}
                        >
                          <div
                            className={`text-[11px] text-[#79716b]`}
                          >{`Buying Intent`}</div>
                          <div
                            className={`text-sm font-bold text-[#1c1917] font-mono`}
                          >
                            {intentScore}
                          </div>
                          <div
                            className={`text-[10px] text-[#a8a29e]`}
                          >{`× 40%`}</div>
                        </div>
                        <div
                          className={`p-2 rounded-lg border transition-colors ${hasCoverage ? `bg-white border-[#efeeed]` : `bg-[#fff1ec] border-[#fed7aa]`}`}
                        >
                          <div
                            className={`text-[11px] text-[#79716b]`}
                          >{`Coverage`}</div>
                          <div
                            className={`text-sm font-bold font-mono ${hasCoverage ? `text-[#1c1917]` : `text-[#ea580c]`}`}
                          >
                            {coverageScore}
                          </div>
                          <div
                            className={`text-[10px] text-[#a8a29e]`}
                          >{`× 25%`}</div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div
                        className={`text-xs font-bold uppercase tracking-wider text-[#79716b] mb-2.5 flex items-center justify-between`}
                      >
                        <span>
                          {`Buying Group (`}
                          {demoAccount.roles.length}
                          {` Identified)`}
                        </span>
                        <span
                          className={`text-[11px] font-normal text-[#059669] flex items-center gap-1`}
                        >
                          <CircleCheckBig size={12} />
                          {` Consent Logged`}
                        </span>
                      </div>
                      <div className={`space-y-2`}>
                        {demoAccount.roles.map((e, n) => (
                          <div
                            className={`p-2.5 rounded-lg border border-[#efeeed] bg-white flex items-center justify-between gap-3 text-xs`}
                            key={n}
                          >
                            <div className={`flex items-center gap-2.5`}>
                              <div
                                className={`w-7 h-7 rounded-full bg-[#f5f5f4] text-[#57534d] font-bold flex items-center justify-center text-[11px]`}
                              >
                                {e.name.charAt(0)}
                              </div>
                              <div>
                                <div className={`font-semibold text-[#1c1917]`}>
                                  {e.name}
                                </div>
                                <div className={`text-[11px] text-[#79716b]`}>
                                  {e.role}
                                </div>
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-medium ${hasCoverage || n < 2 ? `bg-[#ecfdf5] text-[#065f46]` : `bg-[#fff7ed] text-[#c2410c]`}`}
                            >
                              {hasCoverage || n < 2
                                ? `Verified`
                                : `Unconfirmed`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`mt-6 pt-4 border-t border-[#efeeed] flex items-center justify-between gap-3 bg-[#fafaf9] p-3 rounded-xl border`}
                  >
                    <div>
                      <div
                        className={`text-xs font-bold text-[#1c1917]`}
                      >{`Coverage Gate Simulator`}</div>
                      <div
                        className={`text-[11px] text-[#79716b]`}
                      >{`Experience how one verified person changes the entire route.`}</div>
                    </div>
                    <div
                      className={`flex items-center gap-1 bg-[#e7e5e4] p-1 rounded-lg`}
                    >
                      <button
                        type={`button`}
                        onClick={() => setHasCoverage(!0)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${hasCoverage ? `bg-white text-[#1c1917] shadow-xs` : `text-[#79716b] hover:text-[#1c1917]`}`}
                      >{`Verified (Pass)`}</button>
                      <button
                        type={`button`}
                        onClick={() => setHasCoverage(!1)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${hasCoverage ? `text-[#79716b] hover:text-[#1c1917]` : `bg-[#fe551b] text-white shadow-xs`}`}
                      >{`Missing (Hold)`}</button>
                    </div>
                  </div>
                </div>
                <div
                  className={`lg:col-span-4 p-6 bg-[#fafaf9] flex flex-col justify-between`}
                >
                  <div>
                    <span
                      className={`text-xs font-semibold tracking-wide text-[#fe551b]`}
                    >{`ILLUSTRATIVE DECISION TRACE`}</span>
                    <h3
                      className={`text-xl font-semibold mt-4`}
                    >{`Evidence becomes an operating decision.`}</h3>
                    <p
                      className={`text-sm text-[#57534d] leading-6 mt-3`}
                    >{`This interactive example demonstrates the product policy. Your workspace records actual scores, Decision evaluations, and provider outcomes separately.`}</p>
                    <ol className={`mt-6 space-y-5`}>
                      {[
                        [
                          `Score the demand`,
                          `Fit ${fitScore}, intent ${intentScore}, coverage ${coverageScore}. Composite ${compositeScore}.`,
                        ],
                        [
                          `Check verified coverage`,
                          hasCoverage
                            ? `Verified buying-group evidence allows the decision to be considered.`
                            : `Coverage is zero. Sales activation and the 4-hour SLA are blocked.`,
                        ],
                        [
                          `Choose the next action`,
                          hasCoverage
                            ? `The workspace evaluates evidence and selects an eligible next action.`
                            : `Hold activation and verify first-party roles and consent.`,
                        ],
                        [
                          `Apply product gates`,
                          `Consent, decision freshness, provider readiness, and approved destination mappings are checked before execution.`,
                        ],
                      ].map(([e, t], n) => (
                        <li className={`flex gap-3`} key={e}>
                          <span
                            className={`w-7 h-7 shrink-0 rounded-full bg-white border border-[#e7e1da] flex items-center justify-center text-xs font-semibold`}
                          >
                            {n + 1}
                          </span>
                          <div>
                            <strong className={`text-sm`}>{e}</strong>
                            <p
                              className={`text-xs leading-5 text-[#57534d] mt-1`}
                            >
                              {t}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <button
                    className={`mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-[#1c1917] text-white px-4 py-3 text-sm font-medium`}
                    onClick={() => onNavigateTab(`OVERVIEW`)}
                  >
                    {`Inspect your workspace `}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
            <p
              className={`mt-4 text-center text-xs text-[#a8a29e]`}
            >{`Illustrative accounts and contacts, not customer endorsements. Try toggling the coverage gate. Notice how the entire operating route and SLA change when you protect your sales reps from zero-coverage accounts.`}</p>
          </div>
        </section>
        <section
          id={`empathy-reality`}
          className={`py-24 bg-[#fafaf9] border-y border-[#efeeed]`}
        >
          <div className={`max-w-[1240px] mx-auto px-6`}>
            <div className={`text-center max-w-[780px] mx-auto mb-16`}>
              <span
                className={`text-xs font-bold uppercase tracking-widest text-[#fe551b]`}
              >{`The Human Cost of Noise`}</span>
              <h2
                className={`text-3xl sm:text-5xl font-bold tracking-tight text-[#1c1917] mt-3`}
              >{`The Monday morning pipeline argument ends here.`}</h2>
              <p
                className={`mt-4 text-lg text-[#57534d] leading-relaxed`}
              >{`When tools celebrate "more intent", reps drown in dead ends and accounts get burned. Here is what happens when you introduce coverage guardrails.`}</p>
            </div>
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-8`}>
              <div
                className={`p-8 sm:p-10 rounded-3xl bg-white border border-[#fca5a5]/40 shadow-xs relative overflow-hidden`}
              >
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fef2f2] text-[#991b1b] text-xs font-semibold mb-6`}
                >
                  <Flame size={13} />
                  {` The Status Quo · The Intent Trap`}
                </div>
                <h3
                  className={`text-2xl font-bold text-[#1c1917] mb-4`}
                >{`Anxious, chaotic, and resentful`}</h3>
                <ul className={`space-y-4 text-sm text-[#57534d]`}>
                  <li className={`flex items-start gap-3`}>
                    <span
                      className={`w-5 h-5 rounded-full bg-[#fef2f2] text-[#991b1b] flex items-center justify-center font-bold text-xs mt-0.5`}
                    >{`✕`}</span>
                    <span>
                      <strong>{`Phantom intent triggers fire drills:`}</strong>
                      {` An intern downloads an ebook. Intent dashboard shows +90 surge. SDR is pressured to dial immediately.`}
                    </span>
                  </li>
                  <li className={`flex items-start gap-3`}>
                    <span
                      className={`w-5 h-5 rounded-full bg-[#fef2f2] text-[#991b1b] flex items-center justify-center font-bold text-xs mt-0.5`}
                    >{`✕`}</span>
                    <span>
                      <strong>{`AI bots burn enterprise relationships:`}</strong>
                      {` Automated sequences blast 15 cold emails to the CISO, triggering spam blocks on Tier-1 target accounts.`}
                    </span>
                  </li>
                  <li className={`flex items-start gap-3`}>
                    <span
                      className={`w-5 h-5 rounded-full bg-[#fef2f2] text-[#991b1b] flex items-center justify-center font-bold text-xs mt-0.5`}
                    >{`✕`}</span>
                    <span>
                      <strong>{`The endless blame game:`}</strong>
                      {` Sales says `}
                      <em>{`"Marketing sends us garbage."`}</em>
                      {` Marketing says `}
                      <em>{`"Sales ignores our leads."`}</em>
                      {` Morale tanks.`}
                    </span>
                  </li>
                </ul>
              </div>
              <div
                className={`p-8 sm:p-10 rounded-3xl bg-white border border-[#a7f3d0] shadow-md relative overflow-hidden`}
              >
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ecfdf5] text-[#065f46] text-xs font-semibold mb-6`}
                >
                  <ShieldCheck size={13} />
                  {` The Dual Motion Way · Guarded Momentum`}
                </div>
                <h3
                  className={`text-2xl font-bold text-[#1c1917] mb-4`}
                >{`Calm, defensible, and dignified`}</h3>
                <ul className={`space-y-4 text-sm text-[#57534d]`}>
                  <li className={`flex items-start gap-3`}>
                    <span
                      className={`w-5 h-5 rounded-full bg-[#ecfdf5] text-[#065f46] flex items-center justify-center font-bold text-xs mt-0.5`}
                    >{`✓`}</span>
                    <span>
                      <strong>{`Zero coverage holds the sales lane:`}</strong>
                      {` Intent without verified buying-group coverage stays on hold. Reps are never sent into accounts blind.`}
                    </span>
                  </li>
                  <li className={`flex items-start gap-3`}>
                    <span
                      className={`w-5 h-5 rounded-full bg-[#ecfdf5] text-[#065f46] flex items-center justify-center font-bold text-xs mt-0.5`}
                    >{`✓`}</span>
                    <span>
                      <strong>{`Every sales handoff has a face:`}</strong>
                      {` When a unit reaches the Sales Lane, your rep receives verified personas with explicit consent and exact intent topics.`}
                    </span>
                  </li>
                  <li className={`flex items-start gap-3`}>
                    <span
                      className={`w-5 h-5 rounded-full bg-[#ecfdf5] text-[#065f46] flex items-center justify-center font-bold text-xs mt-0.5`}
                    >{`✓`}</span>
                    <span>
                      <strong>{`Shared mathematical truth:`}</strong>
                      {` Fit (35%), decayed intent (40%), and coverage (25%) are logged in product code. No black-box secrets.`}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
        <section id={`guardrails`} className={`py-24`}>
          <div className={`max-w-[1240px] mx-auto px-6`}>
            <div className={`max-w-[760px] mb-14`}>
              <span
                className={`text-xs font-bold uppercase tracking-widest text-[#fe551b]`}
              >{`Deterministic Decisioning`}</span>
              <h2
                className={`text-3xl sm:text-5xl font-bold tracking-tight text-[#1c1917] mt-3`}
              >{`Automation should know when to stop.`}</h2>
              <p
                className={`mt-5 text-lg text-[#57534d] leading-relaxed`}
              >{`A priority score is not a purchase guarantee. Dual Motion keeps the arithmetic and safety boundaries in product code, while automated evaluation selects the operational next move.`}</p>
            </div>
            <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6`}>
              <div
                className={`p-7 rounded-2xl bg-[#fafaf9] border border-[#efeeed] shadow-xs flex flex-col justify-between hover:border-[#d6d3d1] transition-all`}
              >
                <div>
                  <div
                    className={`w-10 h-10 rounded-xl bg-white border border-[#efeeed] text-[#1c1917] flex items-center justify-center font-bold text-sm mb-5`}
                  >{`01`}</div>
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ecfdf5] text-[#065f46] text-xs font-semibold mb-3`}
                  >
                    <Check size={12} />
                    {` Fit Gate`}
                  </div>
                  <h3
                    className={`text-xl font-bold text-[#1c1917]`}
                  >{`Account Fit Verification`}</h3>
                  <p
                    className={`text-sm text-[#57534d] mt-2.5 leading-relaxed`}
                  >{`Evaluates ICP firmographics, annual revenue, and employee count. Configured fit thresholds help decide which operating lane is eligible.`}</p>
                </div>
                <div
                  className={`mt-6 pt-4 border-t border-[#e7e5e4] text-xs font-mono text-[#79716b]`}
                >{`Weight: 35% · Firmographic Qualification`}</div>
              </div>
              <div
                className={`p-7 rounded-2xl bg-[#fafaf9] border border-[#efeeed] shadow-xs flex flex-col justify-between hover:border-[#d6d3d1] transition-all`}
              >
                <div>
                  <div
                    className={`w-10 h-10 rounded-xl bg-white border border-[#efeeed] text-[#fe551b] flex items-center justify-center font-bold text-sm mb-5`}
                  >{`02`}</div>
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ecfdf5] text-[#065f46] text-xs font-semibold mb-3`}
                  >
                    <Check size={12} />
                    {` Intent Gate`}
                  </div>
                  <h3
                    className={`text-xl font-bold text-[#1c1917]`}
                  >{`Time-Decayed Intent Engine`}</h3>
                  <p
                    className={`text-sm text-[#57534d] mt-2.5 leading-relaxed`}
                  >{`Applies configured activity weights, caps, bot filtering, and half-life decay to recorded signals. Unsupported sources need a connector before they provide live evidence.`}</p>
                </div>
                <div
                  className={`mt-6 pt-4 border-t border-[#e7e5e4] text-xs font-mono text-[#79716b]`}
                >{`Weight: 40% · Configurable half-life`}</div>
              </div>
              <div
                className={`p-7 rounded-2xl bg-[#fafaf9] border border-[#efeeed] shadow-xs flex flex-col justify-between hover:border-[#d6d3d1] transition-all relative overflow-hidden`}
              >
                <div
                  className={`absolute top-0 right-0 w-24 h-24 bg-[#fe551b]/5 rounded-bl-full pointer-events-none`}
                />
                <div>
                  <div
                    className={`w-10 h-10 rounded-xl bg-[#fff1ec] border border-[#fed7aa] text-[#fe551b] flex items-center justify-center font-bold text-sm mb-5`}
                  >{`03`}</div>
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#fff7ed] text-[#c2410c] text-xs font-semibold mb-3`}
                  >
                    <ShieldCheck size={12} />
                    {` Hard Safety Gate`}
                  </div>
                  <h3
                    className={`text-xl font-bold text-[#1c1917]`}
                  >{`Zero-Coverage Hard Block`}</h3>
                  <p
                    className={`text-sm text-[#57534d] mt-2.5 leading-relaxed`}
                  >{`Zero verified buying committee members hard-blocks A1, Engaged, 4-hour SLA routing, and persona discovery. Reps are never forced to cold-call ghosts.`}</p>
                </div>
                <div
                  className={`mt-6 pt-4 border-t border-[#e7e5e4] text-xs font-mono text-[#fe551b] font-semibold`}
                >{`Rule: Coverage 0 = Hard Hold Enforced`}</div>
              </div>
            </div>
          </div>
        </section>
        <section
          id={`features-bento`}
          className={`py-24 bg-[#fafaf9] border-t border-[#efeeed]`}
        >
          <div className={`max-w-[1240px] mx-auto px-6`}>
            <div className={`text-center max-w-[780px] mx-auto mb-16`}>
              <span
                className={`text-xs font-bold uppercase tracking-widest text-[#fe551b]`}
              >{`Core Architecture`}</span>
              <h2
                className={`text-3xl sm:text-5xl font-bold tracking-tight text-[#1c1917] mt-3`}
              >{`A system built for decision clarity, not just raw telemetry.`}</h2>
              <p
                className={`mt-4 text-lg text-[#57534d]`}
              >{`Lead scores and vanity metrics flood dashboards. Dual Motion gives your revenue operations deterministic decisions with mathematically verifiable evidence.`}</p>
            </div>
            <div className={`grid grid-cols-1 md:grid-cols-12 gap-6`}>
              <div
                className={`md:col-span-7 p-8 rounded-3xl bg-white border border-[#efeeed] hover:border-[#d6d3d1] transition-all flex flex-col justify-between`}
              >
                <div>
                  <div className={`flex items-center justify-between mb-4`}>
                    <span
                      className={`text-xs font-bold uppercase tracking-wider text-[#fe551b] flex items-center gap-1.5`}
                    >
                      <Workflow size={14} />
                      {` Bi-Directional Pipeline`}
                    </span>
                    <span
                      className={`text-xs font-mono text-[#79716b]`}
                    >{`Adobe Swagger-MAPI`}</span>
                  </div>
                  <h3
                    className={`text-2xl font-bold text-[#1c1917]`}
                  >{`Sync your revenue stack like code`}</h3>
                  <p
                    className={`text-[#57534d] text-sm mt-2 max-w-[480px]`}
                  >{`Marketo Engage is the first implemented connector. Salesforce, Google Ads, LinkedIn Ads, and other destinations are planned. Live execution requires verified credentials and mappings.`}</p>
                </div>
                <div className={`mt-8 space-y-2 font-mono text-xs`}>
                  <div
                    className={`p-3 rounded-xl bg-[#fafaf9] border border-[#efeeed] shadow-xs flex items-center justify-between`}
                  >
                    <div className={`flex items-center gap-2 text-[#1c1917]`}>
                      <span className={`w-2 h-2 rounded-full bg-emerald-500`} />
                      <span>{`marketo.lead.activity`}</span>
                      <span
                        className={`text-[#79716b] text-[11px]`}
                      >{`northstar.tech / security_briefing`}</span>
                    </div>
                    <span
                      className={`text-[#059669] font-bold`}
                    >{`200 OK`}</span>
                  </div>
                  <div
                    className={`p-3 rounded-xl bg-[#fafaf9] border border-[#efeeed] shadow-xs flex items-center justify-between`}
                  >
                    <div className={`flex items-center gap-2 text-[#1c1917]`}>
                      <span className={`w-2 h-2 rounded-full bg-emerald-500`} />
                      <span>{`sfdc.account.sync`}</span>
                      <span
                        className={`text-[#79716b] text-[11px]`}
                      >{`buying_group_mapped: 3 members`}</span>
                    </div>
                    <span
                      className={`text-[#059669] font-bold`}
                    >{`200 OK`}</span>
                  </div>
                </div>
              </div>
              <div
                className={`md:col-span-5 p-8 rounded-3xl bg-white border border-[#efeeed] hover:border-[#d6d3d1] transition-all flex flex-col justify-between`}
              >
                <div>
                  <span
                    className={`text-xs font-bold uppercase tracking-wider text-[#1c1917] flex items-center gap-1.5 mb-4`}
                  >
                    <Users size={14} />
                    {` Persona Verification`}
                  </span>
                  <h3
                    className={`text-2xl font-bold text-[#1c1917]`}
                  >{`Verify the buying group before activation`}</h3>
                  <p
                    className={`text-[#57534d] text-sm mt-2`}
                  >{`Coverage uses verified roles, permitted contacts, and recent engagement. Unverified or stale members do not open the coverage gate.`}</p>
                </div>
                <div
                  className={`mt-8 p-4 rounded-xl bg-[#fafaf9] border border-[#efeeed] shadow-xs`}
                >
                  <div
                    className={`flex items-center justify-between text-xs mb-2`}
                  >
                    <span
                      className={`font-semibold text-[#1c1917]`}
                    >{`Example coverage`}</span>
                    <span
                      className={`font-mono text-emerald-600 font-bold`}
                    >{`60%`}</span>
                  </div>
                  <div
                    className={`w-full h-2 rounded-full bg-[#e7e5e4] overflow-hidden`}
                  >
                    <div
                      className={`w-[60%] h-full bg-emerald-500 rounded-full`}
                    />
                  </div>
                  <div
                    className={`mt-3 text-[11px] text-[#79716b] flex items-center justify-between`}
                  >
                    <span>{`3 Verified Roles`}</span>
                    <span
                      className={`text-emerald-700 font-medium`}
                    >{`Consent Active`}</span>
                  </div>
                </div>
              </div>
              <div
                className={`md:col-span-5 p-8 rounded-3xl bg-white border border-[#efeeed] hover:border-[#d6d3d1] transition-all flex flex-col justify-between`}
              >
                <div>
                  <span
                    className={`text-xs font-bold uppercase tracking-wider text-[#fe551b] flex items-center gap-1.5 mb-4`}
                  >
                    <Bot size={14} />
                    {` Autonomous Decisioning`}
                  </span>
                  <h3
                    className={`text-2xl font-bold text-[#1c1917]`}
                  >{`Decision automation`}</h3>
                  <p
                    className={`text-[#57534d] text-sm mt-2`}
                  >{`Select an eligible next action from recorded evidence. Scoring rules, coverage, consent and destination checks govern execution.`}</p>
                </div>
                <div
                  className={`mt-8 p-4 rounded-xl bg-[#fafaf9] border border-[#efeeed] shadow-xs space-y-2 text-xs`}
                >
                  <div className={`flex items-center justify-between`}>
                    <span
                      className={`text-[#79716b]`}
                    >{`Operating Route:`}</span>
                    <span
                      className={`font-semibold text-[#059669]`}
                    >{`SALES_LANE`}</span>
                  </div>
                  <div className={`flex items-center justify-between`}>
                    <span
                      className={`text-[#79716b]`}
                    >{`SLA Enforcement:`}</span>
                    <span
                      className={`font-semibold text-[#1c1917]`}
                    >{`Policy-dependent deadline`}</span>
                  </div>
                  <div className={`flex items-center justify-between`}>
                    <span
                      className={`text-[#79716b]`}
                    >{`Decision evidence:`}</span>
                    <span
                      className={`font-semibold text-[#1c1917]`}
                    >{`Recorded per evaluation`}</span>
                  </div>
                </div>
              </div>
              <div
                className={`md:col-span-7 p-8 rounded-3xl bg-white border border-[#efeeed] hover:border-[#d6d3d1] transition-all flex flex-col justify-between`}
              >
                <div>
                  <div className={`flex items-center justify-between mb-4`}>
                    <span
                      className={`text-xs font-bold uppercase tracking-wider text-[#1c1917] flex items-center gap-1.5`}
                    >
                      <SlidersVertical size={14} />
                      {` Interactive Scoring Weights`}
                    </span>
                    <span
                      className={`text-xs font-mono text-[#fe551b] font-semibold`}
                    >{`Try Adjusting Weights`}</span>
                  </div>
                  <h3
                    className={`text-2xl font-bold text-[#1c1917]`}
                  >{`Transparent evidence behind every action`}</h3>
                  <p
                    className={`text-[#57534d] text-sm mt-2 max-w-[480px]`}
                  >{`Inspect the arithmetic. Adjust weighting across Account Fit, Buying Intent, and Group Coverage and see real-time recalculation.`}</p>
                </div>
                <div
                  className={`mt-8 p-5 rounded-2xl bg-[#fafaf9] border border-[#efeeed] shadow-xs space-y-4`}
                >
                  <div>
                    <div
                      className={`flex items-center justify-between text-xs font-semibold mb-1`}
                    >
                      <span
                        className={`text-[#1c1917]`}
                      >{`Account Fit Weight`}</span>
                      <span className={`font-mono text-[#fe551b]`}>
                        {(fitWeight * 100).toFixed(0)}
                        {`%`}
                      </span>
                    </div>
                    <input
                      type={`range`}
                      min={`0.1`}
                      max={`0.6`}
                      step={`0.05`}
                      value={fitWeight}
                      onChange={(e) => setFitWeight(parseFloat(e.target.value))}
                      className={`w-full accent-[#fe551b] cursor-pointer`}
                    />
                  </div>
                  <div>
                    <div
                      className={`flex items-center justify-between text-xs font-semibold mb-1`}
                    >
                      <span
                        className={`text-[#1c1917]`}
                      >{`Buying Intent Weight`}</span>
                      <span className={`font-mono text-[#fe551b]`}>
                        {(intentWeight * 100).toFixed(0)}
                        {`%`}
                      </span>
                    </div>
                    <input
                      type={`range`}
                      min={`0.1`}
                      max={`0.6`}
                      step={`0.05`}
                      value={intentWeight}
                      onChange={(e) =>
                        setIntentWeight(parseFloat(e.target.value))
                      }
                      className={`w-full accent-[#fe551b] cursor-pointer`}
                    />
                  </div>
                  <div>
                    <div
                      className={`flex items-center justify-between text-xs font-semibold mb-1`}
                    >
                      <span
                        className={`text-[#1c1917]`}
                      >{`Committee Coverage Weight`}</span>
                      <span className={`font-mono text-[#fe551b]`}>
                        {(coverageWeight * 100).toFixed(0)}
                        {`%`}
                      </span>
                    </div>
                    <input
                      type={`range`}
                      min={`0.1`}
                      max={`0.6`}
                      step={`0.05`}
                      value={coverageWeight}
                      onChange={(e) =>
                        setCoverageWeight(parseFloat(e.target.value))
                      }
                      className={`w-full accent-[#fe551b] cursor-pointer`}
                    />
                  </div>
                  <div
                    className={`pt-3 border-t border-[#efeeed] flex items-center justify-between text-xs font-mono`}
                  >
                    <span
                      className={`text-[#79716b]`}
                    >{`Normalized example score:`}</span>
                    <span className={`text-base font-bold text-[#1c1917]`}>
                      {configuredScore}
                      {` / 100`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section id={`mcp-section`} className={`py-24`}>
          <div className={`max-w-[1240px] mx-auto px-6`}>
            <div
              className={`grid grid-cols-1 lg:grid-cols-12 gap-12 items-center`}
            >
              <div className={`lg:col-span-5 space-y-6`}>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fff1ec] text-[#fe551b] text-xs font-semibold border border-[#fed7aa]`}
                >
                  <Workflow size={13} />
                  {` Model Context Protocol`}
                </span>
                <h2
                  className={`text-3xl sm:text-5xl font-bold tracking-tight text-[#1c1917] leading-tight`}
                >{`Connect Dual Motion to Claude, Cursor, and your agent fleet.`}</h2>
                <p className={`text-base text-[#57534d] leading-relaxed`}>
                  {`Dual Motion exposes authenticated `}
                  <code
                    className={`font-mono bg-[#e7e5e4] px-1 py-0.5 rounded text-xs text-[#1c1917]`}
                  >{`dm_*`}</code>
                  {` tools via the product MCP endpoint. Authorized agents can inspect demand units and use tenant-scoped tools. Every operation stays within workspace permissions and records its result.`}
                </p>
                <div className={`space-y-3 pt-2`}>
                  <div
                    className={`flex items-center gap-3 text-sm text-[#44403c]`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-[#ecfdf5] text-[#065f46] flex items-center justify-center`}
                    >
                      <Check size={13} />
                    </div>
                    <span>{`Native tools for Claude Desktop, Cursor, and Windsurf`}</span>
                  </div>
                  <div
                    className={`flex items-center gap-3 text-sm text-[#44403c]`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-[#ecfdf5] text-[#065f46] flex items-center justify-center`}
                    >
                      <Check size={13} />
                    </div>
                    <span>{`Secret-safe authentication with permission guardrails`}</span>
                  </div>
                  <div
                    className={`flex items-center gap-3 text-sm text-[#44403c]`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-[#ecfdf5] text-[#065f46] flex items-center justify-center`}
                    >
                      <Check size={13} />
                    </div>
                    <span>{`Full mathematical trace returned in every tool call`}</span>
                  </div>
                </div>
                <div className={`pt-2`}>
                  <button
                    type={`button`}
                    onClick={() => navigate(`OVERVIEW`)}
                    className={`h-11 px-5 rounded-full bg-[#1c1917] hover:bg-[#2d2926] text-white text-sm font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer`}
                  >
                    <span>{`Inspect product tools`}</span>
                    <ArrowUpRight size={15} />
                  </button>
                </div>
              </div>
              <div className={`lg:col-span-7`}>
                <div
                  className={`rounded-2xl bg-[#0f172a] text-slate-100 shadow-2xl border border-slate-800 overflow-hidden`}
                >
                  <div
                    className={`px-4 py-3 bg-[#0a0f1d] border-b border-slate-800 flex items-center justify-between`}
                  >
                    <div className={`flex items-center gap-2`}>
                      <button
                        type={`button`}
                        onClick={() => setActiveMcpTab(`cursor`)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${activeMcpTab === `cursor` ? `bg-slate-800 text-white` : `text-slate-400 hover:text-slate-200`}`}
                      >{`Cursor`}</button>
                      <button
                        type={`button`}
                        onClick={() => setActiveMcpTab(`claude`)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${activeMcpTab === `claude` ? `bg-slate-800 text-white` : `text-slate-400 hover:text-slate-200`}`}
                      >{`Claude Desktop`}</button>
                      <button
                        type={`button`}
                        onClick={() => setActiveMcpTab(`python`)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${activeMcpTab === `python` ? `bg-slate-800 text-white` : `text-slate-400 hover:text-slate-200`}`}
                      >{`Python HTTP`}</button>
                      <button
                        type={`button`}
                        onClick={() => setActiveMcpTab(`curl`)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${activeMcpTab === `curl` ? `bg-slate-800 text-white` : `text-slate-400 hover:text-slate-200`}`}
                      >{`cURL API`}</button>
                    </div>
                    <button
                      type={`button`}
                      onClick={() => copyCode(mcpExamples[activeMcpTab])}
                      className={`px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors cursor-pointer`}
                    >
                      {codeCopied ? (
                        <T.Fragment>
                          <Check size={13} className={`text-emerald-400`} />
                          <span
                            className={`text-emerald-400`}
                          >{`Copied!`}</span>
                        </T.Fragment>
                      ) : (
                        <T.Fragment>
                          <Copy size={13} />
                          <span>{`Copy`}</span>
                        </T.Fragment>
                      )}
                    </button>
                  </div>
                  <div
                    className={`p-5 font-mono text-xs overflow-x-auto leading-relaxed text-slate-300`}
                  >
                    <pre>
                      <code>{mcpExamples[activeMcpTab]}</code>
                    </pre>
                  </div>
                  <div
                    className={`px-5 py-2.5 bg-[#0a0f1d] border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono`}
                  >
                    <span>{`Protocol: MCP 2024-11-05`}</span>
                    <span
                      className={`text-emerald-400`}
                    >{`Authenticated dm_* product tools`}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className={`py-20 bg-[#fafaf9] border-t border-[#efeeed]`}>
          <div className={`max-w-[1000px] mx-auto px-6`}>
            <div
              className={`p-10 sm:p-14 rounded-3xl bg-white border border-[#efeeed] shadow-xs relative overflow-hidden`}
            >
              <div
                className={`text-xs font-semibold uppercase tracking-widest text-[#fe551b] mb-4`}
              >{`The operating principle`}</div>
              <p
                className={`text-xl sm:text-2xl font-normal text-[#1c1917] leading-relaxed`}
              >{`A high score is a reason to review the evidence. An action requires permission, verified buying-group coverage, and a destination your team has approved. Keep those boundaries visible to both sales and marketing.`}</p>
              <div
                className={`mt-8 pt-6 border-t border-[#efeeed] flex flex-wrap items-center justify-between gap-4`}
              >
                <div className={`flex items-center gap-3.5`}>
                  <div
                    className={`w-12 h-12 rounded-full bg-[#1c1917] text-white font-bold flex items-center justify-center text-base`}
                  >{`DM`}</div>
                  <div>
                    <div
                      className={`font-bold text-[#1c1917] text-sm`}
                    >{`Dual Motion product policy`}</div>
                    <div
                      className={`text-xs text-[#79716b]`}
                    >{`Evidence-backed decisions, explicit execution gates`}</div>
                  </div>
                </div>
                <div
                  className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#059669]`}
                >
                  <CircleCheckBig size={15} />
                  <span>{`Designed for controlled operations`}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section id={`enterprise`} className={`py-20`}>
          <div className={`max-w-[1240px] mx-auto px-6`}>
            <div className={`text-center max-w-[720px] mx-auto mb-14`}>
              <span
                className={`text-xs font-bold uppercase tracking-widest text-[#fe551b]`}
              >{`Enterprise Trust & Governance`}</span>
              <h2
                className={`text-3xl sm:text-4xl font-bold tracking-tight text-[#1c1917] mt-2`}
              >{`Control every marketing action with evidence.`}</h2>
              <p
                className={`mt-3 text-base text-[#57534d]`}
              >{`Workspace sessions, tenant-scoped product tools, consent checks, and recorded decision history support controlled pilot operation. Independent security certification and enterprise SSO are not currently offered.`}</p>
            </div>
            <div
              className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6`}
            >
              <div
                className={`p-6 rounded-2xl bg-[#fafaf9] border border-[#efeeed] shadow-xs`}
              >
                <div
                  className={`w-10 h-10 rounded-xl bg-[#ecfdf5] text-[#065f46] flex items-center justify-center mb-4`}
                >
                  <ShieldCheck size={20} />
                </div>
                <h3
                  className={`font-bold text-[#1c1917] text-base`}
                >{`Tenant-scoped product tools`}</h3>
                <p
                  className={`text-xs text-[#57534d] mt-2 leading-relaxed`}
                >{`Authenticated product tools resolve the workspace tenant before reading data or performing an action.`}</p>
              </div>
              <div
                className={`p-6 rounded-2xl bg-[#fafaf9] border border-[#efeeed] shadow-xs`}
              >
                <div
                  className={`w-10 h-10 rounded-xl bg-[#fff1ec] text-[#fe551b] flex items-center justify-center mb-4`}
                >
                  <LockKeyhole size={20} />
                </div>
                <h3
                  className={`font-bold text-[#1c1917] text-base`}
                >{`Consent Before Action`}</h3>
                <p
                  className={`text-xs text-[#57534d] mt-2 leading-relaxed`}
                >{`Additions require permitted contacts. Opt-outs trigger suppression and removal without waiting for a new AI approval.`}</p>
              </div>
              <div
                className={`p-6 rounded-2xl bg-[#fafaf9] border border-[#efeeed] shadow-xs`}
              >
                <div
                  className={`w-10 h-10 rounded-xl bg-white text-[#1c1917] flex items-center justify-center mb-4 border border-[#efeeed]`}
                >
                  <Globe size={20} />
                </div>
                <h3
                  className={`font-bold text-[#1c1917] text-base`}
                >{`Workspace access`}</h3>
                <p
                  className={`text-xs text-[#57534d] mt-2 leading-relaxed`}
                >{`Server-side sessions and owner permissions protect workspace configuration. Enterprise identity-provider SSO is future work.`}</p>
              </div>
              <div
                className={`p-6 rounded-2xl bg-[#fafaf9] border border-[#efeeed] shadow-xs`}
              >
                <div
                  className={`w-10 h-10 rounded-xl bg-white text-[#fe551b] flex items-center justify-center mb-4 border border-[#efeeed]`}
                >
                  <Activity size={20} />
                </div>
                <h3
                  className={`font-bold text-[#1c1917] text-base`}
                >{`Audit Traceability`}</h3>
                <p
                  className={`text-xs text-[#57534d] mt-2 leading-relaxed`}
                >{`Recorded score snapshots, decision attribution, and connector job outcomes support inspection. Storage is not certified as immutable.`}</p>
              </div>
            </div>
          </div>
        </section>
        <section
          className={`relative py-28 overflow-hidden bg-[#1c1917] text-white`}
        >
          <div
            className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-[#fe551b]/40 via-[#fe551b]/10 to-transparent pointer-events-none blur-3xl opacity-80`}
          />
          <div
            className={`max-w-[840px] mx-auto px-6 text-center relative z-10`}
          >
            <span
              className={`text-xs font-bold uppercase tracking-widest text-[#fe551b]`}
            >{`Give Your Team Clarity · Protect Your Pipeline`}</span>
            <h2
              className={`text-4xl sm:text-6xl font-bold tracking-tight text-white mt-4 leading-tight`}
            >{`Make the next move make sense.`}</h2>
            <p
              className={`mt-5 text-lg sm:text-xl text-slate-300 max-w-[620px] mx-auto leading-relaxed`}
            >{`Stop guessing whether to sell or nurture. Give your revenue team transparent scores and explainable decisions in one workspace.`}</p>
            <div
              className={`mt-10 flex flex-wrap items-center justify-center gap-4`}
            >
              <button
                type={`button`}
                onClick={() => navigate(`OVERVIEW`)}
                className={`h-12 px-7 rounded-full bg-white hover:bg-slate-100 text-[#1c1917] text-sm font-semibold flex items-center gap-2 shadow-lg transition-all hover:scale-[1.02] cursor-pointer`}
              >
                <span>{`Open the workspace`}</span>
                <ArrowRight size={16} />
              </button>
              <button
                type={`button`}
                onClick={() => scrollToSection(`product`)}
                className={`h-12 px-6 rounded-full bg-transparent hover:bg-white/10 text-white text-sm font-semibold border border-white/20 transition-all cursor-pointer`}
              >
                <span>{`See interactive demo`}</span>
              </button>
            </div>
          </div>
        </section>
      </main>
      <footer
        className={`bg-white border-t border-[#efeeed] pt-16 pb-12 text-xs text-[#79716b]`}
      >
        <div className={`max-w-[1240px] mx-auto px-6`}>
          <div
            className={`grid grid-cols-2 md:grid-cols-6 gap-8 pb-14 border-b border-[#efeeed]`}
          >
            <div className={`col-span-2 space-y-4`}>
              <div
                className={`flex items-center gap-2.5 text-[#1c1917] font-bold text-lg`}
              >
                <DualMotionLogo className={`w-6 h-6`} />
                <span>{`dual motion`}</span>
              </div>
              <p
                className={`text-xs text-[#57534d] max-w-[260px] leading-relaxed`}
              >{`The demand intelligence and decision layer for revenue operations. Explainable scoring inside strict product guardrails.`}</p>
              <div className={`flex items-center gap-2 pt-1`}>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#ecfdf5] text-[#065f46] text-[11px] font-medium border border-[#a7f3d0]`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500`} />
                  {`Controlled pilot`}
                </span>
              </div>
            </div>
            <div className={`space-y-2.5`}>
              <div
                className={`font-bold text-[#1c1917] uppercase tracking-wider text-[11px]`}
              >{`Product`}</div>
              <ul className={`space-y-2`}>
                <li>
                  <button
                    type={`button`}
                    onClick={() => navigate(`DEMAND_UNITS`)}
                    className={`hover:text-[#1c1917] transition-colors`}
                  >{`Demand Units`}</button>
                </li>
                <li>
                  <button
                    type={`button`}
                    onClick={() => navigate(`AUTOMATION`)}
                    className={`hover:text-[#1c1917] transition-colors`}
                  >{`Decision automation`}</button>
                </li>
                <li>
                  <button
                    type={`button`}
                    onClick={() => navigate(`RULES`)}
                    className={`hover:text-[#1c1917] transition-colors`}
                  >{`Scoring Rules Studio`}</button>
                </li>
                <li>
                  <button
                    type={`button`}
                    onClick={() => navigate(`SIGNALS`)}
                    className={`hover:text-[#1c1917] transition-colors`}
                  >{`Audience Playbooks`}</button>
                </li>
                <li>
                  <button
                    type={`button`}
                    onClick={() => navigate(`TASKS`)}
                    className={`hover:text-[#1c1917] transition-colors`}
                  >{`Decision Inbox`}</button>
                </li>
              </ul>
            </div>
            <div className={`space-y-2.5`}>
              <div
                className={`font-bold text-[#1c1917] uppercase tracking-wider text-[11px]`}
              >{`Connectors`}</div>
              <ul className={`space-y-2`}>
                <li>
                  <button
                    type={`button`}
                    onClick={() => navigate(`CONNECTORS`)}
                    className={`hover:text-[#1c1917] transition-colors`}
                  >{`Marketo Engage`}</button>
                </li>
                <li>
                  <button
                    type={`button`}
                    onClick={() => navigate(`CONNECTORS`)}
                    className={`hover:text-[#1c1917] transition-colors`}
                  >{`Salesforce CRM · planned`}</button>
                </li>
                <li>
                  <button
                    type={`button`}
                    onClick={() => navigate(`CONNECTORS`)}
                    className={`hover:text-[#1c1917] transition-colors`}
                  >{`LinkedIn Ads · planned`}</button>
                </li>
                <li>
                  <button
                    type={`button`}
                    onClick={() => navigate(`CONNECTORS`)}
                    className={`hover:text-[#1c1917] transition-colors`}
                  >{`Google Ads · planned`}</button>
                </li>
                <li>
                  <button
                    type={`button`}
                    onClick={() => navigate(`CONNECTORS`)}
                    className={`hover:text-[#1c1917] transition-colors`}
                  >{`Snowflake · planned`}</button>
                </li>
              </ul>
            </div>
            <div className={`space-y-2.5`}>
              <div
                className={`font-bold text-[#1c1917] uppercase tracking-wider text-[11px]`}
              >{`Solutions`}</div>
              <ul className={`space-y-2`}>
                <li>
                  <button
                    type={`button`}
                    onClick={() => scrollToSection(`features-bento`)}
                    className={`hover:text-[#1c1917] transition-colors`}
                  >{`Marketing Operations`}</button>
                </li>
                <li>
                  <button
                    type={`button`}
                    onClick={() => scrollToSection(`features-bento`)}
                    className={`hover:text-[#1c1917] transition-colors`}
                  >{`Enterprise RevOps`}</button>
                </li>
                <li>
                  <button
                    type={`button`}
                    onClick={() => scrollToSection(`features-bento`)}
                    className={`hover:text-[#1c1917] transition-colors`}
                  >{`ABM Buying Committees`}</button>
                </li>
                <li>
                  <button
                    type={`button`}
                    onClick={() => scrollToSection(`features-bento`)}
                    className={`hover:text-[#1c1917] transition-colors`}
                  >{`Outbound Orchestration`}</button>
                </li>
              </ul>
            </div>
            <div className={`space-y-2.5`}>
              <div
                className={`font-bold text-[#1c1917] uppercase tracking-wider text-[11px]`}
              >{`Resources`}</div>
              <ul className={`space-y-2`}>
                <li>
                  <button
                    type={`button`}
                    onClick={() => scrollToSection(`mcp-section`)}
                    className={`hover:text-[#1c1917] transition-colors`}
                  >{`MCP Server`}</button>
                </li>
                <li>
                  <button
                    type={`button`}
                    onClick={() => scrollToSection(`mcp-section`)}
                    className={`hover:text-[#1c1917] transition-colors`}
                  >{`Python HTTP`}</button>
                </li>
                <li>
                  <button
                    type={`button`}
                    onClick={() => navigate(`OVERVIEW`)}
                    className={`hover:text-[#1c1917] transition-colors`}
                  >{`Explore workspace`}</button>
                </li>
                <li>
                  <button
                    type={`button`}
                    onClick={() => scrollToSection(`enterprise`)}
                    className={`hover:text-[#1c1917] transition-colors`}
                  >{`Security & Compliance`}</button>
                </li>
                <li>
                  <button
                    type={`button`}
                    onClick={() => navigate(`OVERVIEW`)}
                    className={`hover:text-[#1c1917] transition-colors`}
                  >{`Inspect decisions`}</button>
                </li>
              </ul>
            </div>
          </div>
          <div
            className={`pt-8 flex flex-wrap items-center justify-between gap-4 text-xs text-[#a8a29e]`}
          >
            <div>
              {`© `}
              {new Date().getFullYear()}
              {` Dual Motion Inc. All rights reserved.`}
            </div>
            <div className={`flex items-center gap-6`}>
              <span
                title={`Legal documents must be finalized before public launch`}
              >{`Privacy policy · in preparation`}</span>
              <span>{`Terms · in preparation`}</span>
              <button
                type={`button`}
                onClick={() => scrollToSection(`enterprise`)}
                className={`hover:text-[#1c1917] transition-colors`}
              >{`Security overview`}</button>
              <button
                type={`button`}
                onClick={() =>
                  window.scrollTo({
                    top: 0,
                    behavior: `smooth`,
                  })
                }
                className={`hover:text-[#1c1917] transition-colors flex items-center gap-1 font-semibold text-[#57534d]`}
              >{`Back to top ↑`}</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
export { RestoredLandingPage };
