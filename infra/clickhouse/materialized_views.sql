-- Rollup: conversions by campaign per day
-- Feeds M18 event explorer and M19 predictive optimization
CREATE MATERIALIZED VIEW IF NOT EXISTS adflow.mv_conversions_campaign_day
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(event_day)
ORDER BY (organization_id, workspace_id, campaign_id, event_day)
AS SELECT
  organization_id,
  workspace_id,
  JSONExtractString(properties, 'campaign_id') AS campaign_id,
  toDate(event_time)                            AS event_day,
  count()                                       AS conversions,
  sumIf(value, isNotNull(value))                AS revenue
FROM adflow.events
WHERE event_type = 'conversion'
GROUP BY organization_id, workspace_id, campaign_id, event_day;

-- Rollup: event funnel steps per day
-- Feeds M18 event explorer
CREATE MATERIALIZED VIEW IF NOT EXISTS adflow.mv_funnel_steps
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(event_day)
ORDER BY (organization_id, workspace_id, event_type, event_day)
AS SELECT
  organization_id,
  workspace_id,
  event_type,
  toDate(event_time) AS event_day,
  count()            AS event_count
FROM adflow.events
GROUP BY organization_id, workspace_id, event_type, event_day;
