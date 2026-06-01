import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function resolveBenchmarks(
  workspaceId: string,
  platform: string,
  objective: string,
): Promise<Record<string, { target: number; comparator: "gte" | "lte" }>> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("campaign_benchmarks")
    .select("workspace_id, metric, target_value, comparator")
    .eq("platform", platform)
    .eq("objective", objective)
    .or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`);

  if (error) throw error;

  const map: Record<
    string,
    { target: number; comparator: "gte" | "lte"; isWorkspace: boolean }
  > = {};

  const rows = (data as unknown[] | null) ?? [];
  for (const row of rows) {
    const r = row as { workspace_id: string | null; metric: string; target_value: string | number; comparator: string };
    const isWorkspace = r.workspace_id !== null;
    const existing = map[r.metric];
    if (!existing || (isWorkspace && !existing.isWorkspace)) {
      map[r.metric] = {
        target: Number(r.target_value),
        comparator: r.comparator as "gte" | "lte",
        isWorkspace,
      };
    }
  }

  return Object.fromEntries(
    Object.entries(map).map(([k, v]) => [k, { target: v.target, comparator: v.comparator }]),
  );
}
