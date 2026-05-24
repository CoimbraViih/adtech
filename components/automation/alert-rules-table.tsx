"use client";

import { useState } from "react";
import type { AlertRule } from "@/types/database";
import { AlertRuleForm } from "@/components/automation/alert-rule-form";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Pencil, Pause, Play } from "lucide-react";

type AlertRulesTableProps = {
  initialRules: AlertRule[];
  workspaceId: string;
};

const CONDITION_LABELS: Record<AlertRule["condition"], string> = {
  roas_below: "ROAS abaixo de",
  cpa_above: "CPA acima de",
  spend_above: "Gasto acima de",
  ctr_below: "CTR abaixo de",
  conversions_below: "Conversões abaixo de",
};

export function AlertRulesTable({ initialRules, workspaceId }: AlertRulesTableProps) {
  const [rules, setRules] = useState<AlertRule[]>(initialRules);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);

  async function handleToggle(rule: AlertRule) {
    const newStatus = rule.status === "active" ? "paused" : "active";
    const res = await fetch(`/api/automation/rules/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, status: newStatus } : r))
      );
    }
  }

  async function handleDelete(ruleId: string) {
    if (!confirm("Remover esta regra de alerta?")) return;
    const res = await fetch(`/api/automation/rules/${ruleId}`, { method: "DELETE" });
    if (res.ok) {
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
    }
  }

  function handleSaved(rule: AlertRule) {
    if (editingRule) {
      setRules((prev) => prev.map((r) => (r.id === rule.id ? rule : r)));
    } else {
      setRules((prev) => [rule, ...prev]);
    }
    setFormOpen(false);
    setEditingRule(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => { setEditingRule(null); setFormOpen(true); }}
          className="gap-1.5 bg-[color:var(--adflow-accent)] hover:bg-[color:var(--adflow-accent)]/90 text-white"
        >
          <Plus className="w-4 h-4" />
          Nova Regra
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="rounded-lg border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-12 text-center">
          <p className="text-sm text-[color:var(--adflow-fg-muted)]">
            Nenhuma regra de alerta configurada.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-[color:var(--adflow-border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)]">
                <th className="text-left px-4 py-2.5 font-medium text-[color:var(--adflow-fg-muted)]">Nome</th>
                <th className="text-left px-4 py-2.5 font-medium text-[color:var(--adflow-fg-muted)]">Condição</th>
                <th className="text-left px-4 py-2.5 font-medium text-[color:var(--adflow-fg-muted)]">Limite</th>
                <th className="text-left px-4 py-2.5 font-medium text-[color:var(--adflow-fg-muted)]">Status</th>
                <th className="text-left px-4 py-2.5 font-medium text-[color:var(--adflow-fg-muted)]">Cooldown</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr
                  key={rule.id}
                  className="border-b border-[color:var(--adflow-border)] last:border-0 bg-[color:var(--adflow-surface)] hover:bg-[color:var(--adflow-border)]/30 transition-colors"
                >
                  <td className="px-4 py-3 text-[color:var(--adflow-fg)] font-medium">{rule.name}</td>
                  <td className="px-4 py-3 text-[color:var(--adflow-fg-muted)]">
                    {CONDITION_LABELS[rule.condition]}
                  </td>
                  <td className="px-4 py-3 text-[color:var(--adflow-fg)]">{rule.threshold}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                      rule.status === "active"
                        ? "bg-[color:var(--adflow-success)]/10 text-[color:var(--adflow-success)]"
                        : "bg-[color:var(--adflow-fg-muted)]/10 text-[color:var(--adflow-fg-muted)]"
                    }`}>
                      {rule.status === "active" ? "Ativo" : "Pausado"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[color:var(--adflow-fg-muted)]">
                    {rule.cooldown_minutes}min
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => handleToggle(rule)}
                        title={rule.status === "active" ? "Pausar" : "Ativar"}
                        className="p-1 rounded text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)] hover:bg-[color:var(--adflow-border)] transition-colors"
                      >
                        {rule.status === "active"
                          ? <Pause className="w-3.5 h-3.5" />
                          : <Play className="w-3.5 h-3.5" />
                        }
                      </button>
                      <button
                        onClick={() => { setEditingRule(rule); setFormOpen(true); }}
                        title="Editar"
                        className="p-1 rounded text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)] hover:bg-[color:var(--adflow-border)] transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        title="Remover"
                        className="p-1 rounded text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-danger)] hover:bg-[color:var(--adflow-border)] transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <AlertRuleForm
          workspaceId={workspaceId}
          rule={editingRule}
          onSaved={handleSaved}
          onCancel={() => { setFormOpen(false); setEditingRule(null); }}
        />
      )}
    </div>
  );
}
