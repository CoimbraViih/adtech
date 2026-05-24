"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import type { AlertNotification } from "@/types/database";
import { NotificationDrawer } from "@/components/automation/notification-drawer";

type NotificationBellProps = {
  workspaceId: string;
};

export function NotificationBell({ workspaceId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/automation/notifications?workspace_id=${workspaceId}`);
        if (res.ok) setNotifications(await res.json());
      } catch {
        // silent
      }
    }
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [workspaceId]);

  async function handleMarkRead(id: string) {
    await fetch(`/api/automation/notifications/${id}/read`, { method: "POST" });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  const unread = notifications.length;

  return (
    <>
      <button
        onClick={() => setDrawerOpen(true)}
        aria-label={`Notificações${unread > 0 ? ` (${unread} não lidas)` : ""}`}
        className="relative p-1.5 rounded-md text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)] hover:bg-[color:var(--adflow-border)] transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--adflow-accent)] text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <NotificationDrawer
        open={drawerOpen}
        notifications={notifications}
        onClose={() => setDrawerOpen(false)}
        onMarkRead={handleMarkRead}
      />
    </>
  );
}
