import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory reference data for AI function linking
const MOCK_ACCOUNTS_SUMMARY = [
  {
    id: 'DU-8092',
    name: 'Starlight Cloud Systems',
    domain: 'starlightcloud.io',
    industry: 'Enterprise Infrastructure & Kubernetes',
    tier: 'Tier 1 Strategic',
    stage: 'qualified_du',
    compositeScore: 94,
    estDealValue: 240000,
    scores: { productTelemetry: 98, behavioralEngagement: 92, committeeMaturity: 90, firmographicFit: 96, intentSurge: 88 },
    telemetry: { activeUsers: 480, weeklyEvents: '1.4M', apiVelocityGrowth: '+48%', healthScore: 98 },
    committee: {
      totalIdentified: 6,
      totalRequired: 6,
      championIdentified: true,
      economicBuyerEngaged: true,
      securitySignedOff: true,
      missingRoles: [],
    },
  },
  {
    id: 'DU-7714',
    name: 'Nexus Financial Technologies',
    domain: 'nexuspay.global',
    industry: 'Fintech & Core Ledger Infra',
    tier: 'Tier 1 Strategic',
    stage: 'buying_committee',
    compositeScore: 88,
    estDealValue: 310000,
    scores: { productTelemetry: 94, behavioralEngagement: 85, committeeMaturity: 76, firmographicFit: 98, intentSurge: 92 },
    telemetry: { activeUsers: 240, weeklyEvents: '820K', apiVelocityGrowth: '+62%', healthScore: 94 },
    committee: {
      totalIdentified: 4,
      totalRequired: 6,
      championIdentified: true,
      economicBuyerEngaged: false,
      securitySignedOff: true,
      missingRoles: ['economic_buyer', 'procurement_legal'],
    },
  },
  {
    id: 'DU-6421',
    name: 'AeroDynamics Aerospace & Defense',
    domain: 'aerodynamics.aero',
    industry: 'Autonomous Avionics & Simulation',
    tier: 'Tier 2 Enterprise',
    stage: 'solution_discovery',
    compositeScore: 78,
    estDealValue: 185000,
    scores: { productTelemetry: 72, behavioralEngagement: 88, committeeMaturity: 70, firmographicFit: 90, intentSurge: 74 },
    telemetry: { activeUsers: 65, weeklyEvents: '310K', apiVelocityGrowth: '+18%', healthScore: 82 },
    committee: {
      totalIdentified: 3,
      totalRequired: 6,
      championIdentified: true,
      economicBuyerEngaged: false,
      securitySignedOff: false,
      missingRoles: ['economic_buyer', 'security_compliance', 'procurement_legal'],
    },
  },
  {
    id: 'DU-5188',
    name: 'CyberShield Zero-Trust',
    domain: 'cybershield.security',
    industry: 'Cybersecurity & Endpoint Zero-Trust',
    tier: 'Tier 1 Strategic',
    stage: 'opportunity_pipeline',
    compositeScore: 92,
    estDealValue: 275000,
    scores: { productTelemetry: 90, behavioralEngagement: 95, committeeMaturity: 94, firmographicFit: 92, intentSurge: 89 },
    telemetry: { activeUsers: 390, weeklyEvents: '2.1M', apiVelocityGrowth: '+34%', healthScore: 95 },
    committee: {
      totalIdentified: 6,
      totalRequired: 6,
      championIdentified: true,
      economicBuyerEngaged: true,
      securitySignedOff: true,
      missingRoles: [],
    },
  },
  {
    id: 'DU-4902',
    name: 'DataPulse Analytics Core',
    domain: 'datapulse.ai',
    industry: 'Real-time OLAP & Vector Databases',
    tier: 'Tier 2 Enterprise',
    stage: 'telemetry_spike',
    compositeScore: 83,
    estDealValue: 145000,
    scores: { productTelemetry: 96, behavioralEngagement: 74, committeeMaturity: 58, firmographicFit: 86, intentSurge: 94 },
    telemetry: { activeUsers: 190, weeklyEvents: '940K', apiVelocityGrowth: '+115%', healthScore: 91 },
    committee: {
      totalIdentified: 2,
      totalRequired: 6,
      championIdentified: true,
      economicBuyerEngaged: false,
      securitySignedOff: false,
      missingRoles: ['economic_buyer', 'technical_evaluator', 'security_compliance', 'procurement_legal'],
    },
  },
];

