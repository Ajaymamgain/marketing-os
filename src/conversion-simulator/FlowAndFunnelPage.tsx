import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownRight,
  Info,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { conversionBatchLink, fetchHistoricalReplay, getConversionBatch, runConversionAction } from '../services/api';
import type {ConversionBatchDetail, ConversionReceipt} from '../services/api';
import {ConversionSignalImport, inputStyle, outlineButton, primaryButton} from './ConversionSignalImport';

type ValidationResult = {
  state: 'ready' | 'blocked' | 'skipped';
  matched_by: string | null;
  message: string;
};

const outcomes = {
  qualified_lead: 'Qualified lead',
  converted_lead: 'Converted lead',
  meeting_booked: 'Meeting booked',
  meeting_held: 'Meeting held',
  proposal_sent: 'Proposal sent',
  completed_sale: 'Completed sale',
};

type Outcome = keyof typeof outcomes;

type SqlTargetId =
  | 'meeting_booked'
  | 'meeting_held'
  | 'proposal_sent'
  | 'wait_closed_won';

type PresetId =
  | 'sql_meeting_held'
  | 'enhanced_no_gclid'
  | 'ecl_expired_63_lost'
  | 'ecl_expired_63_saved_by_gclid'
  | 'long_cycle_120_day'
  | 'blind_no_conversion'
  | 'customer_match';

type FlowNodeId =
  | 'ad_click'
  | 'website_tag'
  | 'sales_outcome'
  | 'zura_ingest'
  | 'privacy_gate'
  | 'data_manager'
  | 'attribution_core'
  | 'quarantine_bay'
  | 'audience_silo'
  | 'blind_bidding';

interface FlowNodeDef {
  id: FlowNodeId;
  x: number;
  y: number;
  w: number;
  h: number;
  stepTag: string;
  title: string;
  subtitle: string;
  tone: 'default' | 'teal' | 'emerald' | 'rose' | 'indigo' | 'amber';
  description: string;
}

interface FlowEdgeDef {
  id: string;
  from: FlowNodeId;
  to: FlowNodeId;
  d: string;
  label?: string;
  labelX?: number;
  labelY?: number;
  tone: 'main' | 'quarantine' | 'audience' | 'blind';
}

interface DynamicStep {
  nodeId: FlowNodeId;
  edgeFromPrev?: string;
  headline: string;
  detail: string;
  funnelStageIdx: number;
}

interface SimControls {
  gclidPresent: boolean;
  daysSinceClick: number;
  consentGranted: boolean;
  sendConversionApi: boolean;
  audienceOnly: boolean;
}

const FLOW_NODES: FlowNodeDef[] = [
  {
    id: 'ad_click',
    x: 96,
    y: 98,
    w: 158,
    h: 76,
    stepTag: '01',
    title: 'Google Ad Click',
    subtitle: 'Digital Receipt (GCLID)',
    tone: 'default',
    description:
      'Prospect clicks your Google Ad. Google attaches a GCLID receipt and starts both expiry clocks: 63 days for Enhanced Conversions for Leads (ECL) and 90 days for GCLID.',
  },
  {
    id: 'website_tag',
    x: 294,
    y: 98,
    w: 162,
    h: 76,
    stepTag: '02',
    title: 'Website Inquiry',
    subtitle: 'Captures GCLID + Contact',
    tone: 'default',
    description:
      'Your website form captures GCLID and consented email/phone via Google Tag. Raw forms are tracked only—not used as a Primary bidding goal.',
  },
  {
    id: 'sales_outcome',
    x: 498,
    y: 98,
    w: 168,
    h: 76,
    stepTag: '03',
    title: 'Sales SQL Milestone',
    subtitle: 'Meeting Booked / Held',
    tone: 'teal',
    description:
      'Because final sales take 2–5 months (past Google’s expiry windows), Sales logs a short-term SQL milestone (like Discovery Meeting Held) in Days 6–14 with an expected proxy USD value.',
  },
  {
    id: 'zura_ingest',
    x: 704,
    y: 98,
    w: 164,
    h: 76,
    stepTag: '04',
    title: 'Conversion Sync API',
    subtitle: 'Streams Only New SQLs',
    tone: 'default',
    description:
      'A confirmed CRM outcome can be imported into Dual Motion for validation, deduplication, and delivery.',
  },
  {
    id: 'privacy_gate',
    x: 924,
    y: 98,
    w: 188,
    h: 76,
    stepTag: '05',
    title: 'Privacy & 63d/90d Gate',
    subtitle: 'SHA-256 · Consent · Expiry',
    tone: 'teal',
    description:
      'The validator hashes email (SHA-256), checks declared consent, and applies click-age limits of 63 days for email matching and 90 days with GCLID.',
  },
  {
    id: 'blind_bidding',
    x: 126,
    y: 318,
    w: 204,
    h: 78,
    stepTag: 'NO API',
    title: 'Blind Form Bidding',
    subtitle: 'Google Never Sees SQLs',
    tone: 'amber',
    description:
      'If SQLs are not sent back, Google optimizes only for raw website form fills—buying cheap clicks, spam, and no-shows that waste Sales’ calendar.',
  },
  {
    id: 'quarantine_bay',
    x: 368,
    y: 318,
    w: 200,
    h: 78,
    stepTag: 'HELD',
    title: 'Blocked (Past 63d/90d)',
    subtitle: 'Expired or Consent Denied',
    tone: 'rose',
    description:
      'Events past Google’s 63-day ECL or 90-day GCLID limits—or with denied consent—stop safely here. This is why waiting 2–5 months for Closed-Won loses attribution.',
  },
  {
    id: 'audience_silo',
    x: 604,
    y: 318,
    w: 198,
    h: 78,
    stepTag: 'LIST',
    title: 'Customer Match List',
    subtitle: 'Audiences Only (0 SQLs)',
    tone: 'indigo',
    description:
      'Customer Match updates targeting or exclusion audiences across Search, YouTube, and Display. It never reports an SQL or sale to Smart Bidding.',
  },
  {
    id: 'data_manager',
    x: 876,
    y: 224,
    w: 196,
    h: 68,
    stepTag: '06',
    title: 'Sent to Google Ads',
    subtitle: 'Hourly Data Manager API',
    tone: 'default',
    description:
      'Hourly API sync sends approved SQL milestones and their expected USD proxy value into Google Ads Data Manager.',
  },
  {
    id: 'attribution_core',
    x: 876,
    y: 342,
    w: 214,
    h: 72,
    stepTag: '07',
    title: 'Google Finds More SQLs',
    subtitle: 'Sent → Matched → Credited',
    tone: 'emerald',
    description:
      'Google matches the SQL back to the ad click, credits expected pipeline value, and trains Smart Bidding to find more qualified sales meetings.',
  },
];

const FLOW_EDGES: FlowEdgeDef[] = [
  { id: 'ad_to_tag', from: 'ad_click', to: 'website_tag', d: 'M 175 98 L 213 98', tone: 'main' },
  { id: 'tag_to_sales', from: 'website_tag', to: 'sales_outcome', d: 'M 375 98 L 414 98', tone: 'main' },
  { id: 'sales_to_ingest', from: 'sales_outcome', to: 'zura_ingest', d: 'M 582 98 L 622 98', tone: 'main' },
  { id: 'ingest_to_gate', from: 'zura_ingest', to: 'privacy_gate', d: 'M 786 98 L 830 98', tone: 'main' },
  {
    id: 'sales_to_blind',
    from: 'sales_outcome',
    to: 'blind_bidding',
    d: 'M 498 136 C 498 216, 126 206, 126 279',
    label: 'No SQL Sent (Blind)',
    labelX: 256,
    labelY: 212,
    tone: 'blind',
  },
  {
    id: 'gate_to_quarantine',
    from: 'privacy_gate',
    to: 'quarantine_bay',
    d: 'M 880 136 C 880 210, 368 202, 368 279',
    label: 'Expired (>63d/90d) or Denied',
    labelX: 432,
    labelY: 256,
    tone: 'quarantine',
  },
  {
    id: 'gate_to_audience',
    from: 'privacy_gate',
    to: 'audience_silo',
    d: 'M 914 136 C 914 212, 604 208, 604 279',
    label: 'Audience Only',
    labelX: 626,
    labelY: 256,
    tone: 'audience',
  },
  {
    id: 'gate_to_dm',
    from: 'privacy_gate',
    to: 'data_manager',
    d: 'M 946 136 C 946 170, 876 160, 876 190',
    label: 'SQL Approved',
    labelX: 966,
    labelY: 168,
    tone: 'main',
  },
  {
    id: 'dm_to_attr',
    from: 'data_manager',
    to: 'attribution_core',
    d: 'M 876 258 L 876 306',
    tone: 'main',
  },
];

const PRESETS: Array<{
  id: PresetId;
  label: string;
  controls: SimControls;
}> = [
  {
    id: 'sql_meeting_held',
    label: 'SQL Meeting Held (Day 10)',
    controls: {
      gclidPresent: true,
      daysSinceClick: 10,
      consentGranted: true,
      sendConversionApi: true,
      audienceOnly: false,
    },
  },
  {
    id: 'enhanced_no_gclid',
    label: 'ECL Backup (Day 14)',
    controls: {
      gclidPresent: false,
      daysSinceClick: 14,
      consentGranted: true,
      sendConversionApi: true,
      audienceOnly: false,
    },
  },
  {
    id: 'ecl_expired_63_lost',
    label: 'Day 72 · ECL Expired (>63d)',
    controls: {
      gclidPresent: false,
      daysSinceClick: 72,
      consentGranted: true,
      sendConversionApi: true,
      audienceOnly: false,
    },
  },
  {
    id: 'ecl_expired_63_saved_by_gclid',
    label: 'Day 72 · GCLID Saves (≤90d)',
    controls: {
      gclidPresent: true,
      daysSinceClick: 72,
      consentGranted: true,
      sendConversionApi: true,
      audienceOnly: false,
    },
  },
  {
    id: 'long_cycle_120_day',
    label: 'Closed-Won (Day 120 · Lost)',
    controls: {
      gclidPresent: true,
      daysSinceClick: 120,
      consentGranted: true,
      sendConversionApi: true,
      audienceOnly: false,
    },
  },
  {
    id: 'blind_no_conversion',
    label: 'No Signal (Blind)',
    controls: {
      gclidPresent: true,
      daysSinceClick: 10,
      consentGranted: true,
      sendConversionApi: false,
      audienceOnly: false,
    },
  },
  {
    id: 'customer_match',
    label: 'Audience List (0 SQLs)',
    controls: {
      gclidPresent: false,
      daysSinceClick: 12,
      consentGranted: true,
      sendConversionApi: true,
      audienceOnly: true,
    },
  },
];

const receiptStates: Record<string, string> = {
  ready: 'Ready for delivery',
  blocked: 'Held in review',
  sending: 'Sending',
  accepted: 'Accepted by Google',
  processed: 'Processed by Google',
  failed: 'Delivery failed',
  uncertain: 'Provider confirmation needed',
};

const realNodeNames: Partial<Record<FlowNodeId, [string, string]>> = {
  ad_click: ['Click timing', 'From the CRM file'],
  website_tag: ['Matching data', 'GCLID or email'],
  sales_outcome: ['CRM outcome', 'Milestone and value'],
  zura_ingest: ['Upload review', 'Saved CRM record'],
  privacy_gate: ['Validation', 'Consent and timing'],
  quarantine_bay: ['Held in review', 'Check validation results'],
  data_manager: ['Delivery', 'Google Ads destination'],
  attribution_core: ['Provider receipt', 'Recorded delivery status'],
};

function lagLabel(row: ConversionReceipt) {
  return row.lag_days == null ? 'Click timestamp unavailable' : `${row.lag_days} days from click to outcome`;
}

