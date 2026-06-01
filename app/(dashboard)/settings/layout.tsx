"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SETTINGS_TABS = [
  { label: "Faturamento",   href: "/settings/billing" },
  { label: "Integrações",   href: "/settings/integrations" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      {/* Sub-nav tab bar */}
      <div className="border-b border-[color:var(--adflow-border)] px-6 pt-5 pb-0 shrink-0">
        <h1 className="text-lg font-semibold text-[color:var(--adflow-fg)] mb-4">Configurações</h1>
        <div className="flex gap-0">
          {SETTINGS_TABS.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  active
                    ? "border-[color:var(--adflow-accent)] text-[color:var(--adflow-fg)]"
                    : "border-transparent text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)]"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
