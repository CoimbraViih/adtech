"use client";

import { useState } from "react";
import type { AlertRule, AlertRuleCreateInput, AlertCondition } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

type AlertRuleFormProps = {
  workspaceId: string;
  rule: AlertRule | null;
  onSaved: (rule: AlertRule) => void;
  onCancel: () => void;
};

const CONDITIONS: { value: AlertCondition; label: string }[] = [
  { value: "roas_below",        label: "ROAS abaixo de" },
  { value: "cpa_above",         label: "CPA acima de" },
  { value: "spend_above",       label: "Gasto acima de (R$)" },
  { value: "ctr_below",         label: "CTR abaixo de (%)" },
  { value: "conversions_below", label: "Conversões abaixo de" },
];

export function AlertRuleForm({ workspaceId, rule, onSaved, onCancel }: AlertRuleFormProps) {
  const [name, setName] = useState(rule?.name ?? "");
  const [condition, setCondition] = useState<AlertCondition>(rule?.condition ?? "roas_below");
  const [threshold, setThreshold] = useState(String(rule?.threshold ?? ""));
  const [cooldown, setCooldown] = useState(String(rule?.cooldown_minutes ?? "60"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const thresholdNum = parseFloat(threshold);
    if (!name.trim() || isNaN(thresholdNum)) {
      setError("Preencha nome e limite corretamente.");
      return;
    }

    setSaving(true);
    try {
      if (rule) {
        const res = await fetch(`/api/automation/rules/${rule.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, condition, threshold: thresholdNum, cooldown_minutes: parseInt(cooldown) }),
        });
        if (!res.ok) throw new Error("Falha ao atualizar regra");
        onSaved(await res.json());
      } else {
        const payload: AlertRuleCreateInput = {
          workspace_id: workspaceId,
          name,
          condition,
          threshold: thresholdNum,
          cooldown_minutes: parseInt(cooldown),
        };
        const res = await fetch("/api/automation/rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Falha ao criar regra");
        onSaved(await res.json());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-[color:var(--adflow-fg)]">
            {rule ? "Editar Regra" : "Nova Regra de Alerta"}
          </h2>
          <button
            onClick={onCancel}
            className="text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rule-name" className="text-[color:var(--adflow-fg-muted)] text-xs">Nome da Regra</Label>
            <Input
              id="rule-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: ROAS baixo - Black Friday"
              className="bg-[color:var(--adflow-base)] border-[color:var(--adflow-border)] text-[color:var(--adflow-fg)]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rule-condition" className="text-[color:var(--adflow-fg-muted)] text-xs">Condição</Label>
            <select
              id="rule-condition"
              value={condition}
              onChange={(e) => setCondition(e.target.value as AlertCondition)}
              className="w-full rounded-md border border-[color:var(--adflow-border)] bg-[color:var(--adflow-base)] px-3 py-2 text-sm text-[color:var(--adflow-fg)] focus:outline-none focus:ring-1 focus:ring-[color:var(--adflow-accent)]"
            >
              {CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rule-threshold" className="text-[color:var(--adflow-fg-muted)] text-xs">Limite</Label>
            <Input
              id="rule-threshold"
              type="number"
              step="any"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="ex: 2.5"
              className="bg-[color:var(--adflow-base)] border-[color:var(--adflow-border)] text-[color:var(--adflow-fg)]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rule-cooldown" className="text-[color:var(--adflow-fg-muted)] text-xs">
              Cooldown (minutos entre re-disparos)
            </Label>
            <Input
              id="rule-cooldown"
              type="number"
              min="5"
              value={cooldown}
              onChange={(e) => setCooldown(e.target.value)}
              className="bg-[color:var(--adflow-base)] border-[color:var(--adflow-border)] text-[color:var(--adflow-fg)]"
            />
          </div>

          {error && (
            <p className="text-xs text-[color:var(--adflow-danger)]">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1 border-[color:var(--adflow-border)] text-[color:var(--adflow-fg-muted)]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 bg-[color:var(--adflow-accent)] hover:bg-[color:var(--adflow-accent)]/90 text-white"
            >
              {saving ? "Salvando…" : rule ? "Salvar" : "Criar Regra"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
