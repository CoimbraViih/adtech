import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireServerSession } from "@/lib/supabase/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { BillingPageClient } from "./billing-page-client";
import type { OrgPlan } from "@/types/database";

async function BillingData() {
  let session;
  try {
    session = await requireServerSession();
  } catch {
    redirect("/login");
  }

  const supabase = await createServerSupabaseClient();
  const workspaceId = session.workspace.id;
  const plan = (session.organization.plan ?? "free") as OrgPlan;

  const [campaignsResult, creativesResult, pixelsResult] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),
    supabase
      .from("creatives")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),
    supabase
      .from("pixels")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),
  ]);

  const usage = {
    campaigns: campaignsResult.count ?? 0,
    creatives: creativesResult.count ?? 0,
    pixels: pixelsResult.count ?? 0,
  };

  return <BillingPageClient plan={plan} usage={usage} />;
}

export default function BillingPage() {
  return (
    <Suspense fallback={null}>
      <BillingData />
    </Suspense>
  );
}
