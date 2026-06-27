import { chQueryWithParams, isClickHouseConfigured } from './clickhouse';

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
  return chQueryWithParams<ConversionRow>(
    `SELECT
      campaign_id,
      toString(event_day) AS event_day,
      sum(conversions)    AS conversions,
      sum(revenue)        AS revenue
    FROM adflow.mv_conversions_campaign_day
    WHERE organization_id = {org_id:String}
      AND workspace_id    = {ws_id:String}
      AND event_day BETWEEN {start:String} AND {end:String}
      AND campaign_id != ''
    GROUP BY campaign_id, event_day
    ORDER BY event_day DESC, conversions DESC`,
    { org_id: organizationId, ws_id: workspaceId, start: startDate, end: endDate }
  );
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
  return chQueryWithParams<FunnelRow>(
    `SELECT
      event_type,
      toString(event_day) AS event_day,
      sum(event_count)    AS event_count
    FROM adflow.mv_funnel_steps
    WHERE organization_id = {org_id:String}
      AND workspace_id    = {ws_id:String}
      AND event_day BETWEEN {start:String} AND {end:String}
    GROUP BY event_type, event_day
    ORDER BY event_day DESC, event_count DESC`,
    { org_id: organizationId, ws_id: workspaceId, start: startDate, end: endDate }
  );
}

// ---------------------------------------------------------------------------
// Raw event explorer — M18 Data Transparency
// ---------------------------------------------------------------------------

export type EventRow = {
  id: string
  event_type: string
  url: string | null
  referrer: string | null
  campaign_id: string | null
  value: number | null
  currency: string | null
  consent_state: string
  event_time: string  // ISO string
}

export type EventsPage = {
  rows: EventRow[]
  total: number
  has_more: boolean
}

/**
 * Paginated raw event query from ClickHouse `events` table.
 * organizationId and workspaceId come from the authenticated session — never from user input.
 * limit is capped at 500 server-side regardless of what the caller passes.
 */
export async function getEventsByWorkspace(
  organizationId: string,
  workspaceId: string,
  filters: {
    event_type?: string
    campaign_id?: string
    start_date: string   // YYYY-MM-DD
    end_date: string     // YYYY-MM-DD
    limit: number        // capped at 500
    offset: number
  }
): Promise<EventsPage> {
  if (!isClickHouseConfigured()) {
    return { rows: [], total: 0, has_more: false };
  }

  const safeLimit = Math.min(filters.limit, 500);

  // Build shared WHERE clause parts — only parametrised bindings, never string interpolation
  const baseParams: Record<string, string> = {
    org_id: organizationId,
    ws_id: workspaceId,
    start: filters.start_date,
    end: filters.end_date,
  };

  let whereExtra = '';
  if (filters.event_type) {
    whereExtra += ' AND event_type = {evt_type:String}';
    baseParams['evt_type'] = filters.event_type;
  }
  if (filters.campaign_id) {
    whereExtra += ' AND campaign_id = {camp_id:String}';
    baseParams['camp_id'] = filters.campaign_id;
  }

  const baseWhere = `organization_id = {org_id:String}
      AND workspace_id    = {ws_id:String}
      AND toDate(event_time) BETWEEN {start:String} AND {end:String}${whereExtra}`;

  const dataSql = `SELECT
      id,
      event_type,
      url,
      referrer,
      campaign_id,
      value,
      currency,
      consent_state,
      toString(event_time) AS event_time
    FROM adflow.events
    WHERE ${baseWhere}
    ORDER BY event_time DESC
    LIMIT ${safeLimit} OFFSET ${filters.offset}`;

  const countSql = `SELECT count() AS total
    FROM adflow.events
    WHERE ${baseWhere}`;

  const [rows, countRows] = await Promise.all([
    chQueryWithParams<EventRow>(dataSql, baseParams),
    chQueryWithParams<{ total: number }>(countSql, baseParams),
  ]);

  const total = countRows[0]?.total ?? 0;
  const has_more = filters.offset + rows.length < total;

  return { rows, total, has_more };
}