// Definition of AI-linked function declarations
const calculateDemandScoreDeclaration: FunctionDeclaration = {
  name: 'calculateDemandScore',
  description: 'Calculates composite demand score (0-100), stage gate qualification, and GTM routing recommendations based on dual-motion telemetry, committee coverage, behavioral engagement, intent surge, and firmographic fit.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      telemetryScore: { type: Type.NUMBER, description: 'Product usage telemetry score (0-100)' },
      committeeScore: { type: Type.NUMBER, description: 'Buying committee coverage score (0-100)' },
      behavioralScore: { type: Type.NUMBER, description: 'Behavioral website & content engagement score (0-100)' },
      intentScore: { type: Type.NUMBER, description: '3rd-party G2/Bombora intent surge score (0-100)' },
      fitScore: { type: Type.NUMBER, description: 'Firmographic ICP fit score (0-100)' },
    },
    required: ['telemetryScore', 'committeeScore'],
  },
};

const lookupAccountDeclaration: FunctionDeclaration = {
  name: 'lookupAccount',
  description: 'Looks up a live enterprise demand unit account in the Marketing Operations database to retrieve its stage, telemetry velocity, committee coverage, and ICP tier.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      accountName: { type: Type.STRING, description: 'Name or partial name of the account (e.g., Starlight, Nexus, AeroDynamics, CyberShield, DataPulse)' },
    },
    required: ['accountName'],
  },
};

const analyzeCommitteeCoverageDeclaration: FunctionDeclaration = {
  name: 'analyzeCommitteeCoverage',
  description: 'Inspects buying committee member coverage across 6 roles (Economic Buyer, Champion, Technical Evaluator, Security/Compliance, Procurement/Legal, End-User) and diagnoses single-threading stall risk.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      accountName: { type: Type.STRING, description: 'Account name to inspect' },
    },
    required: ['accountName'],
  },
};

const triggerPlaybookDeclaration: FunctionDeclaration = {
  name: 'triggerPlaybook',
  description: 'Triggers an operational marketing automation playbook (e.g. Infosec Fast-Track, Executive Multi-Threading, PQL Slack Dispatch, High-Intent Surge Blitz) for an account.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      accountName: { type: Type.STRING, description: 'Target account name' },
      playbookName: { type: Type.STRING, description: 'Playbook to trigger: "Infosec Fast-Track" | "Executive Multi-Threading" | "PQL Slack Dispatch" | "High-Intent Surge Blitz"' },
      urgency: { type: Type.STRING, description: 'Priority level: LOW, MEDIUM, HIGH, or CRITICAL' },
    },
    required: ['accountName', 'playbookName'],
  },
};

const simulateTelemetrySurgeDeclaration: FunctionDeclaration = {
  name: 'simulateTelemetrySurge',
  description: 'Simulates a Product-Led Growth (PLG) usage surge by injecting additional active seats and API consumption growth, predicting the resulting demand score shift and automated triggers.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      accountName: { type: Type.STRING, description: 'Account to simulate' },
      additionalSeats: { type: Type.NUMBER, description: 'Number of new active seats to simulate (e.g. 50, 100, 250)' },
      apiUsageGrowthPct: { type: Type.NUMBER, description: 'Percentage increase in API call velocity (e.g. 40, 85, 150)' },
    },
    required: ['accountName', 'additionalSeats'],
  },
};

const AI_TOOLS = [
  {
    functionDeclarations: [
      calculateDemandScoreDeclaration,
      lookupAccountDeclaration,
      analyzeCommitteeCoverageDeclaration,
      triggerPlaybookDeclaration,
      simulateTelemetrySurgeDeclaration,
    ],
  },
];

