import { getServerSession, createServerSupabaseClient } from "@/lib/supabase/server";
import type { PmpDeal, PmpDealType, PmpDealStatus } from "@/types/database";
import { DealsClient } from "./deals-client";

export default async function DealsPage() {
  const session = await getServerSession();
  const workspaceId = session?.workspace.id ?? "";

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("pmp_deals")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  const deals: PmpDeal[] = (data ?? []) as PmpDeal[];

  return (
    <div className="p-6">
      <DealsClient deals={deals} workspaceId={workspaceId} />
    </div>
  );
}

export type { PmpDeal, PmpDealType, PmpDealStatus };