function reviewedRoute(batch: ConversionBatchDetail, row: ConversionReceipt): ReturnType<typeof buildDynamicRoute> {
  const outcome = row.outcome ? outcomes[row.outcome as Outcome] : undefined;
  const value = row.value == null ? '' : ` · ${row.currency} ${row.value.toLocaleString()}`;
  const steps: DynamicStep[] = [
    {nodeId: 'ad_click', headline: 'Recorded click timing', detail: lagLabel(row), funnelStageIdx: -1},
    {nodeId: 'website_tag', edgeFromPrev: 'ad_to_tag', headline: 'Matching identifiers', detail: row.matched_by, funnelStageIdx: -1},
    {nodeId: 'sales_outcome', edgeFromPrev: 'tag_to_sales', headline: outcome || 'CRM outcome unavailable',
      detail: row.occurred_at ? new Date(row.occurred_at).toLocaleString() + value : 'No valid outcome timestamp.', funnelStageIdx: -1},
    {nodeId: 'zura_ingest', edgeFromPrev: 'sales_to_ingest', headline: `CRM row ${row.line} reviewed`,
      detail: `Batch ${batch.id.slice(0, 8)}`, funnelStageIdx: -1},
    {nodeId: 'privacy_gate', edgeFromPrev: 'ingest_to_gate', headline: `Ad data consent · ${row.consent}`,
      detail: row.state === 'blocked' ? row.message : 'The row passed upload validation.', funnelStageIdx: -1},
  ];

  const statusText = receiptStates[row.state] || row.state;
  if (row.state === 'blocked') {
    steps.push({nodeId: 'quarantine_bay', edgeFromPrev: 'gate_to_quarantine', headline: statusText, detail: row.message, funnelStageIdx: -1});
    return {tone: 'rose', statusText, steps};
  }

  steps.push({nodeId: 'data_manager', edgeFromPrev: 'gate_to_dm',
    headline: batch.assigned ? batch.destination.name : 'Awaiting destination assignment',
    detail: row.state === 'ready' ? statusText : row.message, funnelStageIdx: -1});
  if (row.state !== 'ready' && row.state !== 'sending') {
    steps.push({nodeId: 'attribution_core', edgeFromPrev: 'dm_to_attr', headline: statusText,
      detail: row.reference ? `${row.message} Receipt ${row.reference}.` : row.message, funnelStageIdx: -1});
  }
  const tone = row.state === 'failed' ? 'rose' : row.state === 'uncertain' ? 'amber' : row.state === 'ready' || row.state === 'sending' ? 'sky' : 'emerald';
  return {tone, statusText, steps};
}

function buildDynamicRoute(controls: SimControls, outcome: Outcome): {
  tone: 'emerald' | 'sky' | 'rose' | 'indigo' | 'amber';
  statusText: string;
  steps: DynamicStep[];
} {
  if (controls.audienceOnly) {
    return {
      tone: controls.consentGranted ? 'indigo' : 'rose',
      statusText: controls.consentGranted ? 'Audience List Only · 0 SQLs Reported' : 'Audience Held · Consent Denied',
      steps: [
        {
          nodeId: 'zura_ingest',
          headline: 'Account list sent to Customer Match (not Conversions)',
          detail:
            'Marketer syncs existing customer records for retargeting or excluding accounts from search spend.',
          funnelStageIdx: -1,
        },
        {
          nodeId: 'privacy_gate',
          edgeFromPrev: 'ingest_to_gate',
          headline: 'Email hashed (SHA-256) and consent checked',
          detail:
            'Customer identifiers are hashed safely and routed strictly to Google Audiences.',
          funnelStageIdx: -1,
        },
        controls.consentGranted ? {
          nodeId: 'audience_silo',
          edgeFromPrev: 'gate_to_audience',
          headline: 'Eligible for Customer Match (0 SQL conversions)',
          detail: 'This record can be reviewed for audience targeting separately from conversion delivery.',
          funnelStageIdx: -1,
        } : {
          nodeId: 'quarantine_bay',
          edgeFromPrev: 'gate_to_quarantine',
          headline: 'Audience member held (Consent Denied)',
          detail: 'Adding audience members requires both ad data and personalization consent.',
          funnelStageIdx: -1,
        },
      ],
    };
  }

  const eclExpired = controls.daysSinceClick > 63;
  const gclidExpired = controls.daysSinceClick > 90;
  const isHardExpired = controls.gclidPresent ? gclidExpired : eclExpired;
  const isClosedSale = outcome === 'completed_sale';
  const outcomeStage = isClosedSale ? 4 : outcome === 'qualified_lead' ? 1 : outcome === 'converted_lead' ? 2 : 3;

  const step1: DynamicStep = {
    nodeId: 'ad_click',
    headline: controls.gclidPresent
      ? 'Prospect clicks your Google Ad (GCLID receipt saved)'
      : 'Prospect switches devices (GCLID lost — will use ECL)',
    detail: controls.gclidPresent
      ? 'Google issues a Click ID and starts two clocks: 63 days for Enhanced Conversions for Leads (ECL) and 90 days for GCLID.'
      : 'Without GCLID, attribution relies on Enhanced Conversions for Leads, which expires strictly at 63 days.',
    funnelStageIdx: 0,
  };

  const step2: DynamicStep = {
    nodeId: 'website_tag',
    edgeFromPrev: 'ad_to_tag',
    headline: controls.consentGranted
      ? 'Website inquiry captured + Consent GRANTED'
      : 'Website inquiry records Consent DENIED',
    detail: controls.consentGranted
      ? 'Site saves GCLID + consented email/phone. Raw form fills are tracked only so junk leads never train bidding.'
      : 'Prospect declined ad data sharing; consent enforcement records Consent = DENIED automatically.',
    funnelStageIdx: 1,
  };

  const step3: DynamicStep = {
    nodeId: 'sales_outcome',
    edgeFromPrev: 'tag_to_sales',
    headline: `Day ${controls.daysSinceClick}: CRM records ${outcomes[outcome]}`,
    detail: 'The recorded outcome and its click age are checked together before delivery.',
    funnelStageIdx: outcomeStage,
  };

  if (!controls.sendConversionApi) {
    return {
      tone: 'amber',
      statusText: 'Blind Bidding · Google Only Sees Raw Forms',
      steps: [
        step1,
        step2,
        step3,
        {
          nodeId: 'blind_bidding',
          edgeFromPrev: 'sales_to_blind',
          headline: 'Loop broken — Google never learns which leads booked meetings',
          detail:
            'Smart Bidding optimizes for cheap website forms instead of qualified sales meetings, flooding reps with low-intent leads.',
          funnelStageIdx: -1,
        },
      ],
    };
  }

  const step4: DynamicStep = {
    nodeId: 'zura_ingest',
    edgeFromPrev: 'sales_to_ingest',
    headline: 'CRM milestone is ready for conversion review',
    detail: 'Dual Motion validates the record using the same checks as a CRM upload.',
    funnelStageIdx: outcomeStage,
  };

  if (!controls.consentGranted) {
    return {
      tone: 'rose',
      statusText: 'Blocked · Consent Denied',
      steps: [
        step1,
        step2,
        step3,
        step4,
        {
          nodeId: 'privacy_gate',
          edgeFromPrev: 'ingest_to_gate',
          headline: 'Privacy gate stops event (Consent Denied)',
          detail: 'The pipeline never sends customer identifiers without valid ad consent.',
          funnelStageIdx: -1,
        },
        {
          nodeId: 'quarantine_bay',
          edgeFromPrev: 'gate_to_quarantine',
          headline: 'Held safely (0 unconsented records uploaded)',
          detail: 'Protected automatically for compliance.',
          funnelStageIdx: -1,
        },
      ],
    };
  }

  if (isHardExpired) {
    return {
      tone: 'rose',
      statusText: controls.gclidPresent
        ? `Lost · Day ${controls.daysSinceClick} (>90d Limit)`
        : `ECL Lost · Day ${controls.daysSinceClick} (>63d Limit)`,
      steps: [
        step1,
        step2,
        step3,
        step4,
        {
          nodeId: 'privacy_gate',
          edgeFromPrev: 'ingest_to_gate',
          headline: controls.gclidPresent
            ? `Day ${controls.daysSinceClick}: Both ECL (63d) & GCLID (90d) expired`
            : `Day ${controls.daysSinceClick}: ECL 63-day limit expired (no GCLID)`,
          detail: controls.gclidPresent
            ? `Waiting ${controls.daysSinceClick} days misses Google’s 90-day GCLID and 63-day ECL limits—Google will not import it.`
            : `Enhanced Conversions for Leads expires on Day 63. Without GCLID, Day ${controls.daysSinceClick} is permanently dropped.`,
          funnelStageIdx: 4,
        },
        {
          nodeId: 'quarantine_bay',
          edgeFromPrev: 'gate_to_quarantine',
          headline: 'Blocked — bid on short-term SQL (Day 6–14) instead',
          detail:
            'Optimizing Google Ads on Meeting Booked or Meeting Held provides a signal well before Day 63.',
          funnelStageIdx: 4,
        },
      ],
    };
  }

  const gclidOnlyAfter63 = controls.gclidPresent && eclExpired && !gclidExpired;
  const eclBackupOnly = !controls.gclidPresent && !eclExpired;

  return {
    tone: eclBackupOnly || gclidOnlyAfter63 ? 'sky' : 'emerald',
    statusText: gclidOnlyAfter63
      ? `GCLID Eligible · Day ${controls.daysSinceClick} (ECL >63d)`
      : eclBackupOnly
        ? `ECL Eligible · Day ${controls.daysSinceClick} (≤63d)`
        : `Eligible · Day ${controls.daysSinceClick} (GCLID + Email)`,
    steps: [
      step1,
      step2,
      step3,
      step4,
      {
        nodeId: 'privacy_gate',
        edgeFromPrev: 'ingest_to_gate',
        headline: gclidOnlyAfter63
          ? `Day ${controls.daysSinceClick}: ECL passed 63d, GCLID still saves it (≤90d)`
          : eclBackupOnly
            ? `Day ${controls.daysSinceClick} ≤ 63d: hashed email eligible for ECL`
            : `Day ${controls.daysSinceClick} ≤ 63d: Both GCLID + ECL ready`,
        detail: gclidOnlyAfter63
          ? 'GCLID keeps matching up to Day 90, though sending SQL earlier (Days 6–14) protects cross-device ECL matches too.'
          : eclBackupOnly
            ? 'Hashed email can be included as a match identifier when the click is within the 63-day window.'
            : 'Fast SQL reporting beats both Google deadlines and feeds Smart Bidding fresh revenue-weighted signals.',
        funnelStageIdx: 3,
      },
      {
        nodeId: 'data_manager',
        edgeFromPrev: 'gate_to_dm',
        headline: 'Ready for review before delivery',
        detail:
          'The sample record passed the local checks. Review CRM data to prepare a real upload.',
        funnelStageIdx: 3,
      },
      {
        nodeId: 'attribution_core',
        edgeFromPrev: 'dm_to_attr',
        headline: 'Google Ads can use accepted primary conversions for bidding',
        detail:
          'Google Ads determines whether a delivered conversion is matched and attributed.',
        funnelStageIdx: 3,
      },
    ],
  };
}

