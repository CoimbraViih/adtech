import { OrgSwitcher } from "@/components/layout/org-switcher";
import { UserMenu } from "@/components/auth/user-menu";
import { MobileSidebarTrigger } from "@/components/layout/sidebar";
import { NotificationBell } from "@/components/automation/notification-bell";
import { getServerSession } from "@/lib/supabase/server";

type TopbarProps = {
  breadcrumb?: string;
};

export async function Topbar({ breadcrumb }: TopbarProps) {
  const session = await getServerSession();

  return (
    <header
      role="banner"
      className="flex items-center justify-between h-14 px-4 border-b border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] shrink-0"
    >
      <div className="flex items-center gap-2">
        {/* Mobile hamburger — hidden on md+ */}
        <MobileSidebarTrigger />

        <OrgSwitcher orgName={session?.organization.name ?? session?.workspace.name ?? ""} />

        {breadcrumb && (
          <>
            <span className="text-[color:var(--adflow-border)] hidden sm:block">/</span>
            <span className="text-sm text-[color:var(--adflow-fg-muted)] hidden sm:block">
              {breadcrumb}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell workspaceId={session?.workspace.id ?? ""} />
        <UserMenu
          name={session?.user.display_name ?? ""}
          email={session?.user.email ?? ""}
          plan={session?.organization.plan ?? "free"}
        />
      </div>
    </header>
  );
}
