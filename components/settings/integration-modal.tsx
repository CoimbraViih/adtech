"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink } from "lucide-react";

type Field = {
  key: string;
  label: string;
  placeholder: string;
  helpText: string | null;
  secret: boolean;
};

type TestResult = { ok: boolean; message: string };

type IntegrationModalProps = {
  open: boolean;
  onClose: () => void;
  providerKey: string;
  label: string;
  docsUrl: string;
  fields: Field[];
  configured: boolean;
  onSaved: () => void;
};

export function IntegrationModal({
  open,
  onClose,
  providerKey,
  label,
  docsUrl,
  fields,
  configured,
  onSaved,
}: IntegrationModalProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setValues({});
    setTestResult(null);
    setError(null);
    onClose();
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/settings/integrations/${providerKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Erro ao salvar.");
        return;
      }
      onSaved();
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTestResult(null);
    setTesting(true);
    try {
      const res = await fetch(`/api/settings/integrations/${providerKey}/test`, {
        method: "POST",
      });
      const data = await res.json() as TestResult;
      setTestResult(data);
    } catch {
      setTestResult({ ok: false, message: "Erro de rede ao testar conexão." });
    } finally {
      setTesting(false);
    }
  }

  const allFilled = fields.every((f) => values[f.key]?.trim());

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="bg-[color:var(--adflow-surface)] border-[color:var(--adflow-border)] text-[color:var(--adflow-fg)] max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span>{configured ? "Editar" : "Configurar"} — {label}</span>
            {docsUrl && (
              <a
                href={docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[color:var(--adflow-data)] hover:underline flex items-center gap-1"
              >
                Docs <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {configured && (
            <p className="text-xs text-[color:var(--adflow-fg-muted)] bg-[color:var(--adflow-border)] rounded-md px-3 py-2">
              Credenciais já configuradas. Preencha os campos abaixo para substituí-las.
            </p>
          )}

          {fields.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-[color:var(--adflow-fg-muted)] uppercase tracking-wide mb-1.5">
                {field.label}
              </label>
              <input
                type={field.secret ? "password" : "text"}
                placeholder={field.placeholder}
                value={values[field.key] ?? ""}
                onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                className="w-full bg-[color:var(--adflow-base)] border border-[color:var(--adflow-border)] rounded-md px-3 py-2 text-sm font-mono text-[color:var(--adflow-fg)] placeholder:text-[color:var(--adflow-fg-muted)] focus:outline-none focus:ring-1 focus:ring-[color:var(--adflow-accent)]"
                autoComplete="off"
              />
              {field.helpText && (
                <p className="text-[10px] text-[color:var(--adflow-fg-muted)] mt-1">{field.helpText}</p>
              )}
            </div>
          ))}

          {testResult && (
            <div className={`text-xs rounded-md px-3 py-2 ${
              testResult.ok
                ? "bg-[color:var(--adflow-success)]/10 border border-[color:var(--adflow-success)]/30 text-[color:var(--adflow-success)]"
                : "bg-[color:var(--adflow-danger)]/10 border border-[color:var(--adflow-danger)]/30 text-[color:var(--adflow-danger)]"
            }`}>
              {testResult.ok ? "✓" : "✗"} {testResult.message}
            </div>
          )}

          {error && (
            <p className="text-xs text-[color:var(--adflow-danger)]">{error}</p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleClose}
              className="flex-1 text-xs bg-[color:var(--adflow-border)] text-[color:var(--adflow-fg-muted)] hover:text-[color:var(--adflow-fg)] rounded-md py-2 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleTest}
              disabled={testing || !configured}
              className="text-xs bg-[color:var(--adflow-border)] text-[color:var(--adflow-data)] hover:bg-[color:var(--adflow-data)]/10 disabled:opacity-50 rounded-md px-3 py-2 transition-colors"
            >
              {testing ? "Testando…" : "Testar conexão"}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !allFilled}
              className="flex-1 text-xs font-semibold bg-[color:var(--adflow-accent)] hover:bg-[color:var(--adflow-accent)]/90 disabled:opacity-50 text-white rounded-md py-2 transition-colors"
            >
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
