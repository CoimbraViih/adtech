"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentBuilder } from "@/components/audiences/segment-builder";
import type { AudienceRule, AudienceType } from "@/types/database";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
};

const AUDIENCE_TYPES: { value: AudienceType; label: string }[] = [
  { value: "behavioral", label: "Comportamental" },
  { value: "lookalike", label: "Lookalike" },
  { value: "custom", label: "Customizado" },
];

const selectClass =
  "h-9 w-full rounded-md border border-border bg-base px-3 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent";

const textareaClass =
  "w-full rounded-md border border-border bg-base px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent resize-none";

export function CreateAudienceDialog({ open, onOpenChange, onCreated }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rules, setRules] = useState<AudienceRule[]>([]);
  const [audienceType, setAudienceType] = useState<AudienceType>("behavioral");

  function handleClose() {
    onOpenChange(false);
    setError(null);
    setRules([]);
    setAudienceType("behavioral");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get("name") as string,
      type: audienceType,
      description: (formData.get("description") as string) || null,
      rules,
    };

    startTransition(async () => {
      try {
        const res = await fetch("/api/audiences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          setError(data.error ?? "Erro ao criar audiência.");
          return;
        }
        handleClose();
        onCreated?.();
      } catch {
        setError("Erro de rede. Tente novamente.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-surface border-border max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Audiência</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div className="space-y-1">
            <Label htmlFor="aud-name">Nome</Label>
            <Input
              id="aud-name"
              name="name"
              placeholder="Ex: Visitantes Recentes — 30 dias"
              required
              className="bg-base border-border"
            />
          </div>

          {/* Tipo */}
          <div className="space-y-1">
            <Label htmlFor="aud-type">Tipo</Label>
            <select
              id="aud-type"
              name="type"
              value={audienceType}
              onChange={(e) => setAudienceType(e.target.value as AudienceType)}
              className={selectClass}
            >
              {AUDIENCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Descrição */}
          <div className="space-y-1">
            <Label htmlFor="aud-description">Descrição (opcional)</Label>
            <textarea
              id="aud-description"
              name="description"
              placeholder="Descreva o propósito desta audiência..."
              rows={3}
              className={textareaClass}
            />
          </div>

          {/* Segment Builder */}
          <SegmentBuilder rules={rules} onChange={setRules} />

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Criando..." : "Criar Audiência"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