export function FlowAndFunnelPage() {
  // Interactive Report & Funnel State
  const [adSpend, setAdSpend] = useState<number>(8000);
  const [monthlyInquiries, setMonthlyInquiries] = useState<number>(200);
  const [avgDealValue, setAvgDealValue] = useState<number>(12000);
  const [salesCycleDays, setSalesCycleDays] = useState<number>(120);
  const [sqlTarget, setSqlTarget] = useState<SqlTargetId>('meeting_held');
  const [selectedStageIdx, setSelectedStageIdx] = useState<number>(3);
  const [expandedStageIdx, setExpandedStageIdx] = useState<number | null>(null);

  // User-Defined Conversion Rates & Signal Quality Lift (Powers Funnel + ROI Estimator)
  const [meetingBookedRatePct, setMeetingBookedRatePct] = useState<number>(24);
  const [meetingShowRatePct, setMeetingShowRatePct] = useState<number>(70);
  const [sqlWinRatePct, setSqlWinRatePct] = useState<number>(24);
  const [signalLiftPct, setSignalLiftPct] = useState<number>(35);

  // Interactive Flowchart State
  const [controls, setControls] = useState<SimControls>(PRESETS[0].controls);
  const [activePreset, setActivePreset] = useState<PresetId | null>('sql_meeting_held');
  const [flowOutcome, setFlowOutcome] = useState<Outcome>('meeting_held');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [validationError, setValidationError] = useState(false);
  const [validationRetry, setValidationRetry] = useState(0);
  const evidence = useRef<HTMLDialogElement>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [imported, setImported] = useState<ConversionBatchDetail | null>(null);
  const [showImported, setShowImported] = useState(false);
  const [rowNumber, setRowNumber] = useState<number | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceError, setTraceError] = useState('');
  const [exportMonths, setExportMonths] = useState<Record<string, number> | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState(false);
  const [exportMonth, setExportMonth] = useState('');
  const [inquirySource, setInquirySource] = useState('');

  const loadRecordedInquiries = async () => {
    setExportLoading(true);
    setExportError(false);
    try {
      const replay = await fetchHistoricalReplay();
      const totals: Record<string, number> = {};
      for (const row of replay?.ads.timeline ?? []) {
        if (row.platform === 'google' && /^\d{4}-\d{2}-\d{2}$/.test(row.date)
          && Number(row.outcome_rows) > 0 && typeof row.inquiries === 'number' && Number.isSafeInteger(row.inquiries) && row.inquiries >= 0) {
          const month = row.date.slice(0, 7);
          totals[month] = (totals[month] ?? 0) + row.inquiries;
        }
      }
      setExportMonths(totals);
      setExportMonth(Object.keys(totals).sort().at(-1) ?? '');
    } catch {
      setExportError(true);
    } finally {
      setExportLoading(false);
    }
  };
  const openWorkspaceData = () => {
    evidence.current?.showModal();
    if (!exportMonths && !exportLoading) void loadRecordedInquiries();
  };
  const [stepIdx, setStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState<number>(1350);
  const [selectedNodeId, setSelectedNodeId] = useState<FlowNodeId>('ad_click');

  const [tokenPoint, setTokenPoint] = useState<{ x: number; y: number } | null>(null);
  const pathRefs = useRef<Record<string, SVGPathElement | null>>({});
  const flowchartRef = useRef<HTMLElement | null>(null);

  // Demand Waterfall + Revenue & ROI Math (Powered by User-Defined Conversion Rates)
  const report = useMemo(() => {
    const inquiries = monthlyInquiries;
    const meetingBooked = Math.max(1, Math.round(inquiries * (meetingBookedRatePct / 100)));
    const meetingHeld = Math.max(1, Math.round(meetingBooked * (meetingShowRatePct / 100)));
    const proposalSent = Math.max(1, Math.round(meetingHeld * 0.6));
    const closedWonExact = meetingHeld * (sqlWinRatePct / 100);
    const closedWon = Math.max(1, Math.round(closedWonExact));

    // Keep MQL and SAL geometrically consistent above Meeting Booked
    const sals = Math.min(inquiries, Math.max(meetingBooked, Math.round(inquiries * Math.max(0.35, (meetingBookedRatePct / 100) * 1.4))));
    const mqls = Math.min(inquiries, Math.max(sals, Math.round(inquiries * Math.max(0.55, (meetingBookedRatePct / 100) * 1.9))));

    const bookedWinRatePct = Math.min(100, Math.round((closedWonExact / Math.max(1, meetingBooked)) * 100));
    const heldWinRatePct = sqlWinRatePct;
    const proposalWinRatePct = Math.min(100, Math.round((closedWonExact / Math.max(1, proposalSent)) * 100));

    const goalOptions: Record<
      SqlTargetId,
      {
        id: SqlTargetId;
        shortLabel: string;
        stageTitle: string;
        avgDays: number;
        signals: number;
        winRatePct: number;
        proxyValue: number;
        eclSafe: boolean;
        gclidSafe: boolean;
        hits30: boolean;
        summary: string;
      }
    > = {
      meeting_booked: {
        id: 'meeting_booked',
        shortLabel: 'SQL · Meeting Booked',
        stageTitle: 'SQL — Meeting Booked',
        avgDays: 6,
        signals: meetingBooked,
        winRatePct: bookedWinRatePct,
        proxyValue: Math.round((closedWonExact / Math.max(1, meetingBooked)) * avgDealValue),
        eclSafe: true,
        gclidSafe: true,
        hits30: meetingBooked >= 30,
        summary:
          'Highest monthly signal volume inside 6 days. Good for smaller budgets, though includes some meeting no-shows.',
      },
      meeting_held: {
        id: 'meeting_held',
        shortLabel: 'SQL · Meeting Held',
        stageTitle: 'SQL — Meeting Held',
        avgDays: 11,
        signals: meetingHeld,
        winRatePct: heldWinRatePct,
        proxyValue: Math.round((heldWinRatePct / 100) * avgDealValue),
        eclSafe: true,
        gclidSafe: true,
        hits30: meetingHeld >= 30,
        summary:
          'Recommended short-term goal: filters out no-shows, hits ~30+ signals/mo, and lands 52 days before Google’s 63-day ECL cutoff.',
      },
      proposal_sent: {
        id: 'proposal_sent',
        shortLabel: 'SQL · Proposal Sent',
        stageTitle: 'SQL — Proposal Sent',
        avgDays: 24,
        signals: proposalSent,
        winRatePct: proposalWinRatePct,
        proxyValue: Math.round((closedWonExact / Math.max(1, proposalSent)) * avgDealValue),
        eclSafe: true,
        gclidSafe: true,
        hits30: proposalSent >= 30,
        summary:
          'Strong buying intent inside 24 days, but may fall under ~30 signals/month unless inquiry volume is higher.',
      },
      wait_closed_won: {
        id: 'wait_closed_won',
        shortLabel: 'Closed-Won Sale',
        stageTitle: 'Closed-Won Sale',
        avgDays: salesCycleDays,
        signals: closedWon,
        winRatePct: 100,
        proxyValue: avgDealValue,
        eclSafe: salesCycleDays <= 63,
        gclidSafe: salesCycleDays <= 90,
        hits30: closedWon >= 30,
        summary:
          salesCycleDays > 90
            ? `At ${salesCycleDays} days (${(salesCycleDays / 30).toFixed(1)} mo), both ECL (63d) and GCLID (90d) expire—Google drops these conversions completely.`
            : `Only ${closedWon} signals/month is far below Google’s ~30/mo learning threshold.`,
      },
    };

    const active = goalOptions[sqlTarget];
    const sqlCount = sqlTarget === 'wait_closed_won' ? meetingHeld : active.signals;
    const sqlLabel =
      sqlTarget === 'wait_closed_won' ? 'SQL — Meeting Held' : active.stageTitle;
    const sqlDay = sqlTarget === 'wait_closed_won' ? 11 : active.avgDays;

    const pipelineValue = Math.round(closedWonExact * avgDealValue);
    const costPerSignal = active.signals > 0 ? Math.round(adSpend / active.signals) : 0;
    const roas = adSpend > 0 ? pipelineValue / adSpend : 0;

    // Revenue & ROI Estimation: Baseline (Form-Only) vs Improved Signal Quality (Short-Term SQL API)
    const signalExpiredBlocked = sqlTarget === 'wait_closed_won' && salesCycleDays > 90;
    const effectiveLiftPct = signalExpiredBlocked ? 0 : signalLiftPct;
    const liftMultiplier = 1 + effectiveLiftPct / 100;

    const baselineMeetings = meetingHeld;
    const baselineDealsExact = closedWonExact;
    const baselineRevenue = Math.round(baselineDealsExact * avgDealValue);
    const baselineRoiPct = adSpend > 0 ? Math.round(((baselineRevenue - adSpend) / adSpend) * 100) : 0;
    const baselineRoas = adSpend > 0 ? baselineRevenue / adSpend : 0;
    const baselineCostPerDeal =
      baselineDealsExact > 0 ? Math.round(adSpend / baselineDealsExact) : 0;

    const improvedMeetings = Math.round(baselineMeetings * liftMultiplier);
    const improvedDealsExact = baselineDealsExact * liftMultiplier;
    const improvedRevenue = Math.round(improvedDealsExact * avgDealValue);
    const improvedRoiPct = adSpend > 0 ? Math.round(((improvedRevenue - adSpend) / adSpend) * 100) : 0;
    const improvedRoas = adSpend > 0 ? improvedRevenue / adSpend : 0;
    const improvedCostPerDeal =
      improvedDealsExact > 0 ? Math.round(adSpend / improvedDealsExact) : 0;

    const monthlyRevenueUplift = improvedRevenue - baselineRevenue;
    const annualRevenueUplift = monthlyRevenueUplift * 12;
    const roiGainPts = improvedRoiPct - baselineRoiPct;
    const extraMeetingsPerMonth = improvedMeetings - baselineMeetings;
    const extraDealsPerMonth = improvedDealsExact - baselineDealsExact;

    // 5 Actual Report Funnel Tiers (with Google Ads Machine Learning explanations)
    const tiers = [
      {
        idx: 0,
        code: 'Inquiry',
        title: 'Website Inquiries',
        count: inquiries,
        pctOfTop: 100,
        stepConvPct: 100,
        dayLabel: 'Day 0',
        roleLabel: 'Track Only',
        roleKind: 'muted' as const,
        fill: '#334155',
        fillHover: '#1E293B',
        preset: 'blind_no_conversion' as PresetId,
        explanation:
          'All ad clicks that submit a form. Captures GCLID + consented email/phone, but never set as Primary Bidding or Google chases low-intent clicks.',
        mlHeadline: 'Captures Click Identity — Never Trains Bidding',
        whyThisMatters:
          'On Day 0, your website tag captures the GCLID receipt and consented email/phone (ECL) so downstream milestones can be matched later. Keeping raw form fills as Track Only prevents Google Ads machine learning from chasing cheap clicks, bots, and price-shoppers who submit forms but never buy.',
        mlEffect: 'Identity foundation only · 0% bidding weight (blocks junk-lead drift)',
        whatGoogleLearns:
          'Without downstream SQL signals, Google treats a spam form the exact same as a real buyer.',
      },
      {
        idx: 1,
        code: 'MQL',
        title: 'Marketing Qualified',
        count: mqls,
        pctOfTop: Math.round((mqls / inquiries) * 100),
        stepConvPct: Math.round((mqls / inquiries) * 100),
        dayLabel: 'Day 1–2',
        roleLabel: 'Secondary',
        roleKind: 'muted' as const,
        fill: '#0284C7',
        fillHover: '#0369A1',
        preset: 'enhanced_no_gclid' as PresetId,
        explanation:
          'Leads matching territory, budget fit, and service criteria. Tracked as Secondary observation so you can measure funnel health without double-counting.',
        mlHeadline: 'Filters Out-of-Scope Traffic Without Double-Counting',
        whyThisMatters:
          'MQLs remove wrong regions, job seekers, and unqualified fits within 24–48 hours. Sending MQL as a Secondary conversion lets marketers audit which campaigns bring relevant leads without distorting Smart Bidding’s primary optimization target.',
        mlEffect: 'Diagnostic observation signal · Safely inside 63d ECL & 90d GCLID windows',
        whatGoogleLearns:
          'Reported in your campaign columns for marketer review without diluting Primary SQL bidding.',
      },
      {
        idx: 2,
        code: 'SAL',
        title: 'Sales Accepted',
        count: sals,
        pctOfTop: Math.round((sals / inquiries) * 100),
        stepConvPct: Math.round((sals / Math.max(1, mqls)) * 100),
        dayLabel: 'Day 3–5',
        roleLabel: 'Secondary',
        roleKind: 'muted' as const,
        fill: '#0D9488',
        fillHover: '#0F766E',
        preset: 'sql_meeting_held' as PresetId,
        explanation:
          'Sales accepts the lead and begins booking a discovery call. Kept as Secondary observation until the SQL milestone happens.',
        mlHeadline: 'Human Sales Check Before Confirming Intent',
        whyThisMatters:
          'Sales reps verify the contact is reachable and fits your ideal customer profile (Days 3–5). Holding this as Secondary stops Google’s algorithm from over-bidding on leads that look good on paper but never show up for a meeting.',
        mlEffect: 'Bridges Marketing & Sales handoff · Protects Smart Bidding from no-shows',
        whatGoogleLearns:
          'Measures Sales acceptance speed so you spot lead-quality drops before revenue suffers.',
      },
      {
        idx: 3,
        code: 'SQL',
        title: sqlLabel,
        count: sqlCount,
        pctOfTop: Math.round((sqlCount / inquiries) * 100),
        stepConvPct: Math.round((sqlCount / Math.max(1, sals)) * 100),
        dayLabel: `~Day ${sqlDay}`,
        roleLabel:
          sqlTarget === 'wait_closed_won'
            ? 'Skipped'
            : `Primary · USD ${active.proxyValue.toLocaleString()}`,
        roleKind: sqlTarget === 'wait_closed_won' ? ('amber' as const) : ('primary' as const),
        fill: sqlTarget === 'wait_closed_won' ? '#D97706' : '#059669',
        fillHover: sqlTarget === 'wait_closed_won' ? '#B45309' : '#047857',
        preset: 'sql_meeting_held' as PresetId,
        explanation:
          sqlTarget === 'wait_closed_won'
            ? 'Skipped when waiting for Closed-Won. Switching Primary Bidding back here gives Google clean signals inside 1–2 weeks.'
            : `${active.summary} Example Proxy Value = ${active.winRatePct}% win rate × USD ${avgDealValue.toLocaleString()} avg deal.`,
        mlHeadline: 'The Google Ads Machine Learning Sweet Spot',
        whyThisMatters:
          `Google Smart Bidding performs best with ~30+ verified conversions/month and short conversion lag. Sending ${sqlLabel} (~Day ${sqlDay}) with an expected USD ${active.proxyValue.toLocaleString()} proxy value trains auction-time ML during Weeks 1–2—safely beating both the 63-day ECL and 90-day GCLID limits.`,
        mlEffect: `Primary bidding signal (${sqlCount}/mo · Day ${sqlDay}) · Fuels value-based Smart Bidding`,
        whatGoogleLearns:
          'Identifies the exact search intent, demographics, devices, and times of day that turn into qualified sales meetings.',
      },
      {
        idx: 4,
        code: 'Closed-Won',
        title: `Closed-Won (${(salesCycleDays / 30).toFixed(1)} mo)`,
        count: closedWon,
        pctOfTop: Math.max(1, Math.round((closedWon / inquiries) * 100)),
        stepConvPct: Math.round((closedWonExact / Math.max(1, sqlCount)) * 100),
        dayLabel: `Day ${salesCycleDays}`,
        roleLabel:
          salesCycleDays > 90
            ? 'Expired (>90d)'
            : salesCycleDays > 63
              ? 'ECL Expired (>63d)'
              : 'Low Volume',
        roleKind: 'danger' as const,
        fill: sqlTarget === 'wait_closed_won' ? '#DC2626' : '#94A3B8',
        fillHover: sqlTarget === 'wait_closed_won' ? '#B91C1C' : '#64748B',
        preset: 'long_cycle_120_day' as PresetId,
        explanation: `Final signed revenue at Day ${salesCycleDays}. Bypassed for real-time Google Ads bidding because it crosses Google’s 63d ECL / 90d GCLID windows—instead, its win rate prices your SQL above.`,
        mlHeadline: 'Calibrates SQL Value — Too Slow for Real-Time ML',
        whyThisMatters: `At Day ${salesCycleDays} (${(salesCycleDays / 30).toFixed(1)} months), final sales arrive after Google’s 63-day ECL and 90-day GCLID attribution clocks expire—and typically produce too few monthly events (${closedWon}/mo) for Smart Bidding to learn. Use Closed-Won win rates (${sqlWinRatePct}%) to price your SQL milestone instead.`,
        mlEffect:
          salesCycleDays > 90
            ? 'Dropped by Google (>90d) · Use strictly to calculate SQL proxy value'
            : 'Too slow & low-volume for bidding · Use to calibrate SQL proxy value',
        whatGoogleLearns:
          'When bidding waits for Closed-Won, Google’s ML stays starved of data throughout a 3-month paid campaign.',
      },
    ];

    return {
      goalOptions,
      active,
      tiers,
      meetingBooked,
      meetingHeld,
      closedWonExact,
      pipelineValue,
      costPerSignal,
      roas,
      roi: {
        signalExpiredBlocked,
        effectiveLiftPct,
        baselineMeetings,
        baselineDealsExact,
        baselineRevenue,
        baselineRoiPct,
        baselineRoas,
        baselineCostPerDeal,
        improvedMeetings,
        improvedDealsExact,
        improvedRevenue,
        improvedRoiPct,
        improvedRoas,
        improvedCostPerDeal,
        monthlyRevenueUplift,
        annualRevenueUplift,
        roiGainPts,
        extraMeetingsPerMonth,
        extraDealsPerMonth,
      },
    };
  }, [
    adSpend,
    monthlyInquiries,
    avgDealValue,
    salesCycleDays,
    sqlTarget,
    meetingBookedRatePct,
    meetingShowRatePct,
    sqlWinRatePct,
    signalLiftPct,
  ]);

  const selectedTier = report.tiers[selectedStageIdx] ?? report.tiers[3];

  const selectRow = (line: number | null) => {
    setRowNumber(line);
    setStepIdx(0);
    setIsPlaying(false);
  };
  const displayBatch = (batch: ConversionBatchDetail) => {
    setImported(batch);
    setTraceError('');
    selectRow(null);
    setShowImported(true);
    requestAnimationFrame(() => flowchartRef.current?.scrollIntoView({block: 'start'}));
  };
  const loadTrace = async (id: string, open: boolean) => {
    setTraceLoading(true);
    setTraceError('');
    try {
      const batch = await getConversionBatch(id);
      if (batch.destination.platform !== 'google' || batch.operation !== 'conversion') {
        throw new Error('This flow displays Google Ads conversion batches.');
      }
      if (open) displayBatch(batch);
      else setImported(batch);
    } catch (reason) {
      setTraceError(reason instanceof Error ? reason.message : 'Could not load the CRM batch.');
    } finally {
      setTraceLoading(false);
    }
  };
  const linkedBatch = new URLSearchParams(location.search).get('batch');
  useEffect(() => {
    if (linkedBatch) void loadTrace(linkedBatch, true);
  }, [linkedBatch]);

  const realRow = showImported ? imported?.rows.find(row => row.line === rowNumber) || imported?.rows[0] : undefined;
  const route = useMemo(() => imported && realRow ? reviewedRoute(imported, realRow) : buildDynamicRoute(controls, flowOutcome),
    [controls, flowOutcome, imported, realRow]);
  // The example is paused while a CRM batch is open.

  useEffect(() => {
    if (showImported) return;
    let current = true;
    setValidation(null);
    setValidationError(false);
    const timer = window.setTimeout(() => {
      void runConversionAction<ValidationResult>({
        action: 'simulate_scenario',
        days_since_click: controls.daysSinceClick,
        gclid_present: controls.gclidPresent,
        consent_granted: controls.consentGranted,
        send_conversion_api: controls.sendConversionApi,
        audience_only: controls.audienceOnly,
        outcome: flowOutcome,
      }).then(result => {
        if (current) setValidation(result);
      }).catch(() => {
        if (current) setValidationError(true);
      });
    }, 200);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [controls, flowOutcome, showImported, validationRetry]);

  const uploadQuery = new URLSearchParams({
    conversion_view: controls.audienceOnly ? 'audiences' : 'delivery',
    platform: 'google',
    ...(controls.audienceOnly ? {operation: 'add'} : {
      conversion_outcome: flowOutcome,
      conversion_matching: controls.gclidPresent ? 'gclid' : 'email',
    }),
  });
  const validationText = validation?.state === 'ready'
    ? `Eligible locally · ${validation.matched_by}`
    : validation?.state === 'blocked'
      ? `Held · ${validation.message}`
      : validation?.state === 'skipped'
        ? validation.message
        : validationError ? 'Could not check this scenario.' : 'Checking this scenario…';
  const safeStepIdx = Math.min(stepIdx, route.steps.length - 1);
  const currentStep = route.steps[safeStepIdx];

  useEffect(() => {
    setSelectedNodeId(currentStep.nodeId);
  }, [currentStep.nodeId]);

  useEffect(() => {
    const edgeId = currentStep.edgeFromPrev;
    if (!edgeId) {
      const node = FLOW_NODES.find((n) => n.id === currentStep.nodeId);
      setTokenPoint(node ? { x: node.x, y: node.y } : null);
      return;
    }

    const pathEl = pathRefs.current[edgeId];
    if (!pathEl) return;

    const totalLen = pathEl.getTotalLength();
    const duration = Math.min(580, speedMs * 0.44);
    const start = performance.now();
    let raf = 0;

    const animate = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const pt = pathEl.getPointAtLength(eased * totalLen);
      setTokenPoint({ x: pt.x, y: pt.y });
      if (p < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [currentStep, speedMs]);

  useEffect(() => {
    if (expandedStageIdx === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpandedStageIdx(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [expandedStageIdx]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setTimeout(() => {
      if (safeStepIdx < route.steps.length - 1) {
        setStepIdx((prev) => prev + 1);
      } else {
        setIsPlaying(false);
      }
    }, speedMs);
    return () => window.clearTimeout(timer);
  }, [isPlaying, safeStepIdx, route.steps.length, speedMs]);

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setShowImported(false);
    setActivePreset(preset.id);
    setControls(preset.controls);
    setFlowOutcome(preset.id === 'long_cycle_120_day' || preset.controls.daysSinceClick === 72
      ? 'completed_sale' : 'meeting_held');
    setStepIdx(0);
    setIsPlaying(true);
  };

  const updateControl = (patch: Partial<SimControls>) => {
    setActivePreset(null);
    setControls((prev) => ({
      ...prev,
      ...patch,
      audienceOnly: patch.audienceOnly ?? prev.audienceOnly,
    }));
    setStepIdx(0);
    setIsPlaying(true);
  };

  const runFlowForFunnelStage = (stageIdx: number, shouldScroll = true) => {
    setShowImported(false);
    setSelectedStageIdx(stageIdx);
    const stageOutcomes: Outcome[] = ['qualified_lead', 'qualified_lead', 'converted_lead',
      sqlTarget === 'wait_closed_won' ? 'meeting_held' : sqlTarget, 'completed_sale'];
    setFlowOutcome(stageOutcomes[stageIdx] ?? 'meeting_held');

    if (stageIdx === 0) {
      // Raw Inquiry / Form Fill without sending SQL back -> Blind Form Bidding
      setActivePreset('blind_no_conversion');
      setControls({
        gclidPresent: true,
        daysSinceClick: 1,
        consentGranted: true,
        sendConversionApi: false,
        audienceOnly: false,
      });
    } else if (stageIdx === 1) {
      // MQL -> Cross-device ECL Backup match inside 63d window
      setActivePreset('enhanced_no_gclid');
      setControls({
        gclidPresent: false,
        daysSinceClick: 2,
        consentGranted: true,
        sendConversionApi: true,
        audienceOnly: false,
      });
    } else if (stageIdx === 2) {
      // SAL -> Fast sales handoff with GCLID + ECL
      setActivePreset('sql_meeting_held');
      setControls({
        gclidPresent: true,
        daysSinceClick: 5,
        consentGranted: true,
        sendConversionApi: true,
        audienceOnly: false,
      });
    } else if (stageIdx === 3) {
      // Short-Term SQL Goal -> uses selected SQL target's exact day (Day 6 / 11 / 24)
      const sqlDay = sqlTarget === 'wait_closed_won' ? 11 : report.active.avgDays;
      setActivePreset('sql_meeting_held');
      setControls({
        gclidPresent: true,
        daysSinceClick: sqlDay,
        consentGranted: true,
        sendConversionApi: true,
        audienceOnly: false,
      });
    } else {
      // Closed-Won Sale -> uses the actual Sales Closing Cycle slider (e.g., Day 120!)
      const presetMatch: PresetId | null =
        salesCycleDays > 90
          ? 'long_cycle_120_day'
          : salesCycleDays > 63
            ? 'ecl_expired_63_saved_by_gclid'
            : null;
      setActivePreset(presetMatch);
      setControls({
        gclidPresent: true,
        daysSinceClick: salesCycleDays,
        consentGranted: true,
        sendConversionApi: true,
        audienceOnly: false,
      });
    }

    setStepIdx(0);
    setIsPlaying(true);

    if (shouldScroll) {
      window.setTimeout(() => {
        flowchartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 60);
    }
  };

  const handleSelectGoal = (id: SqlTargetId) => {
    setShowImported(false);
    setSqlTarget(id);
    setFlowOutcome(id === 'wait_closed_won' ? 'completed_sale' : id);
    const stageIdx = id === 'wait_closed_won' ? 4 : 3;
    setSelectedStageIdx(stageIdx);
    const targetDay = report.goalOptions[id].avgDays;
    setActivePreset(
      id === 'wait_closed_won' && targetDay > 90
        ? 'long_cycle_120_day'
        : id !== 'wait_closed_won'
          ? 'sql_meeting_held'
          : null
    );
    setControls({
      gclidPresent: true,
      daysSinceClick: targetDay,
      consentGranted: true,
      sendConversionApi: true,
      audienceOnly: false,
    });
    setStepIdx(0);
    setIsPlaying(true);
  };

  const visitedNodeIds = useMemo(() => {
    const set = new Set<FlowNodeId>();
    for (let i = 0; i <= safeStepIdx && i < route.steps.length; i++) {
      set.add(route.steps[i].nodeId);
    }
    return set;
  }, [route.steps, safeStepIdx]);

  const visitedEdgeIds = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i <= safeStepIdx && i < route.steps.length; i++) {
      const e = route.steps[i].edgeFromPrev;
      if (e) set.add(e);
    }
    return set;
  }, [route.steps, safeStepIdx]);

  const inspectedNode =
    FLOW_NODES.find((n) => n.id === selectedNodeId) ?? FLOW_NODES[0];

  const tokenColor =
    route.tone === 'rose'
      ? '#DC2626'
      : route.tone === 'indigo'
        ? '#4F46E5'
        : route.tone === 'amber'
          ? '#D97706'
          : route.tone === 'sky'
            ? '#0284C7'
            : '#0D9488';

  // True Centered Trapezoid Geometry for the 5-Tier Report Funnel SVG
  // Widths smoothly taper from 340px (top) down to 108px (bottom) while staying proportional & legible
  const funnelGeometry = useMemo(() => {
    const cx = 364;
    const minW = 104;
    const maxW = 340;
    const topPct = report.tiers.map((t, idx) => {
      if (idx === 0) return maxW;
      // Blend true conversion ratio with clean geometric taper so small percentages stay readable
      const scaled = minW + Math.pow(t.pctOfTop / 100, 0.58) * (maxW - minW);
      return Math.round(Math.max(minW, Math.min(maxW - idx * 24, scaled)));
    });

    const rowH = 62;
    const gap = 8;
    const cutoffGap = 38; // Extra vertical room for the dashed 63d/90d cutoff wall before Closed-Won

    return report.tiers.map((tier, idx) => {
      const yTop = 18 + idx * (rowH + gap) + (idx === 4 ? cutoffGap : 0);
      const yBot = yTop + rowH;
      const wTop = topPct[idx];
      const wBot = idx < report.tiers.length - 1 ? topPct[idx + 1] : Math.max(82, wTop - 22);
      const x1 = cx - wTop / 2;
      const x2 = cx + wTop / 2;
      const x3 = cx + wBot / 2;
      const x4 = cx - wBot / 2;
      return {
        tier,
        yTop,
        yBot,
        yMid: (yTop + yBot) / 2,
        cx,
        points: `${x1},${yTop} ${x2},${yTop} ${x3},${yBot} ${x4},${yBot}`,
      };
    });
  }, [report.tiers]);

  const cutoffY = funnelGeometry[3].yBot + 23;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      <header className="sticky top-0 z-30 h-[60px] bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between gap-2 lg:gap-8">
        <a href="#funnel" className="text-sm sm:text-base font-bold tracking-tight text-slate-900 font-display whitespace-nowrap">
          Google Ads Conversions
        </a>
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600" aria-label="Conversion example">
          <a href="#funnel" className="hover:text-slate-900 whitespace-nowrap">Demand Funnel</a>
          <a href="#campaign-timeline" className="hover:text-slate-900 whitespace-nowrap">Campaign Timeline</a>
          <a href="#flowchart" className="hover:text-slate-900 whitespace-nowrap">Interactive Flowchart</a>
        </nav>
        <div className="flex items-center gap-2">
          <button type="button" onClick={openWorkspaceData}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <Sparkles className="size-3.5" />
            <span className="sr-only sm:not-sr-only">Workspace data</span>
          </button>
          <button type="button" onClick={() => setUploadOpen(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-teal-700 px-2.5 py-2 text-xs font-semibold text-white hover:bg-teal-800">
            <Upload className="size-3.5" />
            Upload signal
          </button>
        </div>
      </header>
      <main className="flex-1 px-3 sm:px-6 py-7">
      <div className="max-w-[1200px] mx-auto space-y-6">
      {/* Page Title & Live Workspace Context */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Google Ads Conversion Report</span>
            <span aria-hidden="true">·</span>
            <span>Demand Waterfall</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{inquirySource ? `Export inquiries · ${inquirySource}` : 'Working Example'}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Google Ads Conversion Funnel &amp; Flow
          </h1>
        </div>

        {/* Short-Term Bidding Goal Segmented Picker */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/75 rounded-lg">
          {(
            ['meeting_booked', 'meeting_held', 'proposal_sent', 'wait_closed_won'] as const
          ).map((id) => {
            const opt = report.goalOptions[id];
            const active = sqlTarget === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => handleSelectGoal(id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  active
                    ? id === 'wait_closed_won'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Report Filters + 4-Column Dashboard KPI Strip */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {/* Compact Interactive Sliders Row */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Monthly Ad Spend</span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                USD {adSpend.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              aria-label="Monthly Ad Spend"
              min={2000}
              max={30000}
              step={1000}
              value={adSpend}
              onChange={(e) => setAdSpend(Number(e.target.value))}
              className="w-full accent-teal-700 cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Monthly Inquiries</span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {monthlyInquiries} / mo
              </span>
            </div>
            <input
              type="range"
              aria-label="Monthly Inquiries"
              min={Math.min(60, monthlyInquiries)}
              max={Math.max(500, monthlyInquiries)}
              step={inquirySource || (monthlyInquiries - 60) % 20 !== 0 ? 1 : 20}
              value={monthlyInquiries}
              onChange={(e) => {
                setMonthlyInquiries(Number(e.target.value));
                setInquirySource('');
              }}
              className="w-full accent-teal-700 cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Avg Closed-Won Deal</span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                USD {avgDealValue.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              aria-label="Avg Closed-Won Deal"
              min={2000}
              max={50000}
              step={1000}
              value={avgDealValue}
              onChange={(e) => setAvgDealValue(Number(e.target.value))}
              className="w-full accent-teal-700 cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Sales Closing Cycle</span>
              <span
                className={`font-mono font-semibold tabular-nums ${
                  salesCycleDays > 90
                    ? 'text-rose-700'
                    : salesCycleDays > 63
                      ? 'text-amber-700'
                      : 'text-teal-700'
                }`}
              >
                {salesCycleDays}d ({(salesCycleDays / 30).toFixed(1)} mo)
              </span>
            </div>
            <input
              type="range"
              aria-label="Sales Closing Cycle"
              min={30}
              max={180}
              step={15}
              value={salesCycleDays}
              onChange={(e) => setSalesCycleDays(Number(e.target.value))}
              className="w-full accent-rose-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Clean 4-Column Executive KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 divide-x divide-slate-200">
          <div className="px-5 py-4">
            <div className="text-xs text-slate-500">Projected Signals / Month</div>
            <div
              className={`mt-1 text-2xl font-bold font-mono tabular-nums ${
                report.active.hits30 ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {report.active.signals}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              {report.active.hits30
                ? 'Meets 30+ Smart Bidding target'
                : 'Below 30/mo learning zone'}
            </div>
          </div>

          <div className="px-5 py-4">
            <div className="text-xs text-slate-500">Time to Signal</div>
            <div
              className={`mt-1 text-2xl font-bold font-mono tabular-nums ${
                report.active.eclSafe
                  ? 'text-emerald-700'
                  : report.active.gclidSafe
                    ? 'text-amber-700'
                    : 'text-rose-700'
              }`}
            >
              Day {report.active.avgDays}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              {report.active.eclSafe
                ? 'Inside 63d ECL & 90d GCLID'
                : report.active.gclidSafe
                  ? 'ECL expired (>63d) · GCLID only'
                  : 'Expired (>90d) · Google drops'}
            </div>
          </div>

          <div className="px-5 py-4">
            <div className="text-xs text-slate-500">Proxy Value / Signal</div>
            <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
              USD {report.active.proxyValue.toLocaleString()}
            </div>
            <div className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums">
              {report.active.winRatePct}% win × USD {avgDealValue.toLocaleString()}
            </div>
          </div>

          <div className="px-5 py-4">
            <div className="text-xs text-slate-500">Expected Pipeline ROAS</div>
            <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-teal-700">
              {report.roas.toFixed(1)}x
            </div>
            <div className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums">
              Cost / SQL: USD {report.costPerSignal.toLocaleString()}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 1: ACTUAL REPORT-STYLE FUNNEL CHART */}
      <section
        id="funnel"
        className="bg-white border border-slate-200 rounded-xl overflow-hidden scroll-mt-20"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Demand Waterfall Funnel
            </h2>
            <p className="text-xs text-slate-500">
              Click any funnel segment to expand <strong className="text-slate-700">Why this matters</strong> for Google Ads machine learning and sync the flowchart below.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
            <span>ECL Limit: 63d</span>
            <span aria-hidden="true">·</span>
            <span>GCLID Limit: 90d</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left (8 cols): Actual Centered SVG Trapezoid Funnel Report + Click-to-Expand Popover */}
          <div className="lg:col-span-8 p-5 relative">
            <div className="overflow-x-auto">
            <svg
              viewBox="0 0 768 416"
              className="w-full min-w-[640px] h-auto select-none"
              role="img"
              aria-label="Demand Waterfall Funnel from Inquiries to Closed-Won Sale"
            >
              {/* Subtle column headers like a BI report */}
              <text x={14} y={10} fontSize={10} fontWeight={600} fill="#64748B">
                STAGE
              </text>
              <text
                x={364}
                y={10}
                textAnchor="middle"
                fontSize={10}
                fontWeight={600}
                fill="#64748B"
              >
                MONTHLY VOLUME &amp; % OF INQUIRIES
              </text>
              <text x={550} y={10} fontSize={10} fontWeight={600} fill="#64748B">
                STEP CONV. · GOOGLE ROLE
              </text>

              {/* Dashed Google Expiry Cutoff Line between SQL and Closed-Won */}
              <g>
                <line
                  x1={12}
                  y1={cutoffY}
                  x2={756}
                  y2={cutoffY}
                  stroke="#E11D48"
                  strokeWidth={1.5}
                  strokeDasharray="6 5"
                />
                <rect
                  x={194}
                  y={cutoffY - 11}
                  width={340}
                  height={22}
                  rx={4}
                  fill="#FFF1F2"
                  stroke="#FECDD3"
                  strokeWidth={1}
                />
                <text
                  x={364}
                  y={cutoffY + 3.5}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={700}
                  fontFamily="JetBrains Mono, monospace"
                  fill="#BE123C"
                >
                  GOOGLE EXPIRY CUTOFF · ECL 63d · GCLID 90d
                </text>
              </g>

              {/* Funnel Trapezoids */}
              {funnelGeometry.map(({ tier, yMid, cx, points }) => {
                const isSelected = selectedStageIdx === tier.idx;
                const isExpanded = expandedStageIdx === tier.idx;
                const isActiveFlow = currentStep.funnelStageIdx === tier.idx;
                const isPrimaryGoal =
                  (tier.idx === 3 && sqlTarget !== 'wait_closed_won') ||
                  (tier.idx === 4 && sqlTarget === 'wait_closed_won');

                return (
                  <g
                    key={tier.code}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onClick={() => {
                      if (expandedStageIdx === tier.idx) {
                        setExpandedStageIdx(null);
                      } else {
                        setExpandedStageIdx(tier.idx);
                        runFlowForFunnelStage(tier.idx, false);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (expandedStageIdx === tier.idx) {
                          setExpandedStageIdx(null);
                        } else {
                          setExpandedStageIdx(tier.idx);
                          runFlowForFunnelStage(tier.idx, false);
                        }
                      }
                    }}
                    className="cursor-pointer group focus:outline-none"
                  >
                    {/* Subtle row highlight when selected or expanded */}
                    <rect
                      x={6}
                      y={yMid - 34}
                      width={756}
                      height={68}
                      rx={8}
                      fill={isExpanded ? '#F0FDFA' : isSelected ? '#F8FAFC' : 'transparent'}
                      stroke={isExpanded ? '#0D9488' : isSelected ? '#CBD5E1' : 'transparent'}
                      strokeWidth={isExpanded ? 1.5 : 1}
                    />

                    {/* Left Label: Stage Name & Timing */}
                    <text
                      x={16}
                      y={yMid - 4}
                      fontSize={12.5}
                      fontWeight={700}
                      fill={isPrimaryGoal ? '#0F172A' : '#1E293B'}
                    >
                      {tier.title}
                    </text>
                    <text
                      x={16}
                      y={yMid + 14}
                      fontSize={11}
                      fontFamily="JetBrains Mono, monospace"
                      fill="#64748B"
                    >
                      {tier.code} · {tier.dayLabel}
                    </text>

                    {/* Center Actual Funnel Trapezoid */}
                    <polygon
                      points={points}
                      fill={isExpanded || isSelected ? tier.fillHover : tier.fill}
                      stroke={
                        isExpanded
                          ? '#0F172A'
                          : isActiveFlow
                            ? '#0F172A'
                            : isPrimaryGoal
                              ? '#047857'
                              : 'none'
                      }
                      strokeWidth={isExpanded || isActiveFlow ? 2.5 : isPrimaryGoal ? 1.5 : 0}
                      opacity={tier.idx === 4 && sqlTarget !== 'wait_closed_won' ? 0.72 : 1}
                    />

                    {/* Crisp Metric Inside Trapezoid */}
                    <text
                      x={cx}
                      y={yMid - 2}
                      textAnchor="middle"
                      fontSize={16}
                      fontWeight={700}
                      fontFamily="JetBrains Mono, monospace"
                      fill="#FFFFFF"
                    >
                      {tier.count}
                    </text>
                    <text
                      x={cx}
                      y={yMid + 15}
                      textAnchor="middle"
                      fontSize={10.5}
                      fontFamily="JetBrains Mono, monospace"
                      fill="rgba(255,255,255,0.88)"
                    >
                      {tier.pctOfTop}% of inquiries
                    </text>

                    {/* Right Column: Step-to-Step Conversion, Google Role & Expand Affordance */}
                    <text
                      x={550}
                      y={yMid - 4}
                      fontSize={11.5}
                      fontWeight={600}
                      fontFamily="JetBrains Mono, monospace"
                      fill="#334155"
                    >
                      {tier.idx === 0 ? '100% baseline' : `${tier.stepConvPct}% from prev`}
                    </text>
                    <text
                      x={550}
                      y={yMid + 14}
                      fontSize={11}
                      fontWeight={tier.roleKind === 'primary' || tier.roleKind === 'danger' ? 700 : 500}
                      fill={
                        tier.roleKind === 'primary'
                          ? '#047857'
                          : tier.roleKind === 'danger'
                            ? '#BE123C'
                            : tier.roleKind === 'amber'
                              ? '#B45309'
                              : '#64748B'
                      }
                    >
                      {tier.roleLabel}
                    </text>

                    <text
                      x={752}
                      y={yMid + 4}
                      textAnchor="end"
                      fontSize={10.5}
                      fontWeight={600}
                      fill={isExpanded ? '#0F766E' : '#64748B'}
                    >
                      {isExpanded ? 'Close ×' : 'Why? ▾'}
                    </text>
                  </g>
                );
              })}
            </svg>
            </div>

            {/* Anchored 'Why This Matters' Popover for Expanded Funnel Segment */}
            {expandedStageIdx !== null && (() => {
              const geom = funnelGeometry[expandedStageIdx];
              if (!geom) return null;
              const { tier, yTop, yBot } = geom;
              const openUpward = expandedStageIdx >= 3;
              const topPct = Math.min(72, Math.max(10, (yBot / 416) * 100));
              const bottomPct = Math.min(72, Math.max(10, ((416 - yTop) / 416) * 100));

              return (
                <div
                  role="dialog"
                  aria-label={`Why ${tier.title} matters for Google Ads machine learning`}
                  className="absolute inset-x-4 sm:left-auto sm:right-6 sm:w-[410px] z-20 bg-white border border-slate-300 rounded-xl shadow-xl p-4 space-y-3"
                  style={openUpward ? { bottom: `${bottomPct}%` } : { top: `${topPct}%` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-teal-700">
                        <Info className="w-3.5 h-3.5" />
                        <span>Why this matters · Google Ads ML</span>
                      </div>
                      <h4 className="mt-0.5 text-sm font-bold text-slate-900">
                        {tier.code}: {tier.mlHeadline}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExpandedStageIdx(null)}
                      aria-label="Close popover"
                      className="p-1 text-slate-400 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {tier.whyThisMatters}
                  </p>

                  <div className="pt-2.5 border-t border-slate-200 space-y-1.5 text-xs">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-slate-500 shrink-0">ML Signal Impact</span>
                      <span className="font-mono text-[11px] font-semibold text-slate-900 text-right">
                        {tier.mlEffect}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-slate-500 shrink-0">What Google Learns</span>
                      <span className="text-[11px] text-slate-700 text-right">
                        {tier.whatGoogleLearns}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedStageIdx(null);
                        runFlowForFunnelStage(tier.idx, true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <Play className="w-3 h-3" />
                      <span>Watch Flow Below</span>
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedStageIdx(null);
                        openWorkspaceData();
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 whitespace-nowrap"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>View workspace data</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Right (4 cols): Clean Selected Stage Inspector + Verified Google Rules */}
          <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-200 p-6 flex flex-col justify-between gap-6 bg-slate-50/40">
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                  <span>{selectedTier.code}</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedTier.dayLabel}</span>
                </div>
                <h3 className="mt-1 text-base font-bold text-slate-900">
                  {selectedTier.title}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-200 font-mono tabular-nums">
                <div>
                  <div className="text-[11px] font-sans text-slate-500">Monthly Volume</div>
                  <div className="mt-0.5 text-lg font-bold text-slate-900">
                    {selectedTier.count} / mo
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-sans text-slate-500">Google Ads Role</div>
                  <div
                    className={`mt-0.5 text-xs font-bold leading-snug ${
                      selectedTier.roleKind === 'primary'
                        ? 'text-emerald-700'
                        : selectedTier.roleKind === 'danger'
                          ? 'text-rose-700'
                          : 'text-slate-700'
                    }`}
                  >
                    {selectedTier.roleLabel}
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {selectedTier.explanation}
              </p>

              <button
                type="button"
                onClick={() => runFlowForFunnelStage(selectedTier.idx, true)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Replay {selectedTier.code} in Flowchart</span>
                <ArrowDownRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Compact Verified Google Rules Reference */}
            <div className="pt-4 border-t border-slate-200 space-y-2 text-xs">
              <div className="font-semibold text-slate-900">
                Click Windows Used in Review
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Enhanced Conversions (ECL)</span>
                <span className="font-mono font-semibold text-slate-900">63 days</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>GCLID Offline Import</span>
                <span className="font-mono font-semibold text-slate-900">90 days</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Customer Match List</span>
                <span className="font-mono text-slate-500">Audiences only</span>
              </div>
              <button
                type="button"
                onClick={openWorkspaceData}
                className="pt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Review funnel settings</span>
              </button>
            </div>
          </div>
        </div>

        {/* Integrated Revenue & ROI Estimation Tool (Directly Linked to Funnel Conversion Rates) */}
        <div className="border-t border-slate-200 bg-slate-50/50">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Revenue &amp; ROI Estimator — Financial Impact of Improved Signal Quality
              </h3>
              <p className="text-xs text-slate-500">
                Adjust your meeting &amp; SQL conversion rates below (updates the funnel above in real time) to estimate potential monthly &amp; annual ROI from sending SQL signals to Google Ads.
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-200/75 rounded-lg">
              {[
                { label: '+20% Conservative', val: 20 },
                { label: '+35% Typical', val: 35 },
                { label: '+50% Strong', val: 50 },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setSignalLiftPct(opt.val)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    signalLiftPct === opt.val
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Left (5 cols): User-Defined Conversion Rates for Meetings & SQLs */}
            <div className="lg:col-span-5 p-6 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white">
              <div className="text-xs font-semibold text-slate-900">
                Your Funnel Conversion Rates
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Inquiry → Meeting Booked</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {meetingBookedRatePct}% ({report.meetingBooked}/mo)
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Inquiry-to-meeting rate"
                  min={8}
                  max={50}
                  step={1}
                  value={meetingBookedRatePct}
                  onChange={(e) => setMeetingBookedRatePct(Number(e.target.value))}
                  className="w-full accent-teal-700 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Meeting Show → SQL Qualified</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {meetingShowRatePct}% ({report.meetingHeld} SQLs/mo)
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Meeting show rate"
                  min={30}
                  max={95}
                  step={5}
                  value={meetingShowRatePct}
                  onChange={(e) => setMeetingShowRatePct(Number(e.target.value))}
                  className="w-full accent-teal-700 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">SQL → Closed-Won Win Rate</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {sqlWinRatePct}% ({report.closedWonExact.toFixed(1)} deals/mo)
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="SQL-to-win rate"
                  min={5}
                  max={60}
                  step={1}
                  value={sqlWinRatePct}
                  onChange={(e) => setSqlWinRatePct(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Expected SQL Quality Lift (Smart Bidding)</span>
                  <span className="font-mono font-semibold text-teal-700 tabular-nums">
                    +{signalLiftPct}%
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Signal quality lift"
                  min={0}
                  max={80}
                  step={5}
                  value={signalLiftPct}
                  onChange={(e) => setSignalLiftPct(Number(e.target.value))}
                  className="w-full accent-teal-700 cursor-pointer"
                />
              </div>
            </div>

            {/* Right (7 cols): Live ROI & Financial Uplift Readout + Comparison Bars */}
            <div className="lg:col-span-7 p-6 flex flex-col justify-between gap-5">
              {/* 3-Column ROI & Revenue Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-slate-200 font-mono tabular-nums">
                <div>
                  <div className="text-[11px] font-sans text-slate-500">
                    Baseline (Form-Only)
                  </div>
                  <div className="mt-1 text-xl font-bold text-slate-800">
                    {report.roi.baselineRoiPct >= 0 ? '+' : ''}
                    {report.roi.baselineRoiPct.toLocaleString()}% ROI
                  </div>
                  <div className="mt-0.5 text-xs text-slate-600">
                    USD {report.roi.baselineRevenue.toLocaleString()}/mo ·{' '}
                    {report.roi.baselineRoas.toFixed(1)}x
                  </div>
                  <div className="mt-0.5 text-[11px] font-sans text-slate-500">
                    {report.roi.baselineMeetings} SQLs · {report.roi.baselineDealsExact.toFixed(1)}{' '}
                    deals
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-sans text-slate-500">
                    With SQL Signal Quality
                  </div>
                  <div
                    className={`mt-1 text-xl font-bold ${
                      report.roi.signalExpiredBlocked ? 'text-rose-700' : 'text-emerald-700'
                    }`}
                  >
                    {report.roi.improvedRoiPct >= 0 ? '+' : ''}
                    {report.roi.improvedRoiPct.toLocaleString()}% ROI
                  </div>
                  <div className="mt-0.5 text-xs text-slate-800 font-semibold">
                    USD {report.roi.improvedRevenue.toLocaleString()}/mo ·{' '}
                    {report.roi.improvedRoas.toFixed(1)}x
                  </div>
                  <div className="mt-0.5 text-[11px] font-sans text-slate-500">
                    {report.roi.improvedMeetings} SQLs · {report.roi.improvedDealsExact.toFixed(1)}{' '}
                    deals
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-sans text-slate-500">
                    Net Financial Uplift
                  </div>
                  <div
                    className={`mt-1 text-xl font-bold ${
                      report.roi.signalExpiredBlocked ? 'text-rose-700' : 'text-teal-700'
                    }`}
                  >
                    +USD {report.roi.monthlyRevenueUplift.toLocaleString()}/mo
                  </div>
                  <div className="mt-0.5 text-xs text-slate-700 font-semibold">
                    +USD {report.roi.annualRevenueUplift.toLocaleString()}/yr
                  </div>
                  <div className="mt-0.5 text-[11px] font-sans text-slate-500">
                    {report.roi.signalExpiredBlocked
                      ? '0% lift (Closed-Won expired >90d)'
                      : `+${report.roi.extraMeetingsPerMonth} SQLs · +${report.roi.extraDealsPerMonth.toFixed(1)} deals/mo`}
                  </div>
                </div>
              </div>

              {/* Proportional Visual Revenue Bars */}
              {(() => {
                const maxRev = Math.max(adSpend, report.roi.improvedRevenue, 1);
                const spendPct = Math.max(4, Math.round((adSpend / maxRev) * 100));
                const basePct = Math.max(6, Math.round((report.roi.baselineRevenue / maxRev) * 100));
                const impPct = Math.max(6, Math.round((report.roi.improvedRevenue / maxRev) * 100));

                return (
                  <div className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Monthly Google Ad Spend (Same Budget)</span>
                        <span className="font-mono font-semibold text-slate-700 tabular-nums">
                          USD {adSpend.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-200/80 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-500 rounded-full"
                          style={{ width: `${spendPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">
                          Baseline Revenue (Form-Only · Cost/Deal: USD{' '}
                          {report.roi.baselineCostPerDeal.toLocaleString()})
                        </span>
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          USD {report.roi.baselineRevenue.toLocaleString()} / mo
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-200/80 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sky-600 rounded-full"
                          style={{ width: `${basePct}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-900">
                          Projected Revenue (SQL Signal +{report.roi.effectiveLiftPct}% · Cost/Deal:
                          USD {report.roi.improvedCostPerDeal.toLocaleString()})
                        </span>
                        <span
                          className={`font-mono font-bold tabular-nums ${
                            report.roi.signalExpiredBlocked ? 'text-rose-700' : 'text-emerald-700'
                          }`}
                        >
                          USD {report.roi.improvedRevenue.toLocaleString()} / mo
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-200/80 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            report.roi.signalExpiredBlocked ? 'bg-rose-500' : 'bg-emerald-600'
                          }`}
                          style={{ width: `${impPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Footer Verdict / Action Row */}
              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                {report.roi.signalExpiredBlocked ? (
                  <span className="text-rose-700 font-medium">
                    Waiting {salesCycleDays} days for Closed-Won misses Google&apos;s 90-day cutoff (0% lift). Switch to{' '}
                    <button
                      type="button"
                      onClick={() => handleSelectGoal('meeting_held')}
                      className="underline font-bold"
                    >
                      SQL · Meeting Held
                    </button>{' '}
                    to unlock +{signalLiftPct}% signal quality lift.
                  </span>
                ) : (
                  <span className="text-slate-600">
                    Same USD {adSpend.toLocaleString()}/mo budget delivers{' '}
                    <strong className="text-slate-900 font-mono">
                      +{report.roi.roiGainPts.toLocaleString()}% ROI points
                    </strong>{' '}
                    and lowers Cost per Deal from{' '}
                    <span className="font-mono">
                      USD {report.roi.baselineCostPerDeal.toLocaleString()}
                    </span>{' '}
                    to{' '}
                    <strong className="font-mono text-emerald-700">
                      USD {report.roi.improvedCostPerDeal.toLocaleString()}
                    </strong>
                    .
                  </span>
                )}

                <button
                  type="button"
                  onClick={openWorkspaceData}
                  className="inline-flex items-center gap-1.5 font-semibold text-teal-700 hover:text-teal-800 whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>View ROI assumptions</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: TYPICAL GOOGLE ADS CAMPAIGN DURATION VS EARLY QUALITY SIGNAL */}
      <section
        id="campaign-timeline"
        className="bg-white border border-slate-200 rounded-xl overflow-hidden scroll-mt-20"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              How Long a Google Paid Campaign Runs vs. When You Send Quality Signals
            </h2>
            <p className="text-xs text-slate-500">
              Typical Google Ads campaigns run 3–6+ months (with a 7–14 day learning phase and a 90-day evaluation window). If you don&apos;t send a quality SQL signal early, Google optimizes for cheap form fills and you lose out on quality leads.
            </p>
          </div>
          <span
            className={`text-xs font-mono font-semibold tabular-nums ${
              report.active.avgDays <= 14
                ? 'text-emerald-700'
                : report.active.avgDays <= 63
                  ? 'text-sky-700'
                  : 'text-rose-700'
            }`}
          >
            Your Selected Signal: Day {report.active.avgDays} ({report.active.shortLabel})
          </span>
        </div>

        <div className="p-6 space-y-5">
          {/* Horizontal Campaign Runway Bar (Day 0 to Day 180 / 6 Months) */}
          {(() => {
            const dayToPct = (d: number) => {
              const clamped = Math.min(180, Math.max(0, d));
              if (clamped <= 14) return (clamped / 14) * 16; // 0% -> 16%
              if (clamped <= 30) return 16 + ((clamped - 14) / 16) * 14; // 16% -> 30%
              if (clamped <= 90) return 30 + ((clamped - 30) / 60) * 38; // 30% -> 68%
              return 68 + ((clamped - 90) / 90) * 32; // 68% -> 100%
            };

            const signalLeft = dayToPct(report.active.avgDays);
            const eclLeft = dayToPct(63);
            const gclidLeft = dayToPct(90);
            const isEarly = report.active.avgDays <= 24;
            const isLate = report.active.avgDays > 63;

            return (
              <div className="relative pt-9 pb-7">
                {/* Live Selected Signal Marker */}
                <div
                  className="absolute top-0 -translate-x-1/2 flex flex-col items-center z-10 pointer-events-none"
                  style={{ left: `${Math.min(91, Math.max(9, signalLeft))}%` }}
                >
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold whitespace-nowrap ${
                      isLate
                        ? 'bg-rose-600 text-white'
                        : isEarly
                          ? 'bg-emerald-600 text-white'
                          : 'bg-sky-600 text-white'
                    }`}
                  >
                    {report.active.shortLabel} · Day {report.active.avgDays}
                  </span>
                  <div
                    className={`w-0.5 h-3.5 ${
                      isLate ? 'bg-rose-600' : isEarly ? 'bg-emerald-600' : 'bg-sky-600'
                    }`}
                  />
                </div>

                {/* Segmented 6-Month Campaign Runway */}
                <div className="relative h-10 rounded-lg overflow-hidden flex border border-slate-200 text-[11px] font-medium">
                  <div
                    className="bg-emerald-600 text-white flex items-center justify-center px-2 border-r border-white/25 whitespace-nowrap overflow-hidden"
                    style={{ width: '16%' }}
                  >
                    Wk 1–2 · Learning
                  </div>
                  <div
                    className="bg-teal-600 text-white flex items-center justify-center px-2 border-r border-white/25 whitespace-nowrap overflow-hidden"
                    style={{ width: '14%' }}
                  >
                    Mo 1 · Setup
                  </div>
                  <div
                    className="bg-sky-700 text-white flex items-center justify-center px-2 border-r border-white/25 whitespace-nowrap overflow-hidden"
                    style={{ width: '38%' }}
                  >
                    Months 2–3 · Core Paid Campaign (Min. 90d)
                  </div>
                  <div
                    className="bg-slate-200 text-slate-700 flex items-center justify-center px-2 whitespace-nowrap overflow-hidden"
                    style={{ width: '32%' }}
                  >
                    Months 4–6+ · Scale (Past 90d Cutoff)
                  </div>

                  {/* Exact Day 63 ECL vertical guide */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-rose-300 pointer-events-none"
                    style={{ left: `${eclLeft}%` }}
                  />
                  {/* Exact Day 90 GCLID vertical guide */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-rose-500 pointer-events-none"
                    style={{ left: `${gclidLeft}%` }}
                  />
                </div>

                {/* Aligned Scale Ticks */}
                <div className="relative mt-2 h-4 text-[11px] font-mono text-slate-500 tabular-nums">
                  <span className="absolute left-0">Day 0</span>
                  <span
                    className="absolute -translate-x-1/2 text-emerald-700 font-semibold hidden sm:inline"
                    style={{ left: '16%' }}
                  >
                    Day 14
                  </span>
                  <span
                    className="absolute -translate-x-1/2 hidden sm:inline"
                    style={{ left: '30%' }}
                  >
                    Day 30
                  </span>
                  <span
                    className="absolute -translate-x-1/2 text-rose-700 font-semibold whitespace-nowrap"
                    style={{ left: `${eclLeft}%` }}
                  >
                    Day 63 · ECL
                  </span>
                  <span
                    className="absolute -translate-x-1/2 text-rose-700 font-semibold whitespace-nowrap"
                    style={{ left: `${gclidLeft}%` }}
                  >
                    Day 90 · GCLID
                  </span>
                  <span className="absolute right-0">Day 180 (6 mo)</span>
                </div>
              </div>
            );
          })()}

          {/* 3-Column Plain-English Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 border-t border-slate-200 text-xs">
            <div className="space-y-1">
              <div className="font-mono text-[11px] font-semibold text-emerald-700">
                Weeks 1–2 (Days 1–14)
              </div>
              <div className="font-bold text-slate-900">Smart Bidding Learning Window</div>
              <p className="text-slate-600 leading-relaxed">
                Google&apos;s official learning status runs 7 days and takes 1–3 conversion cycles to stabilize. Sending <strong>SQL Meeting Booked / Held</strong> in Days 6–14 feeds quality signals immediately while the algorithm is deciding who to target.
              </p>
            </div>

            <div className="space-y-1">
              <div className="font-mono text-[11px] font-semibold text-sky-700">
                Months 1–3 (Days 15–90)
              </div>
              <div className="font-bold text-slate-900">Typical Paid Campaign Evaluation</div>
              <p className="text-slate-600 leading-relaxed">
                Most Google paid search campaigns run at least <strong>3 months</strong> (6–12 months to fully scale). Without early quality signals, Google spends all of Months 1–3 chasing cheap clickers and low-intent form fills instead of real buyers.
              </p>
            </div>

            <div className="space-y-1">
              <div className="font-mono text-[11px] font-semibold text-rose-700">
                Months 3–6+ (Past Day 63 / Day 90)
              </div>
              <div className="font-bold text-slate-900">Why Waiting for Final Sales Fails</div>
              <p className="text-slate-600 leading-relaxed">
                If you wait 3–5 months for Closed-Won deals, both <strong>ECL (63d)</strong> and <strong>GCLID (90d)</strong> expire before the first signal arrives—your campaign misses out on quality leads for its entire run.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: INTERACTIVE PLAYABLE FLOWCHART */}
      <section
        id="flowchart"
        ref={flowchartRef}
        className="bg-white border border-slate-200 rounded-xl overflow-hidden scroll-mt-20"
      >
        {(imported || linkedBatch) && <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-5 py-3">
          <button type="button" className={showImported ? outlineButton : primaryButton} aria-pressed={!showImported}
            onClick={() => {setShowImported(false); selectRow(null);}}>Working example</button>
          {imported && <button type="button" className={showImported ? primaryButton : outlineButton} aria-pressed={showImported}
            onClick={() => {setShowImported(true); selectRow(null);}}>Uploaded CRM data</button>}
          {traceLoading && <span role="status" className="text-sm text-slate-600">Loading CRM batch…</span>}
          {traceError && <p role="alert" className="basis-full text-sm text-rose-700">{traceError}{!imported && linkedBatch &&
            <button type="button" className="ml-2 underline" onClick={() => void loadTrace(linkedBatch, true)}>Retry</button>}</p>}
        </div>}
        {imported && realRow && <div className="space-y-3 border-b border-slate-200 px-5 py-4 text-sm" data-crm-batch={imported.id}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-bold">Uploaded CRM data</h2>
              <p className="text-slate-600">Batch {imported.id.slice(0, 8)} · {imported.rows.length} reviewed · {imported.counts.ready || 0} ready · {imported.counts.blocked || 0} held</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" disabled={traceLoading} className={outlineButton} onClick={() => void loadTrace(imported.id, false)}>Refresh batch</button>
              <a className={primaryButton} href={conversionBatchLink(imported.id, 'history')} target="_top">Open delivery review</a>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
            <label className="space-y-1 font-medium">
              <span>CRM row</span>
              <select className={inputStyle} value={realRow.line} onChange={event => selectRow(Number(event.target.value))}>
                {imported.rows.map(row => <option key={row.line} value={row.line}>Row {row.line} · {receiptStates[row.state] || row.state}</option>)}
              </select>
            </label>
            <dl className="flex flex-wrap gap-x-5 gap-y-2">
              <div><dt className="text-slate-600">Identifiers</dt><dd className="font-medium">{realRow.matched_by}</dd></div>
              <div><dt className="text-slate-600">Consent</dt><dd className="font-medium capitalize">{realRow.consent}</dd></div>
              <div><dt className="text-slate-600">Time to outcome</dt><dd className="font-medium">{lagLabel(realRow)}</dd></div>
              {realRow.value != null && <div><dt className="text-slate-600">Conversion value</dt><dd className="font-medium">{realRow.currency} {realRow.value.toLocaleString()}</dd></div>}
            </dl>
          </div>
          <p role="status" className={realRow.state === 'blocked' ? 'text-rose-700' : 'text-slate-700'}>
            {realRow.message} {realRow.reference && `Receipt ${realRow.reference}`}
          </p>
        </div>}
        {/* Toolbar: Play Controls + Scenarios */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (isPlaying) {
                  setIsPlaying(false);
                } else {
                  if (safeStepIdx >= route.steps.length - 1) setStepIdx(0);
                  setIsPlaying(true);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>
                    {safeStepIdx >= route.steps.length - 1 ? 'Replay Flow' : 'Play Flow'}
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setStepIdx((prev) => (prev < route.steps.length - 1 ? prev + 1 : 0));
              }}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>Step</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setStepIdx(0);
              }}
              aria-label="Reset flowchart"
              className="p-2 text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setSpeedMs((s) => (s === 1350 ? 750 : 1350))}
              className="px-2.5 py-2 text-xs font-mono font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
            >
              {speedMs === 1350 ? '1x' : '2x'}
            </button>
          </div>

          {!realRow && <div className="flex items-center gap-1 p-1 bg-slate-200/75 rounded-lg overflow-x-auto max-w-full">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                aria-pressed={activePreset === preset.id}
                onClick={() => applyPreset(preset)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activePreset === preset.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>}
        </div>

        {/* Interactive Parameter Controls Strip */}
        {!realRow && <div className="px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-pressed={controls.gclidPresent}
              onClick={() => updateControl({ gclidPresent: !controls.gclidPresent })}
              className={`px-2.5 py-1.5 font-medium rounded-md border transition-colors whitespace-nowrap ${
                controls.gclidPresent
                  ? 'bg-teal-50 border-teal-300 text-teal-900'
                  : 'bg-sky-50 border-sky-300 text-sky-900'
              }`}
            >
              GCLID: {controls.gclidPresent ? 'Saved' : 'Missing (ECL Backup)'}
            </button>

            <button
              type="button"
              aria-pressed={controls.consentGranted}
              onClick={() => updateControl({ consentGranted: !controls.consentGranted })}
              className={`px-2.5 py-1.5 font-medium rounded-md border transition-colors whitespace-nowrap ${
                controls.consentGranted
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              Consent: {controls.consentGranted ? 'Granted' : 'Denied'}
            </button>

            <button
              type="button"
              aria-pressed={controls.sendConversionApi}
              onClick={() => updateControl({ sendConversionApi: !controls.sendConversionApi })}
              className={`px-2.5 py-1.5 font-medium rounded-md border transition-colors whitespace-nowrap ${
                controls.sendConversionApi
                  ? 'bg-teal-50 border-teal-300 text-teal-900'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}
            >
              API Sync: {controls.sendConversionApi ? 'On' : 'Off (Blind)'}
            </button>
          </div>

          {/* Days From Click Slider */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-600 whitespace-nowrap">Days to Signal:</span>
            <input
              type="range"
              aria-label="Days to Signal"
              min={1}
              max={Math.max(150, controls.daysSinceClick)}
              value={controls.daysSinceClick}
              onChange={(e) => updateControl({ daysSinceClick: Number(e.target.value) })}
              className="w-32 accent-teal-700 cursor-pointer"
            />
            <span
              className={`font-mono font-semibold tabular-nums whitespace-nowrap ${
                controls.daysSinceClick > 90
                  ? 'text-rose-700'
                  : controls.daysSinceClick > 63
                    ? 'text-amber-700'
                    : 'text-emerald-700'
              }`}
            >
              Day {controls.daysSinceClick}
            </span>
          </div>
        </div>}

        {/* SVG Flowchart Canvas */}
        <div className="p-4 overflow-x-auto bg-white">
          <svg
            viewBox="0 0 1080 408"
            className="w-full min-w-[840px] h-auto select-none"
            role="img"
            aria-label="Interactive API conversion flowchart"
          >
            <defs>
              <pattern id="flowGrid" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="0.9" fill="#E2E8F0" />
              </pattern>
              <marker
                id="arrow-muted"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#CBD5E1" />
              </marker>
              <marker
                id="arrow-active"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill={tokenColor} />
              </marker>
            </defs>

            <rect x="0" y="0" width="1080" height="408" fill="url(#flowGrid)" rx="10" />

            {/* Edges */}
            {(realRow ? FLOW_EDGES.filter(edge => route.steps.some(step => step.edgeFromPrev === edge.id)) : FLOW_EDGES).map((edge) => {
              const isVisited = visitedEdgeIds.has(edge.id);
              const isCurrent = currentStep.edgeFromPrev === edge.id;
              return (
                <g key={edge.id}>
                  <path
                    ref={(el) => {
                      pathRefs.current[edge.id] = el;
                    }}
                    d={edge.d}
                    fill="none"
                    stroke={isVisited ? tokenColor : '#CBD5E1'}
                    strokeWidth={isCurrent ? 3 : isVisited ? 2.4 : 1.75}
                    strokeDasharray={edge.tone === 'main' ? undefined : '5 4'}
                    markerEnd={isVisited ? 'url(#arrow-active)' : 'url(#arrow-muted)'}
                  />
                  {!realRow && edge.label && edge.labelX && edge.labelY && (
                    <text
                      x={edge.labelX}
                      y={edge.labelY}
                      textAnchor="middle"
                      fontSize={10.5}
                      fontWeight={isVisited ? 700 : 500}
                      fill={isVisited ? tokenColor : '#64748B'}
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {(realRow ? FLOW_NODES.filter(node => route.steps.some(step => step.nodeId === node.id)) : FLOW_NODES).map((node) => {
              const realName = realRow ? realNodeNames[node.id] : undefined;
              const isActive = currentStep.nodeId === node.id;
              const isVisited = visitedNodeIds.has(node.id);
              const isSelected = selectedNodeId === node.id;

              const left = node.x - node.w / 2;
              const top = node.y - node.h / 2;

              let fill = '#FFFFFF';
              let stroke = '#CBD5E1';
              let tagColor = '#64748B';

              if (node.tone === 'teal') {
                fill = isVisited ? '#F0FDFA' : '#FFFFFF';
                stroke = isVisited ? '#0D9488' : '#CBD5E1';
                tagColor = '#0F766E';
              } else if (node.tone === 'emerald') {
                fill = isVisited ? '#ECFDF5' : '#FFFFFF';
                stroke = isVisited ? '#059669' : '#CBD5E1';
                tagColor = '#047857';
              } else if (node.tone === 'rose') {
                fill = isVisited ? '#FFF1F2' : '#FFFFFF';
                stroke = isVisited ? '#E11D48' : '#CBD5E1';
                tagColor = '#BE123C';
              } else if (node.tone === 'indigo') {
                fill = isVisited ? '#EEF2FF' : '#FFFFFF';
                stroke = isVisited ? '#4F46E5' : '#CBD5E1';
                tagColor = '#4338CA';
              } else if (node.tone === 'amber') {
                fill = isVisited ? '#FFFBEB' : '#FFFFFF';
                stroke = isVisited ? '#D97706' : '#CBD5E1';
                tagColor = '#B45309';
              } else if (isVisited) {
                fill = '#F8FAFC';
                stroke = tokenColor;
              }

              return (
                <g
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className="cursor-pointer"
                >
                  {isActive && (
                    <rect
                      x={left - 4}
                      y={top - 4}
                      width={node.w + 8}
                      height={node.h + 8}
                      rx={13}
                      fill="none"
                      stroke={tokenColor}
                      strokeWidth={2}
                      opacity={0.35}
                    />
                  )}
                  <rect
                    x={left}
                    y={top}
                    width={node.w}
                    height={node.h}
                    rx={10}
                    fill={fill}
                    stroke={isActive ? tokenColor : isSelected ? '#0F172A' : stroke}
                    strokeWidth={isActive ? 2.4 : isSelected ? 2 : 1.4}
                  />
                  <text
                    x={left + 12}
                    y={top + 19}
                    fontSize={10}
                    fontWeight={700}
                    fontFamily="JetBrains Mono, monospace"
                    fill={tagColor}
                  >
                    {node.stepTag}
                  </text>
                  <text
                    x={left + 12}
                    y={top + 40}
                    fontSize={12.5}
                    fontWeight={700}
                    fill="#0F172A"
                  >
                    {realName?.[0] ?? node.title}
                  </text>
                  <text x={left + 12} y={top + 58} fontSize={10.5} fill="#64748B">
                    {realName?.[1] ?? node.subtitle}
                  </text>
                </g>
              );
            })}

            {/* Moving Flow Token */}
            {tokenPoint && (
              <g pointerEvents="none">
                <circle cx={tokenPoint.x} cy={tokenPoint.y} r={10} fill={tokenColor} opacity={0.2} />
                <circle
                  cx={tokenPoint.x}
                  cy={tokenPoint.y}
                  r={5.5}
                  fill={tokenColor}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                />
              </g>
            )}
          </svg>
        </div>

        {/* Clean Bottom Step Narration Strip */}
        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50/70 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          <div className="lg:col-span-8 space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="font-bold text-slate-900">
                Step {safeStepIdx + 1} / {route.steps.length}
              </span>
              <span aria-hidden="true" className="text-slate-400">
                ·
              </span>
              <span
                className={`font-semibold ${
                  route.tone === 'rose'
                    ? 'text-rose-700'
                    : route.tone === 'amber'
                      ? 'text-amber-700'
                      : route.tone === 'indigo'
                        ? 'text-indigo-700'
                        : route.tone === 'sky'
                          ? 'text-sky-700'
                          : 'text-emerald-700'
                }`}
              >
                {route.statusText}
              </span>
            </div>
            <div className="text-sm font-bold text-slate-900">{currentStep.headline}</div>
            <p className="text-xs text-slate-600 leading-relaxed">{currentStep.detail}</p>
            {!realRow && <p className={`text-xs font-semibold ${validation?.state === 'blocked' ? 'text-rose-700' : 'text-teal-800'}`}
              role="status" data-scenario-state={validation?.state}>
              {validationText}
              {validationError && <button type="button" className="ml-2 underline" onClick={() => setValidationRetry(value => value + 1)}>Retry</button>}
            </p>}
          </div>

          <div className="lg:col-span-4 lg:border-l lg:border-slate-200 lg:pl-4 space-y-1">
            <div className="text-[11px] font-mono text-slate-500">
              Selected Node · {(realRow && realNodeNames[inspectedNode.id]?.[0]) || inspectedNode.title}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {realRow ? route.steps.find(step => step.nodeId === inspectedNode.id)?.detail : inspectedNode.description}
            </p>
          </div>
        </div>
      </section>
      </div>
      </main>
      {uploadOpen && <ConversionSignalImport outcomes={outcomes} onImport={displayBatch} onClose={() => setUploadOpen(false)} />}
      <dialog ref={evidence} aria-labelledby="workspace-data-title"
        className="m-auto w-[calc(100%-1.5rem)] max-w-lg rounded-xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl backdrop:bg-slate-900/35">
        <div className="flex items-center justify-between gap-3">
          <h2 id="workspace-data-title" className="text-lg font-bold">Workspace data</h2>
          <form method="dialog"><button type="submit" aria-label="Close workspace data"
            className="inline-flex p-2 rounded-md hover:bg-slate-100"><X className="size-4" /></button></form>
        </div>
        <p className="mt-2 text-sm text-slate-600">The funnel and ROI use the values you enter. The flow runs a sample record through the upload validator. Example records stay in this screen.</p>
        <dl className="mt-4 grid gap-2 text-sm">
          <div className="flex flex-wrap justify-between gap-2"><dt>Workflow</dt><dd className="font-semibold">{controls.audienceOnly ? 'Google Ads Customer Match' : outcomes[flowOutcome]}</dd></div>
          <div className="flex flex-wrap justify-between gap-2"><dt>Ad spend per month</dt><dd className="font-semibold">USD {adSpend.toLocaleString()}</dd></div>
          <div className="flex flex-wrap justify-between gap-2"><dt>Inquiries per month</dt><dd className="font-semibold">{monthlyInquiries.toLocaleString()}</dd></div>
          <div className="flex flex-wrap justify-between gap-2"><dt>Average closed-won deal</dt><dd className="font-semibold">USD {avgDealValue.toLocaleString()}</dd></div>
          <div className="flex flex-wrap justify-between gap-2"><dt>Sales closing cycle</dt><dd className="font-semibold">{salesCycleDays} days</dd></div>
          <div className="flex flex-wrap justify-between gap-2"><dt>Booking · Show · Win rates</dt><dd className="font-semibold">{meetingBookedRatePct}% · {meetingShowRatePct}% · {sqlWinRatePct}%</dd></div>
          <div className="flex flex-wrap justify-between gap-2"><dt>Assumed signal lift</dt><dd className="font-semibold">{signalLiftPct}%</dd></div>
        </dl>
        <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm font-medium text-teal-800" role="status">{validationText}</p>
        <div className="mt-4 border-t border-slate-200 pt-3 text-sm">
          {exportLoading && <p className="text-slate-600">Loading recorded Google Ads inquiries…</p>}
          {exportError && <p className="text-slate-600">Could not load the Google Ads export. <button type="button"
            className="font-semibold text-teal-800 underline" onClick={() => void loadRecordedInquiries()}>Retry</button></p>}
          {exportMonths && Object.keys(exportMonths).length === 0 && <p className="text-slate-600">No saved Google Ads inquiries in this workspace.</p>}
          {exportMonths && exportMonth && <>
            <label className="block font-medium" htmlFor="export-month">Google Ads export month</label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <select id="export-month" className="rounded-md border border-slate-300 bg-white px-2 py-2" value={exportMonth} onChange={event => setExportMonth(event.target.value)}>
                {Object.keys(exportMonths).sort().reverse().map(month => <option value={month} key={month}>
                  {month} · {exportMonths[month].toLocaleString()} inquiries
                </option>)}
              </select>
              <button type="button" className="rounded-md border border-slate-300 px-2 py-2 font-medium hover:bg-slate-50" onClick={() => {
                setMonthlyInquiries(exportMonths[exportMonth]);
                setInquirySource(exportMonth);
                evidence.current?.close();
              }}>Use recorded inquiries</button>
              {inquirySource && <button type="button" className="px-2 py-2 text-teal-800 underline" onClick={() => {
                setMonthlyInquiries(200);
                setInquirySource('');
              }}>Use scenario default</button>}
            </div>
          </>}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a href={`/?${uploadQuery}#conversions`} target="_top"
            className="inline-flex rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">Review CRM data</a>
          <a href="/?conversion_view=overview#conversions" target="_top"
            className="inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Delivery overview</a>
        </div>
      </dialog>
    </div>
  );
}
