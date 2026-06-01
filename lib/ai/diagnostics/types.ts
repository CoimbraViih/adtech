import type { DiagnosticSeverity, DiagnosticEntity } from "@/types/database";

export type CampaignContext = {
  workspaceId: string;
  organizationId: string;
  entityType: DiagnosticEntity;
  entityId: string;
  campaignId: string | null;
  name: string;
  platform: string;
  objective: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number | null;
  cpa: number | null;
  roas: number | null;
  frequency: number | null;
  cvr: number | null;
  ctrDelta7d: number | null;
  benchmarks: Record<string, { target: number; comparator: "gte" | "lte" }>;
};

export type SkillFinding = {
  severity: DiagnosticSeverity;
  title: string;
  evidence: string;
  metricsSnapshot: Record<string, number>;
};

export type Skill = {
  id: string;
  label: string;
  requiredMetrics: string[];
  shouldTrigger: (ctx: CampaignContext) => SkillFinding | null;
};
