-- Run against ClickHouse Cloud database `adflow`
-- HTTP interface: POST /?database=adflow with query in body

CREATE TABLE IF NOT EXISTS adflow.events (
  event_id        String,
  organization_id String,
  workspace_id    String,
  pixel_id        String,
  event_type      LowCardinality(String),
  event_name      Nullable(String),
  session_id      Nullable(String),
  url             Nullable(String),
  referrer        Nullable(String),
  ip              Nullable(String),
  user_agent      Nullable(String),
  value           Nullable(Float64),
  currency        Nullable(String),
  properties      String DEFAULT '{}',
  consent_state   LowCardinality(String) DEFAULT 'unknown',
  event_time      DateTime64(3, 'America/Sao_Paulo'),
  ingested_at     DateTime64(3, 'UTC') DEFAULT now64()
)
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(event_time)
ORDER BY (organization_id, workspace_id, event_time)
TTL event_time + INTERVAL 2 YEAR
SETTINGS index_granularity = 8192;
