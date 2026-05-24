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

export type CampaignPlatform = "meta" | "google" | "programmatic";
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
};

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
