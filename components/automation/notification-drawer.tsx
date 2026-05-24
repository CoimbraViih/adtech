"use client";

import type { AlertNotification } from "@/types/database";
import { X, CheckCheck } from "lucide-react";

type NotificationDrawerProps = {
  open: boolean;
  notifications: AlertNotification[];
  onClose: () => void;
  onMarkRead: (id: string) => void;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  return `${Math.floor(hours / 24)}d atrás`;
}

export function NotificationDrawer({
  open,
  notifications,
  onClose,
  onMarkRead,
}: NotificationDrawerProps) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <aside className="fixed right-0 top-0 z-50 h-full w-80 bg-[color:var(--adflow-surface)] border-l border-[color:var(--adflow-border)] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--adflow-border)]">
          <h2 className="text-sm font-semibold text-[color:var(--adflow-fg)]">Notificações</h2>
          <button
            onClick={onClose}
            className="text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-[color:var(--adflow-fg-muted)]">
              <CheckCheck className="w-8 h-8 opacity-40" />
              <p className="text-sm">Sem notificações não lidas</p>
            </div>
          ) : (
            <ul className="divide-y divide-[color:var(--adflow-border)]">
              {notifications.map((n) => (
                <li key={n.id} className="px-4 py-3 hover:bg-[color:var(--adflow-border)]/30 transition-colors">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[color:var(--adflow-fg)] truncate">
                        {n.title}
                      </p>
                      <p className="text-xs text-[color:var(--adflow-fg-muted)] mt-0.5 line-clamp-2">
                        {n.body}
                      </p>
                      <p className="text-xs text-[color:var(--adflow-fg-muted)]/60 mt-1">
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => onMarkRead(n.id)}
                      title="Marcar como lida"
                      className="shrink-0 p-1 rounded text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-success)] hover:bg-[color:var(--adflow-border)] transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
