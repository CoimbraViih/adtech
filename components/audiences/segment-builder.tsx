"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus } from "lucide-react";
import type { AudienceRule } from "@/types/database";

type Props = {
  rules: AudienceRule[];
  onChange: (rules: AudienceRule[]) => void;
};

const EVENT_TYPE_OPTIONS = [
  { value: "pageview", label: "Pageview" },
  { value: "purchase", label: "Compra" },
  { value: "lead", label: "Lead" },
  { value: "add_to_cart", label: "Adicionar ao Carrinho" },
  { value: "custom", label: "Customizado" },
] as const;

const OPERATOR_OPTIONS = [
  { value: "eq", label: "=" },
  { value: "gte", label: "≥" },
  { value: "lte", label: "≤" },
  { value: "contains", label: "contém" },
] as const;

const DEFAULT_RULE: AudienceRule = {
  event_type: "pageview",
  operator: "gte",
  value: 1,
  lookback_days: 30,
};

const MAX_RULES = 10;

const selectClass = cn(
  "h-9 rounded-md border border-border bg-base px-3 py-1 text-sm text-white",
  "focus:outline-none focus:ring-1 focus:ring-accent",
  "disabled:opacity-50"
);

export function SegmentBuilder({ rules, onChange }: Props) {
  function addRule() {
    if (rules.length >= MAX_RULES) return;
    onChange([...rules, { ...DEFAULT_RULE }]);
  }

  function removeRule(index: number) {
    onChange(rules.filter((_, i) => i !== index));
  }

  function updateRule(index: number, patch: Partial<AudienceRule>) {
    onChange(
      rules.map((r, i) => (i === index ? { ...r, ...patch } : r))
    );
  }

  const sizeEstimate = rules.length * 3000;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white">Regras de Segmentação</p>
        {rules.length > 0 && (
          <span className="text-xs text-muted font-mono">
            ~{new Intl.NumberFormat("pt-BR").format(sizeEstimate)} usuários estimados
          </span>
        )}
      </div>

      {rules.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-base/50 p-4 text-center text-sm text-muted">
          Nenhuma regra definida. Clique em &quot;Adicionar Regra&quot; para começar.
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule, index) => (
            <div
              key={index}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-base p-3"
            >
              {/* Event type */}
              <div className="flex flex-col gap-1 min-w-[140px]">
                <label className="text-xs text-muted">Evento</label>
                <select
                  value={rule.event_type}
                  onChange={(e) => updateRule(index, { event_type: e.target.value })}
                  className={selectClass}
                >
                  {EVENT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Operator */}
              <div className="flex flex-col gap-1 min-w-[80px]">
                <label className="text-xs text-muted">Operador</label>
                <select
                  value={rule.operator}
                  onChange={(e) =>
                    updateRule(index, {
                      operator: e.target.value as AudienceRule["operator"],
                    })
                  }
                  className={selectClass}
                >
                  {OPERATOR_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Value */}
              <div className="flex flex-col gap-1 min-w-[80px]">
                <label className="text-xs text-muted">Valor</label>
                <Input
                  type={typeof rule.value === "number" ? "number" : "text"}
                  value={String(rule.value)}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const num = parseFloat(raw);
                    updateRule(index, { value: isNaN(num) ? raw : num });
                  }}
                  className="h-9 bg-base border-border w-20"
                />
              </div>

              {/* Lookback days */}
              <div className="flex flex-col gap-1 min-w-[100px]">
                <label className="text-xs text-muted">Últimos N dias</label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={rule.lookback_days}
                  onChange={(e) =>
                    updateRule(index, { lookback_days: parseInt(e.target.value, 10) || 1 })
                  }
                  className="h-9 bg-base border-border w-20"
                />
              </div>

              {/* Remove */}
              <div className="flex flex-col gap-1 justify-end pt-5">
                <button
                  type="button"
                  onClick={() => removeRule(index)}
                  className="flex items-center justify-center h-9 w-9 rounded-md border border-border bg-base text-muted hover:text-danger hover:border-danger transition-colors"
                  aria-label="Remover regra"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={addRule}
        disabled={rules.length >= MAX_RULES}
        className="border border-dashed border-border w-full text-muted hover:text-white"
      >
        <Plus className="h-4 w-4 mr-1" />
        Adicionar Regra
        {rules.length >= MAX_RULES && " (máximo atingido)"}
      </Button>
    </div>
  );
}