// Function execution handler
function executeLinkedFunction(name: string, args: any) {
  switch (name) {
    case 'calculateDemandScore': {
      const tel = Number(args.telemetryScore) || 0;
      const com = Number(args.committeeScore) || 0;
      const beh = Number(args.behavioralScore) || 50;
      const int = Number(args.intentScore) || 50;
      const fit = Number(args.fitScore) || 75;

      // Weighted formula: Tel (30%) + Beh (25%) + Com (25%) + Fit (10%) + Int (10%)
      const composite = Math.round(
        tel * 0.3 + beh * 0.25 + com * 0.25 + fit * 0.1 + int * 0.1
      );

      let qualification = 'Target Account';
      let stageRecommendation = 'solution_discovery';
      let primaryRisk = 'Low engagement';
      let nextAction = 'Nurture via technical educational sequences';

      if (composite >= 90) {
        qualification = 'Stage 4: Pipeline Opportunity (High Priority)';
        stageRecommendation = 'opportunity_pipeline';
        nextAction = 'Route to Named Enterprise AE & Solution Architect';
        primaryRisk = com < 70 ? 'Single-thread committee risk' : 'Contract redline delays';
      } else if (composite >= 80) {
        qualification = 'Stage 3: Qualified Demand Unit (PQL)';
        stageRecommendation = 'qualified_du';
        nextAction = 'Dispatch PQL Slack notification and initiate multi-threading';
        primaryRisk = com < 60 ? 'Missing Economic Buyer' : 'Feature evaluation stall';
      } else if (composite >= 70) {
        qualification = 'Stage 2: Buying Committee Formation';
        stageRecommendation = 'buying_committee';
        nextAction = 'Deploy LinkedIn Account Matched Audience & Infosec whitepaper';
        primaryRisk = 'Lack of executive alignment';
      }

      return {
        success: true,
        compositeScore: composite,
        breakdown: { telemetry: tel, committee: com, behavioral: beh, intent: int, fit },
        qualification,
        stageRecommendation,
        primaryRisk,
        recommendedAction: nextAction,
        isPQL: tel >= 80,
        isSQL: composite >= 75 && com >= 60,
      };
    }

    case 'lookupAccount': {
      const query = (args.accountName || '').toLowerCase().trim();
      const match = MOCK_ACCOUNTS_SUMMARY.find(
        (a) => a.name.toLowerCase().includes(query) || a.domain.toLowerCase().includes(query)
      );

      if (match) {
        return {
          success: true,
          account: match,
          status: 'ACCOUNT_LOCATED',
          summary: `${match.name} (${match.tier}) is at stage "${match.stage}" with composite score ${match.compositeScore}/100 and estimated deal value $${match.estDealValue.toLocaleString()}.`,
        };
      } else {
        return {
          success: false,
          error: `No exact match found for "${args.accountName}". Available mock accounts: Starlight Cloud Systems, Nexus Financial, AeroDynamics, CyberShield, DataPulse.`,
          availableAccounts: MOCK_ACCOUNTS_SUMMARY.map((a) => a.name),
        };
      }
    }

    case 'analyzeCommitteeCoverage': {
      const query = (args.accountName || '').toLowerCase().trim();
      const account = MOCK_ACCOUNTS_SUMMARY.find((a) => a.name.toLowerCase().includes(query)) || MOCK_ACCOUNTS_SUMMARY[0];

      const roles = [
        { role: 'Economic Buyer', filled: account.committee.economicBuyerEngaged, criticality: 'CRITICAL', description: 'Budget authority (VP/C-Level)' },
        { role: 'Internal Champion', filled: account.committee.championIdentified, criticality: 'CRITICAL', description: 'Technical evangelist driving adoption' },
        { role: 'Technical Evaluator', filled: true, criticality: 'HIGH', description: 'Validates architecture and benchmarks' },
        { role: 'Security & Compliance', filled: account.committee.securitySignedOff, criticality: 'HIGH', description: 'SOC2 / InfoSec audit sign-off' },
        { role: 'Procurement & Legal', filled: account.committee.missingRoles.indexOf('procurement_legal') === -1, criticality: 'MEDIUM', description: 'MSA / DPA contract terms' },
        { role: 'End-User Representative', filled: true, criticality: 'MEDIUM', description: 'Daily active practitioner usage' },
      ];

      const filledCount = roles.filter((r) => r.filled).length;
      const coveragePct = Math.round((filledCount / roles.length) * 100);
      const isSingleThreaded = filledCount <= 2 || !account.committee.economicBuyerEngaged;

      return {
        success: true,
        accountName: account.name,
        coverageScore: coveragePct,
        identifiedRoles: filledCount,
        requiredRoles: roles.length,
        isSingleThreaded,
        riskLevel: isSingleThreaded ? 'HIGH RISK (Single-Threaded)' : coveragePct >= 80 ? 'LOW RISK (Well-Covered)' : 'MODERATE RISK',
        missingRoles: account.committee.missingRoles,
        rolesMatrix: roles,
        recommendedIntervention: isSingleThreaded
          ? 'Trigger Executive Multi-Threading Playbook to engage Economic Buyer immediately'
          : 'Proceed with technical validation and schedule security review',
      };
    }

    case 'triggerPlaybook': {
      const accountName = args.accountName || 'Starlight Cloud Systems';
      const playbookName = args.playbookName || 'Executive Multi-Threading';
      const urgency = args.urgency || 'HIGH';

      return {
        success: true,
        playbookId: `PB-EXEC-${Date.now().toString().slice(-4)}`,
        accountName,
        playbookName,
        urgency,
        dispatchedAt: new Date().toISOString(),
        actionsDispatched: [
          `Generated automated multi-threading task in CAD Pipeline Queue for ${accountName}`,
          `Sent real-time notification alert to assigned Enterprise Account Executive`,
          `Queued targeted buyer-role content sequences in HubSpot/Marketo`,
          `Enriched missing stakeholder contact profiles via Apollo/ZoomInfo connector`,
        ],
        status: 'ACTIVE_EXECUTION',
      };
    }

    case 'simulateTelemetrySurge': {
      const query = (args.accountName || '').toLowerCase().trim();
      const account = MOCK_ACCOUNTS_SUMMARY.find((a) => a.name.toLowerCase().includes(query)) || MOCK_ACCOUNTS_SUMMARY[4]; // default DataPulse

      const additionalSeats = Number(args.additionalSeats) || 50;
      const apiGrowth = Number(args.apiUsageGrowthPct) || 50;

      const newUsers = account.telemetry.activeUsers + additionalSeats;
      const telemetryDelta = Math.min(100, Math.round(account.scores.productTelemetry + additionalSeats * 0.08 + apiGrowth * 0.05));
      const oldComposite = account.compositeScore;
      const newComposite = Math.min(99, Math.round(oldComposite + (telemetryDelta - account.scores.productTelemetry) * 0.3));

      const triggeredPQL = newComposite >= 80 && oldComposite < 80;

      return {
        success: true,
        accountName: account.name,
        simulation: {
          priorSeats: account.telemetry.activeUsers,
          newSeats: newUsers,
          seatIncrease: additionalSeats,
          apiGrowthSimulated: `+${apiGrowth}%`,
          priorTelemetryScore: account.scores.productTelemetry,
          simulatedTelemetryScore: telemetryDelta,
          priorCompositeScore: oldComposite,
          simulatedCompositeScore: newComposite,
          scoreDelta: newComposite - oldComposite,
          triggeredPQL,
          newStage: triggeredPQL ? 'qualified_du' : account.stage,
          automatedActions: triggeredPQL
            ? ['PQL Threshold Reached (>80)', 'Dispatched Slack alert to Sales Engineering', 'Created Urgent Task: Schedule Technical Demo']
            : ['Telemetry metrics updated', 'Decay timer reset to 14 days'],
        },
      };
    }

    default:
      return { success: false, error: `Unknown function: ${name}` };
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Direct execution endpoint for interactive UI function playground
app.post('/api/gemini/run-function', (req, res) => {
  try {
    const { functionName, args } = req.body;
    if (!functionName) {
      return res.status(400).json({ error: 'Missing functionName' });
    }
    const result = executeLinkedFunction(functionName, args || {});
    return res.json({ success: true, functionName, args, result });
  } catch (err: any) {
    console.error('Error running function directly:', err);
    return res.status(500).json({ error: err.message || 'Function execution failed' });
  }
});

// Multi-turn Gemini Chat endpoint with Function Calling
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { messages, model: requestedModel, role: requestedRole } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    // Model selection based on user instructions:
    // - gemini-3.1-pro-preview for particularly complex tasks
    // - gemini-3.5-flash for general tasks (default)
    // - gemini-3.1-flash-lite for tasks that should happen fast
    let modelName = 'gemini-3.5-flash';
    if (requestedModel === 'gemini-3.1-pro-preview') {
      modelName = 'gemini-3.1-pro-preview';
    } else if (requestedModel === 'gemini-3.1-flash-lite') {
      modelName = 'gemini-3.1-flash-lite';
    }

    // Role-specific System Instruction
    let roleDescription = 'You are the Dual-Motion Revenue Architecture AI Copilot for this CAD Marketing Operations OS.';
    if (requestedRole === 'telemetry_analyst') {
      roleDescription = 'You are the Product Telemetry & Usage Velocity Analyst. Focus deeply on active seat surges, API event growth rates, PQL triggers, and usage decay half-life.';
    } else if (requestedRole === 'committee_strategist') {
      roleDescription = 'You are the Enterprise Buying Committee Strategist. Specialize in multi-threading 6 buying personas (Economic Buyer, Champion, Technical Evaluator, Infosec, Procurement, End-User) and resolving single-threading risks.';
    } else if (requestedRole === 'pipeline_commander') {
      roleDescription = 'You are the Marketing Ops Pipeline Commander. Focus on SLA enforcement, stage gate qualification criteria, CRM lead routing, and automated execution playbooks.';
    }

    const systemInstruction = `${roleDescription}
You are embedded inside a B2B CAD Engineering Blueprint Operating System for Dual-Motion (PLG + SLG) Marketing Operations.
You have access to real AI-linked functions:
- calculateDemandScore: compute composite scores (0-100), stage qualification, and risks.
- lookupAccount: inspect live account demand units (Starlight Cloud, Nexus Financial, AeroDynamics, CyberShield, DataPulse).
- analyzeCommitteeCoverage: diagnose 6 persona buying committee coverage and single-thread risk.
- triggerPlaybook: launch automated operational playbooks.
- simulateTelemetrySurge: simulate PLG seat usage surges and evaluate PQL transitions.

When users ask to score an account, check a committee, simulate a surge, trigger a playbook, or lookup accounts, CALL THE RELEVANT FUNCTION!
Be concise, analytical, and structured in your explanations. Use clear metrics, bullet points, and actionable next steps.`;

    const apiKey = process.env.GEMINI_API_KEY;

    // Fallback if no API key is set or in mock simulation
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      const lastUserMsg = messages[messages.length - 1]?.text || '';
      const lower = lastUserMsg.toLowerCase();

      // Check if user is asking to trigger one of the linked functions
      let executedTool: any = null;
      let replyText = '';

      if (lower.includes('score') || lower.includes('calculate') || lower.includes('telemetry 9')) {
        const toolRes: any = executeLinkedFunction('calculateDemandScore', {
          telemetryScore: 95,
          committeeScore: 78,
          behavioralScore: 84,
          intentScore: 90,
          fitScore: 95,
        });
        executedTool = { name: 'calculateDemandScore', args: { telemetryScore: 95, committeeScore: 78, behavioralScore: 84 }, result: toolRes };
        replyText = `### Demand Score Analysis\n\nI have executed \`calculateDemandScore\` with current dual-motion signals:\n\n- **Composite Score**: **${toolRes.compositeScore}/100**\n- **Qualification**: ${toolRes.qualification}\n- **PQL Status**: Active (Telemetry >= 80)\n- **Primary Risk**: ${toolRes.primaryRisk}\n\n**Actionable Recommendation**: ${toolRes.recommendedAction}. You can adjust these weights anytime in the Scoring Studio.`;
      } else if (lower.includes('committee') || lower.includes('starlight') || lower.includes('nexus') || lower.includes('gap')) {
        const target = lower.includes('nexus') ? 'Nexus Financial Technologies' : 'Starlight Cloud Systems';
        const toolRes: any = executeLinkedFunction('analyzeCommitteeCoverage', { accountName: target });
        executedTool = { name: 'analyzeCommitteeCoverage', args: { accountName: target }, result: toolRes };
        replyText = `### Buying Committee Audit: ${target}\n\nI have executed \`analyzeCommitteeCoverage\`:\n\n- **Coverage**: **${toolRes.coverageScore}%** (${toolRes.identifiedRoles}/${toolRes.requiredRoles} roles filled)\n- **Status**: ${toolRes.riskLevel}\n- **Missing Roles**: ${toolRes.missingRoles && toolRes.missingRoles.length > 0 ? toolRes.missingRoles.join(', ') : 'None (Fully Multi-Threaded)'}\n\n**Next Playbook**: ${toolRes.recommendedIntervention}`;
      } else if (lower.includes('surge') || lower.includes('simulate') || lower.includes('seat')) {
        const toolRes: any = executeLinkedFunction('simulateTelemetrySurge', { accountName: 'DataPulse Analytics Core', additionalSeats: 120, apiUsageGrowthPct: 85 });
        executedTool = { name: 'simulateTelemetrySurge', args: { accountName: 'DataPulse Analytics Core', additionalSeats: 120, apiUsageGrowthPct: 85 }, result: toolRes };
        replyText = `### Telemetry Surge Simulation Completed\n\nI simulated a PLG surge of +120 active seats and +85% API call velocity on **DataPulse Analytics Core**:\n\n- **Telemetry Score**: ${toolRes.simulation?.priorTelemetryScore} -> **${toolRes.simulation?.simulatedTelemetryScore}**\n- **Composite Score**: ${toolRes.simulation?.priorCompositeScore} -> **${toolRes.simulation?.simulatedCompositeScore}** (+${toolRes.simulation?.scoreDelta} pts)\n- **PQL Triggered**: **YES!** Automatic sales dispatch activated.`;
      } else if (lower.includes('playbook') || lower.includes('trigger') || lower.includes('infosec')) {
        const toolRes: any = executeLinkedFunction('triggerPlaybook', { accountName: 'Nexus Financial Technologies', playbookName: 'Infosec Fast-Track', urgency: 'HIGH' });
        executedTool = { name: 'triggerPlaybook', args: { accountName: 'Nexus Financial Technologies', playbookName: 'Infosec Fast-Track', urgency: 'HIGH' }, result: toolRes };
        replyText = `### Playbook Execution: ${toolRes.playbookName}\n\nSuccessfully dispatched operational automation for **${toolRes.accountName}** (ID: \`${toolRes.playbookId}\`).\n\nDispatched tasks:\n${(toolRes.actionsDispatched || []).map((a: string) => `- ${a}`).join('\n')}`;
      } else {
        replyText = `Welcome to the **Dual-Motion Marketing Operations AI Copilot**. I am linked directly to this CAD system's live telemetry database, buying committee tracker, and automation engine.\n\nYou can ask me to:\n1. **Calculate Demand Scores** with custom telemetry & committee weights\n2. **Inspect Buying Committees** to detect single-threaded stall risks\n3. **Simulate PLG Telemetry Surges** (seats + API growth)\n4. **Trigger Automation Playbooks** across Slack, HubSpot, and Salesforce\n\nWhat would you like to inspect or calculate?`;
      }

      return res.json({
        reply: replyText,
        functionCalls: executedTool ? [executedTool] : [],
        modelUsed: `${modelName} (Simulation Mode)`,
        isSimulated: true,
      });
    }

    // Initialize Google GenAI client server-side
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Format multi-turn conversation history for @google/genai
    // contents can be an array of Content objects: { role: 'user' | 'model', parts: [{ text }] }
    const contents: any[] = messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));

    // First generateContent call with tools enabled
    const response = await ai.models.generateContent({
      model: modelName,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        tools: AI_TOOLS,
      },
    });

    const executedTools: any[] = [];
    const functionCalls = response.functionCalls;

    if (functionCalls && functionCalls.length > 0) {
      // Execute each function call
      for (const fc of functionCalls) {
        const toolResult = executeLinkedFunction(fc.name || '', fc.args || {});
        executedTools.push({
          id: (fc as any).id,
          name: fc.name,
          args: fc.args,
          result: toolResult,
        });
      }

      // Provide the function execution result back to the model for a comprehensive response
      const followUpContents: any[] = [
        ...contents,
        ...(response.candidates?.[0]?.content ? [response.candidates[0].content] : []),
        {
          role: 'user',
          parts: executedTools.map((et) => ({
            text: `[Function execution result for ${et.name}]: ${JSON.stringify(et.result)}`,
          })),
        },
      ];

      try {
        const followUpResponse = await ai.models.generateContent({
          model: modelName,
          contents: followUpContents,
          config: {
            systemInstruction: systemInstruction,
          },
        });

        return res.json({
          reply: followUpResponse.text || response.text || 'Function executed successfully.',
          functionCalls: executedTools,
          modelUsed: modelName,
          isSimulated: false,
        });
      } catch (fErr) {
        console.warn('Follow-up generation error, returning primary text:', fErr);
        return res.json({
          reply: response.text || `Executed ${executedTools.map((t) => t.name).join(', ')}.`,
          functionCalls: executedTools,
          modelUsed: modelName,
          isSimulated: false,
        });
      }
    }

    return res.json({
      reply: response.text || 'I analyzed the request.',
      functionCalls: [],
      modelUsed: modelName,
      isSimulated: false,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/chat:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process chat with Gemini',
    });
  }
});

// Vite middleware & Production static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
