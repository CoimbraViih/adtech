import { OrgSwitcher } from "@/components/layout/org-switcher";
import { MobileSidebarTrigger } from "@/components/layout/sidebar";
import { NotificationBell } from "@/components/automation/notification-bell";

type TopbarProps = {
  breadcrumb?: string;
  workspaceId: string;
  orgName?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  userPlan?: string;
};

export function Topbar({
  breadcrumb,
  workspaceId,
  orgName,
  userName,
}: TopbarProps) {
  return (
    <header
      role="banner"
      className="flex items-center justify-between h-14 px-4 border-b border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] shrink-0"
    >
      <div className="flex items-center gap-2">
        <MobileSidebarTrigger />
        <OrgSwitcher orgName={orgName} />
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
        <NotificationBell workspaceId={workspaceId} />
        <div className="flex items-center gap-2 px-2 py-1 rounded text-sm text-[color:var(--adflow-fg-muted)]">
          {userName ?? "Dev User"}
        </div>
      </div>
    </header>
  );
}
