import { redirect } from "next/navigation";
import { requireServerSession } from "@/lib/supabase/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AudiencesPageClient } from "@/components/audiences/audiences-page-client";

export default async function AudiencesPage() {
  let session;
  try {
    session = await requireServerSession();
  } catch {
    redirect("/login");
  }

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("audiences")
    .select("*")
    .eq("workspace_id", session!.workspace.id)
    .order("created_at", { ascending: false });

  const audiences = data ?? [];
  return <AudiencesPageClient initialAudiences={audiences} />;
}
