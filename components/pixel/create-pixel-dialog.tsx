"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreatePixelDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get("name") as string,
      meta_pixel_id: (formData.get("meta_pixel_id") as string) || null,
      google_tag_id: (formData.get("google_tag_id") as string) || null,
    };

    startTransition(async () => {
      try {
        const res = await fetch("/api/pixels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json() as { error?: string };
          setError(data.error ?? "Erro ao criar pixel.");
          return;
        }
        setOpen(false);
        router.refresh();
      } catch {
        setError("Erro de rede. Tente novamente.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        Novo Pixel
      </DialogTrigger>
      <DialogContent className="bg-surface border-border">
        <DialogHeader>
          <DialogTitle>Criar novo pixel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" placeholder="Ex: Site Principal" required className="bg-base border-border" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="meta_pixel_id">Meta Pixel ID (opcional)</Label>
            <Input id="meta_pixel_id" name="meta_pixel_id" placeholder="Ex: 123456789" className="bg-base border-border" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="google_tag_id">Google Tag ID (opcional)</Label>
            <Input id="google_tag_id" name="google_tag_id" placeholder="Ex: G-XXXXXXXXXX" className="bg-base border-border" />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Criando..." : "Criar Pixel"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
