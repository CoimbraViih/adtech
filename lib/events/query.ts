import { chQuery } from './clickhouse';

export type ConversionRow = {
  campaign_id: string;
  event_day:   string;
  conversions: number;
  revenue:     number;
};

export type FunnelRow = {
  event_type:  string;
  event_day:   string;
  event_count: number;
};

/**
 * Conversions and revenue per campaign per day from ClickHouse MV.
 * organization_id and workspace_id come from the authenticated session — never from user input.
 */
export async function getConversionsByCampaign(
  organizationId: string,
  workspaceId: string,
  startDate: string,  // YYYY-MM-DD
  endDate: string     // YYYY-MM-DD
): Promise<ConversionRow[]> {
  return chQuery<ConversionRow>(`
    SELECT
      campaign_id,
      toString(event_day) AS event_day,
      sum(conversions)    AS conversions,
      sum(revenue)        AS revenue
    FROM adflow.mv_conversions_campaign_day
    WHERE organization_id = '${organizationId}'
      AND workspace_id    = '${workspaceId}'
      AND event_day BETWEEN '${startDate}' AND '${endDate}'
      AND campaign_id != ''
    GROUP BY campaign_id, event_day
    ORDER BY event_day DESC, conversions DESC
  `);
}

/**
 * Event funnel counts per event_type per day from ClickHouse MV.
 * organization_id and workspace_id come from the authenticated session — never from user input.
 */
export async function getFunnelByDay(
  organizationId: string,
  workspaceId: string,
  startDate: string,  // YYYY-MM-DD
  endDate: string     // YYYY-MM-DD
): Promise<FunnelRow[]> {
  return chQuery<FunnelRow>(`
    SELECT
      event_type,
      toString(event_day) AS event_day,
      sum(event_count)    AS event_count
    FROM adflow.mv_funnel_steps
    WHERE organization_id = '${organizationId}'
      AND workspace_id    = '${workspaceId}'
      AND event_day BETWEEN '${startDate}' AND '${endDate}'
    GROUP BY event_type, event_day
    ORDER BY event_day DESC, event_count DESC
  `);
}
