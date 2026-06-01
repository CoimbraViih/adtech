"use client";

import { useState, useCallback } from "react";
import { IntegrationCard } from "@/components/settings/integration-card";

type Field = {
  key: string;
  label: string;
  placeholder: string;
  helpText: string | null;
  secret: boolean;
};

type ProviderStatus = {
  key: string;
  label: string;
  description: string;
  docsUrl: string;
  fields: Field[];
  configured: boolean;
  last_tested_at: string | null;
};

type Category = {
  key: string;
  label: string;
  providers: ProviderStatus[];
};

type IntegrationsGridProps = {
  initialCategories: Category[];
};

export function IntegrationsGrid({ initialCategories }: IntegrationsGridProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [activeTab, setActiveTab] = useState(initialCategories[0]?.key ?? "ads");
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/settings/integrations");
      if (res.ok) {
        const data = await res.json() as { categories: Category[] };
        setCategories(data.categories);
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  const activeCategory = categories.find((c) => c.key === activeTab);

  return (
    <div>
      <div className="flex gap-0 border-b border-[color:var(--adflow-border)] mb-6">
        {categories.map((cat) => {
          const configuredCount = cat.providers.filter((p) => p.configured).length;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveTab(cat.key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === cat.key
                  ? "border-[color:var(--adflow-accent)] text-[color:var(--adflow-fg)]"
                  : "border-transparent text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)]"
              }`}
            >
              {cat.label}
              {configuredCount > 0 && (
                <span className="ml-2 text-[10px] bg-[color:var(--adflow-success)]/20 text-[color:var(--adflow-success)] px-1.5 py-0.5 rounded-full">
                  {configuredCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeCategory && (
        <div className={`grid gap-4 ${
          activeCategory.providers.length === 1
            ? "grid-cols-1 max-w-sm"
            : activeCategory.providers.length === 2
            ? "grid-cols-1 sm:grid-cols-2 max-w-2xl"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        }`}>
          {activeCategory.providers.map((provider) => (
            <IntegrationCard
              key={provider.key}
              providerKey={provider.key}
              label={provider.label}
              description={provider.description}
              docsUrl={provider.docsUrl}
              fields={provider.fields}
              configured={provider.configured}
              lastTestedAt={provider.last_tested_at}
              onSaved={refresh}
            />
          ))}
        </div>
      )}

      {refreshing && (
        <p className="text-xs text-[color:var(--adflow-fg-muted)] mt-4">Atualizando…</p>
      )}
    </div>
  );
}
