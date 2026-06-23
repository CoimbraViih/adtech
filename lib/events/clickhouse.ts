// Module-level constants (read once at init)
const baseUrl  = process.env.CLICKHOUSE_URL      ?? '';
const user     = process.env.CLICKHOUSE_USER     ?? '';
const password = process.env.CLICKHOUSE_PASSWORD ?? '';
const database = process.env.CLICKHOUSE_DATABASE ?? 'adflow';

export function isClickHouseConfigured(): boolean {
  return Boolean(baseUrl && user && password);
}

export async function chInsert(table: string, rows: object[]): Promise<void> {
  // If not configured or no rows, silently skip (graceful degradation)
  if (!isClickHouseConfigured() || rows.length === 0) return;
  const body = rows.map(r => JSON.stringify(r)).join('\n');
  const res = await fetch(
    `${baseUrl}/?query=${encodeURIComponent(`INSERT INTO ${database}.${table} FORMAT JSONEachRow`)}`,
    {
      method: 'POST',
      headers: {
        'X-ClickHouse-User': user,
        'X-ClickHouse-Key':  password,
        'Content-Type':      'application/x-ndjson',
      },
      body,
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ClickHouse insert failed (${res.status}): ${text.slice(0, 200)}`);
  }
}

export async function chQuery<T>(sql: string): Promise<T[]> {
  if (!isClickHouseConfigured()) return [];
  const res = await fetch(
    `${baseUrl}/?database=${encodeURIComponent(database)}&output_format_json_quote_64bit_integers=0`,
    {
      method: 'POST',
      headers: {
        'X-ClickHouse-User': user,
        'X-ClickHouse-Key':  password,
        'Content-Type':      'text/plain',
      },
      body: `${sql} FORMAT JSON`,
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ClickHouse query failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const json = await res.json() as { data: T[] };
  return json.data;
}
