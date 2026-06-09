import { getServerSession } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import type { OrgPlan } from "@/types/database";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  const plan: OrgPlan = session?.organization.plan ?? "free";
  const workspaceId = session?.workspace.id ?? "";
  const orgName = session?.organization.name ?? null;
  const userName = session?.user.display_name ?? null;
  const userEmail = session?.user.email ?? null;
  const userPlan = plan;

  return (
    <div className="flex h-screen overflow-hidden bg-[color:var(--adflow-base)]">
      <Sidebar plan={plan} />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Topbar workspaceId={workspaceId} orgName={orgName} userName={userName} userEmail={userEmail} userPlan={userPlan} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
