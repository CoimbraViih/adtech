/**
 * Supabase-generated database types.
 * TODO(M1-backend): replace with `supabase gen types typescript --project-id <id>`
 */

export type OrgPlan = "free" | "pro" | "agency";
export type OrgRole = "owner" | "admin" | "member" | "viewer" | "superadmin";

export type Organization = {
  id: string;
  name: string;
  plan: OrgPlan;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Workspace = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string; // matches auth.users.id
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type OrganizationMember = {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
};

export type WorkspaceMember = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
};

export type BillingEvent = {
  id: string;
  organization_id: string;
  stripe_event_id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

// ─── M2: Campaigns ───────────────────────────────────────────────────────────

export type CampaignPlatform = "meta" | "google" | "tiktok" | "linkedin" | "programmatic";
export type CampaignStatus = "active" | "paused" | "draft" | "archived";
export type CampaignObjective =
  | "awareness"
  | "traffic"
  | "engagement"
  | "leads"
  | "sales"
  | "app_promotion";

export type AdSetStatus = "active" | "paused" | "archived";
export type AdStatus = "active" | "paused" | "archived" | "in_review" | "rejected";

export type Campaign = {
  id: string;
  workspace_id: string;
  name: string;
  platform: CampaignPlatform;
  status: CampaignStatus;
  objective: CampaignObjective;
  daily_budget: number;
  lifetime_budget: number | null;
  start_date: string;
  end_date: string | null;
  external_id: string | null;
  // metrics (denormalized for list view, synced from platform)
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  cpa: number | null;
  roas: number | null;
  ctr: number | null;
  cpc: number | null;
  created_at: string;
  updated_at: string;
};

export type AdSet = {
  id: string;
  campaign_id: string;
  workspace_id: string;
  name: string;
  status: AdSetStatus;
  daily_budget: number | null;
  bid_amount: number | null;
  targeting: Record<string, unknown>;
  external_id: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  created_at: string;
  updated_at: string;
};

export type Ad = {
  id: string;
  ad_set_id: string;
  workspace_id: string;
  name: string;
  status: AdStatus;
  creative_id: string | null;
  headline: string | null;
  description: string | null;
  cta: string | null;
  destination_url: string | null;
  external_id: string | null;
  impressions: number;
  clicks: number;
  conversions: number;
  created_at: string;
  updated_at: string;
};

// Daily metric snapshot for charts (M2)
export type DailyMetricSnapshot = {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  roas: number;
  cpa: number;
  ctr: number;
};

// Shape for campaign creation form
export type CampaignCreateInput = {
  name: string;
  platform: CampaignPlatform;
  objective: CampaignObjective;
  daily_budget: number;
  lifetime_budget?: number | null;
  start_date: string;
  end_date?: string | null;
  targeting?: {
    age_min?: number;
    age_max?: number;
    genders?: string[];
    locations?: string[];
    interests?: string[];
    custom_audiences?: string[];
  };
};

// ─── M3: AI Creative Studio ──────────────────────────────────────────────────

export type CreativeType = "copy" | "banner" | "video";
export type CreativeStatus = "draft" | "approved" | "rejected" | "in_review";
export type BannerFormat = "1:1" | "16:9" | "9:16" | "4:5" | "1.91:1";

export type PolicyItem = {
  rule: string;
  passed: boolean;
  detail: string | null;
};

export type ScoreBreakdown = {
  clarity: number;       // 0-20
  urgency: number;       // 0-20
  cta_strength: number;  // 0-20
  compliance: number;    // 0-20
  relevance: number;     // 0-20
};

export type Creative = {
  id: string;
  workspace_id: string;
  campaign_id: string | null;
  type: CreativeType;
  status: CreativeStatus;
  name: string;
  // copy fields
  headline: string | null;
  description: string | null;
  cta: string | null;
  // banner/video fields
  asset_url: string | null;
  thumbnail_url: string | null;
  format: BannerFormat | null;
  // AI metadata
  prompt: string | null;
  model_used: string | null;
  // quality
  score: number | null;         // 0-100
  score_breakdown: ScoreBreakdown | null;
  policy_items: PolicyItem[] | null;
  policy_passed: boolean | null;
  // versioning
  version: number;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CreativeVersion = {
  id: string;
  creative_id: string;
  workspace_id: string;
  version: number;
  snapshot: Record<string, unknown>;
  created_at: string;
};

export type CopyVariation = {
  headline: string;
  description: string;
  cta: string;
};

export type CreativeCreateInput = {
  type: CreativeType;
  name: string;
  campaign_id?: string | null;
  headline?: string | null;
  description?: string | null;
  cta?: string | null;
  asset_url?: string | null;
  thumbnail_url?: string | null;
  format?: BannerFormat | null;
  prompt?: string | null;
  model_used?: string | null;
  score?: number | null;
  score_breakdown?: ScoreBreakdown | null;
  policy_items?: PolicyItem[] | null;
  policy_passed?: boolean | null;
};

// ─── Session ─────────────────────────────────────────────────────────────────

// Session shape returned by getUser() / fake auth
export type AuthUser = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
};

// Full session context passed through the app
export type SessionContext = {
  user: AuthUser;
  organization: Organization;
  workspace: Workspace;
  role: OrgRole;
};

// ─── M4: Pixel & Tracking ─────────────────────────────────────────────────────

export type PixelEventType =
  | "page_view"
  | "add_to_cart"
  | "purchase"
  | "lead"
  | "sign_up"
  | "custom";

export type Pixel = {
  id: string;
  workspace_id: string;
  name: string;
  meta_pixel_id: string | null;
  google_tag_id: string | null;
  domain: string | null;
  created_at: string;
  updated_at: string;
};

export type PixelCreateInput = {
  workspace_id: string;
  name: string;
  meta_pixel_id?: string | null;
  google_tag_id?: string | null;
};

export type PixelEvent = {
  id: string;
  pixel_id: string;
  event_type: PixelEventType;
  event_name: string | null;
  url: string | null;
  referrer: string | null;
  ip: string | null;
  user_agent: string | null;
  session_id: string | null;
  user_id_hash: string | null;
  value: number | null;
  currency: string | null;
  properties: Record<string, unknown> | null;
  received_at: string;
};

export type PixelEventInsert = Omit<PixelEvent, "id" | "received_at">;

// ─── M5: Analytics & Attribution ──────────────────────────────────────────────

export type AttributionModel = "last_click" | "linear" | "time_decay";

export type DailyEventCount = {
  workspace_id: string;
  pixel_id: string;
  pixel_name: string;
  day: string;           // ISO date string e.g. "2026-05-22T00:00:00.000Z"
  event_type: PixelEventType;
  event_count: number;
  total_value: number;
};

export type ConversionSession = {
  session_id: string;
  workspace_id: string;
  pixel_id: string;
  session_start: string;
  session_end: string;
  first_touch_url: string | null;
  last_touch_url: string | null;
  total_events: number;
  purchases: number;
  conversions: number;
  revenue: number;
};

export type KpiSummary = {
  total_events: number;
  total_conversions: number;
  total_revenue: number;
  cpa: number;
  avg_order_value: number;
};

export type ChannelAttribution = {
  channel: string;
  conversions: number;
  revenue: number;
  attribution_share: number;
};

export type FunnelStep = {
  event_type: PixelEventType;
  label: string;
  count: number;
  drop_off_rate: number;
};

// ─── M8: Automation & Alerts ──────────────────────────────────────────────────

export type AlertCondition =
  | "roas_below"
  | "cpa_above"
  | "spend_above"
  | "ctr_below"
  | "conversions_below";

export type AlertStatus = "active" | "paused";

export type AlertRule = {
  id: string;
  workspace_id: string;
  campaign_id: string | null;
  name: string;
  condition: AlertCondition;
  threshold: number;
  status: AlertStatus;
  cooldown_minutes: number;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AlertRuleCreateInput = {
  workspace_id: string;
  campaign_id?: string | null;
  name: string;
  condition: AlertCondition;
  threshold: number;
  cooldown_minutes?: number;
};

export type AlertNotification = {
  id: string;
  workspace_id: string;
  rule_id: string;
  campaign_id: string | null;
  title: string;
  body: string;
  metric_value: number;
  read: boolean;
  emailed: boolean;
  created_at: string;
};

export type CampaignMetricSnapshot = {
  campaign_id: string;
  workspace_id: string;
  campaign_name: string;
  roas: number | null;
  cpa: number | null;
  spend: number;
  ctr: number | null;
  conversions: number;
};

// ─── M8: Programático DSP/SSP ────────────────────────────────────────────────

export type DealType = "open" | "private" | "preferred" | "guaranteed";
export type BidOutcome = "win" | "loss" | "no_bid" | "error";
export type AudienceType = "behavioral" | "lookalike" | "custom";
export type RtbCampaignStatus = "active" | "paused" | "draft" | "archived";
export type PacingType = "even" | "asap";

export type RtbCampaign = {
  id: string;
  workspace_id: string;
  campaign_id: string | null;
  name: string;
  status: RtbCampaignStatus;
  deal_type: DealType;
  deal_id: string | null;
  floor_cpm: number;
  max_cpm: number;
  daily_budget: number;
  total_budget: number | null;
  pacing: PacingType;
  frequency_cap: number;
  frequency_cap_hours: number;
  creative_id: string | null;
  audience_id: string | null;
  targeting: Record<string, unknown>;
  start_date: string;
  end_date: string | null;
  impressions: number;
  wins: number;
  spend: number;
  win_rate: number | null;
  avg_cpm: number | null;
  created_at: string;
  updated_at: string;
};

export type RtbCampaignCreateInput = {
  name: string;
  deal_type: DealType;
  deal_id?: string | null;
  floor_cpm: number;
  max_cpm: number;
  daily_budget: number;
  total_budget?: number | null;
  pacing: PacingType;
  frequency_cap: number;
  frequency_cap_hours: number;
  creative_id?: string | null;
  audience_id?: string | null;
  targeting?: Record<string, unknown>;
  start_date: string;
  end_date?: string | null;
};

export type BidRequestLog = {
  id: string;
  workspace_id: string;
  rtb_campaign_id: string | null;
  ssp_id: string;
  auction_id: string;
  user_id_hash: string | null;
  domain: string | null;
  floor_cpm: number | null;
  bid_cpm: number | null;
  outcome: BidOutcome;
  response_ms: number | null;
  created_at: string;
};

export type AudienceRule = {
  event_type: string;
  operator: "eq" | "gte" | "lte" | "contains";
  value: string | number;
  lookback_days: number;
};

export type Audience = {
  id: string;
  workspace_id: string;
  name: string;
  type: AudienceType;
  description: string | null;
  rules: AudienceRule[];
  lookalike_source_id: string | null;
  size_estimate: number;
  created_at: string;
  updated_at: string;
};

export type AudienceCreateInput = {
  name: string;
  type: AudienceType;
  description?: string | null;
  rules: AudienceRule[];
  lookalike_source_id?: string | null;
};

export type OpenRtbImp = {
  id: string;
  banner?: { w: number; h: number; format?: Array<{ w: number; h: number }> };
  bidfloor?: number;
  bidfloorcur?: string;
  pmp?: {
    private_auction: 0 | 1;
    deals?: Array<{
      id: string;
      bidfloor?: number;
      bidfloorcur?: string;
      wseat?: string[];
    }>;
  };
};

// ─── Integrations & API Keys ─────────────────────────────────────────────────

export type OpenRtbBidRequest = {
  id: string;
  imp: OpenRtbImp[];
  site?: { domain: string; page: string };
  app?: { bundle: string; name: string };
  user?: { id: string };
  device?: { ua: string; ip: string; language: string };
  at: 1 | 2;
  tmax?: number;
  wseat?: string[];
};

export type OpenRtbBid = {
  id: string;
  impid: string;
  price: number;
  adid?: string;
  adm?: string;
  adomain?: string[];
  crid?: string;
  w?: number;
  h?: number;
  dealid?: string;
  nurl?: string;
  burl?: string;
};

export type OpenRtbSeatBid = {
  bid: OpenRtbBid[];
  seat?: string;
};

export type OpenRtbBidResponse = {
  id: string;
  seatbid?: OpenRtbSeatBid[];
  bidid?: string;
  cur?: string;
  nbr?: number;
};

// ─── M12: PMP & Deal Enforcement ─────────────────────────────────────────────

export type PmpDealType = 'private' | 'preferred' | 'guaranteed';
export type PmpDealStatus = 'active' | 'paused' | 'expired';

export type PmpDeal = {
  id: string;
  workspace_id: string;
  deal_id: string;
  deal_name: string;
  deal_type: PmpDealType;
  floor_price: number;
  publisher_name: string | null;
  status: PmpDealStatus;
  wseat: string[] | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
};

export type PmpDealCreateInput = {
  deal_id: string;
  deal_name: string;
  deal_type: PmpDealType;
  floor_price: number;
  publisher_name?: string | null;
  status?: PmpDealStatus;
  wseat?: string[] | null;
  start_date?: string | null;
  end_date?: string | null;
};

// ─── M9: Billing / Stripe ────────────────────────────────────────────────────

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired";

export type Subscription = {
  id: string;
  organization_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  plan: OrgPlan;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
};

// ─── Integrations ─────────────────────────────────────────────────────────────

export type OrgApiCredential = {
  id: string;
  organization_id: string;
  provider: string;
  credentials: string; // AES-256-GCM encrypted blob — never plaintext
  last_tested_at: string | null;
  created_at: string;
  updated_at: string;
};

export type IntegrationStatus = {
  provider: string;
  configured: boolean;
  last_tested_at: string | null;
};

// ─── M-ADS: Sync Runs ────────────────────────────────────────────────────────

export type SyncRunStatus = "success" | "error" | "partial"

export type SyncRun = {
  id: string
  workspace_id: string
  platform: string
  status: SyncRunStatus
  campaigns_synced: number
  error_message: string | null
  started_at: string
  finished_at: string | null
  created_at: string
}

// ── Campaign Metrics Daily (M-ADS Fase 4) ─────────────────────────────────────

export type CampaignMetricsDaily = {
  id: string;
  workspace_id: string;
  campaign_external_id: string;
  platform: CampaignPlatform;
  date: string; // YYYY-MM-DD
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  roas: number | null;
  cpa: number | null;
  pixel_conversions: number;
  created_at: string;
  updated_at: string;
};

// ─── M11: AI Traffic Manager ──────────────────────────────────────────────────

export type DiagnosticSeverity = "info" | "warning" | "critical";
export type DiagnosticStatus = "open" | "acknowledged" | "applied" | "dismissed";
export type DiagnosticEntity = "campaign" | "ad_set" | "ad";

export type CampaignBenchmark = {
  id: string;
  workspace_id: string | null;
  platform: string;
  objective: string;
  metric: string;
  target_value: number;
  comparator: "gte" | "lte";
  created_at: string;
  updated_at: string;
};

export type AiDiagnostic = {
  id: string;
  workspace_id: string;
  entity_type: DiagnosticEntity;
  entity_id: string;
  campaign_id: string | null;
  skill_id: string;
  severity: DiagnosticSeverity;
  status: DiagnosticStatus;
  title: string;
  rationale: string;
  suggested_action: string;
  metrics_snapshot: Record<string, number>;
  created_at: string;
  updated_at: string;
};

// M15 — Creative Asset Uploads
export type CreativeAsset = {
  id: string;
  workspace_id: string;
  creative_id: string | null;
  campaign_id: string | null;
  rtb_campaign_id: string | null;
  storage_path: string;
  public_url: string;
  filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  width_px: number | null;
  height_px: number | null;
  alt_text: string | null;
  created_at: string;
};

// ─── M14: Pixel Dead-Letter ───────────────────────────────────────────────────

export type DeadLetterReason =
  | "validation_failed"
  | "persistence_failed"
  | "synthetic_check_failed";

export type PixelDeadLetter = {
  id: string;
  pixel_id: string;
  organization_id: string | null;
  rejection_reason: DeadLetterReason | string;
  event_payload: Record<string, unknown> | null;
  created_at: string;
};

export type PixelDeadLetterInsert = {
  pixel_id: string;
  organization_id: string | null;
  rejection_reason: DeadLetterReason;
  event_payload: unknown;
};

// ─── M18: Data Transparency ─────────────────────────────────────────────────

export type ExportDestinationType = 'bigquery' | 'snowflake' | 's3' | 'csv_download'
export type ExportRunStatus = 'pending' | 'running' | 'done' | 'failed'
export type ExportSchedule = 'hourly' | 'daily'

export type ExportDestination = {
  id: string
  organization_id: string
  workspace_id: string
  name: string
  destination_type: ExportDestinationType
  config: Record<string, unknown>
  schedule: ExportSchedule | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ExportRun = {
  id: string
  destination_id: string
  organization_id: string
  workspace_id: string
  status: ExportRunStatus
  rows_exported: number | null
  error: string | null
  output_path: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export type ExportDestinationCreateInput = {
  name: string
  destination_type: ExportDestinationType
  config: Record<string, unknown>
  schedule?: ExportSchedule | null
}

// ─── M15 Part 2: Dynamic Creative Optimization (DCO) ─────────────────────────

export type CreativeTemplateFormat = 'copy' | 'banner' | 'video'

export type CreativeTemplate = {
  id: string
  organization_id: string
  workspace_id: string
  name: string
  format: CreativeTemplateFormat
  template_body: Record<string, string>  // { headline, description, imageUrl, cta, url }
  placeholders: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export type CreativeVariant = {
  id: string
  organization_id: string
  template_id: string
  product_id: string | null
  resolved_body: Record<string, string>
  impressions: number
  conversions: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type VariantPerformance = {
  id: string
  variant_id: string
  event_type: 'impression' | 'click' | 'conversion'
  value: number | null
  recorded_at: string
}

// ─── M19: Predictive & Autonomous Optimization ───────────────────────────────

export type OptimizationActionType =
  | 'pause'
  | 'resume'
  | 'budget_increase'
  | 'budget_decrease'

export type OptimizationActionStatus =
  | 'suggested'
  | 'approved'
  | 'rejected'
  | 'executed'
  | 'failed'
  | 'outcome_measured'

export type OptimizationAction = {
  id: string
  workspace_id: string
  campaign_id: string | null
  campaign_external_id: string
  platform: string
  action_type: OptimizationActionType
  status: OptimizationActionStatus
  mode: 'suggest' | 'autonomous'
  rationale: string
  before_snapshot: Record<string, unknown>
  after_snapshot: Record<string, unknown> | null
  outcome_d7: Record<string, unknown> | null
  guardrail_checks: Record<string, unknown>
  budget_before: number | null
  budget_after: number | null
  approved_by: string | null
  error_message: string | null
  executed_at: string | null
  outcome_measured_at: string | null
  created_at: string
  updated_at: string
}

export type OptimizationGuardrail = {
  id: string
  workspace_id: string
  kill_switch: boolean
  max_budget_change_pct: number
  max_daily_actions: number
  blacklisted_campaign_ids: string[]
  autonomous_mode: boolean
  created_at: string
  updated_at: string
}

// ─── M20: White-label Agency Portal ──────────────────────────────────────────

export type WorkspaceBranding = {
  id: string
  workspace_id: string
  logo_url: string | null
  primary_color: string
  custom_domain: string | null
  domain_verified: boolean
  cname_token: string | null
  created_at: string
  updated_at: string
}

export type WorkspaceBrandingInsert = Omit<WorkspaceBranding, 'id' | 'created_at' | 'updated_at'>
export type WorkspaceBrandingUpdate = Partial<WorkspaceBrandingInsert>

export type ResellerBilling = {
  id: string
  agency_org_id: string
  client_org_id: string
  markup_percent: number
  created_at: string
  updated_at: string
}

export type ResellerBillingInsert = Omit<ResellerBilling, 'id' | 'created_at' | 'updated_at'>
export type ResellerBillingUpdate = Partial<ResellerBillingInsert>
